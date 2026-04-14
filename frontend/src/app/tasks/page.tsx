"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Check,
  ListTodo,
  Crosshair,
  ShieldAlert,
  FlaskConical,
  CalendarDays,
  GraduationCap,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Task, ProjectCard, CalendarEvent } from "@/lib/types";
import {
  PRIORITY_COLORS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  CONTEXT_TAG_COLORS,
  CONTEXT_TAGS,
  ENERGY_LABELS,
  ENERGY_COLORS,
} from "@/lib/types";
import { useContextTag } from "@/lib/context-tag-provider";
import { useFocus } from "@/lib/focus-context";

type AgendaRow =
  | { kind: "task"; task: Task }
  | { kind: "event"; ev: CalendarEvent };

function agendaSortKey(row: AgendaRow): number {
  if (row.kind === "event") {
    return new Date(row.ev.start_time).getTime();
  }
  const t = row.task;
  if (t.start_time) return new Date(t.start_time).getTime();
  if (t.deadline) return new Date(t.deadline).getTime();
  return Number.MAX_SAFE_INTEGER;
}

function eventKindLabel(ev: CalendarEvent): string {
  if (ev.event_type === "class") {
    if (ev.smart_tag === "@theory") return "Лекция";
    if (ev.smart_tag === "@practice") return "Практика";
    return "Пара";
  }
  if (ev.event_type === "meeting") return "Встреча";
  if (ev.event_type === "work_block") return "Блок работы";
  if (ev.event_type === "deadline") return "Дедлайн";
  return "Событие";
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newProjectId, setNewProjectId] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newEnergy, setNewEnergy] = useState(2);
  const [filter, setFilter] = useState<"all" | "active" | "blocked" | "done">(
    "all"
  );
  const { activeTag } = useContextTag();
  const { startFocus } = useFocus();

  const load = () => {
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - 1);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 50);

    Promise.all([
      api.listTasks({ contextTag: activeTag || undefined }),
      api.listEvents(rangeStart.toISOString(), rangeEnd.toISOString()),
      api.listProjects(),
    ])
      .then(([t, ev, p]) => {
        setTasks(t);
        setCalendarEvents(ev);
        setProjects(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTag]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await api.createTask({
      title: newTitle.trim(),
      priority: newPriority,
      project_id: newProjectId || null,
      deadline: newDeadline || null,
      context_tags: newTags,
      energy_cost: newEnergy,
    });
    setNewTitle("");
    setNewPriority("medium");
    setNewProjectId("");
    setNewDeadline("");
    setNewTags([]);
    setNewEnergy(2);
    setShowAdd(false);
    load();
  };

  const toggleComplete = async (task: Task) => {
    await api.updateTask(task.id, { is_completed: !task.is_completed });
    load();
  };

  const deleteTask = async (id: string) => {
    await api.deleteTask(id);
    load();
  };

  const toggleNewTag = (tag: string) => {
    setNewTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const agendaRows = useMemo((): AgendaRow[] => {
    const rows: AgendaRow[] = [
      ...tasks.map((task) => ({ kind: "task" as const, task })),
      ...calendarEvents.map((ev) => ({ kind: "event" as const, ev })),
    ];
    rows.sort((a, b) => agendaSortKey(a) - agendaSortKey(b));
    return rows;
  }, [tasks, calendarEvents]);

  const filtered = agendaRows.filter((row) => {
    if (row.kind === "event") {
      const ev = row.ev;
      if (filter === "done" || filter === "blocked") return false;
      if (filter === "active") {
        return new Date(ev.end_time).getTime() > Date.now() - 60 * 60 * 1000;
      }
      return true;
    }
    const t = row.task;
    if (filter === "active") return !t.is_completed && t.status !== "blocked";
    if (filter === "blocked") return t.status === "blocked";
    if (filter === "done") return t.is_completed;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="nexus-skeleton h-9 w-40 mb-2" />
        <div className="nexus-skeleton h-4 w-64" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="nexus-skeleton h-9 w-24 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="nexus-surface nexus-surface--static rounded-lg px-4 py-3">
              <div className="nexus-skeleton h-4 w-[85%]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="nexus-page-title-bar text-2xl sm:text-3xl font-bold tracking-tight">
            Задачи
          </h1>
          <p className="text-muted mt-2 text-sm sm:text-base">
            {activeTag
              ? `Фильтр задач: ${activeTag} · в календаре — все занятости (пары, события)`
              : "Задачи и всё, что занимает время: пары, лекции, встречи, таймбоксы"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Добавить задачу
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="nexus-surface nexus-surface--static rounded-xl p-5 space-y-3"
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Название задачи..."
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            autoFocus
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            >
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
              <option value="critical">Критичный</option>
            </select>
            <select
              value={newProjectId}
              onChange={(e) => setNewProjectId(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            >
              <option value="">Без проекта</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          {/* Context Tags */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Теги:</span>
            {CONTEXT_TAGS.map((tag) => (
              <button
                key={tag.value}
                type="button"
                onClick={() => toggleNewTag(tag.value)}
                className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                  newTags.includes(tag.value)
                    ? tag.color
                    : "bg-white/5 text-muted hover:text-foreground"
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
          {/* Energy Cost */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Энергия:</span>
            {[1, 2, 3].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setNewEnergy(level)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  newEnergy === level
                    ? `bg-white/10 font-medium ${ENERGY_COLORS[level]}`
                    : "bg-white/5 text-muted hover:text-foreground"
                }`}
              >
                {ENERGY_LABELS[level]}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Создать
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-2">
        {(["all", "active", "blocked", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-accent/15 text-accent"
                : "text-muted hover:text-foreground hover:bg-white/5"
            }`}
          >
            {f === "all"
              ? "Все"
              : f === "active"
                ? "Активные"
                : f === "blocked"
                  ? "Заблокированные"
                  : "Завершённые"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="nexus-surface nexus-surface--static rounded-xl p-12 text-center">
          <ListTodo className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted">Нет задач и событий по фильтру</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => {
            if (row.kind === "event") {
              return (
              <div
                key={`ev-${row.ev.id}-${row.ev.start_time}`}
                className="nexus-surface nexus-surface--static rounded-lg px-4 py-3 flex items-start gap-3 border-l-2 border-l-sky-500/80"
              >
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                  {row.ev.event_type === "class" ? (
                    row.ev.smart_tag === "@practice" ? (
                      <FlaskConical className="w-4 h-4" />
                    ) : (
                      <GraduationCap className="w-4 h-4" />
                    )
                  ) : (
                    <CalendarDays className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{row.ev.title}</span>
                    <span className="text-[10px] uppercase tracking-wide text-sky-400/90">
                      {eventKindLabel(row.ev)}
                    </span>
                    {row.ev.ical_uid && (
                      <span className="text-[10px] text-muted">импорт</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>
                      {new Date(row.ev.start_time).toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" — "}
                      {new Date(row.ev.end_time).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {row.ev.location && (
                      <span className="truncate">{row.ev.location}</span>
                    )}
                  </div>
                </div>
              </div>
              );
            }
            const task = row.task;
            return (
            <div
              key={task.id}
              className="nexus-surface rounded-lg px-4 py-3 flex items-center gap-3 group"
            >
              <button
                type="button"
                onClick={() => toggleComplete(task)}
                className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                  task.is_completed
                    ? "bg-success border-success"
                    : "border-muted hover:border-accent"
                }`}
              >
                {task.is_completed && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      task.is_completed ? "line-through text-muted" : ""
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.status === "blocked" && (
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {task.project_id && (
                    <span className="text-xs text-muted">
                      {projects.find((p) => p.id === task.project_id)?.title}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      TASK_STATUS_COLORS[task.status] || ""
                    }`}
                  >
                    {TASK_STATUS_LABELS[task.status] || task.status}
                  </span>
                  {task.context_tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        CONTEXT_TAG_COLORS[tag] || "bg-white/5 text-muted"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <span className={`text-[10px] ${ENERGY_COLORS[task.energy_cost] || "text-muted"}`} title={`Энергия: ${ENERGY_LABELS[task.energy_cost]}`}>
                ⚡{task.energy_cost}
              </span>
              <span
                className={`text-xs font-medium ${
                  PRIORITY_COLORS[task.priority] || "text-muted"
                }`}
              >
                {task.priority}
              </span>
              {task.deadline && (
                <span className="text-xs text-muted">
                  {new Date(task.deadline).toLocaleDateString("ru-RU")}
                </span>
              )}

              {!task.is_completed && task.status !== "blocked" && (
                <button
                  type="button"
                  onClick={() => startFocus(task)}
                  title="Start Focus"
                  className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Crosshair className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => deleteTask(task.id)}
                className="text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
