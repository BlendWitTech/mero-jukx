import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import { isAppSubdomain } from '@/config/urlConfig';
import MeroKhataSidebar from '../components/MeroKhataSidebar';

export default function MeroKhataLayout() {
    const { theme } = useTheme();
    const { organization } = useAuthStore();
    const location = useLocation();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('mero-khata-sidebar-collapsed');
        return saved === 'true';
    });

    useEffect(() => {
        const handleSidebarToggle = (e: CustomEvent) => {
            setSidebarCollapsed(e.detail.collapsed);
        };
        window.addEventListener('mero-khata-sidebar-toggle', handleSidebarToggle as EventListener);
        return () => window.removeEventListener('mero-khata-sidebar-toggle', handleSidebarToggle as EventListener);
    }, []);

    const toggleCollapsed = () => {
        const newState = !sidebarCollapsed;
        setSidebarCollapsed(newState);
        localStorage.setItem('mero-khata-sidebar-collapsed', String(newState));
        window.dispatchEvent(new CustomEvent('mero-khata-sidebar-toggle', { detail: { collapsed: newState } }));
    };

    const isSubdomainRoute = isAppSubdomain();

    const checkActive = (href: string, currentPath: string): boolean => {
        let appPath: string;

        if (isSubdomainRoute) {
            const orgMatch = currentPath.match(/^\/org\/[^/]+(.*)$/);
            appPath = orgMatch ? orgMatch[1] || '/' : currentPath;
        } else {
            const appBase = `/app/mero-khata`;
            const orgAppBase = `/org/${organization?.slug}/app/mero-khata`;

            if (currentPath.startsWith(orgAppBase)) {
                appPath = currentPath.split(orgAppBase)[1] || '/';
            } else if (currentPath.startsWith(appBase)) {
                appPath = currentPath.split(appBase)[1] || '/';
            } else {
                appPath = currentPath;
            }
        }

        if (href === '' || href === '/') {
            return appPath === '' || appPath === '/' || appPath === '';
        }
        return appPath.startsWith(href);
    };

    const buildHref = (href: string): string => {
        if (isSubdomainRoute) {
            const currentPath = location.pathname;
            let basePath = '/';
            const orgMatch = currentPath.match(/^(\/org\/[^/]+)/);
            if (orgMatch) {
                basePath = orgMatch[1];
            } else if (organization?.slug) {
                basePath = `/org/${organization.slug}`;
            }
            return `${basePath}${href.startsWith('/') ? href : `/${href}`}`;
        } else {
            const base = `/org/${organization?.slug}/app/mero-khata`;
            if (!href || href === '' || href === '/') return base;
            return `${base}${href.startsWith('/') ? href : `/${href}`}`;
        }
    };

    return (
        <div className="flex h-full w-full overflow-hidden" style={{ backgroundColor: theme.colors.background }}>
            <MeroKhataSidebar
                appSlug="mero-khata"
                collapsed={sidebarCollapsed}
                onToggle={toggleCollapsed}
                buildHref={buildHref}
                checkActive={checkActive}
            />

            <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent border-l" style={{ borderColor: theme.colors.border }}>
                <Outlet />
            </main>
        </div>
    );
}
