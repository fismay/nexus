"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

interface Props {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function MiniCalendarPicker({
  value,
  onChange,
  label,
  required,
  placeholder = "Выберите дату",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedDate = value ? new Date(value + "T00:00:00") : null;
  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? today.getMonth());

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const selectDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(dateStr);
    setOpen(false);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-sm font-medium mb-1.5">
          {label} {required && "*"}
        </label>
      )}
      <button
        type="button"
        onClick={() => {
          if (!open && selectedDate) {
            setViewYear(selectedDate.getFullYear());
            setViewMonth(selectedDate.getMonth());
          }
          setOpen(!open);
        }}
        className="w-full flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:border-accent transition-colors hover:border-accent/50"
      >
        <Calendar className="w-4 h-4 text-muted flex-shrink-0" />
        {displayValue ? (
          <span>{displayValue}</span>
        ) : (
          <span className="text-muted">{placeholder}</span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-card border border-border rounded-xl shadow-xl p-3 w-[280px] animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded hover:bg-white/5 text-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded hover:bg-white/5 text-muted hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEK_DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] text-muted font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === value;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`
                    w-8 h-8 mx-auto rounded-lg text-xs font-medium transition-all
                    flex items-center justify-center
                    ${isSelected
                      ? "bg-accent text-white"
                      : isToday
                        ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                        : "text-foreground hover:bg-white/5"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick nav */}
          <div className="flex justify-center mt-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                setOpen(false);
              }}
              className="text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Сегодня
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
