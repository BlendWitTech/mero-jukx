import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowTemplate, WorkflowExecution, WorkflowExecutionStatus } from '../database/entities/workflow.entity';

export interface CreateWorkflowDto {
    name: string;
    description?: string;
    nodes?: any[];
    edges?: any[];
    isActive?: boolean;
}

export interface UpdateWorkflowDto extends Partial<CreateWorkflowDto> {}

@Injectable()
export class WorkflowsService {
    private readonly logger = new Logger(WorkflowsService.name);

    constructor(
        @InjectRepository(WorkflowTemplate)
        private workflowRepository: Repository<WorkflowTemplate>,
        @InjectRepository(WorkflowExecution)
        private executionRepository: Repository<WorkflowExecution>,
    ) {}

    async create(organizationId: string, userId: string, dto: CreateWorkflowDto): Promise<WorkflowTemplate> {
        const workflow = this.workflowRepository.create({
            ...dto,
            organizationId,
            createdBy: userId,
            nodes: dto.nodes || [],
            edges: dto.edges || [],
        });
        return this.workflowRepository.save(workflow);
    }

    /**
     * Returns organization-specific templates + system templates
     */
    async findAll(organizationId: string): Promise<WorkflowTemplate[]> {
        return this.workflowRepository
            .createQueryBuilder('wf')
            .where('(wf.organizationId = :orgId OR wf.isSystemTemplate = true)', { orgId: organizationId })
            .orderBy('wf.isSystemTemplate', 'ASC')
            .addOrderBy('wf.createdAt', 'DESC')
            .getMany();
    }

    async findOne(id: string, organizationId: string): Promise<WorkflowTemplate> {
        const wf = await this.workflowRepository.findOne({
            where: [
                { id, organizationId },
                { id, isSystemTemplate: true },
            ],
        });
        if (!wf) throw new NotFoundException(`Workflow ${id} not found`);
        return wf;
    }

    async update(id: string, organizationId: string, dto: UpdateWorkflowDto): Promise<WorkflowTemplate> {
        const wf = await this.findOne(id, organizationId);
        Object.assign(wf, dto);
        return this.workflowRepository.save(wf);
    }

    async remove(id: string, organizationId: string): Promise<void> {
        const wf = await this.findOne(id, organizationId);
        await this.workflowRepository.delete(wf.id);
    }

    async getExecutions(workflowId: string, organizationId: string): Promise<WorkflowExecution[]> {
        await this.findOne(workflowId, organizationId); // Existence check
        return this.executionRepository.find({
            where: { workflowId, organizationId },
            order: { startedAt: 'DESC' },
            take: 50,
        });
    }

    /**
     * Execute a workflow: traverse nodes in order from trigger → conditions → actions.
     * Each node is logged to stepsLog. Actions are stubs (log + return step description).
     * This is a simple synchronous engine — no background queues.
     */
    async execute(templateId: string, organizationId: string, triggerData: Record<string, any> = {}): Promise<WorkflowExecution> {
        const wf = await this.findOne(templateId, organizationId);

        const execution = this.executionRepository.create({
            workflowId: templateId,
            organizationId,
            triggerData,
            status: WorkflowExecutionStatus.RUNNING,
            stepsLog: [],
        });
        const savedExecution = await this.executionRepository.save(execution);

        try {
            const stepsLog: any[] = [];

            // Build adjacency map from edges
            const adjacency: Record<string, string[]> = {};
            for (const edge of wf.edges) {
                if (!adjacency[edge.source]) adjacency[edge.source] = [];
                adjacency[edge.source].push(edge.target);
            }

            // Find trigger node(s) to start traversal
            const triggerNodes = wf.nodes.filter((n: any) => n.type === 'trigger' || n.data?.nodeType === 'trigger');
            const startIds = triggerNodes.length > 0
                ? triggerNodes.map((n: any) => n.id)
                : [wf.nodes[0]?.id].filter(Boolean);

            // BFS traversal
            const visited = new Set<string>();
            const queue: string[] = [...startIds];

            while (queue.length > 0) {
                const nodeId = queue.shift()!;
                if (visited.has(nodeId)) continue;
                visited.add(nodeId);

                const node = wf.nodes.find((n: any) => n.id === nodeId);
                if (!node) continue;

                const stepResult = await this.executeNode(node, triggerData);
                stepsLog.push({ nodeId, nodeType: node.type || node.data?.nodeType, ...stepResult });

                // If condition node evaluates to false, skip the "false" branch
                if (stepResult.conditionResult === false) {
                    // Only follow 'false' handle edges — skip true branch
                    // Simplified: skip adding next nodes for false branch
                    continue;
                }

                // Enqueue next nodes
                for (const nextId of adjacency[nodeId] || []) {
                    if (!visited.has(nextId)) queue.push(nextId);
                }
            }

            savedExecution.stepsLog = stepsLog;
            savedExecution.status = WorkflowExecutionStatus.COMPLETED;
            savedExecution.completedAt = new Date();
            return this.executionRepository.save(savedExecution);
        } catch (err: any) {
            this.logger.error(`Workflow execution ${savedExecution.id} failed:`, err?.message);
            savedExecution.status = WorkflowExecutionStatus.FAILED;
            savedExecution.completedAt = new Date();
            savedExecution.stepsLog = [...(savedExecution.stepsLog || []), { error: err?.message }];
            return this.executionRepository.save(savedExecution);
        }
    }

    private async executeNode(node: any, context: Record<string, any>): Promise<Record<string, any>> {
        const data = node.data || {};
        const nodeType = node.type || data.nodeType;

        switch (nodeType) {
            case 'trigger':
                return { message: `Trigger fired: ${data.triggerType || 'unknown'}`, context };

            case 'condition': {
                const field = data.field || '';
                const operator = data.operator || 'equals';
                const value = data.value;
                const contextValue = context[field];

                let conditionResult = false;
                switch (operator) {
                    case 'equals': conditionResult = contextValue == value; break;
                    case 'not_equals': conditionResult = contextValue != value; break;
                    case 'greater_than': conditionResult = Number(contextValue) > Number(value); break;
                    case 'less_than': conditionResult = Number(contextValue) < Number(value); break;
                    case 'contains': conditionResult = String(contextValue).includes(String(value)); break;
                    default: conditionResult = false;
                }

                return { message: `Condition: ${field} ${operator} ${value} → ${conditionResult}`, conditionResult };
            }

            case 'action': {
                const actionType = data.actionType || 'UNKNOWN';
                this.logger.log(`Workflow action executed: ${actionType}`, JSON.stringify(data));
                return { message: `Action executed: ${actionType}`, actionData: data };
            }

            default:
                return { message: `Unknown node type: ${nodeType}` };
        }
    }
}
