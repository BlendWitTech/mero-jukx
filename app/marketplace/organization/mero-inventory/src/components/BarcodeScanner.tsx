import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Scan, Package, Search, AlertCircle, Loader2 } from 'lucide-react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Card } from '@shared/frontend/components/ui/Card';
import { Button } from '@shared/frontend/components/ui/Button';
import { Input } from '@shared/frontend/components/ui/Input';
import api from '@frontend/services/api';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

interface ScannerProps {
    onScan?: (data: string) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: ScannerProps) {
    const { theme } = useTheme();
    const { buildHref } = useAppContext();
    const navigate = useNavigate();
    const [isScanning, setIsScanning] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [searching, setSearching] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const handleLookup = async (code: string) => {
        if (!code) return;
        setSearching(true);
        setError(null);
        try {
            // Find product by SKU or barcode (assuming SKU serves as barcode for now)
            const response = await api.get(`/inventory/products?search=${code}`);
            const products = response.data;

            const match = products.find((p: any) => p.sku === code || p.barcode === code);

            if (match) {
                if (onScan) {
                    onScan(code);
                } else {
                    navigate(buildHref(`/products/${match.id}/edit`));
                    onClose();
                }
            } else {
                setError('No product found with this code');
            }
        } catch (err) {
            setError('Failed to lookup product');
        } finally {
            setSearching(false);
        }
    };

    const startCamera = async () => {
        setIsScanning(true);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            // Note: In a real production app, we'd use a library like html5-qrcode here.
            // For now, we'll implement the UI and a poll for BarcodeDetector API if available.
            if ('BarcodeDetector' in window) {
                const detector = new (window as any).BarcodeDetector({
                    formats: ['code_128', 'qr_code', 'ean_13']
                });

                const scanFrame = async () => {
                    if (!isScanning || !videoRef.current) return;
                    try {
                        const barcodes = await detector.detect(videoRef.current);
                        if (barcodes.length > 0) {
                            const code = barcodes[0].rawValue;
                            stopCamera();
                            handleLookup(code);
                        } else {
                            requestAnimationFrame(scanFrame);
                        }
                    } catch (e) {
                        requestAnimationFrame(scanFrame);
                    }
                };
                requestAnimationFrame(scanFrame);
            } else {
                // Fallback messaging if API not supported
                setTimeout(() => {
                    if (isScanning) {
                        setError('Camera-based scanning is not supported in this browser. Please use manual entry or a USB scanner.');
                        stopCamera();
                    }
                }, 5000);
            }
        } catch (err) {
            setError('Could not access camera. Please check permissions.');
            setIsScanning(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsScanning(false);
    };

    useEffect(() => {
        return () => stopCamera();
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-lg overflow-hidden shadow-2xl border-none" style={{ backgroundColor: theme.colors.surface, borderRadius: '24px' }}>
                <div className="relative p-6 border-b" style={{ borderColor: theme.colors.border }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Scan className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold" style={{ color: theme.colors.text }}>Inventory Scanner</h2>
                            <p className="text-sm opacity-60">Scan barcode or enter SKU for quick lookup</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute right-6 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        style={{ color: theme.colors.textSecondary }}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {isScanning ? (
                        <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border-2 border-primary/30">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <div className="w-64 h-40 border-2 border-primary rounded-xl relative">
                                    <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-scan-line" />
                                </div>
                                <p className="mt-4 text-white text-sm font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                                    Align barcode within frame
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                className="absolute bottom-4 right-4 text-white hover:bg-white/10"
                                onClick={stopCamera}
                            >
                                Stop Camera
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed rounded-3xl gap-4 transition-colors hover:border-primary/40" style={{ borderColor: theme.colors.border }}>
                                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Camera className="h-8 w-8 text-primary" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold" style={{ color: theme.colors.text }}>Use Device Camera</p>
                                    <p className="text-xs opacity-60">Scan QR codes or linear barcodes</p>
                                </div>
                                <Button
                                    onClick={startCamera}
                                    className="bg-primary text-white px-8 rounded-full shadow-lg shadow-primary/20"
                                >
                                    Launch Scanner
                                </Button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t" style={{ borderColor: theme.colors.border }} />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-surface px-2 opacity-50 font-bold" style={{ backgroundColor: theme.colors.surface }}>Or Manual Entry</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-40" />
                                    <Input
                                        placeholder="Enter SKU or scan with handheld..."
                                        className="pl-12 h-14 rounded-2xl text-lg font-medium shadow-inner"
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleLookup(manualCode)}
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-sm animate-in slide-in-from-top-2">
                                        <AlertCircle className="h-4 w-4" />
                                        {error}
                                    </div>
                                )}

                                <Button
                                    className="w-full h-14 rounded-2xl bg-secondary text-white font-bold text-lg hover:scale-[1.01] active:scale-95 transition-all shadow-md"
                                    disabled={!manualCode || searching}
                                    onClick={() => handleLookup(manualCode)}
                                >
                                    {searching ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Package className="h-5 w-5 mr-3" />
                                            Lookup Product
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            <style>{`
                @keyframes scan-line {
                    0% { top: 0% }
                    100% { top: 100% }
                }
                .animate-scan-line {
                    animation: scan-line 2s linear infinite;
                }
            `}</style>
        </div>
    );
}
