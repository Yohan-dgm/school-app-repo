import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { StudentExamData } from "../../types/student-exam";

interface ExamSubjectsSectionProps {
  data: StudentExamData;
}

const ExamSubjectsSection: React.FC<ExamSubjectsSectionProps> = ({ data }) => {
  const subjectMarks = data?.student_exam_subject_marks || [];

  const getGradeColor = (grade: string) => {
    switch (grade?.toUpperCase()) {
      case "A":
        return "#34D399";
      case "B":
        return "#60A5FA";
      case "C":
        return "#FBBF24";
      case "D":
        return "#F87171";
      case "F":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  if (subjectMarks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="subject" size={48} color="#999" />
        <Text style={styles.emptyText}>No subject marks available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {subjectMarks.map((subjectMark, index) => (
        <View key={index} style={styles.subjectCard}>
          <View style={styles.subjectHeader}>
            <View style={styles.subjectInfo}>
              <Text style={styles.subjectName}>
                {subjectMark.subject?.subject_name || "Unknown Subject"}
              </Text>
              <Text style={styles.subjectCode}>
                {subjectMark.subject?.subject_code || "N/A"}
              </Text>
            </View>
            <View
              style={[
                styles.gradeContainer,
                { backgroundColor: getGradeColor(subjectMark.grade) },
              ]}
            >
              <Text style={styles.gradeText}>{subjectMark.grade || "N/A"}</Text>
            </View>
          </View>

          <View style={styles.marksContainer}>
            <View style={styles.markItem}>
              <Text style={styles.markLabel}>Marks Obtained</Text>
              <Text style={styles.markValue}>
                {subjectMark.marks_obtained || 0} /{" "}
                {subjectMark.total_marks || 0}
              </Text>
            </View>

            <View style={styles.markItem}>
              <Text style={styles.markLabel}>Percentage</Text>
              <Text style={styles.markValue}>
                {subjectMark.percentage || 0}%
              </Text>
            </View>

            {subjectMark.rank > 0 && (
              <View style={styles.markItem}>
                <Text style={styles.markLabel}>Rank</Text>
                <Text style={styles.markValue}>#{subjectMark.rank}</Text>
              </View>
            )}
          </View>

          {subjectMark.exam && (
            <View style={styles.examInfo}>
              <Text style={styles.examLabel}>
                Exam: {subjectMark.exam.exam_name}
              </Text>
              <Text style={styles.examDate}>
                Date:{" "}
                {new Date(subjectMark.exam.exam_date).toLocaleDateString()}
              </Text>
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

  subjectCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  subjectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  subjectInfo: {
    flex: 1,
  },

  subjectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },

  subjectCode: {
    fontSize: 12,
    color: "#6B7280",
  },

  gradeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 40,
    alignItems: "center",
  },

  gradeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  marksContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  markItem: {
    alignItems: "center",
  },

  markLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },

  markValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  examInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  examLabel: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 2,
  },

  examDate: {
    fontSize: 12,
    color: "#6B7280",
  },
});

export default ExamSubjectsSection;
