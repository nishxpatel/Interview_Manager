import { CalendarClock, Edit3, ExternalLink, Trash2 } from "lucide-react";
import {
  INTERVIEW_STATUSES,
  type Interview,
  type InterviewStatus,
  type MissingFieldKey
} from "../types/interview";
import {
  getMissingFields,
  missingFieldLabels,
  normalizeContacts
} from "../lib/interviewUtils";

interface InterviewListProps {
  interviews: Interview[];
  onEdit: (interview: Interview, focusField?: MissingFieldKey) => void;
  onDelete: (interviewId: string) => Promise<void>;
  onStatusChange: (interview: Interview, status: InterviewStatus) => Promise<void>;
}

type InterviewCardProps = Omit<InterviewListProps, "interviews"> & {
  interview: Interview;
};

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
        <h3>No interviews match</h3>
        <p>Add an interview, import Drexel co-op requests, or clear filters to widen the list.</p>
      </div>
    );
  }

  return (
    <div className="interview-list">
      {interviews.map((interview) => (
        <InterviewCard
          key={interview.id}
          interview={interview}
          onDelete={onDelete}
          onEdit={onEdit}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}

function InterviewCard({
  interview,
  onEdit,
  onDelete,
  onStatusChange
}: InterviewCardProps) {
  const contacts = normalizeContacts(interview);
  const missingFields = getMissingFields(interview);

  return (
    <article className="interview-card">
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
            onChange={(event) => onStatusChange(interview, event.target.value as InterviewStatus)}
          >
            {INTERVIEW_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>

      {missingFields.length ? (
        <div className="missing-fields" aria-label="Missing fields">
          <strong>Missing:</strong>
          {missingFields.map((field) => (
            <button className="missing-field" key={field} onClick={() => onEdit(interview, field)}>
              {missingFieldLabels[field]}
            </button>
          ))}
        </div>
      ) : null}

      <div className="interview-details">
        <span>
          <strong>Contacts</strong>
          {contacts.length ? (
            <span className="contact-list">
              {contacts.map((contact) => (
                <span className="contact-pill" key={contact.id}>
                  <b>{contact.name || contact.email || "Unnamed contact"}</b>
                  {contact.title ? <small>{contact.title}</small> : null}
                  {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}
                  {contact.phone ? <small>{contact.phone}</small> : null}
                </span>
              ))}
            </span>
          ) : (
            <button className="missing-inline" onClick={() => onEdit(interview, "contacts")}>
              Add contact
            </button>
          )}
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
            <button className="missing-inline" onClick={() => onEdit(interview, "locationOrLink")}>
              Add location
            </button>
          )}
        </span>
        <span>
          <strong>Follow-up</strong>
          {interview.followUpReminder || (
            <button className="missing-inline" onClick={() => onEdit(interview, "followUpReminder")}>
              Add reminder
            </button>
          )}
        </span>
      </div>

      {(interview.questions || interview.notes || contacts.some((contact) => contact.notes)) && (
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
          {contacts
            .filter((contact) => contact.notes)
            .map((contact) => (
              <p key={`${contact.id}-notes`}>
                <strong>{contact.name || "Contact"}:</strong> {contact.notes}
              </p>
            ))}
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
  );
}
