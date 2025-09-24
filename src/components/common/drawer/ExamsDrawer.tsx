import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { RootState } from "../../../state-store/store";
import { useGetStudentExamDataQuery } from "../../../api/student-exam-api";
import { theme } from "../../../styles/theme";
import ExamSummaryCard from "../../student-exam/ExamSummaryCard";
import SubjectPerformanceCard from "../../student-exam/SubjectPerformanceCard";

interface ExamsDrawerProps {
  onClose: () => void;
}

const ExamsDrawer: React.FC<ExamsDrawerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const { selectedStudent } = useSelector((state: RootState) => state.app);

  const {
    data: examData,
    isLoading,
    error,
    refetch,
  } = useGetStudentExamDataQuery(
    { studentId: selectedStudent?.id || 0 },
    { skip: !selectedStudent?.id },
  );

  const tabs = [
    { id: "overview", title: "Overview", icon: "dashboard" },
    { id: "subjects", title: "Subjects", icon: "school" },
    { id: "reports", title: "Reports", icon: "assessment" },
  ];

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#920734" />
          <Text style={styles.loadingText}>Loading exam data...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#FF5722" />
          <Text style={styles.errorTitle}>Error Loading Data</Text>
          <Text style={styles.errorMessage}>
            Unable to load exam data. Please try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!examData?.data) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="quiz" size={64} color="#CCCCCC" />
          <Text style={styles.emptyStateTitle}>No Exam Data Available</Text>
          <Text style={styles.emptyStateSubtext}>
            Exam data will appear here when available
          </Text>
        </View>
      );
    }

    const { student_exam_marks, exam_reports, quiz_marks } = examData.data;

    switch (activeTab) {
      case "overview":
        return (
          <View>
            {exam_reports.map((report) => (
              <ExamSummaryCard
                key={report.id}
                aggregateMark={report.aggregate_of_mark}
                studentAverage={report.student_average}
                classRank={report.class_rank}
                classAverage={report.class_average}
                gradeLevelName={report.grade_level_name}
              />
            ))}

            {exam_reports.length === 0 && (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="assessment" size={48} color="#CCCCCC" />
                <Text style={styles.noDataText}>No exam reports available</Text>
              </View>
            )}
          </View>
        );

      case "subjects":
        return (
          <View>
            {student_exam_marks
              .filter((mark) => mark.is_mark_added)
              .map((examMark) => (
                <SubjectPerformanceCard key={examMark.id} examMark={examMark} />
              ))}

            {student_exam_marks.filter((mark) => mark.is_mark_added).length ===
              0 && (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="school" size={48} color="#CCCCCC" />
                <Text style={styles.noDataText}>
                  No subject marks available
                </Text>
              </View>
            )}
          </View>
        );

      case "reports":
        return (
          <View>
            {exam_reports.map((report) => (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportTitle}>
                    {report.exam_quiz?.exam_title ||
                      `Report #${report.serial_number}`}
                  </Text>
                  <Text style={styles.reportType}>
                    {report.exam_quiz?.exam_type || "Exam Report"}
                  </Text>
                </View>

                <View style={styles.reportStats}>
                  <View style={styles.reportStatItem}>
                    <Text style={styles.reportStatLabel}>Rank</Text>
                    <Text style={styles.reportStatValue}>
                      #{report.class_rank}
                    </Text>
                  </View>
                  <View style={styles.reportStatItem}>
                    <Text style={styles.reportStatLabel}>Average</Text>
                    <Text style={styles.reportStatValue}>
                      {report.student_average}%
                    </Text>
                  </View>
                  <View style={styles.reportStatItem}>
                    <Text style={styles.reportStatLabel}>Total</Text>
                    <Text style={styles.reportStatValue}>
                      {report.aggregate_of_mark}
                    </Text>
                  </View>
                </View>

                {report.class_teacher_comment && (
                  <View style={styles.teacherComment}>
                    <Text style={styles.commentTitle}>Teacher's Comment</Text>
                    <Text style={styles.commentText}>
                      {report.class_teacher_comment}
                    </Text>
                  </View>
                )}
              </View>
            ))}

            {exam_reports.length === 0 && (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="assessment" size={48} color="#CCCCCC" />
                <Text style={styles.noDataText}>
                  No detailed reports available
                </Text>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exams</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <MaterialIcons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.id ? "#FFFFFF" : "#920734"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText,
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Academic Management System</Text>
          {/* <Text style={styles.footerSubtext}>Toyar Technologies</Text> */}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#920734",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: {
    backgroundColor: "#920734",
    borderBottomColor: "#6D1A2A",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#920734",
    marginLeft: 6,
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 16,
    color: "#920734",
    marginTop: 16,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF5722",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#920734",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noDataText: {
    fontSize: 16,
    color: "#999999",
    marginTop: 16,
    textAlign: "center",
  },
  reportCard: {
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
  reportHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 4,
  },
  reportType: {
    fontSize: 14,
    color: "#666666",
  },
  reportStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
    backgroundColor: "#F8F9FA",
  },
  reportStatItem: {
    alignItems: "center",
  },
  reportStatLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  reportStatValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#920734",
  },
  teacherComment: {
    margin: 16,
    padding: 16,
    backgroundColor: "#F4E5E8",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#920734",
  },
  commentTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#920734",
    marginBottom: 8,
  },
  commentText: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
    fontStyle: "italic",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#666666",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: "#999999",
    textAlign: "center",
    lineHeight: 22,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#999999",
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: "#CCCCCC",
  },
});

export default ExamsDrawer;
