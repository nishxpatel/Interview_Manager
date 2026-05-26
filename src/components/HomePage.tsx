import type { LucideIcon } from "lucide-react";
import { ArrowRight, Database, FileUp, NotebookPen } from "lucide-react";

interface HomePageProps {
  authLoading: boolean;
  hasFirebaseConfig: boolean;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  featureIcons: LucideIcon[];
}

export function HomePage({
  authLoading,
  hasFirebaseConfig,
  onPrimaryAction,
  primaryActionLabel
}: HomePageProps) {
  return (
    <section className="home-shell">
      <div className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Built for Drexel co-op search, useful for every interview loop</p>
          <h1>Keep every interview, note, follow-up, and outcome in one place.</h1>
          <p>
            Interview Manager gives students and job seekers a focused dashboard for tracking
            companies, stages, dates, recruiter details, preparation notes, and pipeline results.
          </p>
          <div className="hero-actions">
            <button className="primary-button large" onClick={onPrimaryAction} disabled={authLoading}>
              {primaryActionLabel}
              <ArrowRight size={18} />
            </button>
            <span className="home-trust">
              {hasFirebaseConfig
                ? "Google sign-in keeps each dashboard tied to the right user."
                : "Add Firebase config to enable Google sign-in and cloud sync."}
            </span>
          </div>
        </div>
        <div className="hero-panel" aria-label="Interview pipeline preview">
          <div className="preview-toolbar">
            <span>Pipeline</span>
            <strong>8 active</strong>
          </div>
          {[
            ["Comcast", "Data Products Co-op", "Date/time finalized"],
            ["PECO", "Project Controls", "Need to email"],
            ["College Ave", "Data Engineering", "Waiting for response"]
          ].map(([company, role, status]) => (
            <div className="preview-row" key={`${company}-${role}`}>
              <span>
                <strong>{company}</strong>
                <small>{role}</small>
              </span>
              <em>{status}</em>
            </div>
          ))}
        </div>
      </div>

      <div className="feature-grid">
        <article>
          <Database size={24} />
          <h2>Structured interview database</h2>
          <p>Track company, position, stage, status, date, contact, link, and notes.</p>
        </article>
        <article>
          <NotebookPen size={24} />
          <h2>Preparation notes</h2>
          <p>Keep questions, recruiter responses, follow-up reminders, and thoughts nearby.</p>
        </article>
        <article>
          <FileUp size={24} />
          <h2>Drexel import</h2>
          <p>Paste copied co-op interview requests and start from parsed records.</p>
        </article>
      </div>
    </section>
  );
}
