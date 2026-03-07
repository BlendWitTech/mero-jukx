import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    TrendingUp,
    TrendingDown,
    FileText,
    Receipt,
    BarChart3,
    Percent,
    Settings,
    ChevronLeft,
    LogOut,
    BookOpen,
    Users,
    Landmark,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import { logoutFromAppBySlug } from '@shared/frontend/utils/appAuth';
import toast from '@shared/frontend/hooks/useToast';
import { ConfirmDialog } from '@shared/frontend/components/feedback/ConfirmDialog';

interface MeroKhataSidebarProps {
    appSlug: string;
    collapsed: boolean;
    onToggle: () => void;
    buildHref: (href: string) => string;
    checkActive: (href: string, currentPath: string) => boolean;
}

export default function MeroKhataSidebar({
    appSlug,
    collapsed,
    onToggle,
    buildHref,
    checkActive,
}: MeroKhataSidebarProps) {
    const { theme } = useTheme();
    const { user, organization } = useAuthStore();
    const location = useLocation();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const navigationItems = [
        {
            name: 'Dashboard',
            href: '/',
            icon: LayoutDashboard,
        },
        {
            name: 'Customers',
            href: '/customers',
            icon: Users,
        },
        {
            name: 'Income',
            href: '/income',
            icon: TrendingUp,
        },
        {
            name: 'Expenses',
            href: '/expenses',
            icon: TrendingDown,
        },
        {
            name: 'Invoices',
            href: '/invoices',
            icon: FileText,
        },
        {
            name: 'Bills',
            href: '/bills',
            icon: Receipt,
        },
        {
            name: 'VAT Summary',
            href: '/vat',
            icon: Percent,
        },
        {
            name: 'Bank Reconciliation',
            href: '/bank-reconciliation',
            icon: Landmark,
        },
        {
            name: 'Reports',
            href: '/reports',
            icon: BarChart3,
        },
        {
            name: 'Settings',
            href: '/settings',
            icon: Settings,
        },
    ];

    const handleLogoutAuth = async () => {
        try {
            await logoutFromAppBySlug(appSlug);
            toast.success('Logged out from Mero Khata');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Failed to logout');
        }
        setShowLogoutConfirm(false);
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
            {/* Header */}
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
                                <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2
                                    className="text-sm font-extrabold truncate"
                                    style={{ color: theme.colors.text }}
                                >
                                    Mero Khata
                                </h2>
                                <p
                                    className="text-xs font-bold truncate"
                                    style={{ color: theme.colors.textSecondary }}
                                >
                                    {organization?.name || 'Ledger'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onToggle}
                            className="p-1.5 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: theme.colors.textSecondary }}
                            title="Collapse sidebar"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={onToggle}
                        className="w-full h-full flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ color: theme.colors.textSecondary }}
                        title="Expand sidebar"
                    >
                        <BookOpen className="h-5 w-5" style={{ color: theme.colors.primary }} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <nav className={`flex-1 py-2 px-2 space-y-0.5 overflow-x-hidden ${collapsed ? 'overflow-y-hidden' : 'overflow-y-auto scrollbar-thin'}`}>
                    {navigationItems.map((item) => {
                        const href = buildHref(item.href);
                        const Active = checkActive(item.href, location.pathname);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.name}
                                to={href}
                                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors group relative"
                                style={{
                                    backgroundColor: Active ? theme.colors.primary : 'transparent',
                                    color: Active ? '#fff' : theme.colors.textSecondary,
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
            </div>

            {/* Footer */}
            <div className="mt-auto border-t flex-shrink-0" style={{ borderColor: theme.colors.border }}>
                {!collapsed ? (
                    <div className="px-2 py-2">
                        <div
                            className="flex items-center gap-2 px-2 py-1.5 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                            style={{ backgroundColor: theme.colors.surface }}
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
