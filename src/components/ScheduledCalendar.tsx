import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  MapPin,
  RotateCcw,
  Video
} from "lucide-react";
import { getCountdownText, isScheduledPipeline, normalizeInterview } from "../lib/interviewUtils";
import type { Interview } from "../types/interview";

interface ScheduledCalendarProps {
  interviews: Interview[];
  onEdit: (interview: Interview) => void;
}

interface CalendarDay {
  date: Date;
  key: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const agendaDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric"
});
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit"
});

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseInterviewDate = (interview?: Interview | null) => {
  if (!interview) return null;
  if (!interview.interviewDateTime) return null;
  const date = new Date(interview.interviewDateTime);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildCalendarDays = (monthDate: Date) => {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index): CalendarDay => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const today = new Date();

    return {
      date,
      key: toDateKey(date),
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
      isToday: toDateKey(date) === toDateKey(today)
    };
  });
};

const formatTime = (value?: string) => {
  if (!value) return "Time not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return timeFormatter.format(date);
};

export function ScheduledCalendar({ interviews, onEdit }: ScheduledCalendarProps) {
  const scheduledInterviews = useMemo(
    () =>
      interviews
        .map(normalizeInterview)
        .filter((interview) => isScheduledPipeline(interview.pipeline) && parseInterviewDate(interview))
        .sort((left, right) => {
          const leftDate = parseInterviewDate(left)?.getTime() ?? 0;
          const rightDate = parseInterviewDate(right)?.getTime() ?? 0;
          return leftDate - rightDate;
        }),
    [interviews]
  );

  const initialDate = useMemo(() => {
    const now = new Date();
    const upcoming = scheduledInterviews.find((interview) => {
      const date = parseInterviewDate(interview);
      return date ? date >= now : false;
    });
    return parseInterviewDate(upcoming ?? scheduledInterviews[0]) ?? now;
  }, [scheduledInterviews]);

  const [userVisibleMonth, setUserVisibleMonth] = useState<Date | null>(null);
  const [userSelectedDateKey, setUserSelectedDateKey] = useState<string | null>(null);
  const visibleMonth = useMemo(
    () => userVisibleMonth ?? new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
    [initialDate, userVisibleMonth]
  );
  const selectedDateKey = userSelectedDateKey ?? toDateKey(initialDate);

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  const interviewsByDay = useMemo(() => {
    const grouped = new Map<string, Interview[]>();
    scheduledInterviews.forEach((interview) => {
      const date = parseInterviewDate(interview);
      if (!date) return;
      const key = toDateKey(date);
      grouped.set(key, [...(grouped.get(key) ?? []), interview]);
    });
    return grouped;
  }, [scheduledInterviews]);

  const selectedDate = useMemo(() => {
    const [year, month, day] = selectedDateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDateKey]);
  const selectedInterviews = interviewsByDay.get(selectedDateKey) ?? [];
  const weekDays = calendarDays.slice(0, 7).map((day) => dayFormatter.format(day.date));

  const moveMonth = (offset: number) => {
    setUserVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1));
  };

  const jumpToToday = () => {
    const today = new Date();
    setUserVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setUserSelectedDateKey(toDateKey(today));
  };

  return (
    <section className="calendar-section" aria-label="Scheduled interviews calendar">
      <div className="section-heading">
        <div>
          <h2>Calendar</h2>
        </div>
        <div className="calendar-controls">
          <button
            className="icon-button"
            type="button"
            onClick={() => moveMonth(-1)}
            aria-label="Previous month"
            title="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <strong>{monthFormatter.format(visibleMonth)}</strong>
          <button
            className="icon-button"
            type="button"
            onClick={() => moveMonth(1)}
            aria-label="Next month"
            title="Next month"
          >
            <ChevronRight size={18} />
          </button>
          <button className="ghost-button" type="button" onClick={jumpToToday}>
            <RotateCcw size={16} />
            Today
          </button>
        </div>
      </div>

      <div className="calendar-layout">
        <div className="calendar-month" role="grid" aria-label={monthFormatter.format(visibleMonth)}>
          {weekDays.map((day) => (
            <span className="calendar-weekday" key={day}>
              {day}
            </span>
          ))}
          {calendarDays.map((day) => {
            const dayInterviews = interviewsByDay.get(day.key) ?? [];
            const isSelected = day.key === selectedDateKey;
            return (
              <button
                className={[
                  "calendar-day",
                  day.isCurrentMonth ? "" : "is-outside-month",
                  day.isToday ? "is-today" : "",
                  isSelected ? "is-selected" : "",
                  dayInterviews.length ? "has-interviews" : ""
                ]
                  .filter(Boolean)
                .join(" ")}
                type="button"
                key={day.key}
                onClick={() => setUserSelectedDateKey(day.key)}
                aria-label={`${agendaDateFormatter.format(day.date)}, ${dayInterviews.length} interviews`}
                aria-pressed={isSelected}
              >
                <span className="calendar-day-number">{day.date.getDate()}</span>
                <span className="calendar-day-count">
                  {dayInterviews.length ? `${dayInterviews.length}` : ""}
                </span>
                <span className="calendar-day-events">
                  {dayInterviews.slice(0, 2).map((interview) => (
                    <span className="calendar-event-chip" key={interview.id}>
                      {formatTime(interview.interviewDateTime)} {interview.company || "Interview"}
                    </span>
                  ))}
                  {dayInterviews.length > 2 ? (
                    <span className="calendar-more">+{dayInterviews.length - 2} more</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <aside className="calendar-agenda" aria-label="Selected day interviews">
          <div className="calendar-agenda-heading">
            <CalendarDays size={20} />
            <div>
              <h3>{agendaDateFormatter.format(selectedDate)}</h3>
              <p>{selectedInterviews.length ? `${selectedInterviews.length} scheduled` : "No interviews"}</p>
            </div>
          </div>

          <div className="agenda-list">
            {selectedInterviews.length ? (
              selectedInterviews.map((interview) => (
                <article className="agenda-item" key={interview.id}>
                  <div>
                    <strong>{interview.company || "Unnamed company"}</strong>
                    <span>{interview.roundLabel || interview.position || "Interview round"}</span>
                  </div>
                  <p>
                    <Clock size={14} />
                    {formatTime(interview.interviewDateTime)}
                  </p>
                  {interview.interviewFormat && interview.interviewFormat !== "Not set" ? (
                    <p>
                      <Video size={14} />
                      {interview.interviewFormat}
                    </p>
                  ) : null}
                  {interview.locationOrLink ? (
                    <p>
                      <MapPin size={14} />
                      {interview.locationOrLink}
                    </p>
                  ) : null}
                  <em>{getCountdownText(interview.interviewDateTime)}</em>
                  <button className="ghost-button compact-button" type="button" onClick={() => onEdit(interview)}>
                    <Edit3 size={15} />
                    Edit
                  </button>
                </article>
              ))
            ) : (
              <div className="calendar-empty">
                <CalendarDays size={28} />
                <p>Select a day with a count badge to review scheduled interviews.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
