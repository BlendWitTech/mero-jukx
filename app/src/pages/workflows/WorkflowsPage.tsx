import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Zap, Play, Trash2, Edit, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  nodes: any[];
  edges: any[];
  isActive: boolean;
  isSystemTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const { theme } = useTheme();
  const orgSlug = organization?.slug || '';
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: workflows = [], isLoading } = useQuery<WorkflowTemplate[]>({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await api.get('/workflows');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workflows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow deleted');
      setDeletingId(null);
    },
    onError: () => {
      toast.error('Failed to delete workflow');
      setDeletingId(null);
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/workflows/${id}/execute`, {});
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Workflow executed — status: ${data.status}`);
    },
    onError: () => {
      toast.error('Failed to execute workflow');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: theme.colors.textSecondary }}>
        Loading workflows...
      </div>
    );
  }

  return (
    <div className="p-6" style={{ color: theme.colors.text }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" style={{ color: theme.colors.primary }} />
            Workflow Automation
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
            Build and manage automated workflows with a drag-and-drop visual editor.
          </p>
        </div>
        <button
          onClick={() => navigate(`/org/${orgSlug}/workflows/new`)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: theme.colors.primary, color: '#fff' }}
        >
          <Plus className="h-4 w-4" />
          New Workflow
        </button>
      </div>

      {/* Empty state */}
      {workflows.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16"
          style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}
        >
          <Zap className="h-12 w-12 mb-4 opacity-40" />
          <h3 className="text-lg font-medium mb-1">No workflows yet</h3>
          <p className="text-sm mb-4">Create your first automation workflow to get started.</p>
          <button
            onClick={() => navigate(`/org/${orgSlug}/workflows/new`)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: theme.colors.primary, color: '#fff' }}
          >
            <Plus className="h-4 w-4" />
            Create Workflow
          </button>
        </div>
      )}

      {/* Workflow cards */}
      {workflows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="rounded-lg border p-4 flex flex-col gap-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              {/* Card header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Zap
                    className="h-5 w-5 flex-shrink-0"
                    style={{ color: workflow.isSystemTemplate ? '#8b5cf6' : theme.colors.primary }}
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{workflow.name}</h3>
                    {workflow.isSystemTemplate && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: '#ede9fe', color: '#7c3aed', fontSize: 10 }}
                      >
                        System Template
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: workflow.isActive ? '#dcfce7' : '#fee2e2',
                    color: workflow.isActive ? '#16a34a' : '#dc2626',
                  }}
                >
                  {workflow.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Description */}
              {workflow.description && (
                <p className="text-xs line-clamp-2" style={{ color: theme.colors.textSecondary }}>
                  {workflow.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs" style={{ color: theme.colors.textSecondary }}>
                <span>{workflow.nodes?.length || 0} nodes</span>
                <span>{workflow.edges?.length || 0} connections</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(workflow.updatedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: theme.colors.border }}>
                <button
                  onClick={() => navigate(`/org/${orgSlug}/workflows/${workflow.id}/edit`)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  style={{ border: `1px solid ${theme.colors.border}`, color: theme.colors.text }}
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={() => executeMutation.mutate(workflow.id)}
                  disabled={executeMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
                >
                  <Play className="h-3 w-3" />
                  Run
                </button>
                {!workflow.isSystemTemplate && (
                  deletingId === workflow.id ? (
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => deleteMutation.mutate(workflow.id)}
                        className="text-xs px-2 py-1 rounded text-red-600 font-medium"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(workflow.id)}
                      className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-colors"
                      style={{ color: '#dc2626' }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
