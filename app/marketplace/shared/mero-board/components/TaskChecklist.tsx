import React, { useState } from 'react';
import { Button, Input, Checkbox } from '@shared/frontend';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@frontend/services/api';
import toast from '@shared/frontend/hooks/useToast';
import { TaskChecklistItem } from '../types';

interface TaskChecklistProps {
    taskId: string;
    items: TaskChecklistItem[];
    theme: any;
}

export default function TaskChecklist({ taskId, items, theme }: TaskChecklistProps) {
    const queryClient = useQueryClient();
    const [newItemContent, setNewItemContent] = useState('');

    const addItemMutation = useMutation({
        mutationFn: async (content: string) => {
            const response = await api.post(`/tasks/${taskId}/checklist`, { content });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
            setNewItemContent('');
        },
    });

    const toggleItemMutation = useMutation({
        mutationFn: async ({ itemId, isCompleted }: { itemId: string, isCompleted: boolean }) => {
            await api.put(`/tasks/${taskId}/checklist/${itemId}`, { is_completed: isCompleted });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        },
    });

    const deleteItemMutation = useMutation({
        mutationFn: async (itemId: string) => {
            await api.delete(`/tasks/${taskId}/checklist/${itemId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
            toast.success('Item deleted');
        },
    });

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemContent.trim()) return;
        addItemMutation.mutate(newItemContent);
    };

    const completedCount = items.filter(i => i.is_completed).length;
    const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg" style={{ color: theme.colors.text }}>Checklist</h3>
                <span className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                    {completedCount} / {items.length} ({progress}%)
                </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="space-y-2">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded-lg group transition-colors"
                        style={{ backgroundColor: theme.colors.background }}
                    >
                        <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-30 cursor-grab" style={{ color: theme.colors.textSecondary }} />
                        <Checkbox
                            checked={item.is_completed}
                            onCheckedChange={(checked) => toggleItemMutation.mutate({ itemId: item.id, isCompleted: !!checked })}
                        />
                        <span
                            className={`flex-1 text-sm ${item.is_completed ? 'line-through opacity-50' : ''}`}
                            style={{ color: theme.colors.text }}
                        >
                            {item.content}
                        </span>
                        <button
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                            style={{ color: theme.colors.textSecondary }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>

            <form onSubmit={handleAddItem} className="flex gap-2">
                <Input
                    value={newItemContent}
                    onChange={e => setNewItemContent(e.target.value)}
                    placeholder="Add an item..."
                    className="flex-1"
                />
                <Button
                    type="submit"
                    disabled={!newItemContent.trim() || addItemMutation.isPending}
                    size="sm"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                </Button>
            </form>
        </div>
    );
}
