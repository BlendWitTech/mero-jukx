import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import {
  format, addDays, parseISO, differenceInDays, startOfDay,
  getDay, getISOWeek, getYear,
} from 'date-fns';

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  created_at: string;
  status: string;
  priority: string;
  assignees?: Array<{ first_name: string; last_name: string; avatar_url?: string | null }>;
}

interface TaskGanttProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onTaskUpdate?: (taskId: string, data: { due_date: string }) => void;
}

type Zoom = 'day' | 'week' | 'month';

const ZOOM_PX: Record<Zoom, number> = { day: 32, week: 14, month: 5 };
const TOTAL_DAYS = 365;  // 3 months back + 9 months forward
const BEFORE = 90;       // days before today that the timeline starts
const LEFT_W = 224;
const ROW_H = 52;
const HEADER_H = 64; // two header rows × 32px each

function prioColor(p: string): string {
  return ({ urgent: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#6b7280' } as any)[p] ?? '#6b7280';
}

function statusLabel(s: string): string {
  return ({ done: 'Done', in_progress: 'In Progress', in_review: 'In Review', todo: 'To Do' } as any)[s] ?? s;
}

type Cell = { label: string; w: number };

export default function TaskGantt({ tasks, onTaskClick, onTaskUpdate }: TaskGanttProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<Zoom>('day');
  const dayPx = ZOOM_PX[zoom];
  const totalW = TOTAL_DAYS * dayPx;

  // Timeline origin: BEFORE days ago
  const today = startOfDay(new Date());
  const origin = addDays(today, -BEFORE);
  const todayIdx = BEFORE;
  const todayX = todayIdx * dayPx;

  // Drag state — use refs to avoid stale closures in event listeners
  const dragRef = useRef<{ taskId: string; startX: number; origDueDateMs: number } | null>(null);
  const dragDisplayRef = useRef<{ taskId: string; deltaDays: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const [dragDisplay, _setDragDisplay] = useState<{ taskId: string; deltaDays: number } | null>(null);

  const setDragDisplay = useCallback((v: { taskId: string; deltaDays: number } | null) => {
    dragDisplayRef.current = v;
    _setDragDisplay(v);
  }, []);

  // Tooltip
  const [tooltip, setTooltip] = useState<{ task: Task; x: number; y: number } | null>(null);

  const idx2date = (i: number) => addDays(origin, i);
  const date2idx = (d: Date) => differenceInDays(startOfDay(d), startOfDay(origin));

  // Scroll to today on mount and zoom change
  useEffect(() => {
    if (containerRef.current) {
      const offset = LEFT_W + todayX - containerRef.current.clientWidth / 2;
      containerRef.current.scrollLeft = Math.max(0, offset);
    }
  }, [zoom, todayX]);

  // Compute visual bar for a task (accounts for live drag delta)
  const getBar = useCallback((task: Task) => {
    const created = parseISO(task.created_at);
    const startIdx = date2idx(created);
    let dueDateMs = task.due_date ? parseISO(task.due_date).getTime() : null;

    if (dragDisplayRef.current?.taskId === task.id && dueDateMs !== null) {
      dueDateMs = dueDateMs + dragDisplayRef.current.deltaDays * 86400000;
    }

    if (dueDateMs !== null) {
      const endIdx = date2idx(new Date(dueDateMs));
      const x = startIdx * dayPx;
      const w = Math.max((endIdx - startIdx + 1) * dayPx, dayPx * 0.5);
      const overdue = dueDateMs < today.getTime() && task.status !== 'done';
      return { x, w, milestone: false, overdue };
    }

    // No due date — show milestone diamond at created_at
    return { x: startIdx * dayPx, w: 0, milestone: true, overdue: false };
  }, [dayPx, today]);

  // Resize handle mousedown
  const onResizeStart = useCallback((e: React.MouseEvent, task: Task) => {
    if (!onTaskUpdate || !task.due_date) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      taskId: task.id,
      startX: e.clientX,
      origDueDateMs: parseISO(task.due_date).getTime(),
    };
    setDragDisplay({ taskId: task.id, deltaDays: 0 });
  }, [onTaskUpdate, setDragDisplay]);

  // Global mouse move / up for drag
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaDays = Math.round(deltaX / dayPx);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (dragRef.current) setDragDisplay({ taskId: dragRef.current.taskId, deltaDays });
      });
    };

    const onUp = () => {
      if (!dragRef.current || !dragDisplayRef.current) {
        dragRef.current = null;
        return;
      }
      const finalMs = dragRef.current.origDueDateMs + dragDisplayRef.current.deltaDays * 86400000;
      onTaskUpdate?.(dragRef.current.taskId, { due_date: format(new Date(finalMs), 'yyyy-MM-dd') });
      dragRef.current = null;
      setDragDisplay(null);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dayPx, onTaskUpdate, setDragDisplay]);

  // Build date header cells
  const buildHeader = (): { top: Cell[]; bot: Cell[] } => {
    const top: Cell[] = [];
    const bot: Cell[] = [];

    if (zoom === 'day') {
      let month = '', monthW = 0;
      for (let i = 0; i < TOTAL_DAYS; i++) {
        const d = idx2date(i);
        const m = format(d, 'MMM yyyy');
        if (m !== month) {
          if (month) top.push({ label: month, w: monthW * dayPx });
          month = m; monthW = 0;
        }
        monthW++;
        bot.push({ label: format(d, 'd'), w: dayPx });
      }
      top.push({ label: month, w: monthW * dayPx });
      return { top, bot };
    }

    if (zoom === 'week') {
      let month = '', monthW = 0;
      let week = -1, weekW = 0, weekLabel = '';
      for (let i = 0; i < TOTAL_DAYS; i++) {
        const d = idx2date(i);
        const m = format(d, 'MMM yyyy');
        if (m !== month) {
          if (month) top.push({ label: month, w: monthW * dayPx });
          month = m; monthW = 0;
        }
        monthW++;
        const wk = getISOWeek(d);
        if (wk !== week) {
          if (week !== -1) bot.push({ label: weekLabel, w: weekW * dayPx });
          week = wk; weekW = 0; weekLabel = `W${wk}`;
        }
        weekW++;
      }
      top.push({ label: month, w: monthW * dayPx });
      bot.push({ label: weekLabel, w: weekW * dayPx });
      return { top, bot };
    }

    // Month zoom
    let year = -1, yearW = 0;
    let moKey = '', moW = 0, moLabel = '';
    for (let i = 0; i < TOTAL_DAYS; i++) {
      const d = idx2date(i);
      const yr = getYear(d);
      const mk = format(d, 'yyyyMM');
      if (yr !== year) {
        if (year !== -1) top.push({ label: String(year), w: yearW * dayPx });
        year = yr; yearW = 0;
      }
      yearW++;
      if (mk !== moKey) {
        if (moKey) bot.push({ label: moLabel, w: moW * dayPx });
        moKey = mk; moW = 0; moLabel = format(d, 'MMM');
      }
      moW++;
    }
    top.push({ label: String(year), w: yearW * dayPx });
    bot.push({ label: moLabel, w: moW * dayPx });
    return { top, bot };
  };

  const { top: topCells, bot: botCells } = buildHeader();

  const scrollBy = (dir: 1 | -1) => {
    containerRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  const scrollToToday = () => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = LEFT_W + todayX - containerRef.current.clientWidth / 2;
    }
  };

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* ── Toolbar ── */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0"
        style={{ borderColor: theme.colors.border }}
      >
        <button onClick={() => scrollBy(-1)} className="p-1.5 rounded hover:bg-black/5 transition-colors">
          <ChevronLeft className="h-4 w-4" style={{ color: theme.colors.text }} />
        </button>
        <button onClick={() => scrollBy(1)} className="p-1.5 rounded hover:bg-black/5 transition-colors">
          <ChevronRight className="h-4 w-4" style={{ color: theme.colors.text }} />
        </button>
        <button
          onClick={scrollToToday}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors hover:bg-black/5"
          style={{ color: theme.colors.primary, borderColor: theme.colors.primary }}
        >
          <Calendar className="h-3 w-3" /> Today
        </button>
        <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
        {onTaskUpdate && (
          <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
            · Drag right edge to resize due date
          </span>
        )}

        {/* Zoom selector */}
        <div className="flex gap-1 ml-auto">
          {(['day', 'week', 'month'] as Zoom[]).map(z => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className="text-xs px-2 py-1 rounded capitalize transition-colors"
              style={{
                backgroundColor: zoom === z ? theme.colors.primary : 'transparent',
                color: zoom === z ? '#fff' : theme.colors.textSecondary,
                border: `1px solid ${zoom === z ? theme.colors.primary : theme.colors.border}`,
              }}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main scroll area (single container — sticky left + top handled with CSS) ── */}
      <div ref={containerRef} className="flex-1 overflow-auto" style={{ position: 'relative' }}>
        <div style={{ width: LEFT_W + totalW, minHeight: '100%' }}>

          {/* Sticky header row */}
          <div
            className="flex sticky top-0 z-20"
            style={{ backgroundColor: theme.colors.surface, height: HEADER_H }}
          >
            {/* Top-left corner cell */}
            <div
              className="sticky left-0 z-30 flex-shrink-0 flex flex-col justify-end pb-2 px-3 border-r border-b"
              style={{
                width: LEFT_W,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                height: HEADER_H,
              }}
            >
              <span className="text-xs font-semibold" style={{ color: theme.colors.textSecondary }}>TASK</span>
            </div>

            {/* Date columns */}
            <div style={{ width: totalW, flex: 'none' }}>
              {/* Top row: months / years */}
              <div className="flex border-b" style={{ borderColor: theme.colors.border, height: HEADER_H / 2 }}>
                {topCells.map((c, i) => (
                  <div
                    key={i}
                    className="border-r text-xs font-semibold flex items-center px-2 overflow-hidden flex-shrink-0"
                    style={{ width: c.w, borderColor: theme.colors.border, color: theme.colors.text }}
                  >
                    {c.label}
                  </div>
                ))}
              </div>

              {/* Bottom row: days / weeks / months */}
              <div className="flex border-b" style={{ borderColor: theme.colors.border, height: HEADER_H / 2 }}>
                {botCells.map((c, i) => {
                  const dayDate = zoom === 'day' ? idx2date(i) : null;
                  const isToday = zoom === 'day' && i === todayIdx;
                  const isWeekend = dayDate ? (getDay(dayDate) === 0 || getDay(dayDate) === 6) : false;
                  return (
                    <div
                      key={i}
                      className="border-r flex items-center justify-center text-xs flex-shrink-0 overflow-hidden"
                      style={{
                        width: c.w,
                        borderColor: `${theme.colors.border}60`,
                        color: isToday ? theme.colors.primary : theme.colors.textSecondary,
                        backgroundColor: isToday
                          ? `${theme.colors.primary}18`
                          : isWeekend
                          ? `${theme.colors.border}25`
                          : 'transparent',
                        fontWeight: isToday ? 700 : 400,
                      }}
                    >
                      {c.w >= 14 ? c.label : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Task rows ── */}
          {tasks.length === 0 ? (
            <div
              className="flex items-center justify-center"
              style={{ height: 140, color: theme.colors.textSecondary, fontSize: 14 }}
            >
              No tasks to display in Gantt view
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Today vertical line spanning all rows */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: LEFT_W + todayX + dayPx / 2,
                  width: 2,
                  backgroundColor: theme.colors.primary,
                  opacity: 0.35,
                  zIndex: 4,
                  pointerEvents: 'none',
                }}
              />

              {tasks.map((task, rowIdx) => {
                const bar = getBar(task);
                const color = prioColor(task.priority);
                const isDraggingThis = dragDisplay?.taskId === task.id;
                const isEven = rowIdx % 2 === 0;
                const rowBg = isEven ? 'transparent' : `${theme.colors.border}15`;

                return (
                  <div
                    key={task.id}
                    className="flex border-b"
                    style={{ borderColor: theme.colors.border, height: ROW_H }}
                  >
                    {/* Sticky task name cell */}
                    <div
                      className="sticky left-0 z-10 flex-shrink-0 flex items-center gap-2 px-3 cursor-pointer border-r transition-colors"
                      style={{
                        width: LEFT_W,
                        borderColor: theme.colors.border,
                        backgroundColor: rowBg || theme.colors.surface,
                      }}
                      onClick={() => onTaskClick(task.id)}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = `${theme.colors.primary}10`;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = rowBg || theme.colors.surface;
                      }}
                    >
                      {/* Priority dot */}
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="min-w-0">
                        <div
                          className="text-sm font-medium truncate"
                          style={{ color: theme.colors.text }}
                        >
                          {task.title}
                        </div>
                        <div className="text-xs" style={{ color: theme.colors.textSecondary }}>
                          {statusLabel(task.status)}
                          {task.due_date && (
                            <span> · {format(parseISO(task.due_date), 'MMM d')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timeline bar area */}
                    <div style={{ width: totalW, flex: 'none', position: 'relative', backgroundColor: rowBg }}>

                      {bar.milestone ? (
                        /* Diamond milestone: task has no due date */
                        <div
                          className="absolute cursor-pointer hover:scale-110 transition-transform"
                          style={{
                            left: bar.x + dayPx / 2 - 7,
                            top: '50%',
                            transform: 'translateY(-50%) rotate(45deg)',
                            width: 14,
                            height: 14,
                            backgroundColor: color,
                            zIndex: 2,
                          }}
                          onClick={() => onTaskClick(task.id)}
                          onMouseEnter={e => setTooltip({ task, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      ) : (
                        /* Task bar */
                        <div
                          className={`absolute group flex items-center overflow-hidden rounded${task.status === 'done' ? ' opacity-55' : ''}`}
                          style={{
                            left: bar.x,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: Math.max(bar.w, 4),
                            height: 26,
                            backgroundColor: color,
                            cursor: 'pointer',
                            zIndex: isDraggingThis ? 10 : 2,
                            boxShadow: isDraggingThis
                              ? '0 4px 14px rgba(0,0,0,0.25)'
                              : bar.overdue
                              ? `0 0 0 2px #ef4444, 0 1px 3px rgba(0,0,0,0.15)`
                              : '0 1px 3px rgba(0,0,0,0.15)',
                          }}
                          onClick={() => {
                            if (!dragDisplay) onTaskClick(task.id);
                          }}
                          onMouseEnter={e => setTooltip({ task, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          {task.status === 'done' && (
                            <span className="text-white pl-1.5" style={{ fontSize: 9 }}>✓</span>
                          )}
                          {bar.w > 50 && (
                            <span
                              className="text-white font-medium truncate px-1.5 flex-1"
                              style={{ fontSize: 10, lineHeight: '26px' }}
                            >
                              {task.title}
                            </span>
                          )}

                          {/* Drag-to-resize handle (right edge) */}
                          {onTaskUpdate && task.due_date && (
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{
                                backgroundColor: 'rgba(255,255,255,0.22)',
                                borderLeft: '1px solid rgba(255,255,255,0.35)',
                              }}
                              onMouseDown={e => onResizeStart(e, task)}
                              title="Drag to change due date"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating tooltip ── */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg shadow-xl"
          style={{
            left: tooltip.x + 16,
            top: tooltip.y - 14,
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.text,
            padding: '10px 14px',
            minWidth: 200,
          }}
        >
          <div className="font-semibold text-sm mb-1.5 truncate" style={{ maxWidth: 240 }}>
            {tooltip.task.title}
          </div>
          <div className="space-y-0.5 text-xs" style={{ color: theme.colors.textSecondary }}>
            <div>
              Status:{' '}
              <span style={{ color: theme.colors.text }}>{statusLabel(tooltip.task.status)}</span>
            </div>
            <div>
              Priority:{' '}
              <span
                style={{
                  color: prioColor(tooltip.task.priority),
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {tooltip.task.priority}
              </span>
            </div>
            {tooltip.task.due_date ? (
              <div>
                Due:{' '}
                <span style={{ color: theme.colors.text }}>
                  {format(parseISO(tooltip.task.due_date), 'MMM d, yyyy')}
                </span>
              </div>
            ) : (
              <div style={{ color: '#f59e0b' }}>No due date set</div>
            )}
            {tooltip.task.assignees && tooltip.task.assignees.length > 0 && (
              <div>
                Assigned:{' '}
                <span style={{ color: theme.colors.text }}>
                  {tooltip.task.assignees.map(a => `${a.first_name} ${a.last_name}`).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
