import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, Users, FileText, CheckSquare, Package, Command, Globe, Lightbulb, TrendingUp, History, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SearchResults {
  leads: Array<{ id: string; first_name: string; last_name: string | null; email: string | null; company: string | null; status: string }>;
  clients: Array<{ id: string; name: string; email: string | null; company: string | null }>;
  invoices: Array<{ id: string; number: number; total: number; status: string; client_id: string }>;
  tasks: Array<{ id: string; title: string; status: string; priority: string }>;
  products: Array<{ id: string; name: string; sku: string | null }>;
  users: Array<{ id: string; email: string; first_name: string; last_name: string; avatar_url: string | null }>;
}

export default function GlobalSearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const { theme, isDark } = useTheme();
  const orgSlug = organization?.slug || '';

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Ctrl+K shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: results, isLoading } = useQuery<SearchResults>({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      const response = await api.get('/search/global', { params: { q: debouncedQuery, limit: 5 } });
      return response.data;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 60_000,
  });

  const totalResults = results
    ? (results.leads?.length || 0) + (results.clients?.length || 0) + (results.invoices?.length || 0) +
    (results.tasks?.length || 0) + (results.products?.length || 0) + (results.users?.length || 0)
    : 0;

  const navigateTo = useCallback((path: string) => {
    setIsOpen(false);
    setQuery('');
    navigate(path);
  }, [navigate]);

  const baseUrl = orgSlug ? `/org/${orgSlug}` : '';

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button
          className={cn(
            "group flex items-center gap-3 px-3 py-1.5 rounded-full text-sm transition-all duration-300 border backdrop-blur-md",
            "bg-white/5 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-white/10",
            "w-48 md:w-64 border-white/10 hover:border-white/20 shadow-lg shadow-black/5"
          )}
          style={{
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            color: theme.colors.textSecondary,
          }}
        >
          <div className="p-1 rounded-full bg-primary/20 group-hover:bg-primary/30 transition-colors">
            <Search className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="flex-1 text-left text-xs font-medium opacity-70 group-hover:opacity-100">Search Mero Jugx...</span>
          <div
            className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold opacity-40 bg-white/5 group-hover:opacity-60 transition-opacity"
            style={{ borderColor: theme.colors.border }}
          >
            <Command className="h-2 w-2" />
            <span>K</span>
          </div>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md animate-fadeIn"
        />
        <Dialog.Content
          className={cn(
            "fixed top-[15%] left-1/2 -translate-x-1/2 w-[650px] max-w-[95vw] min-h-[400px] rounded-3xl z-[101] overflow-hidden animate-content-show border shadow-2xl premium-glass",
          )}
          style={{
            backgroundColor: isDark ? 'rgba(24, 25, 28, 0.8)' : 'rgba(255, 255, 255, 0.9)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          }}
        >
          {/* Subtle decoration */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30" />

          {/* Header/Input Section */}
          <div className="relative flex items-center px-8 py-6 border-b border-white/5" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            <div className="absolute left-8 flex items-center justify-center p-2 rounded-xl bg-primary/10">
              <Search
                className="h-5 w-5 text-primary"
              />
            </div>
            <input
              autoFocus
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you looking for today?"
              className="w-full bg-transparent pl-12 pr-12 outline-none text-xl font-medium tracking-tight placeholder:text-muted-foreground/30"
              style={{ color: theme.colors.text }}
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-8 p-1.5 rounded-full hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
                style={{ color: theme.colors.textSecondary }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {isLoading && (
              <div className="absolute right-16">
                <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Results Area */}
          <div className="max-h-[65vh] overflow-y-auto scrollbar-thin px-2 py-4">
            {query.length === 0 && (
              <div className="px-6 py-6 space-y-8">
                <div>
                  <h3 className="px-4 mb-4 text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 flex items-center gap-2" style={{ color: theme.colors.textSecondary }}>
                    <TrendingUp className="h-3 w-3" /> Quick Access
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: Sparkles, label: 'Create Invoice', path: `${baseUrl}/app/mero-crm/invoices/new`, color: 'text-emerald-500 bg-emerald-500/10' },
                      { icon: Users, label: 'Add Lead', path: `${baseUrl}/app/mero-crm/leads/new`, color: 'text-blue-500 bg-blue-500/10' },
                      { icon: CheckSquare, label: 'New Task', path: `${baseUrl}/app/mero-board`, color: 'text-purple-500 bg-purple-500/10' },
                      { icon: History, label: 'Activity Log', path: `${baseUrl}/activity`, color: 'text-amber-500 bg-amber-500/10' },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => navigateTo(item.path)}
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 dark:hover:bg-white/5 transition-all group border border-transparent hover:border-white/5"
                      >
                        <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110", item.color)}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium opacity-80 group-hover:opacity-100 transition-opacity" style={{ color: theme.colors.text }}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/5 to-secondary/5 border border-white/5">
                  <Globe className="h-10 w-10 mb-4 text-primary opacity-50" />
                  <h4 className="text-base font-semibold mb-2" style={{ color: theme.colors.text }}>Global Search</h4>
                  <p className="text-sm text-center opacity-50 max-w-[320px]" style={{ color: theme.colors.textSecondary }}>
                    Find clients, invoices, tasks, or settings across all your registered modules instantly.
                  </p>
                </div>
              </div>
            )}

            {query.length > 0 && query.length < 2 && (
              <div className="px-8 py-20 text-center animate-fadeIn">
                <div className="h-12 w-12 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4 border border-primary/10">
                  <Search className="h-5 w-5 text-primary opacity-40" />
                </div>
                <p className="text-sm font-medium opacity-40" style={{ color: theme.colors.textSecondary }}>
                  Keep typing to explore results...
                </p>
              </div>
            )}

            {query.length >= 2 && !isLoading && totalResults === 0 && (
              <div className="px-8 py-20 text-center animate-fadeIn">
                <div className="h-16 w-16 rounded-2xl bg-orange-500/5 flex items-center justify-center mx-auto mb-6 border border-orange-500/10">
                  <Search className="h-8 w-8 text-orange-500 opacity-40" />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: theme.colors.text }}>No results found</h3>
                <p className="text-sm opacity-50 max-w-[280px] mx-auto" style={{ color: theme.colors.textSecondary }}>
                  We couldn't find anything matching "<span className="text-primary font-semibold">{query}</span>". Try different keywords or check spelling.
                </p>
              </div>
            )}

            {results && totalResults > 0 && (
              <div className="space-y-6 pb-4">
                {[
                  { title: 'Leads', data: results.leads, icon: User, color: 'text-blue-500 bg-blue-500/10', path: (id: string) => `${baseUrl}/app/mero-crm/leads/${id}` },
                  { title: 'Clients', data: results.clients, icon: Users, color: 'text-purple-500 bg-purple-500/10', path: (id: string) => `${baseUrl}/app/mero-crm/clients/${id}` },
                  { title: 'Invoices', data: results.invoices, icon: FileText, color: 'text-emerald-500 bg-emerald-500/10', path: (id: string) => `${baseUrl}/app/mero-crm/invoices/${id}` },
                  { title: 'Tasks', data: results.tasks, icon: CheckSquare, color: 'text-amber-500 bg-amber-500/10', path: (id: string) => `${baseUrl}/app/mero-board/tasks/${id}` },
                  { title: 'Products', data: results.products, icon: Package, color: 'text-indigo-500 bg-indigo-500/10', path: (id: string) => `${baseUrl}/app/mero-inventory/products/${id}` },
                  { title: 'Members', data: results.users, icon: User, color: 'text-pink-500 bg-pink-500/10', path: () => `${baseUrl}/users` },
                ].map((section) => section.data && section.data.length > 0 && (
                  <div key={section.title} className="animate-fadeIn">
                    <div className="px-6 py-2 flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40" style={{ color: theme.colors.textSecondary }}>{section.title}</span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="px-2 mt-2 space-y-1">
                      {section.data.map((item: any) => (
                        <button
                          key={item.id}
                          className="group w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-left transition-all hover:bg-white/5 dark:hover:bg-white/5 active:scale-[0.99] border border-transparent hover:border-white/5"
                          onClick={() => navigateTo(section.path(item.id))}
                        >
                          <div className={cn("flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-300 group-hover:scale-110 shadow-sm", section.color)}>
                            <section.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold tracking-tight transition-colors group-hover:text-primary" style={{ color: theme.colors.text }}>
                              {item.name || `${item.first_name || ''} ${item.last_name || ''}` || (item.number ? `Invoice #${item.number}` : item.title) || item.email}
                            </div>
                            <div className="text-[11px] font-medium opacity-40 mt-0.5" style={{ color: theme.colors.textSecondary }}>
                              {item.company || item.status || (item.sku ? `SKU: ${item.sku}` : 'View details')}
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0">
                            <Command className="h-3 w-3 opacity-30" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-white/5 flex items-center justify-between premium-glass mt-auto" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-6 text-[10px] font-bold tracking-widest uppercase opacity-40" style={{ color: theme.colors.textSecondary }}>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-md border border-white/10 bg-white/5 leading-none">↵</span>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-md border border-white/10 bg-white/5 leading-none">↑↓</span>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-md border border-white/10 bg-white/5 leading-none">esc</span>
                <span>Close</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/10">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Search Engine Active</span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

