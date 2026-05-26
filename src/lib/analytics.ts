import type { Interview, InterviewStatus } from "../types/interview";

const statusIsActive = (status: InterviewStatus) =>
  !["Offer received", "Rejected/closed", "Interview completed"].includes(status);

export const getAnalytics = (interviews: Interview[]) => {
  const now = new Date();
  const byStatus = interviews.reduce<Record<string, number>>((acc, interview) => {
    acc[interview.status] = (acc[interview.status] ?? 0) + 1;
    return acc;
  }, {});

  const upcoming = interviews.filter((interview) => {
    if (!interview.interviewDateTime) return false;
    return new Date(interview.interviewDateTime) >= now;
  }).length;

  return {
    total: interviews.length,
    byStatus,
    upcoming,
    completed: interviews.filter((item) => item.status === "Interview completed").length,
    offers: interviews.filter((item) => item.status === "Offer received").length,
    rejected: interviews.filter((item) => item.status === "Rejected/closed").length,
    active: interviews.filter((item) => statusIsActive(item.status)).length
  };
};
