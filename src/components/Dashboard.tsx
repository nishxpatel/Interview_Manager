import { useEffect, useMemo, useState } from "react";
import { FileUp, Plus } from "lucide-react";
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
import type { AppUser, Interview, InterviewDraft } from "../types/interview";

interface DashboardProps {
  user: AppUser;
}

export function Dashboard({ user }: DashboardProps) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    return watchInterviews(user.uid, setInterviews, setError);
  }, [user.uid]);

  const filteredInterviews = useMemo(() => {
    if (filter === "All") return interviews;
    return interviews.filter((item) => item.status === filter || item.stage === filter);
  }, [filter, interviews]);

  const filterOptions = useMemo(() => {
    const values = new Set(["All"]);
    interviews.forEach((item) => {
      values.add(item.status);
      values.add(item.stage);
    });
    return Array.from(values);
  }, [interviews]);

  const openNewForm = () => {
    setSelectedInterview(null);
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
  };

  const handleImport = async (drafts: InterviewDraft[]) => {
    await Promise.all(drafts.map((draft) => createInterview(user.uid, draft)));
    setIsImportOpen(false);
  };

  const interviewToDraft = (interview: Interview): InterviewDraft => ({
    company: interview.company,
    position: interview.position,
    stage: interview.stage,
    status: interview.status,
    interviewDateTime: interview.interviewDateTime ?? "",
    contactPerson: interview.contactPerson ?? "",
    locationOrLink: interview.locationOrLink ?? "",
    notes: interview.notes ?? "",
    questions: interview.questions ?? "",
    followUpReminder: interview.followUpReminder ?? "",
    source: interview.source ?? "manual",
    drexelJobId: interview.drexelJobId ?? "",
    jobLength: interview.jobLength ?? ""
  });

  return (
    <section className="dashboard-shell">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Interview pipeline</h1>
          <p>
            Track outreach, scheduled interviews, preparation notes, follow-ups, offers, and closed
            opportunities.
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
          <label className="field compact">
            <span>Filter</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              {filterOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
        <InterviewList
          interviews={filteredInterviews}
          onEdit={(interview) => {
            setSelectedInterview(interview);
            setIsFormOpen(true);
          }}
          onDelete={(interviewId) => deleteInterview(user.uid, interviewId)}
          onStatusChange={(interview, status) =>
            updateInterview(user.uid, interview.id, { ...interviewToDraft(interview), status })
          }
        />
      </div>

      {isFormOpen ? (
        <InterviewForm
          interview={selectedInterview}
          onCancel={() => {
            setIsFormOpen(false);
            setSelectedInterview(null);
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
