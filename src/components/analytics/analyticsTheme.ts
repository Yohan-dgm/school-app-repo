// Shared color palette for the Growth & Development Dashboard charts
// (AcademicPerformanceChart, SubjectPerformanceChart, AttendanceAnalyticsChart,
// StudentJourneyTimeline, TermRecommendations). Centralizes the hex values that
// were previously redeclared per-file so every chart stays visually consistent.
//
// Note: MAROON is the app's existing brand primary color (used app-wide), kept
// as-is here rather than re-derived. The categorical SUBJECT_COLORS list has one
// adjacent pair (amber/green) with borderline colorblind separation; this is
// acceptable because every use pairs the color with a direct text label
// (subject/term name), never color alone.

export const MAROON = "#920734";
export const MAROON_DARK = "#6B0523";

export const STATUS_COLORS = {
  success: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#4F46E5",
  rank: "#7C3AED",
} as const;

export const NEUTRAL_COLORS = {
  classAverage: "#CBD5E1",
  classAverageLight: "#E2E8F0",
  mutedText: "#94A3B8",
};

// Fixed-order categorical palette for per-subject charts. Order must stay
// stable — a subject's color should not shift when other subjects are
// filtered in/out.
export const SUBJECT_COLORS = [
  MAROON,
  "#2563EB",
  STATUS_COLORS.success,
  STATUS_COLORS.warning,
  STATUS_COLORS.rank,
  "#DB2777",
  "#0891B2",
  "#65A30D",
];

export function getPerformanceColor(avg: number): string {
  if (avg >= 80) return STATUS_COLORS.success;
  if (avg >= 65) return STATUS_COLORS.info;
  if (avg >= 50) return STATUS_COLORS.warning;
  return STATUS_COLORS.danger;
}
