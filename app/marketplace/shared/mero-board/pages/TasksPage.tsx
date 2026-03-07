import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Badge,
  Modal,
  Textarea,
  Loading,
  Skeleton,
} from '@shared/frontend';
import { SearchBar } from '@shared/frontend/components/data-display/SearchBar';
import { EmptyState } from '@shared/frontend/components/feedback/EmptyState';
import api from '@frontend/services/api';
import { ArrowLeft, Plus, CheckSquare, Filter, X, Calendar as CalendarIcon, SortAsc, Grid3x3, List, Bookmark, GanttChart, Download, Upload, FileSpreadsheet, FileText } from 'lucide-react';
import TaskKanban from '../components/TaskKanban';
import TaskGantt from '../components/TaskGantt';
import TaskCalendar from '../components/TaskCalendar';
import { useAppContext } from '../contexts/AppContext';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useAuthStore } from '@frontend/store/authStore';
import toast from '@shared/frontend/hooks/useToast';
import { ConfirmDialog } from '@shared/frontend/components/feedback/ConfirmDialog';

// Task enums - matching backend
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  assignee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  due_date: string | null;
  created_at: string;
  tags: string[];
}

export default function TasksPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { appSlug } = useAppContext();
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assigneeId: '',
    search: '',
    dueDate: '', // 'overdue', 'today', 'this_week', 'this_month', 'none'
    tags: [] as string[],
  });
  const [sortBy, setSortBy] = useState<'created_at' | 'due_date' | 'priority' | 'status' | 'title'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'gantt' | 'calendar'>('list');
  const [savedFilters, setSavedFilters] = useState<Array<{ id: string; name: string; filters: typeof filters }>>(() => {
    const saved = localStorage.getItem(`mero-board-saved-filters-${projectId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    assignee_id: '',
    due_date: '',
    tags: [] as string[],
  });

  // Fetch tasks with filters
  const { data: tasksData, isLoading } = useQuery<{ tickets: Task[]; total: number }>({
    queryKey: ['tasks', appSlug, projectId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assigneeId) params.append('assignee_id', filters.assigneeId); // Match backend expectation
      if (filters.search) params.append('search', filters.search);
      if (projectId) params.append('projectId', projectId); // Filter by project

      const response = await api.get(`/apps/${appSlug}/projects/${projectId}/tasks?${params.toString()}`);
      return response.data;
    },
    enabled: !!projectId && !!appSlug,
    staleTime: 0, // Always fetch fresh data
  });
  const tasks = tasksData?.tickets || []; // TicketsService returns { tickets, total, ... }

  // Fetch project members for assignee dropdown
  const { data: workspace } = useQuery({
    queryKey: ['workspace', appSlug, workspaceId],
    queryFn: async () => {
      const response = await api.get(`/apps/${appSlug}/workspaces/${workspaceId}`);
      return response.data;
    },
    enabled: !!workspaceId,
  });

  const members = workspace?.members || [];

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/apps/${appSlug}/projects/${projectId}/tasks`, { ...data });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', appSlug, projectId] });
      setShowCreateModal(false);
      setTaskForm({
        title: '',
        description: '',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        assignee_id: '',
        due_date: '',
        tags: [],
      });
      toast.success('Task created successfully');
    },
    onError: (error: any) => {
      console.error('Task creation error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create task';
      toast.error(errorMessage);
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: any }) => {
      const response = await api.put(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', appSlug, projectId] });
      toast.success('Task updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update task');
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', appSlug, projectId] });
      toast.success('Task deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete task');
    },
  });

  const handleCreateTask = () => {
    if (!projectId) {
      toast.error('Project ID is missing. Please navigate to a project first.');
      return;
    }

    if (!taskForm.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    createTaskMutation.mutate({
      ...taskForm,
      assignee_id: taskForm.assignee_id || undefined,
      due_date: taskForm.due_date || undefined,
      tags: taskForm.tags && taskForm.tags.length > 0 ? taskForm.tags : undefined,
    });
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTaskMutation.mutate({
      taskId,
      data: { status: newStatus },
    });
  };

  const handlePriorityChange = (taskId: string, newPriority: TaskPriority) => {
    updateTaskMutation.mutate({
      taskId,
      data: { priority: newPriority },
    });
  };

  const getStatusColor = (status: TaskStatus): { bg: string; text: string; border: string } => {
    switch (status) {
      case TaskStatus.TODO:
        return {
          bg: theme.colors.surface,
          text: theme.colors.textSecondary,
          border: theme.colors.border,
        };
      case TaskStatus.IN_PROGRESS:
        return {
          bg: `${theme.colors.primary}40`,
          text: theme.colors.primary,
          border: `${theme.colors.primary}80`,
        };
      case TaskStatus.IN_REVIEW:
        return {
          bg: '#0ea5e940',
          text: '#0ea5e9',
          border: '#0ea5e980',
        };
      case TaskStatus.DONE:
        return {
          bg: '#10b98140',
          text: '#10b981',
          border: '#10b98180',
        };
      default:
        return {
          bg: theme.colors.surface,
          text: theme.colors.textSecondary,
          border: theme.colors.border,
        };
    }
  };

  const getPriorityColor = (priority: TaskPriority): { bg: string; text: string; border: string } => {
    switch (priority) {
      case TaskPriority.LOW:
        return {
          bg: theme.colors.surface,
          text: theme.colors.textSecondary,
          border: theme.colors.border,
        };
      case TaskPriority.MEDIUM:
        return {
          bg: '#0ea5e940',
          text: '#0ea5e9',
          border: '#0ea5e980',
        };
      case TaskPriority.HIGH:
        return {
          bg: '#f59e0b40',
          text: '#f59e0b',
          border: '#f59e0b80',
        };
      case TaskPriority.URGENT:
        return {
          bg: '#ef444440',
          text: '#ef4444',
          border: '#ef444480',
        };
      default:
        return {
          bg: theme.colors.surface,
          text: theme.colors.textSecondary,
          border: theme.colors.border,
        };
    }
  };

  // Keep the old functions for Badge component compatibility
  const getStatusColorVariant = (status: TaskStatus): 'default' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case TaskStatus.TODO:
        return 'default';
      case TaskStatus.IN_PROGRESS:
        return 'warning'; // Changed from 'primary' to 'warning' to match TaskKanban interface
      case TaskStatus.IN_REVIEW:
        return 'info';
      case TaskStatus.DONE:
        return 'success';
      default:
        return 'default';
    }
  };

  const getPriorityColorVariant = (priority: TaskPriority): 'default' | 'info' | 'warning' | 'danger' => {
    switch (priority) {
      case TaskPriority.LOW:
        return 'default';
      case TaskPriority.MEDIUM:
        return 'info';
      case TaskPriority.HIGH:
        return 'warning';
      case TaskPriority.URGENT:
        return 'danger';
      default:
        return 'default';
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      assigneeId: '',
      search: '',
      dueDate: '',
      tags: [],
    });
  };

  const saveCurrentFilter = () => {
    if (!filterName.trim()) return;
    const newFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      filters: { ...filters },
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(`mero-board-saved-filters-${projectId}`, JSON.stringify(updated));
    setFilterName('');
    setShowSaveFilterModal(false);
    toast.success('Filter saved successfully');
  };

  const loadFilter = (savedFilter: typeof savedFilters[0]) => {
    setFilters(savedFilter.filters);
    toast.success(`Filter "${savedFilter.name}" loaded`);
  };

  const deleteFilter = (filterId: string) => {
    const updated = savedFilters.filter((f) => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem(`mero-board-saved-filters-${projectId}`, JSON.stringify(updated));
    toast.success('Filter deleted');
  };

  // Preset filters
  const presetFilters = [
    {
      name: 'My Tasks',
      filters: {
        status: '',
        priority: '',
        assigneeId: user?.id || '',
        search: '',
        dueDate: '',
        tags: [],
      },
    },
    {
      name: 'Overdue',
      filters: {
        status: '',
        priority: '',
        assigneeId: '',
        search: '',
        dueDate: 'overdue',
        tags: [],
      },
    },
    {
      name: 'Due This Week',
      filters: {
        status: '',
        priority: '',
        assigneeId: '',
        search: '',
        dueDate: 'this_week',
        tags: [],
      },
    },
    {
      name: 'High Priority',
      filters: {
        status: '',
        priority: TaskPriority.HIGH,
        assigneeId: '',
        search: '',
        dueDate: '',
        tags: [],
      },
    },
    {
      name: 'In Progress',
      filters: {
        status: TaskStatus.IN_PROGRESS,
        priority: '',
        assigneeId: '',
        search: '',
        dueDate: '',
        tags: [],
      },
    },
  ];

  const applyPresetFilter = (preset: typeof presetFilters[0]) => {
    setFilters(preset.filters);
    toast.success(`Applied filter: ${preset.name}`);
  };

  const exportToCSV = () => {
    if (!tasks || tasks.length === 0) { toast.error('No tasks to export'); return; }
    const headers = ['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Tags'];
    const rows = tasks.map((t) => [
      `"${t.title.replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      t.assignee ? `${t.assignee.first_name} ${t.assignee.last_name}` : '',
      t.due_date ? new Date(t.due_date).toLocaleDateString() : '',
      (t.tags || []).join(';'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${projectId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Tasks exported to CSV');
  };

  const exportToExcel = () => {
    if (!tasks || tasks.length === 0) { toast.error('No tasks to export'); return; }
    // SpreadsheetML format — opens natively in Excel, no library needed
    const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const row = (cells: string[]) =>
      `<Row>${cells.map((c) => `<Cell><Data ss:Type="String">${esc(c)}</Data></Cell>`).join('')}</Row>`;
    const headers = ['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Tags', 'Created At'];
    const dataRows = tasks.map((t) =>
      row([
        t.title,
        t.status,
        t.priority,
        t.assignee ? `${t.assignee.first_name} ${t.assignee.last_name}` : '',
        t.due_date ? new Date(t.due_date).toLocaleDateString() : '',
        (t.tags || []).join(', '),
        new Date(t.created_at).toLocaleDateString(),
      ])
    );
    const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Tasks">
<Table>
${row(headers)}
${dataRows.join('\n')}
</Table>
</Worksheet>
</Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${projectId}-${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Tasks exported to Excel');
  };

  const exportToPDF = () => {
    if (!tasks || tasks.length === 0) { toast.error('No tasks to export'); return; }
    const dateStr = new Date().toLocaleDateString();
    const rows = tasks.map((t) => `
      <tr>
        <td>${t.title.replace(/</g, '&lt;')}</td>
        <td>${t.status.replace('_', ' ')}</td>
        <td>${t.priority}</td>
        <td>${t.assignee ? `${t.assignee.first_name} ${t.assignee.last_name}` : '—'}</td>
        <td>${t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</td>
        <td>${(t.tags || []).join(', ') || '—'}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Tasks Export</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  p { color: #666; margin-bottom: 16px; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e293b; color: white; padding: 8px; text-align: left; }
  td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
</style></head><body>
<h1>Task Report</h1><p>Project: ${projectId} &nbsp;·&nbsp; Exported: ${dateStr} &nbsp;·&nbsp; Total: ${tasks.length} tasks</p>
<table><thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due Date</th><th>Tags</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 500);
    }
    toast.success('PDF print dialog opened');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split('\n').slice(1); // skip header
      let imported = 0;
      for (const line of lines) {
        const cols = line.split(',');
        const title = cols[0]?.replace(/^"|"$/g, '').trim();
        const status = cols[1]?.trim() || 'todo';
        const priority = cols[2]?.trim() || 'medium';
        if (!title) continue;
        try {
          await createTaskMutation.mutateAsync({ title, status, priority });
          imported++;
        } catch { }
      }
      toast.success(`Imported ${imported} tasks from CSV`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const hasActiveFilters = filters.status || filters.priority || filters.assigneeId || filters.search || filters.dueDate || filters.tags.length > 0;

  if (!projectId) {
    return (
      <div className="h-full w-full p-6" style={{ backgroundColor: theme.colors.background }}>
        <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold mb-2" style={{ color: theme.colors.text }}>No Project Selected</p>
            <p className="mb-4" style={{ color: theme.colors.textSecondary }}>
              Please navigate to a project to view and create tasks.
            </p>
            <Button
              onClick={() => navigate(`../projects`, { relative: 'route' })}
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textSecondary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.border;
                e.currentTarget.style.color = theme.colors.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
                e.currentTarget.style.color = theme.colors.textSecondary;
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full w-full p-6" style={{ backgroundColor: theme.colors.background }}>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-6" style={{ backgroundColor: theme.colors.background }}>
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(`../projects`, { relative: 'route' })}
          className="mb-4"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.textSecondary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.border;
            e.currentTarget.style.color = theme.colors.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.surface;
            e.currentTarget.style.color = theme.colors.textSecondary;
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: theme.colors.text }}>Tasks</h1>
            <p className="mt-2" style={{ color: theme.colors.textSecondary }}>Manage your project tasks</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : ''
                  }`}
                style={
                  viewMode === 'list'
                    ? { backgroundColor: theme.colors.primary, color: 'white' }
                    : { color: theme.colors.textSecondary }
                }
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'kanban' ? 'bg-primary text-white' : ''
                  }`}
                style={
                  viewMode === 'kanban'
                    ? { backgroundColor: theme.colors.primary, color: 'white' }
                    : { color: theme.colors.textSecondary }
                }
                title="Kanban View"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'gantt' ? 'bg-primary text-white' : ''
                  }`}
                style={
                  viewMode === 'gantt'
                    ? { backgroundColor: theme.colors.primary, color: 'white' }
                    : { color: theme.colors.textSecondary }
                }
                title="Gantt Chart View"
              >
                <GanttChart className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'calendar' ? 'bg-primary text-white' : ''
                  }`}
                style={
                  viewMode === 'calendar'
                    ? { backgroundColor: theme.colors.primary, color: 'white' }
                    : { color: theme.colors.textSecondary }
                }
                title="Calendar View"
              >
                <CalendarIcon className="h-4 w-4" />
              </button>
            </div>
            <Button
              onClick={() => {
                if (!projectId) {
                  toast.error('Project ID is missing. Please navigate to a project first.');
                  return;
                }
                setShowCreateModal(true);
              }}
              disabled={!projectId}
              className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
            <Button variant="outline" onClick={exportToCSV} title="Export to CSV">
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={exportToExcel} title="Export to Excel">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={exportToPDF} title="Export to PDF">
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <label className="cursor-pointer">
              <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
              <span
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                style={{ borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }}
              >
                <Upload className="h-4 w-4 mr-1" /> Import CSV
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Preset Filters */}
              <Select
                value=""
                onChange={(e) => {
                  const preset = presetFilters.find((p) => p.name === e.target.value);
                  if (preset) applyPresetFilter(preset);
                }}
                placeholder="Quick Filters"
                options={[
                  { value: '', label: 'Quick Filters' },
                  ...presetFilters.map((preset) => ({
                    value: preset.name,
                    label: preset.name,
                  })),
                ]}
                className="w-40"
                theme={theme}
              />
              {/* Saved Filters */}
              {savedFilters.length > 0 && (
                <Select
                  value=""
                  onChange={(e) => {
                    const saved = savedFilters.find((f) => f.id === e.target.value);
                    if (saved) loadFilter(saved);
                  }}
                  placeholder="Saved Filters"
                  options={[
                    { value: '', label: 'Saved Filters' },
                    ...savedFilters.map((filter) => ({
                      value: filter.id,
                      label: filter.name,
                    })),
                  ]}
                  className="w-40"
                  theme={theme}
                />
              )}
              {/* Save Current Filter */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveFilterModal(true)}
                  title="Save current filter"
                >
                  <Bookmark className="h-4 w-4 mr-1" />
                  Save Filter
                </Button>
              )}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <SearchBar
                placeholder="Search tasks..."
                onSearch={(value) => setFilters({ ...filters, search: value })}
                debounceMs={300}
                theme={theme}
              />
            </div>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              placeholder="Filter by status"
              options={[
                { value: '', label: 'All Statuses' },
                { value: TaskStatus.TODO, label: 'To Do' },
                { value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
                { value: TaskStatus.IN_REVIEW, label: 'In Review' },
                { value: TaskStatus.DONE, label: 'Done' },
              ]}
              theme={theme}
            />
            <Select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              placeholder="Filter by priority"
              options={[
                { value: '', label: 'All Priorities' },
                { value: TaskPriority.LOW, label: 'Low' },
                { value: TaskPriority.MEDIUM, label: 'Medium' },
                { value: TaskPriority.HIGH, label: 'High' },
                { value: TaskPriority.URGENT, label: 'Urgent' },
              ]}
              theme={theme}
            />
            <Select
              value={filters.assigneeId}
              onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })}
              placeholder="Filter by assignee"
              options={[
                { value: '', label: 'All Assignees' },
                ...members.map((member: any) => ({
                  value: member.user.id,
                  label: `${member.user.first_name} ${member.user.last_name}`,
                })),
              ]}
              theme={theme}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tasks View */}
      {tasks && tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="h-12 w-12" />}
          title="No tasks yet"
          description={hasActiveFilters ? "No tasks match your filters" : "Create your first task to get started"}
          action={
            !hasActiveFilters ? {
              label: 'Create Task',
              onClick: () => setShowCreateModal(true),
            } : undefined
          }
        />
      ) : viewMode === 'kanban' ? (
        <div className="h-[calc(100vh-400px)]">
          <TaskKanban
            tasks={tasks || []}
            onTaskClick={(taskId) => navigate(`${taskId}`, { relative: 'route' })}
            onStatusChange={handleStatusChange}
            getStatusColor={getStatusColorVariant}
            getPriorityColor={getPriorityColorVariant}
          />
        </div>
      ) : viewMode === 'gantt' ? (
        <div className="h-[calc(100vh-260px)]">
          <TaskGantt
            tasks={tasks || []}
            onTaskClick={(taskId) => navigate(`${taskId}`, { relative: 'route' })}
            onTaskUpdate={(taskId, data) => updateTaskMutation.mutate({ taskId, data })}
          />
        </div>
      ) : viewMode === 'calendar' ? (
        <div>
          <TaskCalendar
            tasks={tasks || []}
            onTaskClick={(taskId) => navigate(`${taskId}`, { relative: 'route' })}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {tasks?.map((task) => (
            <Card
              key={task.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = theme.colors.border;
              }}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`${task.id}`, { relative: 'route' })}>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-lg hover:underline" style={{ color: theme.colors.text }}>{task.title}</h3>
                      <span
                        className="inline-flex items-center justify-center rounded-full font-semibold text-xs px-3 py-1.5 capitalize whitespace-nowrap"
                        style={{
                          backgroundColor: getStatusColor(task.status).bg,
                          color: getStatusColor(task.status).text,
                          border: `1px solid ${getStatusColor(task.status).border}`,
                          padding: '6px 12px',
                          minHeight: '24px',
                        }}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                      <span
                        className="inline-flex items-center justify-center rounded-full font-semibold text-xs px-3 py-1.5 capitalize whitespace-nowrap"
                        style={{
                          backgroundColor: getPriorityColor(task.priority).bg,
                          color: getPriorityColor(task.priority).text,
                          border: `1px solid ${getPriorityColor(task.priority).border}`,
                          padding: '6px 12px',
                          minHeight: '24px',
                        }}
                      >
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm mb-2" style={{ color: theme.colors.textSecondary }}>{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm" style={{ color: theme.colors.textSecondary }}>
                      {task.assignee && (
                        <span>
                          Assigned to: {task.assignee.first_name} {task.assignee.last_name}
                        </span>
                      )}
                      {task.due_date && (
                        <span>
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {task.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center justify-center rounded-full font-medium text-xs px-2.5 py-1 whitespace-nowrap"
                            style={{
                              backgroundColor: theme.colors.surface,
                              color: theme.colors.textSecondary,
                              border: `1px solid ${theme.colors.border}`,
                              padding: '4px 10px',
                              minHeight: '20px',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                      options={[
                        { value: TaskStatus.TODO, label: 'To Do' },
                        { value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
                        { value: TaskStatus.IN_REVIEW, label: 'In Review' },
                        { value: TaskStatus.DONE, label: 'Done' },
                      ]}
                      className="w-32"
                      theme={theme}
                    />
                    <Select
                      value={task.priority}
                      onChange={(e) => handlePriorityChange(task.id, e.target.value as TaskPriority)}
                      options={[
                        { value: TaskPriority.LOW, label: 'Low' },
                        { value: TaskPriority.MEDIUM, label: 'Medium' },
                        { value: TaskPriority.HIGH, label: 'High' },
                        { value: TaskPriority.URGENT, label: 'Urgent' },
                      ]}
                      className="w-32"
                      theme={theme}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`${task.id}`, { relative: 'route' });
                      }}
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        color: theme.colors.textSecondary,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.border;
                        e.currentTarget.style.color = theme.colors.text;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.surface;
                        e.currentTarget.style.color = theme.colors.textSecondary;
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskToDelete(task.id);
                      }}
                      style={{
                        color: theme.colors.textSecondary,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.border;
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = theme.colors.textSecondary;
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {projectId && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setTaskForm({
              title: '',
              description: '',
              status: TaskStatus.TODO,
              priority: TaskPriority.MEDIUM,
              assignee_id: '',
              due_date: '',
              tags: [],
            });
          }}
          title="Create New Task"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>Task Title *</label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Enter task title"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>Description</label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Enter task description"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>Status</label>
                <Select
                  value={taskForm.status}
                  onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}
                  options={[
                    { value: TaskStatus.TODO, label: 'To Do' },
                    { value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
                    { value: TaskStatus.IN_REVIEW, label: 'In Review' },
                    { value: TaskStatus.DONE, label: 'Done' },
                  ]}
                  theme={theme}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>Priority</label>
                <Select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                  options={[
                    { value: TaskPriority.LOW, label: 'Low' },
                    { value: TaskPriority.MEDIUM, label: 'Medium' },
                    { value: TaskPriority.HIGH, label: 'High' },
                    { value: TaskPriority.URGENT, label: 'Urgent' },
                  ]}
                  theme={theme}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>Assignee</label>
                <Select
                  value={taskForm.assignee_id}
                  onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                  options={[
                    { value: '', label: 'Unassigned' },
                    ...members.map((member: any) => ({
                      value: member.user.id,
                      label: `${member.user.first_name} ${member.user.last_name}`,
                    })),
                  ]}
                  theme={theme}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>Due Date</label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    const today = new Date().toISOString().split('T')[0];
                    if (selectedDate && selectedDate < today) {
                      toast.error('Due date cannot be in the past');
                      return;
                    }
                    setTaskForm({ ...taskForm, due_date: selectedDate });
                  }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setTaskForm({
                    title: '',
                    description: '',
                    status: TaskStatus.TODO,
                    priority: TaskPriority.MEDIUM,
                    assignee_id: '',
                    due_date: '',
                    tags: [],
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTask}
                disabled={!taskForm.title.trim() || createTaskMutation.isPending}
                isLoading={createTaskMutation.isPending}
              >
                Create
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Save Filter Modal */}
      <Modal
        isOpen={showSaveFilterModal}
        onClose={() => {
          setShowSaveFilterModal(false);
          setFilterName('');
        }}
        title="Save Filter"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>Filter Name *</label>
            <Input
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Enter filter name (e.g., My Active Tasks)"
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveFilterModal(false);
                setFilterName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={saveCurrentFilter}
              disabled={!filterName.trim()}
            >
              Save Filter
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Task Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            deleteTaskMutation.mutate(taskToDelete);
            setTaskToDelete(null);
          }
        }}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        theme={theme}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteTaskMutation.isPending}
      />
    </div>
  );
}
