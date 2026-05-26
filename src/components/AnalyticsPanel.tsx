import { CalendarDays, CircleCheck, Mail, Target, Timer } from "lucide-react";
import { getAnalytics } from "../lib/analytics";
import { getCountdownText } from "../lib/interviewUtils";
import type { Interview } from "../types/interview";

interface AnalyticsPanelProps {
  interviews: Interview[];
}

const formatDate = (value?: string) => {
  if (!value) return "Date not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
};

export function AnalyticsPanel({ interviews }: AnalyticsPanelProps) {
  const analytics = getAnalytics(interviews);
  const maxPipelineCount = Math.max(1, ...Object.values(analytics.byPipeline));

  return (
    <section className="analytics-grid" aria-label="Pipeline analytics">
      <article className="stat-card">
        <Target size={21} />
        <span>Total interviews</span>
        <strong>{analytics.total}</strong>
      </article>
      <article className="stat-card">
        <CalendarDays size={21} />
        <span>Upcoming scheduled</span>
        <strong>{analytics.upcoming}</strong>
      </article>
      <article className="stat-card">
        <Mail size={21} />
        <span>Communication needed</span>
        <strong>{analytics.communicationNeeded}</strong>
      </article>
      <article className="stat-card">
        <CircleCheck size={21} />
        <span>Interview completed</span>
        <strong>{analytics.completed}</strong>
      </article>
      <article className="stat-card">
        <Timer size={21} />
        <span>Done/withdrawn</span>
        <strong>{analytics.done}</strong>
      </article>

      <article className="pipeline-card">
        <div className="section-heading tight">
          <div>
            <h2>Interviews by pipeline</h2>
            <p>{analytics.active} active records</p>
          </div>
        </div>
        <div className="pipeline-bars">
          {Object.entries(analytics.byPipeline).length ? (
            Object.entries(analytics.byPipeline).map(([pipeline, count]) => (
              <div className="bar-row" key={pipeline}>
                <span>{pipeline}</span>
                <div className="bar-track">
                  <div style={{ width: `${(count / maxPipelineCount) * 100}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            ))
          ) : (
            <p className="empty-copy">Add or import interviews to see pipeline analytics.</p>
          )}
        </div>
      </article>

      <article className="pipeline-card">
        <div className="section-heading tight">
          <div>
            <h2>Scheduled interviews</h2>
            <p>Upcoming rounds and recently elapsed interview times</p>
          </div>
        </div>
        <div className="scheduled-list">
          {analytics.scheduled.length ? (
            analytics.scheduled.slice(0, 6).map((interview) => (
              <div className="scheduled-row" key={interview.id}>
                <span>
                  <strong>{interview.company}</strong>
                  {interview.roundLabel || interview.position}
                </span>
                <span>{formatDate(interview.interviewDateTime)}</span>
                <em>{getCountdownText(interview.interviewDateTime)}</em>
              </div>
            ))
          ) : (
            <p className="empty-copy">No scheduled interviews yet.</p>
          )}
        </div>
      </article>
    </section>
  );
}
