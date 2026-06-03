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
  assert.equal(normalized.thankYouEmailSent, false);
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
  assert.equal(oldRoundWithoutDate.pipeline, "Waiting for Employer Reply");
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

  const oldStudentContact = normalizeInterview({
    id: "old-student-contact",
    company: "Legacy Co",
    position: "Developer Co-op",
    pipeline: "Student Needs to Contact Employer",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });
  assert.equal(oldStudentContact.pipeline, "Make Contact");

  const oldScheduling = normalizeInterview({
    id: "old-scheduling",
    company: "Legacy Co",
    position: "Developer Co-op",
    pipeline: "Scheduling in Progress",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });
  assert.equal(oldScheduling.pipeline, "Waiting for Employer Reply");

  const nonCompletedWithThankYou = normalizeInterview({
    id: "non-completed-thank-you",
    company: "Legacy Co",
    position: "Developer Co-op",
    pipeline: "Interview Scheduled",
    thankYouEmailSent: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });
  assert.equal(nonCompletedWithThankYou.thankYouEmailSent, false);

  const legacyFollowUp = normalizeInterview({
    id: "legacy-follow-up",
    company: "Legacy Co",
    position: "Developer Co-op",
    pipeline: "Follow-Up Sent / Done",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });
  assert.equal(legacyFollowUp.pipeline, "Interview Completed");
  assert.equal(legacyFollowUp.thankYouEmailSent, true);

  const malformed = normalizeInterview({
    id: "malformed",
    company: undefined,
    position: null,
    pipeline: "Interview Scheduled",
    status: { value: "Date/time finalized" },
    stage: ["Phone screen"],
    interviewFormat: 123,
    contactPerson: 456,
    contacts: "not-an-array",
    locationOrLink: null,
    jobDescriptionLink: undefined,
    links: [
      null,
      "not-a-link",
      { id: 123, label: null, url: " https://example.com/malformed-job " }
    ],
    notes: { source: "legacy" },
    questions: undefined,
    drexelJobId: 789,
    jobLength: null,
    createdAt: undefined,
    updatedAt: null
  });

  assert.equal(malformed.company, "");
  assert.equal(malformed.position, "");
  assert.equal(malformed.contactPerson, "456");
  assert.equal(malformed.contacts.length, 1);
  assert.equal(malformed.contacts[0].name, "456");
  assert.equal(malformed.links.length, 1);
  assert.equal(malformed.links[0].id, "123");
  assert.equal(malformed.links[0].url, "https://example.com/malformed-job");
  assert.equal(malformed.notes, "[object Object]");
  assert.equal(malformed.drexelJobId, "789");
  assert.equal(malformed.jobLength, "");

  const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      getRandomValues(values) {
        for (let index = 0; index < values.length; index += 1) values[index] = index;
        return values;
      }
    }
  });

  try {
    const fallbackIds = normalizeInterview({
      id: "fallback-id",
      company: "Legacy Co",
      position: "Developer Co-op",
      pipeline: "Make Contact",
      contactPerson: "Recruiter Name",
      jobDescriptionLink: "https://example.com/job",
      contacts: [{ email: "recruiter@example.com" }],
      links: [{ label: "Posting" }],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });

    assert.match(
      fallbackIds.contacts[0].id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    assert.equal(fallbackIds.contacts[0].name, "");
    assert.equal(fallbackIds.links[0].url, "https://example.com/job");
    assert.match(
      fallbackIds.links[0].id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  } finally {
    if (originalCryptoDescriptor) {
      Object.defineProperty(globalThis, "crypto", originalCryptoDescriptor);
    }
  }
} finally {
  await rm(outdir, { recursive: true, force: true });
}

log("Interview normalization tests passed.");
