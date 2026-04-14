"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ProjectCard as ProjectCardType } from "@/lib/types";
import { ProjectCardComponent } from "@/components/project-card";
import { CreateProjectModal } from "@/components/create-project-modal";
import { Plus, FolderKanban } from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    api
      .listProjects()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="nexus-skeleton h-9 w-48 max-w-full mb-2" />
            <div className="nexus-skeleton h-4 w-72 max-w-full" />
          </div>
          <div className="nexus-skeleton h-11 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="nexus-surface nexus-surface--static rounded-xl p-5 min-h-[180px]">
              <div className="nexus-skeleton h-6 w-3/4 mb-3" />
              <div className="nexus-skeleton h-3 w-1/2 mb-4" />
              <div className="nexus-skeleton h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="nexus-page-title-bar text-2xl sm:text-3xl font-bold tracking-tight">
            Проекты
          </h1>
          <p className="text-muted mt-2 text-sm sm:text-base">
            Управление инженерными проектами
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Новый проект
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="nexus-surface nexus-surface--static rounded-xl p-16 text-center">
          <FolderKanban className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Нет проектов</h3>
          <p className="text-muted mb-6">Создайте первый проект для начала работы</p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Создать проект
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCardComponent key={p.id} project={p} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}
