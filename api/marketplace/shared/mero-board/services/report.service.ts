import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../../../src/database/entities/projects.entity';
import { Task, TaskStatus } from '../../../../src/database/entities/tasks.entity';
import { TaskTimeLog } from '../entities/task-time-log.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { TaskActivity, TaskActivityType } from '../entities/task-activity.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(TaskTimeLog)
    private timeLogRepository: Repository<TaskTimeLog>,
    @InjectRepository(WorkspaceMember)
    private memberRepository: Repository<WorkspaceMember>,
    @InjectRepository(TaskActivity)
    private activityRepository: Repository<TaskActivity>,
  ) { }

  async getProjectReport(
    userId: string,
    organizationId: string,
    projectId: string,
  ): Promise<{
    project: Project;
    task_stats: {
      total: number;
      by_status: Record<TaskStatus, number>;
      by_priority: Record<string, number>;
      completed: number;
      completion_rate: number;
    };
    team_stats: {
      total_members: number;
      active_members: number;
    };
    time_stats: {
      total_minutes: number;
      total_hours: number;
      billable_hours: number;
    };
  }> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, organization_id: organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Load workspace members separately with user relations
    let workspaceMembers: WorkspaceMember[] = [];
    if (project.workspace_id) {
      workspaceMembers = await this.memberRepository.find({
        where: { workspace_id: project.workspace_id, is_active: true },
        relations: ['user'],
      });
    }

    // Get all tasks for the project
    const tasks = await this.taskRepository.find({
      where: { project_id: projectId, organization_id: organizationId },
    });

    // Task statistics
    const task_stats = {
      total: tasks.length,
      by_status: {
        [TaskStatus.TODO]: tasks.filter((t) => t.status === TaskStatus.TODO).length,
        [TaskStatus.IN_PROGRESS]: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
        [TaskStatus.IN_REVIEW]: tasks.filter((t) => t.status === TaskStatus.IN_REVIEW).length,
        [TaskStatus.DONE]: tasks.filter((t) => t.status === TaskStatus.DONE).length,
      },
      by_priority: {
        low: tasks.filter((t) => t.priority === 'low').length,
        medium: tasks.filter((t) => t.priority === 'medium').length,
        high: tasks.filter((t) => t.priority === 'high').length,
        urgent: tasks.filter((t) => t.priority === 'urgent').length,
      },
      completed: tasks.filter((t) => t.status === TaskStatus.DONE).length,
      completion_rate: tasks.length > 0 ? (tasks.filter((t) => t.status === TaskStatus.DONE).length / tasks.length) * 100 : 0,
    };

    // Team statistics
    const team_stats = {
      total_members: workspaceMembers.length,
      active_members: workspaceMembers.length, // All loaded members are active
    };

    // Time statistics
    const timeLogs = await this.timeLogRepository
      .createQueryBuilder('log')
      .innerJoin('log.task', 'task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :organizationId', { organizationId })
      .getMany();

    const total_minutes = timeLogs.reduce((sum, log) => sum + log.duration_minutes, 0);
    const billable_minutes = timeLogs
      .filter((log) => log.is_billable)
      .reduce((sum, log) => sum + log.duration_minutes, 0);

    const time_stats = {
      total_minutes,
      total_hours: Math.round((total_minutes / 60) * 100) / 100,
      billable_hours: Math.round((billable_minutes / 60) * 100) / 100,
    };

    return {
      project,
      task_stats,
      team_stats,
      time_stats,
    };
  }

  async getWorkspaceReport(
    userId: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<{
    workspace: any;
    project_stats: Array<{
      project_id: string;
      project_name: string;
      total_tasks: number;
      completed_tasks: number;
      completion_rate: number;
    }>;
    overall_stats: {
      total_projects: number;
      total_tasks: number;
      completed_tasks: number;
      overall_completion_rate: number;
    };
  }> {
    // This would require workspace service - for now, return basic structure
    const projects = await this.projectRepository.find({
      where: { workspace_id: workspaceId, organization_id: organizationId },
    });

    const project_stats = await Promise.all(
      projects.map(async (project) => {
        const tasks = await this.taskRepository.find({
          where: { project_id: project.id, organization_id: organizationId },
        });
        const completed = tasks.filter((t) => t.status === TaskStatus.DONE).length;
        return {
          project_id: project.id,
          project_name: project.name,
          total_tasks: tasks.length,
          completed_tasks: completed,
          completion_rate: tasks.length > 0 ? (completed / tasks.length) * 100 : 0,
        };
      }),
    );

    const allTasks = await this.taskRepository
      .createQueryBuilder('task')
      .innerJoin('task.project', 'project')
      .where('project.workspace_id = :workspaceId', { workspaceId })
      .andWhere('task.organization_id = :organizationId', { organizationId })
      .getMany();

    const overall_stats = {
      total_projects: projects.length,
      total_tasks: allTasks.length,
      completed_tasks: allTasks.filter((t) => t.status === TaskStatus.DONE).length,
      overall_completion_rate: allTasks.length > 0 ? (allTasks.filter((t) => t.status === TaskStatus.DONE).length / allTasks.length) * 100 : 0,
    };

    return {
      workspace: { id: workspaceId },
      project_stats,
      overall_stats,
    };
  }

  async getTeamProductivityReport(
    userId: string,
    organizationId: string,
    id: string, // Can be workspaceId or projectId
    startDate?: string,
    endDate?: string,
    type: 'workspace' | 'project' = 'workspace',
  ): Promise<{
    team_members: Array<{
      user_id: string;
      user_name: string;
      tasks_assigned: number;
      tasks_completed: number;
      completion_rate: number;
      time_logged_minutes: number;
      time_logged_hours: number;
    }>;
  }> {
    let workspaceMembers: WorkspaceMember[] = [];
    let allTasks: Task[] = [];
    let timeLogsQuery;

    if (type === 'workspace') {
      // Load workspace members
      workspaceMembers = await this.memberRepository.find({
        where: { workspace_id: id, is_active: true },
        relations: ['user'],
      });

      // Get all tasks in workspace projects
      allTasks = await this.taskRepository
        .createQueryBuilder('task')
        .innerJoin('task.project', 'project')
        .where('project.workspace_id = :workspaceId', { workspaceId: id })
        .andWhere('task.organization_id = :organizationId', { organizationId })
        .getMany();

      // Get time logs for all tasks in workspace
      timeLogsQuery = this.timeLogRepository
        .createQueryBuilder('log')
        .innerJoin('log.task', 'task')
        .innerJoin('task.project', 'project')
        .where('project.workspace_id = :workspaceId', { workspaceId: id })
        .andWhere('task.organization_id = :organizationId', { organizationId });
    } else {
      // Project-based
      const project = await this.projectRepository.findOne({
        where: { id: id, organization_id: organizationId },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      // Load workspace members
      if (project.workspace_id) {
        workspaceMembers = await this.memberRepository.find({
          where: { workspace_id: project.workspace_id, is_active: true },
          relations: ['user'],
        });
      }

      // Get all tasks for the project
      allTasks = await this.taskRepository.find({
        where: { project_id: id, organization_id: organizationId },
      });

      // Get time logs for all tasks in project
      timeLogsQuery = this.timeLogRepository
        .createQueryBuilder('log')
        .innerJoin('log.task', 'task')
        .where('task.project_id = :projectId', { projectId: id })
        .andWhere('task.organization_id = :organizationId', { organizationId });
    }

    if (startDate) {
      timeLogsQuery.andWhere('log.logged_date >= :startDate', { startDate });
    }
    if (endDate) {
      timeLogsQuery.andWhere('log.logged_date <= :endDate', { endDate });
    }

    const timeLogs = await timeLogsQuery.getMany();

    const team_members = workspaceMembers.map((member) => {
      const userTasks = allTasks.filter((t) => t.assignee_id === member.user_id);
      const completedTasks = userTasks.filter((t) => t.status === TaskStatus.DONE);
      const userTimeLogs = timeLogs.filter((log) => log.user_id === member.user_id);
      const totalMinutes = userTimeLogs.reduce((sum, log) => sum + log.duration_minutes, 0);

      return {
        user_id: member.user_id,
        user_name: `${member.user.first_name} ${member.user.last_name}`,
        tasks_assigned: userTasks.length,
        tasks_completed: completedTasks.length,
        completion_rate: userTasks.length > 0 ? (completedTasks.length / userTasks.length) * 100 : 0,
        time_logged_minutes: totalMinutes,
        time_logged_hours: Math.round((totalMinutes / 60) * 100) / 100,
      };
    });

    return { team_members };
  }

  async getBurndownReport(
    userId: string,
    organizationId: string,
    projectId: string,
    days: number = 30,
  ): Promise<{
    labels: string[];
    ideal_burn: number[];
    actual_burn: number[];
  }> {
    const tasks = await this.taskRepository.find({
      where: { project_id: projectId, organization_id: organizationId },
    });

    const totalTasks = tasks.length;
    const labels: string[] = [];
    const ideal_burn: number[] = [];
    const actual_burn: number[] = [];

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    // Ideal burn assumes a linear reduction from total tasks to 0
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      labels.push(date.toISOString().split('T')[0]);

      const idealValue = totalTasks - (totalTasks / days) * i;
      ideal_burn.push(Math.max(0, Math.round(idealValue * 100) / 100));

      // Actual burn: count tasks not completed by this date
      const tasksRemaining = tasks.filter(t => {
        if (!t.completed_at) return true; // Still open
        const completedDate = new Date(t.completed_at);
        return completedDate > date; // Completed after this date
      }).length;

      actual_burn.push(tasksRemaining);
    }

    return { labels, ideal_burn, actual_burn };
  }

  async getTimeEstimateAnalysis(
    userId: string,
    organizationId: string,
    projectId: string,
  ): Promise<{
    tasks: Array<{
      id: string;
      title: string;
      original_estimate: number;
      actual_time: number;
      variance: number;
    }>;
    overall_variance: number;
  }> {
    const tasks = await this.taskRepository.find({
      where: { project_id: projectId, organization_id: organizationId },
    });

    const analysis = await Promise.all(
      tasks.map(async (task) => {
        const logs = await this.timeLogRepository.find({
          where: { task_id: task.id },
        });
        const actual_time = logs.reduce((sum, log) => sum + log.duration_minutes, 0);
        const original_estimate = task.original_estimate_minutes || 0;

        return {
          id: task.id,
          title: task.title,
          original_estimate,
          actual_time,
          variance: actual_time - original_estimate,
        };
      })
    );

    const overall_variance = analysis.reduce((sum, item) => sum + item.variance, 0);

    return { tasks: analysis, overall_variance };
  }

  /**
   * Cycle time analysis: real cycle time computed from task activity logs.
   * Cycle time = time from first STATUS_CHANGED to in_progress → time task reached DONE.
   */
  async getCycleTimeReport(
    userId: string,
    organizationId: string,
    projectId: string,
  ): Promise<{
    tasks: Array<{
      id: string;
      title: string;
      priority: string;
      cycle_time_days: number | null;
      started_at: string | null;
      completed_at: string | null;
    }>;
    avg_by_priority: Record<string, number>;
    overall_avg_days: number;
    median_days: number;
  }> {
    const doneTasks = await this.taskRepository.find({
      where: { project_id: projectId, organization_id: organizationId, status: TaskStatus.DONE },
    });

    const results = await Promise.all(
      doneTasks.map(async (task) => {
        // Find first time status changed to in_progress
        const startActivity = await this.activityRepository
          .createQueryBuilder('a')
          .where('a.task_id = :taskId', { taskId: task.id })
          .andWhere('a.activity_type = :type', { type: TaskActivityType.STATUS_CHANGED })
          .andWhere("a.new_value->>'status' = 'in_progress'")
          .orderBy('a.created_at', 'ASC')
          .getOne();

        // Find time status changed to done
        const doneActivity = await this.activityRepository
          .createQueryBuilder('a')
          .where('a.task_id = :taskId', { taskId: task.id })
          .andWhere('a.activity_type = :type', { type: TaskActivityType.STATUS_CHANGED })
          .andWhere("a.new_value->>'status' = 'done'")
          .orderBy('a.created_at', 'DESC')
          .getOne();

        let cycle_time_days: number | null = null;
        const started_at = startActivity ? startActivity.created_at.toISOString() : null;
        const completed_at_str = doneActivity
          ? doneActivity.created_at.toISOString()
          : (task.completed_at ? task.completed_at.toISOString() : null);

        if (startActivity && (doneActivity || task.completed_at)) {
          const end = doneActivity ? doneActivity.created_at : task.completed_at;
          const diffMs = end.getTime() - startActivity.created_at.getTime();
          cycle_time_days = Math.max(0, Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10);
        }

        return {
          id: task.id,
          title: task.title,
          priority: task.priority,
          cycle_time_days,
          started_at,
          completed_at: completed_at_str,
        };
      })
    );

    // Compute averages by priority
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const avg_by_priority: Record<string, number> = {};
    for (const p of priorities) {
      const bucket = results.filter((r) => r.priority === p && r.cycle_time_days !== null);
      avg_by_priority[p] = bucket.length
        ? Math.round((bucket.reduce((s, r) => s + r.cycle_time_days!, 0) / bucket.length) * 10) / 10
        : 0;
    }

    const allWithCycleTime = results.filter((r) => r.cycle_time_days !== null);
    const overall_avg_days = allWithCycleTime.length
      ? Math.round((allWithCycleTime.reduce((s, r) => s + r.cycle_time_days!, 0) / allWithCycleTime.length) * 10) / 10
      : 0;

    // Median
    const sorted = allWithCycleTime.map((r) => r.cycle_time_days!).sort((a, b) => a - b);
    const median_days = sorted.length
      ? sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)]
      : 0;

    return { tasks: results, avg_by_priority, overall_avg_days, median_days };
  }
}


