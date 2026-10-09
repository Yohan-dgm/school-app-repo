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
import Animated, { FadeInDown } from "react-native-reanimated";
import EnhancedDashboardGrid from "./components/EnhancedDashboardGrid";
import FullScreenModal from "../../principal/dashboard/components/FullScreenModal";
import StudentsModalContent from "../../principal/dashboard/components/StudentsModalContent";
import TeachersModalContent from "../../principal/dashboard/components/TeachersModalContent";
import EducatorFeedbackModal from "../../principal/dashboard/modals/EducatorFeedbackModal";
import StudentAttendanceModal from "../../principal/dashboard/modals/StudentAttendanceModal";
import MyFeedbackModal from "../../principal/dashboard/modals/MyFeedbackModal";
import StudentAttendanceStatsModal from "../../principal/dashboard/modals/StudentAttendanceStatsModal";
import StudentFeedbackStatsModal from "../../principal/dashboard/modals/StudentFeedbackStatsModal";
import StudentAchievementModal from "./modals/StudentAchievementModal";
import DisciplineManagementModal from "./modals/DisciplineManagementModal";
import CanteenManagementModal from "./modals/CanteenManagementModal";
import GradeLevelClassSelectionDrawer from "../../../../components/common/drawer/GradeLevelClassSelectionDrawer";
import { GradeLevelClass } from "../../../../api/grade-level-api";
import { useHasSectionAccess } from "../../../../api/section-access-api";
import { useGetCanteenOrderListDataQuery } from "../../../../api/canteen-management-api";
import { USER_CATEGORIES } from "../../../../constants/userCategories";

// Section-access key gating the Discipline Management dashboard item below -
// visible to users granted this key (via the section_access table), or to
// Principals outright (see hasDisciplineManagementAccess below).
const DISCIPLINE_MANAGEMENT_SECTION_KEY = "discipline_management";

// Section-access key gating the Canteen Management dashboard item below -
// visible to users granted this key (via the section_access table), or to
// Principals outright, same convention as Discipline Management.
const CANTEEN_MANAGEMENT_SECTION_KEY = "canteen_management";

// Configuration: Set to false to hide "All Teachers" section for educators
// To hide teachers section: Change this to false
const SHOW_TEACHERS_FOR_EDUCATORS = true;

// Modals rendered by their own dedicated component (not the generic FullScreenModal)
const DEDICATED_MODAL_IDS = new Set([
  "educator_feedback",
  "student_attendance",
  "my_feedback",
  "student_attendance_stats",
  "student_feedback_stats",
  "student_achievement",
  "discipline_management",
  "canteen_management",
]);

export interface DashboardItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  gradient: [string, string];
  onPress: () => void;
  badge?: boolean;
}

function EducatorDashboardMain() {
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
  const hasCanteenManagementGrant = useHasSectionAccess(
    CANTEEN_MANAGEMENT_SECTION_KEY,
  );
  const hasCanteenManagementAccess = hasCanteenManagementGrant || isPrincipal;

  // Red dot on the Canteen Management card while any order is Pending.
  const { data: pendingCanteenOrdersData } = useGetCanteenOrderListDataQuery(
    { status: "Pending", page: 1, page_size: 1 },
    { skip: !hasCanteenManagementAccess },
  );
  const hasPendingCanteenOrders =
    (pendingCanteenOrdersData?.data?.total ?? 0) > 0;

  // Handlers
  const handleFullScreenPress = useCallback((itemId: string) => {
    setActiveModal(itemId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const handleClassSelection = useCallback(
    (classData: GradeLevelClass & { gradeLevelName: string }) => {
      // The GradeLevelClassSelectionDrawer handles student details internally
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
  const primaryItems = useMemo<DashboardItem[]>(
    () => [
      {
        id: "my_class",
        title: "My Class",
        subtitle: "Student Details & Management",
        icon: "cast-for-education",
        color: "#920734",
        gradient: ["#920734", "#b8285a"],
        onPress: () => setShowClassSelectionDrawer(true),
      },
      {
        id: "educator_feedback",
        title: "Educator Feedback",
        subtitle: "Student Performance Reviews",
        icon: "feedback",
        color: "#920734",
        gradient: ["#920734", "#b8285a"],
        onPress: () => handleFullScreenPress("educator_feedback"),
      },
      // Gated: only visible to users granted the "discipline_management"
      // section-access key
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
        id: "student_achievement",
        title: "Student Achievement",
        subtitle: "Record Student Achievements",
        icon: "emoji-events",
        color: "#FFD700",
        gradient: ["#FFD700", "#FFA500"],
        onPress: () => handleFullScreenPress("student_achievement"),
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
    ],
    [hasDisciplineManagementAccess, handleFullScreenPress],
  );

  // Other Dashboard Items - Regular cards
  const otherItems = useMemo<DashboardItem[]>(
    () => [
      {
        id: "all_students",
        title: "Students Overview",
        subtitle: "View All Students",
        icon: "groups",
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
        icon: "insights",
        color: "#920734",
        gradient: ["#920734", "#b8285a"],
        onPress: () => handleFullScreenPress("student_feedback_stats"),
      },
      {
        id: "my_feedback",
        title: "My Feedbacks",
        subtitle: "Feedbacks I Created",
        icon: "history-edu",
        color: "#10B981",
        gradient: ["#10B981", "#059669"],
        onPress: () => handleFullScreenPress("my_feedback"),
      },
      // Gated: only visible to users granted the "canteen_management"
      // section-access key, or to Principals outright
      ...(hasCanteenManagementAccess
        ? [
            {
              id: "canteen_management",
              title: "Canteen Management",
              subtitle: "Manage meal plans & view orders",
              icon: "restaurant" as keyof typeof MaterialIcons.glyphMap,
              color: "#F59E0B",
              gradient: ["#F59E0B", "#FBBF24"] as [string, string],
              onPress: () => handleFullScreenPress("canteen_management"),
              badge: hasPendingCanteenOrders,
            },
          ]
        : []),
    ],
    [
      hasCanteenManagementAccess,
      hasPendingCanteenOrders,
      handleFullScreenPress,
    ],
  );

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
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.sectionHeader}
        >
          <View style={styles.sectionAccent} />
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <Text style={styles.sectionSubtitle}>
              Manage your classes and students
            </Text>
          </View>
        </Animated.View>

        {/* Primary Cards */}
        <Animated.View entering={FadeInDown.duration(450).delay(80)}>
          <EnhancedDashboardGrid
            items={primaryItems}
            onFullScreenPress={handleFullScreenPress}
          />
        </Animated.View>

        {/* Horizontal Divider */}
        <View style={styles.divider} />

        {/* Other Cards */}
        <Animated.View entering={FadeInDown.duration(450).delay(160)}>
          <EnhancedDashboardGrid
            items={otherItems}
            onFullScreenPress={handleFullScreenPress}
          />
        </Animated.View>
      </ScrollView>

      {/* Modals */}
      <EducatorFeedbackModal
        visible={activeModal === "educator_feedback"}
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
      <CanteenManagementModal
        visible={activeModal === "canteen_management"}
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
    marginVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  sectionAccent: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
    backgroundColor: "#920734",
    marginRight: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: "#1a1a1a",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
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
