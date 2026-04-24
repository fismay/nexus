"use client";

import { AlertTriangle, ArrowRight, MapPin } from "lucide-react";
import type { ConflictWarning } from "@/lib/types";

interface Props {
  conflict: ConflictWarning;
  onAcceptSuggestion?: () => void;
  onDismiss?: () => void;
}

export function ConflictWarningBanner({
  conflict,
  onAcceptSuggestion,
  onDismiss,
}: Props) {
  if (!conflict.has_conflict) return null;

  const suggestedTime = conflict.suggested_start
    ? `${new Date(conflict.suggested_start).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : null;

  return (
    <div className="bg-warning/15 border border-warning/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Конфликт расписания
          </p>
          <p className="text-sm text-foreground-muted mt-1">
            В это время у тебя{" "}
            <strong className="text-foreground">
              {conflict.conflicting_event_title}
            </strong>
            {conflict.conflicting_event_location && (
              <span className="inline-flex items-center gap-1 ml-1">
                <MapPin className="w-3 h-3" />
                {conflict.conflicting_event_location}
              </span>
            )}
          </p>
          {suggestedTime && (
            <p className="text-sm text-foreground-muted mt-1">
              Перенести задачу на{" "}
              <strong className="text-accent">{suggestedTime}</strong>{" "}
              (ближайшее окно)?
            </p>
          )}
          <div className="flex items-center gap-3 mt-3">
            {suggestedTime && onAcceptSuggestion && (
              <button
                onClick={onAcceptSuggestion}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Перенести на {suggestedTime}
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-xs text-foreground-muted hover:text-foreground-secondary transition-colors"
              >
                Оставить как есть
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
