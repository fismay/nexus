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
      <div className="nexus-surface nexus-surface--static rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-semibold">AI Brief</h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="nexus-surface nexus-surface--static rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-400" />
        <h3 className="text-sm font-semibold">AI Brief</h3>
        {insights.length > 0 && (
          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">
            {insights.length}
          </span>
        )}
      </div>

      {aiSummary && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-200 leading-relaxed">{aiSummary}</p>
          </div>
        </div>
      )}

      {insights.length === 0 ? (
        <p className="text-xs text-muted py-4 text-center">Всё под контролем. Нет застоявшихся элементов.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg text-xs ${
                ins.severity === "warning"
                  ? "bg-amber-500/10 border border-amber-500/20"
                  : "bg-blue-500/10 border border-blue-500/20"
              }`}
            >
              {ins.severity === "warning" ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">{ins.title}</p>
                <p className="text-muted mt-0.5">{ins.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
