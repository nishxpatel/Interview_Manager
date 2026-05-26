export const PIPELINE_STEPS = [
  "Student Needs to Contact Employer",
  "Waiting for Employer to Contact Student",
  "Waiting for Employer Response",
  "Scheduling in Progress",
  "Interview Scheduled",
  "Interview Completed",
  "Follow-Up Sent / Done",
  "Withdrawn"
] as const;

export type PipelineStep = (typeof PIPELINE_STEPS)[number];

export const SCHEDULED_PIPELINE_STEPS: PipelineStep[] = ["Interview Scheduled"];

export const INTERVIEW_FORMATS = ["Not set", "Teams", "Zoom", "Phone", "On-Site", "Other"] as const;

export type InterviewFormat = (typeof INTERVIEW_FORMATS)[number];

export interface InterviewContact {
  id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface InterviewLink {
  id: string;
  label: string;
  url: string;
  type?: "job-description" | "posting" | "interview" | "employer" | "other";
}

export interface Interview {
  id: string;
  company: string;
  position: string;
  pipeline: PipelineStep;
  stage?: string;
  status?: string;
  interviewDateTime?: string;
  interviewFormat?: InterviewFormat;
  roundLabel?: string;
  contactPerson?: string;
  contacts?: InterviewContact[];
  locationOrLink?: string;
  jobDescriptionLink?: string;
  links?: InterviewLink[];
  notes?: string;
  questions?: string;
  source?: "manual" | "drexel-import";
  drexelJobId?: string;
  jobLength?: string;
  createdAt: string;
  updatedAt: string;
}

export type InterviewDraft = Omit<Interview, "id" | "createdAt" | "updatedAt">;

export type MissingFieldKey =
  | "company"
  | "position"
  | "pipeline"
  | "interviewDateTime"
  | "interviewFormat"
  | "contacts"
  | "locationOrLink"
  | "jobDescriptionLink"
  | "questions";

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isDemo?: boolean;
}
