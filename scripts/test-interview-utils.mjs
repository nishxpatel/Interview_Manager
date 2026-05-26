import assert from "node:assert/strict";
import { log } from "node:console";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const outdir = await mkdtemp(join(tmpdir(), "interview-utils-"));
const outfile = join(outdir, "interviewUtils.mjs");

try {
  await build({
    entryPoints: ["src/lib/interviewUtils.ts"],
    bundle: true,
    format: "esm",
    outfile,
    platform: "node",
    logLevel: "silent"
  });

  const { interviewToDraft, normalizeInterview, prepareDraftForSave } = await import(
    pathToFileURL(outfile).href
  );

  const normalized = normalizeInterview({
    id: "legacy",
    company: "Legacy Co",
    position: "Developer Co-op",
    stage: "Phone screen",
    status: "Date/time finalized",
    followUpReminder: "2026-06-02",
    followUpReminderDate: "2026-06-03",
    reminder: "Thank-you note",
    pipeline: undefined,
    interviewDateTime: "2026-06-01T10:00",
    notes: "Imported from Drexel. Drexel interview status: Accepted. Drexel location: Campus.",
    source: "drexel-import",
    contacts: [{ id: "contact", name: "A", title: undefined }],
    links: [{ id: "link", label: "Posting", url: "https://example.com", type: undefined }],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });

  assert.equal(normalized.pipeline, "Interview Scheduled");
  assert.equal(normalized.interviewFormat, "Not set");
  assert.equal(normalized.notes, "");
  assert.equal("stage" in normalized, false);
  assert.equal("status" in normalized, false);
  assert.equal("followUpReminder" in normalized, false);
  assert.equal("followUpReminderDate" in normalized, false);
  assert.equal("reminder" in normalized, false);

  const draft = interviewToDraft(normalized);
  assert.equal("stage" in draft, false);
  assert.equal("status" in draft, false);
  assert.equal("followUpReminder" in draft, false);
  assert.equal("followUpReminderDate" in draft, false);
  assert.equal("reminder" in draft, false);

  const saveDraft = prepareDraftForSave({
    ...draft,
    stage: undefined,
    status: undefined,
    followUpReminder: undefined,
    followUpReminderDate: undefined,
    reminder: undefined
  });
  assert.equal(saveDraft.pipeline, "Interview Scheduled");
  assert.equal("stage" in saveDraft, false);
  assert.equal("status" in saveDraft, false);
  assert.equal("followUpReminder" in saveDraft, false);
  assert.equal("followUpReminderDate" in saveDraft, false);
  assert.equal("reminder" in saveDraft, false);

  const oldRoundWithoutDate = normalizeInterview({
    id: "old-round",
    company: "Legacy Co",
    position: "Developer Co-op",
    pipeline: "Additional Interview Round Scheduled",
    interviewFormat: "In-person",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });
  assert.equal(oldRoundWithoutDate.pipeline, "Waiting for Employer Response");
  assert.equal(oldRoundWithoutDate.interviewFormat, "On-Site");

  const oldScreeningWithDate = normalizeInterview({
    id: "old-screen",
    company: "Legacy Co",
    position: "Developer Co-op",
    pipeline: "Screening Round Scheduled",
    interviewDateTime: "2026-06-01T10:00",
    interviewFormat: "Virtual",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });
  assert.equal(oldScreeningWithDate.pipeline, "Interview Scheduled");
  assert.equal(oldScreeningWithDate.interviewFormat, "Other");
} finally {
  await rm(outdir, { recursive: true, force: true });
}

log("Interview normalization tests passed.");
