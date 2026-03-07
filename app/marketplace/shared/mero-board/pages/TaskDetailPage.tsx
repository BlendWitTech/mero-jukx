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
  Textarea,
  Loading,
  Skeleton,
  Avatar,
  Modal,
} from '@shared/frontend';
import { EmptyState } from '@shared/frontend/components/feedback/EmptyState';
import api from '@frontend/services/api';
import {
  ArrowLeft,
  MessageSquare,
  Paperclip,
  Clock,
  User,
  Edit2,
  Trash2,
  Send,
  MoreVertical,
  Download,
  X,
  Plus,
  Link2,
  Timer,
  TrendingUp,
  LayoutTemplate,
  Eye,
  EyeOff,
  Bell,
} from 'lucide-react';
import CardTemplateModal, { CardTemplate } from '../components/CardTemplateModal';
import { useAppContext } from '../contexts/AppContext';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useAuthStore } from '@frontend/store/authStore';
import toast from '@shared/frontend/hooks/useToast';
import TaskAttachmentUpload from '../components/TaskAttachmentUpload';
import TaskChecklist from '../components/TaskChecklist';
import { formatDistanceToNow } from 'date-fns';
import { ListTodo, ChevronRight } from 'lucide-react';

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
    avatar_url: string | null;
  } | null;
  due_date: string | null;
  created_at: string;
  tags: string[];
  creator: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  checklist_items?: {
    id: string;
    content: string;
    is_completed: boolean;
    sort_order: number;
  }[];
  sub_tasks?: Task[];
}

interface TaskComment {
  id: string;
  body: string;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string | null;
  };
  parent_comment_id: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

interface TaskAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  thumbnail_url: string | null;
  uploaded_by: string;
  uploader: {
    id: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

interface TaskActivity {
  id: string;
  activity_type: string;
  description: string | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  created_at: string;
}

export default function TaskDetailPage() {
  const { workspaceId, projectId, taskId } = useParams<{
    workspaceId: string;
    projectId: string;
    taskId: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { appSlug } = useAppContext();
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [showAddDependency, setShowAddDependency] = useState(false);
  const [selectedDependencyTask, setSelectedDependencyTask] = useState('');
  const [dependencyType, setDependencyType] = useState<'blocks' | 'blocked_by' | 'related'>('blocks');
  const [showTimeLogModal, setShowTimeLogModal] = useState(false);
  const [timeLogForm, setTimeLogForm] = useState({
    logged_date: new Date().toISOString().split('T')[0],
    duration_minutes: 60,
    description: '',
    is_billable: false,
  });
  const [showUpload, setShowUpload] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAddCustomField, setShowAddCustomField] = useState(false);
  const [customFieldForm, setCustomFieldForm] = useState({ name: '', value: '' });
  const [crmDealInput, setCrmDealInput] = useState('');

  // Fetch task
  const { data: task, isLoading: taskLoading, error: taskError } = useQuery<Task>({
    queryKey: ['task', appSlug, projectId, taskId],
    queryFn: async () => {
      if (!taskId || !projectId) {
        throw new Error('Task ID or Project ID is missing');
      }
      const response = await api.get(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}`);
      return response.data;
    },
    enabled: !!taskId && !!projectId && !!appSlug,
  });

  // Fetch comments
  const { data: commentsData, isLoading: commentsLoading } = useQuery<{ data: TaskComment[]; meta: any }>({
    queryKey: ['task-comments', appSlug, projectId, taskId],
    queryFn: async () => {
      const response = await api.get(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/comments`);
      return response.data;
    },
    enabled: !!taskId && !!projectId,
  });
  const comments = commentsData?.data || [];

  // Fetch attachments
  const { data: attachments = [], isLoading: attachmentsLoading } = useQuery<TaskAttachment[]>({
    queryKey: ['task-attachments', appSlug, projectId, taskId],
    queryFn: async () => {
      const response = await api.get(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/attachments`);
      return response.data;
    },
    enabled: !!taskId && !!projectId,
  });

  // Fetch activities
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery<{ data: TaskActivity[]; meta: any }>({
    queryKey: ['task-activities', appSlug, projectId, taskId],
    queryFn: async () => {
      const response = await api.get(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/activities`);
      return response.data;
    },
    enabled: !!taskId && !!projectId,
  });
  const activities = activitiesData?.data || [];

  // Dependencies
  const { data: dependencies, isLoading: dependenciesLoading } = useQuery({
    queryKey: ['task-dependencies', appSlug, projectId, taskId],
    queryFn: async () => {
      const response = await api.get(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/dependencies`);
      return response.data;
    },
    enabled: !!taskId,
  });

  // Time Logs
  const { data: timeLogsData, isLoading: timeLogsLoading } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['task-time-logs', appSlug, projectId, taskId],
    queryFn: async () => {
      const response = await api.get(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/time-logs`);
      return response.data;
    },
    enabled: !!taskId,
  });
  const timeLogs = timeLogsData?.data || [];

  // Available tasks for dependencies
  const { data: availableTasksData } = useQuery<{ data: Task[]; meta: any }>({
    queryKey: ['project-tasks', appSlug, projectId],
    queryFn: async () => {
      const response = await api.get(`/apps/${appSlug}/projects/${projectId}/tasks`);
      return response.data;
    },
    enabled: !!projectId && !!taskId,
  });
  const availableTasks = availableTasksData?.data?.filter((t: Task) => t.id !== taskId) || [];

  // Fetch workspace members for assignee dropdown
  const { data: workspace } = useQuery({
    queryKey: ['workspace', appSlug, workspaceId],
    queryFn: async () => {
      const response = await api.get(`/apps/${appSlug}/workspaces/${workspaceId}`);
      return response.data;
    },
    enabled: !!workspaceId,
  });

  const members = workspace?.members || [];

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      const response = await api.post(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/comments`, {
        body,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', appSlug, projectId, taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', appSlug, projectId, taskId] });
      setCommentText('');
      toast.success('Comment added');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    },
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, body }: { commentId: string; body: string }) => {
      const response = await api.put(
        `/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
        { body },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', appSlug, projectId, taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', appSlug, projectId, taskId] });
      setEditingCommentId(null);
      setEditCommentText('');
      toast.success('Comment updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update comment');
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', appSlug, projectId, taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', appSlug, projectId, taskId] });
      toast.success('Comment deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete comment');
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', appSlug, projectId, taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', appSlug, projectId, taskId] });
      toast.success('Task updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update task');
    },
  });

  // Link CRM deal mutation
  const linkCrmDealMutation = useMutation({
    mutationFn: async (crmDealId: string | null) => {
      const response = await api.put(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/crm-deal`, { crm_deal_id: crmDealId });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', appSlug, projectId, taskId] });
      setCrmDealInput('');
      toast.success(variables === null ? 'CRM deal unlinked' : 'CRM deal linked');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update CRM deal link');
    },
  });

  // Delete attachment mutation
  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      await api.delete(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', appSlug, projectId, taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', appSlug, projectId, taskId] });
      toast.success('Attachment deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete attachment');
    },
  });

  // Dependency mutations
  const addDependencyMutation = useMutation({
    mutationFn: async (data: { depends_on_task_id: string; dependency_type?: string }) => {
      const response = await api.post(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/dependencies`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', appSlug, projectId, taskId] });
      setShowAddDependency(false);
      setSelectedDependencyTask('');
      toast.success('Dependency added');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add dependency');
    },
  });

  const removeDependencyMutation = useMutation({
    mutationFn: async (dependencyId: string) => {
      await api.delete(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/dependencies/${dependencyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', appSlug, projectId, taskId] });
      toast.success('Dependency removed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove dependency');
    },
  });

  // Time log mutations
  const addTimeLogMutation = useMutation({
    mutationFn: async (data: typeof timeLogForm) => {
      const response = await api.post(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/time-logs`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-time-logs', appSlug, projectId, taskId] });
      setShowTimeLogModal(false);
      setTimeLogForm({
        logged_date: new Date().toISOString().split('T')[0],
        duration_minutes: 60,
        description: '',
        is_billable: false,
      });
      toast.success('Time logged successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to log time');
    },
  });

  const deleteTimeLogMutation = useMutation({
    mutationFn: async (timeLogId: string) => {
      await api.delete(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/time-logs/${timeLogId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-time-logs', appSlug, projectId, taskId] });
      toast.success('Time log deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete time log');
    },
  });

  const createSubTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await api.post(`/apps/${appSlug}/projects/${projectId}/tasks`, {
        title,
        parent_task_id: taskId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', appSlug, projectId, taskId] });
      toast.success('Sub-task created');
    },
  });

  // Watchers
  const { data: watchersData = [] } = useQuery<{ id: string; user: { id: string; first_name: string; last_name: string } }[]>({
    queryKey: ['task-watchers', appSlug, projectId, taskId],
    queryFn: async () => {
      const response = await api.get(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/watchers`);
      return response.data;
    },
    enabled: !!taskId && !!projectId,
  });
  const isWatching = watchersData.some((w) => w.user?.id === user?.id);

  const watchMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/watchers`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-watchers', appSlug, projectId, taskId] });
      toast.success('Now watching this card');
    },
    onError: () => toast.error('Failed to watch card'),
  });

  const unwatchMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/apps/${appSlug}/projects/${projectId}/tasks/${taskId}/watchers`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-watchers', appSlug, projectId, taskId] });
      toast.success('Stopped watching this card');
    },
    onError: () => toast.error('Failed to unwatch card'),
  });

  const handleAddComment = () => {
    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    addCommentMutation.mutate(commentText);
  };

  const handleEditComment = (comment: TaskComment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.body);
  };

  const handleSaveEdit = (commentId: string) => {
    if (!editCommentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    updateCommentMutation.mutate({ commentId, body: editCommentText });
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateTaskMutation.mutate({ status: newStatus });
  };

  const handlePriorityChange = (newPriority: TaskPriority) => {
    updateTaskMutation.mutate({ priority: newPriority });
  };

  const handleAssigneeChange = (assigneeId: string) => {
    updateTaskMutation.mutate({ assignee_id: assigneeId || null });
  };

  const handleDueDateChange = (dueDate: string) => {
    updateTaskMutation.mutate({ due_date: dueDate || null });
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return 'default';
      case TaskStatus.IN_PROGRESS:
        return 'primary';
      case TaskStatus.IN_REVIEW:
        return 'info';
      case TaskStatus.DONE:
        return 'success';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'created':
        return '✨';
      case 'status_changed':
        return '🔄';
      case 'priority_changed':
        return '⚡';
      case 'assigned':
        return '👤';
      case 'comment_added':
        return '💬';
      case 'attachment_added':
        return '📎';
      default:
        return '📝';
    }
  };

  if (taskLoading) {
    return (
      <div className="h-full w-full p-6" style={{ backgroundColor: theme.colors.background }}>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div className="h-full w-full p-6" style={{ backgroundColor: theme.colors.background }}>
        <EmptyState
          icon={<X className="h-12 w-12" />}
          title="Task not found"
          description={taskError ? (taskError as any)?.message || "Failed to load task" : "The task you're looking for doesn't exist or you don't have access to it"}
          action={{
            label: 'Back to Tasks',
            onClick: () => navigate(`../`, { relative: 'route' }),
          }}
        />
      </div>
    );
  }

  const topLevelComments = comments.filter((c) => !c.parent_comment_id);
  const getReplies = (commentId: string) => comments.filter((c) => c.parent_comment_id === commentId);

  return (
    <div className="h-full w-full p-6 overflow-y-auto" style={{ backgroundColor: theme.colors.background }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(`../`, { relative: 'route' })}
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
            Back to Tasks
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTemplateModal(true)}
            style={{ borderColor: theme.colors.border, color: theme.colors.text }}
          >
            <LayoutTemplate className="mr-2 h-4 w-4" />
            Apply Template
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Details */}
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-4" style={{ color: theme.colors.text }}>
                      {task.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select
                        value={task.status}
                        onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                        options={[
                          { value: TaskStatus.TODO, label: 'To Do' },
                          { value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
                          { value: TaskStatus.IN_REVIEW, label: 'In Review' },
                          { value: TaskStatus.DONE, label: 'Done' },
                        ]}
                        className="w-40"
                        theme={theme}
                      />
                      <Select
                        value={task.priority}
                        onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                        options={[
                          { value: TaskPriority.LOW, label: 'Low' },
                          { value: TaskPriority.MEDIUM, label: 'Medium' },
                          { value: TaskPriority.HIGH, label: 'High' },
                          { value: TaskPriority.URGENT, label: 'Urgent' },
                        ]}
                        className="w-40"
                        theme={theme}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Description */}
                {task.description && (
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: theme.colors.text }}>
                      Description
                    </h3>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: theme.colors.textSecondary }}>
                      {task.description}
                    </p>
                  </div>
                )}

                {/* Checklist */}
                <div className="pt-4 border-t" style={{ borderColor: `${theme.colors.border}40` }}>
                  <TaskChecklist
                    taskId={taskId!}
                    items={(task.checklist_items || []) as any[]}
                    theme={theme}
                  />
                </div>

                {/* Sub-tasks */}
                <div className="pt-4 border-t" style={{ borderColor: `${theme.colors.border}40` }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg" style={{ color: theme.colors.text }}>Sub-tasks</h3>
                    <Badge variant="default">{task.sub_tasks?.length || 0}</Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {task.sub_tasks?.map(sub => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                        style={{ backgroundColor: theme.colors.background }}
                        onClick={() => navigate(`../${sub.id}`, { relative: 'route' })}
                      >
                        <ChevronRight className="h-4 w-4 opacity-40" />
                        <span className="flex-1 text-sm font-medium" style={{ color: theme.colors.text }}>{sub.title}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(sub.status)} size="sm">{sub.status}</Badge>
                          {sub.assignee && (
                            <Avatar
                              size="sm"
                              name={`${sub.assignee.first_name} ${sub.assignee.last_name}`}
                              src={sub.assignee.avatar_url || undefined}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add sub-task..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = e.currentTarget.value;
                          if (val) {
                            createSubTaskMutation.mutate(val);
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Task Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>
                      Assignee
                    </label>
                    <Select
                      value={task.assignee_id || ''}
                      onChange={(e) => handleAssigneeChange(e.target.value)}
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
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.textSecondary }}>
                      Due Date
                    </label>
                    <Input
                      type="date"
                      value={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleDueDateChange(e.target.value)}
                      style={{
                        backgroundColor: theme.colors.inputBackground || theme.colors.background,
                        borderColor: theme.colors.inputBorder || theme.colors.border,
                        color: theme.colors.inputText || theme.colors.text,
                      }}
                    />
                  </div>
                </div>

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: theme.colors.text }}>
                      Tags
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {task.tags.map((tag, idx) => (
                        <Badge key={idx} variant="default" size="sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* CRM Deal Link */}
                <div className="pt-4 border-t" style={{ borderColor: `${theme.colors.border}40` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Link2 className="h-4 w-4" style={{ color: theme.colors.primary }} />
                    <h3 className="font-semibold" style={{ color: theme.colors.text }}>CRM Deal</h3>
                  </div>
                  {(task as any).crm_deal_id ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                      <span className="text-sm font-mono flex-1 truncate" style={{ color: theme.colors.text }}>
                        {(task as any).crm_deal_id}
                      </span>
                      <button
                        onClick={() => linkCrmDealMutation.mutate(null)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
                        style={{ color: '#ef4444', backgroundColor: '#fee2e2' }}
                        title="Unlink deal"
                      >
                        <X className="h-3 w-3" /> Unlink
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter CRM Deal ID"
                        value={crmDealInput}
                        onChange={(e) => setCrmDealInput(e.target.value)}
                        className="flex-1 text-sm"
                      />
                      <Button
                        onClick={() => {
                          if (!crmDealInput.trim()) return;
                          linkCrmDealMutation.mutate(crmDealInput.trim());
                        }}
                        disabled={!crmDealInput.trim() || linkCrmDealMutation.isPending}
                        style={{ backgroundColor: theme.colors.primary, color: '#fff' }}
                      >
                        Link
                      </Button>
                    </div>
                  )}
                </div>

                {/* Custom Fields */}
                <div className="pt-4 border-t" style={{ borderColor: `${theme.colors.border}40` }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold" style={{ color: theme.colors.text }}>Custom Fields</h3>
                    <button
                      onClick={() => setShowAddCustomField(!showAddCustomField)}
                      className="flex items-center gap-1 text-sm px-2 py-1 rounded-lg transition-colors"
                      style={{ color: theme.colors.primary, backgroundColor: `${theme.colors.primary}10` }}
                    >
                      <Plus className="h-3 w-3" /> Add Field
                    </button>
                  </div>

                  {showAddCustomField && (
                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="Field name"
                        value={customFieldForm.name}
                        onChange={(e) => setCustomFieldForm({ ...customFieldForm, name: e.target.value })}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value"
                        value={customFieldForm.value}
                        onChange={(e) => setCustomFieldForm({ ...customFieldForm, value: e.target.value })}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => {
                          if (!customFieldForm.name.trim()) return;
                          const existing = (task as any).custom_fields || [];
                          updateTaskMutation.mutate({ custom_fields: [...existing, customFieldForm] });
                          setCustomFieldForm({ name: '', value: '' });
                          setShowAddCustomField(false);
                        }}
                        style={{ backgroundColor: theme.colors.primary, color: '#fff' }}
                      >
                        Add
                      </Button>
                    </div>
                  )}

                  {(task as any).custom_fields && (task as any).custom_fields.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {(task as any).custom_fields.map((field: { name: string; value: string }, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                          <span className="text-xs font-semibold" style={{ color: theme.colors.textSecondary }}>{field.name}:</span>
                          <span className="text-xs" style={{ color: theme.colors.text }}>{field.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>No custom fields yet. Click "Add Field" to add one.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                  <MessageSquare className="h-5 w-5" />
                  Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Comment */}
                <div className="space-y-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment... Use @name to mention team members"
                    rows={3}
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || addCommentMutation.isPending}
                      isLoading={addCommentMutation.isPending}
                      style={{
                        backgroundColor: theme.colors.primary,
                        color: theme.colors.buttonText || '#ffffff',
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Post Comment
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                {commentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : topLevelComments.length === 0 ? (
                  <EmptyState
                    icon={<MessageSquare className="h-8 w-8" />}
                    title="No comments yet"
                    description="Be the first to comment on this task"
                  />
                ) : (
                  <div className="space-y-4">
                    {topLevelComments.map((comment) => (
                      <div key={comment.id} className="space-y-2">
                        <div
                          className="p-4 rounded-lg"
                          style={{
                            backgroundColor: theme.colors.background,
                            borderColor: theme.colors.border,
                            borderWidth: '1px',
                            borderStyle: 'solid',
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar
                              src={comment.author.avatar_url || undefined}
                              name={`${comment.author.first_name} ${comment.author.last_name}`}
                              size="sm"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm" style={{ color: theme.colors.text }}>
                                  {comment.author.first_name} {comment.author.last_name}
                                </span>
                                <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
                                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                </span>
                                {comment.is_edited && (
                                  <Badge variant="default" size="sm">
                                    edited
                                  </Badge>
                                )}
                                {comment.author.id === user?.id && (
                                  <div className="flex items-center gap-1 ml-auto">
                                    <button
                                      onClick={() => handleEditComment(comment)}
                                      className="p-1 rounded hover:opacity-70"
                                      style={{ color: theme.colors.textSecondary }}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="p-1 rounded hover:opacity-70"
                                      style={{ color: theme.colors.textSecondary }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              {editingCommentId === comment.id ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editCommentText}
                                    onChange={(e) => setEditCommentText(e.target.value)}
                                    rows={2}
                                    style={{
                                      backgroundColor: theme.colors.surface,
                                      borderColor: theme.colors.border,
                                      color: theme.colors.text,
                                    }}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveEdit(comment.id)}
                                      disabled={!editCommentText.trim() || updateCommentMutation.isPending}
                                      isLoading={updateCommentMutation.isPending}
                                      style={{
                                        backgroundColor: theme.colors.primary,
                                        color: theme.colors.buttonText || '#ffffff',
                                      }}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setEditCommentText('');
                                      }}
                                      style={{
                                        borderColor: theme.colors.border,
                                        color: theme.colors.text,
                                        backgroundColor: theme.colors.surface,
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm whitespace-pre-wrap" style={{ color: theme.colors.text }}>
                                  {comment.body}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Replies */}
                        {getReplies(comment.id).map((reply) => (
                          <div
                            key={reply.id}
                            className="ml-12 p-3 rounded-lg"
                            style={{
                              backgroundColor: theme.colors.background,
                              borderColor: theme.colors.border,
                              borderWidth: '1px',
                              borderStyle: 'solid',
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <Avatar
                                src={reply.author.avatar_url || undefined}
                                name={`${reply.author.first_name} ${reply.author.last_name}`}
                                size="sm"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm" style={{ color: theme.colors.text }}>
                                    {reply.author.first_name} {reply.author.last_name}
                                  </span>
                                  <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
                                    {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                                  </span>
                                  {reply.is_edited && (
                                    <Badge variant="default" size="sm">
                                      edited
                                    </Badge>
                                  )}
                                  {reply.author.id === user?.id && (
                                    <div className="flex items-center gap-1 ml-auto">
                                      <button
                                        onClick={() => handleEditComment(reply)}
                                        className="p-1 rounded hover:opacity-70"
                                        style={{ color: theme.colors.textSecondary }}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteComment(reply.id)}
                                        className="p-1 rounded hover:opacity-70"
                                        style={{ color: theme.colors.textSecondary }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm whitespace-pre-wrap" style={{ color: theme.colors.text }}>
                                  {reply.body}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card Watchers */}
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                    <Bell className="h-5 w-5" />
                    Watchers ({watchersData.length})
                  </CardTitle>
                  <button
                    onClick={() => isWatching ? unwatchMutation.mutate() : watchMutation.mutate()}
                    disabled={watchMutation.isPending || unwatchMutation.isPending}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isWatching ? `${theme.colors.primary}15` : theme.colors.background,
                      color: isWatching ? theme.colors.primary : theme.colors.textSecondary,
                      border: `1px solid ${isWatching ? theme.colors.primary : theme.colors.border}`,
                    }}
                  >
                    {isWatching ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {isWatching ? 'Unwatch' : 'Watch'}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {watchersData.length === 0 ? (
                  <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                    No watchers yet. Click Watch to get notified about updates.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {watchersData.map((w) => (
                      <div key={w.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs" style={{ backgroundColor: theme.colors.background, color: theme.colors.text, border: `1px solid ${theme.colors.border}` }}>
                        <Avatar name={`${w.user.first_name} ${w.user.last_name}`} size="sm" />
                        {w.user.first_name} {w.user.last_name}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attachments Section */}
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                    <Paperclip className="h-5 w-5" />
                    Attachments ({attachments.length})
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setShowUpload(!showUpload)}
                    variant="outline"
                    style={{
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                      backgroundColor: theme.colors.surface,
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {showUpload ? 'Cancel' : 'Add Attachment'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showUpload && (
                  <TaskAttachmentUpload
                    taskId={taskId!}
                    projectId={projectId!}
                    onSuccess={() => {
                      setShowUpload(false);
                      queryClient.invalidateQueries({ queryKey: ['task-attachments', appSlug, projectId, taskId] });
                      queryClient.invalidateQueries({ queryKey: ['task-activities', appSlug, projectId, taskId] });
                    }}
                    onCancel={() => setShowUpload(false)}
                  />
                )}
                {attachmentsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : attachments.length === 0 ? (
                  <EmptyState
                    icon={<Paperclip className="h-8 w-8" />}
                    title="No attachments"
                    description="Files attached to this task will appear here"
                  />
                ) : (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{
                          backgroundColor: theme.colors.background,
                          borderColor: theme.colors.border,
                          borderWidth: '1px',
                          borderStyle: 'solid',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Paperclip className="h-5 w-5" style={{ color: theme.colors.textSecondary }} />
                          <div>
                            <p className="text-sm font-medium" style={{ color: theme.colors.text }}>
                              {attachment.file_name}
                            </p>
                            <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                              {formatFileSize(attachment.file_size)} • Uploaded by{' '}
                              {attachment.uploader.first_name} {attachment.uploader.last_name} •{' '}
                              {formatDistanceToNow(new Date(attachment.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded hover:opacity-70"
                            style={{ color: theme.colors.textSecondary }}
                          >
                            <Download className="h-4 w-4" />
                          </a>
                          {attachment.uploaded_by === user?.id && (
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this attachment?')) {
                                  deleteAttachmentMutation.mutate(attachment.id);
                                }
                              }}
                              className="p-2 rounded hover:opacity-70"
                              style={{ color: theme.colors.textSecondary }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Dependencies Section */}
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                    <Link2 className="h-5 w-5" />
                    Dependencies
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setShowAddDependency(true)}
                    variant="outline"
                    style={{
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                      backgroundColor: theme.colors.surface,
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {dependenciesLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <>
                    {/* Blocking Tasks */}
                    {dependencies?.blocking && dependencies.blocking.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2" style={{ color: theme.colors.text }}>
                          Blocks
                        </h4>
                        <div className="space-y-2">
                          {dependencies.blocking.map((dep: any) => (
                            <div
                              key={dep.id}
                              className="p-2 rounded flex items-center justify-between"
                              style={{ backgroundColor: theme.colors.background }}
                            >
                              <button
                                onClick={() => navigate(`../${dep.depends_on_task.id}`, { relative: 'route' })}
                                className="text-sm hover:underline flex-1 text-left"
                                style={{ color: theme.colors.text }}
                              >
                                {dep.depends_on_task.title}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Remove this dependency?')) {
                                    removeDependencyMutation.mutate(dep.id);
                                  }
                                }}
                                className="p-1 rounded hover:opacity-70"
                                style={{ color: theme.colors.textSecondary }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Blocked By Tasks */}
                    {dependencies?.blocked_by && dependencies.blocked_by.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2" style={{ color: theme.colors.text }}>
                          Blocked By
                        </h4>
                        <div className="space-y-2">
                          {dependencies.blocked_by.map((dep: any) => (
                            <div
                              key={dep.id}
                              className="p-2 rounded flex items-center justify-between"
                              style={{ backgroundColor: theme.colors.background }}
                            >
                              <button
                                onClick={() => navigate(`../${dep.task.id}`, { relative: 'route' })}
                                className="text-sm hover:underline flex-1 text-left"
                                style={{ color: theme.colors.text }}
                              >
                                {dep.task.title}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Remove this dependency?')) {
                                    removeDependencyMutation.mutate(dep.id);
                                  }
                                }}
                                className="p-1 rounded hover:opacity-70"
                                style={{ color: theme.colors.textSecondary }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}


                    {(!dependencies?.blocking?.length && !dependencies?.blocked_by?.length && !dependencies?.related?.length) && (
                      <EmptyState
                        icon={<Link2 className="h-8 w-8" />}
                        title="No dependencies"
                        description="Link this task to other tasks"
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Time Tracking Section */}
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                    <Timer className="h-5 w-5" />
                    Time Logged
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setShowTimeLogModal(true)}
                    variant="outline"
                    style={{
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                      backgroundColor: theme.colors.surface,
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Log Time
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {timeLogsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : timeLogs.length === 0 ? (
                  <EmptyState
                    icon={<Timer className="h-8 w-8" />}
                    title="No time logged"
                    description="Start tracking time on this task"
                  />
                ) : (
                  <div className="space-y-3">
                    {timeLogs.map((log: any) => {
                      const hours = Math.floor(log.duration_minutes / 60);
                      const minutes = log.duration_minutes % 60;
                      return (
                        <div
                          key={log.id}
                          className="p-3 rounded"
                          style={{ backgroundColor: theme.colors.background }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Avatar
                                name={`${log.user.first_name} ${log.user.last_name}`}
                                size="sm"
                              />
                              <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                {log.user.first_name} {log.user.last_name}
                              </span>
                            </div>
                            {log.user_id === user?.id && (
                              <button
                                onClick={() => {
                                  if (confirm('Delete this time log?')) {
                                    deleteTimeLogMutation.mutate(log.id);
                                  }
                                }}
                                className="p-1 rounded hover:opacity-70"
                                style={{ color: theme.colors.textSecondary }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                              {hours > 0 ? `${hours}h ` : ''}{minutes}m
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
                                {new Date(log.logged_date).toLocaleDateString()}
                              </span>
                              {log.is_billable && (
                                <Badge variant="default" size="sm">Billable</Badge>
                              )}
                            </div>
                          </div>
                          {log.description && (
                            <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                              {log.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t" style={{ borderColor: theme.colors.border }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                          Total
                        </span>
                        <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                          {Math.floor(timeLogs.reduce((sum: number, log: any) => sum + log.duration_minutes, 0) / 60)}h{' '}
                          {timeLogs.reduce((sum: number, log: any) => sum + log.duration_minutes, 0) % 60}m
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.text }}>
                  <Clock className="h-5 w-5" />
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activitiesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : activities.length === 0 ? (
                  <EmptyState
                    icon={<Clock className="h-8 w-8" />}
                    title="No activity"
                    description="Task activity will appear here"
                  />
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                            style={{ backgroundColor: theme.colors.border }}
                          >
                            {getActivityIcon(activity.activity_type)}
                          </div>
                          <div
                            className="w-0.5 flex-1 mt-2"
                            style={{ backgroundColor: theme.colors.border }}
                          />
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm" style={{ color: theme.colors.text }}>
                            <span className="font-semibold">
                              {activity.user.first_name} {activity.user.last_name}
                            </span>{' '}
                            {activity.description || activity.activity_type.replace('_', ' ')}
                          </p>
                          <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Task Info */}
            <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <CardHeader>
                <CardTitle style={{ color: theme.colors.text }}>Task Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>
                    Created by
                  </label>
                  <p className="text-sm" style={{ color: theme.colors.text }}>
                    {task.creator.first_name} {task.creator.last_name}
                  </p>
                  <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                    {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                  </p>
                </div>
                {task.assignee && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>
                      Assigned to
                    </label>
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={task.assignee.avatar_url || undefined}
                        name={`${task.assignee.first_name} ${task.assignee.last_name}`}
                        size="sm"
                      />
                      <p className="text-sm" style={{ color: theme.colors.text }}>
                        {task.assignee.first_name} {task.assignee.last_name}
                      </p>
                    </div>
                  </div>
                )}
                {task.due_date && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>
                      Due Date
                    </label>
                    <p className="text-sm" style={{ color: theme.colors.text }}>
                      {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Dependency Modal */}
      <Modal
        isOpen={showAddDependency}
        onClose={() => {
          setShowAddDependency(false);
          setSelectedDependencyTask('');
        }}
        title="Add Dependency"
        theme={theme}
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>Task</label>
            <Select
              value={selectedDependencyTask}
              onChange={(e) => setSelectedDependencyTask(e.target.value)}
              options={[
                { value: '', label: 'Select a task' },
                ...availableTasks.map((t: Task) => ({
                  value: t.id,
                  label: t.title,
                })),
              ]}
              theme={theme}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>Dependency Type</label>
            <Select
              value={dependencyType}
              onChange={(e) => setDependencyType(e.target.value as 'blocks' | 'blocked_by' | 'related')}
              options={[
                { value: 'blocks', label: 'This task blocks the selected task' },
                { value: 'blocked_by', label: 'This task is blocked by the selected task' },
                { value: 'related', label: 'Related (no blocking relationship)' },
              ]}
              theme={theme}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDependency(false);
                setSelectedDependencyTask('');
              }}
              style={{
                borderColor: theme.colors.border,
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedDependencyTask) {
                  toast.error('Please select a task');
                  return;
                }
                addDependencyMutation.mutate({
                  depends_on_task_id: selectedDependencyTask,
                  dependency_type: dependencyType,
                });
              }}
              disabled={!selectedDependencyTask || addDependencyMutation.isPending}
              isLoading={addDependencyMutation.isPending}
              style={{
                backgroundColor: theme.colors.primary,
                color: theme.colors.buttonText || '#ffffff',
              }}
            >
              Add Dependency
            </Button>
          </div>
        </div>
      </Modal>

      {/* Time Log Modal */}
      <Modal
        isOpen={showTimeLogModal}
        onClose={() => {
          setShowTimeLogModal(false);
          setTimeLogForm({
            logged_date: new Date().toISOString().split('T')[0],
            duration_minutes: 60,
            description: '',
            is_billable: false,
          });
        }}
        title="Log Time"
        theme={theme}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>Date</label>
            <Input
              type="date"
              value={timeLogForm.logged_date}
              onChange={(e) => setTimeLogForm({ ...timeLogForm, logged_date: e.target.value })}
              style={{
                backgroundColor: theme.colors.inputBackground || theme.colors.background,
                borderColor: theme.colors.inputBorder || theme.colors.border,
                color: theme.colors.inputText || theme.colors.text,
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>Duration (minutes)</label>
            <Input
              type="number"
              min="1"
              max="1440"
              value={timeLogForm.duration_minutes}
              onChange={(e) => setTimeLogForm({ ...timeLogForm, duration_minutes: parseInt(e.target.value) || 0 })}
              style={{
                backgroundColor: theme.colors.inputBackground || theme.colors.background,
                borderColor: theme.colors.inputBorder || theme.colors.border,
                color: theme.colors.inputText || theme.colors.text,
              }}
            />
            <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
              {Math.floor(timeLogForm.duration_minutes / 60)}h {timeLogForm.duration_minutes % 60}m
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>Description (Optional)</label>
            <Textarea
              value={timeLogForm.description}
              onChange={(e) => setTimeLogForm({ ...timeLogForm, description: e.target.value })}
              rows={3}
              placeholder="What did you work on?"
              style={{
                backgroundColor: theme.colors.inputBackground || theme.colors.background,
                borderColor: theme.colors.inputBorder || theme.colors.border,
                color: theme.colors.inputText || theme.colors.text,
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="billable"
              checked={timeLogForm.is_billable}
              onChange={(e) => setTimeLogForm({ ...timeLogForm, is_billable: e.target.checked })}
              className="rounded"
              style={{ accentColor: theme.colors.primary }}
            />
            <label htmlFor="billable" className="text-sm" style={{ color: theme.colors.text }}>
              Billable
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowTimeLogModal(false);
                setTimeLogForm({
                  logged_date: new Date().toISOString().split('T')[0],
                  duration_minutes: 60,
                  description: '',
                  is_billable: false,
                });
              }}
              style={{
                borderColor: theme.colors.border,
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (timeLogForm.duration_minutes < 1) {
                  toast.error('Duration must be at least 1 minute');
                  return;
                }
                addTimeLogMutation.mutate(timeLogForm);
              }}
              disabled={addTimeLogMutation.isPending}
              isLoading={addTimeLogMutation.isPending}
              style={{
                backgroundColor: theme.colors.primary,
                color: theme.colors.buttonText || '#ffffff',
              }}
            >
              Log Time
            </Button>
          </div>
        </div>
      </Modal>

      {/* Card Template Modal */}
      <CardTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onApply={(template: CardTemplate) => {
          updateTaskMutation.mutate({
            description: template.templateContent,
          });
          setShowTemplateModal(false);
          toast.success(`"${template.name}" template applied`);
        }}
      />
    </div>
  );
}

