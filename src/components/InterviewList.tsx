import { useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp, Edit3, ExternalLink, Trash2 } from "lucide-react";
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
  const [contactsExpanded, setContactsExpanded] = useState(false);
  const normalized = normalizeInterview(interview);
  const contacts = normalizeContacts(normalized);
  const missingFields = getMissingFields(normalized);
  const countdown = isScheduledPipeline(normalized.pipeline)
    ? getCountdownText(normalized.interviewDateTime)
    : "";
  const visibleContacts = contactsExpanded ? contacts : contacts.slice(0, 2);
  const hiddenContactCount = Math.max(0, contacts.length - visibleContacts.length);

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

      <div className="interview-summary-grid">
        <span className="summary-item">
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
        <span className="summary-item">
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

      <section className="contacts-compact" aria-label="Contacts">
        <div className="compact-section-heading">
          <strong>Contacts ({contacts.length})</strong>
          {contacts.length > 2 ? (
            <button
              type="button"
              className="text-button"
              onClick={() => setContactsExpanded((current) => !current)}
            >
              {contactsExpanded ? (
                <>
                  Show fewer <ChevronUp size={14} />
                </>
              ) : (
                <>
                  Show {hiddenContactCount} more <ChevronDown size={14} />
                </>
              )}
            </button>
          ) : null}
        </div>
        {contacts.length ? (
          <div className="contact-compact-list">
            {visibleContacts.map((contact) => (
              <div className="contact-compact-row" key={contact.id}>
                <span className="contact-identity">
                  <b>{contact.name || contact.email || "Unnamed contact"}</b>
                  {contact.title ? <small>{contact.title}</small> : null}
                </span>
                <span className="contact-methods">
                  {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}
                  {contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : null}
                </span>
                {contact.notes ? <p>{contact.notes}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-compact-row">
            <span>No contacts yet</span>
            <button className="missing-inline" onClick={() => onEdit(normalized, "contacts")}>
              Add contact
            </button>
          </div>
        )}
      </section>

      {(normalized.questions || normalized.notes) && (
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
