"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, GripVertical, LayoutGrid, GanttChart } from "lucide-react";
import { api } from "@/lib/api";
import type { Task, CalendarEvent } from "@/lib/types";
import { PRIORITY_COLORS } from "@/lib/types";
import { BacklogItem } from "@/components/dnd/backlog-item";
import { TimeSlot } from "@/components/dnd/time-slot";
import { StaminaBar } from "@/components/stamina-bar";
import { TimelineContainer } from "@/components/timeline-container";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

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
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("timeline");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
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
            const st = new Date(t.start_time);
            return (
              st.toDateString() === date.toDateString()
            );
          })
        );
        setEvents(evts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const prevDay = () =>
    setDate((d) => new Date(d.getTime() - 24 * 60 * 60 * 1000));
  const nextDay = () =>
    setDate((d) => new Date(d.getTime() + 24 * 60 * 60 * 1000));
  const toToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setDate(d);
  };

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
      await api.timeboxTask(
        taskId,
        startTime.toISOString(),
        endTime.toISOString()
      );
      load();
    } catch {
      /* ignore */
    }
  };

  const handleUnschedule = async (taskId: string) => {
    await api.unscheduleTask(taskId);
    load();
  };

  const dateLabel = date.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const isToday = new Date().toDateString() === date.toDateString();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Daily View</h1>
            <p className="text-muted mt-1">
              {viewMode === "timeline" ? "Горизонтальная ось времени" : "Перетащите задачи на временные слоты"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-card border border-border rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("timeline")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "timeline" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                <GanttChart className="w-3.5 h-3.5" />
                Timeline
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "grid" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Grid
              </button>
            </div>
            <a
              href="/calendar"
              className="text-sm text-accent hover:text-accent-hover transition-colors"
            >
              Недельный вид →
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={prevDay}
              className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={toToday}
              className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Сегодня
            </button>
            <button
              onClick={nextDay}
              className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <span
            className={`text-sm font-medium capitalize ${isToday ? "text-accent" : "text-muted"}`}
          >
            {dateLabel}
          </span>
        </div>

        {/* Stamina Bar */}
        <StaminaBar tasks={[...scheduledTasks, ...backlogTasks.filter(t => !t.is_completed)]} />

        {viewMode === "timeline" ? (
          <>
            {/* Horizontal Timeline */}
            <TimelineContainer events={events} tasks={scheduledTasks} date={date} />

            {/* Backlog (below timeline) */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-semibold mb-3 text-muted uppercase tracking-wider">
                Backlog ({backlogTasks.length})
              </h2>
              {backlogTasks.length === 0 ? (
                <p className="text-xs text-muted py-4 text-center">Все задачи распределены</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {backlogTasks.map((task) => (
                    <BacklogItem key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-[280px_1fr] gap-6">
            {/* Backlog Panel */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-semibold mb-3 text-muted uppercase tracking-wider">
                Backlog ({backlogTasks.length})
              </h2>
              {backlogTasks.length === 0 ? (
                <p className="text-xs text-muted py-4 text-center">Все задачи распределены</p>
              ) : (
                <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto">
                  {backlogTasks.map((task) => (
                    <BacklogItem key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>

            {/* Time Grid */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {HOURS.map((hour) => {
                const slotTasks = scheduledTasks.filter((t) => {
                  if (!t.start_time) return false;
                  return new Date(t.start_time).getHours() === hour;
                });
                const slotEvents = events.filter(
                  (e) => new Date(e.start_time).getHours() === hour
                );
                const nowHour = new Date().getHours();
                const isCurrent = isToday && nowHour === hour;

                return (
                  <TimeSlot
                    key={hour}
                    hour={hour}
                    isCurrent={isCurrent}
                    tasks={slotTasks}
                    events={slotEvents}
                    onUnschedule={handleUnschedule}
                  />
                );
              })}
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
