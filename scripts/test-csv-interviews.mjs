import assert from "node:assert/strict";
import { log } from "node:console";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const outdir = await mkdtemp(join(tmpdir(), "interview-csv-"));
const outfile = join(outdir, "csvInterviews.mjs");

try {
  await build({
    entryPoints: ["src/lib/csvInterviews.ts"],
    bundle: true,
    format: "esm",
    outfile,
    platform: "node",
    logLevel: "silent"
  });

  const { INTERVIEW_CSV_HEADERS, exportInterviewsToCsv, importInterviewsFromCsv } = await import(
    pathToFileURL(outfile).href
  );

  const csv = exportInterviewsToCsv([
    {
      id: "one",
      company: "Acme, Inc.",
      position: "Data \"Platform\" Co-op",
      pipeline: "Interview Scheduled",
      interviewDateTime: "2026-06-01T10:00",
      interviewFormat: "Teams",
      roundLabel: "First round",
      contactPerson: "Avery Recruiter",
      contacts: [
        {
          id: "contact",
          name: "Avery Recruiter",
          title: "Recruiter",
          email: "avery@example.com",
          phone: "555-555-5555",
          notes: "Main contact"
        }
      ],
      locationOrLink: "https://teams.example.com/meeting",
      jobDescriptionLink: "https://example.com/job",
      links: [{ id: "link", label: "Job description", url: "https://example.com/job", type: "job-description" }],
      notes: "Bring portfolio\nAsk about team",
      questions: "What does success look like?",
      source: "manual",
      drexelJobId: "",
      jobLength: "",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ]);

  assert.equal(csv.split("\n")[0], INTERVIEW_CSV_HEADERS.join(","));
  assert.match(csv, /"Acme, Inc\."/);
  assert.match(csv, /"Data ""Platform"" Co-op"/);

  const [draft] = importInterviewsFromCsv(csv);
  assert.equal(draft.company, "Acme, Inc.");
  assert.equal(draft.position, "Data \"Platform\" Co-op");
  assert.equal(draft.pipeline, "Interview Scheduled");
  assert.equal(draft.interviewFormat, "Teams");
  assert.equal(draft.contacts?.[0]?.email, "avery@example.com");
  assert.equal(draft.links?.[0]?.url, "https://example.com/job");
  assert.equal(draft.notes, "Bring portfolio\nAsk about team");
} finally {
  await rm(outdir, { recursive: true, force: true });
}

log("CSV interview tests passed.");
