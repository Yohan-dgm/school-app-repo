import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LineChart, BarChart } from "react-native-gifted-charts";
import {
  Route,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Medal,
  GraduationCap,
  BarChart3,
  TrendingUp as AvgIcon,
  Crown,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { MAROON, NEUTRAL_COLORS, getPerformanceColor } from "./analyticsTheme";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface SubjectMarkItem {
  id: number;
  student_mark: number | null;
  subject_average: number | null;
  subject_rank: number | null;
  subject: { id: number; name: string } | null;
}

interface ExamReportItem {
  id: number;
  student_average: number | null;
  aggregate_of_mark: number | null;
  class_rank: number | null;
  class_average: number | null;
  total_mark: number | null;
  passing_marks: number | null;
  scheduling_examination: {
    id: number;
    exam_title: string;
    term: { id: number; name: string; school_year: string } | null;
  } | null;
  student_subject_mark_list?: SubjectMarkItem[];
}

interface StudentJourneyTimelineProps {
  examReports: ExamReportItem[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 80;
// Temporarily hidden — student_subject_mark_list shape from the insights API
// hasn't been confirmed yet (see console.warn diagnostic below). Flip back to
// true once the field mapping is verified against the real backend response.
const SHOW_SUBJECT_BREAKDOWN = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortTermLabel(r: ExamReportItem): string {
  const name = r.scheduling_examination?.term?.name ?? "";
  const title = r.scheduling_examination?.exam_title ?? "";
  return (name || title).replace(/term\s*/i, "T").slice(0, 6);
}

function fullTermLabel(r: ExamReportItem): string {
  const name = r.scheduling_examination?.term?.name ?? "";
  const title = r.scheduling_examination?.exam_title ?? "";
  return name || title || "Exam";
}

function getPerformanceLabel(avg: number): string {
  if (avg >= 80) return "Excellent";
  if (avg >= 65) return "Good";
  if (avg >= 50) return "Average";
  return "Needs Improvement";
}

function getRankColor(rank: number | null): string {
  if (rank == null) return NEUTRAL_COLORS.classAverage;
  if (rank <= 3) return "#059669";
  if (rank <= 10) return "#2563EB";
  return "#D97706";
}

function getTrendIcon(
  current: number,
  previous: number | null,
): React.ReactElement {
  if (previous == null) return <Minus size={14} color="#94A3B8" />;
  if (current > previous + 1)
    return <TrendingUp size={14} color="#059669" strokeWidth={2} />;
  if (current < previous - 1)
    return <TrendingDown size={14} color="#DC2626" strokeWidth={2} />;
  return <Minus size={14} color="#D97706" strokeWidth={2} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const StudentJourneyTimeline: React.FC<StudentJourneyTimelineProps> = ({
  examReports,
}) => {
  const [chartMode, setChartMode] = useState<"avg" | "rank">("avg");
  // selectedTermIndex: 0 = newest term (shown first in the pill row)
  const [selectedTermIndex, setSelectedTermIndex] = useState(0);
  const [showSubjectBreakdown, setShowSubjectBreakdown] = useState(true);
  // Sort exams explicitly to ensure correct order regardless of backend order
  const sortedExams = useMemo(() => {
    return [...examReports].sort((a, b) => {
      const yearA = String(a.scheduling_examination?.term?.school_year ?? "");
      const yearB = String(b.scheduling_examination?.term?.school_year ?? "");
      if (yearA !== yearB) return yearA.localeCompare(yearB);

      const termA = String(a.scheduling_examination?.term?.name ?? "");
      const termB = String(b.scheduling_examination?.term?.name ?? "");
      if (termA !== termB) return termA.localeCompare(termB);

      return a.id - b.id;
    });
  }, [examReports]);

  // chronoExams: oldest → newest across ALL years (for charts: left=oldest, right=newest)
  const chronoExams = useMemo(() => [...sortedExams], [sortedExams]);

  // newestFirstExams: newest → oldest (for UI pill selector + card list)
  const newestFirstExams = useMemo(
    () => [...sortedExams].reverse(),
    [sortedExams],
  );

  const selectedExam =
    newestFirstExams[selectedTermIndex] ?? newestFirstExams[0];

  // ── Passing mark reference (% of total marks)
  const passingPct = useMemo(() => {
    const ref = chronoExams.find(
      (r) =>
        r.passing_marks != null && r.total_mark != null && r.total_mark > 0,
    );
    if (ref) return (Number(ref.passing_marks) / Number(ref.total_mark)) * 100;
    return 50;
  }, [chronoExams]);

  // ── Average line chart data — label includes year on first term of each year
  const avgLineData = useMemo(() => {
    let lastYear = "";
    return chronoExams.map((r) => {
      const year = r.scheduling_examination?.term?.school_year ?? "";
      const termShort = shortTermLabel(r);
      // Show year prefix on first term of each new year
      const isNewYear = year !== lastYear;
      if (isNewYear) lastYear = year;
      const label = isNewYear && year ? `${year}\n${termShort}` : termShort;
      return {
        value: Number(r.student_average ?? 0),
        label,
        dataPointText: `${Number(r.student_average ?? 0).toFixed(0)}`,
      };
    });
  }, [chronoExams]);

  const classAvgData = useMemo(
    () =>
      chronoExams.map((r) => ({
        value: Number(r.class_average ?? 0),
      })),
    [chronoExams],
  );

  // ── Rank bar chart data (inverted: tallest bar = best rank)
  const maxRank = useMemo(
    () =>
      Math.max(
        ...examReports
          .filter((r) => r.class_rank != null)
          .map((r) => r.class_rank!),
        1,
      ),
    [examReports],
  );

  const rankBarData = useMemo(() => {
    let lastYear = "";
    return chronoExams.map((r) => {
      const rank = r.class_rank;
      const invertedVal = rank != null ? maxRank - rank + 1 : 0;
      const color = getRankColor(rank);
      const year = r.scheduling_examination?.term?.school_year ?? "";
      const termShort = shortTermLabel(r);
      const isNewYear = year !== lastYear;
      if (isNewYear) lastYear = year;
      const label = isNewYear && year ? `${year}\n${termShort}` : termShort;
      return {
        value: invertedVal,
        actualRank: rank,
        label,
        frontColor: color,
        gradientColor: color + "55",
        topLabelComponent: () =>
          rank != null ? (
            <Text style={styles.rankBarTopLabel}>#{rank}</Text>
          ) : null,
      };
    });
  }, [chronoExams, maxRank]);

  // ── Summary stats (all years)
  const allAvgs = examReports
    .map((r) => Number(r.student_average ?? 0))
    .filter((v) => v > 0);
  const allRanks = examReports
    .filter((r) => r.class_rank != null)
    .map((r) => r.class_rank!);
  const bestAvg = allAvgs.length > 0 ? Math.max(...allAvgs) : null;
  const bestRank = allRanks.length > 0 ? Math.min(...allRanks) : null;

  // ── Subject breakdown for selected term
  // Note: student_subject_mark_list marks are already 0-100-scaled (same
  // scale as subject_average), so they are NOT a fraction of the exam's
  // aggregate total_mark — that field only applies to the exam-level
  // passing-mark reference above.
  const subjectMarks = selectedExam?.student_subject_mark_list ?? [];
  const sortedSubjects = [...subjectMarks].sort(
    (a, b) => Number(b.student_mark ?? 0) - Number(a.student_mark ?? 0),
  );

  // Diagnostic: the insights API types this field as `any[]`, so it has
  // never been formally verified against the backend response. If an exam
  // exists but carries no student_subject_mark_list, log its actual keys so
  // the real field name can be identified from the console instead of
  // guessing.
  useEffect(() => {
    if (selectedExam && subjectMarks.length === 0) {
      console.warn(
        "⚠️ StudentJourneyTimeline: selected exam has no student_subject_mark_list.",
        "Exam id:",
        selectedExam.id,
        "Available keys on exam object:",
        Object.keys(selectedExam),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam]);

  // ── Group by school year for timeline
  const grouped: Record<string, ExamReportItem[]> = {};
  examReports.forEach((r) => {
    const year = r.scheduling_examination?.term?.school_year ?? "Unknown";
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(r);
  });
  const years = Object.keys(grouped).sort().reverse();
  const globalNewestId =
    years.length > 0 && (grouped[years[0]] ?? []).length > 0
      ? [...(grouped[years[0]] ?? [])].reverse()[0]?.id
      : null;

  // ── Empty state guard (after all hooks)
  if (!examReports || examReports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Route size={40} color="#CBD5E1" />
        <Text style={styles.emptyText}>No exam history for this year</Text>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* ── Summary Strip ── */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <BarChart3 size={16} color={MAROON} strokeWidth={1.8} />
          <Text style={styles.summaryValue}>{examReports.length}</Text>
          <Text style={styles.summaryLabel}>Terms</Text>
        </View>
        {bestRank != null && (
          <View style={styles.summaryItem}>
            <Crown size={16} color="#F59E0B" strokeWidth={1.8} />
            <Text style={[styles.summaryValue, { color: "#F59E0B" }]}>
              #{bestRank}
            </Text>
            <Text style={styles.summaryLabel}>Best Rank</Text>
          </View>
        )}
        {bestAvg != null && (
          <View style={styles.summaryItem}>
            <Star size={16} color={MAROON} strokeWidth={1.8} />
            <Text style={[styles.summaryValue, { color: MAROON }]}>
              {bestAvg.toFixed(0)}%
            </Text>
            <Text style={styles.summaryLabel}>Best Avg</Text>
          </View>
        )}
        {passingPct != null && (
          <View style={styles.summaryItem}>
            <BookOpen size={16} color="#10B981" strokeWidth={1.8} />
            <Text style={[styles.summaryValue, { color: "#10B981" }]}>
              {passingPct.toFixed(0)}%
            </Text>
            <Text style={styles.summaryLabel}>Pass Mark</Text>
          </View>
        )}
      </View>

      {/* ── Journey Chart Card ── */}
      {examReports.length >= 1 && (
        <View style={styles.chartCard}>
          {/* Chart header: title + toggle */}
          <View style={styles.chartHeaderRow}>
            <View style={styles.chartTitleBlock}>
              <View style={styles.chartTitleAccent} />
              <Route size={15} color={MAROON} strokeWidth={2} />
              <Text style={styles.chartTitle}>Journey Chart</Text>
            </View>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.togglePill,
                  chartMode === "avg" && styles.togglePillActive,
                ]}
                onPress={() => setChartMode("avg")}
                activeOpacity={0.75}
              >
                <AvgIcon
                  size={12}
                  color={chartMode === "avg" ? "#FFFFFF" : "#64748B"}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.togglePillText,
                    chartMode === "avg" && styles.togglePillTextActive,
                  ]}
                >
                  Average
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.togglePill,
                  chartMode === "rank" && styles.togglePillActive,
                ]}
                onPress={() => setChartMode("rank")}
                activeOpacity={0.75}
              >
                <Medal
                  size={12}
                  color={chartMode === "rank" ? "#FFFFFF" : "#64748B"}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.togglePillText,
                    chartMode === "rank" && styles.togglePillTextActive,
                  ]}
                >
                  Rank
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Average Chart ── */}
          {chartMode === "avg" && (
            <View style={styles.chartWrapper}>
              {/* Legend */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendLine, { backgroundColor: MAROON }]}
                  />
                  <Text style={styles.legendText}>My Average</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendLine, { backgroundColor: "#CBD5E1" }]}
                  />
                  <Text style={styles.legendText}>Class Avg</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendLineDashed,
                      { backgroundColor: "#F59E0B" },
                    ]}
                  />
                  <Text style={styles.legendText}>Pass Mark</Text>
                </View>
              </View>

              {/* Passing mark reference overlay */}
              <View style={styles.chartContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <LineChart
                      data={avgLineData}
                      data2={classAvgData}
                      width={Math.max(CHART_WIDTH, avgLineData.length * 100)}
                      height={200}
                      spacing={100}
                      color={MAROON}
                      color2="#CBD5E1"
                      thickness={3}
                      thickness2={2}
                      dataPointsColor={MAROON}
                      dataPointsColor2="#CBD5E1"
                      dataPointsRadius={7}
                      dataPointsRadius2={5}
                      textColor={MAROON}
                      textFontSize={11}
                      hideRules={false}
                      rulesType="dashed"
                      rulesColor="#F1F5F9"
                      xAxisThickness={1}
                      yAxisThickness={0}
                      xAxisColor="#E2E8F0"
                      curved
                      isAnimated
                      animationDuration={1000}
                      areaChart
                      startFillColor={MAROON + "28"}
                      endFillColor={MAROON + "05"}
                      startOpacity={0.9}
                      endOpacity={0.1}
                      yAxisTextStyle={{ color: "#94A3B8", fontSize: 10 }}
                      xAxisLabelTextStyle={{
                        color: "#64748B",
                        fontSize: 10,
                        fontWeight: "600",
                        textAlign: "center",
                      }}
                      maxValue={100}
                      noOfSections={4}
                      initialSpacing={24}
                      endSpacing={24}
                      showDataPointLabelOnFocus
                      focusedDataPointRadius={9}
                      referenceLine1Config={{
                        color: "#F59E0B",
                        dashWidth: 6,
                        dashGap: 3,
                        thickness: 2,
                        labelText: `${passingPct.toFixed(0)}% Pass`,
                        labelTextStyle: {
                          color: "#92400E",
                          fontSize: 10,
                          fontWeight: "700",
                        },
                      }}
                      referenceLine1Position={passingPct}
                    />
                  </View>
                </ScrollView>
              </View>

              {/* Avg insight strip */}
              {avgLineData.length >= 2 &&
                (() => {
                  const first = avgLineData[0].value;
                  const last = avgLineData[avgLineData.length - 1].value;
                  const delta = last - first;
                  const rising = delta > 0;
                  return (
                    <View
                      style={[
                        styles.insightPill,
                        {
                          backgroundColor: rising ? "#D1FAE5" : "#FEE2E2",
                        },
                      ]}
                    >
                      {rising ? (
                        <TrendingUp size={13} color="#059669" />
                      ) : (
                        <TrendingDown size={13} color="#DC2626" />
                      )}
                      <Text
                        style={[
                          styles.insightText,
                          { color: rising ? "#065F46" : "#991B1B" },
                        ]}
                      >
                        {rising ? "+" : ""}
                        {delta.toFixed(1)}% overall trend
                      </Text>
                    </View>
                  );
                })()}
            </View>
          )}

          {/* ── Rank Chart ── */}
          {chartMode === "rank" && (
            <View style={styles.chartWrapper}>
              {/* Rank colour legend */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#059669" }]}
                  />
                  <Text style={styles.legendText}>Top 3</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#2563EB" }]}
                  />
                  <Text style={styles.legendText}>Top 10</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#D97706" }]}
                  />
                  <Text style={styles.legendText}>Other</Text>
                </View>
              </View>
              <Text style={styles.rankNote}>
                Taller bar = better rank · Labels show actual rank
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={rankBarData}
                  width={Math.max(CHART_WIDTH, rankBarData.length * 100)}
                  height={200}
                  barWidth={40}
                  spacing={60}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={1}
                  yAxisThickness={0}
                  xAxisColor="#E2E8F0"
                  yAxisTextStyle={{ color: "#94A3B8", fontSize: 10 }}
                  xAxisLabelTextStyle={{
                    color: "#64748B",
                    fontSize: 10,
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                  noOfSections={4}
                  maxValue={maxRank + 1}
                  isAnimated
                  animationDuration={900}
                  showGradient
                  initialSpacing={20}
                  endSpacing={20}
                />
              </ScrollView>

              {/* Best rank insight */}
              {bestRank != null && (
                <View
                  style={[styles.insightPill, { backgroundColor: "#EDE9FE" }]}
                >
                  <Crown size={13} color="#7C3AED" />
                  <Text style={[styles.insightText, { color: "#5B21B6" }]}>
                    Best ranking achieved: #{bestRank} overall
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Term Pill Selector ── */}
          <View style={styles.termSelectorSection}>
            <Text style={styles.termSelectorLabel}>Select Term</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.termPillsRow}
            >
              {newestFirstExams.map((exam, idx) => {
                const isActive = idx === selectedTermIndex;
                const avg = Number(exam.student_average ?? 0);
                const perfColor =
                  avg > 0 ? getPerformanceColor(avg) : "#94A3B8";
                return (
                  <TouchableOpacity
                    key={exam.id}
                    style={[
                      styles.termPill,
                      isActive && {
                        backgroundColor: MAROON,
                        borderColor: MAROON,
                      },
                    ]}
                    onPress={() => {
                      setSelectedTermIndex(idx);
                      setShowSubjectBreakdown(true);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.termPillText,
                        isActive && styles.termPillTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {fullTermLabel(exam).replace(/^\d{4}\s*-\s*/i, "")}
                    </Text>
                    {avg > 0 && (
                      <View
                        style={[
                          styles.termPillAvgDot,
                          {
                            backgroundColor: isActive
                              ? "rgba(255,255,255,0.5)"
                              : perfColor,
                          },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Subject Breakdown ── */}
          {SHOW_SUBJECT_BREAKDOWN && selectedExam && (
            <View style={styles.subjectBreakdownCard}>
              {/* Header */}
              <TouchableOpacity
                style={styles.subjectBreakdownHeader}
                onPress={() => setShowSubjectBreakdown((p) => !p)}
                activeOpacity={0.8}
              >
                <View style={styles.subjectBreakdownTitleRow}>
                  <BookOpen size={15} color="#4F46E5" strokeWidth={2} />
                  <Text style={styles.subjectBreakdownTitle}>
                    Subject Breakdown
                  </Text>
                  <View style={styles.termNameBadge}>
                    <Text style={styles.termNameBadgeText}>
                      {fullTermLabel(selectedExam).replace(
                        /^\d{4}\s*-\s*/i,
                        "",
                      )}
                    </Text>
                  </View>
                </View>
                <View style={styles.subjectBreakdownMeta}>
                  {selectedExam.student_average != null && (
                    <Text style={styles.subjectAvgLabel}>
                      Avg:{" "}
                      <Text style={styles.subjectAvgValue}>
                        {Number(selectedExam.student_average).toFixed(1)}%
                      </Text>
                    </Text>
                  )}
                  {selectedExam.class_rank != null && (
                    <View style={styles.rankBadgeSmall}>
                      <Medal size={10} color="#7C3AED" />
                      <Text style={styles.rankBadgeSmallText}>
                        #{selectedExam.class_rank}
                      </Text>
                    </View>
                  )}
                  {showSubjectBreakdown ? (
                    <ChevronUp size={16} color="#94A3B8" />
                  ) : (
                    <ChevronDown size={16} color="#94A3B8" />
                  )}
                </View>
              </TouchableOpacity>

              {/* Subject rows */}
              {showSubjectBreakdown && (
                <View style={styles.subjectList}>
                  {sortedSubjects.length === 0 ? (
                    <Text style={styles.noSubjectText}>
                      No subject marks available for this term.
                    </Text>
                  ) : (
                    sortedSubjects.map((subj, idx) => {
                      const mark = Number(subj.student_mark ?? 0);
                      const subjAvg = Number(subj.subject_average ?? 0);
                      const safePct = Math.min(mark, 100);
                      const markColor = getPerformanceColor(mark);
                      const isLast = idx === sortedSubjects.length - 1;

                      return (
                        <View
                          key={subj.id}
                          style={[
                            styles.subjectRow,
                            !isLast && styles.subjectRowBorder,
                          ]}
                        >
                          {/* Subject name + rank */}
                          {/* <View style={styles.subjectNameBlock}>
                            <Text style={styles.subjectName} numberOfLines={1}>
                              {subj.subject?.name ?? "Unknown"}
                            </Text>
                            {subj.subject_rank != null && (
                              <View style={styles.subjectRankBadge}>
                                <Text style={styles.subjectRankText}>
                                  #{subj.subject_rank}
                                </Text>
                              </View>
                            )}
                          </View> */}

                          {/* Progress bar + values */}
                          <View style={styles.subjectRight}>
                            <View style={styles.subjectBarRow}>
                              <View style={styles.subjectBarBg}>
                                <View
                                  style={[
                                    styles.subjectBarFill,
                                    {
                                      width: `${safePct}%` as any,
                                      backgroundColor: markColor,
                                    },
                                  ]}
                                />
                              </View>
                              <Text
                                style={[
                                  styles.subjectMark,
                                  { color: markColor },
                                ]}
                              >
                                {mark.toFixed(0)}%
                              </Text>
                            </View>
                            {subjAvg > 0 && (
                              <Text style={styles.subjClassAvgLabel}>
                                Class avg: {subjAvg.toFixed(0)}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* ── Divider ── */}
      <View style={styles.sectionDivider}>
        <View style={styles.sectionDividerLine} />
        <Text style={styles.sectionDividerText}>Term-by-Term Timeline</Text>
        <View style={styles.sectionDividerLine} />
      </View>

      {/* ── Timeline Cards (newest first) ── */}
      {years.map((year) => {
        const yearExams = [...(grouped[year] ?? [])].reverse();

        return (
          <View key={year}>
            <View style={styles.yearGroupHeader}>
              <GraduationCap size={14} color={MAROON} strokeWidth={2} />
              <Text style={styles.yearGroupTitle}>{year} Academic Year</Text>
              <View style={styles.yearGroupLine} />
            </View>

            {yearExams.map((report, index) => {
              const term = report.scheduling_examination?.term;
              const termName = term?.name ?? "";
              const examTitle =
                report.scheduling_examination?.exam_title ?? "Exam";
              const label = termName || examTitle;
              const shortLabel = label
                .replace(/term\s*/i, "Term ")
                .replace(/\s+/g, " ");

              const avg = Number(report.student_average ?? 0);
              const perfColor = avg > 0 ? getPerformanceColor(avg) : "#94A3B8";
              const perfLabel = avg > 0 ? getPerformanceLabel(avg) : "No data";
              const isLast = index === yearExams.length - 1;
              const isGlobalNewest = report.id === globalNewestId;

              const chronoPrev =
                index < yearExams.length - 1 ? yearExams[index + 1] : null;
              const prevAvg = chronoPrev
                ? Number(chronoPrev.student_average ?? 0)
                : null;

              return (
                <View key={report.id} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor: perfColor,
                          borderColor: perfColor + "33",
                        },
                      ]}
                    >
                      <Star size={10} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>

                  <View style={[styles.card, isLast && { marginBottom: 4 }]}>
                    {isGlobalNewest && (
                      <View style={styles.latestRow}>
                        <View style={styles.latestBadge}>
                          <Text style={styles.latestBadgeText}>
                            ● Latest Term
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.cardTopRow}>
                      <View style={styles.cardTitleBlock}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {shortLabel}
                        </Text>
                        <View
                          style={[
                            styles.perfBadge,
                            {
                              backgroundColor: perfColor + "18",
                              borderColor: perfColor + "40",
                            },
                          ]}
                        >
                          <Text
                            style={[styles.perfBadgeText, { color: perfColor }]}
                          >
                            {perfLabel}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.trendWrap}>
                        {getTrendIcon(avg, prevAvg)}
                      </View>
                    </View>

                    <View style={styles.statsRow}>
                      {avg > 0 && (
                        <View style={styles.statItem}>
                          <Text style={[styles.statValue, { color: MAROON }]}>
                            {avg.toFixed(1)}%
                          </Text>
                          <Text style={styles.statLabel}>Avg</Text>
                        </View>
                      )}
                      {report.class_average != null && (
                        <View style={styles.statItem}>
                          <Text
                            style={[styles.statValue, { color: "#64748B" }]}
                          >
                            {Number(report.class_average).toFixed(1)}%
                          </Text>
                          <Text style={styles.statLabel}>Class Avg</Text>
                        </View>
                      )}
                      {report.class_rank != null && (
                        <View style={styles.statItem}>
                          <View style={styles.rankWrap}>
                            <Medal size={12} color="#7C3AED" strokeWidth={2} />
                            <Text
                              style={[styles.statValue, { color: "#7C3AED" }]}
                            >
                              #{report.class_rank}
                            </Text>
                          </View>
                          <Text style={styles.statLabel}>Rank</Text>
                        </View>
                      )}
                      {report.aggregate_of_mark != null && (
                        <View style={styles.statItem}>
                          <Text
                            style={[styles.statValue, { color: "#374151" }]}
                          >
                            {report.aggregate_of_mark}
                          </Text>
                          <Text style={styles.statLabel}>Total</Text>
                        </View>
                      )}
                    </View>

                    {avg > 0 && (
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${Math.min(avg, 100)}%` as any,
                              backgroundColor: perfColor,
                            },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },

  // ── Summary strip
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: MAROON,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Chart card
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    gap: 14,
  },
  chartHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chartTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  chartTitleAccent: {
    width: 3,
    height: 16,
    backgroundColor: MAROON,
    borderRadius: 2,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  togglePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  togglePillActive: {
    backgroundColor: MAROON,
    shadowColor: MAROON,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  togglePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  togglePillTextActive: {
    color: "#FFFFFF",
  },

  // ── Chart wrapper
  chartWrapper: {
    gap: 10,
  },
  chartContainer: {
    overflow: "hidden",
  },
  legendRow: {
    flexDirection: "row",
    gap: 14,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendLine: {
    width: 18,
    height: 3,
    borderRadius: 2,
  },
  legendLineDashed: {
    width: 18,
    height: 2,
    borderRadius: 1,
    opacity: 0.7,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  rankNote: {
    fontSize: 11,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  rankBarTopLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 3,
  },
  insightPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  insightText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // ── Term selector
  termSelectorSection: {
    gap: 8,
  },
  termSelectorLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  termPillsRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 4,
  },
  termPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  termPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    maxWidth: 100,
  },
  termPillTextActive: {
    color: "#FFFFFF",
  },
  termPillAvgDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  // ── Subject breakdown
  subjectBreakdownCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  subjectBreakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 13,
  },
  subjectBreakdownTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  subjectBreakdownTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  termNameBadge: {
    backgroundColor: "#EDE9FE",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  termNameBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#5B21B6",
  },
  subjectBreakdownMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subjectAvgLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  subjectAvgValue: {
    fontWeight: "800",
    color: MAROON,
  },
  rankBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EDE9FE",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  rankBadgeSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED",
  },
  subjectList: {
    paddingHorizontal: 13,
    paddingBottom: 12,
    gap: 2,
  },
  noSubjectText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 16,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  subjectRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECF0",
  },
  subjectNameBlock: {
    width: 110,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  subjectName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    flex: 1,
  },
  subjectRankBadge: {
    backgroundColor: "#EDE9FE",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  subjectRankText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#7C3AED",
  },
  subjectRight: {
    flex: 1,
    gap: 3,
  },
  subjectBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subjectBarBg: {
    flex: 1,
    height: 7,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  subjectBarFill: {
    height: 7,
    borderRadius: 4,
  },
  subjectMark: {
    fontSize: 12,
    fontWeight: "800",
    minWidth: 50,
    textAlign: "right",
  },
  subjClassAvgLabel: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "500",
    textAlign: "right",
  },

  // ── Section divider
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 8,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  sectionDividerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // ── Year group header
  yearGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
    paddingLeft: 4,
  },
  yearGroupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: MAROON,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  yearGroupLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  // ── Timeline item
  timelineItem: {
    flexDirection: "row",
    gap: 14,
  },
  timelineLeft: {
    alignItems: "center",
    width: 28,
    paddingTop: 4,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#E2E8F0",
    marginVertical: 5,
    minHeight: 20,
  },

  // ── Card
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    gap: 10,
  },
  latestRow: {
    marginBottom: 2,
  },
  latestBadge: {
    alignSelf: "flex-start",
    backgroundColor: MAROON,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  latestBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 19,
  },
  perfBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  perfBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  trendWrap: {
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 14,
    flexWrap: "wrap",
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
  },
  rankWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 5,
    borderRadius: 3,
  },
});

export default StudentJourneyTimeline;
