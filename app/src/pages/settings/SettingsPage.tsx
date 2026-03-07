import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from '@shared/hooks/useToast';
import { Shield, Bell, Lock, Users, Mail, Globe, Database, AlertTriangle, CheckCircle2, Info, Settings as SettingsIcon, Palette, Save, Building2 } from 'lucide-react';
import * as React from 'react';
import { useAuthStore } from '../../store/authStore';
import { formatLimit } from '../../utils/formatLimit';
import { useTheme } from '../../contexts/ThemeContext';
import { useTaskbar } from '../../contexts/TaskbarContext';
import { Loading } from '@shared';

// Theme Customization Component
function ThemeCustomizationTab({ organization }: { organization: any }) {
  const { theme, setTheme, isDark, toggleTheme } = useTheme();
  const [localColors, setLocalColors] = useState(theme.colors);
  const [customCSS, setCustomCSS] = useState(theme.customCSS || '');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedColorFamily, setSelectedColorFamily] = useState<string | null>(() => {
    return localStorage.getItem('selected-color-family');
  });
  const isUpdatingRef = React.useRef(false);
  const previousThemeColorsRef = React.useRef<string>(JSON.stringify(theme.colors));

  // Sync localColors when theme changes from outside (only if different and not from our own update)
  React.useEffect(() => {
    // Skip if we're in the middle of updating from within this component
    if (isUpdatingRef.current) {
      previousThemeColorsRef.current = JSON.stringify(theme.colors);
      return;
    }

    // Only update if colors actually changed (prevent infinite loop)
    const themeColorsStr = JSON.stringify(theme.colors);
    const previousColorsStr = previousThemeColorsRef.current;

    if (themeColorsStr !== previousColorsStr) {
      setLocalColors(theme.colors);
      previousThemeColorsRef.current = themeColorsStr;
    }

    // Detect which color family is currently active (only update if different)
    let foundFamily: string | null = null;
    for (const group of presetThemeGroups) {
      for (const preset of group.themes) {
        if (theme.mode === preset.mode && JSON.stringify(theme.colors) === JSON.stringify(preset.colors)) {
          foundFamily = group.key;
          break;
        }
      }
      if (foundFamily) break;
    }

    // Only update selectedColorFamily if it changed and we found a match
    // Use functional update to avoid dependency on selectedColorFamily
    setSelectedColorFamily(prev => {
      if (foundFamily && prev !== foundFamily) {
        localStorage.setItem('selected-color-family', foundFamily);
        return foundFamily;
      } else if (!foundFamily && prev !== null) {
        localStorage.removeItem('selected-color-family');
        return null;
      }
      return prev;
    });
  }, [theme.colors, theme.mode]);

  const handleColorChange = (colorKey: keyof typeof theme.colors, value: string) => {
    const newColors = { ...localColors, [colorKey]: value };
    setLocalColors(newColors);
    // Prevent useEffect from interfering
    isUpdatingRef.current = true;
    // Apply immediately for preview
    setTheme({ colors: newColors });
    // Allow useEffect to run again after a short delay
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 100);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save theme with current localColors and customCSS
      // Note: Colors are already applied via handleColorChange, but we save to persist
      await setTheme({
        colors: localColors,
        customCSS: customCSS.trim() || undefined,
      });
      toast.success('Theme saved successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save theme');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    // Reset to default theme based on current mode
    const defaultDarkColors = { primary: '#5865f2', secondary: '#4752c4', background: '#36393f', surface: '#2f3136', text: '#ffffff', textSecondary: '#b9bbbe', border: '#202225', accent: '#5865f2' };
    const defaultLightColors = { primary: '#5865f2', secondary: '#4752c4', background: '#ffffff', surface: '#f8f9fa', text: '#1a1c20', textSecondary: '#6b7280', border: '#e5e7eb', accent: '#5865f2' };

    const defaultColors = isDark ? defaultDarkColors : defaultLightColors;

    // Reset theme
    await setTheme({
      mode: theme.mode, // Keep current mode
      colors: defaultColors as any,
      customCSS: undefined
    });

    setLocalColors(defaultColors as any);
    setCustomCSS('');
    setSelectedColorFamily('default');
    localStorage.setItem('selected-color-family', 'default');
    toast.success('Theme reset to default');
  };

  // Group preset themes by color family
  const presetThemeGroups = [
    {
      name: 'Default',
      key: 'default',
      themes: [
        { name: 'Default Dark', mode: 'dark' as const, colors: { primary: '#5865f2', secondary: '#4752c4', background: '#36393f', surface: '#2f3136', text: '#ffffff', textSecondary: '#b9bbbe', border: '#202225', accent: '#5865f2' } },
        { name: 'Default Light', mode: 'light' as const, colors: { primary: '#5865f2', secondary: '#4752c4', background: '#ffffff', surface: '#f8f9fa', text: '#1a1c20', textSecondary: '#6b7280', border: '#e5e7eb', accent: '#5865f2' } },
      ]
    },
    {
      name: 'Ocean Blue',
      key: 'ocean-blue',
      themes: [
        { name: 'Ocean Blue Dark', mode: 'dark' as const, colors: { primary: '#0ea5e9', secondary: '#0284c7', background: '#0f172a', surface: '#1e293b', text: '#f1f5f9', textSecondary: '#94a3b8', border: '#334155', accent: '#0ea5e9' } },
        { name: 'Ocean Blue Light', mode: 'light' as const, colors: { primary: '#0ea5e9', secondary: '#0284c7', background: '#f0f9ff', surface: '#e0f2fe', text: '#0c4a6e', textSecondary: '#075985', border: '#bae6fd', accent: '#0ea5e9' } },
      ]
    },
    {
      name: 'Forest Green',
      key: 'forest-green',
      themes: [
        { name: 'Forest Green Dark', mode: 'dark' as const, colors: { primary: '#10b981', secondary: '#059669', background: '#064e3b', surface: '#065f46', text: '#d1fae5', textSecondary: '#6ee7b7', border: '#047857', accent: '#10b981' } },
        { name: 'Forest Green Light', mode: 'light' as const, colors: { primary: '#10b981', secondary: '#059669', background: '#ecfdf5', surface: '#d1fae5', text: '#065f46', textSecondary: '#047857', border: '#a7f3d0', accent: '#10b981' } },
      ]
    },
    {
      name: 'Sunset Orange',
      key: 'sunset-orange',
      themes: [
        { name: 'Sunset Orange Dark', mode: 'dark' as const, colors: { primary: '#f97316', secondary: '#ea580c', background: '#431407', surface: '#7c2d12', text: '#fed7aa', textSecondary: '#fdba74', border: '#c2410c', accent: '#f97316' } },
        { name: 'Sunset Orange Light', mode: 'light' as const, colors: { primary: '#f97316', secondary: '#ea580c', background: '#fff7ed', surface: '#ffedd5', text: '#9a3412', textSecondary: '#c2410c', border: '#ffd4a3', accent: '#f97316' } },
      ]
    },
    {
      name: 'Royal Purple',
      key: 'royal-purple',
      themes: [
        { name: 'Royal Purple Dark', mode: 'dark' as const, colors: { primary: '#a855f7', secondary: '#9333ea', background: '#3b0764', surface: '#581c87', text: '#e9d5ff', textSecondary: '#c084fc', border: '#9333ea', accent: '#a855f7' } },
        { name: 'Royal Purple Light', mode: 'light' as const, colors: { primary: '#a855f7', secondary: '#9333ea', background: '#faf5ff', surface: '#f3e8ff', text: '#6b21a8', textSecondary: '#9333ea', border: '#d8b4fe', accent: '#a855f7' } },
      ]
    },
  ];

  // Update colors when mode changes if a color family is selected
  React.useEffect(() => {
    if (selectedColorFamily && theme.mode !== 'system') {
      const family = presetThemeGroups.find(g => g.key === selectedColorFamily);
      if (family) {
        const currentIsDark = theme.mode === 'dark';
        const matchingTheme = family.themes.find(t => {
          const themeIsDark = t.mode === 'dark';
          return themeIsDark === currentIsDark;
        });

        if (matchingTheme) {
          // Only update if colors are different to avoid infinite loops
          const colorsMatch = JSON.stringify(matchingTheme.colors) === JSON.stringify(theme.colors);
          if (!colorsMatch) {
            setTheme({
              mode: theme.mode,
              colors: matchingTheme.colors as any
            });
            setLocalColors(matchingTheme.colors as any);
          }
        }
      }
    }
  }, [theme.mode, selectedColorFamily]);

  return (
    <div className="space-y-6">
      {/* Theme Mode Toggle */}
      <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
        <div className="flex items-center mb-6">
          <Palette className="h-6 w-6 mr-3" style={{ color: theme.colors.primary }} />
          <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>Theme Settings</h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: theme.colors.text }}>Theme Mode</p>
              <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                Choose between light, dark, or system preference
              </p>
            </div>
            <div className="inline-flex items-center rounded-lg p-1" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
              <button
                onClick={async () => {
                  if (selectedColorFamily) {
                    const family = presetThemeGroups.find(g => g.key === selectedColorFamily);
                    if (family) {
                      const lightTheme = family.themes.find(t => t.mode === 'light');
                      if (lightTheme) {
                        await setTheme({
                          mode: 'light',
                          colors: lightTheme.colors as any
                        });
                        setLocalColors(lightTheme.colors as any);
                        return;
                      }
                    }
                  }
                  await setTheme({ mode: 'light' });
                }}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
                style={theme.mode === 'light'
                  ? {
                    backgroundColor: theme.colors.primary,
                    color: '#ffffff',
                    boxShadow: `0 2px 4px ${theme.colors.primary}40`
                  }
                  : {
                    backgroundColor: 'transparent',
                    color: theme.colors.textSecondary
                  }
                }
                onMouseEnter={(e) => {
                  if (theme.mode !== 'light') {
                    e.currentTarget.style.color = theme.colors.text;
                    e.currentTarget.style.backgroundColor = theme.colors.surface;
                  }
                }}
                onMouseLeave={(e) => {
                  if (theme.mode !== 'light') {
                    e.currentTarget.style.color = theme.colors.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                Light
              </button>
              <button
                onClick={async () => {
                  if (selectedColorFamily) {
                    const family = presetThemeGroups.find(g => g.key === selectedColorFamily);
                    if (family) {
                      const darkTheme = family.themes.find(t => t.mode === 'dark');
                      if (darkTheme) {
                        await setTheme({
                          mode: 'dark',
                          colors: darkTheme.colors as any
                        });
                        setLocalColors(darkTheme.colors as any);
                        return;
                      }
                    }
                  }
                  await setTheme({ mode: 'dark' });
                }}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
                style={theme.mode === 'dark'
                  ? {
                    backgroundColor: theme.colors.primary,
                    color: '#ffffff',
                    boxShadow: `0 2px 4px ${theme.colors.primary}40`
                  }
                  : {
                    backgroundColor: 'transparent',
                    color: theme.colors.textSecondary
                  }
                }
                onMouseEnter={(e) => {
                  if (theme.mode !== 'dark') {
                    e.currentTarget.style.color = theme.colors.text;
                    e.currentTarget.style.backgroundColor = theme.colors.surface;
                  }
                }}
                onMouseLeave={(e) => {
                  if (theme.mode !== 'dark') {
                    e.currentTarget.style.color = theme.colors.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                Dark
              </button>
              <button
                onClick={async () => {
                  // Preserve current colors when switching to system mode
                  // If a color family is selected, use the appropriate variant based on system preference
                  if (selectedColorFamily) {
                    const family = presetThemeGroups.find(g => g.key === selectedColorFamily);
                    if (family) {
                      // Determine which variant to use based on system preference
                      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                      const matchingTheme = family.themes.find(t =>
                        (systemPrefersDark && t.mode === 'dark') || (!systemPrefersDark && t.mode === 'light')
                      );
                      if (matchingTheme) {
                        await setTheme({
                          mode: 'system',
                          colors: matchingTheme.colors as any
                        });
                        setLocalColors(matchingTheme.colors as any);
                        return;
                      }
                    }
                  }
                  // If no color family or no matching theme, preserve current colors
                  await setTheme({
                    mode: 'system',
                    colors: theme.colors // Preserve current colors
                  });
                }}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
                style={theme.mode === 'system'
                  ? {
                    backgroundColor: theme.colors.primary,
                    color: '#ffffff',
                    boxShadow: `0 2px 4px ${theme.colors.primary}40`
                  }
                  : {
                    backgroundColor: 'transparent',
                    color: theme.colors.textSecondary
                  }
                }
                onMouseEnter={(e) => {
                  if (theme.mode !== 'system') {
                    e.currentTarget.style.color = theme.colors.text;
                    e.currentTarget.style.backgroundColor = theme.colors.surface;
                  }
                }}
                onMouseLeave={(e) => {
                  if (theme.mode !== 'system') {
                    e.currentTarget.style.color = theme.colors.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                System
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Preset Themes */}
      <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
        <div className="flex items-center mb-2">
          <Palette className="h-5 w-5 mr-2" style={{ color: theme.colors.primary }} />
          <h3 className="text-lg font-semibold" style={{ color: theme.colors.text }}>Preset Themes</h3>
        </div>
        <p className="text-sm mb-6" style={{ color: theme.colors.textSecondary }}>
          Choose from our curated theme presets. Each color family includes both light and dark variants that work together.
        </p>
        <div className="space-y-6">
          {presetThemeGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              <h4 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
                {group.name}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                {group.themes.map((preset, idx) => {
                  const isActive = theme.mode === preset.mode && JSON.stringify(preset.colors) === JSON.stringify(theme.colors);
                  const isFamilySelected = selectedColorFamily === group.key;
                  return (
                    <button
                      key={idx}
                      onClick={async () => {
                        // Prevent useEffect from interfering
                        isUpdatingRef.current = true;
                        try {
                          // Apply both mode and colors together immediately
                          await setTheme({
                            mode: preset.mode,
                            colors: preset.colors as any
                          });
                          setLocalColors(preset.colors as any);
                          // Store the color family
                          setSelectedColorFamily(group.key);
                          localStorage.setItem('selected-color-family', group.key);
                        } finally {
                          // Allow useEffect to run again after a short delay
                          setTimeout(() => {
                            isUpdatingRef.current = false;
                          }, 100);
                        }
                      }}
                      className="p-4 rounded-xl border-2 transition-all duration-200 text-left relative"
                      style={{
                        borderColor: isActive ? preset.colors.primary : (isFamilySelected ? preset.colors.primary + '60' : theme.colors.border),
                        background: preset.colors.surface,
                        boxShadow: isActive ? `0 4px 12px ${preset.colors.primary}30` : (isFamilySelected ? `0 2px 6px ${preset.colors.primary}15` : 'none'),
                        transform: isActive ? 'scale(1.02)' : 'scale(1)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = preset.colors.primary;
                          e.currentTarget.style.boxShadow = `0 2px 8px ${preset.colors.primary}20`;
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = isFamilySelected ? preset.colors.primary + '60' : theme.colors.border;
                          e.currentTarget.style.boxShadow = isFamilySelected ? `0 2px 6px ${preset.colors.primary}15` : 'none';
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-5 h-5 rounded-full border-2"
                          style={{
                            background: preset.colors.primary,
                            borderColor: preset.colors.text
                          }}
                        />
                        <span className="text-sm font-semibold" style={{ color: preset.colors.text }}>
                          {preset.mode === 'dark' ? 'Dark' : 'Light'}
                        </span>
                        {isActive && (
                          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" style={{
                            backgroundColor: preset.colors.primary + '20',
                            color: preset.colors.primary
                          }}>
                            ✓ Active
                          </span>
                        )}
                        {isFamilySelected && !isActive && (
                          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" style={{
                            backgroundColor: preset.colors.primary + '15',
                            color: preset.colors.primary,
                            opacity: 0.7
                          }}>
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        {Object.entries(preset.colors).slice(0, 6).map(([key, color], i) => (
                          <div
                            key={i}
                            className="flex-1 h-10 rounded-md border"
                            style={{
                              background: color,
                              borderColor: preset.colors.border
                            }}
                            title={key}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Color Guide */}
      <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
        <div className="flex items-center mb-2">
          <Info className="h-5 w-5 mr-2" style={{ color: theme.colors.primary }} />
          <h3 className="text-lg font-semibold" style={{ color: theme.colors.text }}>Color Guide</h3>
        </div>
        <p className="text-sm mb-4" style={{ color: theme.colors.textSecondary }}>
          Understanding what each color affects in your dashboard:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.colors.primary }}></div>
                <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>Primary</span>
              </div>
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                Main buttons, links, active states, icons, and brand elements
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.colors.secondary }}></div>
                <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>Secondary</span>
              </div>
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                Hover states for primary buttons, secondary actions, and accents
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.colors.background }}></div>
                <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>Background</span>
              </div>
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                Main page background, body background, and overall app container
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.colors.surface }}></div>
                <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>Surface</span>
              </div>
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                Cards, panels, modals, sidebars, and elevated content areas
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.colors.text }}></div>
                <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>Text</span>
              </div>
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                Primary text, headings, titles, and main content text
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.colors.textSecondary }}></div>
                <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>Text Secondary</span>
              </div>
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                Secondary text, descriptions, labels, placeholders, and muted content
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.colors.border }}></div>
                <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>Border</span>
              </div>
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                Borders, dividers, input fields, cards, and separation lines
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.colors.accent }}></div>
                <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>Accent</span>
              </div>
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                Highlights, badges, notifications, alerts, and special emphasis elements
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Color Customization */}
      <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>Color Customization</h3>
        <p className="text-sm mb-6" style={{ color: theme.colors.textSecondary }}>
          Customize individual colors to match your brand identity. Changes apply immediately for preview.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(localColors).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-2 capitalize" style={{ color: theme.colors.text }}>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={value as string}
                  onChange={(e) => handleColorChange(key as keyof typeof theme.colors, e.target.value)}
                  className="w-16 h-10 rounded-lg cursor-pointer"
                  style={{ border: `1px solid ${theme.colors.border}` }}
                />
                <input
                  type="text"
                  value={value as string}
                  onChange={(e) => handleColorChange(key as keyof typeof theme.colors, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    backgroundColor: theme.colors.background,
                    border: `1px solid ${theme.colors.border}`,
                    color: theme.colors.text,
                    '--tw-ring-color': theme.colors.primary
                  } as any}
                  placeholder="#000000"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom CSS */}
      <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>Custom CSS</h3>
        <p className="text-sm mb-4" style={{ color: theme.colors.textSecondary }}>
          Add custom CSS to further customize your dashboard appearance
        </p>
        <textarea
          value={customCSS}
          onChange={(e) => setCustomCSS(e.target.value)}
          className="w-full h-48 px-4 py-3 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 resize-none transition-colors"
          style={{
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.text,
            '--tw-ring-color': theme.colors.primary
          } as any}
          placeholder="/* Add your custom CSS here */&#10;.custom-class {&#10;  /* styles */&#10;}"
        />
        <p className="text-xs mt-2" style={{ color: theme.colors.textSecondary }}>
          Note: Custom CSS will be applied globally. Use with caution.
        </p>
      </div>

      {/* Preview */}
      <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>Preview</h3>
        <div
          className="p-6 rounded-lg border-2"
          style={{
            background: localColors.background,
            borderColor: localColors.border,
          }}
        >
          <div className="space-y-4">
            <div
              className="p-4 rounded-lg"
              style={{ background: localColors.surface }}
            >
              <h4 className="text-lg font-semibold mb-2" style={{ color: localColors.text }}>
                Sample Card Title
              </h4>
              <p className="text-sm mb-4" style={{ color: localColors.textSecondary }}>
                This is a preview of how your theme will look. Adjust colors to match your brand.
              </p>
              <button
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: localColors.primary,
                  color: '#ffffff',
                }}
              >
                Primary Button
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: `${localColors.accent}20`,
                  color: localColors.accent,
                }}
              >
                Badge
              </div>
              <div
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: `${localColors.secondary}20`,
                  color: localColors.secondary,
                }}
              >
                Secondary Badge
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleReset}
          className="px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
          style={{
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            border: `1px solid ${theme.colors.border}`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.background;
            e.currentTarget.style.borderColor = theme.colors.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.surface;
            e.currentTarget.style.borderColor = theme.colors.border;
          }}
        >
          <SettingsIcon className="h-4 w-4" />
          Reset to Default
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              backgroundColor: theme.colors.primary,
              color: '#ffffff'
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.backgroundColor = theme.colors.secondary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaving) {
                e.currentTarget.style.backgroundColor = theme.colors.primary;
              }
            }}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Theme'}
          </button>
        </div>
      </div>
    </div >
  );
}

export default function SettingsPage() {
  const { theme } = useTheme();
  const { visibility: taskbarVisibility, setVisibility: setTaskbarVisibility } = useTaskbar();
  const queryClient = useQueryClient();
  const { isAuthenticated, accessToken, _hasHydrated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'security' | 'notifications' | 'general' | 'theme' | 'compliance'>('security');
  const [panNumber, setPanNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [ipWhitelist, setIpWhitelist] = useState('');
  const [isSavingTax, setIsSavingTax] = useState(false);
  const [isSavingIp, setIsSavingIp] = useState(false);

  const { data: organization, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const response = await api.get('/organizations/me');
      return response.data;
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
  });

  const { data: stats } = useQuery({
    queryKey: ['organization-stats'],
    queryFn: async () => {
      const response = await api.get('/organizations/me/stats');
      return response.data;
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken,
  });

  const isOrganizationOwner = organization?.current_user_role?.is_organization_owner || false;

  // Pre-populate compliance fields from org data
  useEffect(() => {
    if (organization) {
      setPanNumber(organization.pan_number || '');
      setVatNumber(organization.vat_number || '');
      setIpWhitelist((organization.ip_whitelist || []).join('\n'));
    }
  }, [organization]);

  const { data: notificationPreferences, isLoading: isLoadingPrefs } = useQuery({
    queryKey: ['notification-preferences', 'organization'],
    queryFn: async () => {
      const response = await api.get('/notifications/preferences', {
        params: { scope: 'organization' },
      });
      return response.data;
    },
    enabled: _hasHydrated && isAuthenticated && !!accessToken && isOrganizationOwner,
  });

  const updateNotificationPreferencesMutation = useMutation({
    mutationFn: async (data: {
      email_enabled?: boolean;
      in_app_enabled?: boolean;
      preferences?: Record<string, { email: boolean; in_app: boolean }>;
      scope?: 'personal' | 'organization';
    }) => {
      const response = await api.put('/notifications/preferences', {
        ...data,
        scope: 'organization',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Notification preferences updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update notification preferences');
    },
  });

  const switchOrganizationMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const response = await api.put('/organizations/switch', { organization_id: organizationId });
      return response.data;
    },
    onSuccess: (data) => {
      // Update auth store with new tokens and organization
      useAuthStore.getState().setAuth(
        { access_token: data.access_token, refresh_token: data.refresh_token },
        data.user,
        data.organization
      );
      toast.success(`Switched to ${data.organization.name}`);
      // Redirect to dashboard or refresh page
      window.location.href = '/dashboard';
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to switch organization');
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { mfa_enabled?: boolean }) => {
      const response = await api.put('/organizations/me/settings', data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      if (variables.mfa_enabled) {
        if (data.requires_mfa_setup && data.temp_setup_token) {
          localStorage.setItem('mfa_setup_token', data.temp_setup_token);
          toast.success('MFA enabled. Please set up 2FA to continue.');
          setTimeout(() => {
            window.location.href = '/mfa/setup';
          }, 500);
        } else {
          toast.success('MFA enabled. All users will need to set up 2FA.');
        }
      } else {
        toast.success('Settings updated successfully');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    },
  });

  if (isLoadingOrg) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: theme.colors.background }}>
        <div style={{ color: theme.colors.textSecondary }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: theme.colors.background }}>
      {/* Header */}
      <div className="px-6 py-4 flex-shrink-0" style={{ backgroundColor: theme.colors.surface, borderBottom: `1px solid ${theme.colors.border}` }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg" style={{ backgroundColor: theme.colors.primary }}>
            <SettingsIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Settings</h1>
            <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Manage your organization and account settings</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('security')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap"
            style={activeTab === 'security'
              ? { backgroundColor: theme.colors.surface, color: theme.colors.text, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }
              : { color: theme.colors.textSecondary }
            }
            onMouseEnter={(e) => {
              if (activeTab !== 'security') {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
                e.currentTarget.style.color = theme.colors.text;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'security') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.colors.textSecondary;
              }
            }}
          >
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium text-sm">Security</span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap"
            style={activeTab === 'notifications'
              ? { backgroundColor: theme.colors.surface, color: theme.colors.text, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }
              : { color: theme.colors.textSecondary }
            }
            onMouseEnter={(e) => {
              if (activeTab !== 'notifications') {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
                e.currentTarget.style.color = theme.colors.text;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'notifications') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.colors.textSecondary;
              }
            }}
          >
            <Bell className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium text-sm">Notifications</span>
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap"
            style={activeTab === 'general'
              ? { backgroundColor: theme.colors.surface, color: theme.colors.text, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }
              : { color: theme.colors.textSecondary }
            }
            onMouseEnter={(e) => {
              if (activeTab !== 'general') {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
                e.currentTarget.style.color = theme.colors.text;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'general') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.colors.textSecondary;
              }
            }}
          >
            <Globe className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium text-sm">General</span>
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap"
            style={activeTab === 'theme'
              ? { backgroundColor: theme.colors.surface, color: theme.colors.text, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }
              : { color: theme.colors.textSecondary }
            }
            onMouseEnter={(e) => {
              if (activeTab !== 'theme') {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
                e.currentTarget.style.color = theme.colors.text;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'theme') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.colors.textSecondary;
              }
            }}
          >
            <Palette className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium text-sm">Theme</span>
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap"
            style={activeTab === 'compliance'
              ? { backgroundColor: theme.colors.surface, color: theme.colors.text, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }
              : { color: theme.colors.textSecondary }
            }
            onMouseEnter={(e) => {
              if (activeTab !== 'compliance') {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
                e.currentTarget.style.color = theme.colors.text;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'compliance') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.colors.textSecondary;
              }
            }}
          >
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium text-sm">Compliance</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                <div className="flex items-center mb-6">
                  <Shield className="h-6 w-6 mr-3" style={{ color: theme.colors.primary }} />
                  <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>Security Settings</h2>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-4" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: theme.colors.text }}>Enable 2FA/MFA</p>
                      <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                        Require two-factor authentication for all users in this organization
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={organization?.mfa_enabled || false}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({ mfa_enabled: e.target.checked });
                        }}
                        disabled={updateSettingsMutation.isPending}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-disabled:opacity-50" style={{ backgroundColor: theme.colors.border }}></div>
                      <style>{`
                        .peer:checked ~ div {
                          background-color: ${theme.colors.primary} !important;
                        }
                        .peer:focus ~ div {
                          box-shadow: 0 0 0 4px ${theme.colors.primary}33;
                        }
                      `}</style>
                    </label>
                  </div>

                  <div className="py-4" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                    <div className="flex items-start">
                      <Lock className="h-5 w-5 mr-3 mt-0.5" style={{ color: theme.colors.textSecondary }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: theme.colors.text }}>Password Policy</p>
                        <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                          Configure password requirements for organization users
                        </p>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center text-sm" style={{ color: theme.colors.textSecondary }}>
                            <CheckCircle2 className="h-4 w-4 text-[#23a55a] mr-2" />
                            Minimum 8 characters required
                          </div>
                          <div className="flex items-center text-sm" style={{ color: theme.colors.textSecondary }}>
                            <CheckCircle2 className="h-4 w-4 text-[#23a55a] mr-2" />
                            Password complexity enforced
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="py-4">
                    <div className="flex items-start">
                      <Users className="h-5 w-5 mr-3 mt-0.5" style={{ color: theme.colors.textSecondary }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: theme.colors.text }}>Session Management</p>
                        <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                          Manage user sessions and access tokens
                        </p>
                        <div className="mt-3">
                          <Link
                            to="/audit-logs"
                            className="text-sm inline-flex items-center"
                            style={{ color: theme.colors.primary }}
                            onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.secondary}
                            onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.primary}
                          >
                            View active sessions →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#faa61a' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: theme.colors.text }}>Security Recommendations</p>
                    <ul className="mt-2 space-y-1 text-sm" style={{ color: theme.colors.textSecondary }}>
                      {!organization?.mfa_enabled && (
                        <li>• Enable 2FA/MFA to enhance security</li>
                      )}
                      <li>• Regularly review audit logs for suspicious activity</li>
                      <li>• Keep user roles and permissions up to date</li>
                      <li>• Remove access for users who no longer need it</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {!isOrganizationOwner ? (
                <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6" style={{ color: '#faa61a' }} />
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: theme.colors.text }}>Access Restricted</h3>
                      <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                        Only organization owners can manage organization notification preferences.
                      </p>
                      <p className="text-sm mt-2" style={{ color: theme.colors.textSecondary }}>
                        You can manage your personal notification preferences in your <Link to="/profile" className="underline" style={{ color: theme.colors.primary }} onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.secondary} onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.primary}>Profile</Link> page.
                      </p>
                    </div>
                  </div>
                </div>
              ) : isLoadingPrefs ? (
                <div className="rounded-lg p-6 animate-pulse" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                  <div className="h-64 rounded" style={{ backgroundColor: theme.colors.background }}></div>
                </div>
              ) : (
                <>
                  <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                    <div className="mb-4">
                      <h3 className="text-sm font-medium" style={{ color: theme.colors.text }}>Organization Notification Preferences</h3>
                      <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                        These settings apply to all notifications sent to the organization. Only organization owners can manage these preferences.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.primary + '1A', border: `1px solid ${theme.colors.primary}33` }}>
                      <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                        <strong style={{ color: theme.colors.text }}>Note:</strong> Personal notification preferences can be managed in your <Link to="/profile" className="underline" style={{ color: theme.colors.primary }} onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.secondary} onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.primary}>Profile</Link> page.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                    <div className="flex items-center mb-6">
                      <Bell className="h-6 w-6 mr-3" style={{ color: theme.colors.primary }} />
                      <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>
                        Organization Notification Preferences
                      </h2>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-4" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                          <div>
                            <p className="text-sm font-medium" style={{ color: theme.colors.text }}>Global Email Notifications</p>
                            <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                              Master toggle for all email notifications
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPreferences?.email_enabled ?? true}
                              onChange={(e) => {
                                updateNotificationPreferencesMutation.mutate({
                                  email_enabled: e.target.checked,
                                  in_app_enabled: notificationPreferences?.in_app_enabled ?? true,
                                  preferences: notificationPreferences?.preferences || {},
                                });
                              }}
                              disabled={updateNotificationPreferencesMutation.isPending}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-disabled:opacity-50" style={{ backgroundColor: theme.colors.border }}></div>
                            <style>{`
                              .peer:checked ~ div {
                                background-color: ${theme.colors.primary} !important;
                              }
                              .peer:focus ~ div {
                                box-shadow: 0 0 0 4px ${theme.colors.primary}33;
                              }
                            `}</style>
                          </label>
                        </div>

                        <div className="flex items-center justify-between pb-4" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                          <div>
                            <p className="text-sm font-medium" style={{ color: theme.colors.text }}>Global In-App Notifications</p>
                            <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                              Master toggle for all in-app notifications
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPreferences?.in_app_enabled ?? true}
                              onChange={(e) => {
                                updateNotificationPreferencesMutation.mutate({
                                  email_enabled: notificationPreferences?.email_enabled ?? true,
                                  in_app_enabled: e.target.checked,
                                  preferences: notificationPreferences?.preferences || {},
                                });
                              }}
                              disabled={updateNotificationPreferencesMutation.isPending}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-disabled:opacity-50" style={{ backgroundColor: theme.colors.border }}></div>
                            <style>{`
                              .peer:checked ~ div {
                                background-color: ${theme.colors.primary} !important;
                              }
                              .peer:focus ~ div {
                                box-shadow: 0 0 0 4px ${theme.colors.primary}33;
                              }
                            `}</style>
                          </label>
                        </div>
                      </div>

                      <div>
                        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: theme.colors.primary + '1A', border: `1px solid ${theme.colors.primary}33` }}>
                          <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                            <strong style={{ color: theme.colors.text }}>Important Notifications:</strong> Security alerts, MFA changes, user access revocation, and package upgrades are always sent regardless of preferences.
                          </p>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold" style={{ color: theme.colors.text }}>Notification Types</h3>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                const allEnabled = {
                                  user_invitations: { email: true, in_app: true },
                                  role_changes: { email: true, in_app: true },
                                  security_alerts: { email: true, in_app: true },
                                };
                                updateNotificationPreferencesMutation.mutate({
                                  email_enabled: notificationPreferences?.email_enabled ?? true,
                                  in_app_enabled: notificationPreferences?.in_app_enabled ?? true,
                                  preferences: allEnabled,
                                });
                              }}
                              className="text-xs px-3 py-1.5 rounded-md transition-colors"
                              style={{ backgroundColor: theme.colors.primary, color: '#ffffff' }}
                              onMouseEnter={(e) => {
                                if (!updateNotificationPreferencesMutation.isPending) {
                                  e.currentTarget.style.backgroundColor = theme.colors.secondary;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!updateNotificationPreferencesMutation.isPending) {
                                  e.currentTarget.style.backgroundColor = theme.colors.primary;
                                }
                              }}
                              disabled={updateNotificationPreferencesMutation.isPending}
                            >
                              Select All
                            </button>
                            <button
                              onClick={() => {
                                const allDisabled = {
                                  user_invitations: { email: false, in_app: false },
                                  role_changes: { email: false, in_app: false },
                                  security_alerts: { email: false, in_app: false },
                                };
                                updateNotificationPreferencesMutation.mutate({
                                  email_enabled: notificationPreferences?.email_enabled ?? true,
                                  in_app_enabled: notificationPreferences?.in_app_enabled ?? true,
                                  preferences: allDisabled,
                                });
                              }}
                              className="text-xs px-3 py-1.5 rounded-md transition-colors"
                              style={{ backgroundColor: theme.colors.surface, color: theme.colors.textSecondary, border: `1px solid ${theme.colors.border}` }}
                              onMouseEnter={(e) => {
                                if (!updateNotificationPreferencesMutation.isPending) {
                                  e.currentTarget.style.backgroundColor = theme.colors.background;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!updateNotificationPreferencesMutation.isPending) {
                                  e.currentTarget.style.backgroundColor = theme.colors.surface;
                                }
                              }}
                              disabled={updateNotificationPreferencesMutation.isPending}
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>

                        {/* Notification type toggles - simplified for space */}
                        <div className="space-y-4">
                          {['user_invitations', 'role_changes', 'security_alerts'].map((type) => (
                            <div key={type} className="py-4 last:border-0" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="text-sm font-medium capitalize" style={{ color: theme.colors.text }}>
                                    {type.replace('_', ' ')}
                                  </p>
                                  <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                                    {type === 'security_alerts' ? 'Always sent (critical)' : 'Notify when this occurs'}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm" style={{ color: theme.colors.textSecondary }}>Email</span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={notificationPreferences?.preferences?.[type]?.email ?? true}
                                      onChange={(e) => {
                                        const prefs = notificationPreferences?.preferences || {};
                                        updateNotificationPreferencesMutation.mutate({
                                          email_enabled: notificationPreferences?.email_enabled ?? true,
                                          in_app_enabled: notificationPreferences?.in_app_enabled ?? true,
                                          preferences: {
                                            ...prefs,
                                            [type]: {
                                              email: e.target.checked,
                                              in_app: prefs[type]?.in_app ?? true,
                                            },
                                          },
                                        });
                                      }}
                                      disabled={updateNotificationPreferencesMutation.isPending}
                                      className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-disabled:opacity-50" style={{ backgroundColor: theme.colors.border }}></div>
                                    <style>{`
                                      .peer:checked ~ div {
                                        background-color: ${theme.colors.primary} !important;
                                      }
                                      .peer:focus ~ div {
                                        box-shadow: 0 0 0 4px ${theme.colors.primary}33;
                                      }
                                    `}</style>
                                  </label>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm" style={{ color: theme.colors.textSecondary }}>In-App</span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={notificationPreferences?.preferences?.[type]?.in_app ?? true}
                                      onChange={(e) => {
                                        const prefs = notificationPreferences?.preferences || {};
                                        updateNotificationPreferencesMutation.mutate({
                                          email_enabled: notificationPreferences?.email_enabled ?? true,
                                          in_app_enabled: notificationPreferences?.in_app_enabled ?? true,
                                          preferences: {
                                            ...prefs,
                                            [type]: {
                                              email: prefs[type]?.email ?? true,
                                              in_app: e.target.checked,
                                            },
                                          },
                                        });
                                      }}
                                      disabled={updateNotificationPreferencesMutation.isPending}
                                      className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-disabled:opacity-50" style={{ backgroundColor: theme.colors.border }}></div>
                                    <style>{`
                                      .peer:checked ~ div {
                                        background-color: ${theme.colors.primary} !important;
                                      }
                                      .peer:focus ~ div {
                                        box-shadow: 0 0 0 4px ${theme.colors.primary}33;
                                      }
                                    `}</style>
                                  </label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                    <div className="flex items-center mb-4">
                      <Mail className="h-6 w-6 mr-3" style={{ color: theme.colors.primary }} />
                      <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>Email Settings</h2>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>
                          Notification Email
                        </label>
                        <input
                          type="email"
                          value={organization?.email || ''}
                          disabled
                          className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors"
                          style={{
                            backgroundColor: theme.colors.background,
                            border: `1px solid ${theme.colors.border}`,
                            color: theme.colors.text,
                            '--tw-ring-color': theme.colors.primary
                          } as any}
                        />
                        <p className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                          Organization email address for notifications
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                <div className="flex items-center mb-6">
                  <Info className="h-6 w-6 mr-3" style={{ color: theme.colors.primary }} />
                  <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>Organization Information</h2>
                </div>
                {organization && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Organization Name</p>
                        <p className="text-base font-medium" style={{ color: theme.colors.text }}>{organization.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Email</p>
                        <p className="text-base font-medium" style={{ color: theme.colors.text }}>{organization.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Status</p>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full" style={
                          organization.status === 'active'
                            ? { backgroundColor: '#23a55a33', color: '#23a55a' }
                            : organization.status === 'suspended'
                              ? { backgroundColor: '#faa61a33', color: '#faa61a' }
                              : { backgroundColor: theme.colors.surface, color: theme.colors.textSecondary }
                        }>
                          {organization.status || 'Active'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Created</p>
                        <p className="text-base font-medium" style={{ color: theme.colors.text }}>
                          {organization.created_at
                            ? new Date(organization.created_at).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="pt-4" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                      <Link
                        to="/organizations"
                        className="text-sm inline-flex items-center"
                        style={{ color: theme.colors.primary }}
                        onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.secondary}
                        onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.primary}
                      >
                        Manage organization details →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                <div className="flex items-center mb-6">
                  <Globe className="h-6 w-6 mr-3" style={{ color: theme.colors.primary }} />
                  <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>Regional Settings</h2>
                </div>
                {organization && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>
                          Default Currency
                        </label>
                        <select
                          value={organization.currency || 'USD'}
                          onChange={async (e) => {
                            try {
                              await api.put('/organizations/me', { currency: e.target.value });
                              queryClient.invalidateQueries({ queryKey: ['organization'] });
                              toast.success('Currency updated');
                            } catch (err) {
                              toast.error('Failed to update currency');
                            }
                          }}
                          className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors"
                          style={{
                            backgroundColor: theme.colors.background,
                            border: `1px solid ${theme.colors.border}`,
                            color: theme.colors.text,
                            '--tw-ring-color': theme.colors.primary
                          } as any}
                        >
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="INR">INR - Indian Rupee</option>
                          <option value="NPR">NPR - Nepalese Rupee</option>
                          <option value="AUD">AUD - Australian Dollar</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>
                          Country
                        </label>
                        <input
                          type="text"
                          value={organization.country || ''}
                          onChange={() => { }} // Controlled by onBlur save
                          onBlur={async (e) => {
                            if (e.target.value !== organization.country) {
                              try {
                                await api.put('/organizations/me', { country: e.target.value });
                                queryClient.invalidateQueries({ queryKey: ['organization'] });
                                toast.success('Country updated');
                              } catch (err) {
                                toast.error('Failed to update country');
                              }
                            }
                          }}
                          className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors"
                          style={{
                            backgroundColor: theme.colors.background,
                            border: `1px solid ${theme.colors.border}`,
                            color: theme.colors.text,
                            '--tw-ring-color': theme.colors.primary
                          } as any}
                          placeholder="e.g. Nepal, USA"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                <div className="flex items-center mb-6">
                  <Database className="h-6 w-6 mr-3" style={{ color: theme.colors.primary }} />
                  <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>Usage & Limits</h2>
                </div>
                {stats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Total Users</p>
                        <p className="text-2xl font-semibold" style={{ color: theme.colors.text }}>
                          {stats.total_users || 0} / {formatLimit(stats.user_limit)}
                        </p>
                        <div className="mt-2 w-full rounded-full h-2" style={{ backgroundColor: theme.colors.background }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(stats.user_usage_percentage || 0, 100)}%`,
                              backgroundColor: (stats.user_usage_percentage || 0) >= 90 ? '#ed4245' :
                                (stats.user_usage_percentage || 0) >= 75 ? '#faa61a' : theme.colors.primary
                            }}
                          ></div>
                        </div>
                        <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                          {stats.user_usage_percentage || 0}% used
                        </p>
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Total Roles</p>
                        <p className="text-2xl font-semibold" style={{ color: theme.colors.text }}>
                          {stats.total_roles || 0} / {formatLimit(stats.role_limit)}
                        </p>
                        <div className="mt-2 w-full rounded-full h-2" style={{ backgroundColor: theme.colors.background }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(stats.role_usage_percentage || 0, 100)}%`,
                              backgroundColor: (stats.role_usage_percentage || 0) >= 90 ? '#ed4245' :
                                (stats.role_usage_percentage || 0) >= 75 ? '#faa61a' : '#23a55a'
                            }}
                          ></div>
                        </div>
                        <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                          {stats.role_usage_percentage || 0}% used
                        </p>
                      </div>
                    </div>
                    <div className="pt-4" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                      <Link
                        to="/packages"
                        className="text-sm inline-flex items-center"
                        style={{ color: theme.colors.primary }}
                        onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.secondary}
                        onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.primary}
                      >
                        View package details and upgrade options →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Loading usage statistics...</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                <div className="flex items-center mb-6">
                  <SettingsIcon className="h-6 w-6 mr-3" style={{ color: theme.colors.primary }} />
                  <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>User Preferences</h2>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-4" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: theme.colors.text }}>Taskbar Visibility</p>
                      <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                        Choose how the taskbar behaves: always visible or show on hover
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTaskbarVisibility('always')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${taskbarVisibility === 'always'
                          ? 'text-white'
                          : 'text-gray-600'
                          }`}
                        style={
                          taskbarVisibility === 'always'
                            ? { backgroundColor: theme.colors.primary }
                            : { backgroundColor: theme.colors.border, color: theme.colors.textSecondary }
                        }
                        onMouseEnter={(e) => {
                          if (taskbarVisibility !== 'always') {
                            e.currentTarget.style.backgroundColor = theme.colors.surface;
                            e.currentTarget.style.color = theme.colors.text;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (taskbarVisibility !== 'always') {
                            e.currentTarget.style.backgroundColor = theme.colors.border;
                            e.currentTarget.style.color = theme.colors.textSecondary;
                          }
                        }}
                      >
                        Always Show
                      </button>
                      <button
                        onClick={() => setTaskbarVisibility('hover')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${taskbarVisibility === 'hover'
                          ? 'text-white'
                          : 'text-gray-600'
                          }`}
                        style={
                          taskbarVisibility === 'hover'
                            ? { backgroundColor: theme.colors.primary }
                            : { backgroundColor: theme.colors.border, color: theme.colors.textSecondary }
                        }
                        onMouseEnter={(e) => {
                          if (taskbarVisibility !== 'hover') {
                            e.currentTarget.style.backgroundColor = theme.colors.surface;
                            e.currentTarget.style.color = theme.colors.text;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (taskbarVisibility !== 'hover') {
                            e.currentTarget.style.backgroundColor = theme.colors.border;
                            e.currentTarget.style.color = theme.colors.textSecondary;
                          }
                        }}
                      >
                        Show on Hover
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                <div className="flex items-center mb-6">
                  <Users className="h-6 w-6 mr-3" style={{ color: theme.colors.primary }} />
                  <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>Quick Actions</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link
                    to="/users"
                    className="p-4 rounded-lg transition-colors"
                    style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.primary;
                      e.currentTarget.style.backgroundColor = theme.colors.primary + '1A';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.border;
                      e.currentTarget.style.backgroundColor = theme.colors.background;
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: theme.colors.text }}>Manage Users</p>
                    <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>View and manage organization users</p>
                  </Link>
                  <Link
                    to="/roles"
                    className="p-4 rounded-lg transition-colors"
                    style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.primary;
                      e.currentTarget.style.backgroundColor = theme.colors.primary + '1A';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.border;
                      e.currentTarget.style.backgroundColor = theme.colors.background;
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: theme.colors.text }}>Manage Roles</p>
                    <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>Configure roles and permissions</p>
                  </Link>
                  <Link
                    to="/invitations"
                    className="p-4 rounded-lg transition-colors"
                    style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.primary;
                      e.currentTarget.style.backgroundColor = theme.colors.primary + '1A';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.border;
                      e.currentTarget.style.backgroundColor = theme.colors.background;
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: theme.colors.text }}>Invitations</p>
                    <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>Send and manage user invitations</p>
                  </Link>
                  <Link
                    to="/audit-logs"
                    className="p-4 rounded-lg transition-colors"
                    style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.primary;
                      e.currentTarget.style.backgroundColor = theme.colors.primary + '1A';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.border;
                      e.currentTarget.style.backgroundColor = theme.colors.background;
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: theme.colors.text }}>Audit Logs</p>
                    <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>View organization activity logs</p>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <ThemeCustomizationTab organization={organization} />
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="space-y-6 max-w-2xl">
              {/* Tax & Compliance */}
              <div className="rounded-xl p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                <h3 className="text-lg font-semibold mb-1" style={{ color: theme.colors.text }}>Tax & Compliance</h3>
                <p className="text-sm mb-4" style={{ color: theme.colors.textSecondary }}>Nepal-specific tax registration numbers (9 digits each).</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>PAN Number</label>
                    <input
                      type="text"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      placeholder="9-digit PAN number"
                      maxLength={9}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                      style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}`, color: theme.colors.text }}
                    />
                    {panNumber && panNumber.length !== 9 && (
                      <p className="text-xs mt-1" style={{ color: '#dc2626' }}>PAN must be exactly 9 digits</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>VAT Number</label>
                    <input
                      type="text"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      placeholder="9-digit VAT number"
                      maxLength={9}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                      style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}`, color: theme.colors.text }}
                    />
                    {vatNumber && vatNumber.length !== 9 && (
                      <p className="text-xs mt-1" style={{ color: '#dc2626' }}>VAT must be exactly 9 digits</p>
                    )}
                  </div>
                  <button
                    disabled={isSavingTax || (!!panNumber && panNumber.length !== 9) || (!!vatNumber && vatNumber.length !== 9)}
                    onClick={async () => {
                      setIsSavingTax(true);
                      try {
                        await api.put('/organizations/me/tax-info', { pan_number: panNumber || undefined, vat_number: vatNumber || undefined });
                        toast.success('Tax info saved');
                      } catch {
                        toast.error('Failed to save tax info');
                      } finally {
                        setIsSavingTax(false);
                      }
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    {isSavingTax ? 'Saving...' : 'Save Tax Info'}
                  </button>
                </div>
              </div>

              {/* IP Whitelist */}
              <div className="rounded-xl p-6" style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
                <h3 className="text-lg font-semibold mb-1" style={{ color: theme.colors.text }}>IP Whitelist</h3>
                <p className="text-sm mb-4" style={{ color: theme.colors.textSecondary }}>
                  Restrict access to your organization to specific IP addresses. Leave empty to allow all IPs.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>Allowed IP Addresses (one per line)</label>
                  <textarea
                    value={ipWhitelist}
                    onChange={(e) => setIpWhitelist(e.target.value)}
                    placeholder={'192.168.1.1\n10.0.0.1\n2001:db8::1'}
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono focus:outline-none resize-y"
                    style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}`, color: theme.colors.text }}
                  />
                  <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                    Supports IPv4 and IPv6 addresses. Current requests come from your browser's IP.
                  </p>
                </div>
                <button
                  disabled={isSavingIp}
                  onClick={async () => {
                    setIsSavingIp(true);
                    try {
                      const ips = ipWhitelist.split('\n').map((s) => s.trim()).filter(Boolean);
                      await api.put('/organizations/me/ip-whitelist', { ips });
                      toast.success('IP whitelist saved');
                    } catch {
                      toast.error('Failed to save IP whitelist');
                    } finally {
                      setIsSavingIp(false);
                    }
                  }}
                  className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  {isSavingIp ? 'Saving...' : 'Save IP Whitelist'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

