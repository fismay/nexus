"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Copy,
  Check,
  Trash2,
  Sparkles,
  X,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Prompt } from "@/lib/types";
import { AI_MODEL_COLORS } from "@/lib/types";

const AI_MODELS = ["Ollama", "Claude", "ChatGPT", "Suno", "Midjourney"];

interface Props {
  projectId: string;
}

export function PromptVault({ projectId }: Props) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [aiModel, setAiModel] = useState("Ollama");
  const [saving, setSaving] = useState(false);

  const load = () => {
    api
      .listPrompts(projectId)
      .then(setPrompts)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await api.createPrompt({
        title: title.trim(),
        content: content.trim(),
        ai_model: aiModel,
        project_id: projectId,
      });
      setTitle("");
      setContent("");
      setShowCreate(false);
      load();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (prompt: Prompt) => {
    await navigator.clipboard.writeText(prompt.content);
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    await api.deletePrompt(id);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          AI Vault
        </h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? "Отмена" : "Новый промпт"}
        </button>
      </div>

      {showCreate && (
        <div className="bg-background border border-border rounded-xl p-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название промпта"
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Текст промпта..."
            rows={5}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">AI Модель:</span>
              {AI_MODELS.map((m) => (
                <button
                  key={m}
                  onClick={() => setAiModel(m)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    aiModel === m
                      ? AI_MODEL_COLORS[m] || "bg-accent/20 text-accent"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={handleCreate}
              disabled={saving || !title.trim() || !content.trim()}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Сохранить
            </button>
          </div>
        </div>
      )}

      {prompts.length === 0 && !showCreate ? (
        <p className="text-muted text-sm py-6 text-center">
          Промпты не добавлены. Нажмите «Новый промпт» чтобы начать.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="bg-background border border-border rounded-xl p-4 group hover:border-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{prompt.title}</h3>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                      AI_MODEL_COLORS[prompt.ai_model] || "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {prompt.ai_model}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(prompt)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-accent transition-colors"
                    title="Скопировать"
                  >
                    {copiedId === prompt.id ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(prompt.id)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-red-400 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <pre className="text-xs text-muted whitespace-pre-wrap break-words font-mono leading-relaxed max-h-32 overflow-y-auto">
                {prompt.content}
              </pre>
              <div className="mt-2 text-[10px] text-muted">
                {new Date(prompt.created_at).toLocaleDateString("ru-RU")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
