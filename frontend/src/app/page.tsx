"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ProjectCard as ProjectCardType, Task } from "@/lib/types";
import { ProjectCardComponent } from "@/components/project-card";
import { AiBriefWidget } from "@/components/ai-brief-widget";
import { FolderKanban, ListTodo, CalendarDays, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectCardType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listProjects(), api.listTasks()])
      .then(([p, t]) => {
        setProjects(p);
        setTasks(t);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const pendingTasks = tasks.filter((t) => !t.is_completed).length;
  const avgProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce((s, p) => s + p.overall_progress, 0) / projects.length
        )
      : 0;

  const stats = [
    {
      label: "Проекты",
      value: projects.length,
      icon: FolderKanban,
      color: "text-accent",
    },
    {
      label: "Активные",
      value: activeProjects,
      icon: TrendingUp,
      color: "text-emerald-400",
    },
    {
      label: "Задачи в работе",
      value: pendingTasks,
      icon: ListTodo,
      color: "text-amber-400",
    },
    {
      label: "Средний прогресс",
      value: `${avgProgress}%`,
      icon: CalendarDays,
      color: "text-blue-400",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-muted mt-1 text-sm sm:text-base">Обзор проектов и задач</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 min-h-[4.5rem]"
          >
            <div className={`p-2.5 sm:p-3 rounded-lg bg-white/5 ${s.color} shrink-0`}>
              <s.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs sm:text-sm text-muted leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Brief */}
      <AiBriefWidget />

      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Проекты</h2>
        {projects.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <FolderKanban className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted">Нет проектов. Создайте первый!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCardComponent key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
