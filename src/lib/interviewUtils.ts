import type {
  Interview,
  InterviewContact,
  InterviewDraft,
  MissingFieldKey
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
    contacts,
    contactPerson: interview.contactPerson ?? contacts[0]?.name ?? ""
  };
};

export const interviewToDraft = (interview: Interview): InterviewDraft => {
  const contacts = normalizeContacts(interview);
  return {
    company: interview.company,
    position: interview.position,
    stage: interview.stage,
    status: interview.status,
    interviewDateTime: interview.interviewDateTime ?? "",
    contactPerson: interview.contactPerson ?? contacts[0]?.name ?? "",
    contacts,
    locationOrLink: interview.locationOrLink ?? "",
    notes: interview.notes ?? "",
    questions: interview.questions ?? "",
    followUpReminder: interview.followUpReminder ?? "",
    source: interview.source ?? "manual",
    drexelJobId: interview.drexelJobId ?? "",
    jobLength: interview.jobLength ?? ""
  };
};

export const prepareDraftForSave = (draft: InterviewDraft): InterviewDraft => {
  const contacts = normalizeContacts(draft);
  return {
    ...draft,
    contacts,
    contactPerson: contacts[0]?.name ?? draft.contactPerson ?? ""
  };
};

export const missingFieldLabels: Record<MissingFieldKey, string> = {
  company: "company",
  position: "position",
  interviewDateTime: "date/time",
  contacts: "contact",
  locationOrLink: "location/link",
  questions: "questions",
  followUpReminder: "follow-up reminder"
};

export const getMissingFields = (interview: Interview): MissingFieldKey[] => {
  const contacts = normalizeContacts(interview);
  const fields: Array<[MissingFieldKey, boolean]> = [
    ["company", Boolean(interview.company?.trim())],
    ["position", Boolean(interview.position?.trim())],
    ["interviewDateTime", Boolean(interview.interviewDateTime?.trim())],
    ["contacts", contacts.length > 0],
    ["locationOrLink", Boolean(interview.locationOrLink?.trim())],
    ["questions", Boolean(interview.questions?.trim())],
    ["followUpReminder", Boolean(interview.followUpReminder?.trim())]
  ];

  return fields.filter(([, hasValue]) => !hasValue).map(([field]) => field);
};

export const contactSearchText = (contacts: InterviewContact[]) =>
  contacts
    .map((contact) =>
      [contact.name, contact.title, contact.email, contact.phone, contact.notes].join(" ")
    )
    .join(" ");
