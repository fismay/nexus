"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CalendarDays,
  Upload,
  BookOpen,
  FlaskConical,
  MapPin,
} from "lucide-react";
import { api } from "@/lib/api";
import type { CalendarEvent, ProjectCard } from "@/lib/types";
import { SMART_TAG_COLORS } from "@/lib/types";
import { WorkBlockModal } from "@/components/work-block-modal";
import { EventCreateModal } from "@/components/event-create-modal";
import { ICalImportModal } from "@/components/ical-import-modal";

const FIRST_HOUR = 7;
const HOURS = Array.from({ length: 16 }, (_, i) => i + FIRST_HOUR);
const PX_PER_HOUR = 36;
const GRID_HEIGHT_PX = HOURS.length * PX_PER_HOUR;

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Минуты от начала сетки (FIRST_HOUR:00) для локального времени браузера */
function minutesFromGridStart(d: Date, firstHour: number) {
  return (d.getHours() - firstHour) * 60 + d.getMinutes();
}

function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  class: "bg-blue-500/30 border-blue-500",
  meeting: "bg-purple-500/30 border-purple-500",
  work_block: "bg-indigo-500/30 border-indigo-500",
  deadline: "bg-red-500/30 border-red-500",
  other: "bg-gray-500/30 border-gray-500",
};

function getEventColor(ev: CalendarEvent): string {
  if (ev.smart_tag && SMART_TAG_COLORS[ev.smart_tag]) {
    return SMART_TAG_COLORS[ev.smart_tag];
  }
  return EVENT_TYPE_COLORS[ev.event_type] || EVENT_TYPE_COLORS.other;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [loading, setLoading] = useState(true);
  const [showWorkBlock, setShowWorkBlock] = useState(false);
  const [showEventCreate, setShowEventCreate] = useState(false);
  const [showIcalImport, setShowIcalImport] = useState(false);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const load = () => {
    const start = weekDays[0].toISOString();
    const end = new Date(
      weekDays[6].getTime() + 24 * 60 * 60 * 1000
    ).toISOString();
    Promise.all([api.listEvents(start, end), api.listProjects()])
      .then(([e, p]) => {
        setEvents(e);
        setProjects(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const toToday = () => setWeekStart(getWeekStart(new Date()));

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.start_time), day));

  const today = new Date();

  const weekLabel = `${weekDays[0].toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  })} — ${weekDays[6].toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="nexus-page-title-bar text-2xl sm:text-3xl font-bold tracking-tight">
            Календарь
          </h1>
          <p className="text-muted mt-2 text-sm sm:text-base">Расписание и события</p>
        </div>
        <div className="flex flex-wrap items-stretch gap-2 sm:justify-end sm:max-w-[min(100%,42rem)]">
          <button
            type="button"
            onClick={() => setShowIcalImport(true)}
            className="flex items-center justify-center gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 sm:px-4 py-2.5 min-h-11 rounded-xl text-xs sm:text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span className="hidden min-[400px]:inline">Импорт</span>
            <span className="min-[400px]:hidden">Вуз</span>
          </button>
          <a
            href="/calendar/daily"
            className="flex items-center justify-center gap-1.5 sm:gap-2 bg-white/5 hover:bg-white/10 text-foreground px-3 sm:px-4 py-2.5 min-h-11 rounded-xl text-xs sm:text-sm font-medium transition-colors"
          >
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Daily / Timeline</span>
            <span className="sm:hidden">День</span>
          </a>
          <button
            type="button"
            onClick={() => setShowWorkBlock(true)}
            className="flex items-center justify-center gap-1.5 sm:gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 sm:px-4 py-2.5 min-h-11 rounded-xl text-xs sm:text-sm font-medium transition-colors"
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Блок работы</span>
            <span className="sm:hidden">Блок</span>
          </button>
          <button
            type="button"
            onClick={() => setShowEventCreate(true)}
            className="flex items-center justify-center gap-1.5 sm:gap-2 bg-accent hover:bg-accent-hover text-white px-3 sm:px-4 py-2.5 min-h-11 rounded-xl text-xs sm:text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Событие
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={toToday}
            className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Сегодня
          </button>
          <button
            onClick={nextWeek}
            className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <span className="text-sm font-medium text-muted">{weekLabel}</span>
      </div>

      {loading ? (
        <div className="nexus-surface nexus-surface--static rounded-xl overflow-hidden min-h-[24rem] p-4">
          <div className="nexus-skeleton h-6 w-40 mb-4" />
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="nexus-skeleton h-8 rounded-md" />
            ))}
          </div>
        </div>
      ) : (
        <div className="nexus-surface nexus-surface--static rounded-xl overflow-x-auto touch-pan-x">
          <table className="w-full border-collapse" style={{ minWidth: 700, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 44 }} />
              {weekDays.map((_, i) => <col key={i} />)}
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                <th />
                {weekDays.map((d, i) => {
                  const isToday = isSameDay(d, today);
                  return (
                    <th
                      key={i}
                      className={`text-center py-2 border-l border-border font-normal ${
                        isToday ? "bg-accent/10" : ""
                      }`}
                    >
                      <div className="text-muted text-[10px]">{DAY_NAMES[i]}</div>
                      <div className={`text-sm font-semibold ${isToday ? "text-accent" : ""}`}>
                        {d.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="w-[44px] align-top p-0">
                  <div
                    className="flex flex-col border-r border-border/80"
                    style={{ height: GRID_HEIGHT_PX }}
                  >
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="box-border flex flex-shrink-0 items-start justify-end border-t border-border/70 pr-1 pt-0.5 text-[10px] text-muted first:border-t-0"
                        style={{ height: PX_PER_HOUR, minHeight: PX_PER_HOUR }}
                      >
                        {hour.toString().padStart(2, "0")}
                      </div>
                    ))}
                  </div>
                </td>
                {weekDays.map((day, di) => {
                  const isTodayCol = isSameDay(day, today);
                  const dayEvents = getEventsForDay(day);
                  return (
                    <td
                      key={di}
                      className={`relative border-l border-border p-0 align-top ${
                        isTodayCol ? "bg-accent/5" : ""
                      }`}
                    >
                      <div
                        className="relative"
                        style={{ height: GRID_HEIGHT_PX }}
                      >
                        <div className="pointer-events-none absolute inset-0 flex flex-col">
                          {HOURS.map((hour) => (
                            <div
                              key={hour}
                              className="box-border flex-shrink-0 border-t border-border/70 first:border-t-0"
                              style={{ height: PX_PER_HOUR, minHeight: PX_PER_HOUR }}
                            />
                          ))}
                        </div>
                        <div className="absolute inset-0 z-[1] px-0.5">
                          {dayEvents.map((ev) => {
                            const start = new Date(ev.start_time);
                            const end = new Date(ev.end_time);
                            let topMin = minutesFromGridStart(start, FIRST_HOUR);
                            let endMin = minutesFromGridStart(end, FIRST_HOUR);
                            if (endMin <= topMin) {
                              endMin = topMin + 15;
                            }
                            topMin = Math.max(0, topMin);
                            endMin = Math.min(
                              HOURS.length * 60,
                              Math.max(endMin, topMin + 5)
                            );
                            const spanMin = endMin - topMin;
                            let topPx = (topMin / 60) * PX_PER_HOUR;
                            let heightPx = Math.max(
                              (spanMin / 60) * PX_PER_HOUR,
                              18
                            );
                            if (topPx >= GRID_HEIGHT_PX) return null;
                            if (topPx + heightPx > GRID_HEIGHT_PX) {
                              heightPx = Math.max(GRID_HEIGHT_PX - topPx, 18);
                            }
                            const colors = getEventColor(ev);
                            return (
                              <div
                                key={`${ev.id}-${start.toISOString()}`}
                                className={`absolute left-0.5 right-0.5 ${colors} ${
                                  ev.ical_uid
                                    ? "border-l-2 border-dashed"
                                    : "border-l-[1.5px]"
                                } rounded-r px-1 py-px text-[10px] leading-tight overflow-hidden`}
                                style={{ top: topPx, height: heightPx }}
                                title={[
                                  ev.title,
                                  ev.location ? `📍 ${ev.location}` : "",
                                  `${start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`,
                                  ev.smart_tag === "@theory"
                                    ? "📖 Лекция"
                                    : ev.smart_tag === "@practice"
                                      ? "🔬 Практика"
                                      : "",
                                ]
                                  .filter(Boolean)
                                  .join("\n")}
                              >
                                <div className="flex min-h-0 items-start gap-0.5">
                                  {ev.smart_tag === "@theory" && (
                                    <BookOpen className="w-2.5 h-2.5 flex-shrink-0" />
                                  )}
                                  {ev.smart_tag === "@practice" && (
                                    <FlaskConical className="w-2.5 h-2.5 flex-shrink-0" />
                                  )}
                                  <span className="line-clamp-3 break-words">
                                    {ev.title}
                                  </span>
                                </div>
                                {heightPx > 28 && ev.location && (
                                  <div className="mt-0.5 flex items-center gap-0.5 truncate text-[9px] opacity-70">
                                    <MapPin className="w-2 h-2 flex-shrink-0" />
                                    <span className="truncate">{ev.location}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-blue-400" />
          Лекции
        </span>
        <span className="flex items-center gap-1.5">
          <FlaskConical className="w-3 h-3 text-amber-400" />
          Практика / Лабы
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-purple-500/30 border border-purple-500 rounded" />
          Встречи
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-indigo-500/30 border border-indigo-500 rounded" />
          Работа над проектом
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-red-500/30 border border-red-500 rounded" />
          Дедлайны
        </span>
      </div>

      {showWorkBlock && (
        <WorkBlockModal
          projects={projects}
          onClose={() => setShowWorkBlock(false)}
          onCreated={() => { setShowWorkBlock(false); load(); }}
        />
      )}
      {showEventCreate && (
        <EventCreateModal
          onClose={() => setShowEventCreate(false)}
          onCreated={() => { setShowEventCreate(false); load(); }}
        />
      )}
      {showIcalImport && (
        <ICalImportModal
          onClose={() => setShowIcalImport(false)}
          onImported={() => { setShowIcalImport(false); load(); }}
        />
      )}
    </div>
  );
}
