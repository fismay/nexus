"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Task } from "./types";

type TimerMode = "stopwatch" | "pomodoro";

interface FocusState {
  isActive: boolean;
  task: Task | null;
  timerMode: TimerMode;
  elapsedSeconds: number;
  pomodoroTotal: number;
  isPaused: boolean;

  startFocus: (task: Task, mode?: TimerMode) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  stopFocus: () => void;
  completeTask: () => void;
}

const FocusContext = createContext<FocusState>({
  isActive: false,
  task: null,
  timerMode: "pomodoro",
  elapsedSeconds: 0,
  pomodoroTotal: 25 * 60,
  isPaused: false,
  startFocus: () => {},
  pauseFocus: () => {},
  resumeFocus: () => {},
  stopFocus: () => {},
  completeTask: () => {},
});

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [timerMode, setTimerMode] = useState<TimerMode>("pomodoro");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pomodoroTotal = 25 * 60;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    setElapsedSeconds((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isPaused, tick]);

  // Pomodoro auto-stop
  useEffect(() => {
    if (timerMode === "pomodoro" && elapsedSeconds >= pomodoroTotal && isActive) {
      setIsPaused(true);
    }
  }, [elapsedSeconds, timerMode, pomodoroTotal, isActive]);

  const startFocus = useCallback((t: Task, mode: TimerMode = "pomodoro") => {
    setTask(t);
    setTimerMode(mode);
    setElapsedSeconds(0);
    setIsPaused(false);
    setIsActive(true);
  }, []);

  const pauseFocus = useCallback(() => setIsPaused(true), []);
  const resumeFocus = useCallback(() => setIsPaused(false), []);

  const stopFocus = useCallback(() => {
    setIsActive(false);
    setTask(null);
    setElapsedSeconds(0);
    setIsPaused(false);
  }, []);

  const completeTask = useCallback(() => {
    setIsActive(false);
    setTask(null);
    setElapsedSeconds(0);
    setIsPaused(false);
  }, []);

  return (
    <FocusContext.Provider
      value={{
        isActive,
        task,
        timerMode,
        elapsedSeconds,
        pomodoroTotal,
        isPaused,
        startFocus,
        pauseFocus,
        resumeFocus,
        stopFocus,
        completeTask,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  return useContext(FocusContext);
}
