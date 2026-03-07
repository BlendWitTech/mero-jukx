import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_system_admin?: boolean;
  system_admin_role?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  currency?: string;
  mfa_enabled?: boolean;
  org_type?: 'MAIN' | 'BRANCH' | 'CREATOR';
  parent_id?: string | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  impersonatedBy: string | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  setAuth: (tokens: { access_token: string; refresh_token: string }, user: User, organization: Organization | null, impersonatedBy?: string | null) => void;
  setUser: (user: User) => void;
  setOrganization: (organization: Organization) => void;
  logout: () => void;
  updateToken: (accessToken: string) => void;
  setImpersonatedBy: (userId: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      organization: null,
      isAuthenticated: false,
      impersonatedBy: null,
      _hasHydrated: false,
      setHasHydrated: (state) => {
        set({
          _hasHydrated: state,
        });
      },
      setAuth: (tokens, user, organization, impersonatedBy = null) =>
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          user,
          organization,
          isAuthenticated: true,
          impersonatedBy,
        }),
      setUser: (user) => set({ user }),
      setOrganization: (organization) => set({ organization }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          organization: null,
          isAuthenticated: false,
          impersonatedBy: null,
        }),
      updateToken: (accessToken) => set({ accessToken }),
      setImpersonatedBy: (userId) => set({ impersonatedBy: userId }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

