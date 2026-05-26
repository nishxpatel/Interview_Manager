import { ChangeEvent, ClipboardEvent, useMemo, useState } from "react";
import { ExternalLink, FileText, Upload, X } from "lucide-react";
import { parseDrexelInterviewText } from "../lib/drexelParser";
import type { InterviewDraft } from "../types/interview";

interface DrexelImportProps {
  onCancel: () => void;
  onImport: (drafts: InterviewDraft[]) => Promise<void>;
}

export function DrexelImport({ onCancel, onImport }: DrexelImportProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const parsed = useMemo(() => parseDrexelInterviewText(content), [content]);

  const htmlToImportText = (html: string, plainText: string) => {
    const container = document.createElement("div");
    container.innerHTML = html;
    container.querySelectorAll("a[href]").forEach((anchor) => {
      const href = anchor.getAttribute("href") ?? "";
      const label = anchor.textContent ?? "";
      anchor.replaceWith(document.createTextNode(`\n${href}\n${label}\n`));
    });
    return container.textContent?.trim() || plainText;
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setContent(await file.text());
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const html = event.clipboardData.getData("text/html");
    const plainText = event.clipboardData.getData("text/plain");
    if (!html) return;

    event.preventDefault();
    const importText = htmlToImportText(html, plainText);
    const field = event.currentTarget;
    const nextValue =
      content.slice(0, field.selectionStart) + importText + content.slice(field.selectionEnd);
    setContent(nextValue);
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
            onChange={(event) => setContent(event.target.value)}
            placeholder="Paste the page text here. The parser looks for job title, employer, job length, location, instructions, contacts, links, and interview type."
          />
        </label>

        <div className="import-preview">
          <div className="section-heading tight">
            <div>
              <h3>Preview</h3>
              <p>{parsed.length} records detected</p>
            </div>
          </div>
          {parsed.length ? (
            parsed.slice(0, 5).map((item) => (
              <div
                className="preview-import-row"
                key={`${item.company}-${item.position}-${item.drexelJobId}`}
              >
                <FileText size={16} />
                <span>
                  <strong>{item.company}</strong>
                  {item.position}
                  {(item.links ?? []).length ? (
                    <span className="import-link-list">
                      {(item.links ?? []).slice(0, 3).map((link) => (
                        <a href={link.url} target="_blank" rel="noreferrer" key={link.url}>
                          {link.label || "Imported link"} <ExternalLink size={12} />
                        </a>
                      ))}
                    </span>
                  ) : (
                    <small>No links detected</small>
                  )}
                </span>
                <em>{item.pipeline}</em>
              </div>
            ))
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
