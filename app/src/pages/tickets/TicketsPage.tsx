import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Ticket, Plus, Search, ShoppingCart, AlertCircle, Clock, CheckCircle, Circle, AlertTriangle, TrendingUp, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Card, CardContent } from '@shared';
import { CardSkeleton } from '@shared/components/ui/Skeleton';

type TicketStatus = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'all' | 'low' | 'medium' | 'high' | 'urgent';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open:        { label: 'Open',        color: '#22c55e', icon: Circle },
  in_progress: { label: 'In Progress', color: '#f59e0b', icon: Clock },
  resolved:    { label: 'Resolved',    color: '#3b82f6', icon: CheckCircle },
  closed:      { label: 'Closed',      color: '#6b7280', icon: CheckCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Low',    color: '#6b7280' },
  medium: { label: 'Medium', color: '#f59e0b' },
  high:   { label: 'High',   color: '#ef4444' },
  urgent: { label: 'Urgent', color: '#dc2626' },
};

export default function TicketsPage() {
  const { organization, _hasHydrated, isAuthenticated, accessToken } = useAuthStore();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority>('all');
  const [hasAccessError, setHasAccessError] = useState(false);

  const canCreateTicket = hasPermission('tickets.create');

  // Fetch ALL tickets (no filter) for stats computation
  const { data: allTicketsData } = useQuery({
    queryKey: ['tickets-all', organization?.id],
    queryFn: async () => {
      try {
        const response = await api.get('/tickets', { params: { limit: '500' } });
        return response.data;
      } catch {
        return null;
      }
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken && !!organization?.id,
    retry: false,
  });

  const allTickets: any[] = allTicketsData?.tickets || allTicketsData?.data || [];

  // Compute stats from all tickets
  const stats = useMemo(() => {
    const open = allTickets.filter((t) => t.status === 'open').length;
    const inProgress = allTickets.filter((t) => t.status === 'in_progress').length;
    const resolved = allTickets.filter((t) => t.status === 'resolved').length;
    const closed = allTickets.filter((t) => t.status === 'closed').length;
    const now = Date.now();
    const overdue = allTickets.filter((t) =>
      t.due_date && (t.status === 'open' || t.status === 'in_progress') && new Date(t.due_date).getTime() < now
    ).length;
    return { open, inProgress, resolved, closed, overdue, total: allTickets.length };
  }, [allTickets]);

  // Helper: get SLA status for a ticket
  const getSlaStatus = (ticket: any): 'overdue' | 'at-risk' | 'on-track' | null => {
    if (!ticket.due_date || ticket.status === 'resolved' || ticket.status === 'closed') return null;
    const now = Date.now();
    const due = new Date(ticket.due_date).getTime();
    if (due < now) return 'overdue';
    if (due - now < 24 * 60 * 60 * 1000) return 'at-risk';
    return 'on-track';
  };

  const { data: ticketsData, isLoading, error } = useQuery({
    queryKey: ['tickets', organization?.id, search, statusFilter, priorityFilter],
    queryFn: async () => {
      try {
        const params: Record<string, string> = { limit: '50' };
        if (search.trim()) params.search = search.trim();
        if (statusFilter !== 'all') params.status = statusFilter;
        if (priorityFilter !== 'all') params.priority = priorityFilter;
        const response = await api.get('/tickets', { params });
        setHasAccessError(false);
        return response.data;
      } catch (err: any) {
        if (err.response?.status === 403) {
          setHasAccessError(true);
          throw err;
        }
        throw err;
      }
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken && !!organization?.id,
    retry: false,
  });

  const tickets = ticketsData?.tickets || ticketsData?.data || [];

  if (hasAccessError || (error && (error as any).response?.status === 403)) {
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
          <p className="mb-6 text-sm" style={{ color: theme.colors.textSecondary }}>
            Please upgrade to Platinum or Diamond package, or purchase the Ticket System feature separately.
          </p>
          <Link to={`/org/${organization?.slug}/packages`}>
            <Button variant="primary" leftIcon={<ShoppingCart className="h-5 w-5" />}>
              View Packages & Purchase
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6" style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: theme.colors.primary }}>
            <Ticket className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Tickets</h1>
            <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
              {isLoading ? 'Loading...' : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        {canCreateTicket && (
          <Link to={`/org/${organization?.slug}/tickets/new`}>
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
              New Ticket
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Dashboard */}
      {!isLoading && allTickets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Open', value: stats.open, color: '#22c55e', icon: Circle },
            { label: 'In Progress', value: stats.inProgress, color: '#f59e0b', icon: Clock },
            { label: 'Resolved', value: stats.resolved, color: '#3b82f6', icon: CheckCircle },
            { label: 'Closed', value: stats.closed, color: '#6b7280', icon: XCircle },
            { label: 'Overdue', value: stats.overdue, color: '#ef4444', icon: AlertTriangle },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl border p-3 flex items-center gap-3"
                style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
              >
                <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${stat.color}18` }}>
                  <Icon className="h-4 w-4" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none" style={{ color: theme.colors.text }}>{stat.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: theme.colors.textSecondary }}>{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: theme.colors.textSecondary }} />
        <input
          type="text"
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm"
          style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status filters */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-medium mr-1" style={{ color: theme.colors.textSecondary }}>Status:</span>
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as TicketStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: statusFilter === s ? theme.colors.primary : theme.colors.surface,
                color: statusFilter === s ? '#fff' : theme.colors.textSecondary,
                border: `1px solid ${statusFilter === s ? theme.colors.primary : theme.colors.border}`,
              }}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        {/* Priority filters */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-medium mr-1" style={{ color: theme.colors.textSecondary }}>Priority:</span>
          {(['all', 'low', 'medium', 'high', 'urgent'] as TicketPriority[]).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: priorityFilter === p ? theme.colors.primary : theme.colors.surface,
                color: priorityFilter === p ? '#fff' : theme.colors.textSecondary,
                border: `1px solid ${priorityFilter === p ? theme.colors.primary : theme.colors.border}`,
              }}
            >
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
          <Ticket className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: theme.colors.textSecondary }} />
          <p className="font-medium" style={{ color: theme.colors.text }}>
            {search || statusFilter !== 'all' || priorityFilter !== 'all' ? 'No tickets match your filters' : 'No tickets yet'}
          </p>
          <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
            {canCreateTicket && !search && statusFilter === 'all' && priorityFilter === 'all' ? 'Create your first ticket to get started' : ''}
          </p>
          {canCreateTicket && !search && statusFilter === 'all' && priorityFilter === 'all' && (
            <Link to={`/org/${organization?.slug}/tickets/new`} className="inline-block mt-4">
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>Create Ticket</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket: any) => {
            const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
            const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
            const StatusIcon = statusCfg.icon;
            const sla = getSlaStatus(ticket);
            const SLA_CFG = {
              overdue: { label: 'Overdue', color: '#ef4444' },
              'at-risk': { label: 'At Risk', color: '#f59e0b' },
              'on-track': { label: 'On Track', color: '#22c55e' },
            };
            return (
              <Link key={ticket.id} to={`/org/${organization?.slug}/tickets/${ticket.id}`}>
                <div
                  className="rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: sla === 'overdue' ? '#ef444440' : theme.colors.border,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-base" style={{ color: theme.colors.text }}>{ticket.title}</h3>
                        {/* Status badge */}
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${statusCfg.color}20`, color: statusCfg.color }}>
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </span>
                        {/* Priority badge */}
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${priorityCfg.color}20`, color: priorityCfg.color }}>
                          {priorityCfg.label}
                        </span>
                        {/* SLA badge */}
                        {sla && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${SLA_CFG[sla].color}20`, color: SLA_CFG[sla].color }}>
                            <AlertTriangle className="h-3 w-3" />
                            {SLA_CFG[sla].label}
                          </span>
                        )}
                        {ticket.source === 'chat_flag' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                            From Chat
                          </span>
                        )}
                      </div>
                      {ticket.description && (
                        <p className="text-sm line-clamp-2" style={{ color: theme.colors.textSecondary }}>
                          {ticket.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs flex-wrap" style={{ color: theme.colors.textSecondary }}>
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                        {ticket.assignee && (
                          <span>Assigned to {ticket.assignee.first_name} {ticket.assignee.last_name}</span>
                        )}
                        {ticket.due_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due {new Date(ticket.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {ticket.tags && ticket.tags.length > 0 && (
                          <span>{ticket.tags.slice(0, 3).join(', ')}</span>
                        )}
                      </div>
                    </div>
                    {ticket.comments?.length > 0 && (
                      <span className="flex-shrink-0 text-xs px-2 py-1 rounded-full"
                        style={{ backgroundColor: theme.colors.border, color: theme.colors.textSecondary }}>
                        {ticket.comments.length} comment{ticket.comments.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
