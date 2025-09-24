import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { MaterialIcons } from "@expo/vector-icons";
import { transformStudentWithProfilePicture } from "../../../../utils/studentProfileUtils";
import { USER_CATEGORIES } from "../../../../constants/userCategories";
import { setSelectedStudent } from "../../../../state-store/slices/app-slice";
import {
  studentGrowthMetrics,
  modernColors,
} from "../../../../data/studentGrowthData";

// Import new modern components
import ModernStatsHeader from "../../../../components/student-growth/ModernStatsHeader";
import IntelligenceCardsNetwork from "../../../../components/student-growth/IntelligenceCardsNetwork";
import IntelligenceGridView from "../../../../components/student-growth/IntelligenceGridView";
import IntelligenceDetailModal from "../../../../components/student-growth/IntelligenceDetailModal";
import TermBasedRatingChart from "../../../../components/student-growth/TermBasedRatingChart";
import EducatorFeedbackDrawer from "../../../../components/student-growth/EducatorFeedbackDrawer";

const StudentGrowthMain = () => {
  const dispatch = useDispatch();
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [selectedIntelligence, setSelectedIntelligence] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIntelligenceForModal, setSelectedIntelligenceForModal] =
    useState(null);
  const [feedbackDrawerVisible, setFeedbackDrawerVisible] = useState(false);

  // Get global state
  const { sessionData, selectedStudent } = useSelector((state) => state.app);

  // Get user category from session data
  const userCategory =
    sessionData?.user_category || sessionData?.data?.user_category;
  const isParent = userCategory === USER_CATEGORIES.PARENT;

  // Get student data from backend API response
  const backendStudentList = sessionData?.data?.student_list || [];

  // Transform backend student data to match UI requirements
  const students = backendStudentList.map((student) => {
    return transformStudentWithProfilePicture(student, sessionData);
  });

  // Auto-select first student if none selected and students are available
  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      console.log(
        `📈 StudentGrowthMain - Auto-selecting first student: ${students[0]?.student_calling_name}`,
      );
      dispatch(setSelectedStudent(students[0]));
    }
  }, [students.length, selectedStudent, dispatch]);

  // Auto-select Overall metric on component mount
  useEffect(() => {
    if (!selectedMetric && studentGrowthMetrics.length > 0) {
      setSelectedMetric(studentGrowthMetrics[0]); // Overall metric
    }
  }, [selectedMetric]);

  const handleMetricSelect = (metric) => {
    setSelectedMetric(metric);
  };

  const handleIntelligenceSelect = (intelligence) => {
    setSelectedIntelligence(intelligence);
    setSelectedIntelligenceForModal(intelligence);
    setModalVisible(true);
    console.log("📊 Selected intelligence:", intelligence.title);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedIntelligenceForModal(null);
  };

  const handleEducatorFeedbackPress = () => {
    console.log("📋 Opening Educator Feedback drawer");
    console.log("📋 Selected student:", selectedStudent);
    console.log("📋 Student ID being passed:", selectedStudent?.id || 0);
    console.log(
      "📋 Student name being passed:",
      selectedStudent?.student_calling_name,
    );
    setFeedbackDrawerVisible(true);
  };

  const closeFeedbackDrawer = () => {
    console.log("📋 Closing Educator Feedback drawer");
    setFeedbackDrawerVisible(false);
  };

  // Debug logging
  console.log(
    "📈 StudentGrowthMain - User category:",
    userCategory,
    "Is parent:",
    isParent,
  );
  console.log("📈 StudentGrowthMain - Students count:", students.length);
  console.log(
    "📈 StudentGrowthMain - Selected student:",
    selectedStudent?.student_calling_name,
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Modern Stats Header */}

        <ModernStatsHeader
          title="Intelligence Assessment Dashboard"
          subtitle={`${selectedStudent?.student_calling_name || "Student"} - 13 Areas of Development`}
        />

        {/* Overall Rating Section - Second Section */}
        {/* <IntelligenceCardsNetwork
          onCardSelect={handleIntelligenceSelect}
          selectedIntelligenceId={selectedIntelligence?.id}
        /> */}
        {/* Intelligence Grid View - First Section */}
        <IntelligenceGridView
          onCardSelect={handleIntelligenceSelect}
          studentId={selectedStudent?.id}
        />

        {/* Term-Based Rating Chart Section */}
        <TermBasedRatingChart studentId={selectedStudent?.id} />

        {/* Modern Action Buttons */}
        <View style={styles.modernActionContainer}>
          <TouchableOpacity
            style={styles.modernActionButton}
            onPress={handleEducatorFeedbackPress}
          >
            <View style={styles.actionIconContainer}>
              <MaterialIcons name="feedback" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.modernActionText}>All Educator Feedbacks</Text>
          </TouchableOpacity>
        </View>

        {/* Modern Performance Summary */}
        {/* <View style={styles.modernSummaryContainer}>
          <View style={styles.summaryHeader}>
            <MaterialIcons
              name="analytics"
              size={24}
              color={modernColors.primary}
            />
            <Text style={styles.modernSummaryTitle}>Performance Insights</Text>
          </View>
          <Text style={styles.modernSummaryText}>
            {selectedStudent?.student_calling_name || "Student"} is showing{" "}
            <Text
              style={[styles.summaryHighlight, { color: modernColors.success }]}
            >
              excellent progress
            </Text>{" "}
            across multiple performance areas. Academic performance and
            attendance are{" "}
            <Text
              style={[styles.summaryHighlight, { color: modernColors.primary }]}
            >
              particularly strong
            </Text>{" "}
            with consistent improvement trends.
          </Text>

          <View style={styles.insightCards}>
            <View style={styles.insightCard}>
              <Text style={styles.insightValue}>92%</Text>
              <Text style={styles.insightLabel}>Overall Score</Text>
            </View>
            <View style={styles.insightCard}>
              <Text style={styles.insightValue}>↗ 8%</Text>
              <Text style={styles.insightLabel}>This Month</Text>
            </View>
            <View style={styles.insightCard}>
              <Text style={styles.insightValue}>Top 5%</Text>
              <Text style={styles.insightLabel}>Class Rank</Text>
            </View>
          </View>
        </View> */}

        {/* Add padding at bottom for better scrolling */}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Intelligence Detail Modal */}
      <IntelligenceDetailModal
        visible={modalVisible}
        intelligence={selectedIntelligenceForModal}
        onClose={closeModal}
      />

      {/* Educator Feedback Drawer */}
      <EducatorFeedbackDrawer
        visible={feedbackDrawerVisible}
        onClose={closeFeedbackDrawer}
        studentId={selectedStudent?.id || 0}
        studentName={selectedStudent?.student_calling_name}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: modernColors.backgroundSolid,
  },
  scrollContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  modernActionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 70,
  },
  modernActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "maroon",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryModernAction: {
    backgroundColor: modernColors.surface,
    borderWidth: 2,
    borderColor: "maroon",
  },
  actionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  secondaryIconContainer: {
    backgroundColor: modernColors.primary + "15",
  },
  modernActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    flex: 1,
  },
  secondaryModernActionText: {
    color: "maroon",
  },
  modernSummaryContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: modernColors.surface,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  modernSummaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: modernColors.text,
    marginLeft: 12,
  },
  modernSummaryText: {
    fontSize: 16,
    color: modernColors.text,
    lineHeight: 24,
    marginBottom: 20,
  },
  summaryHighlight: {
    fontWeight: "700",
  },
  insightCards: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  insightCard: {
    flex: 1,
    backgroundColor: modernColors.primary + "08",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: modernColors.primary + "20",
  },
  insightValue: {
    fontSize: 18,
    fontWeight: "700",
    color: modernColors.primary,
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: modernColors.textSecondary,
    textAlign: "center",
  },
});

export default StudentGrowthMain;
