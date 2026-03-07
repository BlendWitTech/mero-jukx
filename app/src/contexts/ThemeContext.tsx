import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { ThemeMode, ThemeColors, OrganizationTheme } from '../types/theme';

interface ThemeContextType {
  theme: OrganizationTheme;
  setTheme: (theme: Partial<OrganizationTheme>) => Promise<void>;
  isDark: boolean;
  toggleTheme: () => void;
}

const defaultLightTheme: OrganizationTheme = {
  mode: 'light',
  colors: {
    primary: '#5865f2',
    secondary: '#4752c4',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#1a1c20',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    accent: '#5865f2',
    danger: '#ef4444',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    success: '#10b981',
  },
  fontFamily: 'Inter, system-ui, sans-serif',
  borderRadius: '0.5rem',
};

const defaultDarkTheme: OrganizationTheme = {
  mode: 'dark',
  colors: {
    primary: '#5865f2',
    secondary: '#4752c4',
    background: '#36393f',
    surface: '#2f3136',
    text: '#ffffff',
    textSecondary: '#b9bbbe',
    border: '#202225',
    accent: '#5865f2',
    danger: '#f87171',
    error: '#f87171',
    warning: '#fbbf24',
    info: '#60a5fa',
    success: '#34d399',
  },
  fontFamily: 'Inter, system-ui, sans-serif',
  borderRadius: '0.5rem',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Use getState() + subscribe instead of the useAuthStore() hook to avoid
  // Zustand's useSyncExternalStore depending on stale-cached React dispatcher
  const [authState, setAuthState] = useState(() => useAuthStore.getState());
  useEffect(() => {
    // Subscribe to auth store changes without using the hook
    const unsubscribe = useAuthStore.subscribe((state) => {
      setAuthState(state);
    });
    return unsubscribe;
  }, []);
  const { isAuthenticated, user } = authState;
  // Initialize with theme from localStorage or default
  const [theme, setThemeState] = useState<OrganizationTheme>(() => {
    // Check localStorage for theme preference first
    const storedMode = localStorage.getItem('theme-mode') as ThemeMode | null;
    const storedColors = localStorage.getItem('theme-colors');

    let baseTheme = defaultDarkTheme;
    if (storedMode === 'light') {
      baseTheme = defaultLightTheme;
    } else if (storedMode === 'system') {
      const systemPref = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      baseTheme = systemPref === 'dark' ? defaultDarkTheme : defaultLightTheme;
    }

    // Try to load custom colors if available
    let colors = baseTheme.colors;
    if (storedColors) {
      try {
        colors = JSON.parse(storedColors);
      } catch (e) {
        // Invalid JSON, use base theme colors
      }
    }

    return {
      ...baseTheme,
      mode: storedMode || 'dark',
      colors,
    };
  });
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  // Listen to system theme changes (only update if mode is 'system')
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newSystemPref = e.matches ? 'dark' : 'light';
      setSystemPreference(newSystemPref);
      // Only update theme if current mode is 'system'
      setThemeState((currentTheme) => {
        if (currentTheme.mode === 'system') {
          const newIsDark = newSystemPref === 'dark';
          const baseTheme = newIsDark ? defaultDarkTheme : defaultLightTheme;
          return {
            ...currentTheme,
            colors: {
              ...baseTheme.colors,
              // Preserve custom primary/secondary colors
              primary: currentTheme.colors.primary,
              secondary: currentTheme.colors.secondary,
              accent: currentTheme.colors.accent,
            },
          };
        }
        return currentTheme;
      });
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []); // Only set up listener once

  // Determine if we should use dark theme
  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && systemPreference === 'dark');

  // Load user theme preferences (only on mount or when user changes)
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Always load from localStorage first to preserve user customizations
      const userModeKey = `user-${user.id}-theme-mode`;
      const userColorsKey = `user-${user.id}-theme-colors`;
      const userCssKey = `user-${user.id}-theme-css`;

      const userStoredMode = localStorage.getItem(userModeKey) as ThemeMode | null;
      const globalStoredMode = localStorage.getItem('theme-mode') as ThemeMode | null;
      const themeMode = userStoredMode || globalStoredMode || 'dark';
      const effectiveDark = themeMode === 'dark' || (themeMode === 'system' && systemPreference === 'dark');
      const baseTheme = effectiveDark ? defaultDarkTheme : defaultLightTheme;

      // Try to load custom colors from localStorage (user-specific first, then global)
      const userStoredColors = localStorage.getItem(userColorsKey);
      const globalStoredColors = localStorage.getItem('theme-colors');
      const storedColors = userStoredColors || globalStoredColors;

      let colors = baseTheme.colors;
      if (storedColors) {
        try {
          colors = JSON.parse(storedColors);
        } catch (e) {
          // Invalid JSON, use base theme
        }
      }

      // Load custom CSS
      const userStoredCss = localStorage.getItem(userCssKey);
      const globalStoredCss = localStorage.getItem('theme-css');
      const storedCss = userStoredCss || globalStoredCss;

      // Set theme immediately from localStorage - this preserves user customizations
      const initialTheme: OrganizationTheme = {
        mode: themeMode,
        colors,
        fontFamily: baseTheme.fontFamily,
        borderRadius: baseTheme.borderRadius,
        customCSS: storedCss || undefined,
      };
      setThemeState(initialTheme);

      // Then load user theme data from API in background (for syncing with server)
      loadUserTheme();
    } else {
      // Use stored preference or system preference for unauthenticated users
      const storedMode = localStorage.getItem('theme-mode') as ThemeMode | null;
      const storedColors = localStorage.getItem('theme-colors');
      let colors = defaultDarkTheme.colors;
      if (storedMode === 'light') {
        colors = defaultLightTheme.colors;
      } else if (storedMode === 'system') {
        const systemTheme = systemPreference === 'dark' ? defaultDarkTheme : defaultLightTheme;
        colors = systemTheme.colors;
      }

      // Use stored colors if available
      if (storedColors) {
        try {
          colors = JSON.parse(storedColors);
        } catch (e) {
          // Invalid JSON, use default
        }
      }

      if (storedMode === 'light') {
        setThemeState({ ...defaultLightTheme, colors });
      } else if (storedMode === 'system') {
        const systemTheme = systemPreference === 'dark' ? defaultDarkTheme : defaultLightTheme;
        setThemeState({ ...systemTheme, colors });
      } else {
        setThemeState({ ...defaultDarkTheme, colors });
      }
    }
    // Only run when user or authentication changes, not on systemPreference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAuthenticated]);


  const loadUserTheme = async () => {
    try {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser?.id) {
        // No user, use global localStorage
        const storedMode = localStorage.getItem('theme-mode') as ThemeMode | null;
        const storedColors = localStorage.getItem('theme-colors');
        const storedCss = localStorage.getItem('theme-css');
        const themeMode = storedMode || 'dark';
        const effectiveDark = themeMode === 'dark' || (themeMode === 'system' && systemPreference === 'dark');
        const baseTheme = effectiveDark ? defaultDarkTheme : defaultLightTheme;

        let colors = baseTheme.colors;
        if (storedColors) {
          try {
            colors = JSON.parse(storedColors);
          } catch (e) {
            // Invalid JSON, use base theme
          }
        }

        setThemeState({
          mode: themeMode,
          colors,
          fontFamily: baseTheme.fontFamily,
          borderRadius: baseTheme.borderRadius,
          customCSS: storedCss || undefined,
        });
        return;
      }

      // Try to load user theme preferences from API
      try {
        const response = await api.get('/users/me');
        const userData = response.data;

        if (userData.theme_preferences) {
          const prefs = userData.theme_preferences;
          const themeMode = prefs.mode || 'dark';
          const effectiveDark = themeMode === 'dark' || (themeMode === 'system' && systemPreference === 'dark');
          const baseTheme = effectiveDark ? defaultDarkTheme : defaultLightTheme;

          setThemeState({
            mode: themeMode,
            colors: prefs.colors || baseTheme.colors,
            fontFamily: baseTheme.fontFamily,
            borderRadius: baseTheme.borderRadius,
            customCSS: prefs.custom_css || undefined,
          });
          return;
        }
      } catch (apiError) {
        // API might not have theme preferences yet, continue with localStorage
      }

      // Fallback to localStorage (per-user)
      const userModeKey = `user-${currentUser.id}-theme-mode`;
      const userColorsKey = `user-${currentUser.id}-theme-colors`;
      const userCssKey = `user-${currentUser.id}-theme-css`;

      const storedMode = localStorage.getItem(userModeKey) || localStorage.getItem('theme-mode') as ThemeMode | null;
      const storedColors = localStorage.getItem(userColorsKey) || localStorage.getItem('theme-colors');
      const storedCss = localStorage.getItem(userCssKey) || localStorage.getItem('theme-css');

      const themeMode = storedMode || 'dark';
      const effectiveDark = themeMode === 'dark' || (themeMode === 'system' && systemPreference === 'dark');
      const baseTheme = effectiveDark ? defaultDarkTheme : defaultLightTheme;

      let colors = baseTheme.colors;
      if (storedColors) {
        try {
          colors = JSON.parse(storedColors);
        } catch (e) {
          // Invalid JSON, use base theme
        }
      }

      setThemeState({
        mode: themeMode as ThemeMode,
        colors,
        fontFamily: baseTheme.fontFamily,
        borderRadius: baseTheme.borderRadius,
        customCSS: storedCss || undefined,
      });
    } catch (error) {
      console.error('Failed to load user theme:', error);
      // Fallback to stored preference or default to dark
      const storedMode = localStorage.getItem('theme-mode') as ThemeMode | null;
      const storedColors = localStorage.getItem('theme-colors');
      const storedCss = localStorage.getItem('theme-css');
      let colors = defaultDarkTheme.colors;
      if (storedMode === 'light') {
        colors = defaultLightTheme.colors;
      } else if (storedMode === 'system') {
        const systemTheme = systemPreference === 'dark' ? defaultDarkTheme : defaultLightTheme;
        colors = systemTheme.colors;
      }

      // Use stored colors if available
      if (storedColors) {
        try {
          colors = JSON.parse(storedColors);
        } catch (e) {
          // Invalid JSON, use default
        }
      }

      if (storedMode === 'light') {
        setThemeState({ ...defaultLightTheme, colors, customCSS: storedCss || undefined });
      } else if (storedMode === 'system') {
        const systemTheme = systemPreference === 'dark' ? defaultDarkTheme : defaultLightTheme;
        setThemeState({ ...systemTheme, colors, customCSS: storedCss || undefined });
      } else {
        setThemeState({ ...defaultDarkTheme, colors, customCSS: storedCss || undefined });
      }
    }
  };

  const setTheme = async (newTheme: Partial<OrganizationTheme>) => {
    // If mode is changing, update colors based on the new mode
    let updatedTheme = { ...theme };

    if (newTheme.mode !== undefined) {
      // Before switching modes, save current colors for the current mode (if not system)
      // This ensures we preserve colors when switching away from a mode
      if (theme.mode !== 'system' && theme.mode !== newTheme.mode) {
        const modeKey = `theme-colors-${theme.mode}`;
        if (isAuthenticated && user?.id) {
          localStorage.setItem(`user-${user.id}-${modeKey}`, JSON.stringify(theme.colors));
        }
        localStorage.setItem(modeKey, JSON.stringify(theme.colors));
      }

      // Also save colors when switching TO system mode (so we know what to restore)
      if (newTheme.mode === 'system' && theme.mode !== 'system') {
        const modeKey = `theme-colors-${theme.mode}`;
        if (isAuthenticated && user?.id) {
          localStorage.setItem(`user-${user.id}-${modeKey}`, JSON.stringify(theme.colors));
        }
        localStorage.setItem(modeKey, JSON.stringify(theme.colors));
      }

      const newIsDark = newTheme.mode === 'dark' || (newTheme.mode === 'system' && systemPreference === 'dark');
      const baseTheme = newIsDark ? defaultDarkTheme : defaultLightTheme;

      // Check if there's a selected color family that should be applied
      const selectedColorFamily = localStorage.getItem('selected-color-family');
      let colorsToApply = baseTheme.colors;

      // First, try to restore saved colors for this specific mode (light or dark)
      if (newTheme.mode !== 'system' && !newTheme.colors) {
        const modeKey = `theme-colors-${newTheme.mode}`;
        const userModeKey = isAuthenticated && user?.id ? `user-${user.id}-${modeKey}` : null;
        const savedColors = userModeKey ? localStorage.getItem(userModeKey) : null;
        const globalSavedColors = savedColors || localStorage.getItem(modeKey);

        if (globalSavedColors) {
          try {
            colorsToApply = JSON.parse(globalSavedColors);
          } catch (e) {
            // Invalid JSON, fall through to preset or default
          }
        }
      }

      // If no saved colors were found and there's a selected color family, apply preset
      // Check if colorsToApply is still the default (by comparing primary color)
      const isStillDefault = colorsToApply.primary === baseTheme.colors.primary &&
        colorsToApply.background === baseTheme.colors.background;
      if (selectedColorFamily && !newTheme.colors && isStillDefault) {
        // Define preset theme groups (same as in SettingsPage and toggleTheme)
        const presetThemeGroups = [
          {
            key: 'default',
            themes: [
              { mode: 'dark' as const, colors: { primary: '#5865f2', secondary: '#4752c4', background: '#36393f', surface: '#2f3136', text: '#ffffff', textSecondary: '#b9bbbe', border: '#202225', accent: '#5865f2', danger: '#f87171', error: '#f87171', warning: '#fbbf24', info: '#60a5fa', success: '#34d399' } },
              { mode: 'light' as const, colors: { primary: '#5865f2', secondary: '#4752c4', background: '#ffffff', surface: '#f8f9fa', text: '#1a1c20', textSecondary: '#6b7280', border: '#e5e7eb', accent: '#5865f2', danger: '#ef4444', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6', success: '#10b981' } },
            ]
          },
          {
            key: 'ocean-blue',
            themes: [
              { mode: 'dark' as const, colors: { primary: '#0ea5e9', secondary: '#0284c7', background: '#0f172a', surface: '#1e293b', text: '#f1f5f9', textSecondary: '#94a3b8', border: '#334155', accent: '#0ea5e9', danger: '#f87171', error: '#f87171', warning: '#fbbf24', info: '#60a5fa', success: '#34d399' } },
              { mode: 'light' as const, colors: { primary: '#0ea5e9', secondary: '#0284c7', background: '#f0f9ff', surface: '#e0f2fe', text: '#0c4a6e', textSecondary: '#075985', border: '#bae6fd', accent: '#0ea5e9', danger: '#ef4444', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6', success: '#10b981' } },
            ]
          },
          {
            key: 'forest-green',
            themes: [
              { mode: 'dark' as const, colors: { primary: '#10b981', secondary: '#059669', background: '#064e3b', surface: '#065f46', text: '#d1fae5', textSecondary: '#6ee7b7', border: '#047857', accent: '#10b981', danger: '#f87171', error: '#f87171', warning: '#fbbf24', info: '#60a5fa', success: '#34d399' } },
              { mode: 'light' as const, colors: { primary: '#10b981', secondary: '#059669', background: '#ecfdf5', surface: '#d1fae5', text: '#065f46', textSecondary: '#047857', border: '#a7f3d0', accent: '#10b981', danger: '#ef4444', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6', success: '#10b981' } },
            ]
          },
          {
            key: 'sunset-orange',
            themes: [
              { mode: 'dark' as const, colors: { primary: '#f97316', secondary: '#ea580c', background: '#431407', surface: '#7c2d12', text: '#fed7aa', textSecondary: '#fdba74', border: '#c2410c', accent: '#f97316', danger: '#f87171', error: '#f87171', warning: '#fbbf24', info: '#60a5fa', success: '#34d399' } },
              { mode: 'light' as const, colors: { primary: '#f97316', secondary: '#ea580c', background: '#fff7ed', surface: '#ffedd5', text: '#9a3412', textSecondary: '#c2410c', border: '#ffd4a3', accent: '#f97316', danger: '#ef4444', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6', success: '#10b981' } },
            ]
          },
          {
            key: 'royal-purple',
            themes: [
              { mode: 'dark' as const, colors: { primary: '#a855f7', secondary: '#9333ea', background: '#3b0764', surface: '#581c87', text: '#e9d5ff', textSecondary: '#c084fc', border: '#9333ea', accent: '#a855f7', danger: '#f87171', error: '#f87171', warning: '#fbbf24', info: '#60a5fa', success: '#34d399' } },
              { mode: 'light' as const, colors: { primary: '#a855f7', secondary: '#9333ea', background: '#faf5ff', surface: '#f3e8ff', text: '#6b21a8', textSecondary: '#9333ea', border: '#d8b4fe', accent: '#a855f7', danger: '#ef4444', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6', success: '#10b981' } },
            ]
          },
        ];

        // Find the color family
        const family = presetThemeGroups.find(g => g.key === selectedColorFamily);
        if (family) {
          // Find the theme variant that matches the new mode
          let matchingTheme: { mode: 'light' | 'dark' | 'system'; colors: ThemeColors } | undefined;
          if (newTheme.mode === 'system') {
            // For system mode, match based on current system preference
            const systemPrefersDark = systemPreference === 'dark';
            matchingTheme = family.themes.find(t =>
              (systemPrefersDark && t.mode === 'dark') || (!systemPrefersDark && t.mode === 'light')
            );
          } else {
            // For light or dark mode, find exact match
            matchingTheme = family.themes.find(t => t.mode === newTheme.mode);
          }

          if (matchingTheme) {
            colorsToApply = matchingTheme.colors as ThemeColors;
          }
        }
      }

      // Merge new theme with base theme colors if colors aren't explicitly provided
      updatedTheme = {
        ...theme,
        mode: newTheme.mode,
        colors: newTheme.colors ? {
          ...baseTheme.colors,
          ...newTheme.colors,
        } : colorsToApply,
        ...newTheme,
      };
    } else if (newTheme.colors) {
      // If only colors are being updated, merge with existing theme
      updatedTheme = {
        ...theme,
        colors: {
          ...theme.colors,
          ...newTheme.colors,
        },
        ...newTheme,
      };
    } else {
      updatedTheme = { ...theme, ...newTheme };
    }

    setThemeState(updatedTheme);

    // Always save theme mode and colors to localStorage immediately (before API call)
    // Store per-user for personal theme preferences
    if (newTheme.mode !== undefined) {
      // Save colors for the specific mode (light or dark) so they can be restored later
      if (newTheme.mode !== 'system') {
        const modeKey = `theme-colors-${newTheme.mode}`;
        if (isAuthenticated && user?.id) {
          localStorage.setItem(`user-${user.id}-${modeKey}`, JSON.stringify(updatedTheme.colors));
        }
        localStorage.setItem(modeKey, JSON.stringify(updatedTheme.colors));
      }

      if (isAuthenticated && user?.id) {
        localStorage.setItem(`user-${user.id}-theme-mode`, newTheme.mode);
        // Save full color palette to localStorage per user (for current mode)
        localStorage.setItem(`user-${user.id}-theme-colors`, JSON.stringify(updatedTheme.colors));
        localStorage.setItem(`user-${user.id}-theme-css`, updatedTheme.customCSS || '');
      }
      // Also save globally as fallback
      localStorage.setItem('theme-mode', newTheme.mode);
      localStorage.setItem('theme-colors', JSON.stringify(updatedTheme.colors));
      if (updatedTheme.customCSS) {
        localStorage.setItem('theme-css', updatedTheme.customCSS);
      }
    } else if (newTheme.colors) {
      // When colors are updated without mode change, save them for the current mode
      if (theme.mode !== 'system') {
        const modeKey = `theme-colors-${theme.mode}`;
        if (isAuthenticated && user?.id) {
          localStorage.setItem(`user-${user.id}-${modeKey}`, JSON.stringify(updatedTheme.colors));
        }
        localStorage.setItem(modeKey, JSON.stringify(updatedTheme.colors));
      }
      // If only colors changed, save them
      if (isAuthenticated && user?.id) {
        localStorage.setItem(`user-${user.id}-theme-colors`, JSON.stringify(updatedTheme.colors));
      }
      localStorage.setItem('theme-colors', JSON.stringify(updatedTheme.colors));
    } else if (newTheme.customCSS !== undefined) {
      // If only custom CSS changed
      if (isAuthenticated && user?.id) {
        localStorage.setItem(`user-${user.id}-theme-css`, newTheme.customCSS || '');
      }
      if (newTheme.customCSS) {
        localStorage.setItem('theme-css', newTheme.customCSS);
      } else {
        localStorage.removeItem('theme-css');
        if (isAuthenticated && user?.id) {
          localStorage.removeItem(`user-${user.id}-theme-css`);
        }
      }
    }

    // Save to user profile if authenticated (per-user theme)
    if (isAuthenticated && user?.id) {
      try {
        // Save theme preferences to user profile
        await api.patch('/users/me', {
          theme_preferences: {
            mode: updatedTheme.mode,
            colors: updatedTheme.colors,
            custom_css: updatedTheme.customCSS,
          },
        });
      } catch (error: any) {
        // Silently handle 404/403 errors - endpoint might not support theme updates yet
        // Only log unexpected errors in development
        if (error?.response?.status !== 404 && error?.response?.status !== 403) {
          if (import.meta.env.MODE === 'development') {
            console.warn('Failed to save theme:', error?.response?.status || error?.message);
          }
        }
        // Theme is still applied locally via localStorage, so it's not a critical error
      }
    }
  };

  const toggleTheme = () => {
    // Check if a color family is selected
    const selectedColorFamily = localStorage.getItem('selected-color-family');

    if (selectedColorFamily) {
      // Define preset theme groups (same as in SettingsPage)
      const presetThemeGroups = [
        {
          key: 'default',
          themes: [
            { mode: 'dark' as const, colors: { primary: '#5865f2', secondary: '#4752c4', background: '#36393f', surface: '#2f3136', text: '#ffffff', textSecondary: '#b9bbbe', border: '#202225', accent: '#5865f2', danger: '#f87171', error: '#f87171', warning: '#fbbf24', info: '#60a5fa' } },
            { mode: 'light' as const, colors: { primary: '#5865f2', secondary: '#4752c4', background: '#ffffff', surface: '#f8f9fa', text: '#1a1c20', textSecondary: '#6b7280', border: '#e5e7eb', accent: '#5865f2', danger: '#ef4444', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' } },
          ]
        },
        {
          key: 'ocean-blue',
          themes: [
            { mode: 'dark' as const, colors: { primary: '#0ea5e9', secondary: '#0284c7', background: '#0f172a', surface: '#1e293b', text: '#f1f5f9', textSecondary: '#94a3b8', border: '#334155', accent: '#0ea5e9', danger: '#f87171', error: '#f87171', warning: '#fbbf24', info: '#60a5fa' } },
            { mode: 'light' as const, colors: { primary: '#0ea5e9', secondary: '#0284c7', background: '#f0f9ff', surface: '#e0f2fe', text: '#0c4a6e', textSecondary: '#075985', border: '#bae6fd', accent: '#0ea5e9', danger: '#ef4444', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' } },
          ]
        },
        {
          key: 'forest-green',
          themes: [
            { mode: 'dark' as const, colors: { primary: '#10b981', secondary: '#059669', background: '#064e3b', surface: '#065f46', text: '#d1fae5', textSecondary: '#6ee7b7', border: '#047857', accent: '#10b981', danger: '#f87171', error: '#f87171', warning: '#fbbf24', info: '#60a5fa' } },
            { mode: 'light' as const, colors: { primary: '#10b981', secondary: '#059669', background: '#ecfdf5', surface: '#d1fae5', text: '#065f46', textSecondary: '#047857', border: '#a7f3d0', accent: '#10b981', danger: '#ef4444', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' } },
          ]
        },
        {
          key: 'sunset-orange',
          themes: [
            { mode: 'dark' as const, colors: { primary: '#f97316', secondary: '#ea580c', background: '#431407', surface: '#7c2d12', text: '#fed7aa', textSecondary: '#fdba74', border: '#c2410c', accent: '#f97316', danger: '#f87171', error: '#f87171', warning: '#fbbf24', info: '#60a5fa' } },
            { mode: 'light' as const, colors: { primary: '#f97316', secondary: '#ea580c', background: '#fff7ed', surface: '#ffedd5', text: '#9a3412', textSecondary: '#c2410c', border: '#ffd4a3', accent: '#f97316', danger: '#ef4444', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' } },
          ]
        },
        {
          key: 'royal-purple',
          themes: [
            { mode: 'dark' as const, colors: { primary: '#a855f7', secondary: '#9333ea', background: '#3b0764', surface: '#581c87', text: '#e9d5ff', textSecondary: '#c084fc', border: '#9333ea', accent: '#a855f7', danger: '#f87171', error: '#f87171', warning: '#fbbf24', info: '#60a5fa' } },
            { mode: 'light' as const, colors: { primary: '#a855f7', secondary: '#9333ea', background: '#faf5ff', surface: '#f3e8ff', text: '#6b21a8', textSecondary: '#9333ea', border: '#d8b4fe', accent: '#a855f7', danger: '#ef4444', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' } },
          ],
        },
      ];

      // Find the color family
      const family = presetThemeGroups.find(g => g.key === selectedColorFamily);
      if (family) {
        // Get the opposite variant
        const currentIsDark = isDark;
        const targetTheme = family.themes.find(t => {
          // Only compare dark/light themes (preset themes don't have system mode)
          const targetIsDark = t.mode === 'dark';
          return targetIsDark !== currentIsDark;
        });

        if (targetTheme) {
          setTheme({
            mode: targetTheme.mode,
            colors: targetTheme.colors as any
          });
          return;
        }
      }
    }

    // Fallback to default toggle behavior
    const newMode: ThemeMode = theme.mode === 'dark' ? 'light' : theme.mode === 'light' ? 'system' : 'dark';
    setTheme({ mode: newMode });
  };

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = isDark ? defaultDarkTheme : defaultLightTheme;
    const colors = theme.colors;

    // Apply CSS variables with higher specificity
    root.style.setProperty('--theme-primary', colors.primary);
    root.style.setProperty('--theme-secondary', colors.secondary);
    root.style.setProperty('--theme-background', colors.background);
    root.style.setProperty('--theme-surface', colors.surface);
    root.style.setProperty('--theme-text', colors.text);
    root.style.setProperty('--theme-text-secondary', colors.textSecondary);
    root.style.setProperty('--theme-border', colors.border);
    root.style.setProperty('--theme-accent', colors.accent);
    root.style.setProperty('--theme-font-family', theme.fontFamily || currentTheme.fontFamily || 'Inter, system-ui, sans-serif');
    root.style.setProperty('--theme-border-radius', theme.borderRadius || currentTheme.borderRadius || '0.5rem');

    // Theme-aware hover colors (low opacity primary)
    root.style.setProperty('--theme-hover', `${colors.primary}15`); // ~8% opacity
    root.style.setProperty('--theme-hover-strong', `${colors.primary}25`); // ~15% opacity
    root.style.setProperty('--theme-surface-hover', isDark ? '#ffffff08' : '#00000005');

    // Also set data attributes for more specific targeting
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.setAttribute('data-theme-mode', theme.mode);

    // Apply custom CSS if provided (per-user)
    if (theme.customCSS) {
      let styleElement = document.getElementById('user-custom-css');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'user-custom-css';
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = theme.customCSS;
    } else {
      const styleElement = document.getElementById('user-custom-css');
      if (styleElement) {
        styleElement.remove();
      }
    }

    // Apply theme class to body and html
    document.body.classList.remove('light-theme', 'dark-theme', 'dark');
    document.body.classList.add(`${isDark ? 'dark' : 'light'}-theme`);
    root.classList.remove('light-theme', 'dark-theme', 'dark');
    root.classList.add(`${isDark ? 'dark' : 'light'}-theme`);

    if (isDark) {
      document.body.classList.add('dark');
      root.classList.add('dark');
    }
  }, [theme, isDark]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

