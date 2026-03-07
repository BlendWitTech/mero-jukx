import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { TaskbarVisibility } from '../types/taskbar';

interface TaskbarContextType {
  visibility: TaskbarVisibility;
  setVisibility: (visibility: TaskbarVisibility) => Promise<void>;
}

const TaskbarContext = createContext<TaskbarContextType | undefined>(undefined);

export function TaskbarProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState(() => useAuthStore.getState());
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      setAuthState(state);
    });
    return unsubscribe;
  }, []);
  const { isAuthenticated, user } = authState;

  // Initialize with preference from localStorage or default
  const [visibility, setVisibilityState] = useState<TaskbarVisibility>(() => {
    if (isAuthenticated && user?.id) {
      const userKey = `user-${user.id}-taskbar-visibility`;
      const stored = localStorage.getItem(userKey) as TaskbarVisibility | null;
      return stored || localStorage.getItem('taskbar-visibility') as TaskbarVisibility || 'always';
    }
    return localStorage.getItem('taskbar-visibility') as TaskbarVisibility || 'always';
  });

  // Load user preference on mount or when user changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const userKey = `user-${user.id}-taskbar-visibility`;
      const stored = localStorage.getItem(userKey) as TaskbarVisibility | null;
      const globalStored = localStorage.getItem('taskbar-visibility') as TaskbarVisibility | null;
      setVisibilityState(stored || globalStored || 'always');

      // Try to load from API
      loadUserPreference();
    } else {
      const stored = localStorage.getItem('taskbar-visibility') as TaskbarVisibility | null;
      setVisibilityState(stored || 'always');
    }
  }, [user?.id, isAuthenticated]);

  const loadUserPreference = async () => {
    try {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser?.id) return;

      const response = await api.get('/users/me');
      const userData = response.data;

      if (userData.taskbar_preferences?.visibility) {
        setVisibilityState(userData.taskbar_preferences.visibility);
        const userKey = `user-${currentUser.id}-taskbar-visibility`;
        localStorage.setItem(userKey, userData.taskbar_preferences.visibility);
      }
    } catch (error) {
      // API might not have taskbar preferences yet, continue with localStorage
      console.debug('Taskbar preference not available from API, using localStorage');
    }
  };

  const setVisibility = async (newVisibility: TaskbarVisibility) => {
    setVisibilityState(newVisibility);

    // Save to localStorage immediately
    if (isAuthenticated && user?.id) {
      const userKey = `user-${user.id}-taskbar-visibility`;
      localStorage.setItem(userKey, newVisibility);
    }
    localStorage.setItem('taskbar-visibility', newVisibility);

    // Save to user profile if authenticated
    if (isAuthenticated && user?.id) {
      try {
        await api.patch('/users/me', {
          taskbar_preferences: {
            visibility: newVisibility,
          },
        });
      } catch (error: any) {
        // Silently handle errors - preference is still saved locally
        if (error?.response?.status !== 404 && error?.response?.status !== 403) {
          if (import.meta.env.MODE === 'development' && typeof window !== 'undefined' && window.localStorage?.getItem('debug-permissions') === 'true') {
            console.warn('Failed to save taskbar preference:', error?.response?.status || error?.message);
          }
        }
      }
    }
  };

  return (
    <TaskbarContext.Provider value={{ visibility, setVisibility }}>
      {children}
    </TaskbarContext.Provider>
  );
}

export function useTaskbar() {
  const context = useContext(TaskbarContext);
  if (context === undefined) {
    throw new Error('useTaskbar must be used within a TaskbarProvider');
  }
  return context;
}

