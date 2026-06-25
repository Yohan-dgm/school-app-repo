import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import {
  Sparkles,
  Trophy,
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CalendarCheck,
  CalendarX,
  TrendingUp,
  TrendingDown,
  GraduationCap,
  BookOpen,
  Star,
} from "lucide-react-native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SubjectTermMark {
  term: string;
  mark: number | null;
  class_avg: number | null;
  student_avg: number | null;
  subject_avg: number | null;
}

interface SubjectWisePerformance {
  name: string;
  marks: SubjectTermMark[];
  rank: number | null;
  status: "Up" | "Down" | "Stable";
}

interface AttendanceSummaryItem {
  term: string;
  present: number;
  absent: number;
}

interface Recommendation {
  type: "success" | "warning" | "danger" | "info";
  icon: string;
  text: string;
}

interface TermRecommendation {
  term: string;
  overallAvg: number | null;
  classRank: number | null;
  recommendations: Recommendation[];
}

interface TermRecommendationsProps {
  subjectWisePerformance: SubjectWisePerformance[];
  termList: string[];
  attendanceSummary: AttendanceSummaryItem[];
  examReports: {
    student_average: number | null;
    class_rank: number | null;
    scheduling_examination: {
      term: { name: string; school_year: string } | null;
      exam_title: string;
    } | null;
  }[];
}

type RecType = "success" | "warning" | "danger" | "info";

const TYPE_COLORS: Record<RecType, string> = {
  success: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#4F46E5",
};

const TYPE_BG: Record<RecType, string> = {
  success: "#D1FAE5",
  warning: "#FEF3C7",
  danger: "#FEE2E2",
  info: "#EDE9FE",
};

type LucideIconFC = (props: {
  size: number;
  color: string;
  strokeWidth?: number;
}) => React.ReactElement;

const REC_ICONS: Record<string, LucideIconFC> = {
  "emoji-events": (p) => <Trophy {...p} />,
  star: (p) => <Star {...p} />,
  "trending-up": (p) => <TrendingUp {...p} />,
  school: (p) => <GraduationCap {...p} />,
  grade: (p) => <Star {...p} />,
  "priority-high": (p) => <AlertTriangle {...p} />,
  report: (p) => <XCircle {...p} />,
  "check-circle": (p) => <CheckCircle2 {...p} />,
  error: (p) => <XCircle {...p} />,
  warning: (p) => <AlertTriangle {...p} />,
  "event-busy": (p) => <CalendarX {...p} />,
  "event-available": (p) => <CalendarCheck {...p} />,
  info: (p) => <Info {...p} />,
  "trending-down": (p) => <TrendingDown {...p} />,
  "book-open": (p) => <BookOpen {...p} />,
};

function getRecIcon(iconName: string): LucideIconFC {
  return REC_ICONS[iconName] ?? ((p) => <Info {...p} />);
}

function generateRecommendations(
  subjectWisePerformance: SubjectWisePerformance[],
  termList: string[],
  attendanceSummary: AttendanceSummaryItem[],
  examReports: TermRecommendationsProps["examReports"],
): TermRecommendation[] {
  return termList.map((term) => {
    const recs: Recommendation[] = [];

    const subjectMarks: {
      name: string;
      mark: number;
      classAvg: number;
      status: string;
    }[] = [];
    subjectWisePerformance.forEach((subj) => {
      const termData = subj.marks.find((m) => m.term === term);
      if (termData && termData.mark != null) {
        subjectMarks.push({
          name: subj.name,
          mark: Number(termData.mark),
          classAvg: Number(termData.subject_avg ?? 0),
          status: subj.status,
        });
      }
    });

    const examReport = examReports.find((r) => {
      const t = r.scheduling_examination?.term;
      if (!t) return false;
      const label =
        t.school_year && !t.name.includes(t.school_year)
          ? `${t.school_year} - ${t.name}`
          : t.name;
      return label.trim() === term.trim();
    });

    const overallAvg = examReport?.student_average
      ? Number(examReport.student_average)
      : null;
    const classRank = examReport?.class_rank ?? null;

    if (classRank != null) {
      if (classRank === 1) {
        recs.push({
          type: "success",
          icon: "emoji-events",
          text: "Outstanding! Ranked #1 in class — a truly exceptional achievement.",
        });
      } else if (classRank <= 3) {
        recs.push({
          type: "success",
          icon: "star",
          text: `Excellent — ranked #${classRank} in class. Keep this momentum!`,
        });
      } else if (classRank <= 10) {
        recs.push({
          type: "info",
          icon: "trending-up",
          text: `Ranked #${classRank} — with consistent effort, a top-5 position is achievable.`,
        });
      } else {
        recs.push({
          type: "warning",
          icon: "school",
          text: `Currently ranked #${classRank} — focusing on weaker subjects will improve standing.`,
        });
      }
    }

    if (overallAvg != null) {
      if (overallAvg >= 85) {
        recs.push({
          type: "success",
          icon: "grade",
          text: `Impressive ${overallAvg.toFixed(1)}% average — top-tier academic performance!`,
        });
      } else if (overallAvg >= 70) {
        recs.push({
          type: "info",
          icon: "trending-up",
          text: `Good ${overallAvg.toFixed(1)}% average — targeting 80%+ will significantly improve ranking.`,
        });
      } else if (overallAvg >= 50) {
        recs.push({
          type: "warning",
          icon: "priority-high",
          text: `${overallAvg.toFixed(1)}% average — additional study time and revision are recommended.`,
        });
      } else {
        recs.push({
          type: "danger",
          icon: "report",
          text: `${overallAvg.toFixed(1)}% is below passing — urgent academic support is needed.`,
        });
      }
    }

    const weakSubjects = subjectMarks.filter((s) => s.mark < 50);
    const strongSubjects = subjectMarks.filter((s) => s.mark >= 80);
    const belowClassAvg = subjectMarks.filter(
      (s) => s.classAvg > 0 && s.mark < s.classAvg - 5,
    );

    strongSubjects.slice(0, 2).forEach((s) => {
      recs.push({
        type: "success",
        icon: "check-circle",
        text: `${s.name}: ${s.mark.toFixed(0)}% — excellent grasp of the subject.`,
      });
    });

    weakSubjects.slice(0, 2).forEach((s) => {
      recs.push({
        type: "danger",
        icon: "error",
        text: `${s.name}: ${s.mark.toFixed(0)}% — below passing; seek extra support immediately.`,
      });
    });

    belowClassAvg
      .filter((s) => !weakSubjects.find((w) => w.name === s.name))
      .slice(0, 2)
      .forEach((s) => {
        recs.push({
          type: "warning",
          icon: "warning",
          text: `${s.name} is ${(s.classAvg - s.mark).toFixed(0)}% below the class average — more focus needed.`,
        });
      });

    const attendance = attendanceSummary.find(
      (a) =>
        term.toLowerCase().includes(a.term.toLowerCase()) ||
        a.term.toLowerCase().includes(term.toLowerCase()),
    );
    if (attendance) {
      const total = attendance.present + attendance.absent;
      const rate = total > 0 ? (attendance.present / total) * 100 : 100;
      if (rate < 80) {
        recs.push({
          type: "danger",
          icon: "event-busy",
          text: `Attendance at ${rate.toFixed(0)}% — regular attendance is critical for academic success.`,
        });
      } else if (rate < 90) {
        recs.push({
          type: "warning",
          icon: "event-available",
          text: `Attendance at ${rate.toFixed(0)}% — aim for 95%+ for the best outcomes.`,
        });
      } else {
        recs.push({
          type: "success",
          icon: "event-available",
          text: `Excellent ${rate.toFixed(0)}% attendance — consistency is a key success factor!`,
        });
      }
    }

    if (recs.length === 0) {
      recs.push({
        type: "info",
        icon: "info",
        text: "No specific insights available for this term.",
      });
    }

    return { term, overallAvg, classRank, recommendations: recs };
  });
}

const TermRecommendations: React.FC<TermRecommendationsProps> = ({
  subjectWisePerformance,
  termList,
  attendanceSummary,
  examReports,
}) => {
  // Default: newest term (last in chronological termList) is expanded
  const newestTerm = termList.length > 0 ? termList[termList.length - 1] : "";
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(
    new Set(newestTerm ? [newestTerm] : []),
  );

  // Generate in chronological order, then reverse so newest is first
  const termRecommendations = [
    ...generateRecommendations(
      subjectWisePerformance,
      termList,
      attendanceSummary,
      examReports,
    ),
  ].reverse();

  const toggleTerm = (term: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(term)) {
        next.delete(term);
      } else {
        next.add(term);
      }
      return next;
    });
  };

  if (termRecommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Sparkles size={40} color="#CBD5E1" />
        <Text style={styles.emptyText}>No insights available yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {termRecommendations.map((termData, listIdx) => {
        const isExpanded = expandedTerms.has(termData.term);
        const isNewest = listIdx === 0; // first in reversed list = newest
        const successCount = termData.recommendations.filter(
          (r) => r.type === "success",
        ).length;
        const issueCount = termData.recommendations.filter(
          (r) => r.type === "warning" || r.type === "danger",
        ).length;

        return (
          <View key={termData.term} style={styles.termCard}>
            <TouchableOpacity
              style={styles.termHeader}
              onPress={() => toggleTerm(termData.term)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.termHeaderAccent,
                  {
                    backgroundColor:
                      issueCount > 0
                        ? TYPE_COLORS.warning
                        : TYPE_COLORS.success,
                  },
                ]}
              />
              <View style={styles.termTitleBlock}>
                <Sparkles size={15} color="#7C3AED" strokeWidth={1.8} />
                <Text style={styles.termTitle} numberOfLines={1}>
                  {termData.term.replace(/^\d{4}\s*-\s*/i, "")}
                </Text>
                {termData.term.match(/^(\d{4})/)?.[1] ? (
                  <Text style={styles.termYear}>
                    {termData.term.match(/^(\d{4})/)?.[1]}
                  </Text>
                ) : null}
                {isNewest && (
                  <View style={styles.latestBadge}>
                    <Text style={styles.latestBadgeText}>Latest</Text>
                  </View>
                )}
              </View>
              <View style={styles.termBadgeRow}>
                {termData.overallAvg != null && (
                  <View style={styles.avgBadge}>
                    <Text style={styles.avgBadgeText}>
                      {termData.overallAvg.toFixed(0)}%
                    </Text>
                  </View>
                )}
                {successCount > 0 && (
                  <View
                    style={[styles.countBadge, { backgroundColor: "#D1FAE5" }]}
                  >
                    <CheckCircle2 size={10} color="#059669" />
                    <Text style={[styles.countBadgeText, { color: "#059669" }]}>
                      {successCount}
                    </Text>
                  </View>
                )}
                {issueCount > 0 && (
                  <View
                    style={[styles.countBadge, { backgroundColor: "#FEE2E2" }]}
                  >
                    <AlertTriangle size={10} color="#DC2626" />
                    <Text style={[styles.countBadgeText, { color: "#DC2626" }]}>
                      {issueCount}
                    </Text>
                  </View>
                )}
                {isExpanded ? (
                  <ChevronUp size={18} color="#94A3B8" />
                ) : (
                  <ChevronDown size={18} color="#94A3B8" />
                )}
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.recList}>
                {termData.recommendations.map((rec, idx) => {
                  const RecIcon = getRecIcon(rec.icon);
                  const bgColor = TYPE_BG[rec.type];
                  const fgColor = TYPE_COLORS[rec.type];
                  return (
                    <View
                      key={idx}
                      style={[styles.recItem, { backgroundColor: bgColor }]}
                    >
                      <View
                        style={[
                          styles.recIconWrap,
                          { backgroundColor: fgColor + "20" },
                        ]}
                      >
                        <RecIcon size={14} color={fgColor} strokeWidth={2} />
                      </View>
                      <Text style={[styles.recText, { color: "#1E293B" }]}>
                        {rec.text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  termCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  termHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 0,
  },
  termHeaderAccent: {
    width: 4,
    height: "100%",
    minHeight: 48,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  termTitleBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  termTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  termYear: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  latestBadge: {
    backgroundColor: "#4F46E5",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  latestBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  termBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  avgBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  avgBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  recList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  recItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    padding: 12,
  },
  recIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  recText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
    fontWeight: "500",
  },
});

export default TermRecommendations;
