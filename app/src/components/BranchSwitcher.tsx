import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../store/authStore';
import { GitBranch, ChevronDown, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export default function BranchSwitcher({ compact = false }: { compact?: boolean }) {
    const { theme } = useTheme();
    const { organization: currentOrg, accessToken, _hasHydrated, isAuthenticated } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

    // Fetch current organization details to check type
    const { data: orgDetails } = useQuery({
        queryKey: ['current-organization'],
        queryFn: async () => {
            try {
                const response = await api.get('/organizations/me');
                return response.data;
            } catch (error) {
                return null;
            }
        },
        enabled: _hasHydrated && isAuthenticated && !!accessToken,
    });

    // Fetch branches for the current organization context
    const { data: branches, isLoading } = useQuery({
        queryKey: ['organization-branches', currentOrg?.id],
        queryFn: async () => {
            try {
                const response = await api.get('/organizations/me/branches');
                return response.data || [];
            } catch (error) {
                return [];
            }
        },
        enabled: _hasHydrated && isAuthenticated && !!accessToken && !!currentOrg?.id,
    });

    // Don't show if there are no branches or if it's not a MAIN/BRANCH type
    const isEligible = orgDetails?.org_type === 'MAIN' || orgDetails?.org_type === 'BRANCH';
    const showSwitcher = isEligible && (isLoading || (branches && branches.length > 1));

    const handleSwitchBranch = async (branchId: string) => {
        try {
            const response = await api.put('/organizations/switch', { organization_id: branchId });
            const { access_token, refresh_token, user: newUser, organization: newOrg } = response.data;

            const authStore = useAuthStore.getState();
            authStore.setAuth(
                { access_token, refresh_token },
                newUser,
                {
                    id: newOrg.id,
                    name: newOrg.name || '',
                    slug: newOrg.slug || '',
                },
                null
            );

            // Reload or navigate
            window.location.reload();
        } catch (error: any) {
            console.error('Failed to switch branch:', error);
        }
        setIsOpen(false);
    };

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: compact ? rect.bottom + 8 : rect.top,
                left: compact ? rect.left : rect.right + 8,
            });
        }
    }, [isOpen, compact]);

    if (!showSwitcher) return null;

    return (
        <div className="relative w-full">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full ${compact ? 'w-10 h-10' : 'px-2 py-1.5'} ${compact ? 'rounded-xl' : 'rounded'} flex items-center ${compact ? 'justify-center' : 'gap-2'} transition-colors group relative`}
                style={{
                    border: `1.5px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.surface
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${theme.colors.primary}1A`;
                    e.currentTarget.style.borderColor = theme.colors.primary;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.surface;
                    e.currentTarget.style.borderColor = theme.colors.border;
                }}
                title={compact ? 'Switch Branch' : (currentOrg?.name || 'Switch Branch')}
            >
                <div className="flex items-center justify-center flex-shrink-0">
                    <GitBranch className={`${compact ? 'h-5 w-5' : 'h-4 w-4'}`} style={{ color: theme.colors.primary }} />
                </div>

                {!compact && (
                    <>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: theme.colors.text }}>
                                {currentOrg?.name || 'Main Branch'}
                            </p>
                        </div>
                        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: theme.colors.textSecondary }} />
                    </>
                )}

                {compact && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center p-0.5 border"
                        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                        <RefreshCw className="h-2 w-2" style={{ color: theme.colors.textSecondary }} />
                    </div>
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
                                Switch Branch / Outlet
                            </div>

                            <div className="mt-1 max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-transparent">
                                {branches?.map((branch: any) => (
                                    <button
                                        key={branch.id}
                                        onClick={() => handleSwitchBranch(branch.id)}
                                        className="w-full px-3 py-2 rounded text-left transition-colors flex items-center gap-3 group"
                                        style={{ color: theme.colors.text }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.background}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: `${theme.colors.primary}1A` }}>
                                            <GitBranch className="h-4 w-4" style={{ color: theme.colors.primary }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: theme.colors.text }}>
                                                {branch.name}
                                            </p>
                                        </div>
                                        {currentOrg?.id === branch.id && (
                                            <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#23a55a' }}></div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
