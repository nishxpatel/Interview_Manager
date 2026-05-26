import type {
  InterviewContact,
  InterviewDraft,
  InterviewFormat,
  InterviewLink,
  PipelineStep
} from "../types/interview";

const clean = (value = "") =>
  value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

const decodePotentialRtf = (content: string) => {
  if (!content.trim().startsWith("{\\rtf")) return content;

  return content
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    )
    .replace(/\\(?:par|line|cell|row)\b[^\\]*/g, "\n")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/\\[*][a-zA-Z]+ ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\\\n/g, "\n")
    .replace(/\\/g, "");
};

const decodePotentialHtml = (content: string) => {
  if (!/<(?:a|table|tr|td|br|p|div|span)\b/i.test(content)) return content;

  return content
    .replace(
      /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_, href: string, label: string) =>
        `\n${href}\n${label.replace(/<[^>]+>/g, " ")}\n`
    )
    .replace(/<(?:br|\/p|\/div|\/tr|\/li|\/td)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
};

const parseHeader = (line: string) => {
  const normalized = clean(line);
  const parts = normalized.split(/\s+¤\s+Employer:\s+/i);
  if (parts.length < 2) return null;

  const jobMatch = parts[0].match(/^(.*?)\s+\((\d+)\)$/);
  const employerMatch = parts[1].match(/^(.*?)\s+\((\d+)\)$/);

  return {
    position: clean(jobMatch?.[1] ?? parts[0]),
    drexelJobId: jobMatch?.[2],
    company: clean(employerMatch?.[1] ?? parts[1])
  };
};

const extractUrls = (text: string) =>
  Array.from(
    text.matchAll(/https?:\/\/[^\s")]+/g),
    (match) => match[0].replace(/[>\]]$/, "")
  );

const classifyLink = (url: string, context = ""): InterviewLink["type"] => {
  const text = `${url} ${context}`.toLowerCase();
  if (/job|posting|display|i_job_num/.test(text)) return "job-description";
  if (/interview|schedule|signup|maint/.test(text)) return "interview";
  if (/employer|company/.test(text)) return "employer";
  return "other";
};

const extractLinks = (lines: string[]): InterviewLink[] => {
  const links: InterviewLink[] = [];
  const seen = new Set<string>();

  lines.forEach((line, index) => {
    extractUrls(line).forEach((url) => {
      const cleanUrl = url.trim();
      if (seen.has(cleanUrl.toLowerCase())) return;
      seen.add(cleanUrl.toLowerCase());
      const nextLine = lines[index + 1] ?? "";
      const type = classifyLink(cleanUrl, `${line} ${nextLine}`);
      links.push({
        id: crypto.randomUUID(),
        label:
          type === "job-description"
            ? "Job description"
            : type === "interview"
              ? "Interview request"
              : clean(nextLine).replace(/[^\w\s./:-]/g, "") || "Imported link",
        url: cleanUrl,
        type
      });
    });
  });

  return links;
};

const detectPipeline = (recordText: string, interviewType: string): PipelineStep => {
  const text = `${recordText} ${interviewType}`.toLowerCase();
  if (/employer\s+(will\s+)?contact/.test(text) || /contact\s+student/.test(text)) {
    return "Waiting for Employer to Contact Student";
  }
  if (/student\s+(must\s+|should\s+|will\s+)?contact/.test(text) || /contact\s+employer/.test(text)) {
    return "Student Needs to Contact Employer";
  }
  if (/employer site/.test(text) || /click\s+the\s+job\s+title/.test(text)) {
    return "Student Needs to Contact Employer";
  }
  if (/interview schedule|arrange|make changes/.test(text)) return "Scheduling in Progress";
  return "Student Needs to Contact Employer";
};

const detectFormat = (recordText: string): InterviewFormat => {
  const text = recordText.toLowerCase();
  if (/hybrid/.test(text)) return "Hybrid";
  if (/zoom|teams|webex|virtual|online|video/.test(text)) return "Virtual";
  if (/phone|call/.test(text)) return "Phone";
  if (/in[-\s]?person|on[-\s]?site|office|campus/.test(text)) return "In-person";
  return "Unknown";
};

const parseContacts = (lines: string[]): InterviewContact[] => {
  const contact: InterviewContact = {
    id: crypto.randomUUID(),
    name: "",
    title: "",
    email: "",
    phone: "",
    notes: ""
  };

  lines.forEach((line) => {
    const email = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const phone = line.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/)?.[0];
    const name = line.match(/(?:Contact|Recruiter|Interviewer)(?: Person| Name)?:\s*(.*)$/i)?.[1];

    if (email) contact.email = email;
    if (phone) contact.phone = phone;
    if (name) contact.name = clean(name.replace(email ?? "", "").replace(phone ?? "", ""));
  });

  return contact.name || contact.email || contact.phone ? [contact] : [];
};

// The Drexel page is copy/paste HTML rendered as plain text. This parser keeps the
// assumptions narrow: each job begins with a title/id + Employer line, followed by
// optional Job Length, General Job Location, Interview type, and Interview status.
export const parseDrexelInterviewText = (content: string): InterviewDraft[] => {
  const normalizedContent = decodePotentialHtml(decodePotentialRtf(content))
    .replace(/\s+¤\s+Employer:\s+/g, " ¤ Employer: ")
    .replace(/Job Length:\s+/g, "Job Length: ")
    .replace(/\s+¤\s+General Job Location:\s+/g, " ¤ General Job Location: ")
    .replace(/Interview status:\s+/g, "Interview status: ");

  const lines = normalizedContent
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);

  const results: InterviewDraft[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const header = parseHeader(lines[index]);
    if (!header) continue;

    let jobLength = "";
    let locationOrLink = "";
    let interviewType = "";
    let rawStatus = "";
    const recordLines: string[] = [];

    for (let lookahead = index + 1; lookahead < lines.length; lookahead += 1) {
      const line = lines[lookahead];
      if (parseHeader(line)) break;
      if (extractUrls(line).length && parseHeader(lines[lookahead + 1] ?? "")) break;
      recordLines.push(line);

      const jobLengthMatch = line.match(/Job Length:\s*(.*?)\s+¤/i);
      const locationMatch = line.match(/General Job Location:\s*(.*)$/i);
      const statusMatch = line.match(/Interview status:\s*(.*)$/i);

      if (jobLengthMatch) jobLength = clean(jobLengthMatch[1]);
      if (locationMatch) locationOrLink = clean(locationMatch[1]);
      if (/^Employer Site$/i.test(line) || /^Steinbright/i.test(line)) interviewType = line;
      if (statusMatch) rawStatus = clean(statusMatch[1]);
    }

    const priorLines = lines.slice(Math.max(0, index - 4), index);
    const recordText = recordLines.join("\n");
    const links = extractLinks([...priorLines, ...recordLines]);
    const jobDescriptionLink =
      links.find((link) => link.type === "job-description" || link.type === "posting")?.url ?? "";
    const pipeline = detectPipeline(recordText, interviewType);

    results.push({
      company: header.company,
      position: header.position,
      drexelJobId: header.drexelJobId,
      pipeline,
      locationOrLink,
      jobDescriptionLink,
      links,
      interviewFormat: detectFormat(recordText),
      roundLabel: "",
      notes: rawStatus
        ? `Imported from Drexel. Drexel interview status: ${rawStatus}.`
        : "Imported from Drexel.",
      questions: "",
      followUpReminder: "",
      contactPerson: "",
      contacts: parseContacts(recordLines),
      interviewDateTime: "",
      source: "drexel-import",
      jobLength: interviewType ? `${jobLength} | ${interviewType}` : jobLength
    });
  }

  return results;
};
