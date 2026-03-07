import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../store/authStore';
import { Building2, ChevronDown, Plus, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import toast from '@shared/hooks/useToast';
import { useTheme } from '../contexts/ThemeContext';

export default function OrganizationSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme } = useTheme();
  const { organization: orgFromStore, accessToken, _hasHydrated, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Fetch current organization details
  const { data: currentOrganization } = useQuery({
    queryKey: ['current-organization'],
    queryFn: async () => {
      try {
        const response = await api.get('/organizations/me');
        return response.data;
      } catch (error: any) {
        // Handle 401/403 gracefully
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
    retry: false,
  });

  // Use fetched organization or fallback to store organization
  const organization = currentOrganization || orgFromStore;

  // Fetch user's organizations
  const { data: organizations } = useQuery({
    queryKey: ['user-organizations'],
    queryFn: async () => {
      try {
        const response = await api.get('/organizations');
        return response.data || [];
      } catch (error: any) {
        // Handle 401/403 gracefully
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
    retry: false,
  });

  const handleSwitchOrganization = async (orgId: string) => {
    try {
      const response = await api.put('/organizations/switch', { organization_id: orgId });
      const { access_token, refresh_token, user: newUser, organization: newOrg } = response.data;

      const authStore = useAuthStore.getState();
      // Ensure slug is included in organization object
      const orgWithSlug = {
        id: newOrg.id,
        name: newOrg.name || '',
        slug: newOrg.slug || '',
      };
      authStore.setAuth(
        { access_token, refresh_token },
        newUser,
        orgWithSlug,
        null
      );

      // Navigate to organization slug route
      if (orgWithSlug.slug) {
        window.location.href = `/org/${orgWithSlug.slug}`;
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Failed to switch organization:', error);
    }
    setIsOpen(false);
  };

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: compact ? rect.bottom + 8 : rect.top,
        left: compact ? rect.left : rect.right + 8,
      });
    }
  }, [isOpen, compact]);


  return (
    <div className="relative w-full">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full ${compact ? 'w-12 h-12' : 'px-2 py-1.5'} ${compact ? 'rounded-2xl' : 'rounded'} flex items-center ${compact ? 'justify-center' : 'gap-2'} transition-colors group ${compact ? 'relative' : ''} ${compact ? '' : 'text-left'} ${compact ? 'overflow-visible' : ''}`}
        style={compact
          ? {
            background: `linear-gradient(to bottom right, ${theme.colors.primary}, ${theme.colors.secondary})`,
            overflow: 'visible',
            padding: '0'
          }
          : {}
        }
        onMouseEnter={(e) => {
          if (!compact) {
            e.currentTarget.style.backgroundColor = theme.colors.surface;
          } else {
            e.currentTarget.style.background = `linear-gradient(to bottom right, ${theme.colors.secondary}, ${theme.colors.primary})`;
          }
        }}
        onMouseLeave={(e) => {
          if (!compact) {
            e.currentTarget.style.backgroundColor = 'transparent';
          } else {
            e.currentTarget.style.background = `linear-gradient(to bottom right, ${theme.colors.primary}, ${theme.colors.secondary})`;
          }
        }}
        title={compact ? 'Switch Account' : (organization?.name || 'Switch Organization')}
      >
        {organization ? (
          <div className={`${compact ? 'h-12 w-12' : 'h-8 w-8'} ${compact ? 'rounded-2xl' : 'rounded-full'} flex items-center justify-center flex-shrink-0 relative`} style={compact ? { margin: 0 } : { backgroundColor: theme.colors.primary }}>
            <span className={`${compact ? 'text-lg' : 'text-xs'} font-bold text-white leading-none`}>
              {organization.name.charAt(0).toUpperCase()}
            </span>
            {compact && (
              <RefreshCw className="h-3 w-3 absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 border text-white z-10" style={{ backgroundColor: theme.colors.border, borderColor: theme.colors.surface }} />
            )}
          </div>
        ) : (
          <div className={`${compact ? 'h-12 w-12' : 'h-8 w-8'} ${compact ? 'rounded-2xl' : 'rounded-full'} flex items-center justify-center flex-shrink-0 relative`} style={compact ? { margin: 0 } : { backgroundColor: theme.colors.primary }}>
            <Building2 className={`${compact ? 'h-6 w-6' : 'h-4 w-4'} text-white`} />
            {compact && (
              <RefreshCw className="h-3 w-3 absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 border text-white z-10" style={{ backgroundColor: theme.colors.border, borderColor: theme.colors.surface }} />
            )}
          </div>
        )}
        {!compact && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: theme.colors.text }}>
                {organization?.name || 'No Organization'}
              </p>
              <p className="text-xs truncate" style={{ color: theme.colors.textSecondary }}>Switch account</p>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: theme.colors.textSecondary }} />
          </>
        )}
      </button>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed z-[9999] w-64 rounded-lg shadow-xl overflow-hidden"
            style={{
              backgroundColor: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
                Switch Organization
              </div>

              {/* Organizations */}
              {organizations && organizations.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide mt-2" style={{ color: theme.colors.textSecondary }}>
                    Organizations
                  </div>
                  {organizations
                    .filter((org: any) => org.org_type === 'MAIN' || org.org_type === 'CREATOR')
                    .map((org: any) => (
                      <button
                        key={org.id}
                        onClick={() => handleSwitchOrganization(org.id)}
                        className="w-full px-3 py-2 rounded text-left transition-colors flex items-center gap-3 group"
                        style={{ color: theme.colors.text }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.background}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.colors.primary }}>
                          <span className="text-sm font-bold text-white">
                            {org.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: theme.colors.text }}>
                            {org.name}
                          </p>
                          <p className="text-xs truncate" style={{ color: theme.colors.textSecondary }}>
                            {org.email}
                          </p>
                        </div>
                        {organization?.id === org.id && (
                          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#23a55a' }}></div>
                        )}
                      </button>
                    ))}
                </>
              )}

              {/* Add Organization */}
              <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                <button
                  className="w-full px-3 py-2 rounded text-left transition-colors flex items-center gap-3"
                  style={{ color: theme.colors.textSecondary }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.background;
                    e.currentTarget.style.color = theme.colors.text;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = theme.colors.textSecondary;
                  }}
                >
                  <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-dashed" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <Plus className="h-5 w-5" style={{ color: theme.colors.textSecondary }} />
                  </div>
                  <span className="text-sm font-medium">Create Organization</span>
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

