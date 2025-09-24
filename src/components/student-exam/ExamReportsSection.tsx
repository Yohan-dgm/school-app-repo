import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { StudentExamData } from "../../types/student-exam";

interface ExamReportsSectionProps {
  data: StudentExamData;
}

const ExamReportsSection: React.FC<ExamReportsSectionProps> = ({ data }) => {
  const examReports = data?.student_exam_reports || [];

  if (examReports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="description" size={48} color="#999" />
        <Text style={styles.emptyText}>No exam reports available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {examReports.map((report, index) => (
        <View key={index} style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.examTitle}>
              {report.exam?.exam_name || "Unknown Exam"}
            </Text>
            <Text style={styles.examDate}>
              {report.exam?.exam_date
                ? new Date(report.exam.exam_date).toLocaleDateString()
                : "N/A"}
            </Text>
          </View>

          <View style={styles.overallStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Overall Grade</Text>
              <Text style={styles.statValue}>
                {report.overall_grade || "N/A"}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Percentage</Text>
              <Text style={styles.statValue}>
                {report.overall_percentage || 0}%
              </Text>
            </View>

            {report.overall_rank > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Rank</Text>
                <Text style={styles.statValue}>#{report.overall_rank}</Text>
              </View>
            )}
          </View>

          {report.attendance_percentage !== null && (
            <View style={styles.attendanceRow}>
              <Text style={styles.attendanceLabel}>Attendance:</Text>
              <Text style={styles.attendanceValue}>
                {report.attendance_percentage}%
              </Text>
            </View>
          )}

          {report.conduct_grade && (
            <View style={styles.conductRow}>
              <Text style={styles.conductLabel}>Conduct Grade:</Text>
              <Text style={styles.conductValue}>{report.conduct_grade}</Text>
            </View>
          )}

          {report.teacher_comments && (
            <View style={styles.commentsSection}>
              <Text style={styles.commentsTitle}>Teacher Comments:</Text>
              <Text style={styles.commentsText}>{report.teacher_comments}</Text>
            </View>
          )}

          {report.principal_comments && (
            <View style={styles.commentsSection}>
              <Text style={styles.commentsTitle}>Principal Comments:</Text>
              <Text style={styles.commentsText}>
                {report.principal_comments}
              </Text>
            </View>
          )}

          {report.parent_comments && (
            <View style={styles.commentsSection}>
              <Text style={styles.commentsTitle}>Parent Comments:</Text>
              <Text style={styles.commentsText}>{report.parent_comments}</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },

  reportCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  reportHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  examTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },

  examDate: {
    fontSize: 14,
    color: "#6B7280",
  },

  overallStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderRadius: 8,
  },

  statItem: {
    alignItems: "center",
  },

  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },

  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  attendanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  attendanceLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },

  attendanceValue: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "600",
  },

  conductRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  conductLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },

  conductValue: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
  },

  commentsSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
  },

  commentsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  commentsText: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
    fontStyle: "italic",
  },
});

export default ExamReportsSection;
