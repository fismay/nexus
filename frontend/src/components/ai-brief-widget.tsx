"use client";

import { useEffect, useState } from "react";
import { Brain, AlertTriangle, Info, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

interface Insight {
  type: string;
  severity: string;
  title: string;
  suggestion: string;
  entity_id: string;
  entity_type: string;
}

export function AiBriefWidget() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAiBrief()
      .then((data) => {
        setInsights(data.insights as unknown as Insight[]);
        setAiSummary(data.ai_summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg p-5 border border-border bg-surface">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">AI Brief</h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-foreground-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-5 border border-border bg-surface">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">AI Brief</h3>
        {insights.length > 0 && (
          <span className="text-[10px] bg-accent-subtle text-accent px-1.5 py-0.5 rounded-full">
            {insights.length}
          </span>
        )}
      </div>

      {aiSummary && (
        <div className="bg-accent-subtle border border-accent/20 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground-secondary leading-relaxed">{aiSummary}</p>
          </div>
        </div>
      )}

      {insights.length === 0 ? (
        <p className="text-xs text-foreground-muted py-4 text-center">Всё под контролем. Нет застоявшихся элементов.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg text-xs ${
                ins.severity === "warning"
                  ? "bg-warning/15 border border-warning/30 text-warning"
                  : "bg-info/15 border border-info/30 text-info"
              }`}
            >
              {ins.severity === "warning" ? (
                <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 flex-shrink-0" />
              ) : (
                <Info className="w-3.5 h-3.5 text-info mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium text-foreground">{ins.title}</p>
                <p className="text-foreground-muted mt-0.5">{ins.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
