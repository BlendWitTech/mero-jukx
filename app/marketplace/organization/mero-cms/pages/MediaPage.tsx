import { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Upload, Trash2, Image, File, FolderOpen } from 'lucide-react';
import api from '@/services/api';
import toast from '@shared/frontend/hooks/useToast';

interface CmsMedia {
    id: string;
    filename: string;
    original_name: string;
    mime_type: string;
    size: number;
    url: string;
    folder: string;
    alt_text: string | null;
    created_at: string;
}

export default function MediaPage() {
    const { theme } = useTheme();
    const [media, setMedia] = useState<CmsMedia[]>([]);
    const [folders, setFolders] = useState<string[]>([]);
    const [selectedFolder, setSelectedFolder] = useState('');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [editingMedia, setEditingMedia] = useState<CmsMedia | null>(null);
    const [altText, setAltText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchMedia = async () => {
        try {
            const params = selectedFolder ? `?folder=${selectedFolder}` : '';
            const [mediaRes, foldersRes] = await Promise.all([api.get(`/cms/media${params}`), api.get('/cms/media/folders')]);
            setMedia(mediaRes.data);
            setFolders(foldersRes.data);
        } catch { toast.error('Failed to load media'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchMedia(); }, [selectedFolder]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post('/cms/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('File uploaded');
            fetchMedia();
        } catch { toast.error('Upload failed'); }
        finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this file?')) return;
        try { await api.delete(`/cms/media/${id}`); toast.success('File deleted'); fetchMedia(); }
        catch { toast.error('Failed to delete file'); }
    };

    const handleSaveAlt = async () => {
        if (!editingMedia) return;
        try { await api.patch(`/cms/media/${editingMedia.id}`, { alt_text: altText }); toast.success('Alt text updated'); setEditingMedia(null); fetchMedia(); }
        catch { toast.error('Failed to update'); }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const isImage = (mime: string) => mime.startsWith('image/');

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Media Library</h1>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Upload and manage your files</p>
                </div>
                <div className="flex items-center gap-2">
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: theme.colors.primary }}>
                        <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload File'}
                    </button>
                </div>
            </div>

            {/* Folder filter */}
            {folders.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setSelectedFolder('')} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: !selectedFolder ? theme.colors.primary : 'transparent', color: !selectedFolder ? '#fff' : theme.colors.textSecondary, borderColor: theme.colors.border }}>
                        <FolderOpen className="h-3 w-3" /> All
                    </button>
                    {folders.map((f) => (
                        <button key={f} onClick={() => setSelectedFolder(f)} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: selectedFolder === f ? theme.colors.primary : 'transparent', color: selectedFolder === f ? '#fff' : theme.colors.textSecondary, borderColor: theme.colors.border }}>
                            <FolderOpen className="h-3 w-3" /> {f}
                        </button>
                    ))}
                </div>
            )}

            {/* Media Grid */}
            {loading ? (
                <div className="p-8 text-center" style={{ color: theme.colors.textSecondary }}>Loading media...</div>
            ) : media.length === 0 ? (
                <div className="p-12 text-center rounded-xl border" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <Image className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: theme.colors.textSecondary }} />
                    <p className="font-medium" style={{ color: theme.colors.text }}>No files yet</p>
                    <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>Upload your first file to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {media.map((item) => (
                        <div key={item.id} className="rounded-xl border overflow-hidden group" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                            <div className="aspect-square relative bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                {isImage(item.mime_type) ? (
                                    <img src={item.url} alt={item.alt_text || item.original_name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                    <File className="h-10 w-10" style={{ color: theme.colors.textSecondary }} />
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button onClick={() => { setEditingMedia(item); setAltText(item.alt_text || ''); }} className="p-2 bg-white rounded-lg text-gray-700 text-xs font-medium">Edit</button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-500 rounded-lg text-white"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>
                            <div className="px-2 py-1.5">
                                <p className="text-xs truncate font-medium" style={{ color: theme.colors.text }}>{item.original_name}</p>
                                <p className="text-xs" style={{ color: theme.colors.textSecondary }}>{formatSize(item.size)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Alt Text Modal */}
            {editingMedia && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4" style={{ backgroundColor: theme.colors.surface }}>
                        <h2 className="text-lg font-semibold" style={{ color: theme.colors.text }}>Edit Media</h2>
                        <p className="text-sm truncate" style={{ color: theme.colors.textSecondary }}>{editingMedia.original_name}</p>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.text }}>Alt Text</label>
                            <input type="text" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }} value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Descriptive alt text for accessibility" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSaveAlt} className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: theme.colors.primary }}>Save</button>
                            <button onClick={() => setEditingMedia(null)} className="flex-1 py-2 rounded-lg text-sm border" style={{ borderColor: theme.colors.border, color: theme.colors.text }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
