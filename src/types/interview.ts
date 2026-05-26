export const INTERVIEW_STATUSES = [
  "Need to email",
  "Email sent",
  "Waiting for response",
  "Date/time finalized",
  "Interview completed",
  "Follow-up sent",
  "Offer received",
  "Rejected/closed"
] as const;

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export type InterviewStage =
  | "Application"
  | "Phone screen"
  | "Technical"
  | "Behavioral"
  | "Final round"
  | "Co-op interview"
  | "Offer"
  | "Closed";

export interface Interview {
  id: string;
  company: string;
  position: string;
  stage: InterviewStage;
  status: InterviewStatus;
  interviewDateTime?: string;
  contactPerson?: string;
  locationOrLink?: string;
  notes?: string;
  questions?: string;
  followUpReminder?: string;
  source?: "manual" | "drexel-import";
  drexelJobId?: string;
  jobLength?: string;
  createdAt: string;
  updatedAt: string;
}

export type InterviewDraft = Omit<Interview, "id" | "createdAt" | "updatedAt">;

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isDemo?: boolean;
}
