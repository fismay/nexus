"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  GitBranch,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Box,
  Music,
  Code,
  Briefcase,
  Cpu,
  Layout,
  Sparkles,
  FileText,
  BarChart3,
  StickyNote,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  BOM_STATUS_LABELS,
  PRIORITY_COLORS,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPE_COLORS,
} from "@/lib/types";
import { BomAddModal } from "@/components/bom-add-modal";
import { PhaseAddModal } from "@/components/phase-add-modal";
import { PromptVault } from "@/components/prompt-vault";

type Tab = "overview" | "vault";

const TYPE_ICONS: Record<string, typeof Code> = {
  dev: Code,
  music: Music,
  business: Briefcase,
  hardware: Cpu,
  general: Layout,
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBomModal, setShowBomModal] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const load = useCallback(() => {
    api
      .getProject(projectId)
      .then(setProject)
      .catch(() => router.push("/projects"))
      .finally(() => setLoading(false));
  }, [projectId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (newStatus: string) => {
    await api.updateProject(projectId, { status: newStatus });
    setEditingStatus(false);
    load();
  };

  const handleBomStatusToggle = async (
    itemId: string,
    currentStatus: string
  ) => {
    const next = currentStatus === "received" ? "pending" : "received";
    await api.updateBOMItem(itemId, { status: next });
    load();
  };

  const handleDeleteBom = async (itemId: string) => {
    await api.deleteBOMItem(itemId);
    load();
  };

  const handlePhaseProgress = async (phaseId: string, value: number) => {
    await api.updatePhase(phaseId, { progress_percent: value });
    load();
  };

  const handleDeletePhase = async (phaseId: string) => {
    await api.deletePhase(phaseId);
    load();
  };

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const progress = Math.round(project.overall_progress);
  const totalBomCost = project.bom_items.reduce(
    (s, i) => s + (i.price || 0) * i.quantity,
    0
  );
  const TypeIcon = TYPE_ICONS[project.project_type] || Layout;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/projects")}
          className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5 text-accent" />
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                PROJECT_TYPE_COLORS[project.project_type] || "bg-gray-500/20 text-gray-400"
              }`}
            >
              {PROJECT_TYPE_LABELS[project.project_type] || project.project_type}
            </span>
          </div>
          {project.description && (
            <p className="text-muted mt-0.5">{project.description}</p>
          )}
        </div>
      </div>

      {/* Top bar: status + links */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {editingStatus ? (
              <select
                className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
                value={project.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                onBlur={() => setEditingStatus(false)}
                autoFocus
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => setEditingStatus(true)}
                className={`text-sm px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 ${
                  STATUS_COLORS[project.status] || "bg-gray-500/20 text-gray-400"
                }`}
              >
                {STATUS_LABELS[project.status] || project.status}
                <Edit3 className="w-3 h-3" />
              </button>
            )}
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>Прогресс: <strong className="text-foreground">{progress}%</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {project.repository_url && (
              <a
                href={project.repository_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors"
              >
                <GitBranch className="w-4 h-4" />GitHub<ExternalLink className="w-3 h-3" />
              </a>
            )}
            {project.cad_url && (
              <a
                href={project.cad_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors"
              >
                <Box className="w-4 h-4" />CAD<ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {project.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {project.tech_stack.map((t) => (
              <span key={t} className="text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-md">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "overview" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"
          }`}
        >
          <Layout className="w-4 h-4" />
          Обзор
        </button>
        <button
          onClick={() => setActiveTab("vault")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "vault" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Vault
        </button>
      </div>

      {activeTab === "vault" ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <PromptVault projectId={projectId} />
        </div>
      ) : (
        <>
          {/* Dynamic Workspace: type-specific widgets */}
          {project.project_type === "music" && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Music className="w-5 h-5 text-pink-400" />
                Музыка
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-background rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-muted" />
                    Аудиоплеер (Демки)
                  </h3>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted text-xs">
                    Перетащите аудиофайл или нажмите для загрузки
                  </div>
                </div>
                <div className="bg-background rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-muted" />
                    Лирика / Тексты
                  </h3>
                  <textarea
                    placeholder="Текст песни..."
                    rows={6}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          )}

          {project.project_type === "dev" && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Code className="w-5 h-5 text-cyan-400" />
                Разработка
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {project.repository_url && (
                  <a
                    href={project.repository_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-background rounded-lg p-4 hover:border-accent/30 border border-border transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <GitBranch className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium">GitHub</span>
                    </div>
                    <p className="text-xs text-muted truncate">{project.repository_url}</p>
                  </a>
                )}
                <div className="bg-background rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Layout className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium">Kanban</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {["todo", "in_progress", "done"].map((s) => {
                      const count = project.tasks.filter((t) => t.status === s).length;
                      return (
                        <div key={s} className="flex-1 text-center">
                          <div className="text-lg font-bold">{count}</div>
                          <div className="text-[10px] text-muted capitalize">{s.replace("_", " ")}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {project.project_type === "business" && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                Бизнес
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-background rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-muted" />
                    Метрики
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Задач всего", value: project.tasks.length },
                      { label: "Завершено", value: project.tasks.filter((t) => t.is_completed).length },
                      { label: "BOM позиций", value: project.bom_items.length },
                      { label: "Прогресс", value: `${progress}%` },
                    ].map((m) => (
                      <div key={m.label} className="text-center p-2 bg-card rounded-lg">
                        <div className="text-lg font-bold">{m.value}</div>
                        <div className="text-[10px] text-muted">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-background rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <StickyNote className="w-4 h-4 text-muted" />
                    Заметки / Канвас
                  </h3>
                  <textarea
                    placeholder="Бизнес-заметки, идеи, стратегия..."
                    rows={6}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Phases */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Фазы проекта</h2>
              <button
                onClick={() => setShowPhaseModal(true)}
                className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
              >
                <Plus className="w-4 h-4" />Добавить фазу
              </button>
            </div>
            {project.phases.length === 0 ? (
              <p className="text-muted text-sm">Фазы не определены</p>
            ) : (
              <div className="space-y-3">
                {project.phases.map((phase) => (
                  <div key={phase.id} className="flex items-center gap-4">
                    <span className="text-sm w-40 truncate">{phase.name}</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${phase.progress_percent}%` }}
                      />
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={phase.progress_percent}
                      onChange={(e) => handlePhaseProgress(phase.id, Number(e.target.value))}
                      className="w-16 bg-background border border-border rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-accent"
                    />
                    <span className="text-xs text-muted w-6">%</span>
                    <button
                      onClick={() => handleDeletePhase(phase.id)}
                      className="text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks + Hardware Blockers */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4">Задачи проекта</h2>
            {project.tasks.length === 0 ? (
              <p className="text-muted text-sm">Нет привязанных задач</p>
            ) : (
              <div className="space-y-2">
                {project.tasks.map((task) => {
                  const blockerItem = task.blocker_bom_item_id
                    ? project.bom_items.find((b) => b.id === task.blocker_bom_item_id)
                    : null;
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          task.is_completed
                            ? "bg-success"
                            : task.status === "blocked"
                              ? "bg-red-400"
                              : "bg-muted"
                        }`}
                      />
                      <span
                        className={`flex-1 text-sm ${
                          task.is_completed
                            ? "line-through text-muted"
                            : task.status === "blocked"
                              ? "text-red-300"
                              : "text-foreground"
                        }`}
                      >
                        {task.title}
                        {task.status === "blocked" && blockerItem && (
                          <span className="text-xs text-red-400 ml-2">
                            ⛔ Ожидает: {blockerItem.item_name}
                          </span>
                        )}
                      </span>
                      {task.context_tags.length > 0 && (
                        <div className="flex gap-1">
                          {task.context_tags.map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority] || "text-muted"}`}>
                        {task.priority}
                      </span>
                      {task.deadline && (
                        <span className="text-xs text-muted">
                          {new Date(task.deadline).toLocaleDateString("ru-RU")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* BOM Table */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Спецификация (BOM)</h2>
                {totalBomCost > 0 && (
                  <p className="text-sm text-muted mt-0.5">
                    Общая стоимость: {totalBomCost.toLocaleString("ru-RU")} ₽
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowBomModal(true)}
                className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
              >
                <Plus className="w-4 h-4" />Добавить позицию
              </button>
            </div>
            {project.bom_items.length === 0 ? (
              <p className="text-muted text-sm">Спецификация пуста</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b border-border">
                      <th className="pb-2 font-medium">Получено</th>
                      <th className="pb-2 font-medium">Наименование</th>
                      <th className="pb-2 font-medium">Кол-во</th>
                      <th className="pb-2 font-medium">Цена</th>
                      <th className="pb-2 font-medium">Статус</th>
                      <th className="pb-2 font-medium">Ссылка</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.bom_items.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="py-2.5">
                          <input
                            type="checkbox"
                            checked={item.status === "received"}
                            onChange={() => handleBomStatusToggle(item.id, item.status)}
                            className="w-4 h-4 accent-accent rounded"
                          />
                        </td>
                        <td className={`py-2.5 ${item.status === "received" ? "line-through text-muted" : ""}`}>
                          {item.item_name}
                        </td>
                        <td className="py-2.5">{item.quantity}</td>
                        <td className="py-2.5">
                          {item.price ? `${item.price.toLocaleString("ru-RU")} ₽` : "—"}
                        </td>
                        <td className="py-2.5">
                          <span className="text-xs">{BOM_STATUS_LABELS[item.status] || item.status}</span>
                        </td>
                        <td className="py-2.5">
                          {item.link ? (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:underline flex items-center gap-1"
                            >
                              Ссылка<ExternalLink className="w-3 h-3" />
                            </a>
                          ) : "—"}
                        </td>
                        <td className="py-2.5">
                          <button
                            onClick={() => handleDeleteBom(item.id)}
                            className="text-muted hover:text-danger transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showBomModal && (
        <BomAddModal
          projectId={projectId}
          onClose={() => setShowBomModal(false)}
          onCreated={() => { setShowBomModal(false); load(); }}
        />
      )}
      {showPhaseModal && (
        <PhaseAddModal
          projectId={projectId}
          onClose={() => setShowPhaseModal(false)}
          onCreated={() => { setShowPhaseModal(false); load(); }}
        />
      )}
    </div>
  );
}
