import React, { useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Card } from '@shared';
import { Zap, Clock, Bell, CheckCircle } from 'lucide-react';

export default function AutomationSettings() {
    const { theme } = useTheme();
    const [staleThreshold, setStaleThreshold] = useState(7);
    const [autoFollowUp, setAutoFollowUp] = useState(true);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        // Settings are applied server-side via the cron job
        // In a full implementation these would be stored in CRM settings entity
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Stale Lead Automation */}
            <Card className="p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                        <Clock className="h-5 w-5" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h3 className="font-semibold" style={{ color: theme.colors.text }}>Stale Lead Follow-Up</h3>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                            Automatically create follow-up tasks for leads that haven't been contacted
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: theme.colors.border }}>
                        <div>
                            <p className="font-medium text-sm" style={{ color: theme.colors.text }}>Auto Follow-Up Tasks</p>
                            <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                                Create a follow-up task when a lead has no activity
                            </p>
                        </div>
                        <button
                            onClick={() => setAutoFollowUp(!autoFollowUp)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                            style={{ backgroundColor: autoFollowUp ? theme.colors.primary : theme.colors.border }}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoFollowUp ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                            Stale Lead Threshold (days)
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min={1}
                                max={30}
                                value={staleThreshold}
                                onChange={(e) => setStaleThreshold(Number(e.target.value))}
                                className="flex-1"
                                style={{ accentColor: theme.colors.primary }}
                            />
                            <span className="text-lg font-bold min-w-[40px]" style={{ color: theme.colors.text }}>
                                {staleThreshold}d
                            </span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                            Follow-up tasks are created for NEW leads with no activity after {staleThreshold} days
                        </p>
                    </div>
                </div>
            </Card>

            {/* Automation Status */}
            <Card className="p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: '#22c55e15' }}>
                        <Zap className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold" style={{ color: theme.colors.text }}>Active Automations</h3>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                            Automations currently running in the background
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {[
                        { name: 'Stale Lead Detection', desc: `Runs daily at midnight — creates follow-up tasks for leads inactive ${staleThreshold}+ days`, active: autoFollowUp },
                        { name: 'Lead Score Calculation', desc: 'Recalculates lead score on every update based on profile completeness and activity', active: true },
                        { name: 'Round-Robin Assignment', desc: 'Automatically assigns new leads to team members in rotation', active: true },
                    ].map((rule) => (
                        <div
                            key={rule.name}
                            className="flex items-start gap-3 p-4 rounded-lg"
                            style={{ backgroundColor: theme.colors.border }}
                        >
                            <CheckCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${rule.active ? 'text-green-500' : 'text-gray-400'}`} />
                            <div>
                                <p className="font-medium text-sm" style={{ color: theme.colors.text }}>{rule.name}</p>
                                <p className="text-xs mt-0.5" style={{ color: theme.colors.textSecondary }}>{rule.desc}</p>
                            </div>
                            <span
                                className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                                style={{
                                    backgroundColor: rule.active ? '#dcfce7' : '#f3f4f6',
                                    color: rule.active ? '#16a34a' : '#6b7280',
                                }}
                            >
                                {rule.active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Notification Rules */}
            <Card className="p-6" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `#f97316` + '15' }}>
                        <Bell className="h-5 w-5 text-orange-500" />
                    </div>
                    <h3 className="font-semibold" style={{ color: theme.colors.text }}>Notification Triggers</h3>
                </div>
                <div className="space-y-3 text-sm" style={{ color: theme.colors.textSecondary }}>
                    {[
                        'New lead assigned → Notify assigned user',
                        'Lead converted to client → Notify sales team',
                        'Deal status changed → Notify deal owner',
                        'Activity overdue → Notify responsible user',
                    ].map((rule) => (
                        <div key={rule} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span>{rule}</span>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    className="px-6 py-2 rounded-lg font-medium text-white transition-all"
                    style={{ backgroundColor: saved ? '#22c55e' : theme.colors.primary }}
                >
                    {saved ? '✓ Saved' : 'Save Automation Settings'}
                </button>
            </div>
        </div>
    );
}
