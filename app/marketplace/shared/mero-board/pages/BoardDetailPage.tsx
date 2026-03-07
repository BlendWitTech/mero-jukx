import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Loading, Modal, Input } from '@shared/frontend';
import api from '@frontend/services/api';
import { ArrowLeft, Plus, Settings, Globe, Lock, Users as UsersIcon } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useAuthStore } from '@frontend/store/authStore';
import toast from '@shared/frontend/hooks/useToast';
import TaskKanban from '../components/TaskKanban';
import { Board } from '../types';
import { useBoardSocket } from '../hooks/useBoardSocket';

export default function BoardDetailPage() {
    const { boardId } = useParams<{ boardId: string }>();
    useBoardSocket(boardId);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { appSlug } = useAppContext();
    const { theme } = useTheme();
    const { organization } = useAuthStore();

    const [showAddColumnModal, setShowAddColumnModal] = useState(false);
    const [columnForm, setColumnForm] = useState({ name: '', wip_limit: '' });

    // Fetch board details with columns and tickets
    const { data: boardData, isLoading } = useQuery<{ data: Board }>({
        queryKey: ['board', appSlug, boardId],
        queryFn: async () => {
            const response = await api.get(`/boards/${boardId}`);
            const columnsResponse = await api.get(`/boards/${boardId}/columns`);
            return { data: { ...response.data, columns: columnsResponse.data } };
        },
        enabled: !!boardId,
    });

    const board = boardData?.data;

    // Add Column Mutation
    const addColumnMutation = useMutation({
        mutationFn: async (data: { name: string; wip_limit?: number }) => {
            const response = await api.post(`/boards/${boardId}/columns`, {
                ...data,
                position: (board?.columns?.length || 0) + 1,
                color: '#e2e8f0', // Default color
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board', appSlug, boardId] });
            setShowAddColumnModal(false);
            setColumnForm({ name: '', wip_limit: '' });
            toast.success('Column added');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to add column');
        },
    });

    // Handle Task Move
    const moveTaskMutation = useMutation({
        mutationFn: async ({ taskId, targetColumnId, newPosition }: { taskId: string, targetColumnId: string, newPosition: number }) => {
            return api.put(`/tasks/${taskId}/move`, { column_id: targetColumnId, sort_order: newPosition });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board', appSlug, boardId] });
        },
        onError: (error: any) => {
            toast.error('Failed to move task');
        }
    });

    const moveColumnMutation = useMutation({
        mutationFn: async ({ columnId, newPosition }: { columnId: string, newPosition: number }) => {
            return api.put(`/boards/${boardId}/columns/reorder`, { columnId, newPosition });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board', appSlug, boardId] });
            toast.success('Column reordered');
        },
        onError: (error: any) => {
            toast.error('Failed to reorder columns');
        }
    });

    const updateColumnMutation = useMutation({
        mutationFn: async ({ columnId, data }: { columnId: string, data: any }) => {
            return api.patch(`/columns/${columnId}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board', appSlug, boardId] });
            toast.success('Column updated');
        },
        onError: (error: any) => {
            toast.error('Failed to update column');
        }
    });

    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
    const [taskForm, setTaskForm] = useState({ subject: '' });

    // Add Task Mutation
    const addTaskMutation = useMutation({
        mutationFn: async (data: { subject: string; column_id: string }) => {
            const response = await api.post('/tasks', {
                ...data,
                board_id: boardId,
                status: 'todo',
                priority: 'medium',
                organization_id: organization?.id
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board', appSlug, boardId] });
            setShowAddTaskModal(false);
            setTaskForm({ subject: '' });
            toast.success('Task added');
        },
    });

    const handleAddTask = (columnId: string) => {
        setActiveColumnId(columnId);
        setShowAddTaskModal(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: theme.colors.background }}>
                <Loading size="lg" text="Loading board..." />
            </div>
        );
    }

    if (!board) return <div>Board not found</div>;

    return (
        <div className="h-full w-full p-6 flex flex-col" style={{ backgroundColor: theme.colors.background }}>
            {/* Header */}
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={() => navigate('..', { relative: 'path' })}
                        style={{ borderColor: theme.colors.border }}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: theme.colors.text }}>
                            {board.name}
                            <span className="text-sm font-normal px-2 py-0.5 rounded border" style={{ color: theme.colors.textSecondary, borderColor: theme.colors.border }}>
                                {board.type}
                            </span>
                            {board.visibility && (
                                <span className="flex items-center gap-1 text-sm font-normal px-2 py-0.5 rounded border" title={`Visibility: ${board.visibility}`} style={{ color: theme.colors.textSecondary, borderColor: theme.colors.border }}>
                                    {board.visibility === 'PRIVATE' ? <Lock className="h-3 w-3" /> :
                                        board.visibility === 'PUBLIC' ? <Globe className="h-3 w-3" /> :
                                            <UsersIcon className="h-3 w-3" />}
                                    <span className="capitalize">{board.visibility.toLowerCase()}</span>
                                </span>
                            )}
                        </h1>
                        {board.description && <p style={{ color: theme.colors.textSecondary }}>{board.description}</p>}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowAddColumnModal(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Column
                    </Button>
                    <Button variant="ghost">
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Board Content */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <TaskKanban
                    columns={board.columns || []}
                    onTaskMove={(taskId, columnId, index) => moveTaskMutation.mutate({ taskId, targetColumnId: columnId, newPosition: index })}
                    onColumnMove={(columnId, index) => moveColumnMutation.mutate({ columnId, newPosition: index })}
                    onTaskClick={(taskId) => navigate(`../../tasks/${taskId}`, { relative: 'path' })}
                    onAddTaskClick={handleAddTask}
                    onUpdateWipLimit={(columnId, limit) => updateColumnMutation.mutate({ columnId, data: { wip_limit: limit } })}
                />
            </div>

            {/* Add Task Modal */}
            <Modal
                isOpen={showAddTaskModal}
                onClose={() => setShowAddTaskModal(false)}
                title="Quick Add Task"
                theme={theme}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Task Subject</label>
                        <Input
                            value={taskForm.subject}
                            onChange={e => setTaskForm({ ...taskForm, subject: e.target.value })}
                            placeholder="What needs to be done?"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowAddTaskModal(false)}>Cancel</Button>
                        <Button
                            onClick={() => addTaskMutation.mutate({ subject: taskForm.subject, column_id: activeColumnId! })}
                            disabled={!taskForm.subject || addTaskMutation.isPending}
                            isLoading={addTaskMutation.isPending}
                        >
                            Create Task
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Add Column Modal */}
            <Modal
                isOpen={showAddColumnModal}
                onClose={() => setShowAddColumnModal(false)}
                title="Add New Column"
                theme={theme}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <Input
                            value={columnForm.name}
                            onChange={e => setColumnForm({ ...columnForm, name: e.target.value })}
                            placeholder="e.g. In Progress"
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowAddColumnModal(false)}>Cancel</Button>
                        <Button
                            onClick={() => addColumnMutation.mutate({ name: columnForm.name, wip_limit: Number(columnForm.wip_limit) || undefined })}
                            disabled={!columnForm.name}
                            isLoading={addColumnMutation.isPending}
                        >
                            Add
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
