import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { modernTheme } from "../../styles/modernTheme";
import { AnimatedCard } from "../ui/AnimatedCard";
import { PerformanceRing } from "../ui/PerformanceRing";
import { StudentExamData } from "../../types/student-exam";

interface ModernPerformanceSectionProps {
  data: StudentExamData;
}

const { width } = Dimensions.get("window");
const cardWidth = (width - 72) / 2; // Account for padding and gap

const ModernPerformanceSection: React.FC<ModernPerformanceSectionProps> = ({
  data,
}) => {
  // Calculate performance analytics
  const analytics = useMemo(() => {
    const examMarks = data?.student_exam_marks || [];
    const subjectMarks = data?.student_exam_subject_marks || [];
    const reports = data?.student_exam_reports || [];

    if (examMarks.length === 0) {
      return {
        overallAverage: 0,
        totalExams: 0,
        totalSubjects: 0,
        averageRank: 0,
        attendanceAverage: 0,
        performanceDistribution: { excellent: 0, good: 0, average: 0, poor: 0 },
        subjectPerformance: [],
        recentTrend: "stable",
      };
    }

    // Overall statistics
    const totalExams = examMarks.length;
    const overallAverage = Math.round(
      examMarks.reduce((sum, exam) => sum + (exam.percentage || 0), 0) /
        totalExams,
    );

    const validRanks = examMarks.filter((exam) => exam.rank > 0);
    const averageRank =
      validRanks.length > 0
        ? Math.round(
            validRanks.reduce((sum, exam) => sum + exam.rank, 0) /
              validRanks.length,
          )
        : 0;

    const attendanceAverage =
      reports.length > 0
        ? Math.round(
            reports.reduce(
              (sum, report) => sum + (report.attendance_percentage || 0),
              0,
            ) / reports.length,
          )
        : 0;

    // Performance distribution
    const performanceDistribution = {
      excellent: examMarks.filter((exam) => (exam.percentage || 0) >= 85)
        .length,
      good: examMarks.filter(
        (exam) => (exam.percentage || 0) >= 70 && (exam.percentage || 0) < 85,
      ).length,
      average: examMarks.filter(
        (exam) => (exam.percentage || 0) >= 55 && (exam.percentage || 0) < 70,
      ).length,
      poor: examMarks.filter((exam) => (exam.percentage || 0) < 55).length,
    };

    // Subject performance summary
    const subjectMap = new Map();
    subjectMarks.forEach((mark) => {
      const subject = mark.subject?.subject_name || "Unknown";
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { total: 0, count: 0 });
      }
      const current = subjectMap.get(subject);
      current.total += mark.percentage || 0;
      current.count += 1;
    });

    const subjectPerformance = Array.from(subjectMap.entries())
      .map(([name, data]) => ({
        name,
        average: Math.round(data.total / data.count),
        count: data.count,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 5); // Top 5 subjects

    // Recent trend (simplified)
    const recentExams = examMarks.slice(-3);
    const trend =
      recentExams.length >= 2
        ? recentExams[recentExams.length - 1].percentage >
          recentExams[0].percentage
          ? "improving"
          : recentExams[recentExams.length - 1].percentage <
              recentExams[0].percentage
            ? "declining"
            : "stable"
        : "stable";

    return {
      overallAverage,
      totalExams,
      totalSubjects: subjectMap.size,
      averageRank,
      attendanceAverage,
      performanceDistribution,
      subjectPerformance,
      recentTrend: trend,
    };
  }, [data]);

  const getTrendIcon = () => {
    switch (analytics.recentTrend) {
      case "improving":
        return { name: "trending-up", color: modernTheme.colors.success };
      case "declining":
        return { name: "trending-down", color: modernTheme.colors.error };
      default:
        return { name: "trending-flat", color: modernTheme.colors.warning };
    }
  };

  const trendIcon = getTrendIcon();

  if (analytics.totalExams === 0) {
    return (
      <View style={styles.container}>
        <AnimatedCard variant="glass" style={styles.emptyCard}>
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="analytics"
              size={48}
              color={modernTheme.colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>No Analytics Available</Text>
            <Text style={styles.emptySubtitle}>
              Performance analytics will appear here once exam data is available
            </Text>
          </View>
        </AnimatedCard>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Performance Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Overview</Text>

        <View style={styles.overviewGrid}>
          {/* Overall Performance Ring */}
          <AnimatedCard
            variant="gradient"
            style={[styles.performanceCard, styles.largeCard]}
          >
            <View style={styles.centerContent}>
              <PerformanceRing
                percentage={analytics.overallAverage}
                size={100}
                strokeWidth={10}
                label="Overall"
                delay={200}
              />
              <View style={styles.trendContainer}>
                <MaterialIcons
                  name={trendIcon.name as any}
                  size={16}
                  color={trendIcon.color}
                />
                <Text style={[styles.trendText, { color: trendIcon.color }]}>
                  {analytics.recentTrend}
                </Text>
              </View>
            </View>
          </AnimatedCard>

          {/* Stats Cards */}
          <View style={styles.statsColumn}>
            <AnimatedCard variant="solid" style={styles.statCard} delay={300}>
              <View style={styles.statContent}>
                <MaterialIcons
                  name="assignment"
                  size={20}
                  color={modernTheme.colors.primary}
                />
                <Text style={styles.statValue}>{analytics.totalExams}</Text>
                <Text style={styles.statLabel}>Exams</Text>
              </View>
            </AnimatedCard>

            <AnimatedCard variant="solid" style={styles.statCard} delay={400}>
              <View style={styles.statContent}>
                <MaterialIcons
                  name="subject"
                  size={20}
                  color={modernTheme.colors.secondary}
                />
                <Text style={styles.statValue}>{analytics.totalSubjects}</Text>
                <Text style={styles.statLabel}>Subjects</Text>
              </View>
            </AnimatedCard>
          </View>
        </View>

        {/* Additional Stats Row */}
        <View style={styles.additionalStats}>
          <AnimatedCard
            variant="glass"
            style={styles.additionalStatCard}
            delay={500}
          >
            <View style={styles.additionalStatContent}>
              <MaterialIcons
                name="emoji-events"
                size={18}
                color={modernTheme.colors.warning}
              />
              <Text style={styles.additionalStatValue}>
                #{analytics.averageRank}
              </Text>
              <Text style={styles.additionalStatLabel}>Avg Rank</Text>
            </View>
          </AnimatedCard>

          {analytics.attendanceAverage > 0 && (
            <AnimatedCard
              variant="glass"
              style={styles.additionalStatCard}
              delay={600}
            >
              <View style={styles.additionalStatContent}>
                <MaterialIcons
                  name="event-available"
                  size={18}
                  color={modernTheme.colors.success}
                />
                <Text style={styles.additionalStatValue}>
                  {analytics.attendanceAverage}%
                </Text>
                <Text style={styles.additionalStatLabel}>Attendance</Text>
              </View>
            </AnimatedCard>
          )}
        </View>
      </View>

      {/* Performance Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Distribution</Text>

        <AnimatedCard variant="solid" delay={700}>
          <View style={styles.distributionContent}>
            {Object.entries(analytics.performanceDistribution).map(
              ([level, count], index) => (
                <View key={level} style={styles.distributionItem}>
                  <View
                    style={[
                      styles.distributionBar,
                      {
                        backgroundColor:
                          level === "excellent"
                            ? modernTheme.colors.gradeA
                            : level === "good"
                              ? modernTheme.colors.gradeB
                              : level === "average"
                                ? modernTheme.colors.gradeC
                                : modernTheme.colors.gradeD,
                        height: Math.max(
                          20,
                          (count / analytics.totalExams) * 80,
                        ),
                      },
                    ]}
                  />
                  <Text style={styles.distributionLabel}>{level}</Text>
                  <Text style={styles.distributionCount}>{count}</Text>
                </View>
              ),
            )}
          </View>
        </AnimatedCard>
      </View>

      {/* Top Subjects */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performing Subjects</Text>

        <View style={styles.subjectsGrid}>
          {analytics.subjectPerformance.map((subject, index) => (
            <AnimatedCard
              key={subject.name}
              variant="solid"
              style={styles.subjectCard}
              delay={800 + index * 100}
            >
              <View style={styles.subjectContent}>
                <PerformanceRing
                  percentage={subject.average}
                  size={60}
                  strokeWidth={6}
                  showLabel={false}
                  delay={900 + index * 100}
                />
                <Text style={styles.subjectName} numberOfLines={2}>
                  {subject.name}
                </Text>
                <Text style={styles.subjectAverage}>{subject.average}%</Text>
                <Text style={styles.subjectCount}>{subject.count} exams</Text>
              </View>
            </AnimatedCard>
          ))}
        </View>
      </View>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: modernTheme.spacing.md,
  },

  section: {
    marginBottom: modernTheme.spacing.xxxl,
  },

  sectionTitle: {
    fontFamily: modernTheme.fonts.heading,
    fontSize: modernTheme.fontSizes.title,
    color: modernTheme.colors.primary,
    marginBottom: modernTheme.spacing.lg,
    textAlign: "center",
  },

  // Overview Grid
  overviewGrid: {
    flexDirection: "row",
    gap: modernTheme.spacing.md,
    marginBottom: modernTheme.spacing.lg,
  },

  performanceCard: {
    flex: 2,
    minHeight: 180,
  },

  largeCard: {
    padding: modernTheme.spacing.xl,
  },

  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },

  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: modernTheme.spacing.xs,
    marginTop: modernTheme.spacing.md,
  },

  trendText: {
    fontFamily: modernTheme.fonts.title,
    fontSize: modernTheme.fontSizes.small,
    textTransform: "capitalize",
  },

  // Stats Column
  statsColumn: {
    flex: 1,
    gap: modernTheme.spacing.md,
  },

  statCard: {
    flex: 1,
    padding: modernTheme.spacing.lg,
  },

  statContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },

  statValue: {
    fontFamily: modernTheme.fonts.heading,
    fontSize: modernTheme.fontSizes.heading,
    color: modernTheme.colors.text,
    marginTop: modernTheme.spacing.xs,
  },

  statLabel: {
    fontFamily: modernTheme.fonts.caption,
    fontSize: modernTheme.fontSizes.small,
    color: modernTheme.colors.textSecondary,
    marginTop: modernTheme.spacing.xs,
  },

  // Additional Stats
  additionalStats: {
    flexDirection: "row",
    gap: modernTheme.spacing.md,
  },

  additionalStatCard: {
    flex: 1,
    padding: modernTheme.spacing.md,
  },

  additionalStatContent: {
    alignItems: "center",
  },

  additionalStatValue: {
    fontFamily: modernTheme.fonts.title,
    fontSize: modernTheme.fontSizes.body,
    color: modernTheme.colors.text,
    marginTop: modernTheme.spacing.xs,
  },

  additionalStatLabel: {
    fontFamily: modernTheme.fonts.caption,
    fontSize: modernTheme.fontSizes.tiny,
    color: modernTheme.colors.textSecondary,
    marginTop: 2,
  },

  // Distribution
  distributionContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingVertical: modernTheme.spacing.lg,
    height: 120,
  },

  distributionItem: {
    alignItems: "center",
    flex: 1,
  },

  distributionBar: {
    width: 20,
    borderRadius: modernTheme.borderRadius.xs,
    marginBottom: modernTheme.spacing.sm,
  },

  distributionLabel: {
    fontFamily: modernTheme.fonts.caption,
    fontSize: modernTheme.fontSizes.tiny,
    color: modernTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 2,
  },

  distributionCount: {
    fontFamily: modernTheme.fonts.title,
    fontSize: modernTheme.fontSizes.small,
    color: modernTheme.colors.text,
  },

  // Subjects Grid
  subjectsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernTheme.spacing.md,
  },

  subjectCard: {
    width: cardWidth,
    padding: modernTheme.spacing.md,
  },

  subjectContent: {
    alignItems: "center",
  },

  subjectName: {
    fontFamily: modernTheme.fonts.title,
    fontSize: modernTheme.fontSizes.caption,
    color: modernTheme.colors.text,
    textAlign: "center",
    marginTop: modernTheme.spacing.sm,
    marginBottom: modernTheme.spacing.xs,
  },

  subjectAverage: {
    fontFamily: modernTheme.fonts.heading,
    fontSize: modernTheme.fontSizes.body,
    color: modernTheme.colors.primary,
  },

  subjectCount: {
    fontFamily: modernTheme.fonts.caption,
    fontSize: modernTheme.fontSizes.tiny,
    color: modernTheme.colors.textSecondary,
    marginTop: 2,
  },

  // Empty State
  emptyCard: {
    padding: modernTheme.spacing.xxxl,
  },

  emptyContainer: {
    alignItems: "center",
  },

  emptyTitle: {
    fontFamily: modernTheme.fonts.heading,
    fontSize: modernTheme.fontSizes.title,
    color: modernTheme.colors.textSecondary,
    marginTop: modernTheme.spacing.lg,
    textAlign: "center",
  },

  emptySubtitle: {
    fontFamily: modernTheme.fonts.bodyRegular,
    fontSize: modernTheme.fontSizes.caption,
    color: modernTheme.colors.textTertiary,
    marginTop: modernTheme.spacing.sm,
    textAlign: "center",
    lineHeight: 20,
  },

  // Bottom Spacing
  bottomSpacing: {
    height: modernTheme.spacing.xxxl,
  },
});

export default ModernPerformanceSection;
