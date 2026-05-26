import type { Interview, InterviewDraft, InterviewLink } from "../types/interview";
import { interviewToDraft, normalizeInterview } from "./interviewUtils";

export const INTERVIEW_CSV_HEADERS = [
  "company",
  "position",
  "pipeline",
  "interviewDateTime",
  "interviewFormat",
  "roundLabel",
  "contactPerson",
  "contacts",
  "locationOrLink",
  "jobDescriptionLink",
  "links",
  "notes",
  "questions",
  "source",
  "drexelJobId",
  "jobLength"
] as const;

type CsvHeader = (typeof INTERVIEW_CSV_HEADERS)[number];

const csvEscape = (value: unknown) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
};

const parseJsonArray = <T>(value: string, fallback: T[]): T[] => {
  if (!value.trim()) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const parseCsvRows = (csv: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        field += "\"";
        index += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((current) => current.some((value) => value.trim()));
};

export const exportInterviewsToCsv = (interviews: Interview[]) => {
  const rows = interviews.map((interview) => {
    const normalized = normalizeInterview(interview);
    const draft = interviewToDraft(normalized);
    const row: Record<CsvHeader, string> = {
      company: draft.company,
      position: draft.position,
      pipeline: draft.pipeline,
      interviewDateTime: draft.interviewDateTime ?? "",
      interviewFormat: draft.interviewFormat ?? "Not set",
      roundLabel: draft.roundLabel ?? "",
      contactPerson: draft.contactPerson ?? "",
      contacts: JSON.stringify(draft.contacts ?? []),
      locationOrLink: draft.locationOrLink ?? "",
      jobDescriptionLink: draft.jobDescriptionLink ?? "",
      links: JSON.stringify(draft.links ?? []),
      notes: draft.notes ?? "",
      questions: draft.questions ?? "",
      source: draft.source ?? "manual",
      drexelJobId: draft.drexelJobId ?? "",
      jobLength: draft.jobLength ?? ""
    };
    return INTERVIEW_CSV_HEADERS.map((header) => csvEscape(row[header])).join(",");
  });

  return `${INTERVIEW_CSV_HEADERS.join(",")}\n${rows.join("\n")}\n`;
};

export const importInterviewsFromCsv = (csv: string): InterviewDraft[] => {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim()
  );
  const missingHeaders = INTERVIEW_CSV_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length) {
    throw new Error(`CSV is missing required column${missingHeaders.length === 1 ? "" : "s"}: ${missingHeaders.join(", ")}`);
  }

  return rows.slice(1).map((row) => {
    const values = new Map(headers.map((header, index) => [header, row[index] ?? ""]));
    const links = parseJsonArray<InterviewLink>(values.get("links") ?? "", []);
    const jobDescriptionLink =
      values.get("jobDescriptionLink")?.trim() ||
      links.find((link) => link.type === "job-description" || link.type === "posting")?.url ||
      "";

    return {
      company: values.get("company") ?? "",
      position: values.get("position") ?? "",
      pipeline: (values.get("pipeline") || "Student Needs to Contact Employer") as InterviewDraft["pipeline"],
      interviewDateTime: values.get("interviewDateTime") ?? "",
      interviewFormat: (values.get("interviewFormat") || "Not set") as InterviewDraft["interviewFormat"],
      roundLabel: values.get("roundLabel") ?? "",
      contactPerson: values.get("contactPerson") ?? "",
      contacts: parseJsonArray(values.get("contacts") ?? "", []),
      locationOrLink: values.get("locationOrLink") ?? "",
      jobDescriptionLink,
      links,
      notes: values.get("notes") ?? "",
      questions: values.get("questions") ?? "",
      source: ((values.get("source") || "manual") as InterviewDraft["source"]) ?? "manual",
      drexelJobId: values.get("drexelJobId") ?? "",
      jobLength: values.get("jobLength") ?? ""
    };
  });
};
