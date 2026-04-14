"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  ChevronLeft, ChevronRight, GripVertical, LayoutGrid, GanttChart,
  Sparkles, X, MapPin, BookOpen, FlaskConical,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Task, CalendarEvent, AiScheduleResponse } from "@/lib/types";
import { PRIORITY_COLORS, TASK_STATUS_COLORS } from "@/lib/types";
import { BacklogItem } from "@/components/dnd/backlog-item";
import { StaminaBar } from "@/components/stamina-bar";
import { TimelineContainer } from "@/components/timeline-container";
import { useDroppable } from "@dnd-kit/core";

const START_HOUR = 7;
const END_HOUR = 23;
const TOTAL_SLOTS = END_HOUR - START_HOUR;
const ROW_HEIGHT = 60;

function GridDropSlot({ hour, isCurrent, isOver: _hint }: { hour: number; isCurrent: boolean; isOver?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${hour}`, data: { hour } });
  return (
    <div
      ref={setNodeRef}
      className={`border-t border-border/50 transition-colors ${
        isOver ? "bg-accent/10" : isCurrent ? "bg-accent/5" : ""
      }`}
      style={{ gridRow: `${hour - START_HOUR + 1} / ${hour - START_HOUR + 2}`, gridColumn: 2 }}
    />
  );
}

interface GridBlockProps {
  id: string;
  title: string;
  startMin: number;
  endMin: number;
  kind: "event" | "task";
  priority?: string;
  status?: string;
  eventType?: string;
  smartTag?: string | null;
  location?: string | null;
  isIcal?: boolean;
  onUnschedule?: (id: string) => void;
}

function GridBlock({
  id, title, startMin, endMin, kind, priority, status, eventType,
  smartTag, location, isIcal, onUnschedule,
}: GridBlockProps) {
  const topPx = ((startMin - START_HOUR * 60) / 60) * ROW_HEIGHT;
  const heightPx = Math.max(24, ((endMin - startMin) / 60) * ROW_HEIGHT);

  let colorClass = "bg-white/5 border-white/20";
  if (kind === "task") {
    colorClass = TASK_STATUS_COLORS[status || "todo"] || "bg-accent/20 border-accent";
  } else if (smartTag === "@theory") {
    colorClass = "bg-blue-500/25 border-blue-400";
  } else if (smartTag === "@practice") {
    colorClass = "bg-amber-500/25 border-amber-400";
  } else {
    const m: Record<string, string> = {
      class: "bg-blue-500/20 border-blue-500",
      meeting: "bg-purple-500/20 border-purple-500",
      work_block: "bg-indigo-500/20 border-indigo-500",
      deadline: "bg-red-500/20 border-red-500",
    };
    colorClass = m[eventType || ""] || "bg-gray-500/20 border-gray-500";
  }

  const fmtHM = (m: number) => `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;

  return (
    <div
      className={`absolute left-1 right-1 rounded-lg overflow-hidden group ${
        isIcal ? "border-l-[3px] border-dashed" : "border-l-[3px] border-solid"
      } ${colorClass}`}
      style={{ top: topPx, height: heightPx }}
    >
      <div className="px-2 py-1 h-full flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {smartTag === "@theory" && <BookOpen className="w-3 h-3 text-blue-300 flex-shrink-0" />}
          {smartTag === "@practice" && <FlaskConical className="w-3 h-3 text-amber-300 flex-shrink-0" />}
          {kind === "task" && priority && <span className={`text-[10px] ${PRIORITY_COLORS[priority]}`}>●</span>}
          <span className="text-xs font-semibold truncate">{title}</span>
          {kind === "task" && onUnschedule && (
            <button
              onClick={() => onUnschedule(id)}
              className="ml-auto opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {location && (
          <div className="flex items-center gap-1 mt-0.5 min-w-0">
            <MapPin className="w-2.5 h-2.5 text-muted flex-shrink-0" />
            <span className="text-[10px] text-muted truncate">{location}</span>
          </div>
        )}
        {heightPx >= 40 && (
          <span className="text-[10px] text-muted/60 mt-auto">{fmtHM(startMin)} – {fmtHM(endMin)}</span>
        )}
      </div>
    </div>
  );
}

export default function DailyViewPage() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiScheduleResponse | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const load = useCallback(() => {
    const dayStart = date.toISOString();
    const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      api.listTasks({ unscheduled: true }),
      api.listTasks(),
      api.listEvents(dayStart, dayEnd),
    ])
      .then(([backlog, all, evts]) => {
        setBacklogTasks(backlog.filter((t) => !t.is_completed));
        setScheduledTasks(
          all.filter((t) => {
            if (!t.start_time) return false;
            return new Date(t.start_time).toDateString() === date.toDateString();
          })
        );
        setEvents(evts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const prevDay = () => setDate((d) => new Date(d.getTime() - 86400000));
  const nextDay = () => setDate((d) => new Date(d.getTime() + 86400000));
  const toToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setDate(d); };

  const handleDragStart = (event: DragStartEvent) => {
    const task = backlogTasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const hour = over.data?.current?.hour as number | undefined;
    if (hour === undefined) return;
    const startTime = new Date(date);
    startTime.setHours(hour, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(hour + 1, 0, 0, 0);
    try {
      await api.timeboxTask(taskId, startTime.toISOString(), endTime.toISOString());
      load();
    } catch {}
  };

  const handleUnschedule = async (taskId: string) => {
    await api.unscheduleTask(taskId);
    load();
  };

  const handleMagicSchedule = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await api.aiSchedule(date.toISOString());
      setAiResult(result);
      load();
    } catch {}
    setAiLoading(false);
  };

  const dateLabel = date.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  const isToday = new Date().toDateString() === date.toDateString();
  const nowHour = new Date().getHours();

  const gridBlocks = useMemo(() => {
    const blocks: GridBlockProps[] = [];
    for (const ev of events) {
      const s = new Date(ev.start_time);
      const e = new Date(ev.end_time);
      blocks.push({
        id: ev.id,
        title: ev.title,
        startMin: s.getHours() * 60 + s.getMinutes(),
        endMin: e.getHours() * 60 + e.getMinutes(),
        kind: "event",
        eventType: ev.event_type,
        smartTag: ev.smart_tag,
        location: ev.location,
        isIcal: !!ev.ical_uid,
      });
    }
    for (const t of scheduledTasks) {
      if (!t.start_time || !t.end_time) continue;
      const s = new Date(t.start_time);
      const e = new Date(t.end_time);
      blocks.push({
        id: t.id,
        title: t.title,
        startMin: s.getHours() * 60 + s.getMinutes(),
        endMin: e.getHours() * 60 + e.getMinutes(),
        kind: "task",
        priority: t.priority,
        status: t.status,
      });
    }
    return blocks;
  }, [events, scheduledTasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Daily View</h1>
            <p className="text-muted mt-1 text-xs sm:text-sm">
              {viewMode === "timeline" ? "Горизонтальная ось времени" : "Перетащите задачи на временные слоты"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={handleMagicSchedule}
              disabled={aiLoading || backlogTasks.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-xl text-xs font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-40 transition-colors"
            >
              <Sparkles className={`w-3.5 h-3.5 shrink-0 ${aiLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{aiLoading ? "Распределяю..." : "Magic Schedule"}</span>
              <span className="sm:hidden">{aiLoading ? "…" : "Magic"}</span>
            </button>
            <div className="flex items-center bg-card border border-border rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("timeline")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "timeline" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                <GanttChart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Timeline</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "grid" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>
            <a href="/calendar" className="text-sm text-accent hover:text-accent-hover transition-colors hidden sm:inline">
              Недельный вид →
            </a>
          </div>
        </div>

        {/* Date Nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={prevDay} className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-foreground transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={toToday} className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors">
              Сегодня
            </button>
            <button onClick={nextDay} className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-foreground transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <span className={`text-xs sm:text-sm font-medium capitalize text-right max-w-[55%] sm:max-w-none truncate sm:whitespace-normal ${isToday ? "text-accent" : "text-muted"}`}>
            {dateLabel}
          </span>
        </div>

        {/* AI result toast */}
        {aiResult && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-sm">
              <Sparkles className="w-4 h-4 text-purple-400 inline mr-2" />
              {aiResult.message}
              {aiResult.unscheduled_count > 0 && (
                <span className="text-muted ml-2">({aiResult.unscheduled_count} не помещаются)</span>
              )}
            </div>
            <button onClick={() => setAiResult(null)} className="text-muted hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <StaminaBar tasks={[...scheduledTasks, ...backlogTasks.filter(t => !t.is_completed)]} />

        {viewMode === "timeline" ? (
          <>
            <TimelineContainer events={events} tasks={scheduledTasks} date={date} />
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-semibold mb-3 text-muted uppercase tracking-wider">
                Backlog ({backlogTasks.length})
              </h2>
              {backlogTasks.length === 0 ? (
                <p className="text-xs text-muted py-4 text-center">Все задачи распределены</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {backlogTasks.map((task) => <BacklogItem key={task.id} task={task} />)}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
            {/* Backlog */}
            <div className="bg-card border border-border rounded-xl p-4 order-2 lg:order-1">
              <h2 className="text-sm font-semibold mb-3 text-muted uppercase tracking-wider">
                Backlog ({backlogTasks.length})
              </h2>
              {backlogTasks.length === 0 ? (
                <p className="text-xs text-muted py-4 text-center">Все задачи распределены</p>
              ) : (
                <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto">
                  {backlogTasks.map((task) => <BacklogItem key={task.id} task={task} />)}
                </div>
              )}
            </div>

            {/* CSS Grid Calendar */}
            <div className="bg-card border border-border rounded-xl overflow-hidden order-1 lg:order-2">
              <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
                <div
                  className="grid relative"
                  style={{
                    gridTemplateColumns: "64px 1fr",
                    gridTemplateRows: `repeat(${TOTAL_SLOTS}, ${ROW_HEIGHT}px)`,
                  }}
                >
                  {/* Hour labels */}
                  {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
                    const hour = START_HOUR + i;
                    return (
                      <div
                        key={`label-${hour}`}
                        className="text-xs text-muted text-right pr-3 pt-2 border-t border-border/50 font-mono"
                        style={{ gridRow: `${i + 1} / ${i + 2}`, gridColumn: 1 }}
                      >
                        {hour.toString().padStart(2, "0")}:00
                      </div>
                    );
                  })}

                  {/* Drop targets */}
                  {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
                    const hour = START_HOUR + i;
                    return (
                      <GridDropSlot
                        key={`drop-${hour}`}
                        hour={hour}
                        isCurrent={isToday && nowHour === hour}
                      />
                    );
                  })}

                  {/* Events/Tasks overlay — positioned absolutely within column 2 */}
                  <div
                    className="relative"
                    style={{
                      gridRow: `1 / ${TOTAL_SLOTS + 1}`,
                      gridColumn: 2,
                      pointerEvents: "none",
                    }}
                  >
                    <div style={{ position: "relative", height: TOTAL_SLOTS * ROW_HEIGHT, pointerEvents: "auto" }}>
                      {gridBlocks.map((b) => (
                        <GridBlock
                          key={`${b.kind}-${b.id}`}
                          {...b}
                          onUnschedule={b.kind === "task" ? handleUnschedule : undefined}
                        />
                      ))}

                      {/* Now indicator */}
                      {isToday && (() => {
                        const now = new Date();
                        const mins = now.getHours() * 60 + now.getMinutes();
                        const topPx = ((mins - START_HOUR * 60) / 60) * ROW_HEIGHT;
                        if (topPx < 0 || topPx > TOTAL_SLOTS * ROW_HEIGHT) return null;
                        return (
                          <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: topPx }}>
                            <div className="flex items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
                              <div className="flex-1 h-0.5 bg-red-500" />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div className="bg-accent/20 border border-accent rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 shadow-xl">
            <GripVertical className="w-4 h-4 text-accent" />
            <span className={PRIORITY_COLORS[activeTask.priority]}>●</span>
            {activeTask.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
