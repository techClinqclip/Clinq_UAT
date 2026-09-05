import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

/*
  DatePicker — custom calendar dropdown, built to replace native
  <input type="date"> everywhere in this app. Native date inputs render
  inconsistently across browsers and their calendar icon is often
  invisible on dark backgrounds — this gives full control over both.

  value / onChange use plain ISO "yyyy-mm-dd" strings, same format the
  native input produced, so swapping it in doesn't change how the
  parent form's state is shaped.

  Props:
    value       — "yyyy-mm-dd" or ""
    onChange(v) — called with a new "yyyy-mm-dd" string, or "" on clear
    minDate     — optional "yyyy-mm-dd"; days before this are disabled
    clearable   — shows an "x" to reset to "" (for optional dates)
    placeholder — shown when value is empty
*/

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const toISO = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseISO = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const isSameDay = (a, b) => a && b && toISO(a) === toISO(b);

const buildMonthGrid = (viewDate) => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
};

export default function DatePicker({
  value,
  onChange,
  minDate,
  clearable = false,
  placeholder = "Select date",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = parseISO(value);
  const [viewDate, setViewDate] = useState(selected || new Date());
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const today = new Date();
  const min = parseISO(minDate);
  const cells = buildMonthGrid(viewDate);

  const isDisabled = (day) => min && day < new Date(min.getFullYear(), min.getMonth(), min.getDate());

  const selectDay = (day) => {
    if (isDisabled(day)) return;
    onChange(toISO(day));
    setIsOpen(false);
  };

  const changeMonth = (delta) => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  };

  const displayValue = selected
    ? selected.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#0B0B12] px-4 py-3 text-left text-white outline-none transition focus:border-violet-500"
      >
        <span className={`flex items-center gap-2 ${displayValue ? "text-white" : "text-zinc-500"}`}>
          <Calendar size={16} className="text-zinc-500" />
          {displayValue || placeholder}
        </span>
        {clearable && value && (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="text-zinc-500 hover:text-white"
          >
            <X size={14} />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 rounded-2xl border border-white/10 bg-[#11111A] p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold text-white">
              {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-zinc-500">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const disabled = isDisabled(day);
              const isSelected = isSameDay(day, selected);
              const isToday = isSameDay(day, today);

              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition ${
                    isSelected
                      ? "bg-violet-600 text-white"
                      : disabled
                      ? "cursor-not-allowed text-zinc-700"
                      : isToday
                      ? "border border-violet-500/40 text-violet-300 hover:bg-white/5"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              onChange(toISO(today));
              setIsOpen(false);
            }}
            className="mt-3 w-full rounded-lg border border-white/10 py-1.5 text-xs text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
}