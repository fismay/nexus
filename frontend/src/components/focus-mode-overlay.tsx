"use client";

import { useFocus } from "@/lib/focus-context";
import { api } from "@/lib/api";
import { Play, Pause, Square, CheckCircle2, Timer, Clock } from "lucide-react";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function FocusModeOverlay() {
  const {
    isActive,
    task,
    timerMode,
    elapsedSeconds,
    pomodoroTotal,
    isPaused,
    pauseFocus,
    resumeFocus,
    stopFocus,
    completeTask,
  } = useFocus();

  if (!isActive || !task) return null;

  const displayTime =
    timerMode === "pomodoro"
      ? Math.max(0, pomodoroTotal - elapsedSeconds)
      : elapsedSeconds;

  const pomodoroPercent =
    timerMode === "pomodoro"
      ? Math.min(100, (elapsedSeconds / pomodoroTotal) * 100)
      : 0;

  const isTimerDone = timerMode === "pomodoro" && elapsedSeconds >= pomodoroTotal;

  const handleComplete = async () => {
    try {
      await api.updateTask(task.id, { is_completed: true });
    } catch {
      /* ignore */
    }
    completeTask();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b0f1a] flex flex-col items-center justify-center">
      {/* Pomodoro ring */}
      {timerMode === "pomodoro" && (
        <svg className="absolute w-80 h-80 opacity-20" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#1e293b"
            strokeWidth="6"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#6366f1"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 90}`}
            strokeDashoffset={`${2 * Math.PI * 90 * (1 - pomodoroPercent / 100)}`}
            transform="rotate(-90 100 100)"
            className="transition-all duration-1000"
          />
        </svg>
      )}

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="flex items-center gap-2 text-muted text-sm">
          {timerMode === "pomodoro" ? (
            <Timer className="w-4 h-4" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {timerMode === "pomodoro" ? "Pomodoro 25 мин" : "Секундомер"}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-center max-w-lg px-4">
          {task.title}
        </h1>

        <div
          className={`text-7xl md:text-8xl font-mono font-bold tabular-nums ${
            isTimerDone
              ? "text-emerald-400 animate-pulse"
              : isPaused
                ? "text-amber-400"
                : "text-foreground"
          }`}
        >
          {formatTime(displayTime)}
        </div>

        {isTimerDone && (
          <p className="text-emerald-400 text-lg font-medium">
            Время вышло! Отличная работа.
          </p>
        )}

        <div className="flex items-center gap-4">
          {isPaused ? (
            <button
              onClick={resumeFocus}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
            >
              <Play className="w-5 h-5" />
              Продолжить
            </button>
          ) : (
            <button
              onClick={pauseFocus}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
            >
              <Pause className="w-5 h-5" />
              Пауза
            </button>
          )}

          <button
            onClick={handleComplete}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            <CheckCircle2 className="w-5 h-5" />
            Завершить задачу
          </button>

          <button
            onClick={stopFocus}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-muted hover:text-foreground px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            <Square className="w-5 h-5" />
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}
