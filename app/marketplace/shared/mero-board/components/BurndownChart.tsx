import React from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';

interface BurndownChartProps {
    data: {
        labels: string[];
        ideal_burn: number[];
        actual_burn: number[];
    };
    height?: number;
}

export default function BurndownChart({ data, height = 300 }: BurndownChartProps) {
    const { theme } = useTheme();

    if (!data || data.labels.length === 0) {
        return <div className="flex items-center justify-center h-[300px] opacity-50">No data available</div>;
    }

    const { labels, ideal_burn, actual_burn } = data;
    const maxVal = Math.max(...ideal_burn, ...actual_burn, 1);
    const padding = 40;
    const width = 800; // Reference width

    const getX = (index: number) => (index / (labels.length - 1)) * (width - padding * 2) + padding;
    const getY = (val: number) => (1 - val / maxVal) * (height - padding * 2) + padding;

    // Generate paths
    const idealPath = ideal_burn.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`).join(' ');
    const actualPath = actual_burn.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`).join(' ');

    return (
        <div className="w-full overflow-x-auto">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full min-w-[600px]"
                style={{ height }}
            >
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((p) => {
                    const y = getY(maxVal * p);
                    return (
                        <g key={p}>
                            <line
                                x1={padding}
                                y1={y}
                                x2={width - padding}
                                y2={y}
                                stroke={theme.colors.border}
                                strokeDasharray="4 4"
                                strokeOpacity="0.3"
                            />
                            <text
                                x={padding - 10}
                                y={y}
                                textAnchor="end"
                                alignmentBaseline="middle"
                                fontSize="10"
                                fill={theme.colors.textSecondary}
                            >
                                {Math.round(maxVal * p)}
                            </text>
                        </g>
                    );
                })}

                {/* X-axis labels */}
                {labels.map((label, i) => {
                    if (labels.length > 10 && i % Math.floor(labels.length / 5) !== 0) return null;
                    return (
                        <text
                            key={i}
                            x={getX(i)}
                            y={height - padding + 20}
                            textAnchor="middle"
                            fontSize="10"
                            fill={theme.colors.textSecondary}
                        >
                            {new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </text>
                    );
                })}

                {/* Ideal Burn Line */}
                <path
                    d={idealPath}
                    fill="none"
                    stroke={theme.colors.textSecondary}
                    strokeWidth="2"
                    strokeDasharray="5 5"
                    strokeOpacity="0.5"
                />

                {/* Actual Burn Line */}
                <path
                    d={actualPath}
                    fill="none"
                    stroke={theme.colors.primary}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-sm"
                />

                {/* Legend */}
                <g transform={`translate(${width - 150}, 20)`}>
                    <line x1="0" y1="0" x2="20" y2="0" stroke={theme.colors.textSecondary} strokeWidth="2" strokeDasharray="5 5" strokeOpacity="0.5" />
                    <text x="25" y="4" fontSize="10" fill={theme.colors.textSecondary}>Ideal Burn</text>

                    <line x1="0" y1="20" x2="20" y2="20" stroke={theme.colors.primary} strokeWidth="3" />
                    <text x="25" y="24" fontSize="10" fill={theme.colors.textSecondary}>Actual Burn</text>
                </g>
            </svg>
        </div>
    );
}
