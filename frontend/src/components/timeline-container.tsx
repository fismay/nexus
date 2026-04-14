"use client";

import { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { BookOpen, FlaskConical, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarEvent, Task } from "@/lib/types";
import { PRIORITY_COLORS, SMART_TAG_LABELS } from "@/lib/types";

const LANE_HEIGHT = 52;
const LANE_GAP = 4;
const START_HOUR = 7;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function useResponsiveHourWidth(): number {
  const [hourWidth, setHourWidth] = useState(120);

  useEffect(() => {
    const update = () => {
      const w = typeof window !== "undefined" ? window.innerWidth : 1024;
      if (w >= 1280) setHourWidth(200);
      else if (w >= 1024) setHourWidth(160);
      else if (w >= 640) setHourWidth(130);
      else setHourWidth(100);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return hourWidth;
}

interface TimelineBlock {
  id: string;
  title: string;
  subtitle: string | null;
  startMin: number;
  endMin: number;
  lane: number;
  kind: "event" | "task";
  isIcal: boolean;
  smartTag: string | null;
  eventType: string | null;
  priority: string | null;
  location: string | null;
}

function calculateLanes(blocks: Omit<TimelineBlock, "lane">[]): TimelineBlock[] {
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin);
  const laneEnds: number[] = [];
  return sorted.map((block) => {
    let lane = laneEnds.findIndex((end) => end <= block.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = block.endMin;
    return { ...block, lane };
  });
}

function minutesSinceMidnight(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function getBlockColor(b: TimelineBlock): string {
  if (b.kind === "task") return "bg-accent/25 border-accent";
  if (b.smartTag === "@theory") return "bg-blue-500/25 border-blue-400";
  if (b.smartTag === "@practice") return "bg-amber-500/25 border-amber-400";
  const map: Record<string, string> = {
    class: "bg-blue-500/20 border-blue-500",
    meeting: "bg-purple-500/20 border-purple-500",
    work_block: "bg-indigo-500/20 border-indigo-500",
    deadline: "bg-red-500/20 border-red-500",
  };
  return map[b.eventType || ""] || "bg-gray-500/20 border-gray-500";
}

function fmtTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

interface Props {
  events: CalendarEvent[];
  tasks: Task[];
  date: Date;
}

export function TimelineContainer({ events, tasks, date }: Props) {
  const HOUR_WIDTH = useResponsiveHourWidth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const blocks = useMemo(() => {
    const raw: Omit<TimelineBlock, "lane">[] = [];
    for (const ev of events) {
      const startMin = minutesSinceMidnight(ev.start_time);
      const endMin = minutesSinceMidnight(ev.end_time);
      if (endMin <= startMin) continue;
      raw.push({
        id: `ev-${ev.id}-${ev.start_time}`, title: ev.title, subtitle: ev.location,
        startMin, endMin, kind: "event", isIcal: !!ev.ical_uid,
        smartTag: ev.smart_tag, eventType: ev.event_type, priority: null, location: ev.location,
      });
    }
    for (const t of tasks) {
      if (!t.start_time || !t.end_time) continue;
      const startMin = minutesSinceMidnight(t.start_time);
      const endMin = minutesSinceMidnight(t.end_time);
      if (endMin <= startMin) continue;
      raw.push({
        id: `task-${t.id}`, title: t.title, subtitle: null,
        startMin, endMin, kind: "task", isIcal: false,
        smartTag: null, eventType: null, priority: t.priority, location: null,
      });
    }
    return calculateLanes(raw);
  }, [events, tasks]);

  const totalLanes = blocks.length > 0 ? Math.max(...blocks.map((b) => b.lane)) + 1 : 1;
  const bodyHeight = totalLanes * (LANE_HEIGHT + LANE_GAP) + LANE_GAP;
  const totalWidth = TOTAL_HOURS * HOUR_WIDTH;

  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const isSameDay = now.toDateString() === date.toDateString();
    const targetHour = isSameDay ? Math.max(now.getHours() - 1, START_HOUR) : 8;
    scrollRef.current.scrollLeft = (targetHour - START_HOUR) * HOUR_WIDTH;
  }, [date, HOUR_WIDTH]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, scrollLeft: scrollRef.current.scrollLeft };
    scrollRef.current.style.cursor = "grabbing";
    scrollRef.current.setPointerCapture(e.pointerId);
  }, []);
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - (e.clientX - dragStart.current.x);
  }, []);
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = "grab";
      scrollRef.current.releasePointerCapture(e.pointerId);
    }
  }, []);

  const scrollBy = (dir: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * HOUR_WIDTH * 2, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden touch-pan-x">
      <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 border-b border-border bg-card gap-2">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="p-2 min-h-10 min-w-10 rounded-lg hover:bg-white/10 text-muted hover:text-foreground transition-colors shrink-0"
          title="Скролл влево"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[9px] sm:text-[10px] text-muted text-center leading-tight flex-1 min-w-0">
          <span className="hidden sm:inline">{START_HOUR}:00 — {END_HOUR}:00 · Свайп или колёсико</span>
          <span className="sm:hidden">Свайп влево/вправо</span>
        </span>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="p-2 min-h-10 min-w-10 rounded-lg hover:bg-white/10 text-muted hover:text-foreground transition-colors shrink-0"
          title="Скролл вправо"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden select-none overscroll-x-contain"
        style={{ cursor: "grab", WebkitOverflowScrolling: "touch" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div style={{ width: `${totalWidth}px` }}>
          <div className="flex border-b border-border/50" style={{ height: 28 }}>
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={i}
                className="flex-shrink-0 border-r border-border/30 text-[10px] sm:text-[11px] text-muted flex items-center pl-1.5 sm:pl-2 font-mono"
                style={{ width: HOUR_WIDTH }}
              >
                {(START_HOUR + i).toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          <div className="relative" style={{ height: Math.max(80, bodyHeight) }}>
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <div key={`g${i}`} className="absolute top-0 bottom-0 border-l border-border/30" style={{ left: i * HOUR_WIDTH }} />
            ))}
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div key={`h${i}`} className="absolute top-0 bottom-0 border-l border-dashed border-border/15" style={{ left: i * HOUR_WIDTH + HOUR_WIDTH / 2 }} />
            ))}

            {(() => {
              const now = new Date();
              if (now.toDateString() !== date.toDateString()) return null;
              const px = ((now.getHours() * 60 + now.getMinutes()) - START_HOUR * 60) / 60 * HOUR_WIDTH;
              if (px < 0 || px > totalWidth) return null;
              return (
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20" style={{ left: px }}>
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full -translate-x-1" />
                </div>
              );
            })()}

            {blocks.map((b) => {
              const leftPx = ((b.startMin - START_HOUR * 60) / 60) * HOUR_WIDTH;
              const widthPx = Math.max(40, ((b.endMin - b.startMin) / 60) * HOUR_WIDTH);
              const topPx = LANE_GAP + b.lane * (LANE_HEIGHT + LANE_GAP);
              const colors = getBlockColor(b);
              return (
                <div
                  key={b.id}
                  className={`absolute rounded-lg overflow-hidden hover:brightness-110 transition-all ${
                    b.isIcal ? "border-l-[3px] border-dashed" : "border-l-[3px] border-solid"
                  } ${colors}`}
                  style={{ left: leftPx, top: topPx, width: widthPx, height: LANE_HEIGHT }}
                  title={[b.title, b.location ? `📍 ${b.location}` : "", `${fmtTime(b.startMin)} – ${fmtTime(b.endMin)}`, b.smartTag ? SMART_TAG_LABELS[b.smartTag] : ""].filter(Boolean).join("\n")}
                >
                  <div className="px-1.5 sm:px-2 py-1 sm:py-1.5 h-full flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      {b.smartTag === "@theory" && <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 text-blue-300" />}
                      {b.smartTag === "@practice" && <FlaskConical className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 text-amber-300" />}
                      {b.kind === "task" && b.priority && <span className={`text-[9px] sm:text-[10px] ${PRIORITY_COLORS[b.priority]}`}>●</span>}
                      <span className="text-[10px] sm:text-xs font-semibold truncate">{b.title}</span>
                    </div>
                    {b.location && (
                      <div className="flex items-center gap-0.5 mt-0.5 min-w-0">
                        <MapPin className="w-2 h-2 text-muted flex-shrink-0" />
                        <span className="text-[9px] text-muted truncate">{b.location}</span>
                      </div>
                    )}
                    <div className="text-[9px] sm:text-[10px] text-muted/60 mt-auto hidden sm:block">
                      {fmtTime(b.startMin)} – {fmtTime(b.endMin)}
                    </div>
                  </div>
                </div>
              );
            })}

            {blocks.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs sm:text-sm text-muted px-4 text-center">
                Нет событий на этот день
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2 border-t border-border text-[9px] sm:text-[10px] text-muted flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 border-l-[3px] border-dashed border-blue-400 bg-blue-500/20 rounded-r" />
          iCal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 border-l-[3px] border-solid border-accent bg-accent/25 rounded-r" />
          Задачи
        </span>
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-blue-400" />
          Лекция
        </span>
        <span className="flex items-center gap-1.5">
          <FlaskConical className="w-3 h-3 text-amber-400" />
          Практика
        </span>
      </div>
    </div>
  );
}
