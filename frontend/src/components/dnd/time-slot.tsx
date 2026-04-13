"use client";

import { useDroppable } from "@dnd-kit/core";
import { X } from "lucide-react";
import type { Task, CalendarEvent } from "@/lib/types";
import { PRIORITY_COLORS, TASK_STATUS_COLORS } from "@/lib/types";

interface Props {
  hour: number;
  isCurrent: boolean;
  tasks: Task[];
  events: CalendarEvent[];
  onUnschedule: (taskId: string) => void;
}

const EVENT_COLORS: Record<string, string> = {
  class: "bg-blue-500/20 border-l-blue-500",
  meeting: "bg-purple-500/20 border-l-purple-500",
  work_block: "bg-indigo-500/20 border-l-indigo-500",
  deadline: "bg-red-500/20 border-l-red-500",
  other: "bg-gray-500/20 border-l-gray-500",
};

export function TimeSlot({
  hour,
  isCurrent,
  tasks,
  events,
  onUnschedule,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${hour}`,
    data: { hour },
  });

  const timeLabel = `${hour.toString().padStart(2, "0")}:00`;

  return (
    <div
      ref={setNodeRef}
      className={`flex border-t border-border min-h-[52px] transition-colors ${
        isOver ? "bg-accent/10" : isCurrent ? "bg-accent/5" : ""
      }`}
    >
      <div className="w-16 flex-shrink-0 text-xs text-muted text-right pr-3 pt-2">
        {timeLabel}
      </div>
      <div className="flex-1 p-1 flex flex-wrap gap-1">
        {events.map((ev) => (
          <div
            key={ev.id}
            className={`${EVENT_COLORS[ev.event_type] || EVENT_COLORS.other} border-l-2 rounded-r px-2 py-1 text-xs truncate`}
          >
            {ev.title}
          </div>
        ))}
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs group ${
              TASK_STATUS_COLORS[task.status] || "bg-white/5"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                PRIORITY_COLORS[task.priority]?.replace("text-", "bg-") ||
                "bg-muted"
              }`}
            />
            <span className="truncate">{task.title}</span>
            <button
              onClick={() => onUnschedule(task.id)}
              className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {isOver && (
          <div className="border-2 border-dashed border-accent/40 rounded px-2 py-1 text-xs text-accent">
            Перетащите сюда
          </div>
        )}
      </div>
    </div>
  );
}
