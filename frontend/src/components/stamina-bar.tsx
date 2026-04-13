"use client";

import { Zap, AlertTriangle } from "lucide-react";
import type { Task } from "@/lib/types";
import { ENERGY_LABELS, ENERGY_COLORS } from "@/lib/types";

interface Props {
  tasks: Task[];
  dailyLimit?: number;
}

export function StaminaBar({ tasks, dailyLimit = 10 }: Props) {
  const totalCost = tasks.reduce((sum, t) => sum + (t.energy_cost || 2), 0);
  const percentage = Math.min((totalCost / dailyLimit) * 100, 100);
  const isOverloaded = totalCost > dailyLimit;
  const remaining = dailyLimit - totalCost;

  const byLevel = [1, 2, 3].map((level) => ({
    level,
    count: tasks.filter((t) => (t.energy_cost || 2) === level).length,
    label: ENERGY_LABELS[level],
    color: ENERGY_COLORS[level],
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${isOverloaded ? "text-red-400" : "text-amber-400"}`} />
          <span className="text-sm font-semibold">Stamina</span>
        </div>
        <span className={`text-sm font-bold ${isOverloaded ? "text-red-400" : "text-foreground"}`}>
          {totalCost} / {dailyLimit}
        </span>
      </div>

      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOverloaded
              ? "bg-gradient-to-r from-red-500 to-red-400"
              : percentage > 75
                ? "bg-gradient-to-r from-amber-500 to-amber-400"
                : "bg-gradient-to-r from-emerald-500 to-emerald-400"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-3">
          {byLevel.map((l) => (
            l.count > 0 && (
              <span key={l.level} className="flex items-center gap-1">
                <span className={l.color}>●</span>
                {l.label}: {l.count}
              </span>
            )
          ))}
        </div>
        <span>
          {isOverloaded
            ? `Превышение на ${Math.abs(remaining)}`
            : `Осталось: ${remaining}`
          }
        </span>
      </div>

      {isOverloaded && (
        <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-300">
            Capacity exceeded. Consider moving tasks.
          </span>
        </div>
      )}
    </div>
  );
}
