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
import { useGetStudentExamReportQuery } from "../../../api/student-exam-report-api";
import ExamReportListCard from "../../student-exam/ExamReportListCard";
import DetailedReportCard from "../../student-exam/DetailedReportCard";
import { ExamReport } from "../../../types/student-exam-report";

interface ReportCardsDrawerProps {
  onClose: () => void;
}

const ReportCardsDrawer: React.FC<ReportCardsDrawerProps> = ({ onClose }) => {
  const [selectedReport, setSelectedReport] = useState<ExamReport | null>(null);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const { selectedStudent } = useSelector((state: RootState) => state.app);

  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useGetStudentExamReportQuery(
    { studentId: selectedStudent?.id || 0 },
    { skip: !selectedStudent?.id },
  );

  const handleReportPress = (report: ExamReport) => {
    setSelectedReport(report);
    setShowDetailedReport(true);
  };

  const handleCloseDetailedReport = () => {
    setShowDetailedReport(false);
    setSelectedReport(null);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#920734" />
          <Text style={styles.loadingText}>Loading report cards...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#FF5722" />
          <Text style={styles.errorTitle}>Error Loading Report Cards</Text>
          <Text style={styles.errorMessage}>
            Unable to load report card data. Please try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (
      !reportData?.data?.exam_reports ||
      reportData.data.exam_reports.length === 0
    ) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="assignment" size={64} color="#CCCCCC" />
          <Text style={styles.emptyStateTitle}>No Report Cards Available</Text>
          <Text style={styles.emptyStateSubtext}>
            Academic performance reports will appear here when available
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.reportsList}>
        {reportData.data.exam_reports.map((report, index) => (
          <ExamReportListCard
            key={`${report.scheduling_examination_id}-${index}`}
            examReport={report}
            onPress={() => handleReportPress(report)}
          />
        ))}
      </View>
    );
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderContent()}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Academic Management System</Text>
          {/* <Text style={styles.footerSubtext}>Toyar Technologies</Text> */}
        </View>
      </ScrollView>

      {/* Detailed Report Card Modal */}
      {selectedReport && reportData?.data?.student_info && (
        <DetailedReportCard
          visible={showDetailedReport}
          onClose={handleCloseDetailedReport}
          examReport={selectedReport}
          studentInfo={reportData.data.student_info}
          selectedStudent={selectedStudent}
        />
      )}
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
  content: {
    flex: 1,
    backgroundColor: "#F2F0EF",
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
  reportsList: {
    paddingVertical: 16,
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

export default ReportCardsDrawer;
