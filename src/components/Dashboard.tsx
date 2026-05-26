import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Download, FileUp, Plus, RotateCcw, Search, Trash2, Upload } from "lucide-react";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { DrexelImport } from "./DrexelImport";
import { InterviewForm } from "./InterviewForm";
import { InterviewList } from "./InterviewList";
import {
  createInterview,
  deleteAllInterviews,
  deleteInterview,
  getLocalInterviews,
  moveLocalDemoInterviewsToCloud,
  updateInterview,
  watchInterviews
} from "../lib/interviewStore";
import {
  contactSearchText,
  getMissingFields,
  interviewToDraft,
  isDonePipeline,
  isScheduledPipeline,
  normalizeInterview,
  normalizeContacts
} from "../lib/interviewUtils";
import { exportInterviewsToCsv, importInterviewsFromCsv } from "../lib/csvInterviews";
import type {
  AppUser,
  Interview,
  InterviewDraft,
  MissingFieldKey,
  PipelineStep
} from "../types/interview";
import { INTERVIEW_FORMATS, PIPELINE_STEPS } from "../types/interview";

interface DashboardProps {
  user: AppUser;
  hasFirebaseConfig: boolean;
}

interface DashboardFilters {
  search: string;
  company: string;
  position: string;
  pipeline: string;
  dateFrom: string;
  dateTo: string;
  activity: string;
  missing: string;
  contact: string;
  format: string;
  location: string;
  source: string;
}

const emptyFilters: DashboardFilters = {
  search: "",
  company: "",
  position: "",
  pipeline: "",
  dateFrom: "",
  dateTo: "",
  activity: "all",
  missing: "all",
  contact: "",
  format: "",
  location: "",
  source: ""
};

export function Dashboard({ user, hasFirebaseConfig }: DashboardProps) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [localDemoCount, setLocalDemoCount] = useState(() =>
    user.isDemo || !hasFirebaseConfig ? 0 : getLocalInterviews().length
  );
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [selectedFocus, setSelectedFocus] = useState<MissingFieldKey | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [error, setError] = useState("");
  const [deletingAll, setDeletingAll] = useState(false);
  const [migratingLocal, setMigratingLocal] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>(emptyFilters);

  useEffect(() => {
    return watchInterviews(user.uid, setInterviews, setError);
  }, [user.uid]);

  const filteredInterviews = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const position = filters.position.trim().toLowerCase();
    const contact = filters.contact.trim().toLowerCase();
    const location = filters.location.trim().toLowerCase();
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;
    const now = new Date();

    return interviews.filter((item) => {
      const normalized = normalizeInterview(item);
      const contacts = normalizeContacts(normalized);
      const majorText = [
        normalized.company,
        normalized.position,
        normalized.pipeline,
        normalized.interviewFormat,
        normalized.roundLabel,
        normalized.locationOrLink,
        normalized.jobDescriptionLink,
        normalized.notes,
        normalized.questions,
        normalized.drexelJobId,
        normalized.jobLength,
        normalized.source,
        contactSearchText(contacts)
      ]
        .join(" ")
        .toLowerCase();
      const interviewDate = normalized.interviewDateTime
        ? new Date(normalized.interviewDateTime)
        : null;
      const isCompleted = isDonePipeline(normalized.pipeline) || normalized.pipeline === "Interview Completed";
      const isUpcoming = Boolean(interviewDate && interviewDate >= now);
      const missingFields = getMissingFields(normalized);

      return (
        (!search || majorText.includes(search)) &&
        (!filters.company || normalized.company === filters.company) &&
        (!position || normalized.position.toLowerCase().includes(position)) &&
        (!filters.pipeline || normalized.pipeline === filters.pipeline) &&
        (!from || (interviewDate && interviewDate >= from)) &&
        (!to || (interviewDate && interviewDate <= to)) &&
        (filters.activity === "all" ||
          (filters.activity === "upcoming" && isUpcoming && isScheduledPipeline(normalized.pipeline)) ||
          (filters.activity === "completed" && isCompleted) ||
          (filters.activity === "active" && !isCompleted)) &&
        (filters.missing === "all" ||
          (filters.missing === "missing" && missingFields.length > 0) ||
          (filters.missing === "complete" && missingFields.length === 0)) &&
        (!contact || contactSearchText(contacts).toLowerCase().includes(contact)) &&
        (!filters.format || normalized.interviewFormat === filters.format) &&
        (!location ||
          [normalized.locationOrLink, normalized.interviewFormat].join(" ").toLowerCase().includes(location)) &&
        (!filters.source || (normalized.source ?? "manual") === filters.source)
      );
    });
  }, [filters, interviews]);

  const filterOptions = useMemo(() => {
    const companies = new Set<string>();
    const sources = new Set<string>();
    interviews.forEach((item) => {
      const normalized = normalizeInterview(item);
      if (normalized.company) companies.add(normalized.company);
      sources.add(normalized.source ?? "manual");
    });
    return {
      companies: Array.from(companies).sort(),
      sources: Array.from(sources).sort()
    };
  }, [interviews]);

  const hasActiveFilters = Object.entries(filters).some(([key, value]) =>
    key === "activity" || key === "missing" ? value !== "all" : Boolean(value)
  );

  const openNewForm = () => {
    setSelectedInterview(null);
    setSelectedFocus(undefined);
    setIsFormOpen(true);
  };

  const handleSave = async (draft: InterviewDraft) => {
    if (selectedInterview) {
      await updateInterview(user.uid, selectedInterview.id, draft);
    } else {
      await createInterview(user.uid, draft);
    }
    setIsFormOpen(false);
    setSelectedInterview(null);
    setSelectedFocus(undefined);
  };

  const handleImport = async (drafts: InterviewDraft[]) => {
    await Promise.all(drafts.map((draft) => createInterview(user.uid, draft)));
    setIsImportOpen(false);
  };

  const handleCsvExport = () => {
    setError("");
    const csv = exportInterviewsToCsv(interviews);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `interview-manager-${date}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleCsvImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImportingCsv(true);
    setError("");
    try {
      const drafts = importInterviewsFromCsv(await file.text());
      if (!drafts.length) {
        setError("No interview rows were found in the CSV.");
        return;
      }
      await Promise.all(drafts.map((draft) => createInterview(user.uid, draft)));
      window.alert(`Imported ${drafts.length} interview entr${drafts.length === 1 ? "y" : "ies"} from CSV.`);
    } catch (csvError) {
      setError(csvError instanceof Error ? csvError.message : "Unable to import CSV.");
    } finally {
      setImportingCsv(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!interviews.length) return;
    const confirmed = window.confirm(
      `Delete all ${interviews.length} interview entries for this account? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingAll(true);
    setError("");
    try {
      await deleteAllInterviews(user.uid);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete interviews.");
    } finally {
      setDeletingAll(false);
    }
  };

  const handleMoveLocalToCloud = async () => {
    if (!localDemoCount) return;
    const confirmed = window.confirm(
      `Move ${localDemoCount} local demo interview entr${localDemoCount === 1 ? "y" : "ies"} to your Google account? This copies them to Firestore and clears the local demo copy on this browser.`
    );
    if (!confirmed) return;

    setMigratingLocal(true);
    setError("");
    try {
      const moved = await moveLocalDemoInterviewsToCloud(user.uid);
      setLocalDemoCount(0);
      window.alert(`Moved ${moved} interview entr${moved === 1 ? "y" : "ies"} to cloud sync.`);
    } catch (migrationError) {
      setError(migrationError instanceof Error ? migrationError.message : "Unable to move local demo data.");
    } finally {
      setMigratingLocal(false);
    }
  };

  const updateFilter = <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="dashboard-shell">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Interview pipeline</h1>
          <p>
            Track employer communication, scheduled rounds, interview prep, and follow-ups after
            an interview has been granted.
          </p>
        </div>
        <div className="dashboard-actions">
          <button className="secondary-button" onClick={() => setIsImportOpen(true)}>
            <FileUp size={17} />
            Drexel import
          </button>
          <button
            className="ghost-button"
            onClick={handleCsvExport}
            disabled={!interviews.length}
            title="Export interviews using the CSV schema accepted by CSV import."
          >
            <Download size={17} />
            Export CSV
          </button>
          <label className={`ghost-button file-action-button${importingCsv ? " is-disabled" : ""}`}>
            <Upload size={17} />
            {importingCsv ? "Importing..." : "Import CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvImport}
              disabled={importingCsv}
            />
          </label>
          <button
            className="danger-button"
            onClick={handleDeleteAll}
            disabled={!interviews.length || deletingAll}
          >
            <Trash2 size={17} />
            {deletingAll ? "Deleting..." : "Delete all entries"}
          </button>
          <button className="primary-button" onClick={openNewForm}>
            <Plus size={17} />
            Add interview
          </button>
        </div>
      </div>

      {user.isDemo ? (
        <p className="notice">
          Local demo mode stores data in this browser. Add Firebase environment variables for Google
          sign-in and secure cloud persistence.
        </p>
      ) : (
        <p className="sync-notice">
          Cloud sync active for {user.email || user.displayName}. Interviews are stored in Firestore
          under this Google account.
        </p>
      )}
      {!user.isDemo && localDemoCount > 0 ? (
        <div className="notice action-notice">
          <span>
            Found {localDemoCount} local demo interview entr{localDemoCount === 1 ? "y" : "ies"} on
            this browser.
          </span>
          <button className="secondary-button" onClick={handleMoveLocalToCloud} disabled={migratingLocal}>
            {migratingLocal ? "Moving..." : "Move local data to cloud"}
          </button>
        </div>
      ) : null}
      {error ? <p className="app-error">{error}</p> : null}

      <AnalyticsPanel interviews={interviews} />

      <div className="table-section">
        <div className="section-heading">
          <div>
            <h2>All interviews</h2>
            <p>{filteredInterviews.length} shown</p>
          </div>
          {hasActiveFilters ? (
            <button className="ghost-button" onClick={() => setFilters(emptyFilters)}>
              <RotateCcw size={16} />
              Reset filters
            </button>
          ) : null}
        </div>

        <div className="filter-panel">
          <label className="field filter-search">
            <span>Search</span>
            <div className="input-with-icon">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Company, title, notes, contacts"
              />
            </div>
          </label>
          <label className="field">
            <span>Company</span>
            <select
              value={filters.company}
              onChange={(event) => updateFilter("company", event.target.value)}
            >
              <option value="">Any company</option>
              {filterOptions.companies.map((company) => (
                <option key={company}>{company}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Position/title</span>
            <input
              value={filters.position}
              onChange={(event) => updateFilter("position", event.target.value)}
              placeholder="Data, product, SWE"
            />
          </label>
          <label className="field">
            <span>Pipeline step</span>
            <select
              value={filters.pipeline}
              onChange={(event) => updateFilter("pipeline", event.target.value)}
            >
              <option value="">Any pipeline step</option>
              {PIPELINE_STEPS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>From date</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
            />
          </label>
          <label className="field">
            <span>To date</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Pipeline</span>
            <select
              value={filters.activity}
              onChange={(event) => updateFilter("activity", event.target.value)}
            >
              <option value="all">All records</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed/done</option>
            </select>
          </label>
          <label className="field">
            <span>Missing fields</span>
            <select
              value={filters.missing}
              onChange={(event) => updateFilter("missing", event.target.value)}
            >
              <option value="all">Any completeness</option>
              <option value="missing">Has missing fields</option>
              <option value="complete">No missing fields</option>
            </select>
          </label>
          <label className="field">
            <span>Contact</span>
            <input
              value={filters.contact}
              onChange={(event) => updateFilter("contact", event.target.value)}
              placeholder="Name or email"
            />
          </label>
          <label className="field">
            <span>Format/type</span>
            <select
              value={filters.format}
              onChange={(event) => updateFilter("format", event.target.value)}
            >
              <option value="">Any format</option>
              {INTERVIEW_FORMATS.map((format) => (
                <option key={format}>{format}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Location/link</span>
            <input
              value={filters.location}
              onChange={(event) => updateFilter("location", event.target.value)}
              placeholder="Meeting link, campus, employer site"
            />
          </label>
          <label className="field">
            <span>Source</span>
            <select
              value={filters.source}
              onChange={(event) => updateFilter("source", event.target.value)}
            >
              <option value="">Any source</option>
              {filterOptions.sources.map((source) => (
                <option value={source} key={source}>
                  {source === "drexel-import" ? "Drexel import" : "Manual"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <InterviewList
          interviews={filteredInterviews}
          onEdit={(interview, focusField) => {
            setSelectedInterview(interview);
            setSelectedFocus(focusField);
            setIsFormOpen(true);
          }}
          onDelete={(interviewId) => deleteInterview(user.uid, interviewId)}
          onPipelineChange={(interview, pipeline) =>
            updateInterview(user.uid, interview.id, {
              ...interviewToDraft(interview),
              pipeline: pipeline as PipelineStep
            })
          }
        />
      </div>

      {isFormOpen ? (
        <InterviewForm
          interview={selectedInterview}
          initialFocus={selectedFocus}
          onCancel={() => {
            setIsFormOpen(false);
            setSelectedInterview(null);
            setSelectedFocus(undefined);
          }}
          onSave={handleSave}
        />
      ) : null}

      {isImportOpen ? (
        <DrexelImport onCancel={() => setIsImportOpen(false)} onImport={handleImport} />
      ) : null}
    </section>
  );
}
