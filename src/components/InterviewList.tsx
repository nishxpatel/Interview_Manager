import { CalendarClock, Edit3, ExternalLink, Trash2 } from "lucide-react";
import {
  PIPELINE_STEPS,
  type Interview,
  type MissingFieldKey,
  type PipelineStep
} from "../types/interview";
import {
  getCountdownText,
  getMissingFields,
  isScheduledPipeline,
  missingFieldLabels,
  normalizeInterview,
  normalizeContacts
} from "../lib/interviewUtils";

interface InterviewListProps {
  interviews: Interview[];
  onEdit: (interview: Interview, focusField?: MissingFieldKey) => void;
  onDelete: (interviewId: string) => Promise<void>;
  onPipelineChange: (interview: Interview, pipeline: PipelineStep) => Promise<void>;
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
  onPipelineChange
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
          onPipelineChange={onPipelineChange}
        />
      ))}
    </div>
  );
}

function InterviewCard({
  interview,
  onEdit,
  onDelete,
  onPipelineChange
}: InterviewCardProps) {
  const normalized = normalizeInterview(interview);
  const contacts = normalizeContacts(normalized);
  const missingFields = getMissingFields(normalized);
  const countdown = isScheduledPipeline(normalized.pipeline)
    ? getCountdownText(normalized.interviewDateTime)
    : "";

  return (
    <article className="interview-card">
      <div className="interview-main">
        <div>
          <h3>{normalized.company}</h3>
          <p>{normalized.position}</p>
          <div className="meta-row">
            <span>{normalized.pipeline}</span>
            {normalized.roundLabel ? <span>{normalized.roundLabel}</span> : null}
            <span>{formatDate(normalized.interviewDateTime)}</span>
            <span>{normalized.interviewFormat ?? "Unknown"}</span>
            {normalized.source === "drexel-import" ? <span>Drexel import</span> : null}
          </div>
          {countdown ? <p className="countdown-pill">{countdown}</p> : null}
        </div>
        <label className="pipeline-select">
          <span>Pipeline</span>
          <select
            value={normalized.pipeline}
            onChange={(event) =>
              onPipelineChange(normalized, event.target.value as PipelineStep)
            }
          >
            {PIPELINE_STEPS.map((pipeline) => (
              <option key={pipeline}>{pipeline}</option>
            ))}
          </select>
        </label>
      </div>

      {missingFields.length ? (
        <div className="missing-fields" aria-label="Missing fields">
          <strong>Missing:</strong>
          {missingFields.map((field) => (
            <button className="missing-field" key={field} onClick={() => onEdit(normalized, field)}>
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
            <button className="missing-inline" onClick={() => onEdit(normalized, "contacts")}>
              Add contact
            </button>
          )}
        </span>
        <span>
          <strong>Location/link</strong>
          {normalized.locationOrLink ? (
            normalized.locationOrLink.startsWith("http") ? (
              <a href={normalized.locationOrLink} target="_blank" rel="noreferrer">
                Open link <ExternalLink size={13} />
              </a>
            ) : (
              normalized.locationOrLink
            )
          ) : (
            <button className="missing-inline" onClick={() => onEdit(normalized, "locationOrLink")}>
              Add location
            </button>
          )}
        </span>
        <span>
          <strong>Follow-up</strong>
          {normalized.followUpReminder || (
            <button className="missing-inline" onClick={() => onEdit(normalized, "followUpReminder")}>
              Add reminder
            </button>
          )}
        </span>
        <span>
          <strong>Links</strong>
          {(normalized.links ?? []).length ? (
            <span className="link-list">
              {(normalized.links ?? []).map((link) => (
                <a href={link.url} target="_blank" rel="noreferrer" key={link.id}>
                  {link.label || "Link"} <ExternalLink size={13} />
                </a>
              ))}
            </span>
          ) : (
            "No link"
          )}
        </span>
      </div>

      {(normalized.questions || normalized.notes || contacts.some((contact) => contact.notes)) && (
        <div className="notes-preview">
          {normalized.questions ? (
            <p>
              <strong>Questions:</strong> {normalized.questions}
            </p>
          ) : null}
          {normalized.notes ? (
            <p>
              <strong>Notes:</strong> {normalized.notes}
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
        <button className="ghost-button" onClick={() => onEdit(normalized)}>
          <Edit3 size={16} />
          Edit
        </button>
        <button
          className="danger-button"
          onClick={() => {
            if (window.confirm("Delete this interview?")) void onDelete(normalized.id);
          }}
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </article>
  );
}
