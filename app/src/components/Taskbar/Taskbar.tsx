import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import { useTaskbar } from '../../contexts/TaskbarContext';
import {
  Minimize2,
  Maximize2,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  Pin,
  PinOff,
  Users,
  FolderKanban,
  Package,
  FileText,
  BookOpen,
  Calculator,
  Brain,
  UserCheck,
} from 'lucide-react';
import { Button } from '@shared';
import { ConfirmDialog } from '@shared/components/feedback/ConfirmDialog';
import { getActiveAppIds, removeAppSession } from '../../services/appSessionService';
import { redirectToAppSubdomain } from '../../utils/appRouting';

export type TaskbarPosition = 'top' | 'bottom' | 'left' | 'right';
export type TaskbarVisibility = 'always' | 'hover';

interface OpenApp {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  isMinimized: boolean;
  isPinned: boolean;
}

interface TaskbarProps {
  position?: TaskbarPosition;
  visibility?: TaskbarVisibility;
  onAppClick?: (appId: number) => void;
  onAppClose?: (appId: number) => void;
}

export default function Taskbar({
  position = 'bottom',
  visibility: propVisibility,
  onAppClick,
  onAppClose,
}: TaskbarProps) {
  const { theme } = useTheme();

  // Helper to render app icon
  const renderAppIcon = (app: OpenApp) => {
    // Check if icon is a Lucide icon name
    if (app.icon === 'Users' || app.slug === 'mero-crm') return <Users className="w-6 h-6" style={{ color: theme.colors.primary }} />;
    if (app.icon === 'FolderKanban' || app.slug === 'mero-board') return <FolderKanban className="w-6 h-6" style={{ color: theme.colors.primary }} />;
    if (app.icon === 'Package' || app.slug === 'mero-inventory') return <Package className="w-6 h-6" style={{ color: theme.colors.primary }} />;
    if (app.icon === 'FileText' || app.slug === 'mero-cms') return <FileText className="w-6 h-6" style={{ color: theme.colors.primary }} />;
    if (app.icon === 'BookOpen' || app.slug === 'mero-khata') return <BookOpen className="w-6 h-6" style={{ color: theme.colors.primary }} />;
    if (app.icon === 'Calculator' || app.slug === 'mero-accounting') return <Calculator className="w-6 h-6" style={{ color: theme.colors.primary }} />;
    if (app.icon === 'Brain' || app.slug === 'mero-hr') return <Brain className="w-6 h-6" style={{ color: theme.colors.primary }} />;
    if (app.icon === 'UserCheck' || app.slug === 'mero-crm') return <UserCheck className="w-6 h-6" style={{ color: theme.colors.primary }} />;

    return app.icon ? (
      <img src={app.icon} alt={app.name} className="w-6 h-6" />
    ) : (
      <span className="text-sm font-semibold">
        {app.name.charAt(0).toUpperCase()}
      </span>
    );
  };

  const { visibility: contextVisibility } = useTaskbar();
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const [openApps, setOpenApps] = useState<OpenApp[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  // Use context visibility if available, otherwise use prop or default
  const visibility = propVisibility || contextVisibility || 'always';
  const [isVisible, setIsVisible] = useState(visibility === 'always');

  // Update visibility when context changes
  useEffect(() => {
    setIsVisible(visibility === 'always');
  }, [visibility]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [appToClose, setAppToClose] = useState<number | null>(null);

  // Load open apps from localStorage
  useEffect(() => {
    const loadOpenApps = () => {
      const activeAppIds = getActiveAppIds();
      const storedApps = localStorage.getItem('taskbar_apps');
      const apps: OpenApp[] = storedApps ? JSON.parse(storedApps) : [];

      // Filter to only active apps (apps with valid sessions) OR pinned apps
      // Unpinned apps without active sessions should be removed
      const activeApps = apps.filter(app => {
        // Keep pinned apps even if session expired (they're pinned to taskbar)
        // Note: isPinned here refers to taskbar pinned status, not marketplace pinned
        if (app.isPinned) {
          return true;
        }
        // For unpinned apps, only keep if they have an active session
        return activeAppIds.includes(app.id);
      });

      // Update localStorage to remove apps that are no longer active and not pinned
      if (activeApps.length !== apps.length) {
        localStorage.setItem('taskbar_apps', JSON.stringify(activeApps));
      }

      setOpenApps(activeApps);
    };

    loadOpenApps();
    // Refresh every 1 second to update active apps (more frequent for better responsiveness)
    const interval = setInterval(loadOpenApps, 1000);

    // Also listen for storage events to update when apps are closed from other tabs/components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'taskbar_apps' || e.key?.startsWith('app_session_') || e.key?.startsWith('app_activity_')) {
        loadOpenApps();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events when apps are closed
    const handleAppClosed = () => {
      loadOpenApps();
    };
    window.addEventListener('app-closed', handleAppClosed);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('app-closed', handleAppClosed);
    };
  }, []);

  // Handle visibility for hover mode
  useEffect(() => {
    if (visibility === 'hover') {
      setIsVisible(isHovered);
    } else {
      setIsVisible(true);
    }
  }, [visibility, isHovered]);

  const handleAppClick = (app: OpenApp) => {
    if (app.isMinimized) {
      // Restore app
      setOpenApps(prev => prev.map(a =>
        a.id === app.id ? { ...a, isMinimized: false } : a
      ));
    }

    if (onAppClick) {
      onAppClick(app.id);
    } else {
      navigate(`/org/${organization?.slug}/app/${app.slug}`);
    }
  };

  const handleAppClose = (appId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Show confirmation dialog
    setAppToClose(appId);
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    if (appToClose !== null) {
      // Remove app session
      removeAppSession(appToClose);

      // Remove app from taskbar (only if not pinned to taskbar)
      const storedApps = localStorage.getItem('taskbar_apps');
      const apps: OpenApp[] = storedApps ? JSON.parse(storedApps) : [];
      const appToRemove = apps.find(a => a.id === appToClose);

      let updated: OpenApp[];
      if (appToRemove?.isPinned) {
        // If pinned to taskbar, keep it but mark as minimized
        updated = apps.map(a =>
          a.id === appToClose ? { ...a, isMinimized: true } : a
        );
      } else {
        // If not pinned to taskbar, remove completely
        updated = apps.filter(a => a.id !== appToClose);
      }
      localStorage.setItem('taskbar_apps', JSON.stringify(updated));
      setOpenApps(updated);

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('app-closed', { detail: { appId: appToClose } }));

      // Call onAppClose callback if provided
      if (onAppClose) {
        onAppClose(appToClose);
      }

      // Navigate away from app if currently viewing it
      const currentPath = window.location.pathname;
      if (currentPath.includes(`/apps/${appToClose}`) || currentPath.includes(`/app/`)) {
        navigate(`/org/${organization?.slug || ''}`);
      }
    }

    setShowLogoutConfirm(false);
    setAppToClose(null);
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
    setAppToClose(null);
  };

  const handleMinimize = (appId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenApps(prev => {
      const updated = prev.map(a =>
        a.id === appId ? { ...a, isMinimized: true } : a
      );
      localStorage.setItem('taskbar_apps', JSON.stringify(updated));
      return updated;
    });
  };

  const handlePin = (appId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenApps(prev => {
      const updated = prev.map(a =>
        a.id === appId ? { ...a, isPinned: !a.isPinned } : a
      );
      localStorage.setItem('taskbar_apps', JSON.stringify(updated));
      return updated;
    });
  };

  // Separate apps into pinned, open, and minimized
  const pinnedApps = openApps.filter(app => app.isPinned && !app.isMinimized);
  const openAppsList = openApps.filter(app => !app.isPinned && !app.isMinimized);
  const minimizedApps = openApps.filter(app => app.isMinimized);

  const isVertical = position === 'left' || position === 'right';

  if (!isVisible && visibility === 'hover') {
    // Show minimal hover trigger
    return (
      <div
        className={`fixed z-50 transition-all duration-300 ${position === 'top' ? 'top-0 left-0 right-0 h-1' :
          position === 'bottom' ? 'bottom-0 left-0 right-0 h-1' :
            position === 'left' ? 'left-0 top-0 bottom-0 w-1' :
              'right-0 top-0 bottom-0 w-1'
          }`}
        style={{ backgroundColor: theme.colors.primary }}
        onMouseEnter={() => {
          setIsHovered(true);
          setIsVisible(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          if (visibility === 'hover') {
            setIsVisible(false);
          }
        }}
      />
    );
  }

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ${position === 'top' ? 'top-0 left-0 right-0' :
        position === 'bottom' ? 'bottom-0 left-0 right-0' :
          position === 'left' ? 'left-0 top-0 bottom-0' :
            'right-0 top-0 bottom-0'
        }`}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        [position === 'top' ? 'borderBottom' : position === 'bottom' ? 'borderTop' : position === 'left' ? 'borderRight' : 'borderLeft']: `1px solid ${theme.colors.border}`,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        setIsVisible(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (visibility === 'hover') {
          setIsVisible(false);
        }
      }}
    >
      <div
        className={`flex items-center gap-2 p-2 ${isVertical ? 'flex-col h-full' : 'flex-row w-full'
          }`}
      >
        {/* Pinned Apps */}
        {pinnedApps.length > 0 && (
          <>
            {pinnedApps.map((app) => (
              <div
                key={app.id}
                className="relative group"
              >
                <button
                  onClick={() => handleAppClick(app)}
                  className={`flex items-center justify-center rounded-lg transition-all ${isVertical ? 'w-12 h-12' : 'h-12 px-4'
                    }`}
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: '#ffffff'
                  }}
                  title={app.name}
                >
                  {renderAppIcon(app)}
                </button>
                <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handlePin(app.id, e)}
                    className="p-1 rounded-full bg-red-500 text-white"
                    style={{ width: '16px', height: '16px' }}
                  >
                    <PinOff className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            {pinnedApps.length > 0 && (
              <div
                className={`transition-all duration-300 cursor-default ${isVertical ? 'w-full h-px my-1' : 'h-full w-px mx-1'}`}
                style={{
                  backgroundColor: theme.colors.border,
                  opacity: 0.5,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.backgroundColor = theme.colors.primary;
                  if (isVertical) {
                    e.currentTarget.style.height = '2px';
                    e.currentTarget.style.marginTop = '4px';
                    e.currentTarget.style.marginBottom = '4px';
                  } else {
                    e.currentTarget.style.width = '2px';
                    e.currentTarget.style.marginLeft = '4px';
                    e.currentTarget.style.marginRight = '4px';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.5';
                  e.currentTarget.style.backgroundColor = theme.colors.border;
                  if (isVertical) {
                    e.currentTarget.style.height = '1px';
                    e.currentTarget.style.marginTop = '4px';
                    e.currentTarget.style.marginBottom = '4px';
                  } else {
                    e.currentTarget.style.width = '1px';
                    e.currentTarget.style.marginLeft = '4px';
                    e.currentTarget.style.marginRight = '4px';
                  }
                }}
              />
            )}
          </>
        )}

        {/* Open Apps */}
        {openAppsList.map((app) => (
          <div
            key={app.id}
            className="relative group"
          >
            <button
              onClick={() => handleAppClick(app)}
              className={`flex items-center justify-center rounded-lg transition-all hover:opacity-80 ${isVertical ? 'w-12 h-12' : 'h-12 px-4'
                }`}
              style={{
                backgroundColor: theme.colors.background,
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.text
              }}
              title={app.name}
            >
              {renderAppIcon(app)}
            </button>
            <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={(e) => handleMinimize(app.id, e)}
                className="p-1 rounded-full bg-yellow-500 text-white"
                style={{ width: '16px', height: '16px' }}
              >
                <Minimize2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => handlePin(app.id, e)}
                className="p-1 rounded-full bg-blue-500 text-white"
                style={{ width: '16px', height: '16px' }}
              >
                <Pin className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => handleAppClose(app.id, e)}
                className="p-1 rounded-full bg-red-500 text-white"
                style={{ width: '16px', height: '16px' }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Minimized Apps */}
        {minimizedApps.length > 0 && (
          <>
            {openAppsList.length > 0 && (
              <div
                className={`transition-all duration-300 cursor-default ${isVertical ? 'w-full h-px my-1' : 'h-full w-px mx-1'}`}
                style={{
                  backgroundColor: theme.colors.border,
                  opacity: 0.5,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.backgroundColor = theme.colors.primary;
                  if (isVertical) {
                    e.currentTarget.style.height = '2px';
                    e.currentTarget.style.marginTop = '4px';
                    e.currentTarget.style.marginBottom = '4px';
                  } else {
                    e.currentTarget.style.width = '2px';
                    e.currentTarget.style.marginLeft = '4px';
                    e.currentTarget.style.marginRight = '4px';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.5';
                  e.currentTarget.style.backgroundColor = theme.colors.border;
                  if (isVertical) {
                    e.currentTarget.style.height = '1px';
                    e.currentTarget.style.marginTop = '4px';
                    e.currentTarget.style.marginBottom = '4px';
                  } else {
                    e.currentTarget.style.width = '1px';
                    e.currentTarget.style.marginLeft = '4px';
                    e.currentTarget.style.marginRight = '4px';
                  }
                }}
              />
            )}
            {minimizedApps.map((app) => (
              <button
                key={app.id}
                onClick={() => handleAppClick(app)}
                className={`flex items-center justify-center rounded-lg opacity-60 hover:opacity-100 transition-all ${isVertical ? 'w-12 h-12' : 'h-12 px-4'
                  }`}
                style={{
                  backgroundColor: theme.colors.background,
                  border: `1px solid ${theme.colors.border}`,
                  color: theme.colors.text
                }}
                title={app.name}
              >
                {renderAppIcon(app)}
              </button>
            ))}
          </>
        )}

        {/* Settings Button */}
        <div
          className={isVertical ? 'w-full h-px my-1' : 'h-full w-px mx-1'}
          style={{ backgroundColor: theme.colors.border }}
        />
        <Button
          variant="ghost"
          size="sm"
          className={isVertical ? 'w-12 h-12' : 'h-12 px-4'}
          title="Taskbar Settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={handleCancelLogout}
        onConfirm={handleConfirmLogout}
        title="Logout from App"
        message={
          appToClose !== null
            ? `Are you sure you want to logout from "${openApps.find(a => a.id === appToClose)?.name || 'this app'}"? This will remove the app from the taskbar.`
            : 'Are you sure you want to logout from this app?'
        }
        confirmText="Logout"
        cancelText="Cancel"
        variant="warning"
        theme={theme}
      />
    </div>
  );
}

