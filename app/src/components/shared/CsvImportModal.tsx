import React, { useState, useRef } from 'react';
import { X, Upload, Check, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface CsvImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: any[]) => Promise<void>;
    title: string;
    expectedHeaders: string[];
    templateHeaders: string[];
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
    isOpen,
    onClose,
    onImport,
    title,
    expectedHeaders,
    templateHeaders,
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsing, setParsing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
    const [csvData, setCsvData] = useState<string[][]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = (file: File) => {
        setParsing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const rows = text.split(/\r?\n/).map(row => {
                // Simple CSV splitter that handles basic quotes
                const result = [];
                let cur = '';
                let inQuotes = false;
                for (let i = 0; i < row.length; i++) {
                    const char = row[i];
                    if (char === '"') inQuotes = !inQuotes;
                    else if (char === ',' && !inQuotes) {
                        result.push(cur.trim());
                        cur = '';
                    } else cur += char;
                }
                result.push(cur.trim());
                return result;
            }).filter(row => row.some(cell => cell !== ''));

            setCsvData(rows);

            // Auto-map based on exact matches
            if (rows.length > 0) {
                const headers = rows[0];
                const newMapping: Record<string, string> = {};
                expectedHeaders.forEach(expected => {
                    const index = headers.findIndex(h => h.toLowerCase() === expected.toLowerCase());
                    if (index !== -1) newMapping[expected] = index.toString();
                });
                setMapping(newMapping);
            }

            setStep('map');
            setParsing(false);
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        setImporting(true);
        try {
            const headers = csvData[0];
            const dataToImport = csvData.slice(1).map(row => {
                const obj: any = {};
                Object.entries(mapping).forEach(([expected, indexStr]) => {
                    const index = parseInt(indexStr);
                    obj[expected] = row[index] || '';
                });
                return obj;
            });

            await onImport(dataToImport);
            onClose();
        } catch (error) {
            console.error('Import failed:', error);
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const csvContent = templateHeaders.join(',') + '\n';
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_template.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="p-6 border-b border-theme-border flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-theme-text">{title}</h2>
                        <p className="text-sm text-theme-text-secondary mt-1">Import your data via CSV file</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-theme-border rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full max-w-md border-2 border-dashed border-theme-border rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-theme-primary hover:bg-theme-primary/5 transition-all group"
                            >
                                <div className="w-16 h-16 bg-theme-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Upload className="text-theme-primary" size={32} />
                                </div>
                                <p className="text-lg font-medium text-theme-text mb-2">Click to upload or drag and drop</p>
                                <p className="text-sm text-theme-text-secondary mb-4">CSV (max. 10MB)</p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".csv"
                                    className="hidden"
                                />
                            </div>
                            <button
                                onClick={downloadTemplate}
                                className="mt-8 text-sm text-theme-primary hover:underline flex items-center gap-2"
                            >
                                Download sample template
                            </button>
                        </div>
                    )}

                    {step === 'map' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-theme-primary/10 border border-theme-primary/20 rounded-lg">
                                <AlertCircle className="text-theme-primary" size={20} />
                                <p className="text-sm text-theme-text">Map your CSV columns to the system fields below.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {expectedHeaders.map((expected) => (
                                    <div key={expected} className="p-4 border border-theme-border rounded-lg bg-theme-background flex items-center justify-between gap-4">
                                        <span className="text-sm font-medium text-theme-text capitalize">
                                            {expected.replace(/([A-Z])/g, ' $1').trim()}
                                        </span>
                                        <select
                                            value={mapping[expected] || ''}
                                            onChange={(e) => setMapping({ ...mapping, [expected]: e.target.value })}
                                            className="bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-theme-primary outline-none min-w-[150px]"
                                        >
                                            <option value="">Skip field</option>
                                            {csvData[0]?.map((header, index) => (
                                                <option key={index} value={index}>{header}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-theme-border flex items-center justify-end gap-3">
                    {step === 'map' && (
                        <button
                            onClick={() => setStep('upload')}
                            className="px-4 py-2 text-sm font-medium text-theme-text-secondary hover:text-theme-text transition-colors"
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-theme-text-secondary hover:text-theme-text transition-colors"
                    >
                        Cancel
                    </button>
                    {step === 'map' && (
                        <button
                            onClick={handleImport}
                            disabled={importing || Object.keys(mapping).length === 0}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            {importing ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Check size={18} />
                                    Complete Import
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
