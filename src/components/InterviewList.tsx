import { CalendarClock, Edit3, ExternalLink, Trash2 } from "lucide-react";
import { INTERVIEW_STATUSES, type Interview, type InterviewStatus } from "../types/interview";

interface InterviewListProps {
  interviews: Interview[];
  onEdit: (interview: Interview) => void;
  onDelete: (interviewId: string) => Promise<void>;
  onStatusChange: (interview: Interview, status: InterviewStatus) => Promise<void>;
}

const formatDate = (value?: string) => {
  if (!value) return "No date set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
};

export function InterviewList({
  interviews,
  onEdit,
  onDelete,
  onStatusChange
}: InterviewListProps) {
  if (!interviews.length) {
    return (
      <div className="empty-state">
        <CalendarClock size={32} />
        <h3>No interviews yet</h3>
        <p>Add an interview manually or paste Drexel co-op requests to build your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="interview-list">
      {interviews.map((interview) => (
        <article className="interview-card" key={interview.id}>
          <div className="interview-main">
            <div>
              <h3>{interview.company}</h3>
              <p>{interview.position}</p>
              <div className="meta-row">
                <span>{interview.stage}</span>
                <span>{formatDate(interview.interviewDateTime)}</span>
                {interview.source === "drexel-import" ? <span>Drexel import</span> : null}
              </div>
            </div>
            <label className="status-select">
              <span>Status</span>
              <select
                value={interview.status}
                onChange={(event) =>
                  onStatusChange(interview, event.target.value as InterviewStatus)
                }
              >
                {INTERVIEW_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="interview-details">
            <span>
              <strong>Contact</strong>
              {interview.contactPerson || "Add contact"}
            </span>
            <span>
              <strong>Location/link</strong>
              {interview.locationOrLink ? (
                interview.locationOrLink.startsWith("http") ? (
                  <a href={interview.locationOrLink} target="_blank" rel="noreferrer">
                    Open link <ExternalLink size={13} />
                  </a>
                ) : (
                  interview.locationOrLink
                )
              ) : (
                "Add location"
              )}
            </span>
            <span>
              <strong>Follow-up</strong>
              {interview.followUpReminder || "No reminder"}
            </span>
          </div>

          {(interview.questions || interview.notes) && (
            <div className="notes-preview">
              {interview.questions ? (
                <p>
                  <strong>Questions:</strong> {interview.questions}
                </p>
              ) : null}
              {interview.notes ? (
                <p>
                  <strong>Notes:</strong> {interview.notes}
                </p>
              ) : null}
            </div>
          )}

          <div className="card-actions">
            <button className="ghost-button" onClick={() => onEdit(interview)}>
              <Edit3 size={16} />
              Edit
            </button>
            <button
              className="danger-button"
              onClick={() => {
                if (window.confirm("Delete this interview?")) void onDelete(interview.id);
              }}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
