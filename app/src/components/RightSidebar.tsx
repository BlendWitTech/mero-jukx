import { useState, useEffect } from 'react';
import { Ticket, MessageSquare, Clock, Users, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Hash, X, Minimize2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { chatService } from '../services/chatService';
import toast from '@shared/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../contexts/ThemeContext';

export default function RightSidebar({
  isCollapsed,
  onCollapse,
  onExpand,
  isAppOpen,
  onCloseApp,
  onMinimizeApp
}: {
  isCollapsed?: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
  isAppOpen?: boolean;
  onCloseApp?: () => void;
  onMinimizeApp?: () => void;
}) {
  const { hasPermission, isOrganizationOwner } = usePermissions();
  const { organization } = useAuthStore();
  const { theme } = useTheme();
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const queryClient = useQueryClient();

  // Check if organization has chat access
  const { data: currentPackage } = useQuery({
    queryKey: ['current-package'],
    queryFn: async () => {
      try {
        const response = await api.get('/organizations/me/package');
        return response.data;
      } catch (error: any) {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!organization?.id,
    retry: false,
  });

  const hasChatAccess = currentPackage && (
    currentPackage.package?.slug === 'platinum' ||
    currentPackage.package?.slug === 'diamond' ||
    (currentPackage.active_features || []).some((f: any) => f.feature?.slug === 'chat-system')
  );

  const canCreateGroup = hasPermission('chat.create_group');

  // Load all chats to get unread counts - use same query key as ChatManager for consistency
  // This ensures we get real-time updates when ChatManager updates the cache
  const { data: chatsData } = useQuery({
    queryKey: ['chats', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return { chats: [], total: 0, page: 1, limit: 50 };
      try {
        return await chatService.getChats(organization.id, { limit: 100 });
      } catch (error: any) {
        // Handle 403 (no access) or 400 (validation/access issue) gracefully
        if (error.response?.status === 403 || error.response?.status === 400) {
          console.warn('Chat access issue:', error.response?.data?.message || error.message);
          return { chats: [], total: 0, page: 1, limit: 50 };
        }
        throw error;
      }
    },
    enabled: !!organization?.id && !!currentPackage && hasChatAccess === true,
    retry: false,
    // Refetch interval to ensure we get updates (though setQueryData should handle this)
    refetchInterval: false,
  });

  const allChats = chatsData?.chats || [];
  const groups = allChats.filter((chat: any) => chat.type === 'group');

  // Debug: Log unread counts
  useEffect(() => {
    if (allChats.length > 0) {
      const unreadChats = allChats.filter((c: any) => (c.unread_count || 0) > 0);
      if (unreadChats.length > 0) {
        console.log('[RightSidebar] Chats with unread messages:', unreadChats.map((c: any) => ({ id: c.id, name: c.name, unread: c.unread_count })));
      }
    }
  }, [allChats]);

  // Get unread count for a chat
  const getUnreadCount = (chatId: string) => {
    const chat = allChats.find((c: any) => c.id === chatId);
    const count = chat?.unread_count || 0;
    // Debug logging
    if (count > 0) {
      console.log('[RightSidebar] Unread count for chat', chatId, ':', count);
    }
    return count;
  };

  const handleCreateGroup = async (name: string, description?: string, memberIds: string[] = []) => {
    if (!organization?.id) return;

    try {
      const newChat = await chatService.createChat(organization.id, {
        type: 'group',
        name,
        description,
        member_ids: memberIds,
      });
      // Open the new group chat window
      if ((window as any).openChatWindow) {
        (window as any).openChatWindow(newChat.id, null);
      }
      setShowCreateGroupModal(false);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('You do not have permission to create groups.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to create group');
      }
    }
  };

  // Collapsed view - show icons only (like left sidebar)
  if (isCollapsed) {
    return (
      <div
        className="w-[72px] h-full flex flex-col border-l transition-all duration-300"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border
        }}
      >
        {/* Collapse button at top - with Close/Minimize when app is open */}
        <div
          className="h-12 px-2 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: theme.colors.border }}
        >
          <button
            onClick={() => {
              onExpand?.();
            }}
            className="transition-colors"
            style={{ color: theme.colors.textSecondary }}
            onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.text}
            onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textSecondary}
            title="Expand sidebar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {/* Close and Minimize buttons - only show when app is open */}
          {isAppOpen && (
            <div className="flex items-center gap-1">
              {onMinimizeApp && (
                <button
                  onClick={onMinimizeApp}
                  className="p-1 rounded transition-colors"
                  style={{ color: theme.colors.textSecondary }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = theme.colors.text;
                    e.currentTarget.style.backgroundColor = theme.colors.border;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = theme.colors.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Minimize App"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              )}
              {onCloseApp && (
                <button
                  onClick={onCloseApp}
                  className="p-1 rounded transition-colors"
                  style={{ color: theme.colors.textSecondary }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = theme.colors.text;
                    e.currentTarget.style.backgroundColor = theme.colors.border;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = theme.colors.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Close App"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content - Icons only */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent" style={{ scrollbarColor: `${theme.colors.border} transparent` }}>
          <div className="p-2 space-y-2">
            {/* Support Section - Icons only */}
            {((isOrganizationOwner || hasPermission('tickets.view')) || (isOrganizationOwner || hasPermission('admin_chat.access'))) && (
              <div className="space-y-1">
                {((isOrganizationOwner || hasPermission('tickets.view')) && (
                  <a
                    href={`/org/${organization?.slug}/tickets`}
                    className="flex items-center justify-center p-2 rounded transition-colors group relative"
                    style={{ color: theme.colors.textSecondary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.border;
                      e.currentTarget.style.color = theme.colors.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = theme.colors.textSecondary;
                    }}
                    title="Tickets"
                  >
                    <Ticket className="h-5 w-5" />
                  </a>
                ))}
                {((isOrganizationOwner || hasPermission('admin_chat.access')) && (
                  <a
                    href={`/org/${organization?.slug}/chat/admin`}
                    className="flex items-center justify-center p-2 rounded transition-colors group relative"
                    style={{ color: theme.colors.textSecondary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.border;
                      e.currentTarget.style.color = theme.colors.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = theme.colors.textSecondary;
                    }}
                    title="Chat with Admin"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </a>
                ))}
              </div>
            )}

            {/* Groups Section - Icons only (name icon) */}
            {hasChatAccess && groups.length > 0 && (
              <div className="space-y-1">
                {groups.slice(0, 5).map((group: any) => {
                  const unreadCount = getUnreadCount(group.id);
                  const nameInitial = (group.name || 'G')[0].toUpperCase();
                  return (
                    <button
                      key={group.id}
                      onClick={() => {
                        if ((window as any).openChatWindow) {
                          (window as any).openChatWindow(group.id, null);
                        }
                      }}
                      className="w-full flex items-center justify-center p-2 rounded transition-colors relative group"
                      style={{ color: theme.colors.textSecondary }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.border;
                        e.currentTarget.style.color = theme.colors.text;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = theme.colors.textSecondary;
                      }}
                      title={group.name || 'Unnamed Group'}
                    >
                      <div className="h-8 w-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-semibold">
                        {nameInitial}
                      </div>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#ed4245] text-white text-[10px] font-semibold flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="w-[240px] h-full flex flex-col border-l transition-all duration-300"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border
        }}
      >
        {/* Header - Collapse button before Quick Access */}
        <div
          className="h-12 px-4 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onCollapse?.();
              }}
              className="transition-colors"
              style={{ color: theme.colors.textSecondary }}
              onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.text}
              onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textSecondary}
              title="Collapse sidebar"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            {!isAppOpen && (
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: theme.colors.text }}>
                Quick Access
              </h2>
            )}
          </div>
          {/* Close and minimize buttons - show when app is open and right sidebar is available */}
          {isAppOpen && (
            <div className="flex items-center gap-2">
              {onMinimizeApp && (
                <button
                  onClick={onMinimizeApp}
                  className="p-1.5 rounded transition-colors"
                  style={{
                    color: theme.colors.textSecondary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = theme.colors.text;
                    e.currentTarget.style.backgroundColor = theme.colors.border;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = theme.colors.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Minimize App"
                >
                  <Minimize2 className="h-5 w-5" />
                </button>
              )}
              {onCloseApp && (
                <button
                  onClick={onCloseApp}
                  className="p-1.5 rounded transition-colors"
                  style={{
                    color: theme.colors.textSecondary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = theme.colors.text;
                    e.currentTarget.style.backgroundColor = theme.colors.border;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = theme.colors.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Close App"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent" style={{ scrollbarColor: `${theme.colors.border} transparent` }}>
          <div className="p-4 space-y-4">
            {/* Support Section */}
            {((isOrganizationOwner || hasPermission('tickets.view')) || (isOrganizationOwner || hasPermission('admin_chat.access'))) && (
              <QuickAccessSection
                title="Support"
                icon={Ticket}
                items={[
                  ...((isOrganizationOwner || hasPermission('tickets.view')) ? [{ label: 'Tickets', icon: Ticket, href: `/org/${organization?.slug}/tickets` }] : []),
                  ...((isOrganizationOwner || hasPermission('admin_chat.access')) ? [{ label: 'Chat with Admin', icon: MessageSquare, href: `/org/${organization?.slug}/chat/admin` }] : []),
                ]}
              />
            )}

            {/* Online Users Section */}
            {hasPermission('users.view') && (
              <OnlineUsersSection
                onOpenChat={(chatId) => {
                  if ((window as any).openChatWindow) {
                    (window as any).openChatWindow(chatId, null);
                  }
                }}
                allChats={allChats}
                getUnreadCount={getUnreadCount}
              />
            )}

            {/* Groups Section */}
            {hasChatAccess && (
              <GroupsSection
                groups={groups}
                canCreateGroup={canCreateGroup}
                onCreateGroup={() => setShowCreateGroupModal(true)}
                onOpenChat={(chatId) => {
                  if ((window as any).openChatWindow) {
                    (window as any).openChatWindow(chatId, null);
                  }
                }}
                getUnreadCount={getUnreadCount}
              />
            )}

            {/* Chat Access Alert */}
            {!hasChatAccess && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: `${theme.colors.accent}10`, border: `1px solid ${theme.colors.accent}20` }}>
                <p className="text-xs font-medium mb-1" style={{ color: theme.colors.accent }}>Chat Not Available</p>
                <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                  Purchase the chat app or ask the organization to unlock this feature.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <CreateGroupModal
          onClose={() => setShowCreateGroupModal(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </>
  );
}

function QuickAccessSection({ title, icon: Icon, items }: any) {
  const { theme } = useTheme();
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" style={{ color: theme.colors.textSecondary }} />
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
          {title}
        </h3>
      </div>
      <div className="space-y-1">
        {items.map((item: any) => {
          const ItemIcon = item.icon;
          return (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors group"
              style={{ color: theme.colors.textSecondary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.border;
                e.currentTarget.style.color = theme.colors.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.colors.textSecondary;
              }}
            >
              <ItemIcon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function OnlineUsersSection({
  onOpenChat,
  allChats,
  getUnreadCount
}: {
  onOpenChat: (chatId: string) => void;
  allChats: any[];
  getUnreadCount: (chatId: string) => number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { user: currentUser, organization } = useAuthStore();
  const { hasPermission, isOrganizationOwner } = usePermissions();
  const { theme } = useTheme();
  // Organization owners should always be able to view users
  const canViewUsers = hasPermission('users.view') || isOrganizationOwner;

  const { data: members, isLoading, error } = useQuery({
    queryKey: ['online-members'],
    queryFn: async () => {
      const response = await api.get('/users', { params: { limit: 50 } });
      const users = response.data.users || [];
      // Filter to show only active users (online status tracking can be added later via WebSockets)
      // Exclude current user from the list
      return users.filter((u: any) => u.id !== currentUser?.id && u.status === 'active');
    },
    enabled: canViewUsers, // Only fetch if user has permission or is organization owner
    retry: false,
  });

  const handleUserClick = async (userId: string, userName?: string) => {
    if (!organization?.id) return;

    try {
      // First check if we already have this chat in our loaded chats
      const existingChat = allChats.find(
        (chat: any) =>
          chat.type === 'direct' &&
          chat.members?.some((m: any) => m.user_id === userId)
      );

      if (existingChat) {
        // Open existing chat with user name - ChatManager will prevent duplicates
        if ((window as any).openChatWindow) {
          (window as any).openChatWindow(existingChat.id, userId, undefined, undefined, userName);
        }
      } else {
        // Try to fetch chats to see if one exists
        const chats = await chatService.getChats(organization.id, { type: 'direct' });
        const foundChat = chats.chats.find(
          (chat: any) =>
            chat.type === 'direct' &&
            chat.members?.some((m: any) => m.user_id === userId)
        );

        if (foundChat) {
          // Open existing chat
          if ((window as any).openChatWindow) {
            (window as any).openChatWindow(foundChat.id, userId, undefined, undefined, userName);
          }
        } else {
          // Create new direct chat
          const newChat = await chatService.createChat(organization.id, {
            type: 'direct',
            member_ids: [userId],
          });
          // Open new chat with user name
          if ((window as any).openChatWindow) {
            (window as any).openChatWindow(newChat.id, userId, undefined, undefined, userName);
          }
        }
      }
    } catch (error: any) {
      // Error toast is already handled by API interceptor
      // No need to show duplicate toast here
    }
  };

  // Get unread count for a user's direct chat
  const getUserUnreadCount = (userId: string) => {
    const chat = allChats.find(
      (c: any) =>
        c.type === 'direct' &&
        c.members?.some((m: any) => m.user_id === userId)
    );
    return chat ? getUnreadCount(chat.id) : 0;
  };

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-2 group"
        style={{ color: theme.colors.textSecondary }}
        onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.text}
        onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textSecondary}
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 transition-colors" />
          <h3 className="text-xs font-semibold uppercase tracking-wide transition-colors">
            Online Now
          </h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 transition-colors" />
        ) : (
          <ChevronDown className="h-4 w-4 transition-colors" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2">
          {!canViewUsers ? (
            <div className="text-xs px-2" style={{ color: theme.colors.textSecondary }}>No permission to view users</div>
          ) : isLoading ? (
            <div className="text-xs px-2" style={{ color: theme.colors.textSecondary }}>Loading...</div>
          ) : error ? (
            <div className="text-xs px-2" style={{ color: '#ed4245' }}>Failed to load users</div>
          ) : members && members.length > 0 ? (
            <>
              {members.map((member: any) => {
                const unreadCount = getUserUnreadCount(member.id);
                return (
                  <button
                    key={member.id}
                    onClick={() => handleUserClick(member.id, `${member.first_name} ${member.last_name}`.trim())}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors group relative"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.border}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div className="relative flex-shrink-0">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={`${member.first_name} ${member.last_name}`}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.colors.primary }}>
                          <span className="text-xs font-semibold text-white">
                            {`${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase()}
                          </span>
                        </div>
                      )}
                      {/* Show green dot for active users (online status tracking can be added later) */}
                      {member.status === 'active' && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#23a55a] border-2" style={{ borderColor: theme.colors.surface }}></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate" style={{ color: theme.colors.text }}>
                        {member.first_name} {member.last_name}
                      </p>
                      {/* Show "Active now" for active users (online status tracking can be added later) */}
                      {member.status === 'active' && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" style={{ color: theme.colors.textSecondary }} />
                          <span className="text-xs" style={{ color: theme.colors.textSecondary }}>Active now</span>
                        </div>
                      )}
                    </div>
                    {/* Show unread count badge */}
                    {unreadCount > 0 && (
                      <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-[#ed4245] text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                        {unreadCount > 999 ? '999+' : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          ) : (
            <div className="text-xs px-2" style={{ color: theme.colors.textSecondary }}>No one online</div>
          )}
        </div>
      )}
    </div>
  );
}

function GroupsSection({
  groups,
  canCreateGroup,
  onCreateGroup,
  onOpenChat,
  getUnreadCount
}: {
  groups: any[];
  canCreateGroup: boolean;
  onCreateGroup: () => void;
  onOpenChat: (chatId: string) => void;
  getUnreadCount: (chatId: string) => number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { theme } = useTheme();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 group flex-1"
          style={{ color: theme.colors.textSecondary }}
          onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.text}
          onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textSecondary}
        >
          <Hash className="h-4 w-4 transition-colors" />
          <h3 className="text-xs font-semibold uppercase tracking-wide transition-colors">
            Groups
          </h3>
        </button>
        {canCreateGroup && (
          <button
            onClick={onCreateGroup}
            className="p-1 rounded transition-colors"
            style={{ color: theme.colors.textSecondary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.colors.text;
              e.currentTarget.style.backgroundColor = theme.colors.border;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.colors.textSecondary;
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Create Group"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 ml-1" style={{ color: theme.colors.textSecondary }} />
        ) : (
          <ChevronDown className="h-4 w-4 ml-1" style={{ color: theme.colors.textSecondary }} />
        )}
      </div>

      {isExpanded && (
        <div className="space-y-1">
          {groups.length === 0 ? (
            <div className="text-xs px-2" style={{ color: theme.colors.textSecondary }}>No groups yet</div>
          ) : (
            groups.map((group) => {
              const unreadCount = getUnreadCount(group.id);
              return (
                <button
                  key={group.id}
                  onClick={() => onOpenChat(group.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors text-left relative"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.border}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Hash className="h-4 w-4 flex-shrink-0" style={{ color: theme.colors.textSecondary }} />
                  <span className="text-sm truncate flex-1" style={{ color: theme.colors.text }}>{group.name || 'Unnamed Group'}</span>
                  {unreadCount > 0 && (
                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-[#ed4245] text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                      {unreadCount > 999 ? '999+' : unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function CreateGroupModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, description?: string, memberIds?: string[]) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const { organization } = useAuthStore();
  const { user: currentUser } = useAuthStore();
  const { theme } = useTheme();

  // Fetch members for group selection
  const { data: membersData } = useQuery({
    queryKey: ['group-members'],
    queryFn: async () => {
      try {
        const response = await api.get('/users', { params: { limit: 100 } });
        return response.data.users || [];
      } catch (error: any) {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!organization?.id,
    retry: false,
  });

  // Include all active members (including current user) - they can choose to include/exclude themselves
  const availableMembers = (membersData || []).filter((m: any) => m.status === 'active');

  // Get creator's name for display
  const creatorName = currentUser
    ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.email || 'You'
    : 'You';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim() || undefined, selectedMembers);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="rounded-lg p-6 max-w-md w-full mx-4" style={{ backgroundColor: theme.colors.surface }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>Create Group</h2>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: theme.colors.textSecondary }}
            onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.text}
            onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textSecondary}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
              Group Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              className="w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 resize-none"
              style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                '--tw-ring-color': theme.colors.primary
              } as any}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter group description"
              rows={2}
              className="w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 resize-none"
              style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                '--tw-ring-color': theme.colors.primary
              } as any}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
              Add Members ({selectedMembers.length} selected)
            </label>
            <div className="mb-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                Creating group as: <span className="font-medium" style={{ color: theme.colors.text }}>{creatorName}</span>
              </p>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg p-2 space-y-1 scrollbar-thin scrollbar-track-transparent" style={{ backgroundColor: theme.colors.background, scrollbarColor: `${theme.colors.border} transparent` }}>
              {availableMembers.length === 0 ? (
                <p className="text-xs px-2 py-2" style={{ color: theme.colors.textSecondary }}>No members available</p>
              ) : (
                availableMembers
                  .filter((member: any) => member.id !== currentUser?.id) // Hide creator from selection
                  .map((member: any) => {
                    const memberName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || 'Unknown';
                    const isSelected = selectedMembers.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMember(member.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors"
                        style={isSelected ? {
                          backgroundColor: theme.colors.primary,
                          color: '#ffffff'
                        } : {
                          color: theme.colors.text
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = theme.colors.background;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.colors.primary }}>
                          <span className="text-xs font-semibold text-white">
                            {`${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm truncate flex-1">
                          {memberName}
                        </span>
                        {isSelected && (
                          <span className="ml-auto text-xs">✓</span>
                        )}
                      </button>
                    );
                  })
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded transition-colors"
              style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.text
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.border}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.background}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: theme.colors.primary,
                color: '#ffffff'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = theme.colors.secondary;
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = theme.colors.primary;
                }
              }}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

