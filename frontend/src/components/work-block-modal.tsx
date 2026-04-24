"use client";

import { useState } from "react";
import { X, Clock } from "lucide-react";
import { api } from "@/lib/api";
import type { ProjectCard } from "@/lib/types";
import { MiniCalendarPicker } from "@/components/mini-calendar-picker";

interface Props {
  projects: ProjectCard[];
  onClose: () => void;
  onCreated: () => void;
}

export function WorkBlockModal({ projects, onClose, onCreated }: Props) {
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !date) return;
    setSaving(true);

    const projectTitle =
      projects.find((p) => p.id === projectId)?.title || "Проект";

    try {
      await api.createEvent({
        title: `Работа: ${projectTitle}`,
        event_type: "work_block",
        start_time: new Date(`${date}T${startTime}`).toISOString(),
        end_time: new Date(`${date}T${endTime}`).toISOString(),
        project_id: projectId,
        color: "#6366f1",
      });
      onCreated();
    } catch {
      alert("Ошибка при создании блока");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-lg">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Блок работы над проектом</h2>
          </div>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Проект *</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              required
            >
              <option value="" disabled>
                Выберите проект
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <MiniCalendarPicker
            value={date}
            onChange={setDate}
            label="Дата"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Начало</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Окончание
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving || !projectId || !date}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? "Создание..." : "Запланировать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
