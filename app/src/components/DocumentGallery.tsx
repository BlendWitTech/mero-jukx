import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from '@shared/hooks/useToast';
import { File, Download, Trash2, Filter, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DocumentType } from '../types/documents';
import { useTheme } from '../contexts/ThemeContext';
import { usePermissions } from '../hooks/usePermissions';

interface Document {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number;
  document_type: DocumentType;
  title: string | null;
  description: string | null;
  created_at: string;
}

interface DocumentGalleryProps {
  documents: Document[];
  onUploadClick?: () => void;
}

export default function DocumentGallery({ documents, onUploadClick }: DocumentGalleryProps) {
  const { theme } = useTheme();
  const { isOrganizationOwner, hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<DocumentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Check if user can edit organization (required for delete)
  const canEditOrganization = isOrganizationOwner || hasPermission('organizations.edit');

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await api.delete(`/organizations/me/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-documents'] });
      toast.success('Document deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete document');
    },
  });

  const handleDownload = async (documentId: string, fileName: string) => {
    try {
      const response = await api.get(`/organizations/me/documents/${documentId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Document downloaded');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to download document');
    }
  };

  const handleDelete = (document: Document) => {
    if (confirm(`Are you sure you want to delete "${document.title || document.file_name}"?`)) {
      deleteDocumentMutation.mutate(document.id);
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="h-5 w-5 text-gray-400" />;

    if (fileType.includes('pdf')) {
      return <File className="h-5 w-5 text-red-500" />;
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <File className="h-5 w-5 text-blue-500" />;
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return <File className="h-5 w-5 text-green-500" />;
    } else if (fileType.includes('image')) {
      return <File className="h-5 w-5 text-purple-500" />;
    }
    return <File className="h-5 w-5 text-gray-400" />;
  };

  const getTypeBadgeColor = (type: DocumentType) => {
    const colors = {
      [DocumentType.CONTRACT]: 'bg-blue-100 text-blue-800',
      [DocumentType.LICENSE]: 'bg-green-100 text-green-800',
      [DocumentType.CERTIFICATE]: 'bg-purple-100 text-purple-800',
      [DocumentType.INVOICE]: 'bg-yellow-100 text-yellow-800',
      [DocumentType.OTHER]: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || colors[DocumentType.OTHER];
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesType = selectedType === 'all' || doc.document_type === selectedType;
    const matchesSearch =
      (doc.title || doc.file_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const documentTypes = [
    { value: 'all' as const, label: 'All Types' },
    { value: DocumentType.CONTRACT, label: 'Contracts' },
    { value: DocumentType.LICENSE, label: 'Licenses' },
    { value: DocumentType.CERTIFICATE, label: 'Certificates' },
    { value: DocumentType.INVOICE, label: 'Invoices' },
    { value: DocumentType.OTHER, label: 'Other' },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full pl-10 focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: theme.colors.background,
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.text,
                '--tw-ring-color': theme.colors.primary
              } as any}
            />
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: theme.colors.textSecondary }} />
          </div>
        </div>
        <div className="sm:w-48">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as DocumentType | 'all')}
            className="input w-full focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: theme.colors.background,
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.text,
              '--tw-ring-color': theme.colors.primary
            } as any}
          >
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Document List */}
      {filteredDocuments.length > 0 ? (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 rounded-lg transition-all"
              style={{
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface
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
              <div className="flex items-center flex-1 min-w-0">
                <div className="flex-shrink-0 mr-4">
                  {getFileIcon(doc.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: theme.colors.text }}>
                    {doc.title || doc.file_name}
                  </p>
                  <div className="flex items-center flex-wrap gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeBadgeColor(doc.document_type)}`}>
                      {doc.document_type}
                    </span>
                    <span className="text-xs" style={{ color: theme.colors.textSecondary }}>•</span>
                    <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
                      {formatFileSize(doc.file_size)}
                    </span>
                    <span className="text-xs" style={{ color: theme.colors.textSecondary }}>•</span>
                    <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {doc.description && (
                    <p className="text-xs mt-1 line-clamp-1" style={{ color: theme.colors.textSecondary }}>
                      {doc.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => handleDownload(doc.id, doc.file_name)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: theme.colors.primary }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.primary + '1A'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                {canEditOrganization && (
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={deleteDocumentMutation.isPending}
                    className="p-2 rounded-lg transition-colors disabled:opacity-50"
                    style={{ color: '#ef4444' }}
                    onMouseEnter={(e) => {
                      if (!deleteDocumentMutation.isPending) {
                        e.currentTarget.style.backgroundColor = '#ef4444' + '1A';
                      }
                    }}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-lg" style={{ border: `2px dashed ${theme.colors.border}` }}>
          <File className="h-12 w-12 mx-auto mb-4" style={{ color: theme.colors.textSecondary }} />
          <p className="text-sm font-medium mb-1" style={{ color: theme.colors.text }}>
            {documents.length === 0 ? 'No documents uploaded yet' : 'No documents match your filters'}
          </p>
          <p className="text-xs mb-4" style={{ color: theme.colors.textSecondary }}>
            {documents.length === 0
              ? 'Get started by uploading your first document'
              : 'Try adjusting your search or filter criteria'}
          </p>
          {documents.length === 0 && onUploadClick && (
            <button
              onClick={onUploadClick}
              className="btn btn-primary btn-sm"
              style={{ backgroundColor: theme.colors.primary, color: '#ffffff' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.secondary}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.primary}
            >
              <File className="mr-2 h-4 w-4" />
              Upload Your First Document
            </button>
          )}
          {documents.length > 0 && (
            <button
              onClick={() => {
                setSelectedType('all');
                setSearchQuery('');
              }}
              className="btn btn-secondary btn-sm"
              style={{ backgroundColor: theme.colors.surface, color: theme.colors.text, border: `1px solid ${theme.colors.border}` }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.background;
                e.currentTarget.style.color = theme.colors.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
                e.currentTarget.style.color = theme.colors.text;
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

