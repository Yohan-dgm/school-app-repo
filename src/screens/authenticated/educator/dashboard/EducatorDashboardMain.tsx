import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Modalize } from "react-native-modalize";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import EnhancedDashboardGrid from "./components/EnhancedDashboardGrid";
import FullScreenModal from "../../principal/dashboard/components/FullScreenModal";
import StudentsModalContent from "../../principal/dashboard/components/StudentsModalContent";
import TeachersModalContent from "../../principal/dashboard/components/TeachersModalContent";
import EducatorFeedbackModal from "../../principal/dashboard/modals/EducatorFeedbackModal";
import StudentAttendanceModal from "../../principal/dashboard/modals/StudentAttendanceModal";
import MyFeedbackModal from "../../principal/dashboard/modals/MyFeedbackModal";
import StudentAttendanceStatsModal from "../../principal/dashboard/modals/StudentAttendanceStatsModal";
import StudentFeedbackStatsModal from "../../principal/dashboard/modals/StudentFeedbackStatsModal";
import AcademicReportsModal from "../../principal/dashboard/modals/AcademicReportsModal";
import SchoolFacilitiesModal from "../../principal/dashboard/modals/SchoolFacilitiesModal";
import FinancialOverviewModal from "../../principal/dashboard/modals/FinancialOverviewModal";
import ParentCommunicationModal from "../../principal/dashboard/modals/ParentCommunicationModal";
import EmergencyManagementModal from "../../principal/dashboard/modals/EmergencyManagementModal";
import StudentAchievementModal from "./modals/StudentAchievementModal";
import GradeLevelClassSelectionDrawer from "../../../../components/common/drawer/GradeLevelClassSelectionDrawer";
import UniversalDrawerMenu from "../../../../components/common/drawer/UniversalDrawerMenu";
import { GradeLevelClass } from "../../../../api/grade-level-api";

const { width } = Dimensions.get("window");

// Configuration: Set to false to hide "All Teachers" section for educators
// To hide teachers section: Change this to false
const SHOW_TEACHERS_FOR_EDUCATORS = true;

export interface DashboardItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  gradient: [string, string];
  onPress: () => void;
}

function EducatorDashboardMain() {
  // Full-screen modal state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // My Class drawer states
  const [selectedClassData, setSelectedClassData] = useState<
    (GradeLevelClass & { gradeLevelName: string }) | null
  >(null);
  const [showUniversalDrawer, setShowUniversalDrawer] = useState(false);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [showClassSelectionDrawer, setShowClassSelectionDrawer] =
    useState(false);

  // Modal refs
  const academicReportsModalRef = useRef<Modalize>(null);
  const schoolFacilitiesModalRef = useRef<Modalize>(null);
  const financialOverviewModalRef = useRef<Modalize>(null);
  const parentCommunicationModalRef = useRef<Modalize>(null);
  const emergencyManagementModalRef = useRef<Modalize>(null);

  // Animation values
  const fabScale = useSharedValue(1);

  // Initialize animations
  useEffect(() => {
    fabScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  // Animated styles
  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  // Handlers
  const handleFullScreenPress = (itemId: string) => {
    setActiveModal(itemId);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  const openEducatorFeedbackModal = () => {
    setActiveModal("educator_feedback");
  };

  const openStudentAttendanceModal = () => {
    setActiveModal("student_attendance");
  };

  const openMyFeedbackModal = () => {
    setActiveModal("my_feedback");
  };

  const openStudentAttendanceStatsModal = () => {
    setActiveModal("student_attendance_stats");
  };

  const openStudentFeedbackStatsModal = () => {
    setActiveModal("student_feedback_stats");
  };

  const openStudentAchievementModal = () => {
    setActiveModal("student_achievement");
  };

  const openMyClassDrawer = () => {
    console.log("🔔 Opening Grade Level Class Selection Drawer...");
    setShowClassSelectionDrawer(true);
  };

  const handleClassSelection = (
    classData: GradeLevelClass & { gradeLevelName: string }
  ) => {
    console.log(
      "✅ Class selected in GradeLevelClassSelectionDrawer...",
      classData
    );
    // Don't automatically open UniversalDrawerMenu anymore
    // The GradeLevelClassSelectionDrawer handles student details internally now
    setSelectedClassData(classData);
  };

  const handleCloseUniversalDrawer = () => {
    setShowUniversalDrawer(false);
    setShowStudentDetails(false);
    setSelectedClassData(null);
  };

  const handleBackFromStudentDetails = () => {
    setShowStudentDetails(false);
    setShowClassSelectionDrawer(true);
  };

  const handleCloseClassSelectionDrawer = () => {
    setShowClassSelectionDrawer(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const handleFABPress = () => {
    // Quick action - open educator feedback by default
    openEducatorFeedbackModal();
  };

  const renderModalContent = (modalId: string) => {
    // Educator feedback now uses the dedicated modal component
    if (modalId === "educator_feedback") {
      return null; // Handled by separate EducatorFeedbackModal component
    }

    // Student attendance now uses the dedicated modal component
    if (modalId === "student_attendance") {
      return null; // Handled by separate StudentAttendanceModal component
    }

    // Students modal now uses the dedicated component with real API integration
    if (modalId === "all_students") {
      return <StudentsModalContent />;
    }
    // Teachers modal now uses the dedicated component with real API integration
    if (modalId === "all_teachers") {
      return <TeachersModalContent />;
    }

    const modalConfig = {
      all_teachers: {
        title: "Teachers Directory",
        icon: "people",
        content:
          "Staff directory with performance metrics, scheduling tools, and communication features.",
      },
      sport_coaches: {
        title: "Sports Information",
        icon: "sports-soccer",
        content: "Information about sports programs and coaching schedules.",
      },
      announcements: {
        title: "School Communications",
        icon: "campaign",
        content: "Important school announcements and communication updates.",
      },
    };

    const config = modalConfig[modalId as keyof typeof modalConfig];
    if (!config) return null;

    return (
      <View style={styles.fullScreenContent}>
        <View style={styles.modalIconContainer}>
          <MaterialIcons name={config.icon as any} size={48} color="#920734" />
        </View>
        <Text style={styles.fullScreenTitle}>{config.title}</Text>
        <Text style={styles.fullScreenDescription}>{config.content}</Text>

        {/* Dynamic content grid */}
        <View style={styles.featureGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <TouchableOpacity key={item} style={styles.featureCard}>
              <MaterialIcons
                name={item % 2 === 0 ? "analytics" : "dashboard"}
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.featureCardText}>Feature {item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.primaryActionButton}>
            <MaterialIcons name="info" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryActionButton}>
            <MaterialIcons name="contact-support" size={20} color="#920734" />
            <Text style={styles.secondaryActionButtonText}>Contact</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Primary Dashboard Items - Special cards
  const primaryItems: DashboardItem[] = [
    {
      id: "my_class",
      title: "My Class",
      subtitle: "Student Details & Management",
      icon: "class",
      color: "#920734",
      gradient: ["#920734", "#b8285a"],
      onPress: openMyClassDrawer,
    },
    {
      id: "educator_feedback",
      title: "Educator Feedback",
      subtitle: "Student Performance Reviews",
      icon: "rate-review",
      color: "#920734",
      gradient: ["#920734", "#b8285a"],
      onPress: openEducatorFeedbackModal,
    },
    {
      id: "student_achievement",
      title: "Student Achievement",
      subtitle: "Record Student Achievements",
      icon: "emoji-events",
      color: "#FFD700",
      gradient: ["#FFD700", "#FFA500"],
      onPress: openStudentAchievementModal,
    },
    {
      id: "student_attendance",
      title: "Student Attendance",
      subtitle: "Attendance Management",
      icon: "how-to-reg",
      color: "#0057FF",
      gradient: ["#0057FF", "#3d7cff"],
      onPress: openStudentAttendanceModal,
    },
  ];

  // Other Dashboard Items - Regular cards
  const otherItems: DashboardItem[] = [
    {
      id: "all_students",
      title: "Students Overview",
      subtitle: "View All Students",
      icon: "school",
      color: "#0057FF",
      gradient: ["#0057FF", "#3d7cff"],
      onPress: () => handleFullScreenPress("all_students"),
    },
    // Conditionally include Teachers section based on configuration
    ...(SHOW_TEACHERS_FOR_EDUCATORS
      ? [
          // {
          //   id: "all_teachers",
          //   title: "All Teachers",
          //   subtitle: "Staff Directory",
          //   icon: "people" as keyof typeof MaterialIcons.glyphMap,
          //   color: "#920734",
          //   gradient: ["#920734", "#b8285a"] as [string, string],
          //   onPress: () => handleFullScreenPress("all_teachers"),
          // },
        ]
      : []),
    // {
    //   id: "student_attendance_stats",
    //   title: "Attendance Analytics",
    //   subtitle: "Student Attendance Stats",
    //   icon: "analytics",
    //   color: "#059669",
    //   gradient: ["#059669", "#10B981"],
    //   onPress: openStudentAttendanceStatsModal,
    // },
    {
      id: "student_feedback_stats",
      title: "Student Analytics",
      subtitle: "Feedback by Students",
      icon: "school",
      color: "#920734",
      gradient: ["#920734", "#b8285a"],
      onPress: openStudentFeedbackStatsModal,
    },
    {
      id: "my_feedback",
      title: "My Feedbacks",
      subtitle: "Feedbacks I Created",
      icon: "person",
      color: "#10B981",
      gradient: ["#10B981", "#059669"],
      onPress: openMyFeedbackModal,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Dashboard Grid with Pull-to-Refresh */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#920734"
            colors={["#920734"]}
          />
        }
      >
        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <Text style={styles.sectionSubtitle}>
            Manage your classes and students
          </Text>
        </View>

        {/* Primary Cards */}
        <EnhancedDashboardGrid
          items={primaryItems}
          onFullScreenPress={handleFullScreenPress}
        />

        {/* Horizontal Divider */}
        <View style={styles.divider} />

        {/* Other Cards */}
        <EnhancedDashboardGrid
          items={otherItems}
          onFullScreenPress={handleFullScreenPress}
        />
      </ScrollView>

      {/* Floating Action Button */}
      {/* <Animated.View style={[styles.fabContainer, fabAnimatedStyle]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleFABPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#920734", "#b8285a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <MaterialIcons name="add" size={32} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View> */}

      {/* Modals */}
      <EducatorFeedbackModal
        visible={activeModal === "educator_feedback"}
        onClose={handleCloseModal}
      />
      <StudentAchievementModal
        visible={activeModal === "student_achievement"}
        onClose={handleCloseModal}
      />
      <StudentAttendanceModal
        visible={activeModal === "student_attendance"}
        onClose={handleCloseModal}
      />
      <MyFeedbackModal
        visible={activeModal === "my_feedback"}
        onClose={handleCloseModal}
      />
      <StudentAttendanceStatsModal
        visible={activeModal === "student_attendance_stats"}
        onClose={handleCloseModal}
      />
      <StudentFeedbackStatsModal
        visible={activeModal === "student_feedback_stats"}
        onClose={handleCloseModal}
      />
      <AcademicReportsModal ref={academicReportsModalRef} />
      <SchoolFacilitiesModal ref={schoolFacilitiesModalRef} />
      <FinancialOverviewModal ref={financialOverviewModalRef} />
      <ParentCommunicationModal ref={parentCommunicationModalRef} />
      <EmergencyManagementModal ref={emergencyManagementModalRef} />
      {showClassSelectionDrawer && (
        <GradeLevelClassSelectionDrawer
          onClose={handleCloseClassSelectionDrawer}
          onSelectClass={handleClassSelection}
        />
      )}

      {showUniversalDrawer && (
        <UniversalDrawerMenu
          onClose={handleCloseUniversalDrawer}
          showStudentDetails={showStudentDetails}
          selectedClassId={selectedClassData?.id}
          selectedClassName={selectedClassData?.name}
          selectedGradeLevelName={selectedClassData?.gradeLevelName}
          onBack={handleBackFromStudentDetails}
        />
      )}

      {/* Full-Screen Modal */}
      {activeModal &&
        activeModal !== "educator_feedback" &&
        activeModal !== "student_attendance" &&
        activeModal !== "my_feedback" &&
        activeModal !== "student_attendance_stats" &&
        activeModal !== "student_feedback_stats" &&
        activeModal !== "student_achievement" && (
          <FullScreenModal
            visible={!!activeModal}
            onClose={handleCloseModal}
            title={(() => {
              const modalConfig = {
                all_students: "Students Overview",
                all_teachers: "Teachers Directory",
                sport_coaches: "Sports Information",
                announcements: "School Communications",
              };
              return (
                modalConfig[activeModal as keyof typeof modalConfig] ||
                "Dashboard"
              );
            })()}
            backgroundColor="#F8F9FA"
          >
            {renderModalContent(activeModal)}
          </FullScreenModal>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  // Content Section
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100,
  },
  // Horizontal Divider
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  // Floating Action Button
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 20,
    zIndex: 1000,
  },
  fab: {
    shadowColor: "#920734",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  // Modal Content Styles (kept for compatibility)
  fullScreenContent: {
    flex: 1,
    padding: 30,
    backgroundColor: "#FFFFFF",
  },
  modalIconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  fullScreenTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 16,
    textAlign: "center",
  },
  fullScreenDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 40,
  },
  featureCard: {
    width: "22%",
    aspectRatio: 1,
    backgroundColor: "#920734",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureCardText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: "#920734",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#920734",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryActionButtonText: {
    color: "#920734",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default EducatorDashboardMain;
