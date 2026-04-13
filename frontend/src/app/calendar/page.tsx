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

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Календарь</h1>
          <p className="text-muted mt-1">Расписание и события</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowIcalImport(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Импорт из вуза
          </button>
          <a
            href="/calendar/daily"
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Daily / Timeline
          </a>
          <button
            onClick={() => setShowWorkBlock(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Clock className="w-4 h-4" />
            Блок работы
          </button>
          <button
            onClick={() => setShowEventCreate(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
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
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
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
              {HOURS.map((hour) => (
                <tr key={hour}>
                  <td className="text-[10px] text-muted text-right pr-1 py-2 border-t border-border align-top">
                    {hour.toString().padStart(2, "0")}
                  </td>
                  {weekDays.map((day, di) => {
                    const dayEvents = getEventsForDay(day).filter((e) => {
                      const h = new Date(e.start_time).getHours();
                      return h === hour;
                    });
                    return (
                      <td
                        key={di}
                        className={`border-l border-t border-border p-px align-top ${
                          isSameDay(day, today) ? "bg-accent/5" : ""
                        }`}
                        style={{ height: 36 }}
                      >
                        {dayEvents.map((ev) => {
                          const start = new Date(ev.start_time);
                          const end = new Date(ev.end_time);
                          const durationMin = (end.getTime() - start.getTime()) / 60000;
                          const heightPx = Math.max(18, (durationMin / 60) * 36);
                          const colors = getEventColor(ev);
                          return (
                            <div
                              key={`${ev.id}-${start.toISOString()}`}
                              className={`${colors} ${ev.ical_uid ? "border-l-2 border-dashed" : "border-l-[1.5px]"} rounded-r px-1 py-px text-[10px] leading-tight cursor-default overflow-hidden`}
                              style={{ height: Math.max(22, heightPx) }}
                              title={[
                                ev.title,
                                ev.location ? `📍 ${ev.location}` : "",
                                `${start.toLocaleTimeString("ru-RU", {hour: "2-digit", minute: "2-digit"})} – ${end.toLocaleTimeString("ru-RU", {hour: "2-digit", minute: "2-digit"})}`,
                                ev.smart_tag === "@theory" ? "📖 Лекция" : ev.smart_tag === "@practice" ? "🔬 Практика" : "",
                              ].filter(Boolean).join("\n")}
                            >
                              <div className="flex items-center gap-0.5 truncate">
                                {ev.smart_tag === "@theory" && <BookOpen className="w-2.5 h-2.5 flex-shrink-0" />}
                                {ev.smart_tag === "@practice" && <FlaskConical className="w-2.5 h-2.5 flex-shrink-0" />}
                                <span className="truncate">{ev.title}</span>
                              </div>
                              {heightPx > 24 && ev.location && (
                                <div className="flex items-center gap-0.5 text-[9px] opacity-70 truncate">
                                  <MapPin className="w-2 h-2" />
                                  {ev.location}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))}
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
