import React, { useState } from 'react';
import { Card, CardContent, Badge, Avatar } from '@shared';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Calendar, User, MoreHorizontal, Plus, CheckSquare, AlertCircle } from 'lucide-react';
import toast from '@shared/frontend/hooks/useToast';
import { Task, BoardColumn } from '../types';

interface TaskKanbanProps {
  columns: BoardColumn[];
  onTaskMove: (taskId: string, targetColumnId: string, newPosition: number) => void;
  onColumnMove: (columnId: string, newPosition: number) => void;
  onTaskClick: (taskId: string) => void;
  onAddTaskClick?: (columnId: string) => void;
  onUpdateWipLimit?: (columnId: string, limit: number | null) => void;
}

export default function TaskKanban({
  columns,
  onTaskMove,
  onColumnMove,
  onTaskClick,
  onAddTaskClick,
  onUpdateWipLimit,
}: TaskKanbanProps) {
  const { theme } = useTheme();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', taskId);

    const target = e.currentTarget as HTMLElement;
    target.classList.add('opacity-50', 'scale-95');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedTaskId(null);
    setDragOverColumnId(null);

    const target = e.currentTarget as HTMLElement;
    target.classList.remove('opacity-50', 'scale-95');
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumnId(columnId);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const columnId = e.dataTransfer.getData('columnId');

    if (taskId) {
      const column = columns.find(c => c.id === targetColumnId);
      const targetColumnTickets = column?.tickets || [];
      const sourceColumn = columns.find(c => c.tickets?.some(t => t.id === taskId));

      if (column && column.wip_limit && sourceColumn?.id !== targetColumnId) {
        if (targetColumnTickets.length >= column.wip_limit) {
          toast.error(`Cannot move task. "${column.name}" has reached its WIP limit of ${column.wip_limit}.`);
          setDraggedTaskId(null);
          setDraggedColumnId(null);
          setDragOverColumnId(null);
          return;
        }
      }

      const newPosition = targetColumnTickets.length || 0;
      onTaskMove(taskId, targetColumnId, newPosition);
    } else if (columnId && columnId !== targetColumnId) {
      const targetIndex = columns.findIndex(c => c.id === targetColumnId);
      onColumnMove(columnId, targetIndex);
    }

    setDraggedTaskId(null);
    setDraggedColumnId(null);
    setDragOverColumnId(null);
  };

  return (
    <div className="flex gap-4 h-full pb-4 min-h-[600px]">
      {columns.map((column) => {
        const isDragOver = dragOverColumnId === column.id;
        const ticketCount = column.tickets?.length || 0;
        const wipLimit = column.wip_limit;
        const isOverWip = wipLimit !== null && wipLimit !== undefined && ticketCount > wipLimit;

        return (
          <div
            key={column.id}
            draggable={!draggedTaskId}
            onDragStart={(e) => {
              if (!draggedTaskId) {
                setDraggedColumnId(column.id);
                e.dataTransfer.setData('columnId', column.id);
              }
            }}
            onDragEnd={() => setDraggedColumnId(null)}
            className={`flex-1 min-w-[300px] w-[300px] max-w-[350px] flex flex-col rounded-xl transition-all duration-200 ${isDragOver ? 'ring-2 ring-primary ring-opacity-50' : ''
              } ${draggedColumnId === column.id ? 'opacity-30 scale-95' : ''} ${isOverWip ? 'bg-red-50/10 dark:bg-red-900/5' : ''}`}
            style={{
              backgroundColor: theme.colors.surface,
              border: isOverWip ? '1px solid #ef4444' : `1px solid ${theme.colors.border}`,
              boxShadow: isDragOver ? `0 0 20px ${theme.colors.primary}1A` : 'none'
            }}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={() => setDragOverColumnId(null)}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div
              className={`px-4 py-4 flex items-center justify-between border-b ${isOverWip ? 'animate-pulse' : ''}`}
              style={{
                borderColor: isOverWip ? '#ef4444' : `${theme.colors.border}80`,
                borderTop: `4px solid ${isOverWip ? '#ef4444' : (column.color || theme.colors.primary)}`
              }}
            >
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-sm" style={{ color: theme.colors.text }}>
                  {column.name}
                </h3>
                <div
                  className="px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 group/wip cursor-pointer"
                  title={wipLimit ? `WIP Limit: ${wipLimit}` : 'Set WIP Limit'}
                  style={{
                    backgroundColor: isOverWip ? '#fee2e2' : `${column.color || theme.colors.primary}15`,
                    color: isOverWip ? '#ef4444' : (column.color || theme.colors.primary)
                  }}
                  onClick={() => {
                    if (!onUpdateWipLimit) return;
                    const newLimit = prompt(`Enter WIP limit for "${column.name}" (currently ${wipLimit || 'none'}):`, wipLimit?.toString() || '');
                    if (newLimit === null) return;
                    onUpdateWipLimit(column.id, newLimit === '' ? null : parseInt(newLimit, 10));
                  }}
                >
                  <span>{ticketCount}</span>
                  {wipLimit && (
                    <span className="opacity-40 font-bold">/ {wipLimit}</span>
                  )}
                  {isOverWip && <AlertCircle className="h-3 w-3" />}
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
              {column.tickets?.map((task) => (
                <Card
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab active:cursor-grabbing hover:shadow-xl transition-all duration-200 border-none relative group"
                  style={{
                    backgroundColor: theme.colors.background,
                  }}
                  onClick={() => onTaskClick(task.id)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Priority Indicator Stripe */}
                      <div
                        className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                        style={{ backgroundColor: getPriorityColor(task.priority, theme) }}
                      />

                      <div className="flex justify-between items-start gap-2 pl-2">
                        <h4 className="font-semibold text-sm line-clamp-2 leading-snug" style={{ color: theme.colors.text }}>
                          {task.subject}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap pl-2">
                        <Badge
                          variant={getPriorityVariant(task.priority)}
                          size="sm"
                          className="text-[9px] uppercase font-black tracking-wider px-1.5"
                        >
                          {task.priority || 'medium'}
                        </Badge>
                        {task.tags?.map(tag => (
                          <Badge key={tag} variant="outline" size="sm" className="text-[9px] opacity-60 font-bold px-1.5">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Sub-tasks Progress */}
                      {task.sub_tasks_count! > 0 && (
                        <div className="pl-2 space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold opacity-60">
                            <div className="flex items-center gap-1">
                              <CheckSquare className="h-3 w-3" />
                              <span>{task.completed_sub_tasks_count} / {task.sub_tasks_count}</span>
                            </div>
                            <span>{Math.round(((task.completed_sub_tasks_count || 0) / (task.sub_tasks_count || 1)) * 100)}%</span>
                          </div>
                          <div className="h-1 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-500"
                              style={{ width: `${((task.completed_sub_tasks_count || 0) / (task.sub_tasks_count || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 mt-1 border-t pl-2" style={{ borderColor: `${theme.colors.border}40` }}>
                        <div className="flex items-center gap-2">
                          {task.assignees && task.assignees.length > 0 ? (
                            <div className="flex -space-x-2">
                              {task.assignees.slice(0, 3).map((assignee) => (
                                <Avatar
                                  key={assignee.id}
                                  size="sm"
                                  name={`${assignee.first_name} ${assignee.last_name}`}
                                  src={assignee.avatar_url}
                                  className="ring-2 ring-background h-6 w-6"
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="p-1 rounded-full bg-black/5 dark:bg-white/5">
                              <User className="h-3 w-3 opacity-40" />
                            </div>
                          )}
                        </div>
                        {task.due_date && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-50">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
    case 'urgent': return '#ef4444';
    case 'high': return '#f59e0b';
    case 'medium': return '#3b82f6';
    default: return theme.colors.border;
  }
}
