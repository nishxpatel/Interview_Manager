import { Award, CalendarDays, CircleCheck, Target, XCircle } from "lucide-react";
import { getAnalytics } from "../lib/analytics";
import type { Interview } from "../types/interview";

interface AnalyticsPanelProps {
  interviews: Interview[];
}

export function AnalyticsPanel({ interviews }: AnalyticsPanelProps) {
  const analytics = getAnalytics(interviews);
  const maxStatusCount = Math.max(1, ...Object.values(analytics.byStatus));

  return (
    <section className="analytics-grid" aria-label="Pipeline analytics">
      <article className="stat-card">
        <Target size={21} />
        <span>Total interviews</span>
        <strong>{analytics.total}</strong>
      </article>
      <article className="stat-card">
        <CalendarDays size={21} />
        <span>Upcoming</span>
        <strong>{analytics.upcoming}</strong>
      </article>
      <article className="stat-card">
        <CircleCheck size={21} />
        <span>Completed</span>
        <strong>{analytics.completed}</strong>
      </article>
      <article className="stat-card">
        <Award size={21} />
        <span>Offers</span>
        <strong>{analytics.offers}</strong>
      </article>
      <article className="stat-card">
        <XCircle size={21} />
        <span>Closed</span>
        <strong>{analytics.rejected}</strong>
      </article>

      <article className="stage-card">
        <div className="section-heading tight">
          <div>
            <h2>Interviews by status</h2>
            <p>{analytics.active} active opportunities</p>
          </div>
        </div>
        <div className="status-bars">
          {Object.entries(analytics.byStatus).length ? (
            Object.entries(analytics.byStatus).map(([status, count]) => (
              <div className="bar-row" key={status}>
                <span>{status}</span>
                <div className="bar-track">
                  <div style={{ width: `${(count / maxStatusCount) * 100}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            ))
          ) : (
            <p className="empty-copy">Add or import interviews to see status analytics.</p>
          )}
        </div>
      </article>
    </section>
  );
}
