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
    pipeline: undefined,
    interviewDateTime: "2026-06-01T10:00",
    contacts: [{ id: "contact", name: "A", title: undefined }],
    links: [{ id: "link", label: "Posting", url: "https://example.com", type: undefined }],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });

  assert.equal(normalized.pipeline, "Interview Scheduled");
  assert.equal("stage" in normalized, false);
  assert.equal("status" in normalized, false);

  const draft = interviewToDraft(normalized);
  assert.equal("stage" in draft, false);
  assert.equal("status" in draft, false);

  const saveDraft = prepareDraftForSave({ ...draft, stage: undefined, status: undefined });
  assert.equal(saveDraft.pipeline, "Interview Scheduled");
  assert.equal("stage" in saveDraft, false);
  assert.equal("status" in saveDraft, false);
} finally {
  await rm(outdir, { recursive: true, force: true });
}

log("Interview normalization tests passed.");
