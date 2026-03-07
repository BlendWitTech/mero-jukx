import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import toast from '@shared/hooks/useToast';
import { Search, Plus, Edit, Trash2, Eye, MoreVertical, X, Save, Shield, CheckCircle2, AlertCircle, UserCog, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useTheme } from '../../contexts/ThemeContext';
// Import shared components
import { Button, Input, Card, CardContent, Badge, Modal, ModalHeader, ModalContent, ModalFooter } from '@shared';
import { SearchBar } from '@shared/components/data-display';
import { CardSkeleton } from '@shared/components/ui/Skeleton';

const editUserSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
});

const revokeAccessSchema = z.object({
  transfer_data: z.boolean().optional(),
  transfer_to_user_id: z.string().uuid().optional(),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
}).refine(
  (data) => {
    if (data.transfer_data && !data.transfer_to_user_id) {
      return false;
    }
    return true;
  },
  {
    message: 'Please select a user to transfer data to',
    path: ['transfer_to_user_id'],
  }
);

type EditUserFormData = z.infer<typeof editUserSchema>;
type RevokeAccessFormData = z.infer<typeof revokeAccessSchema>;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { slug } = useParams<{ slug: string }>();
  const { user: currentUser, organization, isAuthenticated, accessToken, _hasHydrated } = useAuthStore();
  const { isOrganizationOwner, hasPermission, userData } = usePermissions();
  const { theme } = useTheme();

  // Check if user can view users list
  const canViewUsers = isOrganizationOwner || hasPermission('users.view');

  const canImpersonate = isOrganizationOwner || hasPermission('users.impersonate');
  const canEditUsers = isOrganizationOwner || hasPermission('users.edit');
  const canRevokeUsers = isOrganizationOwner || hasPermission('users.revoke');
  const canAssignRoles = isOrganizationOwner || hasPermission('roles.assign');

  // Get current user's actual role for hierarchy comparison
  const currentUserRole = userData?.role;

  // Get current user's role hierarchy level
  const getRoleHierarchyLevel = (role: any): number => {
    if (!role) return 999; // No role = lowest
    if (role.is_organization_owner) return 1; // Highest
    if (role.slug === 'admin' || (role.is_default && role.slug === 'admin') || (role.is_system_role && role.slug === 'admin')) {
      return 2; // Second level
    }
    // Use actual hierarchy_level if available, otherwise default to 3
    return role.hierarchy_level || 3;
  };

  // Check if current user can edit a specific user (not just role assignment)
  const canEditSpecificUser = (targetUser: any): boolean => {
    if (!targetUser || !targetUser.role) return false;
    if (isCurrentUser(targetUser.id)) return false; // Can't edit self
    if (targetUser.role.is_organization_owner) return false; // Can't edit owner
    if (!canEditUsers) return false; // Must have users.edit permission

    // Organization owners can edit anyone (except other owners)
    if (isOrganizationOwner) return true;

    // For non-owners, check role hierarchy
    if (!currentUserRole) return false;
    const currentUserRoleLevel = getRoleHierarchyLevel(currentUserRole);
    const targetRoleLevel = getRoleHierarchyLevel(targetUser.role);

    // Can only edit users with lower role levels (higher hierarchy_level number = lower authority)
    return currentUserRoleLevel < targetRoleLevel;
  };

  // Check if current user can edit/assign role to target user
  const canEditUserRole = (targetUser: any): boolean => {
    if (!targetUser || !targetUser.role) return false;
    if (isCurrentUser(targetUser.id)) return false; // Can't edit self
    if (targetUser.role.is_organization_owner) return false; // Can't edit owner
    if (!canAssignRoles) return false;

    // Organization owners can edit anyone (except other owners)
    if (isOrganizationOwner) return true;

    // For non-owners, check role hierarchy
    if (!currentUserRole) return false;
    const currentUserRoleLevel = getRoleHierarchyLevel(currentUserRole);
    const targetRoleLevel = getRoleHierarchyLevel(targetUser.role);

    // Can only edit users with lower role levels
    return currentUserRoleLevel < targetRoleLevel;
  };

  const isMasterOrg = organization?.org_type === 'MAIN';
  const [activeTab, setActiveTab] = useState<'all' | 'master'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const menuButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', page, search, activeTab],
    queryFn: async () => {
      const response = await api.get('/users', {
        params: {
          page,
          limit: 20,
          search,
          scope: activeTab === 'master' ? 'master' : 'all'
        },
      });
      return response.data;
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken && canViewUsers,
    retry: 1,
  });

  // Fetch assignable roles for role assignment (roles the user can assign)
  const { data: roles, refetch: refetchRoles } = useQuery({
    queryKey: ['assignable-roles'],
    queryFn: async () => {
      try {
        if (canAssignRoles) {
          const response = await api.get('/roles/assignable');
          return Array.isArray(response.data) ? response.data : [];
        }
        return [];
      } catch (error: any) {
        // If user doesn't have roles.assign permission, return empty array
        if (error.response?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
  });

  // Listen for package update events to refresh roles
  useEffect(() => {
    const handlePackageUpdate = () => {
      console.log('[Users] Package update event received, refetching roles...');
      // Invalidate and refetch roles to show newly available roles after package upgrade
      queryClient.invalidateQueries({ queryKey: ['assignable-roles'] });
      refetchRoles();
    };

    window.addEventListener('package-updated', handlePackageUpdate);
    return () => {
      window.removeEventListener('package-updated', handlePackageUpdate);
    };
  }, [refetchRoles, queryClient]);

  // Fetch user details for view/edit
  const { data: userDetails } = useQuery({
    queryKey: ['user-details', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return null;
      const response = await api.get(`/users/${selectedUser.id}`);
      return response.data;
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken && !!selectedUser?.id && (showViewModal || showEditModal),
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    formState: { errors: editErrors },
    reset: resetEdit,
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
  });

  const {
    register: registerRevoke,
    handleSubmit: handleRevokeSubmit,
    formState: { errors: revokeErrors },
    watch: watchRevoke,
    reset: resetRevoke,
  } = useForm<RevokeAccessFormData>({
    resolver: zodResolver(revokeAccessSchema),
    defaultValues: {
      transfer_data: false,
    },
  });

  const transferData = watchRevoke('transfer_data');

  const updateMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: EditUserFormData }) => {
      const response = await api.put(`/users/${userId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-details'] });
      toast.success('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      resetEdit();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: RevokeAccessFormData }) => {
      const response = await api.post(`/users/${userId}/revoke`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User access revoked successfully');
      setShowRevokeModal(false);
      setSelectedUser(null);
      resetRevoke();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to revoke access');
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: number }) => {
      const response = await api.put(`/users/${userId}/role`, { role_id: roleId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-details'] });
      queryClient.invalidateQueries({ queryKey: ['role-usage-counts'] });
      toast.success('Role assigned successfully');
      setShowRoleModal(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign role');
    },
  });

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    resetEdit({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      status: user.status || 'active',
    });
    setShowEditModal(true);
    setActionMenuOpen(null);
  };

  const handleView = async (user: any) => {
    setSelectedUser(user);
    setShowViewModal(true);
    setActionMenuOpen(null);
  };

  const handleRevoke = (user: any) => {
    setSelectedUser(user);
    resetRevoke({
      transfer_data: false,
      reason: '',
    });
    setShowRevokeModal(true);
    setActionMenuOpen(null);
  };

  const handleAssignRole = (user: any) => {
    setSelectedUser(user);
    setShowRoleModal(true);
    setActionMenuOpen(null);
  };

  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.post(`/users/${userId}/impersonate`);
      return response.data;
    },
    onSuccess: (data) => {
      // Update auth store with new tokens
      const authStore = useAuthStore.getState();
      if (authStore.user && authStore.organization) {
        authStore.setAuth(
          { access_token: data.access_token, refresh_token: data.refresh_token },
          data.impersonated_user,
          authStore.organization
        );
      }
      toast.success(`Now impersonating ${data.impersonated_user.first_name} ${data.impersonated_user.last_name}`);
      // Reload page to reflect impersonation
      window.location.reload();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to impersonate user');
    },
  });

  const handleImpersonate = (user: any) => {
    if (confirm(`Are you sure you want to impersonate ${user.first_name} ${user.last_name}? You will see the system from their perspective.`)) {
      impersonateMutation.mutate(user.id);
      setActionMenuOpen(null);
      setMenuPosition(null);
    }
  };

  const onEditSubmit = (data: EditUserFormData) => {
    if (selectedUser) {
      updateMutation.mutate({ userId: selectedUser.id, data });
    }
  };

  const onRevokeSubmit = (data: RevokeAccessFormData) => {
    if (selectedUser) {
      if (confirm(`Are you sure you want to revoke access for ${selectedUser.first_name} ${selectedUser.last_name}?`)) {
        revokeMutation.mutate({ userId: selectedUser.id, data });
      }
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isCurrentUser = (userId: string) => {
    return currentUser?.id === userId;
  };

  // Permission check is handled by ProtectedRoute in App.tsx

  return (
    <div className="w-full p-6" style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: theme.colors.primary }}>
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: theme.colors.text }}>Users</h1>
              <p className="mt-2 text-sm sm:text-base" style={{ color: theme.colors.textSecondary }}>Manage organization users and their access</p>
            </div>
          </div>
          <Link to={slug ? `/org/${slug}/invitations` : '/invitations'}>
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
              Invite User
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-4" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
        <CardContent>
          <div className="space-y-4">
            <SearchBar
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              theme={theme}
            />

            {isMasterOrg && (
              <div className="flex border-b" style={{ borderColor: theme.colors.border }}>
                <button
                  onClick={() => { setActiveTab('all'); setPage(1); }}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'all' ? '' : 'hover:bg-opacity-5'}`}
                  style={{
                    color: activeTab === 'all' ? theme.colors.primary : theme.colors.textSecondary,
                    borderBottom: activeTab === 'all' ? `2px solid ${theme.colors.primary}` : 'none'
                  }}
                >
                  All Users
                </button>
                <button
                  onClick={() => { setActiveTab('master'); setPage(1); }}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'master' ? '' : 'hover:bg-opacity-5'}`}
                  style={{
                    color: activeTab === 'master' ? theme.colors.primary : theme.colors.textSecondary,
                    borderBottom: activeTab === 'master' ? `2px solid ${theme.colors.primary}` : 'none'
                  }}
                >
                  Master Organization
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="rounded-lg p-4" style={{ backgroundColor: theme.colors.error + '1A', border: `1px solid ${theme.colors.error}` + '33' }}>
          <p style={{ color: theme.colors.error }}>
            Error loading users: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <Card className="overflow-visible mt-4" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
          <div className="overflow-x-auto overflow-visible">
            <table className="min-w-full" style={{ borderColor: theme.colors.border }}>
              <thead style={{ backgroundColor: theme.colors.background }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.colors.textSecondary }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: theme.colors.background }}>
                {data?.users && data.users.length > 0 ? (
                  data.users.map((user: any) => {
                    const isSelf = isCurrentUser(user.id);
                    const isExpanded = expandedUsers.has(user.id);

                    return (
                      <React.Fragment key={user.id}>
                        {/* Summary Row */}
                        <tr
                          className={`${isSelf ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} transition-colors duration-150`}
                          style={{ borderTop: `1px solid ${theme.colors.border}` }}
                          onClick={() => !isSelf && toggleUserExpansion(user.id)}
                          onMouseEnter={(e) => {
                            if (!isSelf) e.currentTarget.style.backgroundColor = theme.colors.surface;
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelf) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ backgroundColor: theme.colors.primary + '1A' }}>
                                <span className="font-medium" style={{ color: theme.colors.primary }}>
                                  {user.first_name?.[0]?.toUpperCase() || ''}{user.last_name?.[0]?.toUpperCase() || ''}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.colors.text }}>
                                  {user.first_name} {user.last_name}
                                  {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 font-normal" style={{ color: theme.colors.textSecondary }}>YOU</span>}
                                </div>
                                <div className="text-xs mt-0.5" style={{ color: theme.colors.textSecondary }}>{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.role ? (
                              <span
                                className="text-xs px-2.5 py-1 rounded-full font-medium"
                                style={{
                                  backgroundColor: `${theme.colors.primary}10`,
                                  color: theme.colors.primary,
                                  border: `1px solid ${theme.colors.primary}30`,
                                }}
                              >
                                {user.role.name}
                              </span>
                            ) : (
                              <span className="text-xs" style={{ color: theme.colors.textSecondary }}>No role</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className="text-xs px-2.5 py-1 rounded-full font-medium"
                              style={{
                                backgroundColor:
                                  user.status === 'active'
                                    ? `${theme.colors.primary}20`
                                    : `${theme.colors.textSecondary}15`,
                                color:
                                  user.status === 'active'
                                    ? theme.colors.primary
                                    : theme.colors.textSecondary,
                                border: `1px solid ${user.status === 'active' ? theme.colors.primary + '30' : theme.colors.border}`,
                              }}
                            >
                              {user.status === 'active' ? 'Active' : user.status === 'suspended' ? 'Suspended' : 'Deleted'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              {!isSelf && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleUserExpansion(user.id);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                  style={{ color: theme.colors.textSecondary }}
                                >
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                              )}
                              <div className="relative inline-block">
                                <button
                                  ref={(el) => {
                                    menuButtonRefs.current[user.id] = el;
                                  }}
                                  onClick={(e) => {
                                    if (isSelf) {
                                      e.stopPropagation();
                                      return;
                                    }
                                    e.stopPropagation();
                                    const button = menuButtonRefs.current[user.id];
                                    if (button) {
                                      const rect = button.getBoundingClientRect();
                                      setMenuPosition({
                                        top: rect.bottom + 8,
                                        right: window.innerWidth - rect.right,
                                      });
                                    }
                                    setActionMenuOpen(actionMenuOpen === user.id ? null : user.id);
                                  }}
                                  disabled={isSelf}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                  style={{ color: theme.colors.textSecondary }}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                                {actionMenuOpen === user.id && menuPosition && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-[100]"
                                      onClick={() => {
                                        setActionMenuOpen(null);
                                        setMenuPosition(null);
                                      }}
                                    ></div>
                                    <div
                                      className="fixed rounded-lg shadow-xl z-[101] py-1 min-w-[200px] animate-in fade-in zoom-in duration-100"
                                      style={{
                                        top: `${menuPosition.top}px`,
                                        right: `${menuPosition.right}px`,
                                        backgroundColor: theme.colors.surface,
                                        border: `1px solid ${theme.colors.border}`,
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="py-1">
                                        <button
                                          onClick={() => {
                                            handleView(user);
                                            setActionMenuOpen(null);
                                            setMenuPosition(null);
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm flex items-center hover:bg-gray-50 transition-colors"
                                          style={{ color: theme.colors.textSecondary }}
                                        >
                                          <Eye className="h-4 w-4 mr-2" />
                                          View Full Profile
                                        </button>
                                        {canEditUsers && canEditSpecificUser(user) && (
                                          <button
                                            onClick={() => {
                                              handleEdit(user);
                                              setActionMenuOpen(null);
                                              setMenuPosition(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm flex items-center hover:bg-gray-50 transition-colors"
                                            style={{ color: theme.colors.textSecondary }}
                                          >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit Information
                                          </button>
                                        )}
                                        {canAssignRoles && (
                                          <button
                                            onClick={() => {
                                              handleAssignRole(user);
                                              setActionMenuOpen(null);
                                              setMenuPosition(null);
                                            }}
                                            disabled={!canEditUserRole(user)}
                                            className="w-full text-left px-4 py-2 text-sm flex items-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                            style={{ color: theme.colors.textSecondary }}
                                          >
                                            <Shield className="h-4 w-4 mr-2" />
                                            Change Permission Role
                                          </button>
                                        )}
                                        {canImpersonate && (
                                          <button
                                            onClick={() => {
                                              handleImpersonate(user);
                                            }}
                                            disabled={isCurrentUser(user.id) || user.role?.is_organization_owner || impersonateMutation.isPending}
                                            className="w-full text-left px-4 py-2 text-sm flex items-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                            style={{ color: theme.colors.textSecondary }}
                                          >
                                            <UserCog className="h-4 w-4 mr-2" />
                                            Impersonate User
                                          </button>
                                        )}
                                        {canRevokeUsers && (
                                          <>
                                            <div className="my-1 border-t" style={{ borderColor: theme.colors.border }}></div>
                                            <button
                                              onClick={() => {
                                                handleRevoke(user);
                                                setActionMenuOpen(null);
                                                setMenuPosition(null);
                                              }}
                                              disabled={isCurrentUser(user.id) || user.role?.is_organization_owner || !canEditUserRole(user)}
                                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Revoke Organization Access
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Collapsible Detail Row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={4} className="px-6 pb-4 animate-in slide-in-from-top-2 duration-200">
                              <div
                                className="p-5 rounded-xl border grid grid-cols-1 md:grid-cols-3 gap-6 shadow-inner"
                                style={{
                                  backgroundColor: theme.colors.surface + '80',
                                  borderColor: theme.colors.border,
                                }}
                              >
                                <div className="space-y-3">
                                  <h5 className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: theme.colors.textSecondary }}>Contact & Identity</h5>
                                  <div>
                                    <p className="text-xs font-medium" style={{ color: theme.colors.textSecondary }}>Email Address</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className="text-sm font-medium" style={{ color: theme.colors.text }}>{user.email}</p>
                                      {user.email_verified ? (
                                        <Badge variant="success" className="text-[9px] px-1 py-0">Verified</Badge>
                                      ) : (
                                        <Badge variant="secondary" className="text-[9px] px-1 py-0">Unverified</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium" style={{ color: theme.colors.textSecondary }}>Phone Number</p>
                                    <p className="text-sm font-medium mt-1" style={{ color: theme.colors.text }}>{user.phone || 'No phone provided'}</p>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <h5 className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: theme.colors.textSecondary }}>Organization Access</h5>
                                  <div>
                                    <p className="text-xs font-medium" style={{ color: theme.colors.textSecondary }}>Accessible Branches</p>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                      {activeTab === 'all' && isMasterOrg ? (
                                        user.branches && user.branches.length > 0 ? (
                                          user.branches.map((branch: any) => (
                                            <Badge
                                              key={branch.id}
                                              variant="secondary"
                                              className="text-[10px] px-1.5 py-0.5 rounded-md"
                                              style={{ backgroundColor: theme.colors.primary + '10', color: theme.colors.primary, border: `1px solid ${theme.colors.primary}20` }}
                                            >
                                              {branch.name}
                                            </Badge>
                                          ))
                                        ) : (
                                          <span className="text-xs font-medium italic" style={{ color: theme.colors.textSecondary }}>Restricted to Master only</span>
                                        )
                                      ) : (
                                        <span className="text-xs font-medium" style={{ color: theme.colors.text }}>{organization?.name}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium" style={{ color: theme.colors.textSecondary }}>MFA Protection</p>
                                    <p className="text-sm font-medium mt-1" style={{ color: user.mfa_enabled ? '#10b981' : theme.colors.textSecondary }}>
                                      {user.mfa_enabled ? 'Two-Factor Authentication Enabled' : 'Not setup'}
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <h5 className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: theme.colors.textSecondary }}>Activity Tracker</h5>
                                  <div>
                                    <p className="text-xs font-medium" style={{ color: theme.colors.textSecondary }}>Member Since</p>
                                    <p className="text-sm font-medium mt-1" style={{ color: theme.colors.text }}>{user.joined_at ? formatDate(user.joined_at) : 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium" style={{ color: theme.colors.textSecondary }}>Last Recorded Activity</p>
                                    <p className="text-sm font-medium mt-1" style={{ color: theme.colors.text }}>{user.last_login_at ? formatDate(user.last_login_at) : 'Never logged in'}</p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-3 text-center" style={{ color: theme.colors.textSecondary }}>
                      No users found. {search && 'Try adjusting your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                {data.total > 0 ? (
                  <>
                    Showing {(data.page - 1) * data.limit + 1} to {Math.min(data.page * data.limit, data.total)} of {data.total} users
                    {data.totalPages > 1 && ` (Page ${data.page} of ${data.totalPages})`}
                  </>
                ) : (
                  'No users found'
                )}
              </div>
              {data.totalPages > 1 && (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="secondary"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    variant="secondary"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* View User Details Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={() => setShowViewModal(false)}></div>
            <div className="inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full" style={{ backgroundColor: theme.colors.surface }}>
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4" style={{ backgroundColor: theme.colors.surface }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium" style={{ color: theme.colors.text }}>User Details</h3>
                  <button
                    onClick={() => setShowViewModal(false)}
                    style={{ color: theme.colors.textSecondary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.colors.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.colors.textSecondary;
                    }}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                {userDetails ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${theme.colors.primary}33` }}>
                        <span className="font-medium text-xl" style={{ color: theme.colors.primary }}>
                          {userDetails.first_name?.[0]?.toUpperCase() || ''}{userDetails.last_name?.[0]?.toUpperCase() || ''}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold" style={{ color: theme.colors.text }}>
                          {userDetails.first_name} {userDetails.last_name}
                        </h4>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>{userDetails.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: theme.colors.border }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Phone</p>
                        <p className="text-sm mt-1" style={{ color: theme.colors.text }}>{userDetails.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Status</p>
                        <span
                          className="mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                          style={{
                            backgroundColor:
                              userDetails.status === 'active'
                                ? `${theme.colors.primary}33`
                                : userDetails.status === 'suspended'
                                  ? `${theme.colors.primary}1A`
                                  : `${theme.colors.primary}1A`,
                            color:
                              userDetails.status === 'active'
                                ? theme.colors.primary
                                : theme.colors.textSecondary,
                            border:
                              userDetails.status === 'active'
                                ? `1px solid ${theme.colors.primary}4D`
                                : `1px solid ${theme.colors.border}`,
                          }}
                        >
                          {userDetails.status || 'Active'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Email Verified</p>
                        <div className="mt-1 flex items-center">
                          {userDetails.email_verified ? (
                            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.colors.primary}33`, color: theme.colors.primary, border: `1px solid ${theme.colors.primary}4D` }}>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.colors.primary}1A`, color: theme.colors.textSecondary, border: `1px solid ${theme.colors.border}` }}>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Unverified
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>MFA Enabled</p>
                        <div className="mt-1">
                          {userDetails.mfa_enabled ? (
                            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.colors.primary}33`, color: theme.colors.primary, border: `1px solid ${theme.colors.primary}4D` }}>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Enabled
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: theme.colors.textSecondary }}>Disabled</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Last Login</p>
                        <p className="text-sm mt-1" style={{ color: theme.colors.text }}>
                          {userDetails.last_login_at ? formatDate(userDetails.last_login_at) : 'Never'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>Member Since</p>
                        <p className="text-sm mt-1" style={{ color: theme.colors.text }}>
                          {selectedUser.joined_at ? formatDate(selectedUser.joined_at) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: theme.colors.primary }}></div>
                    <p className="mt-2 text-sm" style={{ color: theme.colors.textSecondary }}>Loading user details...</p>
                  </div>
                )}
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => setShowViewModal(false)}
                    variant="secondary"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={() => setShowEditModal(false)}></div>
            <div className="inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" style={{ backgroundColor: theme.colors.surface }}>
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4" style={{ backgroundColor: theme.colors.surface }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium" style={{ color: theme.colors.text }}>Edit User</h3>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      resetEdit();
                    }}
                    style={{ color: theme.colors.textSecondary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.colors.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.colors.textSecondary;
                    }}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="First Name *"
                        id="first_name"
                        type="text"
                        {...registerEdit('first_name')}
                        error={editErrors.first_name?.message}
                        fullWidth
                      />
                    </div>
                    <div>
                      <Input
                        label="Last Name *"
                        id="last_name"
                        type="text"
                        {...registerEdit('last_name')}
                        error={editErrors.last_name?.message}
                        fullWidth
                      />
                    </div>
                  </div>
                  <div>
                    <Input
                      label="Email *"
                      id="email"
                      type="email"
                      {...registerEdit('email')}
                      error={editErrors.email?.message}
                      fullWidth
                    />
                  </div>
                  <div>
                    <Input
                      label="Phone"
                      id="phone"
                      type="tel"
                      {...registerEdit('phone')}
                      placeholder="+1234567890"
                      fullWidth
                    />
                  </div>
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                      Status
                    </label>
                    <select
                      id="status"
                      {...registerEdit('status')}
                      className="w-full px-3 py-2 rounded-lg border transition-colors"
                      style={{
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.border;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="deleted">Deleted</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        resetEdit();
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      variant="primary"
                      isLoading={updateMutation.isPending}
                      leftIcon={<Save className="h-4 w-4" />}
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }} onClick={() => setShowRoleModal(false)}></div>
            <div className="inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" style={{ backgroundColor: theme.colors.surface }}>
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4" style={{ backgroundColor: theme.colors.surface }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium" style={{ color: theme.colors.text }}>Change Role</h3>
                  <button
                    onClick={() => setShowRoleModal(false)}
                    style={{ color: theme.colors.textSecondary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.colors.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.colors.textSecondary;
                    }}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="mb-4">
                  <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                    Assign a new role to <span className="font-medium" style={{ color: theme.colors.text }}>{selectedUser.first_name} {selectedUser.last_name}</span>
                  </p>
                  <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                    Current role: <span className="font-medium" style={{ color: theme.colors.text }}>{selectedUser.role?.name || 'No role'}</span>
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="role_id" className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                      Select Role
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {/* Default Roles Section - Always visible */}
                      {roles && roles.filter((role: any) => role.is_default || role.is_system_role).length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold uppercase mb-2" style={{ color: theme.colors.textSecondary }}>Default Roles</p>
                          {roles
                            ?.filter((role: any) => role.is_default || role.is_system_role)
                            .map((role: any) => {
                              // Roles from assignable endpoint are already filtered, but we still need to check
                              // if we can assign this specific role to this specific user (considering target user's current role)
                              const roleLevel = getRoleHierarchyLevel(role);
                              const targetUserCurrentRoleLevel = getRoleHierarchyLevel(selectedUser.role);

                              // Organization owners can assign any role except owner
                              let canAssignThisRole = false;
                              if (isOrganizationOwner) {
                                canAssignThisRole = !role.is_organization_owner;
                              } else if (currentUserRole) {
                                const currentUserRoleLevel = getRoleHierarchyLevel(currentUserRole);
                                // Can assign if: role level > current user level AND role level >= target user's current level
                                canAssignThisRole = roleLevel > currentUserRoleLevel && roleLevel >= targetUserCurrentRoleLevel && !role.is_organization_owner;
                              }
                              const isCurrentRole = role.id === selectedUser.role?.id;

                              return (
                                <button
                                  key={role.id}
                                  onClick={() => {
                                    if (confirm(`Assign role "${role.name}" to ${selectedUser.first_name} ${selectedUser.last_name}?`)) {
                                      assignRoleMutation.mutate({ userId: selectedUser.id, roleId: role.id });
                                    }
                                  }}
                                  disabled={assignRoleMutation.isPending || isCurrentRole || !canAssignThisRole}
                                  className="w-full text-left p-3 rounded-lg border-2 transition-colors mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={isCurrentRole ? {
                                    borderColor: theme.colors.primary,
                                    backgroundColor: `${theme.colors.primary}33`,
                                  } : canAssignThisRole ? {
                                    borderColor: theme.colors.border,
                                    backgroundColor: theme.colors.background,
                                  } : {
                                    borderColor: theme.colors.border,
                                    backgroundColor: theme.colors.surface,
                                    opacity: 0.6,
                                  }}
                                  onMouseEnter={(e) => {
                                    if (canAssignThisRole && !isCurrentRole && !assignRoleMutation.isPending) {
                                      e.currentTarget.style.borderColor = theme.colors.primary;
                                      e.currentTarget.style.backgroundColor = theme.colors.surface;
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (canAssignThisRole && !isCurrentRole && !assignRoleMutation.isPending) {
                                      e.currentTarget.style.borderColor = theme.colors.border;
                                      e.currentTarget.style.backgroundColor = theme.colors.background;
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      <div>
                                        <p className="font-medium" style={{ color: theme.colors.text }}>{role.name}</p>
                                        {role.description && (
                                          <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>{role.description}</p>
                                        )}
                                      </div>
                                      {role.is_organization_owner && (
                                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                          Owner
                                        </span>
                                      )}
                                    </div>
                                    {isCurrentRole && (
                                      <CheckCircle2 className="h-5 w-5" style={{ color: theme.colors.primary }} />
                                    )}
                                    {!canAssignThisRole && !isCurrentRole && (
                                      <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
                                        {role.is_organization_owner ? 'Cannot change' : 'Insufficient permissions'}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      )}

                      {/* Custom Roles Section */}
                      {roles && roles.filter((role: any) => !role.is_default && !role.is_system_role).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase mb-2" style={{ color: theme.colors.textSecondary }}>Custom Roles</p>
                          {roles
                            ?.filter((role: any) => !role.is_default && !role.is_system_role)
                            .map((role: any) => {
                              // Roles from assignable endpoint are already filtered, but we still need to check
                              // if we can assign this specific role to this specific user (considering target user's current role)
                              const roleLevel = getRoleHierarchyLevel(role);
                              const targetUserCurrentRoleLevel = getRoleHierarchyLevel(selectedUser.role);

                              // Organization owners can assign any role except owner
                              let canAssignThisRole = false;
                              if (isOrganizationOwner) {
                                canAssignThisRole = !role.is_organization_owner;
                              } else if (currentUserRole) {
                                const currentUserRoleLevel = getRoleHierarchyLevel(currentUserRole);
                                // Can assign if: role level > current user level AND role level >= target user's current level
                                canAssignThisRole = roleLevel > currentUserRoleLevel && roleLevel >= targetUserCurrentRoleLevel && !role.is_organization_owner;
                              }
                              const isCurrentRole = role.id === selectedUser.role?.id;

                              return (
                                <button
                                  key={role.id}
                                  onClick={() => {
                                    if (confirm(`Assign role "${role.name}" to ${selectedUser.first_name} ${selectedUser.last_name}?`)) {
                                      assignRoleMutation.mutate({ userId: selectedUser.id, roleId: role.id });
                                    }
                                  }}
                                  disabled={assignRoleMutation.isPending || isCurrentRole || !canAssignThisRole}
                                  className="w-full text-left p-3 rounded-lg border-2 transition-colors mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={isCurrentRole ? {
                                    borderColor: theme.colors.primary,
                                    backgroundColor: `${theme.colors.primary}33`,
                                  } : canAssignThisRole ? {
                                    borderColor: theme.colors.border,
                                    backgroundColor: theme.colors.background,
                                  } : {
                                    borderColor: theme.colors.border,
                                    backgroundColor: theme.colors.surface,
                                    opacity: 0.6,
                                  }}
                                  onMouseEnter={(e) => {
                                    if (canAssignThisRole && !isCurrentRole && !assignRoleMutation.isPending) {
                                      e.currentTarget.style.borderColor = theme.colors.primary;
                                      e.currentTarget.style.backgroundColor = theme.colors.surface;
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (canAssignThisRole && !isCurrentRole && !assignRoleMutation.isPending) {
                                      e.currentTarget.style.borderColor = theme.colors.border;
                                      e.currentTarget.style.backgroundColor = theme.colors.background;
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium" style={{ color: theme.colors.text }}>{role.name}</p>
                                      {role.description && (
                                        <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>{role.description}</p>
                                      )}
                                    </div>
                                    {isCurrentRole && (
                                      <CheckCircle2 className="h-5 w-5" style={{ color: theme.colors.primary }} />
                                    )}
                                    {!canAssignThisRole && !isCurrentRole && (
                                      <span className="text-xs" style={{ color: theme.colors.textSecondary }}>Insufficient permissions</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      )}

                      {(!roles || roles.length === 0) && (
                        <p className="text-sm text-center py-4" style={{ color: theme.colors.textSecondary }}>No roles available</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => setShowRoleModal(false)}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Access Modal */}
      {showRevokeModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }} onClick={() => setShowRevokeModal(false)}></div>
            <div className="inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" style={{ backgroundColor: theme.colors.surface }}>
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4" style={{ backgroundColor: theme.colors.surface }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium" style={{ color: theme.colors.primary }}>Revoke Access</h3>
                  <button
                    onClick={() => setShowRevokeModal(false)}
                    style={{ color: theme.colors.textSecondary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.colors.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.colors.textSecondary;
                    }}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="mb-4 p-4 rounded-lg border" style={{ backgroundColor: `${theme.colors.primary}1A`, borderColor: `${theme.colors.primary}80` }}>
                  <p className="text-sm" style={{ color: theme.colors.text }}>
                    <strong>Warning:</strong> This will revoke access for <strong>{selectedUser.first_name} {selectedUser.last_name}</strong>.
                    They will no longer be able to access this organization.
                  </p>
                </div>
                <form onSubmit={handleRevokeSubmit(onRevokeSubmit)} className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...registerRevoke('transfer_data')}
                        className="rounded"
                        style={{
                          borderColor: theme.colors.border,
                          accentColor: theme.colors.primary,
                        }}
                      />
                      <span className="ml-2 text-sm" style={{ color: theme.colors.text }}>
                        Transfer data ownership to another user
                      </span>
                    </label>
                    <p className="text-xs mt-1 ml-6" style={{ color: theme.colors.textSecondary }}>
                      Select a user with the same role to transfer ownership of this user's data
                    </p>
                  </div>

                  {transferData && (
                    <div>
                      <label htmlFor="transfer_to_user_id" className="block text-sm font-medium" style={{ color: theme.colors.text }}>
                        Transfer To User *
                      </label>
                      <select
                        id="transfer_to_user_id"
                        {...registerRevoke('transfer_to_user_id')}
                        className="input mt-1"
                        style={{
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.background,
                          color: theme.colors.text,
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.border;
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">Select a user...</option>
                        {data?.users
                          ?.filter((u: any) =>
                            u.id !== selectedUser.id &&
                            u.role?.id === selectedUser.role?.id &&
                            u.status === 'active'
                          )
                          .map((u: any) => (
                            <option key={u.id} value={u.id}>
                              {u.first_name} {u.last_name} ({u.email})
                            </option>
                          ))}
                      </select>
                      {revokeErrors.transfer_to_user_id && (
                        <p className="mt-1 text-sm" style={{ color: theme.colors.primary }}>{revokeErrors.transfer_to_user_id.message}</p>
                      )}
                      {transferData && data?.users?.filter((u: any) =>
                        u.id !== selectedUser.id &&
                        u.role?.id === selectedUser.role?.id &&
                        u.status === 'active'
                      ).length === 0 && (
                          <p className="mt-1 text-sm" style={{ color: theme.colors.textSecondary }}>
                            No users with the same role available for data transfer
                          </p>
                        )}
                    </div>
                  )}

                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium" style={{ color: theme.colors.text }}>
                      Reason (Optional)
                    </label>
                    <textarea
                      id="reason"
                      {...registerRevoke('reason')}
                      rows={3}
                      className="input mt-1"
                      placeholder="Enter reason for revoking access..."
                      style={{
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.border;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    {revokeErrors.reason && (
                      <p className="mt-1 text-sm" style={{ color: theme.colors.primary }}>{revokeErrors.reason.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowRevokeModal(false);
                        resetRevoke();
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={revokeMutation.isPending}
                      variant="danger"
                      isLoading={revokeMutation.isPending}
                    >
                      Revoke Access
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

