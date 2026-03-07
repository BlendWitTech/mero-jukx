import React, { useState } from 'react';
import { Card, CardContent, Badge, Avatar } from '@shared';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Calendar, User, MoreHorizontal, Plus } from 'lucide-react';
// import { Ticket } from '@frontend/types/tickets'; 

// Temporary interface until types are shared
export interface Ticket {
    id: string;
    subject: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    assignee?: {
        first_name: string;
        last_name: string;
        avatar_url?: string;
    };
    tags?: string[];
}

interface BoardColumn {
    id: string;
    name: string;
    color: string;
    tickets: Ticket[];
}

interface TicketKanbanProps {
    columns: BoardColumn[];
    onTicketMove: (ticketId: string, targetColumnId: string, newPosition: number) => void;
    onTicketClick: (ticketId: string) => void;
    onAddTaskClick?: (columnId: string) => void;
}

export default function TicketKanban({
    columns,
    onTicketMove,
    onTicketClick,
    onAddTaskClick,
}: TicketKanbanProps) {
    const { theme } = useTheme();
    const [draggedTicket, setDraggedTicket] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, ticketId: string) => {
        setDraggedTicket(ticketId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ticketId);

        // Add a class for visual feedback
        const target = e.currentTarget as HTMLElement;
        target.classList.add('opacity-50', 'scale-95');

        // Custom drag image if desired, but default is usually okay with ghost
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedTicket(null);
        setDragOverColumn(null);

        const target = e.currentTarget as HTMLElement;
        target.classList.remove('opacity-50', 'scale-95');
    };

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(columnId);
    };

    const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
        e.preventDefault();
        const ticketId = e.dataTransfer.getData('text/plain');

        if (ticketId) {
            // Find current column of the ticket
            let sourceColumnId: string | undefined;
            for (const col of columns) {
                if (col.tickets.some(t => t.id === ticketId)) {
                    sourceColumnId = col.id;
                    break;
                }
            }

            // Only trigger move if column changed
            if (sourceColumnId !== targetColumnId) {
                const column = columns.find(c => c.id === targetColumnId);
                const newPosition = column?.tickets.length || 0;
                onTicketMove(ticketId, targetColumnId, newPosition);
            }
        }

        setDraggedTicket(null);
        setDragOverColumn(null);
    };

    return (
        <div className="flex gap-4 h-full pb-4 min-h-[600px]">
            {columns.map((column) => {
                const isDragOver = dragOverColumn === column.id;

                return (
                    <div
                        key={column.id}
                        className={`flex-1 min-w-[300px] w-[300px] max-w-[350px] flex flex-col rounded-xl transition-all duration-200 ${isDragOver ? 'ring-2 ring-primary ring-opacity-50' : ''
                            }`}
                        style={{
                            backgroundColor: theme.colors.surface, // Column bg
                            border: `1px solid ${theme.colors.border}`,
                            boxShadow: isDragOver ? `0 0 20px ${theme.colors.primary}1A` : 'none'
                        }}
                        onDragOver={(e) => handleDragOver(e, column.id)}
                        onDragLeave={() => setDragOverColumn(null)}
                        onDrop={(e) => handleDrop(e, column.id)}
                    >
                        {/* Column Header */}
                        <div
                            className="px-4 py-4 flex items-center justify-between border-b"
                            style={{
                                borderColor: `${theme.colors.border}80`,
                                borderTop: `4px solid ${column.color || theme.colors.primary}`
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-sm" style={{ color: theme.colors.text }}>
                                    {column.name}
                                </h3>
                                <div
                                    className="px-2 py-0.5 rounded-full text-[10px] font-black"
                                    style={{
                                        backgroundColor: `${column.color || theme.colors.primary}15`,
                                        color: column.color || theme.colors.primary
                                    }}
                                >
                                    {column.tickets?.length || 0}
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    onClick={() => onAddTaskClick?.(column.id)}
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                                <button className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <MoreHorizontal className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Column Tasks */}
                        <div className="flex-1 p-3 space-y-3 overflow-y-auto scrollbar-thin">
                            {column.tickets?.map((ticket) => (
                                <Card
                                    key={ticket.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, ticket.id)}
                                    onDragEnd={handleDragEnd}
                                    className="cursor-grab active:cursor-grabbing hover:shadow-xl transition-all duration-200 border-none relative group"
                                    style={{
                                        backgroundColor: theme.colors.background, // Card bg
                                    }}
                                    onClick={() => onTicketClick(ticket.id)}
                                >
                                    <CardContent className="p-4">
                                        <div className="space-y-3">
                                            {/* Priority Indicator Stripe */}
                                            <div
                                                className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                                                style={{ backgroundColor: getPriorityColor(ticket.priority, theme) }}
                                            />

                                            <div className="flex justify-between items-start gap-2 pl-2">
                                                <h4 className="font-semibold text-sm line-clamp-2 leading-snug" style={{ color: theme.colors.text }}>
                                                    {ticket.subject}
                                                </h4>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap pl-2">
                                                <Badge
                                                    variant={getPriorityVariant(ticket.priority)}
                                                    size="sm"
                                                    className="text-[9px] uppercase font-black tracking-wider px-1.5"
                                                >
                                                    {ticket.priority}
                                                </Badge>
                                                {ticket.tags?.map(tag => (
                                                    <Badge key={tag} variant="outline" size="sm" className="text-[9px] opacity-60 font-bold px-1.5">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>

                                            <div className="flex items-center justify-between pt-3 mt-1 border-t pl-2" style={{ borderColor: `${theme.colors.border}40` }}>
                                                <div className="flex items-center gap-2">
                                                    {ticket.assignee ? (
                                                        <Avatar
                                                            size="sm"
                                                            name={`${ticket.assignee.first_name} ${ticket.assignee.last_name}`}
                                                            src={ticket.assignee.avatar_url}
                                                            className="ring-2 ring-background"
                                                        />
                                                    ) : (
                                                        <div className="p-1 rounded-full bg-black/5 dark:bg-white/5">
                                                            <User className="h-3 w-3 opacity-40" />
                                                        </div>
                                                    )}
                                                </div>
                                                {ticket.due_date && (
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-50">
                                                        <Calendar className="h-3 w-3" />
                                                        <span>{new Date(ticket.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {/* Empty Drop Zone indicator */}
                            {isDragOver && column.tickets?.length === 0 && (
                                <div className="h-24 border-2 border-dashed border-primary/20 rounded-xl bg-primary/5 flex items-center justify-center">
                                    <p className="text-xs text-primary/40 font-bold">Drop here</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function getPriorityVariant(priority: string): 'default' | 'info' | 'warning' | 'danger' {
    switch (priority?.toLowerCase()) {
        case 'high': return 'warning';
        case 'urgent': return 'danger';
        case 'medium': return 'info';
        default: return 'default';
    }
}

function getPriorityColor(priority: string, theme: any): string {
    switch (priority?.toLowerCase()) {
        case 'urgent': return '#ef4444'; // red
        case 'high': return '#f59e0b'; // amber
        case 'medium': return '#3b82f6'; // blue
        default: return theme.colors.border;
    }
}
