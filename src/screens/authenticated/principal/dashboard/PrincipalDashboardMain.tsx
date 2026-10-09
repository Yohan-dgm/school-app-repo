import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useSelector } from "react-redux";
import { MaterialIcons } from "@expo/vector-icons";
import EnhancedDashboardGrid from "../../educator/dashboard/components/EnhancedDashboardGrid";
import SimpleSummaryDashboard from "./components/SimpleSummaryDashboard";
import FullScreenModal from "./components/FullScreenModal";
import StudentsModalContent from "./components/StudentsModalContent";
import TeachersModalContent from "./components/TeachersModalContent";
import EducatorFeedbackModal from "./modals/EducatorFeedbackModal";
import EducatorFeedbackStatsModal from "./modals/EducatorFeedbackStatsModal";
import StudentFeedbackStatsModal from "./modals/StudentFeedbackStatsModal";
import StudentAttendanceModal from "./modals/StudentAttendanceModal";
import StudentAttendanceStatsModal from "./modals/StudentAttendanceStatsModal";
import ClassTeacherModal from "./modals/ClassTeacherModal";
import SectionalHeadModal from "./modals/SectionalHeadModal";
import MyFeedbackModal from "./modals/MyFeedbackModal";
import StudentAchievementModal from "../../educator/dashboard/modals/StudentAchievementModal";
import DisciplineManagementModal from "../../educator/dashboard/modals/DisciplineManagementModal";
import SectionAccessManagementModal from "./modals/SectionAccessManagementModal";
import GradeLevelClassSelectionDrawer from "../../../../components/common/drawer/GradeLevelClassSelectionDrawer";
import { GradeLevelClass } from "../../../../api/grade-level-api";
import { useHasSectionAccess } from "../../../../api/section-access-api";
import { USER_CATEGORIES } from "../../../../constants/userCategories";

// Section-access key gating the Discipline Management dashboard item below -
// visible to users granted this key (via the section_access table), or to
// Principals outright (see hasDisciplineManagementAccess below).
const DISCIPLINE_MANAGEMENT_SECTION_KEY = "discipline_management";

// Modals rendered by their own dedicated component (not the generic FullScreenModal)
const DEDICATED_MODAL_IDS = new Set([
  "educator_feedback",
  "educator_feedback_stats",
  "student_feedback_stats",
  "student_attendance",
  "student_attendance_stats",
  "class_teachers",
  "sectional_heads",
  "my_feedback",
  "student_achievement",
  "discipline_management",
  "section_access_management",
]);

export interface DashboardItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  gradient: [string, string];
  onPress: () => void;
}

function PrincipalDashboardMain() {
  // Full-screen modal state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // My Class drawer states
  const [, setSelectedClassData] = useState<
    (GradeLevelClass & { gradeLevelName: string }) | null
  >(null);
  const [showClassSelectionDrawer, setShowClassSelectionDrawer] =
    useState(false);

  // Discipline Management item is visible to users granted the
  // "discipline_management" section-access key, or outright to Principals
  // (user_category 4) regardless of that table.
  const { sessionData } = useSelector((state: any) => state.app);
  const isPrincipal =
    sessionData?.data?.user_category === USER_CATEGORIES.PRINCIPAL;
  const hasSectionAccessGrant = useHasSectionAccess(
    DISCIPLINE_MANAGEMENT_SECTION_KEY,
  );
  const hasDisciplineManagementAccess = hasSectionAccessGrant || isPrincipal;

  // Handlers
  const handleFullScreenPress = useCallback((itemId: string) => {
    setActiveModal(itemId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const handleClassSelection = useCallback(
    (classData: GradeLevelClass & { gradeLevelName: string }) => {
      setSelectedClassData(classData);
    },
    [],
  );

  const handleCloseClassSelectionDrawer = useCallback(() => {
    setShowClassSelectionDrawer(false);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
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
        title: "Teachers Dashboard",
        icon: "people",
        content:
          "Staff directory with performance metrics, scheduling tools, and communication features.",
      },
      sport_coaches: {
        title: "Sports Dashboard",
        icon: "sports-soccer",
        content:
          "Sports management system with team rosters, training schedules, and performance tracking.",
      },
      announcements: {
        title: "Communications Dashboard",
        icon: "campaign",
        content:
          "School-wide communication hub with announcements, notifications, and messaging.",
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
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Add New</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryActionButton}>
            <MaterialIcons name="settings" size={20} color="#920734" />
            <Text style={styles.secondaryActionButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const dashboardItems = useMemo<DashboardItem[]>(
    () => [
      {
        id: "my_class",
        title: "My Class",
        subtitle: "Student Details & Management",
        icon: "class",
        color: "#920734",
        gradient: ["#920734", "#b8285a"],
        onPress: () => setShowClassSelectionDrawer(true),
      },
      {
        id: "student_achievement",
        title: "Student Achievement",
        subtitle: "Record Student Achievements",
        icon: "emoji-events",
        color: "#FFD700",
        gradient: ["#FFD700", "#FFA500"],
        onPress: () => handleFullScreenPress("student_achievement"),
      },
      {
        id: "all_students",
        title: "All Students",
        subtitle: "Student Management",
        icon: "school",
        color: "#0057FF",
        gradient: ["#0057FF", "#3d7cff"],
        onPress: () => handleFullScreenPress("all_students"),
      },
      {
        id: "all_teachers",
        title: "All Teachers",
        subtitle: "Staff Directory",
        icon: "people",
        color: "#920734",
        gradient: ["#920734", "#b8285a"],
        onPress: () => handleFullScreenPress("all_teachers"),
      },
      // {
      //   id: "sport_coaches",
      //   title: "Sport Coaches",
      //   subtitle: "Sports Management",
      //   icon: "sports-soccer",
      //   color: "#0057FF",
      //   gradient: ["#0057FF", "#3d7cff"],
      //   onPress: () => sportCoachesModalRef.current?.open(),
      // },
      {
        id: "educator_feedback",
        title: "Educator Feedback",
        subtitle: "Performance Reviews",
        icon: "rate-review",
        color: "#920734",
        gradient: ["#920734", "#b8285a"],
        onPress: () => handleFullScreenPress("educator_feedback"),
      },
      {
        id: "educator_feedback_stats",
        title: "Feedback Statistics",
        subtitle: "Educator Analytics",
        icon: "analytics",
        color: "#0057FF",
        gradient: ["#0057FF", "#3d7cff"],
        onPress: () => handleFullScreenPress("educator_feedback_stats"),
      },
      {
        id: "student_feedback_stats",
        title: "Student Analytics",
        subtitle: "Feedback by Students",
        icon: "school",
        color: "#920734",
        gradient: ["#920734", "#b8285a"],
        onPress: () => handleFullScreenPress("student_feedback_stats"),
      },
      {
        id: "student_attendance",
        title: "Student Attendance",
        subtitle: "Attendance Management",
        icon: "how-to-reg",
        color: "#0057FF",
        gradient: ["#0057FF", "#3d7cff"],
        onPress: () => handleFullScreenPress("student_attendance"),
      },
      {
        id: "class_teachers",
        title: "Class Teachers",
        subtitle: "Teacher Assignments",
        icon: "people-outline",
        color: "#920734",
        gradient: ["#920734", "#b8285a"],
        onPress: () => handleFullScreenPress("class_teachers"),
      },
      {
        id: "sectional_heads",
        title: "Sectional Heads",
        subtitle: "Grade Level Leaders",
        icon: "school",
        color: "#920734",
        gradient: ["#920734", "#b8285a"],
        onPress: () => handleFullScreenPress("sectional_heads"),
      },
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
        id: "my_feedback",
        title: "My Feedbacks",
        subtitle: "Feedbacks I Created",
        icon: "person",
        color: "#10B981",
        gradient: ["#10B981", "#059669"],
        onPress: () => handleFullScreenPress("my_feedback"),
      },
      // {
      //   id: "announcements",
      //   title: "Announcements",
      //   subtitle: "School Communications",
      //   icon: "campaign",
      //   color: "#0057FF",
      //   gradient: ["#0057FF", "#3d7cff"],
      //   onPress: () => announcementsModalRef.current?.open(),
      // },
      // {
      //   id: "academic_reports",
      //   title: "Academic Reports",
      //   subtitle: "Performance Analytics",
      //   icon: "assessment",
      //   color: "#920734",
      //   gradient: ["#920734", "#b8285a"],
      //   onPress: () => academicReportsModalRef.current?.open(),
      // },
      // {
      //   id: "school_facilities",
      //   title: "School Facilities",
      //   subtitle: "Infrastructure Management",
      //   icon: "business",
      //   color: "#0057FF",
      //   gradient: ["#0057FF", "#3d7cff"],
      //   onPress: () => schoolFacilitiesModalRef.current?.open(),
      // },
      // {
      //   id: "financial_overview",
      //   title: "Financial Overview",
      //   subtitle: "Budget & Expenses",
      //   icon: "account-balance",
      //   color: "#920734",
      //   gradient: ["#920734", "#b8285a"],
      //   onPress: () => financialOverviewModalRef.current?.open(),
      // },
      // {
      //   id: "parent_communications",
      //   title: "Parent Communications",
      //   subtitle: "Parent-School Hub",
      //   icon: "family-restroom",
      //   color: "#0057FF",
      //   gradient: ["#0057FF", "#3d7cff"],
      //   onPress: () => parentCommunicationModalRef.current?.open(),
      // },
      // {
      //   id: "emergency_management",
      //   title: "Emergency Management",
      //   subtitle: "Safety & Protocols",
      //   icon: "emergency",
      //   color: "#920734",
      //   gradient: ["#920734", "#b8285a"],
      //   onPress: () => emergencyManagementModalRef.current?.open(),
      // },
      // Gated: only visible to users granted the "discipline_management"
      // section-access key, or to Principals outright
      ...(hasDisciplineManagementAccess
        ? [
            {
              id: "discipline_management",
              title: "Discipline Management",
              subtitle: "Review, approve & manage discipline records",
              icon: "gavel" as keyof typeof MaterialIcons.glyphMap,
              color: "#DC2626",
              gradient: ["#DC2626", "#F87171"] as [string, string],
              onPress: () => handleFullScreenPress("discipline_management"),
            },
          ]
        : []),
      {
        id: "section_access_management",
        title: "Section Access Management",
        subtitle: "Grant or revoke gated dashboard sections",
        icon: "admin-panel-settings" as keyof typeof MaterialIcons.glyphMap,
        color: "#0057FF",
        gradient: ["#0057FF", "#3d7cff"] as [string, string],
        onPress: () => handleFullScreenPress("section_access_management"),
      },
    ],
    [hasDisciplineManagementAccess, handleFullScreenPress],
  );

  return (
    <View style={styles.container}>
      {/* Content with Summary Dashboard */}
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
        {/* Summary Dashboard */}
        <SimpleSummaryDashboard />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Main Dashboard Grid */}
        <View style={styles.mainGridSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <EnhancedDashboardGrid
            items={dashboardItems}
            onFullScreenPress={handleFullScreenPress}
          />
        </View>
      </ScrollView>

      {/* Modals */}
      <EducatorFeedbackModal
        visible={activeModal === "educator_feedback"}
        onClose={handleCloseModal}
      />
      <EducatorFeedbackStatsModal
        visible={activeModal === "educator_feedback_stats"}
        onClose={handleCloseModal}
      />
      <StudentFeedbackStatsModal
        visible={activeModal === "student_feedback_stats"}
        onClose={handleCloseModal}
      />
      <StudentAttendanceModal
        visible={activeModal === "student_attendance"}
        onClose={handleCloseModal}
      />
      <StudentAttendanceStatsModal
        visible={activeModal === "student_attendance_stats"}
        onClose={handleCloseModal}
      />
      <ClassTeacherModal
        visible={activeModal === "class_teachers"}
        onClose={handleCloseModal}
      />
      <SectionalHeadModal
        visible={activeModal === "sectional_heads"}
        onClose={handleCloseModal}
      />
      <MyFeedbackModal
        visible={activeModal === "my_feedback"}
        onClose={handleCloseModal}
      />
      <StudentAchievementModal
        visible={activeModal === "student_achievement"}
        onClose={handleCloseModal}
      />
      <DisciplineManagementModal
        visible={activeModal === "discipline_management"}
        onClose={handleCloseModal}
      />
      <SectionAccessManagementModal
        visible={activeModal === "section_access_management"}
        onClose={handleCloseModal}
      />
      {showClassSelectionDrawer && (
        <GradeLevelClassSelectionDrawer
          onClose={handleCloseClassSelectionDrawer}
          onSelectClass={handleClassSelection}
        />
      )}

      {/* Full-Screen Modal */}
      {activeModal && !DEDICATED_MODAL_IDS.has(activeModal) && (
        <FullScreenModal
          visible={!!activeModal}
          onClose={handleCloseModal}
          title={(() => {
            const modalConfig = {
              all_students: "Students Dashboard",
              all_teachers: "Teachers Dashboard",
              sport_coaches: "Sports Dashboard",
              announcements: "Communications Dashboard",
              student_attendance: "Student Attendance Dashboard",
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: "white",
    borderBottomWidth: 0,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    color: "#1a1a1a",
    textAlign: "center",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    marginBottom: 50,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 10,
    marginVertical: 5,
  },
  mainGridSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 1,
    marginTop: 1,
  },
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

export default PrincipalDashboardMain;
