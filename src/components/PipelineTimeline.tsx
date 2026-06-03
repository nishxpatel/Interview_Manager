import { ArrowRight, Circle } from "lucide-react";
import { normalizeInterview } from "../lib/interviewUtils";
import { PIPELINE_STEPS, type Interview, type PipelineStep } from "../types/interview";

interface PipelineTimelineProps {
  interviews: Interview[];
}

const nextStageLabels: Record<PipelineStep, string> = {
  "Student Needs to Contact Employer": "Waiting for Employer Response",
  "Waiting for Employer to Contact Student": "Scheduling in Progress",
  "Waiting for Employer Response": "Scheduling in Progress",
  "Scheduling in Progress": "Interview Scheduled",
  "Interview Scheduled": "Interview Completed",
  "Interview Completed": "Done",
  Withdrawn: "Closed"
};

export function PipelineTimeline({ interviews }: PipelineTimelineProps) {
  const normalizedInterviews = interviews.map(normalizeInterview);
  const interviewsByStage = PIPELINE_STEPS.map((step) => ({
    step,
    nextStage: nextStageLabels[step],
    interviews: normalizedInterviews
      .filter((interview) => interview.pipeline === step)
      .sort((left, right) => left.company.localeCompare(right.company))
  }));
  const activeCount = interviewsByStage.reduce((sum, stage) => sum + stage.interviews.length, 0);

  return (
    <section className="timeline-section" aria-label="Interview pipeline timeline">
      <div className="section-heading tight">
        <div>
          <h2>Pipeline timeline</h2>
          <p>{activeCount} interviews placed across {PIPELINE_STEPS.length} stages</p>
        </div>
      </div>

      <div className="pipeline-timeline" role="list">
        {interviewsByStage.map((stage, index) => (
          <article className="timeline-stage" key={stage.step} role="listitem">
            <div className="timeline-stage-marker" aria-hidden="true">
              <span>
                <Circle size={12} fill="currentColor" />
              </span>
              {index < interviewsByStage.length - 1 ? <i /> : null}
            </div>

            <div className="timeline-stage-header">
              <span>{stage.interviews.length}</span>
              <h3>{stage.step}</h3>
            </div>
            <div className="timeline-next">
              <ArrowRight size={14} />
              <span>Next: {stage.nextStage}</span>
            </div>

            <div className="timeline-interviews">
              {stage.interviews.length ? (
                stage.interviews.slice(0, 4).map((interview) => (
                  <span className="timeline-interview-chip" key={interview.id}>
                    <strong>{interview.company || "Unnamed company"}</strong>
                    <small>{interview.position || "Position not set"}</small>
                  </span>
                ))
              ) : (
                <span className="timeline-empty">No interviews</span>
              )}
              {stage.interviews.length > 4 ? (
                <span className="timeline-more">+{stage.interviews.length - 4} more</span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
