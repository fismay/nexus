"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import type { Task } from "@/lib/types";
import { PRIORITY_COLORS, CONTEXT_TAG_COLORS } from "@/lib/types";

interface Props {
  task: Task;
}

export function BacklogItem({ task }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border bg-background cursor-grab active:cursor-grabbing transition-opacity ${
        isDragging ? "opacity-30" : "hover:border-accent/30"
      }`}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="w-3.5 h-3.5 text-muted flex-shrink-0" />
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[task.priority]?.replace("text-", "bg-") || "bg-muted"}`} />
      <div className="flex-1 min-w-0">
        <span className="text-xs block truncate">{task.title}</span>
        {task.context_tags.length > 0 && (
          <div className="flex gap-1 mt-0.5">
            {task.context_tags.map((tag) => (
              <span
                key={tag}
                className={`text-[10px] px-1 rounded ${CONTEXT_TAG_COLORS[tag] || "bg-white/5 text-muted"}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
