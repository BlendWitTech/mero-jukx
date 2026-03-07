import React, { useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Card } from '@shared';
import { UserCheck, Globe, RefreshCw, CheckCircle } from 'lucide-react';

type AssignmentMode = 'round_robin' | 'territory' | 'manual';

export default function AssignmentSettings() {
    const { theme } = useTheme();
    const [mode, setMode] = useState<AssignmentMode>('round_robin');
    const [territories, setTerritories] = useState([
        { country: 'Nepal', city: 'Kathmandu' },
    ]);
    const [newCountry, setNewCountry] = useState('');
    const [newCity, setNewCity] = useState('');
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const addTerritory = () => {
        if (!newCountry.trim()) return;
        setTerritories(prev => [...prev, { country: newCountry.trim(), city: newCity.trim() }]);
        setNewCountry('');
        setNewCity('');
    };

    const removeTerritory = (index: number) => {
        setTerritories(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6">
            {/* Assignment Mode */}
            <Card className="p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                        <UserCheck className="h-5 w-5" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h3 className="font-semibold" style={{ color: theme.colors.text }}>Assignment Mode</h3>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                            Choose how new leads are assigned to team members
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        {
                            id: 'round_robin' as AssignmentMode,
                            label: 'Round Robin',
                            desc: 'Distribute leads evenly across team members in rotation',
                            icon: RefreshCw,
                        },
                        {
                            id: 'territory' as AssignmentMode,
                            label: 'Territory Based',
                            desc: 'Assign leads based on country or city matching rules',
                            icon: Globe,
                        },
                        {
                            id: 'manual' as AssignmentMode,
                            label: 'Manual',
                            desc: 'Team members must manually claim or be assigned leads',
                            icon: UserCheck,
                        },
                    ].map(({ id, label, desc, icon: Icon }) => {
                        const active = mode === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setMode(id)}
                                className="text-left p-4 rounded-xl border-2 transition-all"
                                style={{
                                    borderColor: active ? theme.colors.primary : theme.colors.border,
                                    backgroundColor: active ? `${theme.colors.primary}08` : theme.colors.surface,
                                }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon className="h-5 w-5" style={{ color: active ? theme.colors.primary : theme.colors.textSecondary }} />
                                    <span className="font-semibold text-sm" style={{ color: active ? theme.colors.primary : theme.colors.text }}>{label}</span>
                                </div>
                                <p className="text-xs" style={{ color: theme.colors.textSecondary }}>{desc}</p>
                                {active && (
                                    <div className="mt-2 flex items-center gap-1">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span className="text-xs text-green-500 font-medium">Active</span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </Card>

            {/* Territory Rules (only when territory mode selected) */}
            {mode === 'territory' && (
                <Card className="p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <div className="flex items-center gap-3 mb-4">
                        <Globe className="h-5 w-5" style={{ color: theme.colors.primary }} />
                        <h3 className="font-semibold" style={{ color: theme.colors.text }}>Territory Rules</h3>
                    </div>
                    <p className="text-sm mb-4" style={{ color: theme.colors.textSecondary }}>
                        Leads from matching countries/cities will be assigned to the first available team member with that territory.
                    </p>

                    <div className="space-y-2 mb-4">
                        {territories.map((t, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 p-3 rounded-lg"
                                style={{ backgroundColor: theme.colors.border }}
                            >
                                <Globe className="h-4 w-4 flex-shrink-0" style={{ color: theme.colors.textSecondary }} />
                                <span className="flex-1 text-sm" style={{ color: theme.colors.text }}>
                                    {t.city ? `${t.city}, ` : ''}{t.country}
                                </span>
                                <button
                                    onClick={() => removeTerritory(i)}
                                    className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Country"
                            value={newCountry}
                            onChange={(e) => setNewCountry(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                        />
                        <input
                            type="text"
                            placeholder="City (optional)"
                            value={newCity}
                            onChange={(e) => setNewCity(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }}
                        />
                        <button
                            onClick={addTerritory}
                            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                            style={{ backgroundColor: theme.colors.primary }}
                        >
                            Add
                        </button>
                    </div>
                </Card>
            )}

            {/* Round Robin Info */}
            {mode === 'round_robin' && (
                <Card className="p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <div className="flex items-center gap-3 mb-3">
                        <RefreshCw className="h-5 w-5" style={{ color: theme.colors.primary }} />
                        <h3 className="font-semibold" style={{ color: theme.colors.text }}>Round Robin Configuration</h3>
                    </div>
                    <div className="text-sm space-y-2" style={{ color: theme.colors.textSecondary }}>
                        <p>✓ New leads are distributed evenly across all active team members</p>
                        <p>✓ The system cycles through members in alphabetical order by user ID</p>
                        <p>✓ If a member is unavailable, the next member in rotation receives the lead</p>
                        <p>✓ Territory rules are checked first — if no territory match, round-robin applies</p>
                    </div>
                </Card>
            )}

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    className="px-6 py-2 rounded-lg font-medium text-white transition-all"
                    style={{ backgroundColor: saved ? '#22c55e' : theme.colors.primary }}
                >
                    {saved ? '✓ Saved' : 'Save Assignment Settings'}
                </button>
            </div>
        </div>
    );
}
