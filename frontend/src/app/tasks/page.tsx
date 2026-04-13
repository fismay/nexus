"use client";

import { useEffect, useState } from "react";
import { Plus, Check, ListTodo, Crosshair, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import type { Task, ProjectCard } from "@/lib/types";
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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
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
    Promise.all([
      api.listTasks({ contextTag: activeTag || undefined }),
      api.listProjects(),
    ])
      .then(([t, p]) => {
        setTasks(t);
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

  const filtered = tasks.filter((t) => {
    if (filter === "active") return !t.is_completed && t.status !== "blocked";
    if (filter === "blocked") return t.status === "blocked";
    if (filter === "done") return t.is_completed;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Задачи</h1>
          <p className="text-muted mt-1">
            {activeTag
              ? `Фильтр: ${activeTag}`
              : "Глобальный список задач"}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Добавить задачу
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="bg-card border border-border rounded-xl p-5 space-y-3"
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
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <ListTodo className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted">Нет задач</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <div
              key={task.id}
              className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 group hover:border-accent/30 transition-colors"
            >
              <button
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

              {/* Focus Button */}
              {!task.is_completed && task.status !== "blocked" && (
                <button
                  onClick={() => startFocus(task)}
                  title="Start Focus"
                  className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Crosshair className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => deleteTask(task.id)}
                className="text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
