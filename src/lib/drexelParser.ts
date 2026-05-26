import type {
  InterviewContact,
  InterviewDraft,
  InterviewFormat,
  InterviewLink,
  PipelineStep
} from "../types/interview";

interface RichTextSegment {
  text: string;
  href?: string | null;
}

interface RichLine {
  text: string;
  hrefs: string[];
}

interface DrexelHeader {
  position: string;
  drexelJobId: string;
  company: string;
  employerId: string;
}

const HEADER_RE = /^(.+?)\s+\((\d+)\)\s+¤\s+Employer:\s+(.+?)\s+\((\d+)\)\s*$/;
const FOOTER_RE =
  /^(First Page|Previous Page|Next Page|Last Page|Records \d+|Return$|to Job Search$|Transparent Image$|\[ Resume|Release:|© )/i;

const clean = (value = "") =>
  value.replace(/\u00a0/g, " ").replace(/\u202f/g, " ").replace(/\s+/g, " ").trim();

const normalizeText = (text: string) =>
  String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u202f]/g, " ");

const uniqueStrings = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseHeader = (line: string): DrexelHeader | null => {
  const match = clean(line).match(HEADER_RE);
  if (!match) return null;
  return {
    position: clean(match[1]),
    drexelJobId: match[2],
    company: clean(match[3]),
    employerId: match[4]
  };
};

const parseInputSegments = (content: string): RichTextSegment[] => {
  const trimmed = content.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("{\\rtf")) return parseRtfSegments(content);
  if (/<(?:a|table|tr|td|br|p|div|span)\b/i.test(content)) return parseHtmlSegments(content);
  return [{ text: content }];
};

const normalizeSegments = (segments: RichTextSegment[]): RichTextSegment[] =>
  segments
    .map((segment) => ({
      text: normalizeText(segment.text),
      href: cleanUrl(segment.href ?? null)
    }))
    .filter((segment) => segment.text);

const splitSegmentsIntoLines = (segments: RichTextSegment[]): RichLine[] => {
  const lines: RichLine[] = [{ text: "", hrefs: [] }];

  segments.forEach((segment) => {
    const parts = segment.text.split("\n");
    parts.forEach((part, index) => {
      if (index > 0) lines.push({ text: "", hrefs: [] });
      const current = lines[lines.length - 1];
      current.text += part;
      if (part.trim() && segment.href && !current.hrefs.includes(segment.href)) {
        current.hrefs.push(segment.href);
      }
    });
  });

  return lines;
};

const rebuildWrappedTitleHeader = (output: RichLine[], current: RichLine): RichLine => {
  const titleLines: RichLine[] = [];
  let firstTitleIndex = output.length;
  let blankCountAfterTitle = 0;

  for (let index = output.length - 1; index >= 0; index -= 1) {
    if (output[index].text.trim()) {
      titleLines.unshift(output[index]);
      firstTitleIndex = index;
      blankCountAfterTitle = 0;
      continue;
    }

    if (titleLines.length > 0) {
      blankCountAfterTitle += 1;
      if (blankCountAfterTitle >= 2) break;
    }
  }

  if (!titleLines.length) return current;
  output.splice(firstTitleIndex);
  return {
    text: `${titleLines.map((line) => line.text.trim()).join(" ")} ${current.text.trim()}`,
    hrefs: uniqueStrings([...titleLines.flatMap((line) => line.hrefs), ...current.hrefs])
  };
};

const coalesceDrexelLines = (lines: RichLine[]): RichLine[] => {
  const output: RichLine[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index];
    const next = lines[index + 1];
    const splitHeaderEnd =
      /^\(\d+\)$/.test(current.text.trim()) && /^¤\s*$/.test(next?.text.trim() ?? "")
        ? {
            text: `${current.text.trim()} ${next.text.trim()}`,
            hrefs: uniqueStrings([...current.hrefs, ...next.hrefs])
          }
        : null;
    const candidateInput = splitHeaderEnd ?? current;
    const candidate = /^\(\d+\)\s*¤\s*$/.test(candidateInput.text.trim())
      ? rebuildWrappedTitleHeader(output, candidateInput)
      : candidateInput;

    if (/^.+\(\d+\)$/.test(candidate.text.trim())) {
      let employerIndex = index + 1;
      while (employerIndex < lines.length && !lines[employerIndex].text.trim()) {
        employerIndex += 1;
      }
      const employerText = lines[employerIndex]?.text.trim() ?? "";
      if (/^(?:¤\s*)?Employer:\s*.+\(\d+\)$/.test(employerText)) {
        output.push({
          text: `${candidate.text.trim()} ${employerText.startsWith("¤") ? employerText : `¤ ${employerText}`}`,
          hrefs: uniqueStrings([...candidate.hrefs, ...lines[employerIndex].hrefs])
        });
        index = employerIndex;
        continue;
      }
    }

    if (/\(\d+\)\s*¤\s*$/.test(candidate.text.trim())) {
      let employerLabelIndex = index + (splitHeaderEnd ? 2 : 1);
      while (employerLabelIndex < lines.length && !lines[employerLabelIndex].text.trim()) {
        employerLabelIndex += 1;
      }

      let employerValueIndex = employerLabelIndex + 1;
      while (employerValueIndex < lines.length && !lines[employerValueIndex].text.trim()) {
        employerValueIndex += 1;
      }

      const employerLabel = lines[employerLabelIndex]?.text.trim() ?? "";
      const employerValue = lines[employerValueIndex]?.text.trim() ?? "";
      if (/^Employer:\s*$/i.test(employerLabel) && /^.+\(\d+\)$/.test(employerValue)) {
        output.push({
          text: `${candidate.text.trim()} Employer: ${employerValue}`,
          hrefs: uniqueStrings([
            ...candidate.hrefs,
            ...lines[employerLabelIndex].hrefs,
            ...lines[employerValueIndex].hrefs
          ])
        });
        index = employerValueIndex;
        continue;
      }
    }

    output.push(current);
  }

  return output;
};

const stripFooter = (lines: RichLine[]) => {
  const footerIndex = lines.findIndex((line, index) => index > 0 && FOOTER_RE.test(line.text.trim()));
  return footerIndex === -1 ? lines : lines.slice(0, footerIndex);
};

const findLabelValue = (lines: string[], label: string) => {
  const labelRe = new RegExp(`(?:^|¤\\s*)${escapeRegExp(label)}:\\s*(.*)$`, "i");

  for (let index = 0; index < lines.length; index += 1) {
    const match = clean(lines[index]).match(labelRe);
    if (!match) continue;

    const inline = clean(match[1]).split(/\s+¤\s+/)[0];
    if (inline) return inline;

    for (let valueIndex = index + 1; valueIndex < lines.length; valueIndex += 1) {
      const value = clean(lines[valueIndex]);
      if (!value) continue;
      if (/^[A-Z][A-Za-z /()-]+:\s*/.test(value)) return "";
      return value;
    }
  }

  return "";
};

const detectPipeline = (recordText: string, interviewType: string): PipelineStep => {
  const text = `${recordText} ${interviewType}`.toLowerCase();
  if (/employer\s+(will\s+)?contact|contact\s+student|will be contacted/.test(text)) {
    return "Waiting for Employer to Contact Student";
  }
  if (/student\s+(must\s+|should\s+|will\s+)?contact|contact\s+the?\s*employer|employer site|click\s+the\s+job\s+title/.test(text)) {
    return "Student Needs to Contact Employer";
  }
  if (/steinbright|interview schedule|arrange|make changes|signup/.test(text)) return "Scheduling in Progress";
  return "Student Needs to Contact Employer";
};

const detectFormat = (recordText: string): InterviewFormat => {
  const text = recordText.toLowerCase();
  if (/teams|microsoft\s+teams/.test(text)) return "Teams";
  if (/zoom/.test(text)) return "Zoom";
  if (/phone|call/.test(text)) return "Phone";
  if (/employer site|in[-\s]?person|on[-\s]?site|office|campus|physical|address/.test(text)) {
    return "On-Site";
  }
  if (/webex|virtual|online|video|hybrid/.test(text)) return "Other";
  return "Not set";
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
    const email = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
    const phone = line.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/)?.[0] ?? "";
    const name = line.match(/(?:Contact|Recruiter|Interviewer)(?: Person| Name)?:\s*(.*)$/i)?.[1] ?? "";

    if (email) contact.email = email;
    if (phone) contact.phone = phone;
    if (name) contact.name = clean(name.replace(email, "").replace(phone, ""));
  });

  return contact.name || contact.email || contact.phone ? [contact] : [];
};

const classifyLink = (url: string, context = ""): InterviewLink["type"] => {
  const text = `${url} ${context}`.toLowerCase();
  if (/p_studentjobdisplay|i_job_num|job|posting|display/.test(text)) return "job-description";
  if (/interview|schedule|signup|hwczksrmi/.test(text)) return "interview";
  if (/employer|company/.test(text)) return "employer";
  return "other";
};

const findDetailUrl = (hrefs: string[], jobId: string) => {
  const urls = hrefs.map(cleanUrl).filter((href): href is string => Boolean(href && /^https?:\/\//i.test(href)));
  return (
    urls.find((href) => new RegExp(`[?&]i_job_num=${escapeRegExp(jobId)}(?:&|$)`, "i").test(href)) ??
    urls.find((href) => /P_StudentJobDisplay/i.test(href)) ??
    null
  );
};

const isUsefulBlockLink = (url: string, context: string, jobId: string) => {
  if (!/^https?:\/\//i.test(url)) return false;
  if (/p_logout|twbhhelp|p_genmenu|p_displayfinresponsibility|joinhandshake|resume|studentjobsearch|agreement|archive/i.test(url)) {
    return false;
  }
  if (new RegExp(`[?&]i_job_num=${escapeRegExp(jobId)}(?:&|$)`, "i").test(url)) return true;
  if (/P_StudentJobDisplay/i.test(url)) return true;
  if (/hwczksrmi|interview|schedule|signup/i.test(url) || /interview schedule/i.test(context)) return true;
  return false;
};

const buildLinks = (headerLine: RichLine, blockLines: RichLine[], header: DrexelHeader): InterviewLink[] => {
  const links: InterviewLink[] = [];
  const seen = new Set<string>();
  const addLink = (url: string, label: string, type: InterviewLink["type"]) => {
    const cleanedUrl = cleanUrl(url);
    if (!cleanedUrl || seen.has(cleanedUrl.toLowerCase())) return;
    seen.add(cleanedUrl.toLowerCase());
    links.push({
      id: crypto.randomUUID(),
      label,
      url: cleanedUrl,
      type
    });
  };

  const detailUrl = findDetailUrl(headerLine.hrefs, header.drexelJobId);
  if (detailUrl) addLink(detailUrl, "Job description", "job-description");

  blockLines.forEach((line) => {
    line.hrefs.forEach((href) => {
      if (!isUsefulBlockLink(href, line.text, header.drexelJobId)) return;
      const type = classifyLink(href, line.text);
      addLink(
        href,
        type === "job-description"
          ? "Job description"
          : type === "interview"
            ? "Interview schedule"
            : "Imported link",
        type
      );
    });
  });

  return links;
};

const parseDrexelLines = (richLines: RichLine[]): InterviewDraft[] => {
  const coalesced = coalesceDrexelLines(richLines);
  const headerIndexes: number[] = [];

  coalesced.forEach((line, index) => {
    if (parseHeader(line.text)) headerIndexes.push(index);
  });

  return headerIndexes.flatMap((start, recordIndex) => {
    const header = parseHeader(coalesced[start].text);
    if (!header) return [];

    const end = recordIndex + 1 < headerIndexes.length ? headerIndexes[recordIndex + 1] : coalesced.length;
    const blockLines = stripFooter(coalesced.slice(start, end));
    const bodyTextLines = blockLines.slice(1).map((line) => clean(line.text)).filter(Boolean);
    const recordText = bodyTextLines.join("\n");
    const interviewType = findLabelValue(bodyTextLines, "Interview");
    const jobLength = findLabelValue(bodyTextLines, "Job Length");
    const locationOrLink = findLabelValue(bodyTextLines, "General Job Location");
    const links = buildLinks(coalesced[start], blockLines, header);
    const jobDescriptionLink = links.find((link) => link.type === "job-description" || link.type === "posting")?.url ?? "";
    const formatSource = [
      recordText,
      interviewType,
      locationOrLink,
      links.map((link) => `${link.label} ${link.url}`).join("\n")
    ].join("\n");

    return [
      {
        company: header.company,
        position: header.position,
        drexelJobId: header.drexelJobId,
        pipeline: detectPipeline(recordText, interviewType),
        locationOrLink,
        jobDescriptionLink,
        links,
        interviewFormat: detectFormat(formatSource),
        roundLabel: "",
        notes: "",
        questions: "",
        contactPerson: "",
        contacts: parseContacts(bodyTextLines),
        interviewDateTime: "",
        source: "drexel-import",
        jobLength: interviewType ? [jobLength, interviewType].filter(Boolean).join(" | ") : jobLength
      }
    ];
  });
};

// Drexel copy/paste data can arrive as HTML, RTF, or plain text. The important
// invariant is that record boundaries are detected before links are assigned.
export const parseDrexelInterviewText = (content: string): InterviewDraft[] => {
  const segments = normalizeSegments(parseInputSegments(content));
  if (!segments.length) return [];
  return parseDrexelLines(splitSegmentsIntoLines(segments));
};

const cleanUrl = (url: string | null) => {
  const cleaned = String(url ?? "").trim();
  return cleaned || null;
};

const parseHtmlSegments = (html: string): RichTextSegment[] => {
  const segments: RichTextSegment[] = [];
  const anchorRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = anchorRe.exec(html))) {
    if (match.index > lastIndex) segments.push({ text: htmlToText(html.slice(lastIndex, match.index)) });
    segments.push({ text: htmlToText(match[2]), href: extractHref(match[1]) });
    lastIndex = anchorRe.lastIndex;
  }

  if (lastIndex < html.length) segments.push({ text: htmlToText(html.slice(lastIndex)) });
  return segments.filter((segment) => segment.text);
};

const extractHref = (attributes: string) => {
  const match = attributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  return decodeHtmlEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
};

const htmlToText = (html: string) =>
  decodeHtmlEntities(
    html
      .replace(/<(br|\/p|\/div|\/tr|\/li)\b[^>]*>/gi, "\n")
      .replace(/<\s*(p|div|tr|li|table|tbody|thead|section|article)\b[^>]*>/gi, "\n")
      .replace(/<t[dh]\b[^>]*>/gi, "")
      .replace(/<\/t[dh]>/gi, " ")
      .replace(/<[^>]+>/g, "")
  );

const decodeHtmlEntities = (value: string) => {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
    curren: "¤"
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_entity, body: string) => {
    const lower = body.toLowerCase();
    if (lower[0] === "#") {
      const code =
        lower[1] === "x" ? Number.parseInt(lower.slice(2), 16) : Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }
    return named[lower] ?? "";
  });
};

const parseRtfSegments = (rtf: string): RichTextSegment[] => {
  const segments: RichTextSegment[] = [];
  let index = 0;

  while (index < rtf.length) {
    const fieldStart = rtf.indexOf("{\\field", index);
    if (fieldStart === -1) {
      segments.push({ text: rtfToText(rtf.slice(index)) });
      break;
    }

    if (fieldStart > index) segments.push({ text: rtfToText(rtf.slice(index, fieldStart)) });
    const fieldEnd = findBalancedGroupEnd(rtf, fieldStart);
    if (fieldEnd === -1) {
      segments.push({ text: rtfToText(rtf.slice(fieldStart)) });
      break;
    }

    const field = rtf.slice(fieldStart, fieldEnd + 1);
    const url = field.match(/HYPERLINK\s+"([^"]+)"/)?.[1] ?? null;
    const result = extractRtfFieldResult(field);
    segments.push({ text: rtfToText(result || field), href: url });
    index = fieldEnd + 1;
  }

  return segments.filter((segment) => segment.text);
};

const extractRtfFieldResult = (field: string) => {
  const marker = field.indexOf("{\\fldrslt");
  if (marker === -1) return "";
  const end = findBalancedGroupEnd(field, marker);
  return end === -1 ? field.slice(marker) : field.slice(marker, end + 1);
};

const findBalancedGroupEnd = (text: string, start: number) => {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === "\\" && index + 1 < text.length) {
      index += 1;
      continue;
    }
    if (text[index] === "{") depth += 1;
    if (text[index] === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
};

const rtfToText = (rtf: string) => {
  let output = "";
  const stack: Array<{ skip: boolean }> = [{ skip: false }];
  let unicodeSkip = 1;

  for (let index = 0; index < rtf.length; index += 1) {
    const char = rtf[index];
    const current = stack[stack.length - 1];
    if (char === "{") {
      stack.push({ skip: current.skip });
      continue;
    }
    if (char === "}") {
      if (stack.length > 1) stack.pop();
      continue;
    }
    if (char !== "\\") {
      if (!current.skip) output += char;
      continue;
    }

    const next = rtf[index + 1];
    if (next === "'") {
      const hex = rtf.slice(index + 2, index + 4);
      if (!current.skip && /^[0-9a-f]{2}$/i.test(hex)) output += decodeRtfHex(hex);
      index += 3;
      continue;
    }
    if (next === "\\") {
      if (!current.skip) output += "\\";
      index += 1;
      continue;
    }
    if (next === "{") {
      if (!current.skip) output += "{";
      index += 1;
      continue;
    }
    if (next === "}") {
      if (!current.skip) output += "}";
      index += 1;
      continue;
    }
    if (next === "*") {
      stack[stack.length - 1].skip = true;
      index += 1;
      continue;
    }

    const control = rtf.slice(index + 1).match(/^([a-zA-Z]+)(-?\d+)? ?/);
    if (!control) {
      if (!current.skip && next === "~") output += " ";
      index += 1;
      continue;
    }

    const word = control[1];
    const arg = control[2] ? Number.parseInt(control[2], 10) : null;
    index += control[0].length;
    if (current.skip) continue;

    if (word === "uc" && arg !== null) unicodeSkip = arg;
    else if (word === "u" && arg !== null) {
      const code = arg < 0 ? arg + 65536 : arg;
      output += String.fromCharCode(code);
      index += unicodeSkip;
    } else if (["par", "line", "row", "cell"].includes(word)) output += "\n";
    else if (word === "tab") output += "\t";
  }

  return output.replace(/\r\n?/g, "\n");
};

const decodeRtfHex = (hex: string) => {
  const value = Number.parseInt(hex, 16);
  const cp1252: Record<number, string> = {
    0x80: "€",
    0x82: "‚",
    0x83: "ƒ",
    0x84: "„",
    0x85: "…",
    0x86: "†",
    0x87: "‡",
    0x88: "ˆ",
    0x89: "‰",
    0x8a: "Š",
    0x8b: "‹",
    0x8c: "Œ",
    0x8e: "Ž",
    0x91: "'",
    0x92: "'",
    0x93: "\"",
    0x94: "\"",
    0x95: "•",
    0x96: "-",
    0x97: "-",
    0x98: "˜",
    0x99: "™",
    0x9a: "š",
    0x9b: "›",
    0x9c: "œ",
    0x9e: "ž",
    0x9f: "Ÿ"
  };
  return cp1252[value] ?? String.fromCharCode(value);
};
