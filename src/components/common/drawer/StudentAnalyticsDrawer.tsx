import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  RefreshControl,
  Image,
  ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  X,
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  CalendarCheck,
  Sparkles,
  Route,
  Trophy,
  GraduationCap,
  FileText,
  ChevronRight,
  RefreshCw,
  TrendingDown,
  BookMarked,
  WifiOff,
  BarChart3,
  CalendarCheck2,
} from "lucide-react-native";
import { useGetStudentInsightsQuery } from "../../../api/student-management-api";
import AcademicPerformanceChart from "../../analytics/AcademicPerformanceChart";
import SubjectPerformanceChart from "../../analytics/SubjectPerformanceChart";
import AttendanceAnalyticsChart from "../../analytics/AttendanceAnalyticsChart";
import TermRecommendations from "../../analytics/TermRecommendations";
import StudentJourneyTimeline from "../../analytics/StudentJourneyTimeline";
import ReportCardsDrawer from "./ReportCardsDrawer";
import { MAROON, MAROON_DARK } from "../../analytics/analyticsTheme";

interface StudentAnalyticsDrawerProps {
  onClose: () => void;
  studentId?: number;
  studentName?: string;
  studentImage?: ImageSourcePropType;
}

type TabKey =
  | "overview"
  | "academic"
  | "subjects"
  | "attendance"
  | "recommendations"
  | "journey";

type IconProps = { size: number; color: string; strokeWidth?: number };
type IconComponent = (props: IconProps) => React.ReactElement;

const TAB_ICONS: Record<TabKey, IconComponent> = {
  overview: (p) => <LayoutDashboard {...p} />,
  academic: (p) => <TrendingUp {...p} />,
  subjects: (p) => <BookOpen {...p} />,
  attendance: (p) => <CalendarCheck {...p} />,
  recommendations: (p) => <Sparkles {...p} />,
  journey: (p) => <Route {...p} />,
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "academic", label: "Performance" },
  { key: "subjects", label: "Subjects" },
  { key: "attendance", label: "Attendance" },
  { key: "recommendations", label: "Insights" },
  { key: "journey", label: "Journey" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Pulsing placeholder block used by the overview skeleton while insights load
const SkeletonBlock: React.FC<{
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
}> = ({ width, height, borderRadius = 8, style }) => {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "rgba(255,255,255,0.35)",
          opacity: pulse,
        },
        style,
      ]}
    />
  );
};

const OverviewSkeleton: React.FC = () => (
  <View style={styles.overviewScroll}>
    <View style={[styles.snapshotCard, { backgroundColor: MAROON }]}>
      <SkeletonBlock width={110} height={11} borderRadius={4} />
      <View style={[styles.snapshotStatsRow, { marginTop: 16 }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.snapshotStat}>
            <SkeletonBlock width={54} height={22} borderRadius={6} />
            <View style={{ marginTop: 6 }}>
              <SkeletonBlock width={44} height={9} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
    <View style={styles.statPillsRow}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.statPill, { borderTopColor: "#E5E7EB" }]}>
          <SkeletonBlock
            width={20}
            height={20}
            borderRadius={10}
            style={{ backgroundColor: "#E5E7EB" }}
          />
          <SkeletonBlock
            width={32}
            height={14}
            style={{ backgroundColor: "#E5E7EB" }}
          />
          <SkeletonBlock
            width={28}
            height={8}
            style={{ backgroundColor: "#F3F4F6" }}
          />
        </View>
      ))}
    </View>
  </View>
);

const StudentAnalyticsDrawer: React.FC<StudentAnalyticsDrawerProps> = ({
  onClose,
  studentId,
  studentName = "Student",
  studentImage,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [showReportCards, setShowReportCards] = useState(false);

  const hasStudent = !!studentId && studentId > 0;

  const {
    data: insightsData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetStudentInsightsQuery(
    { student_id: studentId! },
    { skip: !hasStudent },
  );

  const handlePullToRefresh = () => {
    if (hasStudent) refetch();
  };

  const insights = insightsData?.data;
  const examReports = useMemo(
    () => insights?.student_mark_subject_list ?? [],
    [insights],
  );
  const subjectWise = useMemo(
    () => insights?.subject_wise_performance ?? [],
    [insights],
  );
  const termList = useMemo(() => insights?.term_list ?? [], [insights]);
  const attendanceSummary = useMemo(
    () => insights?.attendance_summary ?? [],
    [insights],
  );

  // ── Derive unique academic years directly from exam school_year (most reliable)
  const academicYears = useMemo(() => {
    const years = new Set<string>();
    // Primary: use school_year field directly from exam reports
    examReports.forEach((r: any) => {
      const yr = r.scheduling_examination?.term?.school_year;
      if (yr && String(yr).trim()) years.add(String(yr).trim());
    });
    // Fallback: parse from term_list labels if no school_year available
    if (years.size === 0) {
      termList.forEach((t: string) => {
        const m = t.match(/^(\d{4})/);
        if (m) years.add(m[1]);
      });
    }
    return [...years].sort().reverse(); // newest first
  }, [examReports, termList]);

  // ── Reset selection when year list changes (e.g. new student loaded)
  useEffect(() => {
    if (academicYears.length > 0) {
      setSelectedYear(academicYears[0]);
    } else {
      setSelectedYear("");
    }
  }, [academicYears]);

  const effectiveYear = selectedYear || academicYears[0] || "";

  // ── Filter exams by selected school_year
  const filteredExams = useMemo(() => {
    if (!effectiveYear) return examReports;
    const f = examReports.filter(
      (r: any) =>
        String(r.scheduling_examination?.term?.school_year ?? "").trim() ===
        effectiveYear,
    );
    return f.length > 0 ? f : examReports;
  }, [examReports, effectiveYear]);

  // ── Derive term labels that belong to filteredExams, preserving backend order
  const filteredTerms = useMemo(() => {
    if (!effectiveYear || filteredExams === examReports) return termList;
    // Build the set of term labels generated by the filtered exams
    const labelSet = new Set<string>();
    filteredExams.forEach((r: any) => {
      const term = r.scheduling_examination?.term;
      if (!term) return;
      const sy = String(term.school_year ?? "").trim();
      const tn = String(term.name ?? "").trim();
      const label = sy && !tn.includes(sy) ? `${sy} - ${tn}` : tn;
      const finalLabel =
        label.trim() && label.trim() !== "-"
          ? label.trim()
          : (r.scheduling_examination?.exam_title ?? "");
      if (finalLabel) labelSet.add(finalLabel);
    });
    const filtered = termList.filter((t) => labelSet.has(t));
    return filtered.length > 0 ? filtered : termList;
  }, [effectiveYear, filteredExams, examReports, termList]);

  // ── Year statistics
  const latestFilteredExam =
    filteredExams.length > 0 ? filteredExams[filteredExams.length - 1] : null;
  const yearAvg =
    filteredExams.length > 0
      ? filteredExams.reduce(
          (s: number, r: any) => s + Number(r.student_average ?? 0),
          0,
        ) / filteredExams.length
      : null;
  const classRank = latestFilteredExam?.class_rank ?? null;
  const classRankTermLabel = useMemo(() => {
    if (!latestFilteredExam) return "";
    const term = latestFilteredExam.scheduling_examination?.term;
    if (!term)
      return latestFilteredExam.scheduling_examination?.exam_title ?? "";
    const sy = String(term.school_year ?? "").trim();
    const tn = String(term.name ?? "").trim();
    const label = sy && !tn.includes(sy) ? `${sy} - ${tn}` : tn;
    const finalLabel =
      label.trim() && label.trim() !== "-"
        ? label.trim()
        : (latestFilteredExam.scheduling_examination?.exam_title ?? "");
    return finalLabel.replace(`${effectiveYear} - `, "");
  }, [latestFilteredExam, effectiveYear]);

  // ── Previous year comparison
  const prevYear = effectiveYear ? String(Number(effectiveYear) - 1) : "";
  const prevYearExams = examReports.filter(
    (r: any) => r.scheduling_examination?.term?.school_year === prevYear,
  );
  const prevYearAvg =
    prevYearExams.length > 0
      ? prevYearExams.reduce(
          (s: number, r: any) => s + Number(r.student_average ?? 0),
          0,
        ) / prevYearExams.length
      : null;
  const yearDelta =
    yearAvg != null && prevYearAvg != null ? yearAvg - prevYearAvg : null;

  // ── Attendance
  const totalPresent = attendanceSummary.reduce(
    (s: number, a: any) => s + (a.present ?? 0),
    0,
  );
  const totalAbsent = attendanceSummary.reduce(
    (s: number, a: any) => s + (a.absent ?? 0),
    0,
  );
  const attendanceRate =
    totalPresent + totalAbsent > 0
      ? ((totalPresent / (totalPresent + totalAbsent)) * 100).toFixed(0)
      : null;

  // ── Best / worst subject for selected year
  const subjectYearAverages = useMemo(() => {
    return subjectWise.map((subj: any) => {
      const yearMarks = subj.marks.filter((m: any) =>
        filteredTerms.includes(m.term),
      );
      const validMarks = yearMarks
        .map((m: any) => Number(m.mark ?? 0))
        .filter((v: number) => v > 0);
      const avg =
        validMarks.length > 0
          ? validMarks.reduce((a: number, b: number) => a + b, 0) /
            validMarks.length
          : 0;
      return { name: subj.name, avg, status: subj.status };
    });
  }, [subjectWise, filteredTerms]);

  const sortedSubjects = [...subjectYearAverages].sort((a, b) => b.avg - a.avg);
  const bestSubject = sortedSubjects[0] ?? null;
  const worstSubject =
    sortedSubjects.length > 1
      ? sortedSubjects[sortedSubjects.length - 1]
      : null;

  // ─────────────────────────────────────────────────────────────────
  //  RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────

  const renderYearBar = () => {
    // Always show the bar when we have a student — show chips once data loads
    if (!hasStudent) return null;
    return (
      <View style={styles.yearBar}>
        <View style={styles.yearBarLeft}>
          <CalendarCheck2 size={14} color={MAROON} strokeWidth={2} />
          <Text style={styles.yearBarLabel}>Academic Year</Text>
        </View>
        {isLoading ? (
          <View style={styles.yearBarLoading}>
            <ActivityIndicator size="small" color={MAROON} />
          </View>
        ) : academicYears.length === 0 ? (
          <View style={styles.yearBarEmpty}>
            <Text style={styles.yearBarEmptyText}>No data yet</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.yearChipsRow}
          >
            {academicYears.map((year) => {
              const isActive = year === effectiveYear;
              return (
                <TouchableOpacity
                  key={year}
                  style={[styles.yearChip, isActive && styles.yearChipActive]}
                  onPress={() => setSelectedYear(year)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.yearChipText,
                      isActive && styles.yearChipTextActive,
                    ]}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderHeader = () => {
    const initials = getInitials(studentName);
    const className =
      insights?.student_data?.grade_level_class?.name ?? "Student";

    return (
      <LinearGradient
        colors={[MAROON, MAROON_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Decorative circles */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        {/* Top row: close + title + spacer */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerScreenTitle}>Student Analytics</Text>
          <View style={styles.closeBtnSpacer} />
        </View>

        {/* Student info row */}
        {hasStudent && (
          <View style={styles.studentInfoRow}>
            {studentImage ? (
              <Image source={studentImage} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.studentInfoText}>
              <Text style={styles.studentNameText} numberOfLines={1}>
                {studentName}
              </Text>
              <View style={styles.classBadge}>
                <GraduationCap size={11} color="rgba(255,255,255,0.85)" />
                <Text style={styles.classBadgeText}>{className}</Text>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>
    );
  };

  const renderBottomTabBar = () => (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = TAB_ICONS[tab.key];
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabBtn}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <View
              style={[styles.tabIconWrapper, isActive && styles.tabIconActive]}
            >
              <Icon
                size={18}
                color={isActive ? "#FFFFFF" : "#9CA3AF"}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
            </View>
            <Text
              style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderStateView = () => {
    if (!hasStudent) {
      return (
        <View style={styles.centeredState}>
          <View style={styles.stateIconRing}>
            <GraduationCap size={44} color={MAROON} />
          </View>
          <Text style={styles.stateTitle}>No Student Selected</Text>
          <Text style={styles.stateSubtitle}>
            Select a student from the profile header to view their analytics
            dashboard.
          </Text>
        </View>
      );
    }
    if (isLoading) {
      return <OverviewSkeleton />;
    }
    if (isError || !insights) {
      return (
        <View style={styles.centeredState}>
          <View style={[styles.stateIconRing, { backgroundColor: "#FEE2E2" }]}>
            <WifiOff size={40} color="#EF4444" />
          </View>
          <Text style={styles.stateTitle}>Could Not Load Data</Text>
          <Text style={styles.stateSubtitle}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (examReports.length === 0 && attendanceSummary.length === 0) {
      return (
        <View style={styles.centeredState}>
          <View style={styles.stateIconRing}>
            <BarChart3 size={44} color={MAROON} />
          </View>
          <Text style={styles.stateTitle}>No Data Yet</Text>
          <Text style={styles.stateSubtitle}>
            Academic data will appear once exams and attendance records are
            available.
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderOverview = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.overviewScroll}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={handlePullToRefresh}
          tintColor={MAROON}
          colors={[MAROON]}
        />
      }
    >
      {/* Year Snapshot Hero */}
      <LinearGradient
        colors={[MAROON, "#B8355A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.snapshotCard}
      >
        <View style={styles.snapshotDecor} />
        <Text style={styles.snapshotYear}>{effectiveYear} Academic Year</Text>
        <View style={styles.snapshotStatsRow}>
          <View style={styles.snapshotStat}>
            <Text style={styles.snapshotStatValue}>
              {yearAvg != null ? `${yearAvg.toFixed(1)}%` : "—"}
            </Text>
            <Text style={styles.snapshotStatLabel}>Avg Score</Text>
          </View>
          <View style={styles.snapshotDivider} />
          <View style={styles.snapshotStat}>
            <Text style={styles.snapshotStatValue}>
              {classRank != null ? `#${classRank}` : "—"}
            </Text>
            <Text style={styles.snapshotStatLabel}>
              Class Rank{classRankTermLabel ? ` · ${classRankTermLabel}` : ""}
            </Text>
          </View>
          <View style={styles.snapshotDivider} />
          <View style={styles.snapshotStat}>
            <Text style={styles.snapshotStatValue}>
              {attendanceRate != null ? `${attendanceRate}%` : "—"}
            </Text>
            <Text style={styles.snapshotStatLabel}>Attendance</Text>
          </View>
        </View>

        {/* Year comparison */}
        {yearDelta != null && (
          <View style={styles.snapshotTrendRow}>
            {yearDelta >= 0 ? (
              <TrendingUp size={14} color="rgba(255,255,255,0.9)" />
            ) : (
              <TrendingDown size={14} color="rgba(255,255,255,0.9)" />
            )}
            <Text style={styles.snapshotTrendText}>
              {yearDelta >= 0 ? "+" : ""}
              {yearDelta.toFixed(1)}% vs {prevYear}
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* Stat Pills Row */}
      <View style={styles.statPillsRow}>
        <View style={[styles.statPill, { borderTopColor: MAROON }]}>
          <Trophy size={20} color="#F59E0B" strokeWidth={1.8} />
          <Text style={styles.statPillValue}>
            {bestSubject?.avg != null ? `${bestSubject.avg.toFixed(0)}%` : "—"}
          </Text>
          <Text style={styles.statPillLabel}>Best</Text>
        </View>
        <View style={[styles.statPill, { borderTopColor: "#10B981" }]}>
          <CalendarCheck2 size={20} color="#10B981" strokeWidth={1.8} />
          <Text style={[styles.statPillValue, { color: "#10B981" }]}>
            {attendanceRate != null ? `${attendanceRate}%` : "—"}
          </Text>
          <Text style={styles.statPillLabel}>Attend</Text>
        </View>
        <View style={[styles.statPill, { borderTopColor: "#2563EB" }]}>
          <BookMarked size={20} color="#2563EB" strokeWidth={1.8} />
          <Text style={[styles.statPillValue, { color: "#2563EB" }]}>
            {subjectWise.length}
          </Text>
          <Text style={styles.statPillLabel}>Subjects</Text>
        </View>
      </View>

      {/* Subject Spotlight */}
      {(bestSubject || worstSubject) && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View
              style={[styles.sectionCardAccent, { backgroundColor: "#F59E0B" }]}
            />
            <Trophy size={16} color="#F59E0B" />
            <Text style={styles.sectionCardTitle}>Subject Spotlight</Text>
          </View>

          {bestSubject && bestSubject.avg > 0 && (
            <View style={styles.spotlightRow}>
              <View
                style={[styles.spotlightBadge, { backgroundColor: "#D1FAE5" }]}
              >
                <TrendingUp size={12} color="#059669" />
              </View>
              <View style={styles.spotlightInfo}>
                <Text style={styles.spotlightLabel}>Best Subject</Text>
                <Text style={styles.spotlightName}>{bestSubject.name}</Text>
              </View>
              <View style={styles.spotlightRight}>
                <Text style={[styles.spotlightPct, { color: "#059669" }]}>
                  {bestSubject.avg.toFixed(0)}%
                </Text>
                <View style={styles.spotlightBar}>
                  <View
                    style={[
                      styles.spotlightBarFill,
                      {
                        width: `${Math.min(bestSubject.avg, 100)}%` as any,
                        backgroundColor: "#059669",
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          )}

          {worstSubject && worstSubject.avg > 0 && (
            <View style={[styles.spotlightRow, { marginTop: 10 }]}>
              <View
                style={[styles.spotlightBadge, { backgroundColor: "#FEE2E2" }]}
              >
                <TrendingDown size={12} color="#DC2626" />
              </View>
              <View style={styles.spotlightInfo}>
                <Text style={styles.spotlightLabel}>Needs Focus</Text>
                <Text style={styles.spotlightName}>{worstSubject.name}</Text>
              </View>
              <View style={styles.spotlightRight}>
                <Text style={[styles.spotlightPct, { color: "#DC2626" }]}>
                  {worstSubject.avg.toFixed(0)}%
                </Text>
                <View style={styles.spotlightBar}>
                  <View
                    style={[
                      styles.spotlightBarFill,
                      {
                        width: `${Math.min(worstSubject.avg, 100)}%` as any,
                        backgroundColor: "#EF4444",
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Term Summary for selected year */}
      {filteredTerms.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View
              style={[styles.sectionCardAccent, { backgroundColor: "#6366F1" }]}
            />
            <CalendarCheck size={16} color="#6366F1" />
            <Text style={styles.sectionCardTitle}>
              {effectiveYear} Terms ({filteredTerms.length})
            </Text>
          </View>
          {filteredTerms.map((term, idx) => {
            const examForTerm = filteredExams.find((r: any) => {
              const t = r.scheduling_examination?.term;
              if (!t) return false;
              const label =
                t.school_year && !t.name.includes(t.school_year)
                  ? `${t.school_year} - ${t.name}`
                  : t.name;
              return label.trim() === term.trim();
            });
            const avg = examForTerm?.student_average
              ? Number(examForTerm.student_average)
              : null;
            const rank = examForTerm?.class_rank ?? null;
            return (
              <View
                key={term}
                style={[
                  styles.termRow,
                  idx < filteredTerms.length - 1 && styles.termRowBorder,
                ]}
              >
                <View style={styles.termDot} />
                <Text style={styles.termName} numberOfLines={1}>
                  {term.replace(`${effectiveYear} - `, "")}
                </Text>
                <View style={styles.termMeta}>
                  {avg != null && (
                    <Text style={styles.termAvg}>{avg.toFixed(1)}%</Text>
                  )}
                  {rank != null && (
                    <View style={styles.termRankBadge}>
                      <Text style={styles.termRankText}>#{rank}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Report Cards CTA */}
      <TouchableOpacity
        style={styles.reportCardsBtn}
        onPress={() => setShowReportCards(true)}
        activeOpacity={0.85}
      >
        <View style={styles.reportCardsBtnIcon}>
          <FileText size={20} color={MAROON} strokeWidth={1.8} />
        </View>
        <View style={styles.reportCardsBtnBody}>
          <Text style={styles.reportCardsBtnTitle}>View Report Cards</Text>
          <Text style={styles.reportCardsBtnSub}>
            Download academic performance reports
          </Text>
        </View>
        <ChevronRight size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderSectionWrapper = (
    title: string,
    subtitle: string,
    accentColor: string,
    IconEl: IconComponent,
    children: React.ReactNode,
  ) => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.sectionScroll}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={handlePullToRefresh}
          tintColor={MAROON}
          colors={[MAROON]}
        />
      }
    >
      <View style={styles.sectionHeaderRow}>
        <View
          style={[
            styles.sectionIconCircle,
            { backgroundColor: accentColor + "18" },
          ]}
        >
          <IconEl size={22} color={accentColor} />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.sectionContentCard}>{children}</View>
    </ScrollView>
  );

  const renderTabContent = () => {
    const stateView = renderStateView();
    if (stateView) return stateView;

    switch (activeTab) {
      case "overview":
        return renderOverview();

      case "academic":
        return renderSectionWrapper(
          "Academic Performance",
          `Term-wise results · ${effectiveYear}`,
          MAROON,
          (p) => <TrendingUp {...p} />,
          <AcademicPerformanceChart
            examReports={filteredExams}
            selectedYear={effectiveYear}
          />,
        );

      case "subjects":
        return renderSectionWrapper(
          "Subject Performance",
          `Select a subject · ${effectiveYear}`,
          "#2563EB",
          (p) => <BookOpen {...p} />,
          <SubjectPerformanceChart
            subjects={subjectWise}
            termList={termList}
            filteredTerms={filteredTerms}
          />,
        );

      case "attendance":
        return renderSectionWrapper(
          "Attendance Analysis",
          "Presence and absence by term",
          "#10B981",
          (p) => <CalendarCheck {...p} />,
          <AttendanceAnalyticsChart
            attendanceSummary={attendanceSummary}
            selectedYear={effectiveYear}
          />,
        );

      case "recommendations":
        return renderSectionWrapper(
          "Smart Insights",
          `AI-generated study tips · ${effectiveYear}`,
          "#7C3AED",
          (p) => <Sparkles {...p} />,
          <TermRecommendations
            subjectWisePerformance={subjectWise}
            termList={filteredTerms}
            attendanceSummary={attendanceSummary}
            examReports={filteredExams}
          />,
        );

      case "journey":
        return renderSectionWrapper(
          "Academic Journey",
          "All academic years · scroll to explore",
          "#F59E0B",
          (p) => <Route {...p} />,
          <StudentJourneyTimeline examReports={examReports} />,
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderYearBar()}
      <View style={styles.contentArea}>{renderTabContent()}</View>
      {renderBottomTabBar()}

      <Modal
        visible={showReportCards}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowReportCards(false)}
      >
        <ReportCardsDrawer onClose={() => setShowReportCards(false)} />
      </Modal>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F3F8",
  },

  // ── Header / Hero
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 18,
    overflow: "hidden",
  },
  decorCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -60,
    right: -60,
  },
  decorCircle2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -40,
    left: -40,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnSpacer: {
    width: 34,
  },
  headerScreenTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.4,
  },
  studentInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  studentInfoText: {
    flex: 1,
  },
  studentNameText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  classBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  classBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.88)",
  },

  // ── Dedicated Year Selector Bar (below header)
  yearBar: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
  yearBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  yearBarLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: MAROON,
    letterSpacing: 0.2,
  },
  yearChipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  yearChipActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
    shadowColor: MAROON,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  yearChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  yearChipTextActive: {
    color: "#FFFFFF",
  },
  yearBarLoading: {
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  yearBarEmpty: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },
  yearBarEmptyText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },

  // ── Bottom Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 26 : 12,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  tabIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tabIconActive: {
    backgroundColor: MAROON,
    shadowColor: MAROON,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: MAROON,
    fontWeight: "700",
  },

  // ── Content area
  contentArea: {
    flex: 1,
  },

  // ── Centered state (loading / error / empty)
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  stateIconRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(146,7,52,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  stateSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 21,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: MAROON,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 24,
    marginTop: 4,
    shadowColor: MAROON,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  // ── Overview tab
  overviewScroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },

  // Snapshot hero card
  snapshotCard: {
    borderRadius: 22,
    padding: 20,
    overflow: "hidden",
    shadowColor: MAROON,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  snapshotDecor: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -50,
    right: -50,
  },
  snapshotYear: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  snapshotStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 14,
  },
  snapshotStat: {
    alignItems: "center",
  },
  snapshotStatValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  snapshotStatLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    fontWeight: "500",
    marginTop: 3,
  },
  snapshotDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  snapshotTrendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  snapshotTrendText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.92)",
  },

  // Stat pills row
  statPillsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statPill: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    gap: 5,
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  statPillValue: {
    fontSize: 17,
    fontWeight: "800",
    color: MAROON,
  },
  statPillLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Section card
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionCardAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  // Subject spotlight
  spotlightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  spotlightBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  spotlightInfo: {
    flex: 1,
  },
  spotlightLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  spotlightName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 1,
  },
  spotlightRight: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 60,
  },
  spotlightPct: {
    fontSize: 16,
    fontWeight: "800",
  },
  spotlightBar: {
    width: 60,
    height: 5,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  spotlightBarFill: {
    height: 5,
    borderRadius: 3,
  },

  // Term summary
  termRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  termRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  termDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MAROON,
  },
  termName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  termMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  termAvg: {
    fontSize: 13,
    fontWeight: "700",
    color: MAROON,
  },
  termRankBadge: {
    backgroundColor: "#EDE9FE",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  termRankText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED",
  },

  // Report cards button
  reportCardsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(146,7,52,0.15)",
    shadowColor: MAROON,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reportCardsBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(146,7,52,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  reportCardsBtnBody: {
    flex: 1,
  },
  reportCardsBtnTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  reportCardsBtnSub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  // ── Section tab layout
  sectionScroll: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  sectionIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "500",
  },
  sectionContentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
});

export default StudentAnalyticsDrawer;
