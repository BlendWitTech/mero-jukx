import React, { useState } from 'react';
import { Card, CardContent, Badge, Avatar } from '@shared';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Calendar, User, MoreHorizontal, Plus, DollarSign } from 'lucide-react';

export interface KanbanItem {
    id: string;
    title: string;
    subtitle?: string;
    value?: number;
    status: string;
    priority?: 'HOT' | 'WARM' | 'COLD' | string;
    date?: string;
    assignee?: {
        firstName: string;
        lastName: string;
        avatarUrl?: string;
    };
    tags?: string[];
}

interface KanbanColumn {
    id: string;
    name: string;
    items: KanbanItem[];
    color?: string;
}

interface CrmKanbanProps {
    columns: KanbanColumn[];
    onItemMove: (itemId: string, targetColumnId: string, newPosition: number) => void;
    onColumnMove?: (columnId: string, newPosition: number) => void;
    onItemClick: (itemId: string) => void;
    onAddItem?: (columnId: string) => void;
    onAddStage?: () => void;
}

export default function CrmKanban({
    columns,
    onItemMove,
    onColumnMove,
    onItemClick,
    onAddItem,
    onAddStage,
}: CrmKanbanProps) {
    const { theme } = useTheme();
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, itemId: string) => {
        setDraggedItem(itemId);
        setDraggedColumn(null);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/crm-item', itemId);
    };

    const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
        // Only trigger column drag if not dragging an item
        if (draggedItem) return;
        setDraggedColumn(columnId);
        setDraggedItem(null);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/crm-column', columnId);
    };

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(columnId);
    };

    const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('application/crm-item');
        const columnId = e.dataTransfer.getData('application/crm-column');

        if (itemId) {
            const column = columns.find(c => c.id === targetColumnId);
            const newPosition = column?.items.length || 0;
            onItemMove(itemId, targetColumnId, newPosition);
        } else if (columnId && onColumnMove) {
            const targetIndex = columns.findIndex(c => c.id === targetColumnId);
            if (targetIndex !== -1) {
                onColumnMove(columnId, targetIndex);
            }
        }

        setDraggedItem(null);
        setDraggedColumn(null);
        setDragOverColumn(null);
    };

    return (
        <div className="flex gap-6 h-full pb-6 overflow-x-auto min-h-[calc(100vh-250px)] scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
            {columns.map((column, index) => {
                const isDragOver = dragOverColumn === column.id;
                const isColumnDragged = draggedColumn === column.id;

                return (
                    <div
                        key={column.id}
                        draggable
                        onDragStart={(e) => handleColumnDragStart(e, column.id)}
                        className={`flex-1 min-w-[320px] max-w-[350px] flex flex-col rounded-2xl transition-all duration-300 ${isColumnDragged ? 'opacity-40 scale-95' : 'opacity-100'}`}
                        style={{
                            backgroundColor: `${theme.colors.surface}80`,
                            border: `2px dashed ${isDragOver && !draggedColumn ? theme.colors.primary : 'transparent'}`,
                            backdropFilter: 'blur(12px)',
                            boxShadow: isDragOver ? `0 0 20px ${theme.colors.primary}20` : 'none',
                        }}
                        onDragOver={(e) => handleDragOver(e, column.id)}
                        onDragLeave={() => setDragOverColumn(null)}
                        onDrop={(e) => handleDrop(e, column.id)}
                    >
                        {/* Column Header */}
                        <div
                            className="px-5 py-4 flex items-center justify-between cursor-grab active:cursor-grabbing"
                            style={{
                                borderBottom: `1px solid ${theme.colors.border}40`,
                                borderTop: `4px solid ${column.color || theme.colors.primary}`,
                                borderTopLeftRadius: '12px',
                                borderTopRightRadius: '12px',
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-base tracking-tight" style={{ color: theme.colors.text }}>
                                    {column.name}
                                </h3>
                                <Badge variant="default" size="sm" className="rounded-full px-2.5 bg-opacity-10" style={{ backgroundColor: `${theme.colors.primary}20`, color: theme.colors.primary }}>
                                    {column.items?.length || 0}
                                </Badge>
                            </div>
                            <div className="flex gap-1">
                                {onAddItem && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAddItem(column.id); }}
                                        className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                                        style={{ color: theme.colors.textSecondary }}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                )}
                                <button className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors" style={{ color: theme.colors.textSecondary }}>
                                    <MoreHorizontal className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Column Items */}
                        <div className="flex-1 p-3 space-y-4 overflow-y-auto scrollbar-hide min-h-[150px]">
                            {column.items?.map((item) => (
                                <Card
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, item.id); }}
                                    className="group cursor-move transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95 border-none shadow-md overflow-hidden relative"
                                    style={{
                                        backgroundColor: theme.colors.background,
                                    }}
                                    onClick={() => onItemClick(item.id)}
                                >
                                    {/* Glass reflection effect on hover */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                    <CardContent className="p-4 space-y-3">
                                        <div>
                                            <h4 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors" style={{ color: theme.colors.text }}>
                                                {item.title}
                                            </h4>
                                            {item.subtitle && (
                                                <p className="text-[11px] mt-1 line-clamp-1 opacity-70" style={{ color: theme.colors.textSecondary }}>
                                                    {item.subtitle}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between">
                                            {item.value !== undefined && (
                                                <div className="flex items-center gap-1 text-xs font-black" style={{ color: theme.colors.primary }}>
                                                    <DollarSign className="h-3 w-3 stroke-[3]" />
                                                    {item.value.toLocaleString()}
                                                </div>
                                            )}
                                            {item.priority && (
                                                <Badge
                                                    variant={getPriorityVariant(item.priority)}
                                                    size="sm"
                                                    className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider"
                                                >
                                                    {item.priority}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: `${theme.colors.border}20` }}>
                                            <div className="flex items-center gap-2">
                                                {item.assignee ? (
                                                    <Avatar
                                                        size="sm"
                                                        className="h-6 w-6 ring-2 ring-background shadow-sm"
                                                        name={`${item.assignee.firstName} ${item.assignee.lastName}`}
                                                        src={item.assignee.avatarUrl}
                                                    />
                                                ) : (
                                                    <div className="p-1 rounded-full bg-black/5 dark:bg-white/5">
                                                        <User className="h-3.5 w-3.5 opacity-40" />
                                                    </div>
                                                )}
                                                <span className="text-[10px] font-medium opacity-60" style={{ color: theme.colors.textSecondary }}>
                                                    {item.assignee ? `${item.assignee.firstName[0]}. ${item.assignee.lastName}` : 'Unassigned'}
                                                </span>
                                            </div>
                                            {item.date && (
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-50" style={{ color: theme.colors.textSecondary }}>
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Empty state placeholder when dragging over empty column */}
                            {isDragOver && !draggedColumn && column.items.length === 0 && (
                                <div className="h-32 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-2 animate-pulse">
                                    <div className="p-2 rounded-full bg-primary/10">
                                        <Plus className="h-4 w-4 text-primary" />
                                    </div>
                                    <p className="text-[10px] uppercase font-black text-primary tracking-widest">Drop Here</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Add Column Button */}
            <div className="min-w-[320px] flex items-start pt-2">
                <button
                    onClick={onAddStage}
                    className="w-full h-16 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 transition-all hover:bg-white/10 hover:border-primary/50 active:scale-95 group shadow-sm bg-surface/30 backdrop-blur-sm"
                    style={{ borderColor: `${theme.colors.border}60`, color: theme.colors.textSecondary }}
                >
                    <div className="p-2 rounded-xl bg-black/5 group-hover:bg-primary/10 transition-colors">
                        <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-500 group-hover:text-primary" />
                    </div>
                    <span className="font-black text-xs uppercase tracking-widest group-hover:text-primary">Add New Stage</span>
                </button>
            </div>
        </div>
    );
}

function getPriorityVariant(priority: string): 'default' | 'info' | 'warning' | 'danger' {
    switch (priority?.toUpperCase()) {
        case 'HOT': return 'danger';
        case 'WARM': return 'warning';
        case 'COLD': return 'info';
        default: return 'default';
    }
}
