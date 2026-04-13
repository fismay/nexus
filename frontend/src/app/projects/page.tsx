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
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Проекты</h1>
          <p className="text-muted mt-1">Управление инженерными проектами</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Новый проект
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
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
