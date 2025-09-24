import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { StudentExamData } from "../../types/student-exam";

interface ExamDetailsSectionProps {
  data: StudentExamData;
}

const ExamDetailsSection: React.FC<ExamDetailsSectionProps> = ({ data }) => {
  const examMarks = data?.student_exam_marks || [];

  if (examMarks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="list-alt" size={48} color="#999" />
        <Text style={styles.emptyText}>No exam details available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {examMarks.map((examMark, index) => (
        <View key={index} style={styles.examCard}>
          <View style={styles.examHeader}>
            <Text style={styles.examTitle}>
              {examMark.exam?.exam_name || "Unknown Exam"}
            </Text>
            <Text style={styles.examType}>
              {examMark.exam?.exam_type || "Regular"}
            </Text>
          </View>

          <View style={styles.examDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>
                {examMark.exam?.exam_date
                  ? new Date(examMark.exam.exam_date).toLocaleDateString()
                  : "N/A"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Marks:</Text>
              <Text style={styles.detailValue}>
                {examMark.total_marks || 0}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Marks Obtained:</Text>
              <Text style={styles.detailValue}>
                {examMark.marks_obtained || 0}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Percentage:</Text>
              <Text style={styles.detailValue}>
                {examMark.percentage || 0}%
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Grade:</Text>
              <Text style={styles.detailValue}>{examMark.grade || "N/A"}</Text>
            </View>

            {examMark.rank > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rank:</Text>
                <Text style={styles.detailValue}>#{examMark.rank}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color: examMark.status === "pass" ? "#10B981" : "#EF4444",
                  },
                ]}
              >
                {examMark.status || "N/A"}
              </Text>
            </View>
          </View>

          {examMark.exam && (
            <View style={styles.additionalInfo}>
              <Text style={styles.additionalLabel}>Academic Year:</Text>
              <Text style={styles.additionalValue}>
                {examMark.exam.academic_year?.year_name || "N/A"}
              </Text>

              <Text style={styles.additionalLabel}>Term:</Text>
              <Text style={styles.additionalValue}>
                {examMark.exam.term?.term_name || "N/A"}
              </Text>

              <Text style={styles.additionalLabel}>Grade Level:</Text>
              <Text style={styles.additionalValue}>
                {examMark.exam.grade_level?.name || "N/A"}
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

  examCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  examHeader: {
    marginBottom: 16,
  },

  examTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },

  examType: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },

  examDetails: {
    marginBottom: 12,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  detailLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },

  detailValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
  },

  additionalInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  additionalLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },

  additionalValue: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 8,
  },
});

export default ExamDetailsSection;
