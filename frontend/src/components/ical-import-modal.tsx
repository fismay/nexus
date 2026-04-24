"use client";

import { useState } from "react";
import {
  X,
  Upload,
  BookOpen,
  FlaskConical,
  Check,
  MapPin,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { ICalPreviewEvent, ICalImportResponse } from "@/lib/types";
import { SMART_TAG_LABELS, WEEK_PARITY_LABELS } from "@/lib/types";
import { MiniCalendarPicker } from "@/components/mini-calendar-picker";

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export function ICalImportModal({ onClose, onImported }: Props) {
  const [mode, setMode] = useState<"url" | "paste">("url");
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [semesterStart, setSemesterStart] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<ICalImportResponse | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");

  const handlePreview = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await api.previewIcal({
        url: mode === "url" ? url : undefined,
        raw_text: mode === "paste" ? rawText : undefined,
        semester_start: semesterStart || undefined,
      });
      setPreview(result);
      setSelected(new Set(result.events.map((_, i) => i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const eventsToImport = preview.events.filter((_, i) => selected.has(i));
      await api.confirmIcalImport(eventsToImport);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка импорта");
    } finally {
      setSaving(false);
    }
  };

  const toggleEvent = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (!preview) return;
    if (selected.size === preview.events.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(preview.events.map((_, i) => i)));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-lg">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Импорт из вуза</h2>
          </div>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!preview ? (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("url")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    mode === "url" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"
                  }`}
                >
                  По ссылке
                </button>
                <button
                  onClick={() => setMode("paste")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    mode === "paste" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"
                  }`}
                >
                  Вставить текст
                </button>
              </div>

              {mode === "url" ? (
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://university.ru/schedule/export.ics"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                />
              ) : (
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="BEGIN:VCALENDAR&#10;...&#10;END:VCALENDAR"
                  rows={8}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none font-mono text-xs"
                />
              )}

              <div>
                <MiniCalendarPicker
                  value={semesterStart}
                  onChange={setSemesterStart}
                  label="Начало семестра (для числитель/знаменатель)"
                />
                <p className="text-xs text-muted mt-1">
                  Нужна для корректного определения чётных/нечётных недель при INTERVAL=2
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
            </>
          ) : (
            <>
              {/* Preview Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">{preview.total}</div>
                  <div className="text-xs text-muted">Всего</div>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">{preview.weekly_count}</div>
                  <div className="text-xs text-muted">Еженедельно</div>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-400">{preview.numerator_count}</div>
                  <div className="text-xs text-muted">Числитель</div>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-400">{preview.denominator_count}</div>
                  <div className="text-xs text-muted">Знаменатель</div>
                </div>
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleAll}
                  className="text-sm text-accent hover:text-accent-hover transition-colors"
                >
                  {selected.size === preview.events.length ? "Снять все" : "Выбрать все"}
                </button>
                <span className="text-xs text-muted">
                  Выбрано: {selected.size} из {preview.total}
                </span>
              </div>

              {/* Event list */}
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {preview.events.map((ev, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      selected.has(i) ? "bg-accent/10 border border-accent/30" : "bg-background border border-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleEvent(i)}
                      className="w-4 h-4 accent-accent rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {ev.smart_tag === "@theory" && <BookOpen className="w-3.5 h-3.5 text-blue-400" />}
                        {ev.smart_tag === "@practice" && <FlaskConical className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="text-sm font-medium truncate">{ev.title}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted">
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{ev.location}
                          </span>
                        )}
                        <span>
                          {new Date(ev.start_time).toLocaleTimeString("ru-RU", {hour: "2-digit", minute: "2-digit"})}
                          {" – "}
                          {new Date(ev.end_time).toLocaleTimeString("ru-RU", {hour: "2-digit", minute: "2-digit"})}
                        </span>
                        {ev.smart_tag && (
                          <span className={`px-1.5 py-0.5 rounded ${
                            ev.smart_tag === "@theory" ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"
                          }`}>
                            {SMART_TAG_LABELS[ev.smart_tag]}
                          </span>
                        )}
                        {ev.week_parity && (
                          <span className={`px-1.5 py-0.5 rounded ${
                            ev.week_parity === "numerator" ? "bg-blue-500/10 text-blue-300" : "bg-amber-500/10 text-amber-300"
                          }`}>
                            {WEEK_PARITY_LABELS[ev.week_parity]}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-border">
          {!preview ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-foreground">
                Отмена
              </button>
              <button
                onClick={handlePreview}
                disabled={loading || (!url && !rawText)}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Предпросмотр
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setPreview(null)} className="px-4 py-2 text-sm text-muted hover:text-foreground">
                Назад
              </button>
              <button
                onClick={handleImport}
                disabled={saving || selected.size === 0}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Импортировать ({selected.size})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
