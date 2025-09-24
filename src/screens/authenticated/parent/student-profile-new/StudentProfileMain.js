import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  Easing,
  Modal,
} from "react-native";
import ExamsDrawer from "../../../../components/common/drawer/ExamsDrawer";
import ReportCardsDrawer from "../../../../components/common/drawer/ReportCardsDrawer";
import AllBadgesDrawer from "../../../../components/common/drawer/AllBadgesDrawer";
import StudentAttendanceDrawer from "../../../../components/student-growth/StudentAttendanceDrawer";
import { useSelector, useDispatch } from "react-redux";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../../../styles/theme";
import { USER_CATEGORIES } from "../../../../constants/userCategories";
import { setSelectedStudent } from "../../../../state-store/slices/app-slice";
import { transformStudentWithProfilePicture } from "../../../../utils/studentProfileUtils";
import TodayAttendanceIndicator from "../../../../components/common/TodayAttendanceIndicator";
import { useGetTodayStudentAttendanceByIdQuery } from "../../../../api/attendance-api";
import {
  useLazyGetStudentByIdQuery,
  formatDetailedStudentData,
  useGetStudentAchievementByIdQuery,
} from "../../../../api/student-management-api";
import {
  transformAchievementsToBadges,
  getBadgeStatistics,
} from "../../../../utils/badgeUtils";

// House logo and color mapping
const getHouseInfo = (houseName) => {
  if (!houseName || houseName === "Unknown House") {
    return { isValid: false, color: "#999999", logo: null };
  }

  const lowerHouseName = houseName.toLowerCase();

  if (lowerHouseName.includes("vulcan")) {
    return {
      isValid: true,
      color: "#DC2626", // Red
      logo: require("../../../../assets/nexis-college/Houses/Vulcan.png"),
    };
  } else if (lowerHouseName.includes("tellus")) {
    return {
      isValid: true,
      color: "#16A34A", // Green
      logo: require("../../../../assets/nexis-college/Houses/Tellus.png"),
    };
  } else if (lowerHouseName.includes("eurus")) {
    return {
      isValid: true,
      color: "#EAB308", // Yellow
      logo: require("../../../../assets/nexis-college/Houses/Eurus.png"),
    };
  } else if (lowerHouseName.includes("calypso")) {
    return {
      isValid: true,
      color: "#2563EB", // Blue
      logo: require("../../../../assets/nexis-college/Houses/Calypso.png"),
    };
  }

  return { isValid: false, color: "#999999", logo: null };
};

const StudentProfileMain = () => {
  const dispatch = useDispatch();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExamsDrawer, setShowExamsDrawer] = useState(false);
  const [showReportCardsDrawer, setShowReportCardsDrawer] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showAllBadgesDrawer, setShowAllBadgesDrawer] = useState(false);
  const [attendanceDrawerVisible, setAttendanceDrawerVisible] = useState(false);
  const [detailedStudentData, setDetailedStudentData] = useState(null);
  const [isLoadingDetailedData, setIsLoadingDetailedData] = useState(false);
  const rotationValue = new Animated.Value(0);

  const handleBadgePress = (badge) => {
    setSelectedBadge(badge);
    setShowBadgeModal(true);
  };

  const handleAllBadgesDrawerPress = () => {
    setShowAllBadgesDrawer(true);
  };

  const closeAllBadgesDrawer = () => {
    setShowAllBadgesDrawer(false);
  };

  const handleAttendancePress = () => {
    console.log("🎯 Opening Student Attendance drawer");
    console.log("🎯 Selected student:", selectedStudent);
    console.log("🎯 Student ID being passed:", selectedStudent?.id || 0);
    console.log(
      "🎯 Student name being passed:",
      selectedStudent?.student_calling_name,
    );
    setAttendanceDrawerVisible(true);
  };

  const closeAttendanceDrawer = () => {
    console.log("🎯 Closing Student Attendance drawer");
    setAttendanceDrawerVisible(false);
  };

  // Enable LayoutAnimation on Android
  if (
    Platform.OS === "android" &&
    UIManager.setLayoutAnimationEnabledExperimental
  ) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  // Custom smooth animation configuration
  const customLayoutAnimation = {
    duration: 400,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: {
      type: LayoutAnimation.Types.easeInEaseOut,
      springDamping: 0.8,
    },
  };

  // Handle expand/collapse with smooth animation
  const handleToggleExpand = async () => {
    // If expanding and we don't have detailed data yet, fetch it
    if (!isExpanded && selectedStudent?.id && !detailedStudentData) {
      console.log(
        "🔍 Fetching detailed student data for ID:",
        selectedStudent.id,
      );
      setIsLoadingDetailedData(true);

      try {
        const result = await getStudentById({ student_id: selectedStudent.id });
        if (result.data?.status === "success") {
          const formattedData = formatDetailedStudentData(result.data.data);
          setDetailedStudentData(formattedData);
          console.log("✅ Detailed student data loaded:", formattedData);
        } else {
          console.error("❌ Failed to fetch student data:", result.error);
        }
      } catch (error) {
        console.error("❌ Error fetching detailed student data:", error);
      } finally {
        setIsLoadingDetailedData(false);
      }
    }

    // Configure layout animation
    LayoutAnimation.configureNext(customLayoutAnimation);

    // Animate rotation for the icon
    Animated.timing(rotationValue, {
      toValue: isExpanded ? 0 : 1,
      duration: 400,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      useNativeDriver: true,
    }).start();

    // Toggle state
    setIsExpanded(!isExpanded);
  };

  // Calculate rotation interpolation
  const rotation = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // Get global state
  const { sessionData, selectedStudent } = useSelector((state) => state.app);

  // Get user category from session data
  const userCategory =
    sessionData?.user_category || sessionData?.data?.user_category;
  const isParent = userCategory === USER_CATEGORIES.PARENT;

  // Get today's attendance for the selected student
  const {
    data: todayAttendanceData,
    isLoading: isLoadingTodayAttendance,
    error: todayAttendanceError,
  } = useGetTodayStudentAttendanceByIdQuery(
    { student_id: selectedStudent?.id || 0 },
    { skip: !selectedStudent?.id },
  );

  // Lazy query for detailed student data (only called when expanding)
  const [getStudentById] = useLazyGetStudentByIdQuery();

  // Get student achievements for the selected student
  const {
    data: achievementData,
    isLoading: isLoadingAchievements,
    error: achievementError,
  } = useGetStudentAchievementByIdQuery(
    { student_id: selectedStudent?.id || 0 },
    { skip: !selectedStudent?.id },
  );

  // Get student data from backend API response
  const backendStudentList = sessionData?.data?.student_list || [];

  // Transform backend student data to match UI requirements
  const students = backendStudentList.map((student) => {
    return transformStudentWithProfilePicture(student, sessionData);
  });

  // Transform achievements to badges for UI display
  const studentBadges =
    achievementData?.status === "success"
      ? transformAchievementsToBadges(achievementData.data.current_achievements)
      : [];

  // Get badge statistics for debugging
  const badgeStats =
    achievementData?.status === "success"
      ? getBadgeStatistics(achievementData.data.current_achievements)
      : null;

  // Auto-select first student if none selected and students are available
  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      console.log(
        `👤 StudentProfileMain - Auto-selecting first student: ${students[0]?.student_calling_name}`,
      );
      dispatch(setSelectedStudent(students[0]));
    }
  }, [students.length, selectedStudent, dispatch]);

  // Reset detailed data when student changes
  useEffect(() => {
    setDetailedStudentData(null);
    setIsExpanded(false); // Also collapse the section
  }, [selectedStudent?.id]);

  // Debug logging
  console.log(
    "👤 StudentProfileMain - User category:",
    userCategory,
    "Is parent:",
    isParent,
  );
  console.log("👤 StudentProfileMain - Students count:", students.length);
  console.log(
    "👤 StudentProfileMain - Selected student:",
    selectedStudent?.student_calling_name,
  );
  console.log("📅 StudentProfileMain - Today's attendance:", {
    studentId: selectedStudent?.id,
    isLoading: isLoadingTodayAttendance,
    data: todayAttendanceData,
    error: todayAttendanceError,
  });
  console.log("🏆 StudentProfileMain - Achievements:", {
    studentId: selectedStudent?.id,
    isLoading: isLoadingAchievements,
    error: achievementError,
    totalAchievements: achievementData?.data?.total_achievements || 0,
    currentAchievements:
      achievementData?.data?.current_achievements?.length || 0,
    badgesCount: studentBadges.length,
    badgeStats: badgeStats,
  });

  if (!selectedStudent) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <MaterialIcons name="person-outline" size={64} color="#CCCCCC" />
          <Text style={styles.emptyStateText}>No student selected</Text>
          <Text style={styles.emptyStateSubtext}>
            Please select a student to view profile
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Expandable Academic Information Header */}
        <TouchableOpacity
          style={styles.academicHeader}
          onPress={handleToggleExpand}
          activeOpacity={0.95}
        >
          <View style={styles.headerMainContent}>
            <View style={styles.studentPhotoSection}>
              <View style={styles.photoContainer}>
                <Image
                  source={selectedStudent.profileImage}
                  style={styles.academicProfileImage}
                />
                {(() => {
                  const houseInfo = getHouseInfo(selectedStudent.schoolHouse);
                  if (houseInfo.isValid && houseInfo.logo) {
                    return (
                      <View style={styles.houseLogoContainer}>
                        <Image
                          source={houseInfo.logo}
                          style={styles.houseLogo}
                        />
                      </View>
                    );
                  }
                  return null;
                })()}
              </View>
            </View>

            <View style={styles.academicInfo}>
              <Text style={styles.academicStudentName}>
                {selectedStudent.name}
              </Text>
              <Text style={styles.academicStudentId}>
                ID: {selectedStudent.studentId}
              </Text>

              {/* Today's Attendance Status */}
              <TodayAttendanceIndicator
                attendanceStatus={
                  todayAttendanceError
                    ? null
                    : todayAttendanceData?.data?.attendance_status
                }
                time={todayAttendanceData?.data?.time}
                isLoading={isLoadingTodayAttendance}
              />

              <View style={styles.gradeHouseRow}>
                <Text style={styles.academicClass}>
                  {selectedStudent.grade}
                </Text>
                {(() => {
                  const houseInfo = getHouseInfo(selectedStudent.schoolHouse);
                  if (houseInfo.isValid) {
                    return (
                      <View
                        style={[
                          styles.houseTablet,
                          { backgroundColor: houseInfo.color },
                        ]}
                      >
                        <Text style={styles.houseTabletText}>
                          {selectedStudent.schoolHouse}
                        </Text>
                      </View>
                    );
                  }
                  return (
                    <View
                      style={[
                        styles.houseTablet,
                        { backgroundColor: "#999999" },
                      ]}
                    >
                      <Text style={styles.houseTabletText}>
                        {selectedStudent.schoolHouse || "No House"}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            </View>

            <View style={styles.expandIcon}>
              <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={20}
                  color="maroon"
                />
              </Animated.View>
            </View>
          </View>

          {/* Expanded Student Details with Smooth Animation */}
          {isExpanded && (
            <View style={styles.expandedContent}>
              <View style={styles.divider} />

              {/* Loading State */}
              {isLoadingDetailedData && (
                <View style={styles.loadingContainer}>
                  <MaterialIcons name="sync" size={20} color="#920734" />
                  <Text style={styles.loadingText}>
                    Loading detailed information...
                  </Text>
                </View>
              )}

              {/* Show content only when we have detailed data */}
              {detailedStudentData && !isLoadingDetailedData && (
                <>
                  {/* Personal Information Section */}
                  <View style={styles.categorySection}>
                    <View style={styles.categoryHeader}>
                      <MaterialIcons name="person" size={16} color="#920734" />
                      <Text style={styles.categoryTitle}>
                        Personal Information
                      </Text>
                    </View>
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          Full Name with Title
                        </Text>
                        <Text style={styles.detailValue}>
                          {detailedStudentData.fullNameWithTitle}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date of Birth</Text>
                        <Text style={styles.detailValue}>
                          {detailedStudentData.formattedDateOfBirth}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Gender</Text>
                        <Text style={styles.detailValue}>
                          {detailedStudentData.gender}
                        </Text>
                      </View>
                      {detailedStudentData.bloodGroup !== "Not provided" && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Blood Group</Text>
                          <Text style={styles.detailValue}>
                            {detailedStudentData.bloodGroup}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Academic Information Section */}
                  <View style={styles.categorySection}>
                    <View style={styles.categoryHeader}>
                      <MaterialIcons name="school" size={16} color="#920734" />
                      <Text style={styles.categoryTitle}>
                        Academic Information
                      </Text>
                    </View>
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Admission Number</Text>
                        <Text style={styles.detailValue}>
                          {detailedStudentData.admissionNumber}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Joined Date</Text>
                        <Text style={styles.detailValue}>
                          {detailedStudentData.formattedJoinedDate}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Current Grade</Text>
                        <Text style={styles.detailValue}>
                          {detailedStudentData.gradeLevel}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>School House</Text>
                        <Text style={styles.detailValue}>
                          {detailedStudentData.schoolHouse}
                        </Text>
                      </View>
                      {detailedStudentData.schoolStudiedBefore !==
                        "Not provided" && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>
                            Previous School
                          </Text>
                          <Text
                            style={[styles.detailValue, styles.multilineValue]}
                          >
                            {detailedStudentData.schoolStudiedBefore}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Contact Information Section */}
                  <View style={styles.categorySection}>
                    <View style={styles.categoryHeader}>
                      <MaterialIcons
                        name="contact-phone"
                        size={16}
                        color="#920734"
                      />
                      <Text style={styles.categoryTitle}>
                        Contact Information
                      </Text>
                    </View>
                    <View style={styles.detailsGrid}>
                      {detailedStudentData.studentPhone !== "Not provided" && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Phone Number</Text>
                          <Text style={styles.detailValue}>
                            {detailedStudentData.studentPhone}
                          </Text>
                        </View>
                      )}
                      {detailedStudentData.studentEmail !== "Not provided" && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Email Address</Text>
                          <Text style={styles.detailValue}>
                            {detailedStudentData.studentEmail}
                          </Text>
                        </View>
                      )}
                      {detailedStudentData.studentAddress !==
                        "Not provided" && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Home Address</Text>
                          <Text
                            style={[styles.detailValue, styles.multilineValue]}
                          >
                            {detailedStudentData.studentAddress}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Family Information Section - Only show if there's data */}
                  {(detailedStudentData.fatherFullName !== "Not provided" ||
                    detailedStudentData.motherFullName !== "Not provided" ||
                    detailedStudentData.guardianFullName !==
                      "Not provided") && (
                    <View style={styles.categorySection}>
                      <View style={styles.categoryHeader}>
                        <MaterialIcons
                          name="family-restroom"
                          size={16}
                          color="#920734"
                        />
                        <Text style={styles.categoryTitle}>
                          Family Information
                        </Text>
                      </View>
                      <View style={styles.detailsGrid}>
                        {detailedStudentData.fatherFullName !==
                          "Not provided" && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>
                              Father&apos;s Name
                            </Text>
                            <Text style={styles.detailValue}>
                              {detailedStudentData.fatherFullName}
                            </Text>
                          </View>
                        )}
                        {detailedStudentData.motherFullName !==
                          "Not provided" && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>
                              Mother&apos;s Name
                            </Text>
                            <Text style={styles.detailValue}>
                              {detailedStudentData.motherFullName}
                            </Text>
                          </View>
                        )}
                        {detailedStudentData.guardianFullName !==
                          "Not provided" && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>
                              Guardian&apos;s Name
                            </Text>
                            <Text style={styles.detailValue}>
                              {detailedStudentData.guardianFullName}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Special Information Section */}
                  {(detailedStudentData.specialHealthConditions !==
                    "Not provided" ||
                    detailedStudentData.specialConditions !==
                      "Not provided") && (
                    <View style={styles.categorySection}>
                      <View style={styles.categoryHeader}>
                        <MaterialIcons
                          name="health-and-safety"
                          size={16}
                          color="#920734"
                        />
                        <Text style={styles.categoryTitle}>
                          Special Information
                        </Text>
                      </View>
                      <View style={styles.detailsGrid}>
                        {detailedStudentData.specialHealthConditions !==
                          "Not provided" && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>
                              Health Conditions
                            </Text>
                            <Text
                              style={[
                                styles.detailValue,
                                styles.multilineValue,
                              ]}
                            >
                              {detailedStudentData.specialHealthConditions}
                            </Text>
                          </View>
                        )}
                        {detailedStudentData.specialConditions !==
                          "Not provided" && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>
                              Special Conditions
                            </Text>
                            <Text
                              style={[
                                styles.detailValue,
                                styles.multilineValue,
                              ]}
                            >
                              {detailedStudentData.specialConditions}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Achievement Badges Section */}
        <View style={styles.badgesSection}>
          <View style={styles.badgesTitleContainer}>
            <Text style={styles.badgesSectionTitle}>Achievements & Badges</Text>
            <TouchableOpacity
              style={styles.infoIconContainer}
              onPress={handleAllBadgesDrawerPress}
              activeOpacity={0.7}
            >
              <MaterialIcons name="info-outline" size={20} color="#8B0000" />
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {isLoadingAchievements && (
            <View style={styles.badgeLoadingContainer}>
              <MaterialIcons name="sync" size={20} color="#8B0000" />
              <Text style={styles.badgeLoadingText}>
                Loading achievements...
              </Text>
            </View>
          )}

          {/* Error State */}
          {achievementError && (
            <View style={styles.badgeErrorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#DC2626" />
              <Text style={styles.badgeErrorText}>
                Failed to load achievements
              </Text>
            </View>
          )}

          {/* Badges Display */}
          {!isLoadingAchievements && !achievementError && (
            <>
              {studentBadges.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.badgesScrollContainer}
                >
                  {studentBadges.map((badge) => (
                    <TouchableOpacity
                      key={badge.id}
                      style={styles.badgeLogoOnly}
                      onPress={() => handleBadgePress(badge)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={badge.image}
                        style={styles.badgeLogoImage}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noBadgesContainer}>
                  <MaterialIcons
                    name="emoji-events"
                    size={32}
                    color="#CCCCCC"
                  />
                  <Text style={styles.noBadgesText}>No achievements yet</Text>
                  <Text style={styles.noBadgesSubtext}>
                    Keep up the great work!
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Academic Cards */}
        <View style={styles.academicCardsSection}>
          {/* <TouchableOpacity
            style={styles.academicCard}
            onPress={() => setShowExamsDrawer(true)}
          >
            <View style={styles.cardIcon}>
              <MaterialIcons name="quiz" size={32} color="#6366F1" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Exams</Text>
              <Text style={styles.cardSubtitle}>
                View exam schedules & results
              </Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#9CA3AF" />
          </TouchableOpacity> */}

          <TouchableOpacity
            style={styles.academicCard}
            onPress={() => setShowReportCardsDrawer(true)}
          >
            <View style={styles.cardIcon}>
              <MaterialIcons name="assignment" size={32} color="maroon" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Exams</Text>
              <Text style={styles.cardSubtitle}>
                Academic performance reports
              </Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.academicCard}
            onPress={handleAttendancePress}
          >
            <View style={styles.cardIcon}>
              <MaterialIcons name="event-available" size={32} color="#920734" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Student Attendance</Text>
              <Text style={styles.cardSubtitle}>
                View attendance records and reports
              </Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Modern Stats Cards */}
        {/* <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="calendar-outline" size={24} color="#920734" />
            </View>
            <Text style={styles.statNumber}>
              {selectedStudent.timeline.length}
            </Text>
            <Text style={styles.statTitle}>Years</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="trophy-outline" size={24} color="#920734" />
            </View>
            <Text style={styles.statNumber}>
              {selectedStudent.timeline.reduce(
                (sum, item) => sum + item.achievements.length,
                0
              )}
            </Text>
            <Text style={styles.statTitle}>Awards</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons
                name="checkmark-circle-outline"
                size={24}
                color="#920734"
              />
            </View>
            <Text style={styles.statNumber}>95%</Text>
            <Text style={styles.statTitle}>Attendance</Text>
          </View>
        </View> */}

        {/* Academic Timeline Section */}
        {/* <View style={styles.timelineSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="school-outline" size={20} color="#920734" />
            <Text style={styles.sectionTitle}>Academic Timeline</Text>
          </View>

          <View style={styles.timelineContainer}>
            {selectedStudent.timeline.map((item, index) =>
              renderTimelineItem(item, index)
            )}
          </View>
        </View> */}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Badge Details Modal */}
      <Modal
        visible={showBadgeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBadgeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBadge && (
              <>
                <Image
                  source={selectedBadge.image}
                  style={styles.modalBadgeImage}
                />
                <Text style={styles.modalBadgeTitle}>{selectedBadge.name}</Text>
                <Text style={styles.modalBadgeDescription}>
                  {selectedBadge.title}
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowBadgeModal(false)}
                >
                  <Text style={styles.modalCloseText}>OK</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Exams Drawer Modal */}
      <Modal
        visible={showExamsDrawer}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowExamsDrawer(false)}
      >
        <ExamsDrawer onClose={() => setShowExamsDrawer(false)} />
      </Modal>

      {/* Report Cards Drawer Modal */}
      <Modal
        visible={showReportCardsDrawer}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowReportCardsDrawer(false)}
      >
        <ReportCardsDrawer onClose={() => setShowReportCardsDrawer(false)} />
      </Modal>

      {/* All Badges Drawer */}
      <Modal
        visible={showAllBadgesDrawer}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeAllBadgesDrawer}
      >
        <AllBadgesDrawer onClose={closeAllBadgesDrawer} />
      </Modal>

      {/* Student Attendance Drawer */}
      <StudentAttendanceDrawer
        visible={attendanceDrawerVisible}
        onClose={closeAttendanceDrawer}
        studentId={selectedStudent?.id || 0}
        studentName={selectedStudent?.student_calling_name}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingBottom: 30,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  emptyStateText: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: "#666666",
    marginTop: theme.spacing.md,
  },
  emptyStateSubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#999999",
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    margin: theme.spacing.lg,
    borderRadius: 20,
    padding: theme.spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  profileImageWrapper: {
    position: "relative",
    marginBottom: theme.spacing.md,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#920734",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileInfo: {
    alignItems: "center",
  },
  studentName: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    color: "#000000",
    marginBottom: 4,
  },
  studentDetails: {
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    color: "#666666",
    marginBottom: 4,
  },
  campusName: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#999999",
    marginBottom: theme.spacing.md,
  },
  houseChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  houseText: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  houseCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    gap: 12,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: theme.spacing.md,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    marginBottom: theme.spacing.sm,
  },
  statNumber: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    color: "#000000",
    marginBottom: 4,
  },
  statTitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
  },
  infoSection: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: "#000000",
  },
  infoList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: theme.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#666666",
    flex: 1,
  },
  infoValue: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#000000",
    flex: 1,
    textAlign: "right",
  },
  timelineSection: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  timelineContainer: {
    paddingLeft: 20,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 24,
  },
  timelineLeft: {
    alignItems: "center",
    marginRight: 20,
  },
  timelineYear: {
    backgroundColor: "#920734",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 60,
    alignItems: "center",
  },
  timelineYearText: {
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    color: "#FFFFFF",
  },
  timelineLine: {
    width: 2,
    height: 60,
    backgroundColor: "#E0E0E0",
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  timelineAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  timelineInfo: {
    flex: 1,
  },
  timelineGrade: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: "#000000",
  },
  timelineGPA: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#666666",
    marginTop: 2,
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#1976D2",
  },
  achievementsContainer: {
    marginTop: 8,
  },
  achievementsTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#000000",
    marginBottom: 6,
  },
  achievementText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: "#666666",
    lineHeight: 18,
    marginBottom: 2,
  },
  bottomSpacing: {
    height: 40,
  },
  // New Academic Header Styles with Maroon Theme
  academicHeader: {
    backgroundColor: "#F4E5E8",
    margin: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#920734",
    padding: theme.spacing.md,
    shadowColor: "#920734",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
  },
  headerMainContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  expandIcon: {
    marginLeft: "auto",
    paddingLeft: theme.spacing.sm,
    borderRadius: 12,
    padding: 4,
  },
  expandedContent: {
    marginTop: theme.spacing.sm,
  },
  divider: {
    height: 2,
    backgroundColor: "#920734",
    opacity: 0.2,
    marginBottom: theme.spacing.sm,
  },
  detailsGrid: {
    gap: theme.spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  detailLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
  detailValue: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: "#111827",
    flex: 1,
    textAlign: "right",
  },
  studentPhotoSection: {
    marginRight: theme.spacing.md,
  },
  photoContainer: {
    position: "relative",
  },
  academicProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#920734",
  },
  houseLogoContainer: {
    position: "absolute",
    bottom: -3,
    right: -3,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  houseLogo: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  academicInfo: {
    flex: 1,
  },
  academicStudentName: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: "#920734",
    marginBottom: 3,
  },
  academicStudentId: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: "#666666",
    marginBottom: 4,
  },
  gradeHouseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  academicClass: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#920734",
  },
  houseTablet: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  houseTabletText: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  // Premium Badges Styles
  badgesSection: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  badgesSectionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: "#000000",
    marginBottom: 1,
  },
  badgesScrollContainer: {
    paddingHorizontal: 1,
    backgroundColor: "white",
    borderRadius: 20,
  },
  premiumBadge: {
    borderRadius: 16,
    padding: 10,
    marginRight: 12,
    alignItems: "center",
    minWidth: 100,
    borderWidth: 2,
    shadowColor: "#920734",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  badgeImage: {
    width: 32,
    height: 32,
    marginBottom: 1,
    resizeMode: "contain",
  },
  badgeLogoOnly: {
    // backgroundColor: "red",
    marginRight: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 1,
    marginTop: -10,
  },
  badgeLogoImage: {
    width: 88,
    height: 88,
    resizeMode: "contain",
  },
  badgeName: {
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 8,
  },
  badgeColorBar: {
    width: "100%",
    height: 3,
    borderRadius: 2,
  },
  // Academic Cards Styles
  academicCardsSection: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    gap: 12,
  },
  academicCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: theme.spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: "#000000",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#6B7280",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    minWidth: 280,
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalBadgeImage: {
    width: 154,
    height: 154,
    marginBottom: 16,
    resizeMode: "contain",
  },
  modalBadgeTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: "#920734",
    textAlign: "center",
    marginBottom: 12,
  },
  modalBadgeDescription: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  modalCloseButton: {
    backgroundColor: "#920734",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  modalCloseText: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  // New Category Section Styles
  categorySection: {
    marginBottom: theme.spacing.md,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
    gap: 6,
  },
  categoryTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#920734",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  multilineValue: {
    lineHeight: 18,
    flexWrap: "wrap",
    maxWidth: "100%",
  },
  // Loading State Styles
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#920734",
  },
  // Badge State Styles
  badgeLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xm,
    gap: theme.spacing.sm,
  },
  badgeLoadingText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#8B0000",
  },
  badgeErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  badgeErrorText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#DC2626",
  },
  noBadgesContainer: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  noBadgesText: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: "#666666",
  },
  noBadgesSubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#999999",
  },

  // Title Container with Info Icon
  badgesTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  infoIconContainer: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(139, 0, 0, 0.15)",
    minWidth: 32,
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default StudentProfileMain;
