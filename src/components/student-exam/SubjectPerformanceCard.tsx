import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { StudentExamMark } from "../../types/student-exam";

interface SubjectPerformanceCardProps {
  examMark: StudentExamMark;
}

const SubjectPerformanceCard: React.FC<SubjectPerformanceCardProps> = ({
  examMark,
}) => {
  const getGradeColor = (grade: string) => {
    switch (grade.toUpperCase()) {
      case "A*":
      case "A+":
        return "#4CAF50";
      case "A":
        return "#8BC34A";
      case "B":
        return "#FFC107";
      case "C":
        return "#FF9800";
      case "D":
        return "#FF5722";
      case "F":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  };

  const getSubjectName = () => {
    // Extract subject name from exam quiz item or use fallback
    return examMark.exam_quiz_item?.exam_quiz?.exam_title || "Subject";
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectName}>{getSubjectName()}</Text>
          <Text style={styles.examType}>
            {examMark.exam_quiz_item?.exam_quiz?.exam_type || "Exam"}
          </Text>
        </View>

        <View
          style={[
            styles.gradeBadge,
            { backgroundColor: getGradeColor(examMark.grading) },
          ]}
        >
          <Text style={styles.gradeText}>{examMark.grading || "-"}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.markSection}>
          <View style={styles.markItem}>
            <Text style={styles.markLabel}>Total Mark</Text>
            <Text style={styles.markValue}>
              {examMark.subject_total_mark || "N/A"}
            </Text>
          </View>

          {examMark.subject_overall_mark_percentage && (
            <View style={styles.markItem}>
              <Text style={styles.markLabel}>Percentage</Text>
              <Text style={styles.markValue}>
                {examMark.subject_overall_mark_percentage}%
              </Text>
            </View>
          )}

          <View style={styles.markItem}>
            <Text style={styles.markLabel}>Attendance</Text>
            <Text style={styles.markValue}>
              {examMark.present_type || "N/A"}
            </Text>
          </View>
        </View>

        {/* Sub-marks breakdown */}
        {examMark.student_subject_mark_list.length > 0 && (
          <View style={styles.subMarksSection}>
            <Text style={styles.subMarksTitle}>Detailed Marks</Text>
            {examMark.student_subject_mark_list.map((subMark, index) => (
              <View key={index} style={styles.subMarkItem}>
                <Text style={styles.subMarkName}>{subMark.name}</Text>
                <Text style={styles.subMarkValue}>
                  {subMark.mark}
                  {subMark.overall_mark ? `/${subMark.overall_mark}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Teacher comment */}
        {examMark.subject_comment && (
          <View style={styles.commentSection}>
            <Text style={styles.commentTitle}>Teacher Comment</Text>
            <Text style={styles.commentText}>{examMark.subject_comment}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 4,
  },
  examType: {
    fontSize: 14,
    color: "#666666",
  },
  gradeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  gradeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  content: {
    padding: 16,
  },
  markSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  markItem: {
    alignItems: "center",
  },
  markLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  markValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#920734",
  },
  subMarksSection: {
    marginBottom: 16,
  },
  subMarksTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 12,
  },
  subMarkItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    marginBottom: 4,
  },
  subMarkName: {
    fontSize: 14,
    color: "#666666",
    flex: 1,
  },
  subMarkValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#920734",
  },
  commentSection: {
    backgroundColor: "#F4E5E8",
    borderRadius: 8,
    padding: 12,
  },
  commentTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#920734",
    marginBottom: 6,
  },
  commentText: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
    fontStyle: "italic",
  },
});

export default SubjectPerformanceCard;
