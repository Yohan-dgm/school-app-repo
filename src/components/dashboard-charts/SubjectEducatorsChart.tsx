import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { MaterialIcons } from "@expo/vector-icons";
import { useGetAllTeachersWithPaginationQuery } from "../../api/teacher-api";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 40;

interface SubjectEducatorsChartProps {
  compact?: boolean;
}

interface SubjectData {
  subject: string;
  educatorCount: number;
  educators: string[];
  color: string;
  coverageLevel: "critical" | "adequate" | "good" | "overstaffed";
  riskLevel: "high" | "medium" | "low";
  recommendation?: string;
}

interface TeacherWorkload {
  teacherName: string;
  subjects: string[];
  subjectCount: number;
  workloadLevel: "light" | "normal" | "heavy";
  color: string;
}

interface StaffingInsights {
  totalTeachers: number;
  totalSubjects: number;
  averageSubjectsPerTeacher: number;
  criticalSubjects: number;
  overstaffedSubjects: number;
  heavyWorkloadTeachers: number;
  recommendations: string[];
}

const SubjectEducatorsChart: React.FC<SubjectEducatorsChartProps> = ({
  compact = true,
}) => {
  const [viewType, setViewType] = useState<"coverage" | "workload" | "risk">(
    "coverage",
  );
  const [selectedSubject, setSelectedSubject] = useState<SubjectData | null>(
    null,
  );
  const [selectedTeacher, setSelectedTeacher] =
    useState<TeacherWorkload | null>(null);

  // Fetch teachers data
  const teachersQuery = useGetAllTeachersWithPaginationQuery({
    page: 1,
    page_size: 100,
    search_phrase: "",
    search_filter_list: [],
  });

  // Aggressive data refresh on every component focus/navigation
  useFocusEffect(
    useCallback(() => {
      // Force fresh data fetch from backend on every navigation/focus
      console.log("🔄 SubjectEducatorsChart focused - forcing data refresh");
      teachersQuery.refetch();
    }, [teachersQuery.refetch]),
  );

  // Helper function to determine coverage level
  const getCoverageLevel = (
    educatorCount: number,
  ): {
    coverageLevel: SubjectData["coverageLevel"];
    riskLevel: SubjectData["riskLevel"];
    color: string;
    recommendation?: string;
  } => {
    if (educatorCount === 0) {
      return {
        coverageLevel: "critical",
        riskLevel: "high",
        color: "#D32F2F",
        recommendation: "Urgent: No assigned teacher - immediate hiring needed",
      };
    } else if (educatorCount === 1) {
      return {
        coverageLevel: "critical",
        riskLevel: "high",
        color: "#F44336",
        recommendation:
          "Critical: Only 1 teacher - backup needed for continuity",
      };
    } else if (educatorCount === 2) {
      return {
        coverageLevel: "adequate",
        riskLevel: "medium",
        color: "#FF9800",
        recommendation:
          "Adequate: Consider adding 1 more teacher for optimal coverage",
      };
    } else if (educatorCount >= 3 && educatorCount <= 4) {
      return {
        coverageLevel: "good",
        riskLevel: "low",
        color: "#4CAF50",
        recommendation: "Good: Well-staffed subject",
      };
    } else {
      return {
        coverageLevel: "overstaffed",
        riskLevel: "low",
        color: "#2196F3",
        recommendation:
          "Consider redistributing teachers to understaffed subjects",
      };
    }
  };

  // Process data for subjects with meaningful analysis
  const subjectData = useMemo(() => {
    if (!teachersQuery.data?.data?.teachers) return [];

    const subjectMap = new Map<string, Set<string>>();

    // Aggregate subjects and educators
    teachersQuery.data.data.teachers.forEach((teacher: any) => {
      const subjects = teacher.subjects || teacher.subject_names || [];
      const teacherName =
        teacher.full_name || teacher.full_name_with_title || "Unknown";

      subjects.forEach((subject: any) => {
        const subjectName =
          typeof subject === "string" ? subject : subject.name;
        if (subjectName) {
          if (!subjectMap.has(subjectName)) {
            subjectMap.set(subjectName, new Set());
          }
          subjectMap.get(subjectName)?.add(teacherName);
        }
      });
    });

    // Convert to chart data with analysis
    const subjectDataArray: SubjectData[] = Array.from(subjectMap.entries())
      .map(([subject, educators]) => {
        const educatorCount = educators.size;
        const analysis = getCoverageLevel(educatorCount);

        return {
          subject,
          educatorCount,
          educators: Array.from(educators),
          color: analysis.color,
          coverageLevel: analysis.coverageLevel,
          riskLevel: analysis.riskLevel,
          recommendation: analysis.recommendation,
        };
      })
      .sort((a, b) => {
        // Sort by risk level first (high risk first), then by educator count
        if (a.riskLevel !== b.riskLevel) {
          const riskOrder = { high: 0, medium: 1, low: 2 };
          return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        }
        return a.educatorCount - b.educatorCount;
      });

    return subjectDataArray;
  }, [teachersQuery.data]);

  // Process teacher workload data
  const teacherWorkloadData = useMemo(() => {
    if (!teachersQuery.data?.data?.teachers) return [];

    const workloadData: TeacherWorkload[] = teachersQuery.data.data.teachers
      .map((teacher: any) => {
        const subjects = teacher.subjects || teacher.subject_names || [];
        const teacherName =
          teacher.full_name || teacher.full_name_with_title || "Unknown";
        const subjectCount = subjects.length;
        const subjectNames = subjects.map((subject: any) =>
          typeof subject === "string" ? subject : subject.name,
        );

        let workloadLevel: TeacherWorkload["workloadLevel"];
        let color: string;

        if (subjectCount <= 1) {
          workloadLevel = "light";
          color = "#4CAF50";
        } else if (subjectCount <= 3) {
          workloadLevel = "normal";
          color = "#FF9800";
        } else {
          workloadLevel = "heavy";
          color = "#F44336";
        }

        return {
          teacherName,
          subjects: subjectNames,
          subjectCount,
          workloadLevel,
          color,
        };
      })
      .sort((a, b) => b.subjectCount - a.subjectCount);

    return workloadData;
  }, [teachersQuery.data]);

  // Process data for grades
  const gradeData = useMemo(() => {
    if (!teachersQuery.data?.data?.teachers) return [];

    const gradeMap = new Map<string, Set<string>>();

    // Aggregate grades and educators
    teachersQuery.data.data.teachers.forEach((teacher: any) => {
      const teacherName =
        teacher.full_name || teacher.full_name_with_title || "Unknown";
      const grade = teacher.educator_grade || "Not Specified";

      if (!gradeMap.has(grade)) {
        gradeMap.set(grade, new Set());
      }
      gradeMap.get(grade)?.add(teacherName);
    });

    // Convert to chart data
    const gradeColors: { [key: string]: string } = {
      "Teacher - Grade I": "#4CAF50",
      "Teacher - Grade II": "#2196F3",
      "Teacher - Grade III": "#FF9800",
      "Senior Teacher": "#9C27B0",
      Principal: "#F44336",
      "Not Specified": "#666",
    };

    const gradeDataArray: GradeData[] = Array.from(gradeMap.entries())
      .map(([grade, educators]) => ({
        grade,
        educatorCount: educators.size,
        color: gradeColors[grade] || "#666",
      }))
      .sort((a, b) => b.educatorCount - a.educatorCount);

    return gradeDataArray;
  }, [teachersQuery.data]);

  // Generate comprehensive staffing insights
  const staffingInsights = useMemo((): StaffingInsights => {
    if (!subjectData.length || !teacherWorkloadData.length) {
      return {
        totalTeachers: 0,
        totalSubjects: 0,
        averageSubjectsPerTeacher: 0,
        criticalSubjects: 0,
        overstaffedSubjects: 0,
        heavyWorkloadTeachers: 0,
        recommendations: [],
      };
    }

    const totalTeachers = teacherWorkloadData.length;
    const totalSubjects = subjectData.length;
    const totalSubjectAssignments = teacherWorkloadData.reduce(
      (sum, teacher) => sum + teacher.subjectCount,
      0,
    );
    const averageSubjectsPerTeacher =
      Math.round((totalSubjectAssignments / totalTeachers) * 10) / 10;

    const criticalSubjects = subjectData.filter(
      (s) => s.riskLevel === "high",
    ).length;
    const overstaffedSubjects = subjectData.filter(
      (s) => s.coverageLevel === "overstaffed",
    ).length;
    const heavyWorkloadTeachers = teacherWorkloadData.filter(
      (t) => t.workloadLevel === "heavy",
    ).length;

    // Generate intelligent recommendations
    const recommendations: string[] = [];

    if (criticalSubjects > 0) {
      recommendations.push(
        `🚨 ${criticalSubjects} subject(s) need immediate attention - hire more teachers`,
      );
    }

    if (heavyWorkloadTeachers > 0) {
      recommendations.push(
        `⚠️ ${heavyWorkloadTeachers} teacher(s) have heavy workload - consider redistribution`,
      );
    }

    if (overstaffedSubjects > 0 && criticalSubjects > 0) {
      recommendations.push(
        `🔄 Redistribute teachers from overstaffed to critical subjects`,
      );
    }

    if (averageSubjectsPerTeacher > 3) {
      recommendations.push(
        `📊 Average workload is high (${averageSubjectsPerTeacher} subjects/teacher) - consider hiring`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        `✅ Staffing levels appear balanced - monitor regularly`,
      );
    }

    return {
      totalTeachers,
      totalSubjects,
      averageSubjectsPerTeacher,
      criticalSubjects,
      overstaffedSubjects,
      heavyWorkloadTeachers,
      recommendations,
    };
  }, [subjectData, teacherWorkloadData]);

  // Convert data for chart components
  const subjectBarChartData = useMemo(() => {
    return subjectData.map((item, index) => ({
      value: item.educatorCount,
      label:
        item.subject.length > 10
          ? item.subject.substring(0, 10) + "..."
          : item.subject,
      frontColor: item.color,
      spacing: index === subjectData.length - 1 ? 0 : 2,
    }));
  }, [subjectData]);

  const gradePieChartData = useMemo(() => {
    return gradeData.map((item) => ({
      value: item.educatorCount,
      color: item.color,
      text: `${item.educatorCount}`,
      label: item.grade,
    }));
  }, [gradeData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!teachersQuery.data?.data?.teachers) return null;

    const totalTeachers = teachersQuery.data.data.teachers.length;
    const totalSubjects = subjectData.length;
    const mostPopularSubject = subjectData[0];
    const averageTeachersPerSubject =
      totalSubjects > 0
        ? Math.round(
            (subjectData.reduce((sum, s) => sum + s.educatorCount, 0) /
              totalSubjects) *
              10,
          ) / 10
        : 0;

    return {
      totalTeachers,
      totalSubjects,
      mostPopularSubject,
      averageTeachersPerSubject,
    };
  }, [teachersQuery.data, subjectData]);

  const toggleViewType = () => {
    setViewType((prev) => (prev === "subjects" ? "grades" : "subjects"));
    setSelectedSubject(null);
  };

  const handleSubjectPress = (subject: SubjectData) => {
    setSelectedSubject(
      selectedSubject?.subject === subject.subject ? null : subject,
    );
  };

  if (teachersQuery.isLoading) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialIcons name="people" size={16} color="#920734" />
            <Text style={styles.title}>Subject-Educators Distribution</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#920734" />
          <Text style={styles.loadingText}>Loading teachers data...</Text>
        </View>
      </View>
    );
  }

  if (teachersQuery.isError || (!subjectData.length && !gradeData.length)) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialIcons name="people" size={16} color="#920734" />
            <Text style={styles.title}>Subject-Educators Distribution</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="people" size={48} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Teachers Data</Text>
          <Text style={styles.emptyText}>No teacher records found</Text>
          {teachersQuery.isError && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => teachersQuery.refetch()}
            >
              <MaterialIcons name="refresh" size={16} color="#920734" />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <MaterialIcons name="people" size={16} color="#920734" />
          <Text style={styles.title}>Subject-Educators Distribution</Text>
          {summaryStats && (
            <Text style={styles.subtitle}>
              {summaryStats.totalTeachers} teachers
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleViewType}>
          <MaterialIcons
            name={viewType === "subjects" ? "pie-chart" : "bar-chart"}
            size={16}
            color="#920734"
          />
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      {summaryStats && !compact && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Subjects</Text>
            <Text style={styles.statValue}>{summaryStats.totalSubjects}</Text>
            <Text style={styles.statSubvalue}>total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Popular</Text>
            <Text style={styles.statValue}>
              {summaryStats.mostPopularSubject?.subject.substring(0, 8) ||
                "N/A"}
            </Text>
            <Text style={styles.statSubvalue}>
              {summaryStats.mostPopularSubject?.educatorCount || 0} teachers
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>
              {summaryStats.averageTeachersPerSubject}
            </Text>
            <Text style={styles.statSubvalue}>per subject</Text>
          </View>
        </View>
      )}

      {/* Chart */}
      <View style={styles.chartContainer}>
        {viewType === "subjects" ? (
          <View style={styles.barChartWrapper}>
            <Text style={styles.chartSubtitle}>Educators by Subject</Text>
            {subjectBarChartData.length > 0 ? (
              <BarChart
                data={subjectBarChartData}
                width={CHART_WIDTH - 60}
                height={compact ? 100 : 140}
                barWidth={18}
                spacing={12}
                roundedTop
                roundedBottom
                showGradient
                yAxisThickness={1}
                xAxisThickness={1}
                yAxisColor="#E0E0E0"
                xAxisColor="#E0E0E0"
                textColor="#666"
                textShiftY={-5}
                textFontSize={8}
                animateOnDataChange
                animationDuration={800}
                yAxisLabelSuffix=""
                maxValue={
                  Math.max(...subjectBarChartData.map((d) => d.value)) + 1
                }
                stepValue={1}
                noOfSections={Math.min(
                  5,
                  Math.max(...subjectBarChartData.map((d) => d.value)),
                )}
                hideYAxisText={compact}
                yAxisTextStyle={{ fontSize: 9, color: "#666" }}
                xAxisLabelTextStyle={{ fontSize: 7, color: "#666" }}
                onPress={(item: any, index: number) =>
                  handleSubjectPress(subjectData[index])
                }
              />
            ) : (
              <Text style={styles.noDataText}>No subject data available</Text>
            )}
          </View>
        ) : (
          <View style={styles.pieChartWrapper}>
            <Text style={styles.chartSubtitle}>Educators by Grade Level</Text>
            {gradePieChartData.length > 0 ? (
              <PieChart
                data={gradePieChartData}
                radius={compact ? 50 : 70}
                innerRadius={compact ? 20 : 30}
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={styles.centerLabelText}>Total</Text>
                    <Text style={styles.centerLabelValue}>
                      {summaryStats?.totalTeachers || 0}
                    </Text>
                  </View>
                )}
                strokeColor="#fff"
                strokeWidth={2}
              />
            ) : (
              <Text style={styles.noDataText}>No grade data available</Text>
            )}
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {viewType === "subjects"
          ? subjectData.slice(0, 4).map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: item.color }]}
                />
                <Text style={styles.legendText}>
                  {item.subject.length > 8
                    ? item.subject.substring(0, 8) + "..."
                    : item.subject}{" "}
                  ({item.educatorCount})
                </Text>
              </View>
            ))
          : gradeData.slice(0, 4).map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: item.color }]}
                />
                <Text style={styles.legendText}>
                  {item.grade.replace("Teacher - ", "")} ({item.educatorCount})
                </Text>
              </View>
            ))}
      </View>

      {/* Selected Subject Details */}
      {selectedSubject && !compact && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>
              {selectedSubject.subject} Educators
            </Text>
            <TouchableOpacity onPress={() => setSelectedSubject(null)}>
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.educatorsList}
            showsVerticalScrollIndicator={false}
          >
            {selectedSubject.educators.map((educator, index) => (
              <View key={index} style={styles.educatorItem}>
                <MaterialIcons name="person" size={16} color="#920734" />
                <Text style={styles.educatorName}>{educator}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  compactContainer: {
    padding: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  toggleButton: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 1,
  },
  statSubvalue: {
    fontSize: 9,
    color: "#920734",
    textAlign: "center",
  },
  chartContainer: {
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    padding: 12,
  },
  chartSubtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  barChartWrapper: {
    alignItems: "center",
  },
  pieChartWrapper: {
    alignItems: "center",
  },
  centerLabel: {
    alignItems: "center",
  },
  centerLabelText: {
    fontSize: 10,
    color: "#666",
  },
  centerLabelValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
    flex: 1,
    minWidth: 80,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 8,
    color: "#666",
    flexShrink: 1,
  },
  detailsContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    maxHeight: 120,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  educatorsList: {
    maxHeight: 80,
  },
  educatorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  educatorName: {
    fontSize: 12,
    color: "#1a1a1a",
  },
  noDataText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    padding: 20,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#999",
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#920734",
    gap: 4,
  },
  retryText: {
    fontSize: 12,
    color: "#920734",
    fontWeight: "600",
  },
});

export default SubjectEducatorsChart;
