import assert from "node:assert/strict";
import { log } from "node:console";

const { sanitizeForFirestore } = await import("../src/lib/firestoreSanitizer.ts");

const sanitized = sanitizeForFirestore({
  stage: undefined,
  status: undefined,
  followUpReminder: undefined,
  followUpReminderDate: undefined,
  reminder: undefined,
  company: "Acme",
  contacts: [
    { id: "1", name: "Recruiter", title: undefined, email: "recruiter@example.com" },
    undefined
  ],
  links: [{ id: "link-1", label: undefined, url: "https://example.com" }],
  notes: undefined,
  metadata: { preserved: true, missing: undefined }
});

assert.deepEqual(sanitized, {
  company: "Acme",
  contacts: [{ id: "1", name: "Recruiter", email: "recruiter@example.com" }],
  links: [{ id: "link-1", url: "https://example.com" }],
  metadata: { preserved: true }
});

assert.equal(JSON.stringify(sanitized).includes("undefined"), false);

log("Firestore sanitizer tests passed.");
