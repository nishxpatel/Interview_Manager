import type { Interview } from "../types/interview";
import {
  isCommunicationNeededPipeline,
  isDonePipeline,
  isScheduledPipeline,
  normalizeInterview
} from "./interviewUtils";

export const getAnalytics = (interviews: Interview[]) => {
  const normalized = interviews.map(normalizeInterview);
  const now = new Date();
  const byPipeline = normalized.reduce<Record<string, number>>((acc, interview) => {
    acc[interview.pipeline] = (acc[interview.pipeline] ?? 0) + 1;
    return acc;
  }, {});

  const scheduled = normalized
    .filter((interview) => isScheduledPipeline(interview.pipeline) && interview.interviewDateTime)
    .sort(
      (a, b) =>
        new Date(a.interviewDateTime ?? "").getTime() -
        new Date(b.interviewDateTime ?? "").getTime()
    );

  return {
    total: normalized.length,
    byPipeline,
    scheduled,
    upcoming: scheduled.filter((interview) => new Date(interview.interviewDateTime ?? "") >= now)
      .length,
    communicationNeeded: normalized.filter((item) => isCommunicationNeededPipeline(item.pipeline))
      .length,
    completed: normalized.filter((item) => item.pipeline === "Interview Completed").length,
    done: normalized.filter((item) => isDonePipeline(item.pipeline)).length,
    active: normalized.filter((item) => !isDonePipeline(item.pipeline)).length
  };
};
