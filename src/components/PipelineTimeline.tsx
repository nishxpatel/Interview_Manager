import { useState, type CSSProperties } from "react";
import { Circle } from "lucide-react";
import { normalizeInterview } from "../lib/interviewUtils";
import { PIPELINE_STEPS, type Interview, type PipelineStep } from "../types/interview";

interface PipelineTimelineProps {
  interviews: Interview[];
}

const timelineSteps = PIPELINE_STEPS.filter((step) => step !== "Withdrawn");
const visibleInterviewLimit = 3;

export function PipelineTimeline({ interviews }: PipelineTimelineProps) {
  const [expandedStages, setExpandedStages] = useState<Partial<Record<PipelineStep, boolean>>>({});
  const normalizedInterviews = interviews.map(normalizeInterview);
  const interviewsByStage = timelineSteps.map((step) => ({
    step,
    interviews: normalizedInterviews
      .filter((interview) => interview.pipeline === step)
      .sort((left, right) => left.company.localeCompare(right.company))
  }));
  const activeCount = interviewsByStage.reduce((sum, stage) => sum + stage.interviews.length, 0);
  const timelineStyle = {
    "--timeline-stage-count": interviewsByStage.length + 1
  } as CSSProperties;

  return (
    <section className="timeline-section" aria-label="Interview pipeline timeline">
      <div className="section-heading tight timeline-heading">
        <div>
          <h2>Pipeline timeline</h2>
          <p>{activeCount} interviews placed across {timelineSteps.length} stages</p>
        </div>
      </div>

      <div className="pipeline-timeline" role="list" style={timelineStyle}>
        {interviewsByStage.map((stage) => {
          const isExpanded = Boolean(expandedStages[stage.step]);
          const hasMore = stage.interviews.length > visibleInterviewLimit;
          const visibleInterviews = isExpanded
            ? stage.interviews
            : stage.interviews.slice(0, visibleInterviewLimit);
          const hiddenCount = stage.interviews.length - visibleInterviewLimit;

          return (
            <article className="timeline-stage" key={stage.step} role="listitem">
              <div className="timeline-stage-marker" aria-hidden="true">
                <span className="timeline-dot">
                  <Circle size={12} fill="currentColor" />
                </span>
                <i />
              </div>

              <div className="timeline-stage-body">
                <div className="timeline-stage-header">
                  <span>{stage.interviews.length}</span>
                  <h3>{stage.step}</h3>
                </div>
              </div>

              <div className="timeline-interviews">
                {stage.interviews.length ? (
                  visibleInterviews.map((interview) => (
                    <span className="timeline-interview-chip" key={interview.id}>
                      <strong>{interview.company || "Unnamed company"}</strong>
                      <small>{interview.position || "Position not set"}</small>
                    </span>
                  ))
                ) : (
                  <span className="timeline-empty">No interviews</span>
                )}
                {hasMore ? (
                  <button
                    className="timeline-more"
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setExpandedStages((current) => ({
                        ...current,
                        [stage.step]: !current[stage.step]
                      }))
                    }
                  >
                    {isExpanded ? "Show fewer" : `View ${hiddenCount} more`}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
        <article className="timeline-stage timeline-stage-terminal" role="listitem">
          <div className="timeline-stage-marker" aria-hidden="true">
            <span className="timeline-dot">
              <Circle size={12} fill="currentColor" />
            </span>
          </div>
          <div className="timeline-terminal-body">
            <h3>Done</h3>
          </div>
        </article>
      </div>
    </section>
  );
}
