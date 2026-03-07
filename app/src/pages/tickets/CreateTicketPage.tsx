import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useTheme } from '../../contexts/ThemeContext';
import { UnauthorizedAccess } from '../../components/UnauthorizedAccess';
import toast from '@shared/hooks/useToast';
import { Ticket, X, Save, ShoppingCart, AlertCircle, Tag, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Input, Card, CardContent, CardFooter } from '@shared';

const ticketSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255, 'Title must be less than 255 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignee_id: z.string().optional(),
  due_date: z.string().optional(),
  estimated_time_minutes: z.coerce.number().int().min(1).optional().or(z.literal('')),
});

type TicketFormData = z.infer<typeof ticketSchema>;

export default function CreateTicketPage() {
  const { organization, _hasHydrated, isAuthenticated, accessToken } = useAuthStore();
  const { hasPermission } = usePermissions();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hasAccessError, setHasAccessError] = useState(false);

  // Tags state (managed separately from react-hook-form)
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const canCreateTicket = hasPermission('tickets.create');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { priority: 'medium' },
  });

  // Fetch users for assignee dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
    retry: false,
  });

  const users = usersData?.users || usersData?.data || [];

  const createTicketMutation = useMutation({
    mutationFn: async (data: TicketFormData) => {
      const payload: Record<string, any> = {
        title: data.title,
        priority: data.priority || 'medium',
        tags,
      };
      if (data.description) payload.description = data.description;
      if (data.assignee_id) payload.assignee_id = data.assignee_id;
      if (data.due_date) payload.due_date = data.due_date;
      if (data.estimated_time_minutes) payload.estimated_time_minutes = Number(data.estimated_time_minutes);
      const response = await api.post('/tickets', payload);
      return response.data;
    },
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', organization?.id] });
      toast.success('Ticket created successfully');
      navigate(`/org/${organization?.slug}/tickets/${ticket.id}`);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message;
      if (error.response?.status === 403) {
        setHasAccessError(true);
      } else {
        toast.error(msg || 'Failed to create ticket');
      }
    },
  });

  const onSubmit = (data: TicketFormData) => {
    createTicketMutation.mutate(data);
  };

  const addTag = () => {
    const val = tagInput.trim().toLowerCase();
    if (val && !tags.includes(val)) setTags((prev) => [...prev, val]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  if (!canCreateTicket) {
    return (
      <UnauthorizedAccess
        message="You do not have permission to create tickets."
        feature="create tickets"
        onBack={() => navigate(`/org/${organization?.slug}/tickets`)}
      />
    );
  }

  if (hasAccessError) {
    return (
      <div className="w-full p-6" style={{ backgroundColor: theme.colors.background }}>
        <Card className="max-w-2xl mx-auto text-center" padding="lg">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full" style={{ backgroundColor: '#fef3c7' }}>
              <AlertCircle className="h-12 w-12 text-yellow-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-3" style={{ color: theme.colors.text }}>
            Ticket System Not Available
          </h3>
          <p className="text-sm mb-6" style={{ color: theme.colors.textSecondary }}>
            Please upgrade to Platinum or Diamond package, or purchase the Ticket System feature separately.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to={`/org/${organization?.slug}/packages`}>
              <Button variant="primary" leftIcon={<ShoppingCart className="h-5 w-5" />}>
                View Packages & Purchase
              </Button>
            </Link>
            <Button variant="outline" onClick={() => navigate(`/org/${organization?.slug}/tickets`)} leftIcon={<X className="h-5 w-5" />}>
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const inputStyle = {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  };

  const labelStyle = { color: theme.colors.textSecondary };

  return (
    <div className="w-full p-6" style={{ backgroundColor: theme.colors.background }}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: theme.colors.primary }}>
          <Ticket className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Create New Ticket</h1>
          <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Submit a support or task request</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-5">

              {/* Title */}
              <Input
                label="Title *"
                id="title"
                type="text"
                {...register('title')}
                placeholder="Enter ticket title..."
                error={errors.title?.message}
                fullWidth
              />

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Description</label>
                <textarea
                  {...register('description')}
                  rows={5}
                  placeholder="Describe the issue or request in detail..."
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2"
                  style={{ ...inputStyle, focusRingColor: theme.colors.primary }}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
                )}
              </div>

              {/* Priority + Assignee row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Priority</label>
                  <select
                    {...register('priority')}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                    style={inputStyle}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Assignee</label>
                  <select
                    {...register('assignee_id')}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                    style={inputStyle}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due date + Estimated time row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Due Date</label>
                  <input
                    type="date"
                    {...register('due_date')}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                    style={inputStyle}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Estimated Time (minutes)</label>
                  <input
                    type="number"
                    {...register('estimated_time_minutes')}
                    placeholder="e.g. 60"
                    min="1"
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                    style={inputStyle}
                  />
                  {errors.estimated_time_minutes && (
                    <p className="mt-1 text-xs text-red-500">{errors.estimated_time_minutes.message}</p>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  <Tag className="inline h-3.5 w-3.5 mr-1" />
                  Tags
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add tag and press Enter..."
                    className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: theme.colors.primary, color: '#fff' }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${theme.colors.primary}20`, color: theme.colors.primary }}
                      >
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </CardContent>

            <CardFooter className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/org/${organization?.slug}/tickets`)}
                leftIcon={<X className="h-4 w-4" />}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={createTicketMutation.isPending}
                leftIcon={<Save className="h-4 w-4" />}
              >
                {createTicketMutation.isPending ? 'Creating...' : 'Create Ticket'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
