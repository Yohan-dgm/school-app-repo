import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import {
  modernColors,
  maroonTheme,
  feedbackCardTheme,
} from "../../data/studentGrowthData";
import { useGetStudentAttendanceByIdQuery } from "../../api/attendance-api";
import AttendanceItem from "./AttendanceItem";
import AttendancePagination from "./AttendancePagination";
import AttendanceCalendarView from "./AttendanceCalendarView";

const { height: screenHeight } = Dimensions.get("window");

interface StudentAttendanceDrawerProps {
  visible: boolean;
  onClose: () => void;
  studentId: number;
  studentName?: string;
}

const StudentAttendanceDrawer: React.FC<StudentAttendanceDrawerProps> = ({
  visible,
  onClose,
  studentId,
  studentName = "Student",
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [slideAnim] = useState(new Animated.Value(screenHeight));
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar"); // Default to calendar view
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const scrollViewRef = useRef<ScrollView>(null);
  const pageSize = 10; // Load 10 records per page as requested

  // API call for paginated attendance data (for list view)
  const {
    data: apiResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetStudentAttendanceByIdQuery(
    {
      student_id: studentId,
      page: currentPage,
      page_size: pageSize,
    },
    {
      skip: !visible || !studentId || studentId === 0,
      refetchOnMountOrArgChange: true,
    },
  );

  // API call for ALL attendance data (for calendar view)
  const {
    data: allDataResponse,
    isLoading: isLoadingAllData,
    isError: isErrorAllData,
    error: errorAllData,
  } = useGetStudentAttendanceByIdQuery(
    {
      student_id: studentId,
      page: 1,
      page_size: 2000, // Get large dataset for calendar - increased to handle full year
    },
    {
      skip: !visible || !studentId || studentId === 0,
      refetchOnMountOrArgChange: true,
    },
  );

  console.log(
    "🎯 StudentAttendanceDrawer - API Response (paginated):",
    apiResponse,
  );
  console.log(
    "🎯 StudentAttendanceDrawer - All Data Response:",
    allDataResponse,
  );
  console.log("🎯 StudentAttendanceDrawer - Current Page:", currentPage);
  console.log("🎯 StudentAttendanceDrawer - Loading:", isLoading);
  console.log(
    "🎯 StudentAttendanceDrawer - Loading All Data:",
    isLoadingAllData,
  );
  console.log("🎯 StudentAttendanceDrawer - Student ID:", studentId);
  console.log("🎯 StudentAttendanceDrawer - Visible:", visible);

  // Enhanced debugging for data structure
  if (apiResponse) {
    console.log("📊 API Response Structure:", {
      // Laravel pagination format (actual format from backend)
      isLaravelPagination: !!apiResponse.current_page,
      current_page: apiResponse.current_page,
      total: apiResponse.total,
      per_page: apiResponse.per_page,
      last_page: apiResponse.last_page,
      data_count: apiResponse.data?.length || 0,

      // Show first record for debugging
      first_record: apiResponse.data?.[0],
    });
  }

  if (isError) {
    console.log("❌ API Error:", error);
  }

  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Reset page when drawer opens
  useEffect(() => {
    if (visible) {
      setCurrentPage(1);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const scrollToTop = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      // Auto-scroll to top when changing page
      setTimeout(scrollToTop, 100);
    }
  };

  const handleNextPage = () => {
    const totalPages = apiResponse?.last_page || 0;
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      // Auto-scroll to top when changing page
      setTimeout(scrollToTop, 100);
    }
  };

  const handleAttendancePress = (attendance: any) => {
    console.log("🎯 Attendance record selected:", attendance);
    // Future: Open detailed view modal if needed
  };

  const handleDateSelect = (date: string) => {
    console.log("🎯 Calendar date selected:", date);
    setSelectedDate(date);
    // Switch to list view to show the selected date's details
    setViewMode("list");
  };

  // Filter attendance records based on selected date (for list view)
  const getFilteredAttendanceRecords = () => {
    // API now returns properly formatted single records per date with server-side pagination
    const attendanceRecords = apiResponse?.data || [];

    console.log(
      "🔍 getFilteredAttendanceRecords - API records:",
      attendanceRecords?.length || 0,
    );
    console.log("🔍 Selected Date:", selectedDate, "View Mode:", viewMode);

    if (selectedDate && viewMode === "list") {
      // Filter for selected date - check in all data since paginated data might not contain the date
      const allRecords = allDataResponse?.data || [];
      const dateFiltered = allRecords.filter(
        (record: any) => record.date === selectedDate,
      );

      console.log("🔍 Date filtered records:", dateFiltered?.length || 0);
      return dateFiltered;
    }

    // For list view without date filter, use paginated records from API (server-side pagination)
    console.log(
      "🔍 Returning API paginated records:",
      attendanceRecords?.length || 0,
    );
    return attendanceRecords;
  };

  // Get all attendance records for calendar view
  const getAllAttendanceRecords = () => {
    // API now returns properly formatted single records per date - no grouping needed
    const allRecords = (allDataResponse?.data || []) as any[];
    console.log(
      "📅 getAllAttendanceRecords - All records count:",
      allRecords?.length || 0,
    );

    return allRecords;
  };

  // Reset selection when switching to calendar view
  const handleViewModeToggle = (mode: "calendar" | "list") => {
    console.log("🎯 Switching view mode to:", mode);
    setViewMode(mode);

    // Clear selected date when switching to calendar view for full overview
    if (mode === "calendar") {
      setSelectedDate(undefined);
    }
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={feedbackCardTheme.primary} />
      <Text style={styles.loadingText}>Loading attendance data...</Text>
    </View>
  );

  const renderErrorState = () => {
    const isAuthError =
      error &&
      typeof error === "object" &&
      (("status" in error && (error as any).status === 401) ||
        ("data" in error &&
          (error as any).data?.status === "authentication-required"));

    const isServerError =
      error &&
      typeof error === "object" &&
      (("status" in error && (error as any).status === 500) ||
        ("data" in error && (error as any).data?.status === "server-error"));

    const isNotFoundError =
      error &&
      typeof error === "object" &&
      (("status" in error && (error as any).status === 404) ||
        ("data" in error && (error as any).data?.status === "not-found"));

    let iconName: any = "error-outline";
    let iconColor = feedbackCardTheme.error;
    let title = "Unable to Load Attendance";
    let subtitle = "Please try again later or contact support if this persists";
    let showRetry = true;

    if (isAuthError) {
      iconName = "lock-outline";
      iconColor = "#F59E0B";
      title = "Authentication Required";
      subtitle = "Please log in to view attendance data";
      showRetry = false;
    } else if (isServerError) {
      iconName = "build-outline";
      iconColor = "#FF6B35";
      title = "Server Error";
      subtitle =
        "Unable to connect to the attendance server. Please try again later.";
      showRetry = true;
    } else if (isNotFoundError) {
      iconName = "help-outline";
      iconColor = "#FF6B35";
      title = "No Attendance Data";
      subtitle = "No attendance records found for this student.";
      showRetry = false;
    }

    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name={iconName} size={48} color={iconColor} />
        <Text style={[styles.errorTitle, { color: iconColor }]}>{title}</Text>
        <Text style={styles.errorSubtitle}>{subtitle}</Text>
        {showRetry && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <MaterialIcons
              name="refresh"
              size={20}
              color={feedbackCardTheme.white}
            />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons
        name="event-available"
        size={64}
        color={feedbackCardTheme.grayMedium}
      />
      <Text style={styles.emptyTitle}>No Attendance Records</Text>
      <Text style={styles.emptySubtitle}>
        No attendance records have been recorded for {studentName} yet.
        Attendance records will appear here once they are entered in the system.
      </Text>
    </View>
  );

  const renderContent = () => {
    console.log("🎯 renderContent - isLoading:", isLoading);
    console.log("🎯 renderContent - isError:", isError);
    console.log("🎯 renderContent - apiResponse:", apiResponse);

    // If no valid student ID, show appropriate message
    if (!studentId || studentId === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="person-outline"
            size={64}
            color={feedbackCardTheme.grayMedium}
          />
          <Text style={styles.emptyTitle}>No Student Selected</Text>
          <Text style={styles.emptySubtitle}>
            Please select a student to view their attendance records.
          </Text>
        </View>
      );
    }

    // Check loading states based on view mode
    if (viewMode === "calendar" && isLoadingAllData) {
      return renderLoadingState();
    }

    if (viewMode === "list" && isLoading) {
      return renderLoadingState();
    }

    // Check error states based on view mode
    if (viewMode === "calendar" && isErrorAllData) {
      return renderErrorState();
    }

    if (viewMode === "list" && isError) {
      return renderErrorState();
    }

    const allAttendanceRecords = getAllAttendanceRecords(); // For calendar view (grouped by date)
    const filteredAttendanceRecords = getFilteredAttendanceRecords(); // For list view (grouped by date)

    // Build pagination object from API's Laravel pagination format
    const pagination = apiResponse
      ? {
          page: apiResponse.current_page || 1,
          page_size: apiResponse.per_page || pageSize,
          total: apiResponse.total || 0,
          total_pages: apiResponse.last_page || 1,
        }
      : null;

    // Extract student info from first record (since Laravel format doesn't have separate student_info)
    // Note: For now we don't display student info in the UI, so we'll keep it simple

    console.log(
      "🎯 renderContent - allAttendanceRecords (calendar):",
      allAttendanceRecords.length,
    );
    console.log(
      "🎯 renderContent - filteredAttendanceRecords (list):",
      filteredAttendanceRecords.length,
    );
    console.log("🎯 renderContent - selectedDate:", selectedDate);
    console.log("🎯 renderContent - viewMode:", viewMode);

    // Check if we have data for the current view mode
    const hasDataForView =
      viewMode === "calendar"
        ? allAttendanceRecords.length > 0
        : filteredAttendanceRecords.length > 0;

    if (!hasDataForView && !isLoading && !isLoadingAllData) {
      return renderEmptyState();
    }

    if (viewMode === "calendar") {
      // Calendar View - show all records for calendar marking
      return (
        <AttendanceCalendarView
          attendanceRecords={allAttendanceRecords}
          onDateSelect={handleDateSelect}
          selectedDate={selectedDate}
        />
      );
    } else {
      // List View - show filtered records
      const recordsToShow = filteredAttendanceRecords;

      if (recordsToShow.length === 0 && selectedDate) {
        // Show empty state for selected date
        return (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="event-available"
              size={64}
              color={feedbackCardTheme.grayMedium}
            />
            <Text style={styles.emptyTitle}>No Record for Selected Date</Text>
            <Text style={styles.emptySubtitle}>
              No attendance record found for{" "}
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              .
            </Text>
            <TouchableOpacity
              style={styles.backToCalendarButton}
              onPress={() => handleViewModeToggle("calendar")}
            >
              <MaterialIcons
                name="calendar-month"
                size={16}
                color={feedbackCardTheme.white}
              />
              <Text style={styles.backToCalendarText}>Back to Calendar</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <>
          {/* Show selected date info if filtering */}
          {selectedDate && (
            <View style={styles.selectedDateHeader}>
              <View style={styles.selectedDateInfo}>
                <MaterialIcons
                  name="event"
                  size={16}
                  color={feedbackCardTheme.primary}
                />
                <Text style={styles.selectedDateText}>
                  Showing:{" "}
                  {new Date(selectedDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.clearSelectionButton}
                onPress={() => {
                  setSelectedDate(undefined);
                }}
              >
                <Text style={styles.clearSelectionText}>Show All</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            ref={scrollViewRef}
            style={styles.attendanceList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.attendanceListContent}
          >
            {recordsToShow.map((attendance: any, index: number) => (
              <AttendanceItem
                key={`${attendance.id}-${attendance.date}-${attendance.attendance_type_id}`}
                attendance={attendance}
                index={index}
                onPress={() => handleAttendancePress(attendance)}
              />
            ))}
          </ScrollView>

          {/* Show pagination when not filtering by date and there are multiple pages */}
          {!selectedDate && pagination && pagination.total_pages > 1 && (
            <AttendancePagination
              currentPage={currentPage}
              totalPages={pagination.total_pages}
              totalRecords={pagination.total}
              pageSize={pageSize}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
              isLoading={isLoading}
            />
          )}
        </>
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />

      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
      </TouchableOpacity>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <MaterialIcons
              name="event-available"
              size={24}
              color={feedbackCardTheme.primary}
            />
            <View style={styles.headerText}>
              <Text style={styles.title}>Student Attendance</Text>
              <Text style={styles.subtitle}>
                Attendance history for {studentName}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {/* View Toggle Buttons */}
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  viewMode === "calendar" && styles.activeToggleButton,
                ]}
                onPress={() => handleViewModeToggle("calendar")}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name="calendar-month"
                  size={18}
                  color={
                    viewMode === "calendar"
                      ? feedbackCardTheme.white
                      : feedbackCardTheme.grayMedium
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  viewMode === "list" && styles.activeToggleButton,
                ]}
                onPress={() => handleViewModeToggle("list")}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name="list"
                  size={18}
                  color={
                    viewMode === "list"
                      ? feedbackCardTheme.white
                      : feedbackCardTheme.grayMedium
                  }
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name="close"
                size={24}
                color={feedbackCardTheme.grayMedium}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>{renderContent()}</View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  drawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.85,
    backgroundColor: feedbackCardTheme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: feedbackCardTheme.shadow.large,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: feedbackCardTheme.grayMedium + "40",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: feedbackCardTheme.grayLight,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: feedbackCardTheme.black,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: feedbackCardTheme.grayMedium,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: feedbackCardTheme.grayLight,
    borderRadius: 20,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  activeToggleButton: {
    backgroundColor: feedbackCardTheme.primary,
    shadowColor: feedbackCardTheme.shadow.small,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  attendanceList: {
    flex: 1,
  },
  attendanceListContent: {
    paddingTop: 8,
    paddingBottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: feedbackCardTheme.grayMedium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: feedbackCardTheme.error,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 14,
    color: feedbackCardTheme.grayMedium,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: feedbackCardTheme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: feedbackCardTheme.white,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: feedbackCardTheme.grayMedium,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: feedbackCardTheme.grayMedium,
    textAlign: "center",
    lineHeight: 20,
  },
  backToCalendarButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: feedbackCardTheme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    gap: 6,
  },
  backToCalendarText: {
    fontSize: 14,
    fontWeight: "600",
    color: feedbackCardTheme.white,
  },
  selectedDateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: feedbackCardTheme.primary + "10",
    borderBottomWidth: 1,
    borderBottomColor: feedbackCardTheme.grayLight,
  },
  selectedDateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: "600",
    color: feedbackCardTheme.black,
  },
  clearSelectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: feedbackCardTheme.grayLight,
  },
  clearSelectionText: {
    fontSize: 12,
    fontWeight: "500",
    color: feedbackCardTheme.grayMedium,
  },
});

export default StudentAttendanceDrawer;
