import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Save, Settings } from 'lucide-react';
import api from '@/services/api';
import toast from '@shared/frontend/hooks/useToast';

interface CmsSettings {
    id?: string;
    site_name: string;
    site_description: string;
    logo_url: string;
    favicon_url: string;
    primary_color: string;
    custom_css: string;
    custom_domain: string;
}

export default function SettingsPage() {
    const { theme } = useTheme();
    const [settings, setSettings] = useState<CmsSettings>({ site_name: '', site_description: '', logo_url: '', favicon_url: '', primary_color: '#3b82f6', custom_css: '', custom_domain: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try { const res = await api.get('/cms/settings'); setSettings(res.data); }
            catch { toast.error('Failed to load settings'); }
            finally { setLoading(false); }
        };
        fetch();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch('/cms/settings', settings);
            toast.success('Settings saved');
        } catch { toast.error('Failed to save settings'); }
        finally { setSaving(false); }
    };

    const fields: { label: string; key: keyof CmsSettings; type: string; placeholder?: string }[] = [
        { label: 'Site Name', key: 'site_name', type: 'text', placeholder: 'My Website' },
        { label: 'Site Description', key: 'site_description', type: 'textarea', placeholder: 'A brief description of your site' },
        { label: 'Logo URL', key: 'logo_url', type: 'text', placeholder: 'https://...' },
        { label: 'Favicon URL', key: 'favicon_url', type: 'text', placeholder: 'https://...' },
        { label: 'Primary Color', key: 'primary_color', type: 'color' },
        { label: 'Custom Domain', key: 'custom_domain', type: 'text', placeholder: 'www.example.com' },
        { label: 'Custom CSS', key: 'custom_css', type: 'code', placeholder: '/* Custom styles */' },
    ];

    if (loading) return <div className="p-6 text-center" style={{ color: theme.colors.textSecondary }}>Loading settings...</div>;

    return (
        <div className="p-6 space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>CMS Settings</h1>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Configure your website settings and branding</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: theme.colors.primary }}>
                    <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            <div className="rounded-xl border p-6 space-y-5" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-5 w-5" style={{ color: theme.colors.primary }} />
                    <h2 className="text-base font-semibold" style={{ color: theme.colors.text }}>Site Configuration</h2>
                </div>

                {fields.map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: theme.colors.text }}>{label}</label>
                        {type === 'textarea' ? (
                            <textarea rows={3} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={settings[key] as string} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
                        ) : type === 'code' ? (
                            <textarea rows={5} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg border text-sm font-mono" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={settings[key] as string} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
                        ) : type === 'color' ? (
                            <div className="flex items-center gap-3">
                                <input type="color" className="h-10 w-16 rounded cursor-pointer border" style={{ borderColor: theme.colors.border }} value={settings[key] as string} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
                                <input type="text" className="flex-1 px-3 py-2 rounded-lg border text-sm font-mono" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={settings[key] as string} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
                            </div>
                        ) : (
                            <input type="text" placeholder={placeholder} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={settings[key] as string} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
