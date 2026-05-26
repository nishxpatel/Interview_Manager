import { FormEvent, useEffect, useRef, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import {
  INTERVIEW_FORMATS,
  PIPELINE_STEPS,
  SCHEDULED_PIPELINE_STEPS,
  type Interview,
  type InterviewContact,
  type InterviewDraft,
  type InterviewLink,
  type MissingFieldKey,
  type PipelineStep
} from "../types/interview";
import {
  createBlankContact,
  createBlankLink,
  interviewToDraft,
  isScheduledPipeline
} from "../lib/interviewUtils";

const blankDraft: InterviewDraft = {
  company: "",
  position: "",
  pipeline: "Student Needs to Contact Employer",
  interviewDateTime: "",
  interviewFormat: "Not set",
  roundLabel: "",
  contactPerson: "",
  contacts: [],
  locationOrLink: "",
  jobDescriptionLink: "",
  links: [],
  notes: "",
  questions: "",
  source: "manual",
  drexelJobId: "",
  jobLength: ""
};

const toDraft = (interview: Interview | null): InterviewDraft =>
  interview ? interviewToDraft(interview) : { ...blankDraft };

interface InterviewFormProps {
  interview: Interview | null;
  initialFocus?: MissingFieldKey;
  onCancel: () => void;
  onSave: (draft: InterviewDraft) => Promise<void>;
}

export function InterviewForm({ interview, initialFocus, onCancel, onSave }: InterviewFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<InterviewDraft>(() => {
    const nextDraft = toDraft(interview);
    if (initialFocus === "contacts" && !nextDraft.contacts?.length) {
      return { ...nextDraft, contacts: [createBlankContact()] };
    }
    return nextDraft;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialFocus) return;
    const target = formRef.current?.querySelector<HTMLElement>(`[data-focus="${initialFocus}"]`);
    target?.focus();
  }, [initialFocus]);

  const update = <K extends keyof InterviewDraft>(key: K, value: InterviewDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateContact = <K extends keyof InterviewContact>(
    contactId: string,
    key: K,
    value: InterviewContact[K]
  ) => {
    setDraft((current) => ({
      ...current,
      contacts: (current.contacts ?? []).map((contact) =>
        contact.id === contactId ? { ...contact, [key]: value } : contact
      )
    }));
  };

  const updateLink = <K extends keyof InterviewLink>(
    linkId: string,
    key: K,
    value: InterviewLink[K]
  ) => {
    setDraft((current) => ({
      ...current,
      links: (current.links ?? []).map((link) =>
        link.id === linkId ? { ...link, [key]: value } : link
      )
    }));
  };

  const addContact = () => {
    setDraft((current) => ({
      ...current,
      contacts: [...(current.contacts ?? []), createBlankContact()]
    }));
  };

  const removeContact = (contactId: string) => {
    setDraft((current) => ({
      ...current,
      contacts: (current.contacts ?? []).filter((contact) => contact.id !== contactId)
    }));
  };

  const addLink = () => {
    setDraft((current) => ({
      ...current,
      links: [...(current.links ?? []), createBlankLink()]
    }));
  };

  const removeLink = (linkId: string) => {
    setDraft((current) => ({
      ...current,
      links: (current.links ?? []).filter((link) => link.id !== linkId)
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!draft.company.trim() || !draft.position.trim()) {
      setError("Company and position are required.");
      return;
    }
    if (isScheduledPipeline(draft.pipeline) && !draft.interviewDateTime?.trim()) {
      setError("Date and time are required once an interview round is scheduled.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...draft,
        company: draft.company.trim(),
        position: draft.position.trim()
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save interview.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <form ref={formRef} className="modal-panel interview-form" onSubmit={submit}>
        <div className="modal-header">
          <div>
            <h2>{interview ? "Edit interview" : "Add interview"}</h2>
            <p>Company, role, pipeline, schedule, contacts, notes, and links.</p>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error ? <p className="app-error">{error}</p> : null}

        <div className="form-grid">
          <label className="field">
            <span>Company</span>
            <input
              data-focus="company"
              value={draft.company}
              onChange={(e) => update("company", e.target.value)}
            />
          </label>
          <label className="field">
            <span>Position</span>
            <input
              data-focus="position"
              value={draft.position}
              onChange={(e) => update("position", e.target.value)}
            />
          </label>
          <label className="field">
            <span>Pipeline</span>
            <select
              data-focus="pipeline"
              value={draft.pipeline}
              onChange={(e) => update("pipeline", e.target.value as PipelineStep)}
            >
              {PIPELINE_STEPS.map((pipeline) => (
                <option key={pipeline}>{pipeline}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Interview format</span>
            <select
              data-focus="interviewFormat"
              value={draft.interviewFormat ?? "Not set"}
              onChange={(e) => update("interviewFormat", e.target.value as InterviewDraft["interviewFormat"])}
            >
              {INTERVIEW_FORMATS.map((format) => (
                <option key={format}>{format}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Date and time</span>
            <input
              data-focus="interviewDateTime"
              type="datetime-local"
              value={draft.interviewDateTime}
              onChange={(e) => update("interviewDateTime", e.target.value)}
            />
            {SCHEDULED_PIPELINE_STEPS.includes(draft.pipeline) ? (
              <small>Required for scheduled pipeline steps.</small>
            ) : null}
          </label>
          <label className="field">
            <span>Round label</span>
            <input
              value={draft.roundLabel}
              onChange={(e) => update("roundLabel", e.target.value)}
              placeholder="Screening, first round, second round, final"
            />
          </label>
          <label className="field">
            <span>Location or meeting link</span>
            <input
              data-focus="locationOrLink"
              value={draft.locationOrLink}
              onChange={(e) => update("locationOrLink", e.target.value)}
              placeholder="Address, office, Zoom, Teams, phone number"
            />
          </label>
          <label className="field">
            <span>Drexel job ID</span>
            <input value={draft.drexelJobId} onChange={(e) => update("drexelJobId", e.target.value)} />
          </label>
          <label className="field wide">
            <span>Job description link</span>
            <input
              data-focus="jobDescriptionLink"
              value={draft.jobDescriptionLink}
              onChange={(e) => update("jobDescriptionLink", e.target.value)}
              placeholder="Paste the Drexel job posting or external job description URL"
            />
          </label>
          <section className="field wide contacts-editor" aria-label="Imported and related links">
            <div className="subsection-heading">
              <div>
                <span>Related links</span>
                <p>Preserved Drexel posting, employer, scheduling, or interview links.</p>
              </div>
              <button type="button" className="ghost-button compact-button" onClick={addLink}>
                <Plus size={16} />
                Add link
              </button>
            </div>
            {(draft.links ?? []).length ? (
              <div className="contact-form-list">
                {(draft.links ?? []).map((link, index) => (
                  <article className="contact-form-card" key={link.id}>
                    <div className="contact-form-title">
                      <strong>Link {index + 1}</strong>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => removeLink(link.id)}
                        aria-label="Remove link"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="contact-grid">
                      <label className="field">
                        <span>Label</span>
                        <input
                          value={link.label}
                          onChange={(e) => updateLink(link.id, "label", e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Type</span>
                        <select
                          value={link.type ?? "other"}
                          onChange={(e) =>
                            updateLink(
                              link.id,
                              "type",
                              e.target.value as NonNullable<InterviewLink["type"]>
                            )
                          }
                        >
                          <option value="job-description">Job description</option>
                          <option value="posting">Posting</option>
                          <option value="interview">Interview</option>
                          <option value="employer">Employer</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <label className="field wide">
                        <span>URL</span>
                        <input
                          value={link.url}
                          onChange={(e) => updateLink(link.id, "url", e.target.value)}
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <button type="button" className="ghost-button compact-button" onClick={addLink}>
                Add a related link
              </button>
            )}
          </section>
          <section className="field wide contacts-editor" aria-label="Contacts">
            <div className="subsection-heading">
              <div>
                <span>Contacts</span>
                <p>Recruiters, interviewers, hiring managers, or co-op contacts.</p>
              </div>
              <button type="button" className="ghost-button compact-button" onClick={addContact}>
                <Plus size={16} />
                Add contact
              </button>
            </div>
            {(draft.contacts ?? []).length ? (
              <div className="contact-form-list">
                {(draft.contacts ?? []).map((contact, index) => (
                  <article className="contact-form-card" key={contact.id}>
                    <div className="contact-form-title">
                      <strong>Contact {index + 1}</strong>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => removeContact(contact.id)}
                        aria-label="Remove contact"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="contact-grid">
                      <label className="field">
                        <span>Name</span>
                        <input
                          data-focus={index === 0 ? "contacts" : undefined}
                          value={contact.name}
                          onChange={(e) => updateContact(contact.id, "name", e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Title/role</span>
                        <input
                          value={contact.title ?? ""}
                          onChange={(e) => updateContact(contact.id, "title", e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Email</span>
                        <input
                          type="email"
                          value={contact.email ?? ""}
                          onChange={(e) => updateContact(contact.id, "email", e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Phone</span>
                        <input
                          value={contact.phone ?? ""}
                          onChange={(e) => updateContact(contact.id, "phone", e.target.value)}
                        />
                      </label>
                      <label className="field wide">
                        <span>Contact notes</span>
                        <textarea
                          value={contact.notes ?? ""}
                          rows={2}
                          onChange={(e) => updateContact(contact.id, "notes", e.target.value)}
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <button
                type="button"
                className="missing-field large-missing"
                data-focus="contacts"
                onClick={addContact}
              >
                Add a contact
              </button>
            )}
          </section>
          <label className="field wide">
            <span>Questions to ask</span>
            <textarea
              data-focus="questions"
              value={draft.questions}
              onChange={(e) => update("questions", e.target.value)}
              rows={4}
            />
          </label>
          <label className="field wide">
            <span>Notes</span>
            <textarea
              value={draft.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={6}
            />
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            <Save size={17} />
            {saving ? "Saving..." : "Save interview"}
          </button>
        </div>
      </form>
    </div>
  );
}
