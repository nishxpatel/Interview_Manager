import {
  INTERVIEW_FORMATS,
  PIPELINE_STEPS,
  SCHEDULED_PIPELINE_STEPS,
  type Interview,
  type InterviewContact,
  type InterviewDraft,
  type InterviewFormat,
  type InterviewLink,
  type MissingFieldKey,
  type PipelineStep
} from "../types/interview";
import { createId } from "./id";

export const createBlankContact = (): InterviewContact => ({
  id: createId(),
  name: "",
  title: "",
  email: "",
  phone: "",
  notes: ""
});

export const createBlankLink = (): InterviewLink => ({
  id: createId(),
  label: "",
  url: "",
  type: "other"
});

const textValue = (value: unknown) => (typeof value === "string" ? value : value == null ? "" : String(value));
const trimValue = (value: unknown) => textValue(value).trim();
const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasContactValue = (contact: Record<string, unknown>) =>
  Boolean(
    trimValue(contact.name) ||
      trimValue(contact.title) ||
      trimValue(contact.email) ||
      trimValue(contact.phone) ||
      trimValue(contact.notes)
  );

const hasLinkValue = (link: Record<string, unknown>) => Boolean(trimValue(link.url));

const inferLinkType = (url: unknown, label: unknown = ""): InterviewLink["type"] => {
  const text = `${textValue(url)} ${textValue(label)}`.toLowerCase();
  if (/job|posting|display|i_job_num/.test(text)) return "job-description";
  if (/interview|schedule/.test(text)) return "interview";
  if (/employer|company/.test(text)) return "employer";
  return "other";
};

const withoutLegacyFields = <
  T extends {
    stage?: unknown;
    status?: unknown;
    followUpReminder?: unknown;
    followUpReminderDate?: unknown;
    reminder?: unknown;
  }
>(
  value: T
) => {
  const current = { ...value };
  delete current.stage;
  delete current.status;
  delete current.followUpReminder;
  delete current.followUpReminderDate;
  delete current.reminder;
  return current;
};

const normalizeNotes = (notes?: unknown, source?: Interview["source"]) => {
  const value = textValue(notes);
  const trimmed = value.trim();
  if (
    source === "drexel-import" &&
    (/^Imported from Drexel\.?$/i.test(trimmed) ||
      (/^Imported from Drexel(?:\.|$)/i.test(trimmed) &&
        /Drexel interview (?:status|type)|Drexel location/i.test(trimmed)))
  ) {
    return "";
  }
  return value;
};

export const isScheduledPipeline = (pipeline?: string) =>
  SCHEDULED_PIPELINE_STEPS.includes(pipeline as PipelineStep);

export const isDonePipeline = (pipeline?: string) =>
  pipeline === "Interview Completed" || pipeline === "Withdrawn";

export const isCommunicationNeededPipeline = (pipeline?: string) =>
  pipeline === "Make Contact" || pipeline === "Waiting for Employer Reply";

export const isContactRequiredPipeline = (pipeline?: string) =>
  pipeline === "Make Contact" || pipeline === "Waiting for Employer Reply";

const isPipelineStep = (value?: string): value is PipelineStep =>
  PIPELINE_STEPS.includes(value as PipelineStep);

const isLegacyFollowUpPipeline = (value?: string) => value === "Follow-Up Sent / Done";

const isLegacyMakeContactPipeline = (value?: string) =>
  value === "Student Needs to Contact Employer" || value === "Waiting for Employer to Contact Student";

const isLegacyWaitingReplyPipeline = (value?: string) =>
  value === "Waiting for Employer Response" || value === "Scheduling in Progress";

type LegacyInterviewRecord = Partial<Omit<Interview, "pipeline">> & { pipeline?: string };

const mapLegacyThankYouEmailSent = (record: LegacyInterviewRecord) => {
  const status = textValue(record.status).toLowerCase();
  return Boolean(record.thankYouEmailSent || isLegacyFollowUpPipeline(record.pipeline) || status.includes("follow-up"));
};

export const normalizeInterviewFormat = (value?: unknown): InterviewFormat => {
  if (!value) return "Not set";
  if (INTERVIEW_FORMATS.includes(value as InterviewFormat)) return value as InterviewFormat;

  const format = textValue(value).toLowerCase();
  if (format.includes("teams")) return "Teams";
  if (format.includes("zoom")) return "Zoom";
  if (format.includes("phone") || format.includes("call")) return "Phone";
  if (format.includes("in-person") || format.includes("in person") || format.includes("on-site")) {
    return "On-Site";
  }
  if (format.includes("employer site") || format.includes("office") || format.includes("campus")) {
    return "On-Site";
  }
  if (format.includes("virtual") || format.includes("hybrid") || format.includes("online")) return "Other";
  if (format.includes("unknown")) return "Not set";
  return "Other";
};

export const mapLegacyPipeline = (record: LegacyInterviewRecord): PipelineStep => {
  const hasDate = Boolean(record.interviewDateTime);
  if (isPipelineStep(record.pipeline)) return record.pipeline;
  if (isLegacyMakeContactPipeline(record.pipeline)) return "Make Contact";
  if (isLegacyWaitingReplyPipeline(record.pipeline)) return "Waiting for Employer Reply";
  if (isLegacyFollowUpPipeline(record.pipeline)) return "Interview Completed";
  if (
    record.pipeline === "Screening Round Scheduled" ||
    record.pipeline === "Additional Interview Round Scheduled"
  ) {
    return hasDate ? "Interview Scheduled" : "Waiting for Employer Reply";
  }
  const status = textValue(record.status).toLowerCase();
  const stage = textValue(record.stage).toLowerCase();

  if (status.includes("need to email")) return "Make Contact";
  if (status.includes("email sent") || status.includes("waiting")) return "Waiting for Employer Reply";
  if (status.includes("date/time finalized")) return "Interview Scheduled";
  if (status.includes("interview completed")) return "Interview Completed";
  if (status.includes("follow-up")) return "Interview Completed";
  if (status.includes("rejected") || status.includes("closed")) return "Withdrawn";
  if (stage.includes("phone")) return hasDate ? "Interview Scheduled" : "Waiting for Employer Reply";
  if (stage.includes("technical") || stage.includes("behavioral") || stage.includes("final")) {
    return hasDate ? "Interview Scheduled" : "Waiting for Employer Reply";
  }
  if (hasDate) return "Interview Scheduled";

  return "Make Contact";
};

export const normalizeContacts = (interview: Partial<InterviewDraft>): InterviewContact[] => {
  const contactsValue = (interview as { contacts?: unknown }).contacts;
  const rawContacts: Record<string, unknown>[] = Array.isArray(contactsValue)
    ? contactsValue.filter(isObjectRecord)
    : [];
  const contacts = rawContacts.filter(hasContactValue);
  if (contacts.length) {
    return contacts.map((contact) => ({
      id: trimValue(contact.id) || createId(),
      name: textValue(contact.name),
      title: textValue(contact.title),
      email: textValue(contact.email),
      phone: textValue(contact.phone),
      notes: textValue(contact.notes)
    }));
  }

  if (trimValue(interview.contactPerson)) {
    return [
      {
        id: createId(),
        name: trimValue(interview.contactPerson),
        title: "",
        email: "",
        phone: "",
        notes: ""
      }
    ];
  }

  return [];
};

export const normalizeLinks = (interview: Partial<InterviewDraft>): InterviewLink[] => {
  const linksValue = (interview as { links?: unknown }).links;
  const rawLinks: Record<string, unknown>[] = Array.isArray(linksValue)
    ? linksValue.filter(isObjectRecord)
    : [];
  const links = rawLinks.filter(hasLinkValue).map((link) => ({
    id: trimValue(link.id) || createId(),
    label: trimValue(link.label) || "Link",
    url: trimValue(link.url),
    type:
      link.type === "job-description" ||
      link.type === "posting" ||
      link.type === "interview" ||
      link.type === "employer" ||
      link.type === "other"
        ? link.type
        : inferLinkType(link.url, link.label)
  }));

  if (trimValue(interview.jobDescriptionLink)) {
    links.unshift({
      id: createId(),
      label: "Job description",
      url: trimValue(interview.jobDescriptionLink),
      type: "job-description"
    });
  }

  const seen = new Set<string>();
  return links.filter((link) => {
    const key = link.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const normalizeInterview = (interview: Interview): Interview => {
  const contacts = normalizeContacts(interview);
  const links = normalizeLinks(interview);
  const current = withoutLegacyFields(interview);
  const pipeline = mapLegacyPipeline(interview);
  const jobDescriptionLink =
    trimValue(interview.jobDescriptionLink) ||
    (links.find((link) => link.type === "job-description" || link.type === "posting")?.url ?? "");
  return {
    ...current,
    company: textValue(interview.company),
    position: textValue(interview.position),
    pipeline,
    interviewDateTime: textValue(interview.interviewDateTime),
    interviewFormat: normalizeInterviewFormat(interview.interviewFormat),
    roundLabel: textValue(interview.roundLabel),
    thankYouEmailSent: pipeline === "Interview Completed" ? mapLegacyThankYouEmailSent(interview) : false,
    locationOrLink: textValue(interview.locationOrLink),
    jobDescriptionLink,
    links,
    contacts,
    notes: normalizeNotes(interview.notes, interview.source),
    questions: textValue(interview.questions),
    source: interview.source === "drexel-import" ? "drexel-import" : "manual",
    drexelJobId: textValue(interview.drexelJobId),
    jobLength: textValue(interview.jobLength),
    contactPerson: trimValue(interview.contactPerson) || (contacts[0]?.name ?? ""),
    createdAt: textValue(interview.createdAt),
    updatedAt: textValue(interview.updatedAt)
  };
};

export const interviewToDraft = (interview: Interview): InterviewDraft => {
  const normalized = normalizeInterview(interview);
  return {
    company: normalized.company,
    position: normalized.position,
    pipeline: normalized.pipeline,
    interviewDateTime: normalized.interviewDateTime ?? "",
    interviewFormat: normalizeInterviewFormat(normalized.interviewFormat),
    roundLabel: normalized.roundLabel ?? "",
    thankYouEmailSent: normalized.thankYouEmailSent ?? false,
    contactPerson: normalized.contactPerson ?? normalized.contacts?.[0]?.name ?? "",
    contacts: normalized.contacts ?? [],
    locationOrLink: normalized.locationOrLink ?? "",
    jobDescriptionLink: normalized.jobDescriptionLink ?? "",
    links: normalized.links ?? [],
    notes: normalizeNotes(normalized.notes, normalized.source),
    questions: normalized.questions ?? "",
    source: normalized.source ?? "manual",
    drexelJobId: normalized.drexelJobId ?? "",
    jobLength: normalized.jobLength ?? ""
  };
};

export const prepareDraftForSave = (draft: InterviewDraft): InterviewDraft => {
  const contacts = normalizeContacts(draft);
  const links = normalizeLinks(draft);
  const current = withoutLegacyFields(draft);
  const pipeline = mapLegacyPipeline(draft as LegacyInterviewRecord);
  return {
    ...current,
    pipeline,
    interviewFormat: normalizeInterviewFormat(draft.interviewFormat),
    thankYouEmailSent:
      pipeline === "Interview Completed" ? mapLegacyThankYouEmailSent(draft as LegacyInterviewRecord) : false,
    contacts,
    links,
    notes: normalizeNotes(draft.notes, draft.source),
    jobDescriptionLink:
      draft.jobDescriptionLink ??
      links.find((link) => link.type === "job-description" || link.type === "posting")?.url ??
      "",
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
  questions: "questions"
};

export const getMissingFields = (interview: Interview): MissingFieldKey[] => {
  const normalized = normalizeInterview(interview);
  const contacts = normalized.contacts ?? [];
  const fields: Array<[MissingFieldKey, boolean]> = [
    ["company", Boolean(normalized.company?.trim())],
    ["position", Boolean(normalized.position?.trim())],
    ["pipeline", Boolean(normalized.pipeline)]
  ];

  if (isContactRequiredPipeline(normalized.pipeline)) {
    fields.push(["contacts", contacts.length > 0]);
  }

  if (isScheduledPipeline(normalized.pipeline)) {
    fields.push(["interviewDateTime", Boolean(normalized.interviewDateTime?.trim())]);
    fields.push([
      "interviewFormat",
      Boolean(normalized.interviewFormat && normalized.interviewFormat !== "Not set")
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
