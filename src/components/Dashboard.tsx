import { useEffect, useMemo, useState } from "react";
import { FileUp, Plus, RotateCcw, Search } from "lucide-react";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { DrexelImport } from "./DrexelImport";
import { InterviewForm } from "./InterviewForm";
import { InterviewList } from "./InterviewList";
import {
  createInterview,
  deleteInterview,
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
import type {
  AppUser,
  Interview,
  InterviewDraft,
  MissingFieldKey,
  PipelineStep
} from "../types/interview";

interface DashboardProps {
  user: AppUser;
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
  location: "",
  source: ""
};

export function Dashboard({ user }: DashboardProps) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [selectedFocus, setSelectedFocus] = useState<MissingFieldKey | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [error, setError] = useState("");
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
        (!location || normalized.locationOrLink?.toLowerCase().includes(location)) &&
        (!filters.source || (normalized.source ?? "manual") === filters.source)
      );
    });
  }, [filters, interviews]);

  const filterOptions = useMemo(() => {
    const companies = new Set<string>();
    const pipelines = new Set<string>();
    const sources = new Set<string>();
    interviews.forEach((item) => {
      const normalized = normalizeInterview(item);
      if (normalized.company) companies.add(normalized.company);
      pipelines.add(normalized.pipeline);
      sources.add(normalized.source ?? "manual");
    });
    return {
      companies: Array.from(companies).sort(),
      pipelines: Array.from(pipelines).sort(),
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
              {filterOptions.pipelines.map((option) => (
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
            <span>Location/type</span>
            <input
              value={filters.location}
              onChange={(event) => updateFilter("location", event.target.value)}
              placeholder="Zoom, campus, employer site"
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
