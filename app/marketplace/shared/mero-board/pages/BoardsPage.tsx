import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, Textarea, Loading, Select } from '@shared/frontend';
import api from '@frontend/services/api';
import { Plus, Kanban, Trash2, Edit2, ArrowLeft, Star, Globe, Lock, Users as UsersIcon } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useTheme } from '@frontend/contexts/ThemeContext';
import toast from '@shared/frontend/hooks/useToast';
import { ConfirmDialog } from '@shared/frontend/components/feedback/ConfirmDialog';

interface Board {
    id: string;
    name: string;
    description: string | null;
    type: 'KANBAN' | 'SCRUM' | 'LIST';
    color: string | null;
    created_at: string;
    privacy?: 'private' | 'team' | 'org';
}

export default function BoardsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { appSlug } = useAppContext();
    const { theme } = useTheme();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
    const [boardForm, setBoardForm] = useState({
        name: '',
        description: '',
        type: 'KANBAN',
        color: '#3b82f6',
        privacy: 'team' as 'private' | 'team' | 'org',
    });
    const [boardToDelete, setBoardToDelete] = useState<string | null>(null);

    const { workspaceId, projectId } = React.useParams<{ workspaceId?: string; projectId?: string }>();

    // Fetch boards
    const { data: boardsData, isLoading } = useQuery<{ data: Board[] }>({
        queryKey: ['boards', appSlug, projectId],
        queryFn: async () => {
            const endpoint = projectId
                ? `/boards?projectId=${projectId}`
                : '/boards';
            const response = await api.get(endpoint);
            return response.data;
        },
    });
    const boards = boardsData?.data || [];

    // Fetch favorite boards
    const { data: favoriteBoards = [] } = useQuery<Board[]>({
        queryKey: ['board-favorites'],
        queryFn: async () => {
            const response = await api.get('/boards/favorites/list');
            return response.data;
        },
    });
    const favoriteBoardIds = new Set((favoriteBoards as Board[]).map((b) => b.id));

    // Create board mutation
    const createBoardMutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = projectId ? { ...data, projectId } : data;
            const response = await api.post('/boards', payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boards', appSlug, projectId] });
            setShowCreateModal(false);
            resetForm();
            toast.success('Board created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create board');
        },
    });

    // Update board mutation
    const updateBoardMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await api.patch(`/boards/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boards', appSlug] });
            setShowEditModal(false);
            resetForm();
            toast.success('Board updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update board');
        },
    });

    // Pin / unpin board mutations
    const pinBoardMutation = useMutation({
        mutationFn: async (boardId: string) => {
            await api.post(`/boards/${boardId}/pin`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board-favorites'] });
            toast.success('Board added to favorites');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to add to favorites');
        },
    });

    const unpinBoardMutation = useMutation({
        mutationFn: async (boardId: string) => {
            await api.post(`/boards/${boardId}/unpin`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board-favorites'] });
            toast.success('Board removed from favorites');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to remove from favorites');
        },
    });

    // Delete board mutation
    const deleteBoardMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/boards/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boards', appSlug] });
            setBoardToDelete(null);
            toast.success('Board deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete board');
        },
    });

    const resetForm = () => {
        setBoardForm({
            name: '',
            description: '',
            type: 'KANBAN',
            color: '#3b82f6',
            privacy: 'team',
        });
        setSelectedBoard(null);
    };

    const handleCreate = () => {
        if (!boardForm.name.trim()) return;
        createBoardMutation.mutate(boardForm);
    };

    const handleUpdate = () => {
        if (!selectedBoard || !boardForm.name.trim()) return;
        updateBoardMutation.mutate({ id: selectedBoard.id, data: boardForm });
    };

    const handleToggleFavorite = (e: React.MouseEvent, board: Board) => {
        e.stopPropagation();
        if (favoriteBoardIds.has(board.id)) {
            unpinBoardMutation.mutate(board.id);
        } else {
            pinBoardMutation.mutate(board.id);
        }
    };

    const openEditModal = (board: Board) => {
        setSelectedBoard(board);
        setBoardForm({
            name: board.name,
            description: board.description || '',
            type: board.type as any,
            color: board.color || '#3b82f6',
            privacy: board.privacy || 'team',
        });
        setShowEditModal(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: theme.colors.background }}>
                <Loading size="lg" text="Loading boards..." />
            </div>
        );
    }

    const favoritesList = boards.filter((b) => favoriteBoardIds.has(b.id));
    const nonFavoritesList = boards.filter((b) => !favoriteBoardIds.has(b.id));

    const renderBoardCard = (board: Board) => {
        const isFav = favoriteBoardIds.has(board.id);
        return (
            <Card
                key={board.id}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
                style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderLeft: `4px solid ${board.color || theme.colors.primary}`,
                }}
                onClick={() => navigate(`${board.id}`, { relative: 'route' })}
            >
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-xl flex items-center gap-2" style={{ color: theme.colors.text }}>
                            {board.name}
                            {isFav && <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />}
                        </CardTitle>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => handleToggleFavorite(e, board)}
                                className={`p-1.5 rounded transition-colors ${isFav ? 'text-yellow-500' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                <Star className="h-4 w-4" fill={isFav ? 'currentColor' : 'none'} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); openEditModal(board); }}
                                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                                style={{ color: theme.colors.textSecondary }}
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setBoardToDelete(board.id); }}
                                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    {board.description && (
                        <p className="text-sm mt-1 line-clamp-2" style={{ color: theme.colors.textSecondary }}>
                            {board.description}
                        </p>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between text-sm" style={{ color: theme.colors.textSecondary }}>
                        <div className="flex items-center gap-2">
                            <span className="capitalize px-2 py-0.5 rounded" style={{ backgroundColor: theme.colors.background }}>
                                {board.type.toLowerCase()}
                            </span>
                            {board.privacy && (
                                <span className="flex items-center gap-1 opacity-70" title={`Privacy: ${board.privacy}`}>
                                    {board.privacy === 'private' ? <Lock className="h-3 w-3" /> :
                                        board.privacy === 'org' ? <Globe className="h-3 w-3" /> :
                                            <UsersIcon className="h-3 w-3" />}
                                </span>
                            )}
                        </div>
                        <span>{new Date(board.created_at).toLocaleDateString()}</span>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="h-full w-full p-6" style={{ backgroundColor: theme.colors.background }}>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        {projectId && (
                            <Button
                                variant="outline"
                                onClick={() => navigate('..', { relative: 'path' })}
                                style={{ borderColor: theme.colors.border }}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <h1 className="text-3xl font-bold" style={{ color: theme.colors.text }}>Boards</h1>
                    </div>
                    <p className="mt-2" style={{ color: theme.colors.textSecondary }}>
                        Manage your ticket boards
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    style={{ backgroundColor: theme.colors.primary, color: '#ffffff' }}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Board
                </Button>
            </div>

            {/* Favorites Section */}
            {favoritesList.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: theme.colors.text }}>
                        <Star className="h-5 w-5 text-yellow-500" fill="currentColor" />
                        Favorites
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favoritesList.map(renderBoardCard)}
                    </div>
                    {nonFavoritesList.length > 0 && (
                        <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.colors.border }}>
                            <h2 className="text-lg font-semibold mb-3" style={{ color: theme.colors.text }}>All Boards</h2>
                        </div>
                    )}
                </div>
            )}

            {boards.length === 0 ? (
                <Card style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                    <CardContent className="py-12 text-center">
                        <Kanban className="h-12 w-12 mx-auto mb-4" style={{ color: theme.colors.textSecondary }} />
                        <h3 className="text-lg font-semibold mb-2" style={{ color: theme.colors.text }}>No boards yet</h3>
                        <p className="mb-4" style={{ color: theme.colors.textSecondary }}>
                            Create your first board to start organizing tickets
                        </p>
                        <Button onClick={() => setShowCreateModal(true)} style={{ backgroundColor: theme.colors.primary, color: '#ffffff' }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Board
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(favoritesList.length > 0 ? nonFavoritesList : boards).map(renderBoardCard)}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showCreateModal || showEditModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    resetForm();
                }}
                title={showEditModal ? 'Edit Board' : 'Create New Board'}
                theme={theme}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                            Board Name *
                        </label>
                        <Input
                            value={boardForm.name}
                            onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })}
                            placeholder="Enter board name"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                            Description
                        </label>
                        <Textarea
                            value={boardForm.description}
                            onChange={(e) => setBoardForm({ ...boardForm, description: e.target.value })}
                            placeholder="Enter board description"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                            Type
                        </label>
                        <Select
                            value={boardForm.type}
                            onChange={(e) => setBoardForm({ ...boardForm, type: e.target.value as any })}
                            options={[
                                { value: 'KANBAN', label: 'Kanban' },
                                { value: 'SCRUM', label: 'Scrum' },
                                { value: 'LIST', label: 'List' },
                            ]}
                            theme={theme}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                            Privacy
                        </label>
                        <Select
                            value={boardForm.privacy}
                            onChange={(e) => setBoardForm({ ...boardForm, privacy: e.target.value as any })}
                            options={[
                                { value: 'private', label: 'Private (Only you)' },
                                { value: 'team', label: 'Team (All workspace members)' },
                                { value: 'org', label: 'Organization (All org members)' },
                            ]}
                            theme={theme}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                            Color
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'].map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setBoardForm({ ...boardForm, color })}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform ${boardForm.color === color ? 'scale-110 border-gray-900 dark:border-white' : 'border-transparent'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-6">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCreateModal(false);
                                setShowEditModal(false);
                                resetForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={showEditModal ? handleUpdate : handleCreate}
                            disabled={!boardForm.name.trim()}
                            isLoading={createBoardMutation.isPending || updateBoardMutation.isPending}
                            style={{
                                backgroundColor: theme.colors.primary,
                                color: '#ffffff',
                            }}
                        >
                            {showEditModal ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!boardToDelete}
                title="Delete Board"
                message="Are you sure you want to delete this board? This action cannot be undone and will delete all columns associated with it."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={() => boardToDelete && deleteBoardMutation.mutate(boardToDelete)}
                onClose={() => setBoardToDelete(null)}
                isLoading={deleteBoardMutation.isPending}
                variant="danger"
                theme={theme}
            />
        </div>
    );
}
