import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from '@shared/hooks/useToast';
import { Upload, X, File as FileIcon } from 'lucide-react';
import { DocumentType } from '../types/documents';

interface DocumentUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DocumentUpload({ isOpen, onClose, onSuccess }: DocumentUploadProps) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>(DocumentType.OTHER);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');

  const uploadDocumentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post('/organizations/me/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        params: {
          document_type: documentType,
          title: documentTitle || undefined,
          description: documentDescription || undefined,
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-documents'] });
      toast.success('Document uploaded successfully');
      handleClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload document');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!documentTitle) {
        setDocumentTitle(file.name.replace(/\.[^/.]+$/, '')); // Remove extension for title
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }
    const formData = new FormData();
    formData.append('file', selectedFile);
    uploadDocumentMutation.mutate(formData);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setDocumentTitle('');
    setDocumentDescription('');
    setDocumentType(DocumentType.OTHER);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Upload Document</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={uploadDocumentMutation.isPending}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
              File *
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 transition-colors">
              <div className="space-y-1 text-center">
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <FileIcon className="h-12 w-12 text-primary-600 mb-2" />
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="mt-2 text-xs text-red-600 hover:text-red-700"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>Click to upload</span>
                        <input
                          id="file"
                          name="file"
                          type="file"
                          className="sr-only"
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG, GIF (Max 10MB)
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="document_type" className="block text-sm font-medium text-gray-700 mb-2">
              Document Type *
            </label>
            <select
              id="document_type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="input w-full"
              disabled={uploadDocumentMutation.isPending}
            >
              <option value={DocumentType.CONTRACT}>Contract</option>
              <option value={DocumentType.LICENSE}>License</option>
              <option value={DocumentType.CERTIFICATE}>Certificate</option>
              <option value={DocumentType.INVOICE}>Invoice</option>
              <option value={DocumentType.OTHER}>Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="document_title" className="block text-sm font-medium text-gray-700 mb-2">
              Title (optional)
            </label>
            <input
              id="document_title"
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="input w-full"
              placeholder="Document title"
              disabled={uploadDocumentMutation.isPending}
            />
          </div>

          <div>
            <label htmlFor="document_description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              id="document_description"
              value={documentDescription}
              onChange={(e) => setDocumentDescription(e.target.value)}
              className="input w-full"
              rows={3}
              placeholder="Document description"
              disabled={uploadDocumentMutation.isPending}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="btn btn-secondary"
              disabled={uploadDocumentMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploadDocumentMutation.isPending}
              className="btn btn-primary"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadDocumentMutation.isPending ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

