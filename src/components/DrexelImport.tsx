import { ChangeEvent, ClipboardEvent, useMemo, useState } from "react";
import { ExternalLink, FileText, Upload, X } from "lucide-react";
import { parseDrexelInterviewText } from "../lib/drexelParser";
import { getMissingFields, missingFieldLabels } from "../lib/interviewUtils";
import type { Interview, InterviewDraft, PipelineStep } from "../types/interview";

interface DrexelImportProps {
  onCancel: () => void;
  onImport: (drafts: InterviewDraft[]) => Promise<void>;
}

export function DrexelImport({ onCancel, onImport }: DrexelImportProps) {
  const [content, setContent] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [pasteNotice, setPasteNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const parsed = useMemo(
    () => parseDrexelInterviewText(htmlContent || content),
    [content, htmlContent]
  );

  const previewMissingFields = (draft: InterviewDraft) =>
    getMissingFields({
      ...draft,
      id: "preview",
      createdAt: "",
      updatedAt: ""
    } as Interview);

  const contactInstructionLabel = (pipeline: PipelineStep) => {
    if (pipeline === "Student Needs to Contact Employer") return "Student contacts employer";
    if (pipeline === "Waiting for Employer to Contact Student") return "Employer contacts student";
    if (pipeline === "Scheduling in Progress") return "Scheduling through Drexel/employer";
    return "Review imported instructions";
  };

  const htmlToPlainText = (html: string, plainText: string) => {
    const container = document.createElement("div");
    container.innerHTML = html;
    return container.textContent?.trim() || plainText;
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setContent(await file.text());
    setHtmlContent("");
    setPasteNotice("Imported files are parsed as text. Links are preserved only when the file includes HTML or RTF link data.");
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const html = event.clipboardData.getData("text/html");
    const plainText = event.clipboardData.getData("text/plain");
    if (!html) {
      setHtmlContent("");
      setPasteNotice(
        plainText
          ? "Pasted plain text. Embedded Drexel links may not be available from this browser, but the records can still be imported and edited."
          : "Paste did not include readable text. Try copying from the Drexel page again or upload a saved text/RTF/HTML file."
      );
      return;
    }

    event.preventDefault();
    const importText = htmlToPlainText(html, plainText);
    const field = event.currentTarget;
    const nextValue =
      content.slice(0, field.selectionStart) + importText + content.slice(field.selectionEnd);
    setContent(nextValue);
    setHtmlContent((currentHtml) => (currentHtml ? `${currentHtml}\n${html}` : html));
    setPasteNotice("Rich paste detected. Embedded Drexel links will be preserved when they are included by the browser.");
  };

  const handleImport = async () => {
    setError("");
    if (!parsed.length) {
      setError("No Drexel interview records were found. Paste the copied page text or upload a text file.");
      return;
    }

    setSaving(true);
    try {
      await onImport(parsed);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Unable to import records.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel import-panel" aria-label="Drexel import">
        <div className="modal-header">
          <div>
            <h2>Drexel co-op import</h2>
            <p>Paste copied content from Maintain your Co-Op Interview Requests.</p>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <label className="upload-drop">
          <Upload size={20} />
          <span>Upload a copied text file</span>
          <input type="file" accept=".txt,.rtf,.html,.csv" onChange={handleFile} />
        </label>

        <label className="field">
          <span>Pasted Drexel content</span>
          <textarea
            value={content}
            rows={10}
            onPaste={handlePaste}
            onChange={(event) => {
              setContent(event.target.value);
              setHtmlContent("");
              setPasteNotice("");
            }}
            placeholder="Paste the page text here. The parser looks for job title, employer, job length, location, instructions, contacts, links, and interview type."
          />
        </label>
        {pasteNotice ? <p className="notice compact-notice">{pasteNotice}</p> : null}

        <div className="import-preview">
          <div className="section-heading tight">
            <div>
              <h3>Preview</h3>
              <p>{parsed.length} records detected</p>
            </div>
          </div>
          {parsed.length ? (
            parsed.map((item) => {
              const missingFields = previewMissingFields(item);
              return (
                <div
                  className="preview-import-row"
                  key={`${item.company}-${item.position}-${item.drexelJobId}`}
                >
                  <FileText size={16} />
                  <div className="preview-import-body">
                    <div className="preview-import-title">
                      <strong>{item.company || "Missing company"}</strong>
                      <span>{item.position || "Missing job title"}</span>
                    </div>
                    <dl className="preview-import-meta">
                      <div>
                        <dt>Instruction</dt>
                        <dd>{contactInstructionLabel(item.pipeline)}</dd>
                      </div>
                      <div>
                        <dt>Pipeline</dt>
                        <dd>{item.pipeline}</dd>
                      </div>
                      <div>
                        <dt>Format</dt>
                        <dd>{item.interviewFormat ?? "Not set"}</dd>
                      </div>
                      <div>
                        <dt>Contacts</dt>
                        <dd>
                          {item.contacts?.length
                            ? item.contacts
                                .map((contact) =>
                                  [contact.name, contact.email, contact.phone].filter(Boolean).join(" / ")
                                )
                                .join(", ")
                            : "None detected"}
                        </dd>
                      </div>
                    </dl>
                    {(item.links ?? []).length ? (
                      <div className="import-link-list">
                        {(item.links ?? []).map((link) => (
                          <a href={link.url} target="_blank" rel="noreferrer" key={link.url}>
                            {link.label || "Imported link"} <ExternalLink size={12} />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <small>No links detected</small>
                    )}
                    {missingFields.length ? (
                      <div className="preview-missing-fields">
                        Missing: {missingFields.map((field) => missingFieldLabels[field]).join(", ")}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="empty-copy">
              Imported fields can be edited after import. Missing dates, contacts, and links should be
              filled in from employer emails or Steinbright instructions.
            </p>
          )}
        </div>

        {error ? <p className="app-error">{error}</p> : null}

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleImport} disabled={saving}>
            <Upload size={17} />
            {saving ? "Importing..." : `Import ${parsed.length || ""} records`}
          </button>
        </div>
      </section>
    </div>
  );
}
