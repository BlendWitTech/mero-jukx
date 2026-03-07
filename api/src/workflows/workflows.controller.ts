import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkflowsService, CreateWorkflowDto, UpdateWorkflowDto } from './workflows.service';

@ApiTags('Workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WorkflowsController {
    constructor(private readonly workflowsService: WorkflowsService) {}

    @Post()
    @Permissions('organizations.view')
    @ApiOperation({ summary: 'Create a new workflow template' })
    @ApiResponse({ status: 201, description: 'Workflow created' })
    async create(
        @CurrentUser('organizationId') organizationId: string,
        @CurrentUser('userId') userId: string,
        @Body() dto: CreateWorkflowDto,
    ) {
        return this.workflowsService.create(organizationId, userId, dto);
    }

    @Get()
    @Permissions('organizations.view')
    @ApiOperation({ summary: 'List all workflow templates (org + system)' })
    @ApiResponse({ status: 200, description: 'Workflows retrieved' })
    async findAll(@CurrentUser('organizationId') organizationId: string) {
        return this.workflowsService.findAll(organizationId);
    }

    @Get(':id')
    @Permissions('organizations.view')
    @ApiOperation({ summary: 'Get a single workflow template' })
    @ApiResponse({ status: 200, description: 'Workflow retrieved' })
    @ApiResponse({ status: 404, description: 'Not found' })
    async findOne(
        @Param('id') id: string,
        @CurrentUser('organizationId') organizationId: string,
    ) {
        return this.workflowsService.findOne(id, organizationId);
    }

    @Put(':id')
    @Permissions('organizations.view')
    @ApiOperation({ summary: 'Update a workflow template (nodes/edges)' })
    @ApiResponse({ status: 200, description: 'Workflow updated' })
    async update(
        @Param('id') id: string,
        @CurrentUser('organizationId') organizationId: string,
        @Body() dto: UpdateWorkflowDto,
    ) {
        return this.workflowsService.update(id, organizationId, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('organizations.view')
    @ApiOperation({ summary: 'Delete a workflow template' })
    @ApiResponse({ status: 204, description: 'Workflow deleted' })
    async remove(
        @Param('id') id: string,
        @CurrentUser('organizationId') organizationId: string,
    ) {
        await this.workflowsService.remove(id, organizationId);
    }

    @Post(':id/execute')
    @Permissions('organizations.view')
    @ApiOperation({ summary: 'Execute a workflow with optional trigger data' })
    @ApiResponse({ status: 201, description: 'Execution record returned' })
    async execute(
        @Param('id') id: string,
        @CurrentUser('organizationId') organizationId: string,
        @Body() triggerData: Record<string, any>,
    ) {
        return this.workflowsService.execute(id, organizationId, triggerData || {});
    }

    @Get(':id/executions')
    @Permissions('organizations.view')
    @ApiOperation({ summary: 'Get execution history for a workflow' })
    @ApiResponse({ status: 200, description: 'Executions retrieved' })
    async getExecutions(
        @Param('id') id: string,
        @CurrentUser('organizationId') organizationId: string,
    ) {
        return this.workflowsService.getExecutions(id, organizationId);
    }
}
