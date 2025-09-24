import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ExamReport } from "../../types/student-exam-report";

interface ExamReportListCardProps {
  examReport: ExamReport;
  onPress: () => void;
}

const ExamReportListCard: React.FC<ExamReportListCardProps> = ({
  examReport,
  onPress,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getGradeColor = (average: string) => {
    const avg = parseFloat(average);
    if (avg >= 90) return "#4CAF50";
    if (avg >= 80) return "#8BC34A";
    if (avg >= 70) return "#FFC107";
    if (avg >= 60) return "#FF9800";
    if (avg >= 50) return "#FF5722";
    return "#F44336";
  };

  const getExamTypeColor = (examType: string) => {
    const type = examType.toLowerCase();
    if (type.includes("quiz")) return "#4A90E2"; // Blue for Quizzes
    if (type.includes("term test") || type.includes("term")) return "#F5A623"; // Orange for Term Tests
    return "#920734"; // Default purple for others
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.examTitle} numberOfLines={2}>
          {examReport.exam_details.exam_title}
        </Text>

        <View style={styles.examTypeAndDatesContainer}>
          <Text
            style={[
              styles.examType,
              { color: getExamTypeColor(examReport.exam_details.exam_type) },
            ]}
          >
            {examReport.exam_details.exam_type}
          </Text>
          <View style={styles.datesInline}>
            <MaterialIcons name="event" size={12} color="#666666" />
            <Text style={styles.dateTextInline}>
              {formatDate(examReport.exam_details.exam_start_date)} -{" "}
              {formatDate(examReport.exam_details.exam_end_date)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Report Summary</Text>
          <MaterialIcons
            name="keyboard-arrow-right"
            size={24}
            color="#920734"
          />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Class Rank</Text>
            <Text style={styles.statValue}>
              #{examReport.report_summary.class_rank}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Average</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color: getGradeColor(
                    examReport.report_summary.student_average,
                  ),
                },
              ]}
            >
              {examReport.report_summary.student_average}%
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Marks</Text>
            <Text style={styles.statValue}>
              {examReport.report_summary.aggregate_of_mark}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Subjects</Text>
            <Text style={styles.statValue}>
              {examReport.subject_details.length}
            </Text>
          </View>
        </View>

        {examReport.report_summary.class_teacher_comment && (
          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>Teacher's Comment:</Text>
            <Text style={styles.commentText} numberOfLines={2}>
              {examReport.report_summary.class_teacher_comment}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.viewReportContainer}>
        <Text style={styles.viewReportText}>Tap to view</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    overflow: "hidden",
  },
  header: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  examInfo: {
    marginBottom: 8,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 6,
  },
  examType: {
    fontSize: 12,
    fontWeight: "600",
  },
  examTypeAndDatesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datesInline: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateTextInline: {
    fontSize: 10,
    color: "#666666",
    marginLeft: 4,
    fontWeight: "500",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 12,
    color: "#666666",
    marginLeft: 4,
    fontWeight: "500",
  },
  dateSeparator: {
    fontSize: 12,
    color: "#999999",
    marginHorizontal: 8,
  },
  summaryContainer: {
    padding: 12,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#920734",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 3,
  },
  statLabel: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 3,
    textAlign: "center",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#920734",
    textAlign: "center",
  },
  commentContainer: {
    backgroundColor: "#F4E5E8",
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#920734",
  },
  commentLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#920734",
    marginBottom: 3,
  },
  commentText: {
    fontSize: 12,
    color: "#666666",
    lineHeight: 16,
    fontStyle: "italic",
  },
  viewReportContainer: {
    backgroundColor: "#F8F9FA",
    paddingVertical: 8,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  viewReportText: {
    fontSize: 12,
    color: "#920734",
    fontWeight: "600",
  },
});

export default ExamReportListCard;
