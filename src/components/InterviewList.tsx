import { useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp, Edit3, ExternalLink } from "lucide-react";
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
  onPipelineChange: (interview: Interview, pipeline: PipelineStep) => Promise<void>;
  onThankYouEmailChange: (interview: Interview, thankYouEmailSent: boolean) => Promise<void>;
}

type InterviewRowProps = Omit<InterviewListProps, "interviews"> & {
  interview: Interview;
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
};

const contactPreviewLimit = 3;

export function InterviewList({
  interviews,
  onEdit,
  onPipelineChange,
  onThankYouEmailChange
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
        <InterviewRow
          key={interview.id}
          interview={interview}
          onEdit={onEdit}
          onPipelineChange={onPipelineChange}
          onThankYouEmailChange={onThankYouEmailChange}
        />
      ))}
    </div>
  );
}

function InterviewRow({
  interview,
  onEdit,
  onPipelineChange,
  onThankYouEmailChange
}: InterviewRowProps) {
  const [contactsExpanded, setContactsExpanded] = useState(false);
  const normalized = normalizeInterview(interview);
  const contacts = normalizeContacts(normalized);
  const missingFields = getMissingFields(normalized);
  const countdown = isScheduledPipeline(normalized.pipeline)
    ? getCountdownText(normalized.interviewDateTime)
    : "";
  const shouldCollapseContacts = contacts.length > contactPreviewLimit;
  const visibleContacts = contactsExpanded || !shouldCollapseContacts
    ? contacts
    : contacts.slice(0, contactPreviewLimit);
  const hiddenContactCount = Math.max(0, contacts.length - contactPreviewLimit);
  const dateLabel = formatDate(normalized.interviewDateTime);
  const showScheduledTags = isScheduledPipeline(normalized.pipeline);
  const isCompleted = normalized.pipeline === "Interview Completed";
  const formatLabel =
    normalized.interviewFormat && normalized.interviewFormat !== "Not set"
      ? normalized.interviewFormat
      : "";

  return (
    <article className="interview-row">
      <div className="interview-row-main">
        <div className="interview-title-block">
          <h3>{normalized.company}</h3>
          <p>{normalized.position}</p>
        </div>
        <div className="meta-row interview-row-meta">
          <span>{normalized.pipeline}</span>
          {normalized.roundLabel ? <span>{normalized.roundLabel}</span> : null}
          {dateLabel ? <span>{dateLabel}</span> : showScheduledTags ? <span>Date not scheduled</span> : null}
          {formatLabel ? <span>{formatLabel}</span> : showScheduledTags ? <span>Format not set</span> : null}
          {countdown ? <span className="countdown-pill">{countdown}</span> : null}
        </div>
        <div className="interview-row-actions">
          <label className="pipeline-select compact-pipeline-select">
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
          {isCompleted ? (
            <label className="thank-you-check">
              <input
                type="checkbox"
                checked={Boolean(normalized.thankYouEmailSent)}
                onChange={(event) => onThankYouEmailChange(normalized, event.target.checked)}
              />
              <span>Thank-you email</span>
            </label>
          ) : null}
          <button className="ghost-button compact-edit-button" onClick={() => onEdit(normalized)}>
            <Edit3 size={15} />
            Edit
          </button>
        </div>
      </div>

      <div className="interview-row-details">
        <span className="detail-item">
          <strong>Location</strong>
          <span className="detail-value">
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
        </span>
        <span className="detail-item">
          <strong>Links</strong>
          <span className="detail-value">
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
        </span>
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

      {contacts.length ? (
        <section className="contacts-compact" aria-label="Contacts">
          <div className="compact-section-heading">
            <strong>Contacts ({contacts.length})</strong>
            {shouldCollapseContacts ? (
              <button
                type="button"
                className="text-button"
                onClick={() => setContactsExpanded((current) => !current)}
              >
                {contactsExpanded ? (
                  <>
                    Show fewer contacts <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    Show {hiddenContactCount} more contacts <ChevronDown size={14} />
                  </>
                )}
              </button>
            ) : null}
          </div>
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
        </section>
      ) : null}

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
    </article>
  );
}
