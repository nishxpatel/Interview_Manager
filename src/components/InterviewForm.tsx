import { FormEvent, useState } from "react";
import { Save, X } from "lucide-react";
import {
  INTERVIEW_STATUSES,
  type Interview,
  type InterviewDraft,
  type InterviewStage
} from "../types/interview";

const stages: InterviewStage[] = [
  "Application",
  "Phone screen",
  "Technical",
  "Behavioral",
  "Final round",
  "Co-op interview",
  "Offer",
  "Closed"
];

const blankDraft: InterviewDraft = {
  company: "",
  position: "",
  stage: "Co-op interview",
  status: "Need to email",
  interviewDateTime: "",
  contactPerson: "",
  locationOrLink: "",
  notes: "",
  questions: "",
  followUpReminder: "",
  source: "manual",
  drexelJobId: "",
  jobLength: ""
};

const toDraft = (interview: Interview | null): InterviewDraft =>
  interview
    ? {
        company: interview.company,
        position: interview.position,
        stage: interview.stage,
        status: interview.status,
        interviewDateTime: interview.interviewDateTime ?? "",
        contactPerson: interview.contactPerson ?? "",
        locationOrLink: interview.locationOrLink ?? "",
        notes: interview.notes ?? "",
        questions: interview.questions ?? "",
        followUpReminder: interview.followUpReminder ?? "",
        source: interview.source ?? "manual",
        drexelJobId: interview.drexelJobId ?? "",
        jobLength: interview.jobLength ?? ""
      }
    : blankDraft;

interface InterviewFormProps {
  interview: Interview | null;
  onCancel: () => void;
  onSave: (draft: InterviewDraft) => Promise<void>;
}

export function InterviewForm({ interview, onCancel, onSave }: InterviewFormProps) {
  const [draft, setDraft] = useState<InterviewDraft>(() => toDraft(interview));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = <K extends keyof InterviewDraft>(key: K, value: InterviewDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!draft.company.trim() || !draft.position.trim()) {
      setError("Company and position are required.");
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
      <form className="modal-panel interview-form" onSubmit={submit}>
        <div className="modal-header">
          <div>
            <h2>{interview ? "Edit interview" : "Add interview"}</h2>
            <p>Company, role, schedule, status, notes, and follow-up details.</p>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error ? <p className="app-error">{error}</p> : null}

        <div className="form-grid">
          <label className="field">
            <span>Company</span>
            <input value={draft.company} onChange={(e) => update("company", e.target.value)} />
          </label>
          <label className="field">
            <span>Position</span>
            <input value={draft.position} onChange={(e) => update("position", e.target.value)} />
          </label>
          <label className="field">
            <span>Stage</span>
            <select
              value={draft.stage}
              onChange={(e) => update("stage", e.target.value as InterviewStage)}
            >
              {stages.map((stage) => (
                <option key={stage}>{stage}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={draft.status}
              onChange={(e) => update("status", e.target.value as InterviewDraft["status"])}
            >
              {INTERVIEW_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Date and time</span>
            <input
              type="datetime-local"
              value={draft.interviewDateTime}
              onChange={(e) => update("interviewDateTime", e.target.value)}
            />
          </label>
          <label className="field">
            <span>Contact person</span>
            <input
              value={draft.contactPerson}
              onChange={(e) => update("contactPerson", e.target.value)}
            />
          </label>
          <label className="field wide">
            <span>Location or meeting link</span>
            <input
              value={draft.locationOrLink}
              onChange={(e) => update("locationOrLink", e.target.value)}
            />
          </label>
          <label className="field">
            <span>Follow-up reminder</span>
            <input
              type="date"
              value={draft.followUpReminder}
              onChange={(e) => update("followUpReminder", e.target.value)}
            />
          </label>
          <label className="field">
            <span>Drexel job ID</span>
            <input value={draft.drexelJobId} onChange={(e) => update("drexelJobId", e.target.value)} />
          </label>
          <label className="field wide">
            <span>Questions to ask</span>
            <textarea
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
