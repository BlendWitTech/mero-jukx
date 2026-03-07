import { Hash, Menu, Sun, Moon, X, Minimize2 } from 'lucide-react';
import React from 'react';

export interface TopHeaderProps {
  title: string;
  theme: {
    colors: {
      surface: string;
      border: string;
      text: string;
      textSecondary: string;
    };
  };
  isDark: boolean;
  onToggleTheme: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  searchComponent?: React.ReactNode;
  notificationsComponent?: React.ReactNode;
  rightSidebarActions?: React.ReactNode; // Close/minimize buttons when right sidebar is available
  showCloseMinimize?: boolean; // Show close/minimize in header when right sidebar is not available
  onClose?: () => void;
  onMinimize?: () => void;
}

export function TopHeader({
  title,
  theme,
  isDark,
  onToggleTheme,
  sidebarCollapsed = false,
  onToggleSidebar,
  searchComponent,
  notificationsComponent,
  rightSidebarActions,
  showCloseMinimize = false,
  onClose,
  onMinimize,
}: TopHeaderProps) {
  return (
    <div
      className="h-12 border-b flex items-center justify-between px-4 flex-shrink-0 transition-colors duration-300"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      }}
    >
      <div className="flex items-center gap-2">
        {sidebarCollapsed && onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
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
            title="Expand sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Hash className="h-5 w-5" style={{ color: theme.colors.textSecondary }} />
        <h1 className="text-base font-semibold" style={{ color: theme.colors.text }}>
          {title}
        </h1>
      </div>
      {/* Center search component */}
      {searchComponent && (
        <div className="flex-1 flex justify-center px-4">
          {searchComponent}
        </div>
      )}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-md transition-all duration-200"
          aria-label="Toggle theme"
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          style={{
            color: theme.colors.textSecondary,
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            opacity: 0.7,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.backgroundColor = theme.colors.border;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.7';
            e.currentTarget.style.backgroundColor = theme.colors.surface;
          }}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {/* Notifications */}
        {notificationsComponent}
        {/* Close and minimize buttons - show when right sidebar is not available */}
        {showCloseMinimize && (
          <>
            {onMinimize && (
              <button
                onClick={onMinimize}
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
            {onClose && (
              <button
                onClick={onClose}
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
          </>
        )}
      </div>
    </div>
  );
}

