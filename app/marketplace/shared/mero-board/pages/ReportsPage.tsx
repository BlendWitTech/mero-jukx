import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Loading,
  Select,
  Input,
} from '@shared/frontend';
import api from '@frontend/services/api';
import { ArrowLeft, TrendingUp, CheckSquare, Clock, Users, BarChart3, Flame, Timer, ExternalLink } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useAuthStore } from '@frontend/store/authStore';
import BurndownChart from '../components/BurndownChart';

export default function ReportsPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId?: string; projectId?: string }>();
  const navigate = useNavigate();
  const { appSlug } = useAppContext();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const isProjectContext = !!projectId;
  const [reportType, setReportType] = useState<'project' | 'workspace' | 'productivity' | 'cycle_time'>(
    isProjectContext ? 'project' : 'workspace'
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Project Report (only in project context)
  const { data: projectReport, isLoading: projectLoading } = useQuery({
    queryKey: ['project-report', appSlug, projectId],
    queryFn: async () => {
      const response = await api.get(`/apps/${appSlug}/projects/${projectId}/report`);
      return response.data;
    },
    enabled: isProjectContext && reportType === 'project' && !!projectId,
  });

  const { data: burndownReport, isLoading: burndownLoading } = useQuery({
    queryKey: ['burndown-report', appSlug, projectId],
    queryFn: async () => {
      const response = await api.get(`/apps/${appSlug}/projects/${projectId}/burndown?days=14`);
      return response.data;
    },
    enabled: isProjectContext && reportType === 'project' && !!projectId,
  });

  // Workspace Report (only in workspace context)
  const { data: workspaceReport, isLoading: workspaceLoading } = useQuery({
    queryKey: ['workspace-report', appSlug, workspaceId],
    queryFn: async () => {
      const response = await api.get(`/apps/${appSlug}/workspaces/${workspaceId}/report`);
      return response.data;
    },
    enabled: !isProjectContext && reportType === 'workspace' && !!workspaceId,
  });

  // Productivity Report (workspace-based or project-based)
  const { data: productivityReport, isLoading: productivityLoading } = useQuery({
    queryKey: ['productivity-report', appSlug, isProjectContext ? projectId : workspaceId, startDate, endDate, isProjectContext ? 'project' : 'workspace'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const endpoint = isProjectContext
        ? `/apps/${appSlug}/projects/${projectId}/productivity`
        : `/apps/${appSlug}/workspaces/${workspaceId}/productivity`;
      const response = await api.get(`${endpoint}?${params.toString()}`);
      return response.data;
    },
    enabled: reportType === 'productivity' && ((isProjectContext && !!projectId) || (!isProjectContext && !!workspaceId)),
  });

  // Cycle Time: use real backend endpoint (activity-based cycle time)
  const { data: cycleTimeReport, isLoading: cycleTimeLoading } = useQuery<{
    tasks: Array<{ id: string; title: string; priority: string; cycle_time_days: number | null; started_at: string | null; completed_at: string | null }>;
    avg_by_priority: Record<string, number>;
    overall_avg_days: number;
    median_days: number;
  }>({
    queryKey: ['cycle-time-report', appSlug, projectId],
    queryFn: async () => {
      const r = await api.get(`/apps/${appSlug}/projects/${projectId}/cycle-time`);
      return r.data;
    },
    enabled: reportType === 'cycle_time' && isProjectContext && !!projectId,
  });

  const cycleTimeByPriority = ['low', 'medium', 'high', 'urgent'].map((priority) => ({
    priority,
    avgDays: cycleTimeReport?.avg_by_priority?.[priority] ?? 0,
    count: cycleTimeReport?.tasks?.filter((t) => t.priority === priority).length ?? 0,
  }));

  const maxAvgDays = Math.max(...cycleTimeByPriority.map((b) => b.avgDays), 1);

  const isLoading = projectLoading || workspaceLoading || productivityLoading || cycleTimeLoading;

  return (
    <div className="h-full w-full p-6" style={{ backgroundColor: theme.colors.background }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="outline"
              onClick={() => {
                if (isProjectContext && projectId) {
                  navigate(`../../projects/${projectId}`, { relative: 'route' });
                } else if (workspaceId) {
                  navigate(`../`, { relative: 'route' });
                } else {
                  navigate('');
                }
              }}
              className="mb-4"
              style={{
                borderColor: theme.colors.border,
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
              }}
              onMouseEnter={(e: any) => {
                e.currentTarget.style.backgroundColor = theme.colors.background;
              }}
              onMouseLeave={(e: any) => {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {isProjectContext ? 'Back to Project' : 'Back to Workspace'}
            </Button>
            <h1 className="text-3xl font-bold" style={{ color: theme.colors.text }}>
              Reports & Analytics
            </h1>
            <p className="mt-2" style={{ color: theme.colors.textSecondary }}>
              {isProjectContext ? 'View project statistics and team productivity' : 'View workspace statistics and team productivity'}
            </p>
          </div>
        </div>

        {/* Report Type Selector */}
        <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium" style={{ color: theme.colors.text }}>
                Report Type:
              </label>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as 'project' | 'workspace' | 'productivity')}
                options={
                  isProjectContext
                    ? [
                      { value: 'project', label: 'Project Report' },
                      { value: 'productivity', label: 'Team Productivity' },
                      { value: 'cycle_time', label: 'Cycle Time Analysis' },
                    ]
                    : [
                      { value: 'workspace', label: 'Workspace Report' },
                      { value: 'productivity', label: 'Team Productivity' },
                      { value: 'cycle_time', label: 'Cycle Time Analysis' },
                    ]
                }
                className="w-48"
              />
              {reportType === 'productivity' && (
                <>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Start Date"
                    className="w-40"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="End Date"
                    className="w-40"
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loading size="lg" text="Loading report..." />
          </div>
        ) : reportType === 'project' && projectReport ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Task Statistics */}
              <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                    <CheckSquare className="h-5 w-5" />
                    Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span style={{ color: theme.colors.textSecondary }}>Total</span>
                      <span className="font-semibold" style={{ color: theme.colors.text }}>
                        {projectReport.task_stats.total}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: theme.colors.textSecondary }}>Completed</span>
                      <span className="font-semibold" style={{ color: theme.colors.text }}>
                        {projectReport.task_stats.completed}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: theme.colors.textSecondary }}>Completion Rate</span>
                      <span className="font-semibold" style={{ color: theme.colors.text }}>
                        {projectReport.task_stats.completion_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Breakdown */}
              <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                    <BarChart3 className="h-5 w-5" />
                    By Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(projectReport.task_stats.by_status).map(([status, count]: [string, any]) => (
                      <div key={status} className="flex justify-between">
                        <span style={{ color: theme.colors.textSecondary }}>{status.replace('_', ' ')}</span>
                        <span className="font-semibold" style={{ color: theme.colors.text }}>
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Time Statistics */}
              <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                    <Clock className="h-5 w-5" />
                    Time Logged
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span style={{ color: theme.colors.textSecondary }}>Total Hours</span>
                      <span className="font-semibold" style={{ color: theme.colors.text }}>
                        {projectReport.time_stats.total_hours.toFixed(1)}h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: theme.colors.textSecondary }}>Billable Hours</span>
                      <span className="font-semibold" style={{ color: theme.colors.text }}>
                        {projectReport.time_stats.billable_hours.toFixed(1)}h
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Team Statistics */}
              <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                    <Users className="h-5 w-5" />
                    Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span style={{ color: theme.colors.textSecondary }}>Total Members</span>
                      <span className="font-semibold" style={{ color: theme.colors.text }}>
                        {projectReport.team_stats.total_members}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: theme.colors.textSecondary }}>Active Members</span>
                      <span className="font-semibold" style={{ color: theme.colors.text }}>
                        {projectReport.team_stats.active_members}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Burndown Chart */}
            {burndownReport && (
              <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                    <Flame className="h-5 w-5 text-orange-500" />
                    Burndown Chart
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BurndownChart data={burndownReport} />
                </CardContent>
              </Card>
            )}
          </div>
        ) : reportType === 'workspace' && workspaceReport ? (
          <div className="space-y-6">
            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold mb-2" style={{ color: theme.colors.text }}>
                      {workspaceReport.overall_stats.total_projects}
                    </p>
                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                      Total Projects
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold mb-2" style={{ color: theme.colors.text }}>
                      {workspaceReport.overall_stats.total_tasks}
                    </p>
                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                      Total Tasks
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold mb-2" style={{ color: theme.colors.text }}>
                      {workspaceReport.overall_stats.completed_tasks}
                    </p>
                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                      Completed Tasks
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold mb-2" style={{ color: theme.colors.text }}>
                      {workspaceReport.overall_stats.overall_completion_rate.toFixed(1)}%
                    </p>
                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                      Completion Rate
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Breakdown */}
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <CardHeader>
                <CardTitle style={{ color: theme.colors.text }}>Project Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workspaceReport.project_stats.map((project: any) => (
                    <div
                      key={project.project_id}
                      className="p-4 rounded"
                      style={{ backgroundColor: theme.colors.background }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold" style={{ color: theme.colors.text }}>
                          {project.project_name}
                        </h3>
                        <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                          {project.completion_rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm" style={{ color: theme.colors.textSecondary }}>
                        <span>{project.completed_tasks} / {project.total_tasks} tasks completed</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : reportType === 'productivity' && productivityReport ? (
          <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                <TrendingUp className="h-5 w-5" />
                Team Productivity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productivityReport.team_members.length === 0 && (
                  <p className="text-sm text-center py-4" style={{ color: theme.colors.textSecondary }}>No team members found.</p>
                )}
                {productivityReport.team_members.map((member: any) => (
                  <div
                    key={member.user_id}
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold" style={{ color: theme.colors.text }}>
                        {member.user_name}
                      </h3>
                      <span className="text-sm font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: member.completion_rate >= 75 ? '#10b98120' : member.completion_rate >= 40 ? '#f59e0b20' : '#ef444420',
                          color: member.completion_rate >= 75 ? '#10b981' : member.completion_rate >= 40 ? '#f59e0b' : '#ef4444' }}>
                        {member.completion_rate.toFixed(1)}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full mb-3" style={{ backgroundColor: theme.colors.border }}>
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, member.completion_rate)}%`,
                          backgroundColor: member.completion_rate >= 75 ? '#10b981' : member.completion_rate >= 40 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p style={{ color: theme.colors.textSecondary }}>Assigned</p>
                        <p className="font-bold text-lg" style={{ color: theme.colors.text }}>{member.tasks_assigned}</p>
                      </div>
                      <div>
                        <p style={{ color: theme.colors.textSecondary }}>Completed</p>
                        <p className="font-bold text-lg" style={{ color: theme.colors.text }}>{member.tasks_completed}</p>
                      </div>
                      <div>
                        <p style={{ color: theme.colors.textSecondary }}>In Progress</p>
                        <p className="font-bold text-lg" style={{ color: theme.colors.text }}>
                          {member.tasks_assigned - member.tasks_completed}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: theme.colors.textSecondary }}>Time Logged</p>
                        <p className="font-bold text-lg" style={{ color: theme.colors.text }}>
                          {member.time_logged_hours.toFixed(1)}h
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : reportType === 'cycle_time' ? (
          <div className="space-y-6">
            {/* Summary row */}
            {cycleTimeReport && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                  <CardContent className="p-5 text-center">
                    <p className="text-3xl font-bold mb-1" style={{ color: theme.colors.text }}>{cycleTimeReport.overall_avg_days.toFixed(1)}</p>
                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Avg Cycle Time (days)</p>
                  </CardContent>
                </Card>
                <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                  <CardContent className="p-5 text-center">
                    <p className="text-3xl font-bold mb-1" style={{ color: theme.colors.text }}>{cycleTimeReport.median_days.toFixed(1)}</p>
                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Median Cycle Time (days)</p>
                  </CardContent>
                </Card>
                <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                  <CardContent className="p-5 text-center">
                    <p className="text-3xl font-bold mb-1" style={{ color: theme.colors.text }}>
                      {cycleTimeReport.tasks.filter((t) => t.cycle_time_days !== null).length}
                    </p>
                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Completed Tasks Measured</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* By Priority */}
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                  <Timer className="h-5 w-5 text-blue-500" />
                  Avg Cycle Time by Priority
                  <span className="text-xs font-normal ml-2" style={{ color: theme.colors.textSecondary }}>
                    (time from work start → done, via activity log)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cycleTimeByPriority.every((b) => b.count === 0) ? (
                  <p className="text-sm" style={{ color: theme.colors.textSecondary }}>No completed tasks found. Cycle time requires tasks to have been moved to In Progress and then Done.</p>
                ) : (
                  <div className="space-y-4">
                    {cycleTimeByPriority.map((b) => (
                      <div key={b.priority}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize" style={{ color: theme.colors.text }}>
                            {b.priority} <span style={{ color: theme.colors.textSecondary }}>({b.count} tasks done)</span>
                          </span>
                          <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                            {b.avgDays > 0 ? `${b.avgDays.toFixed(1)} days` : '—'}
                          </span>
                        </div>
                        <div className="h-2 rounded-full" style={{ backgroundColor: theme.colors.border }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: b.avgDays > 0 ? `${Math.min(100, (b.avgDays / maxAvgDays) * 100)}%` : '0%',
                              backgroundColor: b.priority === 'urgent' ? '#ef4444' : b.priority === 'high' ? '#f59e0b' : b.priority === 'medium' ? '#3b82f6' : '#6b7280',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Task table */}
            {cycleTimeReport && cycleTimeReport.tasks.length > 0 && (
              <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                    <BarChart3 className="h-5 w-5 text-green-500" />
                    Completed Tasks — Cycle Time Detail
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                          {['Task', 'Priority', 'Started', 'Completed', 'Cycle Time'].map((h) => (
                            <th key={h} className="text-left py-2 pr-4 font-semibold" style={{ color: theme.colors.textSecondary }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cycleTimeReport.tasks.slice(0, 20).map((t) => (
                          <tr key={t.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                            <td className="py-2 pr-4 font-medium" style={{ color: theme.colors.text }}>{t.title}</td>
                            <td className="py-2 pr-4 capitalize" style={{ color: theme.colors.textSecondary }}>{t.priority}</td>
                            <td className="py-2 pr-4" style={{ color: theme.colors.textSecondary }}>
                              {t.started_at ? new Date(t.started_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-2 pr-4" style={{ color: theme.colors.textSecondary }}>
                              {t.completed_at ? new Date(t.completed_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-2 font-semibold" style={{ color: t.cycle_time_days !== null ? theme.colors.text : theme.colors.textSecondary }}>
                              {t.cycle_time_days !== null ? `${t.cycle_time_days} days` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {cycleTimeReport.tasks.length > 20 && (
                      <p className="text-xs mt-3" style={{ color: theme.colors.textSecondary }}>
                        Showing 20 of {cycleTimeReport.tasks.length} tasks
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
