import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    FileText,
    CreditCard,
    ChevronRight,
    LogOut,
    ChevronLeft,
    FileSpreadsheet,
    Settings,
    CalendarCheck,
    BarChart2,
    Contact,
} from 'lucide-react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useAuthStore } from '@frontend/store/authStore';
import { logoutFromAppBySlug, toast, ConfirmDialog } from '@shared';
import { useAppContext } from '../contexts/AppContext';


interface User {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string | null;
}

interface MeroCrmSidebarProps {
    buildHref: (href: string) => string;
    checkActive: (href: string, currentPath: string) => boolean;
    appSlug: string;
    members?: User[];
}

export default function MeroCrmSidebar({
    buildHref,
    checkActive,
    appSlug,
    members = [],
}: MeroCrmSidebarProps) {
    const { theme } = useTheme();
    const { user, organization } = useAuthStore();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(() => {
        const saved = localStorage.getItem('mero-crm-sidebar-collapsed');
        return saved === 'true';
    });

    // Listen for sidebar toggle events from header
    const { appSlug: contextAppSlug } = useAppContext(); // Ensure we have appSlug
    useEffect(() => {
        const handleSidebarToggle = (e: CustomEvent) => {
            setCollapsed(e.detail.collapsed);
        };
        window.addEventListener('mero-crm-sidebar-toggle', handleSidebarToggle as EventListener);
        return () => window.removeEventListener('mero-crm-sidebar-toggle', handleSidebarToggle as EventListener);
    }, []);

    const navigationItems = [
        {
            name: 'Dashboard',
            href: '/',
            icon: LayoutDashboard,
        },
        {
            name: 'Deals',
            href: '/deals',
            icon: FileText, // Or suitable icon
        },
        {
            name: 'Leads',
            href: '/leads',
            icon: Users, // Or suitable icon, reusing Users for now
        },
        {
            name: 'Clients',
            href: '/clients',
            icon: Users,
        },
        {
            name: 'Contacts',
            href: '/contacts',
            icon: Contact,
        },
        {
            name: 'Activities',
            href: '/activities',
            icon: CalendarCheck,
        },
        {
            name: 'Reports',
            href: '/reports',
            icon: BarChart2,
        },
        {
            name: 'Invoices',
            href: '/invoices',
            icon: FileText,
        },
        {
            name: 'Quotes',
            href: '/quotes',
            icon: FileSpreadsheet,
        },
        {
            name: 'Payments',
            href: '/payments',
            icon: CreditCard,
        },
        {
            name: 'Settings',
            href: '/settings',
            icon: Settings,
        },
    ];

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const handleLogoutAuth = async () => {
        try {
            await logoutFromAppBySlug(appSlug);
            toast.success('Logged out from CRM');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Failed to logout');
        }
        setShowLogoutConfirm(false);
    };

    const isActive = (href: string): boolean => {
        return checkActive(href, location.pathname);
    };

    const toggleCollapsed = () => {
        const newState = !collapsed;
        setCollapsed(newState);
        localStorage.setItem('mero-crm-sidebar-collapsed', newState.toString());
    };

    const sidebarWidth = collapsed ? 72 : 280;

    return (
        <div
            className="flex flex-col h-full transition-all duration-300 border-r flex-shrink-0 overflow-hidden"
            style={{
                width: `${sidebarWidth}px`,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
            }}
        >
            {/* Header - Fixed at top */}
            <div
                className="h-14 px-4 flex items-center justify-between border-b flex-shrink-0"
                style={{ borderColor: theme.colors.border }}
            >
                {!collapsed ? (
                    <>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                                className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: theme.colors.primary }}
                            >
                                <Users className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2
                                    className="text-sm font-semibold truncate"
                                    style={{ color: theme.colors.text }}
                                >
                                    Mero CRM
                                </h2>
                                <p
                                    className="text-xs truncate"
                                    style={{ color: theme.colors.textSecondary }}
                                >
                                    {organization?.name || 'Management'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={toggleCollapsed}
                            className="p-1.5 rounded transition-colors"
                            style={{ color: theme.colors.textSecondary }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = theme.colors.text;
                                e.currentTarget.style.backgroundColor = theme.colors.border;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = theme.colors.textSecondary;
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="Collapse sidebar"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={toggleCollapsed}
                        className="w-full h-full flex items-center justify-center transition-colors"
                        style={{ color: theme.colors.textSecondary }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = theme.colors.text;
                            e.currentTarget.style.backgroundColor = theme.colors.border;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = theme.colors.textSecondary;
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="Expand sidebar"
                    >
                        <Users className="h-5 w-5" style={{ color: theme.colors.primary }} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <nav className={`flex-1 py-2 px-2 space-y-0.5 overflow-x-hidden ${collapsed ? 'overflow-y-hidden' : 'overflow-y-auto scrollbar-thin'}`}>
                    {navigationItems.map((item) => {
                        const href = buildHref(item.href);
                        const Active = isActive(item.href);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.name}
                                to={href}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors group relative ${Active ? '' : ''
                                    }`}
                                style={{
                                    backgroundColor: Active ? theme.colors.primary : 'transparent',
                                    color: Active ? '#fff' : theme.colors.textSecondary,
                                }}
                                onMouseEnter={(e) => {
                                    if (!Active) {
                                        e.currentTarget.style.backgroundColor = theme.colors.border;
                                        e.currentTarget.style.color = theme.colors.text;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!Active) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = theme.colors.textSecondary;
                                    }
                                }}
                            >
                                <Icon className="h-4 w-4 flex-shrink-0" />
                                {!collapsed && (
                                    <span className="truncate">{item.name}</span>
                                )}
                                {collapsed && (
                                    <div
                                        className="absolute left-full ml-2 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50"
                                        style={{
                                            backgroundColor: theme.colors.surface,
                                            color: theme.colors.text,
                                            border: `1px solid ${theme.colors.border}`,
                                        }}
                                    >
                                        {item.name}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Members Section */}
                {!collapsed && members && members.length > 0 && (
                    <div className="px-2 mb-2 mt-auto flex-shrink-0">
                        <div className="h-[1px] mb-2" style={{ backgroundColor: theme.colors.border }} />
                        <div className="px-3 py-1.5 mb-1">
                            <h3
                                className="text-xs font-semibold uppercase tracking-wide"
                                style={{ color: theme.colors.textSecondary }}
                            >
                                Members ({members.length})
                            </h3>
                        </div>
                        <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin" style={{ scrollbarColor: `${theme.colors.border} transparent` }}>
                            {members.slice(0, 8).map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded text-sm"
                                    style={{ color: theme.colors.textSecondary }}
                                >
                                    {member.avatar_url ? (
                                        <img
                                            src={member.avatar_url}
                                            alt={`${member.first_name} ${member.last_name}`}
                                            className="w-6 h-6 rounded-full flex-shrink-0"
                                        />
                                    ) : (
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                                            style={{
                                                backgroundColor: theme.colors.primary,
                                                color: 'white',
                                            }}
                                        >
                                            {member.first_name[0]}{member.last_name[0]}
                                        </div>
                                    )}
                                    <span className="truncate text-xs">
                                        {member.first_name} {member.last_name}
                                    </span>
                                </div>
                            ))}
                            {members.length > 8 && (
                                <div className="px-3 py-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                                    +{members.length - 8} more
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-auto border-t flex-shrink-0" style={{ borderColor: theme.colors.border }}>
                {!collapsed ? (
                    <div className="px-2 py-2">
                        <div
                            className="flex items-center gap-2 px-2 py-1.5 rounded transition-colors"
                            style={{ backgroundColor: theme.colors.surface }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.colors.border;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = theme.colors.surface;
                            }}
                        >
                            <div
                                className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: theme.colors.primary }}
                            >
                                <span className="text-xs font-semibold text-white uppercase">
                                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p
                                    className="text-sm font-medium truncate"
                                    style={{ color: theme.colors.text }}
                                >
                                    {user?.first_name} {user?.last_name}
                                </p>
                                <p
                                    className="text-xs truncate"
                                    style={{ color: theme.colors.textSecondary }}
                                >
                                    {user?.email}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowLogoutConfirm(true)}
                                className="p-1.5 rounded transition-colors"
                                style={{ color: theme.colors.textSecondary }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#ed4245';
                                    e.currentTarget.style.backgroundColor = theme.colors.border;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = theme.colors.textSecondary;
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                title="Logout from app"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="py-2 px-2 flex justify-center">
                        <button
                            onClick={() => setShowLogoutConfirm(true)}
                            className="w-full flex items-center justify-center p-2 rounded transition-colors"
                            style={{ color: theme.colors.textSecondary }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ed4245';
                                e.currentTarget.style.backgroundColor = theme.colors.border;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = theme.colors.textSecondary;
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="Logout"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogoutAuth}
                title="Logout"
                message="Are you sure you want to logout? You will need to login again to access your account."
                confirmText="Logout"
                cancelText="Cancel"
                variant="warning"
                theme={theme}
            />
        </div>
    );
}
