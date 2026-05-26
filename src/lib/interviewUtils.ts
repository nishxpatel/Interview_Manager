import {
  SCHEDULED_PIPELINE_STEPS,
  type Interview,
  type InterviewContact,
  type InterviewDraft,
  type MissingFieldKey,
  type PipelineStep
} from "../types/interview";

export const createBlankContact = (): InterviewContact => ({
  id: crypto.randomUUID(),
  name: "",
  title: "",
  email: "",
  phone: "",
  notes: ""
});

const hasContactValue = (contact: InterviewContact) =>
  Boolean(
    contact.name.trim() ||
      contact.title?.trim() ||
      contact.email?.trim() ||
      contact.phone?.trim() ||
      contact.notes?.trim()
  );

export const isScheduledPipeline = (pipeline?: string) =>
  SCHEDULED_PIPELINE_STEPS.includes(pipeline as PipelineStep);

export const isDonePipeline = (pipeline?: string) =>
  pipeline === "Follow-Up Sent / Done" || pipeline === "Withdrawn";

export const isCommunicationNeededPipeline = (pipeline?: string) =>
  pipeline === "Student Needs to Contact Employer" ||
  pipeline === "Waiting for Employer to Contact Student" ||
  pipeline === "Waiting for Employer Response";

export const mapLegacyPipeline = (record: Partial<Interview>): PipelineStep => {
  if (record.pipeline) return record.pipeline;

  const status = record.status?.toLowerCase() ?? "";
  const stage = record.stage?.toLowerCase() ?? "";
  const hasDate = Boolean(record.interviewDateTime);

  if (status.includes("need to email")) return "Student Needs to Contact Employer";
  if (status.includes("email sent") || status.includes("waiting")) return "Waiting for Employer Response";
  if (status.includes("date/time finalized")) return "Interview Scheduled";
  if (status.includes("interview completed")) return "Interview Completed";
  if (status.includes("follow-up")) return "Follow-Up Sent / Done";
  if (status.includes("rejected") || status.includes("closed")) return "Withdrawn";
  if (stage.includes("phone")) return "Screening Round Scheduled";
  if (stage.includes("technical") || stage.includes("behavioral") || stage.includes("final")) {
    return "Additional Interview Round Scheduled";
  }
  if (hasDate) return "Interview Scheduled";

  return "Student Needs to Contact Employer";
};

export const normalizeContacts = (interview: Partial<InterviewDraft>): InterviewContact[] => {
  const contacts = (interview.contacts ?? []).filter(hasContactValue);
  if (contacts.length) {
    return contacts.map((contact) => ({
      ...contact,
      id: contact.id || crypto.randomUUID()
    }));
  }

  if (interview.contactPerson?.trim()) {
    return [
      {
        id: crypto.randomUUID(),
        name: interview.contactPerson.trim(),
        title: "",
        email: "",
        phone: "",
        notes: ""
      }
    ];
  }

  return [];
};

export const normalizeInterview = (interview: Interview): Interview => {
  const contacts = normalizeContacts(interview);
  return {
    ...interview,
    pipeline: mapLegacyPipeline(interview),
    interviewFormat: interview.interviewFormat ?? "Unknown",
    roundLabel: interview.roundLabel ?? "",
    jobDescriptionLink: interview.jobDescriptionLink ?? "",
    contacts,
    contactPerson: interview.contactPerson ?? contacts[0]?.name ?? ""
  };
};

export const interviewToDraft = (interview: Interview): InterviewDraft => {
  const normalized = normalizeInterview(interview);
  return {
    company: normalized.company,
    position: normalized.position,
    pipeline: normalized.pipeline,
    stage: normalized.stage,
    status: normalized.status,
    interviewDateTime: normalized.interviewDateTime ?? "",
    interviewFormat: normalized.interviewFormat ?? "Unknown",
    roundLabel: normalized.roundLabel ?? "",
    contactPerson: normalized.contactPerson ?? normalized.contacts?.[0]?.name ?? "",
    contacts: normalized.contacts ?? [],
    locationOrLink: normalized.locationOrLink ?? "",
    jobDescriptionLink: normalized.jobDescriptionLink ?? "",
    notes: normalized.notes ?? "",
    questions: normalized.questions ?? "",
    followUpReminder: normalized.followUpReminder ?? "",
    source: normalized.source ?? "manual",
    drexelJobId: normalized.drexelJobId ?? "",
    jobLength: normalized.jobLength ?? ""
  };
};

export const prepareDraftForSave = (draft: InterviewDraft): InterviewDraft => {
  const contacts = normalizeContacts(draft);
  return {
    ...draft,
    pipeline: mapLegacyPipeline(draft as Partial<Interview>),
    interviewFormat: draft.interviewFormat ?? "Unknown",
    contacts,
    contactPerson: contacts[0]?.name ?? draft.contactPerson ?? ""
  };
};

export const missingFieldLabels: Record<MissingFieldKey, string> = {
  company: "company",
  position: "position",
  pipeline: "pipeline",
  interviewDateTime: "date/time",
  interviewFormat: "format",
  contacts: "contact",
  locationOrLink: "location/link",
  jobDescriptionLink: "job description",
  questions: "questions",
  followUpReminder: "follow-up reminder"
};

export const getMissingFields = (interview: Interview): MissingFieldKey[] => {
  const normalized = normalizeInterview(interview);
  const contacts = normalized.contacts ?? [];
  const fields: Array<[MissingFieldKey, boolean]> = [
    ["company", Boolean(normalized.company?.trim())],
    ["position", Boolean(normalized.position?.trim())],
    ["pipeline", Boolean(normalized.pipeline)]
  ];

  if (isCommunicationNeededPipeline(normalized.pipeline)) {
    fields.push(["contacts", contacts.length > 0]);
  }

  if (isScheduledPipeline(normalized.pipeline)) {
    fields.push(["interviewDateTime", Boolean(normalized.interviewDateTime?.trim())]);
    fields.push([
      "interviewFormat",
      Boolean(normalized.interviewFormat && normalized.interviewFormat !== "Unknown")
    ]);
    fields.push(["locationOrLink", Boolean(normalized.locationOrLink?.trim())]);
  }

  return fields.filter(([, hasValue]) => !hasValue).map(([field]) => field);
};

export const contactSearchText = (contacts: InterviewContact[]) =>
  contacts
    .map((contact) =>
      [contact.name, contact.title, contact.email, contact.phone, contact.notes].join(" ")
    )
    .join(" ");

export const getCountdownText = (value?: string) => {
  if (!value) return "";
  const interviewTime = new Date(value);
  if (Number.isNaN(interviewTime.getTime())) return "";

  const diffMs = interviewTime.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const days = Math.floor(absMs / 86_400_000);
  const hours = Math.floor((absMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((absMs % 3_600_000) / 60_000);

  const parts = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return diffMs >= 0 ? `${parts} until interview` : `Occurred ${parts} ago`;
};
