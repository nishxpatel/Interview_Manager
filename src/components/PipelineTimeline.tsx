import { useRef, useState, type CSSProperties } from "react";
import { Circle, CircleX, Target } from "lucide-react";
import { normalizeInterview } from "../lib/interviewUtils";
import { PIPELINE_STEPS, type Interview, type PipelineStep } from "../types/interview";

interface PipelineTimelineProps {
  interviews: Interview[];
}

const timelineSteps = PIPELINE_STEPS.filter((step) => step !== "Withdrawn");
const visibleInterviewLimit = 3;

export function PipelineTimeline({ interviews }: PipelineTimelineProps) {
  const [expandedStages, setExpandedStages] = useState<Partial<Record<PipelineStep, boolean>>>({});
  const stageRefs = useRef<Partial<Record<PipelineStep, HTMLElement | null>>>({});
  const normalizedInterviews = interviews.map(normalizeInterview);
  const interviewsByStage = timelineSteps.map((step) => ({
    step,
    interviews: normalizedInterviews
      .filter((interview) => interview.pipeline === step)
      .sort((left, right) => left.company.localeCompare(right.company))
  }));
  const totalCount = normalizedInterviews.length;
  const withdrawnCount = normalizedInterviews.filter((interview) => interview.pipeline === "Withdrawn").length;
  const timelineStyle = {
    "--timeline-stage-count": interviewsByStage.length
  } as CSSProperties;

  const toggleStage = (step: PipelineStep, isExpanded: boolean) => {
    setExpandedStages((current) => ({
      ...current,
      [step]: !current[step]
    }));

    if (!isExpanded) return;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        stageRefs.current[step]?.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start"
        });
      });
    });
  };

  return (
    <section className="timeline-section" aria-label="Interview pipeline timeline">
      <div className="section-heading tight timeline-heading">
        <div>
          <h2>Overview</h2>
        </div>
        <div className="timeline-summary" aria-label="Interview summary">
          <span className="timeline-summary-card is-primary">
            <Target size={22} />
            <span>
              <small>Total interviews</small>
              <strong>{totalCount}</strong>
            </span>
          </span>
          <span className="timeline-summary-card">
            <CircleX size={20} />
            <span>
              <small>Withdrawn</small>
              <strong>{withdrawnCount}</strong>
            </span>
          </span>
        </div>
      </div>

      <div className="pipeline-timeline" role="list" style={timelineStyle}>
        {interviewsByStage.map((stage, index) => {
          const isFinalStage = index === interviewsByStage.length - 1;
          const isExpanded = Boolean(expandedStages[stage.step]);
          const hasMore = stage.interviews.length > visibleInterviewLimit;
          const visibleInterviews = isExpanded
            ? stage.interviews
            : stage.interviews.slice(0, visibleInterviewLimit);
          const hiddenCount = stage.interviews.length - visibleInterviewLimit;

          return (
            <article
              className={`timeline-stage${isFinalStage ? " is-final-stage" : ""}`}
              key={stage.step}
              ref={(node) => {
                stageRefs.current[stage.step] = node;
              }}
              role="listitem"
            >
              <div className="timeline-stage-marker" aria-hidden="true">
                <span className="timeline-dot">
                  <Circle size={12} fill="currentColor" />
                </span>
                <i />
                {isFinalStage ? (
                  <span className="timeline-dot timeline-end-dot">
                    <Circle size={12} fill="currentColor" />
                  </span>
                ) : null}
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
                    onClick={() => toggleStage(stage.step, isExpanded)}
                  >
                    {isExpanded ? "Show fewer" : `View ${hiddenCount} more`}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
