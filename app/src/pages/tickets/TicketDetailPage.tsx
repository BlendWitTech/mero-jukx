import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  Loader2, ArrowLeft, Flag, User, Calendar, Tag, MessageSquare,
  Clock, AlertCircle, ShoppingCart, CheckCircle, Activity, Send,
  ChevronDown,
} from 'lucide-react';
import toast from '@shared/hooks/useToast';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { Plus, X as XIcon } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'open',        label: 'Open',        color: '#22c55e' },
  { value: 'in_progress', label: 'In Progress',  color: '#f59e0b' },
  { value: 'resolved',    label: 'Resolved',     color: '#3b82f6' },
  { value: 'closed',      label: 'Closed',       color: '#6b7280' },
];

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low',    color: '#6b7280' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high',   label: 'High',   color: '#ef4444' },
  { value: 'urgent', label: 'Urgent', color: '#dc2626' },
];

export default function TicketDetailPage() {
  const { ticketId, slug } = useParams<{ ticketId: string; slug: string }>();
  const { organization, user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Sync tags when ticket loads
  useEffect(() => {
    if (ticket?.tags) setLocalTags(ticket.tags);
  }, [ticket?.tags]);

  // Fetch ticket details
  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const response = await api.get(`/tickets/${ticketId}`);
      return response.data;
    },
    enabled: !!ticketId,
    retry: false,
  });

  // Fetch org members for assignee dropdown
  const { data: usersData } = useQuery({
    queryKey: ['org-members'],
    queryFn: async () => {
      const response = await api.get('/users', { params: { limit: 100 } });
      return response.data.users || response.data.data || [];
    },
    enabled: !!organization?.id,
  });
  const members = usersData || [];

  // Fetch activity log
  const { data: activities } = useQuery({
    queryKey: ['ticket-activities', ticketId],
    queryFn: async () => {
      try {
        const response = await api.get(`/tickets/${ticketId}/activities`);
        return response.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!ticketId,
  });

  // Fetch projects for flag modal
  const { data: projectsData, error: projectsError } = useQuery({
    queryKey: ['projects', organization?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/boards/projects');
        return response.data;
      } catch (err: any) {
        if (err?.response?.status === 403 || err?.response?.status === 400) return [];
        throw err;
      }
    },
    enabled: showFlagModal && !!organization?.id,
    retry: false,
  });

  // Update ticket mutation (status, priority, assignee)
  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await api.patch(`/tickets/${ticketId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-activities', ticketId] });
      toast.success('Ticket updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      const response = await api.post(`/tickets/${ticketId}/comments`, { body });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setCommentBody('');
      toast.success('Comment added');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add comment'),
  });

  // Flag to board mutation
  const flagToBoardMutation = useMutation({
    mutationFn: async (data: { project_id?: string }) => {
      const response = await api.post('/boards/tasks/from-ticket', {
        ticket_id: ticketId,
        project_id: data.project_id || undefined,
        priority: ticket?.priority,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Task created in Mero Board!');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setShowFlagModal(false);
      setSelectedProjectId('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to flag ticket'),
  });

  const addTag = () => {
    const val = tagInput.trim().toLowerCase();
    if (!val || localTags.includes(val)) { setTagInput(''); return; }
    const newTags = [...localTags, val];
    setLocalTags(newTags);
    setTagInput('');
    updateMutation.mutate({ tags: newTags });
  };

  const removeTag = (tag: string) => {
    const newTags = localTags.filter((t) => t !== tag);
    setLocalTags(newTags);
    updateMutation.mutate({ tags: newTags });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: theme.colors.background }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.colors.primary }} />
      </div>
    );
  }

  if (error && (error as any).response?.status === 403) {
    return (
      <div className="w-full p-6" style={{ backgroundColor: theme.colors.background }}>
        <div className="rounded-xl p-12 border text-center max-w-2xl mx-auto"
          style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <h3 className="text-2xl font-bold mb-3" style={{ color: theme.colors.text }}>Ticket System Not Available</h3>
          <p className="mb-6" style={{ color: theme.colors.textSecondary }}>
            Please upgrade to Platinum or Diamond package.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to={`/org/${slug}/packages`}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium"
              style={{ backgroundColor: theme.colors.primary }}>
              <ShoppingCart className="h-5 w-5" /> View Packages
            </Link>
            <button onClick={() => navigate(`/org/${slug}/tickets`)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium border"
              style={{ borderColor: theme.colors.border, color: theme.colors.text }}>
              <ArrowLeft className="h-5 w-5" /> Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: theme.colors.background }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4" style={{ color: theme.colors.text }}>Ticket Not Found</h2>
          <button onClick={() => navigate(`/org/${slug}/tickets`)}
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: theme.colors.primary }}>
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_OPTIONS.find(s => s.value === ticket.status) || STATUS_OPTIONS[0];
  const priorityCfg = PRIORITY_OPTIONS.find(p => p.value === ticket.priority) || PRIORITY_OPTIONS[1];

  return (
    <div className="w-full p-6 space-y-6" style={{ backgroundColor: theme.colors.background }}>
      {/* Header */}
      <div>
        <button onClick={() => navigate(`/org/${slug}/tickets`)}
          className="flex items-center gap-2 mb-4 text-sm hover:opacity-80 transition-opacity"
          style={{ color: theme.colors.textSecondary }}>
          <ArrowLeft className="h-4 w-4" />
          Back to Tickets
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>{ticket.title}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="px-3 py-1 text-xs font-semibold rounded-full"
                style={{ backgroundColor: `${statusCfg.color}20`, color: statusCfg.color }}>
                {statusCfg.label}
              </span>
              <span className="px-3 py-1 text-xs font-semibold rounded-full"
                style={{ backgroundColor: `${priorityCfg.color}20`, color: priorityCfg.color }}>
                {priorityCfg.label} Priority
              </span>
              {ticket.source === 'chat_flag' && (
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-600">
                  From Chat
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setShowFlagModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: theme.colors.primary }}>
            <Flag className="h-4 w-4" />
            Flag to Board
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Description + Comments + Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-xl border p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <h2 className="font-semibold mb-3" style={{ color: theme.colors.text }}>Description</h2>
            <p className="text-sm whitespace-pre-wrap" style={{ color: ticket.description ? theme.colors.text : theme.colors.textSecondary }}>
              {ticket.description || 'No description provided.'}
            </p>
          </div>

          {/* Add Comment */}
          <div className="rounded-xl border p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: theme.colors.text }}>
              <MessageSquare className="h-4 w-4" />
              Add Comment
            </h2>
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
              style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={() => commentBody.trim() && addCommentMutation.mutate(commentBody.trim())}
                disabled={!commentBody.trim() || addCommentMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: theme.colors.primary }}
              >
                {addCommentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Post Comment
              </button>
            </div>
          </div>

          {/* Comments */}
          {ticket.comments && ticket.comments.length > 0 && (
            <div className="rounded-xl border p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: theme.colors.text }}>
                <MessageSquare className="h-4 w-4" />
                Comments ({ticket.comments.length})
              </h2>
              <div className="space-y-4">
                {ticket.comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: theme.colors.primary }}>
                      {comment.author?.first_name?.[0]}{comment.author?.last_name?.[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium" style={{ color: theme.colors.text }}>
                          {comment.author?.first_name} {comment.author?.last_name}
                        </span>
                        <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="rounded-lg px-3 py-2 text-sm"
                        style={{ backgroundColor: theme.colors.background, color: theme.colors.text, border: `1px solid ${theme.colors.border}` }}>
                        {comment.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Log */}
          {activities && activities.length > 0 && (
            <div className="rounded-xl border p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: theme.colors.text }}>
                <Activity className="h-4 w-4" />
                Activity Log
              </h2>
              <div className="space-y-3">
                {activities.map((act: any, i: number) => (
                  <div key={act.id || i} className="flex gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: theme.colors.primary }} />
                    <div>
                      <span style={{ color: theme.colors.text }}>{act.description}</span>
                      <span className="ml-2 text-xs" style={{ color: theme.colors.textSecondary }}>
                        {new Date(act.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Details sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-xl border p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <h3 className="font-semibold mb-4" style={{ color: theme.colors.text }}>Details</h3>
            <div className="space-y-4">
              {/* Status selector */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Status</label>
                <select
                  value={ticket.status}
                  onChange={(e) => updateMutation.mutate({ status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                >
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* Priority selector */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Priority</label>
                <select
                  value={ticket.priority}
                  onChange={(e) => updateMutation.mutate({ priority: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                >
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              {/* Assignee selector */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Assignee</label>
                <select
                  value={ticket.assignee_id || ''}
                  onChange={(e) => updateMutation.mutate({ assignee_id: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                >
                  <option value="">Unassigned</option>
                  {members.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Created */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Created</label>
                <div className="flex items-center gap-2 text-sm" style={{ color: theme.colors.text }}>
                  <Calendar className="h-4 w-4" style={{ color: theme.colors.textSecondary }} />
                  {new Date(ticket.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* Due date */}
              {ticket.due_date && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Due Date</label>
                  <div className="flex items-center gap-2 text-sm" style={{ color: theme.colors.text }}>
                    <Clock className="h-4 w-4" style={{ color: theme.colors.textSecondary }} />
                    {new Date(ticket.due_date).toLocaleDateString()}
                  </div>
                </div>
              )}

              {/* Time tracking */}
              {(ticket.estimated_time_minutes || ticket.actual_time_minutes) && (
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: theme.colors.textSecondary }}>Time Tracking</label>
                  <div className="space-y-1">
                    {ticket.estimated_time_minutes && (
                      <div className="flex justify-between text-xs">
                        <span style={{ color: theme.colors.textSecondary }}>Estimated</span>
                        <span style={{ color: theme.colors.text }}>{Math.round(ticket.estimated_time_minutes / 60)}h {ticket.estimated_time_minutes % 60}m</span>
                      </div>
                    )}
                    {ticket.actual_time_minutes && (
                      <div className="flex justify-between text-xs">
                        <span style={{ color: theme.colors.textSecondary }}>Actual</span>
                        <span style={{ color: theme.colors.text }}>{Math.round(ticket.actual_time_minutes / 60)}h {ticket.actual_time_minutes % 60}m</span>
                      </div>
                    )}
                    {ticket.estimated_time_minutes && ticket.actual_time_minutes && (
                      <div className="w-full rounded-full h-1.5 mt-1" style={{ backgroundColor: theme.colors.border }}>
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(100, (ticket.actual_time_minutes / ticket.estimated_time_minutes) * 100)}%`,
                            backgroundColor: ticket.actual_time_minutes > ticket.estimated_time_minutes ? '#ef4444' : '#22c55e',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags — editable */}
              <div>
                <label className="block text-xs font-medium mb-2 flex items-center gap-1" style={{ color: theme.colors.textSecondary }}>
                  <Tag className="h-3 w-3" /> Tags
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {localTags.map((tag) => (
                    <span key={tag}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${theme.colors.primary}20`, color: theme.colors.primary }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70 ml-0.5">
                        <XIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add tag..."
                    className="flex-1 min-w-0 px-2 py-1 rounded-lg border text-xs"
                    style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                  />
                  <button type="button" onClick={addTag}
                    className="px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: theme.colors.primary, color: '#fff' }}>
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Source link */}
              {ticket.board_id && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Linked Board Task</label>
                  <span className="flex items-center gap-1 text-xs"
                    style={{ color: theme.colors.primary }}>
                    <CheckCircle className="h-3 w-3" />
                    Transferred to board
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Flag to Board Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-xl max-w-md w-full border p-6"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <h3 className="text-xl font-bold mb-2" style={{ color: theme.colors.text }}>Flag Ticket to Mero Board</h3>
            <p className="text-sm mb-6" style={{ color: theme.colors.textSecondary }}>
              Create a task in Mero Board from this ticket.
            </p>
            <div className="space-y-4">
              {projectsError && (projectsError as any).response?.status === 403 ? (
                <div className="rounded-lg p-4 text-sm text-yellow-600 bg-yellow-50 border border-yellow-200">
                  You need access to Mero Board to flag tickets.
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: theme.colors.textSecondary }}>Project (Optional)</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.text }}
                  >
                    <option value="">None</option>
                    {projectsData?.map((project: any) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowFlagModal(false); setSelectedProjectId(''); }}
                  className="flex-1 py-2 rounded-lg text-sm border"
                  style={{ borderColor: theme.colors.border, color: theme.colors.text }}>
                  Cancel
                </button>
                <button
                  onClick={() => flagToBoardMutation.mutate({ project_id: selectedProjectId || undefined })}
                  disabled={flagToBoardMutation.isPending}
                  className="flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: theme.colors.primary }}>
                  {flagToBoardMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
