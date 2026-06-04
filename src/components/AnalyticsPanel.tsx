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

  return (
    <section className="analytics-grid" aria-label="Scheduled interview analytics">
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
