import React, { useState, useEffect } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Card, Button, Loading, Badge } from '@shared';
import { ArrowLeft, Filter, Download, Database, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';

// APIs
import { leadsApi } from '../../api/leads';
import { dealsApi } from '../../api/deals';
import { activitiesApi } from '../../api/activities';

type EntityType = 'LEADS' | 'DEALS' | 'ACTIVITIES';

export default function CustomReportBuilder() {
    const { theme } = useTheme();
    const { buildHref } = useAppContext();

    const [entity, setEntity] = useState<EntityType>('LEADS');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Dynamic columns based on the selected entity's data structure
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

    useEffect(() => {
        fetchData(entity);
    }, [entity]);

    const fetchData = async (targetEntity: EntityType) => {
        try {
            setLoading(true);
            let result: any[] = [];

            if (targetEntity === 'LEADS') {
                result = await leadsApi.getLeads();
            } else if (targetEntity === 'DEALS') {
                result = await dealsApi.getDeals();
            } else if (targetEntity === 'ACTIVITIES') {
                // For a global activity pull, we might need a generic endpoint, 
                // but we'll try pulling without specific lead/deal IDs if the backend supports it.
                // If not, this might return empty or error.
                result = await activitiesApi.getActivities();
            }

            setData(result);

            // Extract unique keys from the first few objects to use as available columns
            if (result.length > 0) {
                const keys = new Set<string>();
                // Sample up to 10 records to find generic keys
                result.slice(0, 10).forEach(record => {
                    Object.keys(record).forEach(k => {
                        // Skip complex nested objects for a simple table view, except specific ones
                        if (typeof record[k] !== 'object' || record[k] === null) {
                            keys.add(k);
                        }
                    });
                });

                const cols = Array.from(keys);
                setAvailableColumns(cols);
                // Default select the first 5 columns to not overwhelm the UI
                setSelectedColumns(cols.slice(0, 5));
            } else {
                setAvailableColumns([]);
                setSelectedColumns([]);
            }

        } catch (error: any) {
            console.error("Failed to fetch custom report data", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleColumn = (col: string) => {
        if (selectedColumns.includes(col)) {
            setSelectedColumns(prev => prev.filter(c => c !== col));
        } else {
            setSelectedColumns(prev => [...prev, col]);
        }
    };

    const handleExportCSV = () => {
        if (data.length === 0 || selectedColumns.length === 0) return;

        // Create CSV Headers
        const headers = selectedColumns.join(',');

        // Create CSV Rows
        const rows = data.map(record => {
            return selectedColumns.map(col => {
                let cellValue = record[col];
                // Handle basic formatting
                if (cellValue === null || cellValue === undefined) cellValue = '';
                // Escape quotes and wrap in quotes if there's a comma
                cellValue = String(cellValue).replace(/"/g, '""');
                if (cellValue.includes(',')) cellValue = `"${cellValue}"`;
                return cellValue;
            }).join(',');
        });

        const csvContent = [headers, ...rows].join('\n');

        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `MeroCRM_CustomReport_${entity}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-6 flex flex-col h-[calc(100vh-4rem)] animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0 border-b pb-6" style={{ borderColor: theme.colors.border }}>
                <div className="flex items-center gap-4">
                    <Link to={buildHref('/reports')} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <ArrowLeft className="h-6 w-6" style={{ color: theme.colors.textSecondary }} />
                    </Link>
                    <div className="p-3 rounded-2xl bg-purple-500/10">
                        <Filter className="h-8 w-8 text-purple-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold" style={{ color: theme.colors.text }}>Custom Report Viewer</h1>
                        <p style={{ color: theme.colors.textSecondary }}>Explore, filter, and export your raw CRM data</p>
                    </div>
                </div>

                <Button
                    variant="primary"
                    onClick={handleExportCSV}
                    disabled={data.length === 0 || selectedColumns.length === 0}
                >
                    <Download className="w-4 h-4 mr-2" /> Export to CSV
                </Button>
            </div>

            {/* Controls Row */}
            <div className="flex gap-6 flex-shrink-0">
                <Card className="p-1 flex rounded-xl border" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    {(['LEADS', 'DEALS', 'ACTIVITIES'] as EntityType[]).map(type => (
                        <button
                            key={type}
                            className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all`}
                            style={entity === type
                                ? { backgroundColor: theme.colors.primary, color: 'white' }
                                : { color: theme.colors.textSecondary }
                            }
                            onClick={() => setEntity(type)}
                        >
                            <Database className="w-4 h-4" />
                            {type}
                        </button>
                    ))}
                </Card>
            </div>

            {/* Main Content Layout */}
            <div className="flex gap-6 flex-1 min-h-0">

                {/* Columns Sidebar */}
                <Card className="w-64 p-4 flex flex-col flex-shrink-0" style={{ backgroundColor: theme.colors.surface }}>
                    <div className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.colors.text }}>
                        <ChevronDown className="w-4 h-4 text-purple-500" />
                        Select Columns
                    </div>

                    {loading ? (
                        <div className="text-center py-8"><Loading /></div>
                    ) : availableColumns.length === 0 ? (
                        <p className="text-sm italic" style={{ color: theme.colors.textSecondary }}>No data exists to build columns.</p>
                    ) : (
                        <div className="overflow-y-auto pr-2 space-y-1">
                            {availableColumns.map(col => {
                                const isSelected = selectedColumns.includes(col);
                                return (
                                    <label
                                        key={col}
                                        className="flex items-center gap-3 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            className="rounded border-border text-primary focus:ring-primary shadow-sm"
                                            checked={isSelected}
                                            onChange={() => toggleColumn(col)}
                                        />
                                        <span className="text-sm font-medium truncate" style={{ color: isSelected ? theme.colors.text : theme.colors.textSecondary }}>
                                            {col}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </Card>

                {/* Data Table Area */}
                <Card className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ backgroundColor: theme.colors.surface }}>
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center"><Loading text="Crunching data..." /></div>
                    ) : data.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                            <Database className="w-12 h-12 mb-4 text-purple-500" />
                            <h3 className="text-xl font-bold" style={{ color: theme.colors.text }}>No {entity.toLowerCase()} found</h3>
                            <p style={{ color: theme.colors.textSecondary }}>Try selecting a different module.</p>
                        </div>
                    ) : selectedColumns.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                            <Filter className="w-12 h-12 mb-4 text-purple-500" />
                            <h3 className="text-xl font-bold" style={{ color: theme.colors.text }}>No columns selected</h3>
                            <p style={{ color: theme.colors.textSecondary }}>Check at least one column on the left to see data.</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto rounded-xl">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 whitespace-nowrap" style={{ backgroundColor: theme.colors.background }}>
                                    <tr>
                                        {selectedColumns.map(col => (
                                            <th key={col} className="px-5 py-4 text-xs font-bold uppercase tracking-wider border-b" style={{ color: theme.colors.textSecondary, borderColor: theme.colors.border }}>
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                            {selectedColumns.map(col => {
                                                const rawVal = row[col];

                                                // Intelligent rendering
                                                let RenderedVal = rawVal;
                                                if (rawVal === null || rawVal === undefined) RenderedVal = '-';
                                                else if (typeof rawVal === 'boolean') RenderedVal = rawVal ? <Badge variant="success">Yes</Badge> : <Badge variant="danger">No</Badge>;
                                                else if (typeof rawVal === 'string' && (col.includes('date') || col.includes('At'))) {
                                                    try {
                                                        const d = new Date(rawVal);
                                                        if (!isNaN(d.getTime())) RenderedVal = d.toLocaleDateString();
                                                    } catch (e) { }
                                                }
                                                else if (typeof rawVal === 'number' && (col.includes('value') || col.includes('money') || col.includes('amount'))) {
                                                    RenderedVal = `$${rawVal.toLocaleString()}`;
                                                }

                                                return (
                                                    <td key={col} className="px-5 py-3 text-sm border-b max-w-[200px] truncate" style={{ borderColor: theme.colors.border, color: theme.colors.text }}>
                                                        {RenderedVal}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
