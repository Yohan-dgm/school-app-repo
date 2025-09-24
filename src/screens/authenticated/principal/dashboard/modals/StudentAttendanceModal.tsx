import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useDispatch } from "react-redux";
import { MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import FullScreenModal from "../components/FullScreenModal";
import {
  useGetStudentAttendanceAggregatedQuery,
  createAttendanceQueryParams,
  getTotalStudentsCount,
  getAttendancePercentage,
  formatAttendanceDate,
  AttendanceRecord,
  GradeLevelClass,
  attendanceApi,
} from "../../../../../api/attendance-api";
import AttendanceChart from "../../../../../components/attendance/CompactAttendanceChart";
import StudentAttendanceDetailsModal from "../../../../../components/attendance/StudentAttendanceDetailsModal";
import AddAttendanceModal from "../../../../../components/attendance/ModernAddAttendanceModal";

interface StudentAttendanceModalProps {
  visible: boolean;
  onClose: () => void;
}

const StudentAttendanceModal: React.FC<StudentAttendanceModalProps> = ({
  visible,
  onClose,
}) => {
  // Redux dispatch
  const dispatch = useDispatch();

  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchPhrase, setSearchPhrase] = useState("");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  // Details modal state
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState("");
  const [selectedGradeLevelClassName, setSelectedGradeLevelClassName] =
    useState("");
  const [selectedGradeLevelClassId, setSelectedGradeLevelClassId] = useState(0);

  // Add attendance modal state
  const [addAttendanceModalVisible, setAddAttendanceModalVisible] =
    useState(false);

  // API query for table data (paginated)
  const queryParams = createAttendanceQueryParams(
    currentPage,
    pageSize,
    searchPhrase,
    selectedGradeFilter,
  );

  // Debug logging to ensure proper parameters
  React.useEffect(() => {
    console.log("\n" + "=".repeat(70));
    console.log("🏫 STUDENT ATTENDANCE MODAL - COMPONENT STATE LOG");
    console.log("=".repeat(70));
    console.log("🔍 Query Parameters:", {
      currentPage,
      pageSize,
      searchPhrase,
      selectedGradeFilter,
      queryParams,
    });
    console.log("📋 IMPORTANT - API Request Parameters:", {
      page: queryParams.page,
      page_size: queryParams.page_size,
      group_filter: queryParams.group_filter,
      search_phrase: queryParams.search_phrase,
      search_filter_list: queryParams.search_filter_list,
    });
    console.log("=".repeat(70) + "\n");
  }, [currentPage, pageSize, searchPhrase, selectedGradeFilter, queryParams]);

  // Log modal opening
  React.useEffect(() => {
    if (visible) {
      console.log("\n" + "=".repeat(70));
      console.log("🚪 STUDENT ATTENDANCE MODAL OPENED");
      console.log("=".repeat(70));
      console.log("📋 Initial Modal State:", {
        visible: true,
        currentPage,
        pageSize,
        searchPhrase,
        selectedGradeFilter,
        showFilters,
        detailsModalVisible,
        addAttendanceModalVisible,
        timestamp: new Date().toISOString(),
      });
      console.log("=".repeat(70) + "\n");
    }
  }, [visible]);

  // Log attendance data when it changes
  React.useEffect(() => {
    if (attendanceData) {
      console.log("\n" + "=".repeat(70));
      console.log("📊 ATTENDANCE DATA RECEIVED IN MODAL");
      console.log("=".repeat(70));
      console.log("📈 Data Summary:", {
        status: attendanceData.status,
        recordsCount: attendanceData.data?.data?.length || 0,
        totalRecords: attendanceData.data?.total || 0,
        totalPages: Math.ceil((attendanceData.data?.total || 0) / pageSize),
        currentPage,
        requestedPageSize: pageSize,
        actualRecordsReceived: attendanceData.data?.data?.length || 0,
        studentAttendanceCount:
          attendanceData.data?.student_attendance_count || 0,
        gradeClassesAvailable:
          attendanceData.data?.grade_level_class_list?.length || 0,
      });

      console.log("🚨 PAGINATION CHECK:");
      console.log({
        "Requested page_size": pageSize,
        "Actual records returned": attendanceData.data?.data?.length || 0,
        "Records we'll display": Math.min(
          attendanceData.data?.data?.length || 0,
          pageSize,
        ),
        "Are they equal?":
          (attendanceData.data?.data?.length || 0) === pageSize,
        "Backend might be ignoring page_size":
          (attendanceData.data?.data?.length || 0) > pageSize,
      });

      if ((attendanceData.data?.data?.length || 0) > pageSize) {
        console.warn(
          `🚨 WARNING: Backend returned ${attendanceData.data?.data?.length} records but we requested ${pageSize}. Using client-side slice to show only ${pageSize} records.`,
        );
      }

      if (attendanceData.data?.data && attendanceData.data.data.length > 0) {
        console.log("\n📋 Attendance Records in Modal:");
        console.table(
          attendanceData.data.data.map((record, index) => ({
            index: index + 1,
            id: record.id,
            date: formatAttendanceDate(record.date),
            gradeClass: record.grade_level_class.name,
            present: record.present_student_count,
            absent: record.absent_student_count,
            total: record.present_student_count + record.absent_student_count,
            rate: getAttendancePercentage(record).toFixed(1) + "%",
            educator: record.user.full_name,
          })),
        );
      }

      if (attendanceData.data?.grade_level_class_list) {
        console.log("\n📚 Grade Classes Available for Filtering:");
        console.table(
          attendanceData.data.grade_level_class_list.map((gc, index) => ({
            index: index + 1,
            id: gc.id,
            name: gc.name,
            gradeLevel: gc.grade_level?.name || "N/A",
            selected: gc.name === selectedGradeFilter,
          })),
        );
      }

      console.log("=".repeat(70) + "\n");
    }
  }, [attendanceData, currentPage, pageSize, selectedGradeFilter]);

  // Log loading states
  React.useEffect(() => {
    if (isLoading || isFetching) {
      console.log(
        `⏳ Loading attendance data... (isLoading: ${isLoading}, isFetching: ${isFetching})`,
      );
    }
  }, [isLoading, isFetching]);

  // Log error states
  React.useEffect(() => {
    if (error) {
      console.log("\n❌ ERROR OCCURRED IN ATTENDANCE DATA FETCH:");
      console.log("=".repeat(70));
      console.log("Error Details:", {
        error: error,
        errorType: typeof error,
        errorString: error.toString(),
        timestamp: new Date().toISOString(),
      });

      // Try to extract more details from the error
      if (typeof error === "object" && error !== null) {
        console.log("Error Object Properties:", Object.keys(error));
        if ("status" in error) {
          console.log("HTTP Status:", error.status);
        }
        if ("data" in error) {
          console.log("Error Data:", error.data);
        }
        if ("message" in error) {
          console.log("Error Message:", error.message);
        }
      }
      console.log("=".repeat(70) + "\n");
    }
  }, [error]);

  const {
    data: attendanceData,
    error,
    isLoading,
    isFetching,
  } = useGetStudentAttendanceAggregatedQuery(queryParams);

  // API query for chart data (all records)
  const chartQueryParams = createAttendanceQueryParams(
    1,
    1000, // Large page size to get all records for chart
    "", // No search filter for chart
    selectedGradeFilter,
  );

  const { data: chartData, isLoading: chartLoading } =
    useGetStudentAttendanceAggregatedQuery(chartQueryParams);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchPhrase, selectedGradeFilter]);

  // Handle grade filter change
  const handleGradeFilterChange = (value: string) => {
    console.log("\n🔍 GRADE FILTER CHANGED:");
    console.log({
      previousFilter: selectedGradeFilter,
      newFilter: value,
      willResetToPage1: true,
      timestamp: new Date().toISOString(),
    });
    setSelectedGradeFilter(value);
  };

  // Handle search
  const handleSearchChange = (text: string) => {
    console.log("\n🔍 SEARCH PHRASE CHANGED:");
    console.log({
      previousSearch: searchPhrase,
      newSearch: text,
      willResetToPage1: true,
      timestamp: new Date().toISOString(),
    });
    setSearchPhrase(text);
  };

  // Handle pagination (jumps by 1 page = 10 records at a time)
  const handlePageChange = (direction: "next" | "previous") => {
    let newPage: number;

    if (direction === "next") {
      newPage = Math.min(currentPage + 1, totalPages);
    } else {
      newPage = Math.max(currentPage - 1, 1);
    }

    console.log("\n📄 PAGE CHANGED (10 records jump):");
    console.log({
      previousPage: currentPage,
      newPage: newPage,
      direction: direction,
      recordsJump: pageSize,
      totalPages: totalPages,
      totalRecords: attendanceData?.data.total || 0,
      pageSize: pageSize,
      timestamp: new Date().toISOString(),
    });
    setCurrentPage(newPage);
  };

  // Handle attendance record click
  const handleAttendanceRecordClick = (record: AttendanceRecord) => {
    console.log("\n👆 ATTENDANCE RECORD CLICKED:");
    console.log({
      recordId: record.id,
      date: record.date,
      formattedDate: formatAttendanceDate(record.date),
      gradeClass: record.grade_level_class.name,
      gradeLevelClassId: record.grade_level_class.id,
      presentCount: record.present_student_count,
      absentCount: record.absent_student_count,
      totalStudents: getTotalStudentsCount(record),
      attendanceRate: getAttendancePercentage(record).toFixed(1) + "%",
      createdBy: record.user.full_name,
      timestamp: new Date().toISOString(),
    });
    setSelectedAttendanceDate(record.date);
    setSelectedGradeLevelClassName(record.grade_level_class.name);
    setSelectedGradeLevelClassId(record.grade_level_class.id || 0);
    setDetailsModalVisible(true);
  };

  // Handle details modal close
  const handleDetailsModalClose = () => {
    setDetailsModalVisible(false);
  };

  // Handle add attendance modal
  const handleAddAttendanceOpen = () => {
    setAddAttendanceModalVisible(true);
  };

  const handleAddAttendanceClose = () => {
    setAddAttendanceModalVisible(false);
  };

  const handleAddAttendanceSuccess = () => {
    // Invalidate and refetch the attendance data to show new records
    console.log(
      "🔄 Attendance added successfully, invalidating cache and refreshing data...",
    );

    // Invalidate both the paginated data and chart data
    dispatch(
      attendanceApi.util.invalidateTags([
        "StudentAttendanceAggregated",
        "Attendance",
        "StudentAttendance",
      ]),
    );

    // Reset to first page to show latest data
    setCurrentPage(1);
  };

  // Calculate pagination info
  const totalRecords = attendanceData?.data.total || 0;
  const rawCurrentRecords = attendanceData?.data.data?.length || 0;
  // Ensure we don't show more records than requested page size
  const currentRecords = Math.min(rawCurrentRecords, pageSize);
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startRecord = totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endRecord =
    totalRecords > 0
      ? Math.min((currentPage - 1) * pageSize + currentRecords, totalRecords)
      : 0;

  // Log pagination calculations
  React.useEffect(() => {
    if (attendanceData) {
      console.log("\n📊 PAGINATION CALCULATIONS:");
      console.log({
        totalRecords,
        currentRecords,
        totalPages,
        currentPage,
        pageSize,
        startRecord,
        endRecord,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
        recordsRange: `${startRecord}-${endRecord} of ${totalRecords}`,
        timestamp: new Date().toISOString(),
      });
    }
  }, [
    totalRecords,
    currentRecords,
    totalPages,
    currentPage,
    pageSize,
    startRecord,
    endRecord,
    attendanceData,
  ]);

  // Render attendance record item
  const renderAttendanceRecord = (record: AttendanceRecord, index: number) => {
    const totalStudents = getTotalStudentsCount(record);
    const attendancePercentage = getAttendancePercentage(record);

    // Create a unique key using multiple fields to ensure uniqueness
    const uniqueKey = `${record.id}-${record.date}-${record.grade_level_class.id || record.grade_level_class.name}-${index}`;

    return (
      <TouchableOpacity
        key={uniqueKey}
        style={styles.recordCard}
        onPress={() => handleAttendanceRecordClick(record)}
        activeOpacity={0.7}
      >
        <View style={styles.recordHeader}>
          <View style={styles.recordHeaderLeft}>
            <View style={styles.dateContainer}>
              <MaterialIcons name="calendar-today" size={16} color="#666" />
              <Text style={styles.dateText}>
                {formatAttendanceDate(record.date)}
              </Text>
            </View>
            {/* Show grade level class name only when 'All' filter is selected */}
            {selectedGradeFilter === "All" && (
              <View style={styles.gradeContainer}>
                <MaterialIcons name="class" size={14} color="#920734" />
                <Text style={styles.gradeText}>
                  {record.grade_level_class.name}
                </Text>
              </View>
            )}
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#920734" />
        </View>

        <View style={styles.recordContent}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Present</Text>
              <Text style={[styles.statValue, { color: "#4CAF50" }]}>
                {record.present_student_count}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Absent</Text>
              <Text style={[styles.statValue, { color: "#F44336" }]}>
                {record.absent_student_count}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{totalStudents}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Rate</Text>
              <Text style={[styles.statValue, { color: "#2196F3" }]}>
                {attendancePercentage.toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.recordFooter}>
            <View style={styles.educatorInfo}>
              <MaterialIcons name="person" size={14} color="#666" />
              <Text style={styles.educatorText}>
                By {record.user.full_name}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render loading state
  if (isLoading && !attendanceData) {
    return (
      <FullScreenModal
        visible={visible}
        onClose={onClose}
        title="Student Attendance"
        backgroundColor="#F8F9FA"
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#920734" />
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        </View>
      </FullScreenModal>
    );
  }

  // Render error state
  if (error) {
    return (
      <FullScreenModal
        visible={visible}
        onClose={onClose}
        title="Student Attendance"
        backgroundColor="#F8F9FA"
      >
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Error Loading Data</Text>
          <Text style={styles.errorText}>
            Unable to load attendance data. Please try again.
          </Text>
        </View>
      </FullScreenModal>
    );
  }

  // Create header action button
  const headerAction = (
    <TouchableOpacity
      style={styles.addButton}
      onPress={handleAddAttendanceOpen}
      activeOpacity={0.7}
    >
      <MaterialIcons name="add" size={24} color="#FFFFFF" />
      <Text style={styles.addButtonText}>Add Attendance</Text>
    </TouchableOpacity>
  );

  return (
    <FullScreenModal
      visible={visible}
      onClose={onClose}
      title="Student Attendance"
      backgroundColor="#F8F9FA"
      headerAction={headerAction}
    >
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Attendance Chart - Hidden for now */}
          {false && (
            <AttendanceChart
              attendanceData={chartData?.data.data || []}
              selectedGrade={selectedGradeFilter}
              loading={chartLoading}
            />
          )}

          {/* Filters */}
          <View style={styles.filtersContainer}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search attendance records..."
                placeholderTextColor="#666"
                value={searchPhrase}
                onChangeText={handleSearchChange}
              />
            </View>

            {/* Horizontal Scrollable Grade Filter */}
            <View style={styles.gradeFilterSection}>
              <Text style={styles.gradeFilterLabel}>Filter by Grade:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.gradeFilterScroll}
                contentContainerStyle={styles.gradeFilterContent}
              >
                {/* All Grades Chip */}
                <TouchableOpacity
                  style={[
                    styles.gradeChip,
                    selectedGradeFilter === "All" && styles.gradeChipActive,
                  ]}
                  onPress={() => handleGradeFilterChange("All")}
                >
                  <MaterialIcons
                    name="school"
                    size={16}
                    color={selectedGradeFilter === "All" ? "#FFFFFF" : "#666"}
                  />
                  <Text
                    style={[
                      styles.gradeChipText,
                      selectedGradeFilter === "All" &&
                        styles.gradeChipTextActive,
                    ]}
                  >
                    All Grades
                  </Text>
                </TouchableOpacity>

                {/* Individual Grade Chips */}
                {attendanceData?.data.grade_level_class_list?.map(
                  (gradeClass) => (
                    <TouchableOpacity
                      key={gradeClass.id}
                      style={[
                        styles.gradeChip,
                        selectedGradeFilter === gradeClass.name &&
                          styles.gradeChipActive,
                      ]}
                      onPress={() => handleGradeFilterChange(gradeClass.name)}
                    >
                      <MaterialIcons
                        name="class"
                        size={16}
                        color={
                          selectedGradeFilter === gradeClass.name
                            ? "#FFFFFF"
                            : "#666"
                        }
                      />
                      <Text
                        style={[
                          styles.gradeChipText,
                          selectedGradeFilter === gradeClass.name &&
                            styles.gradeChipTextActive,
                        ]}
                      >
                        {gradeClass.name}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </ScrollView>
            </View>
          </View>

          {/* Results Info */}
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsText}>
              Showing {startRecord}-{endRecord} of {totalRecords} records
            </Text>
            {isFetching && <ActivityIndicator size="small" color="#920734" />}
          </View>

          {/* Attendance Records */}
          <View style={styles.recordsList}>
            {attendanceData?.data?.data &&
            attendanceData.data.data.length > 0 ? (
              // Ensure we only show the requested page size (10 records max)
              attendanceData.data.data
                .slice(0, pageSize)
                .map((record, index) => renderAttendanceRecord(record, index))
            ) : (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="event-busy" size={64} color="#999" />
                <Text style={styles.noDataTitle}>No Attendance Records</Text>
                <Text style={styles.noDataText}>
                  No attendance records found for the selected filters.
                </Text>
              </View>
            )}
          </View>

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  currentPage <= 1 && styles.disabledButton,
                ]}
                onPress={() => handlePageChange("previous")}
                disabled={currentPage <= 1}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={20}
                  color={currentPage <= 1 ? "#999" : "#920734"}
                />
                <Text
                  style={[
                    styles.paginationText,
                    currentPage <= 1 && styles.disabledText,
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              <View style={styles.pageInfo}>
                <Text style={styles.pageText}>
                  Page {currentPage} of {totalPages}
                </Text>
                <Text style={styles.recordsText}>
                  {startRecord}-{endRecord} of {totalRecords} records
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  currentPage >= totalPages && styles.disabledButton,
                ]}
                onPress={() => handlePageChange("next")}
                disabled={currentPage >= totalPages}
              >
                <Text
                  style={[
                    styles.paginationText,
                    currentPage >= totalPages && styles.disabledText,
                  ]}
                >
                  Next
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={currentPage >= totalPages ? "#999" : "#920734"}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Student Attendance Details Modal */}
      <StudentAttendanceDetailsModal
        visible={detailsModalVisible}
        onClose={handleDetailsModalClose}
        attendanceDate={selectedAttendanceDate}
        gradeLevelClassId={selectedGradeLevelClassId}
        gradeLevelClassName={selectedGradeLevelClassName}
      />

      {/* Add Attendance Modal */}
      <AddAttendanceModal
        visible={addAttendanceModalVisible}
        onClose={handleAddAttendanceClose}
        onSuccess={handleAddAttendanceSuccess}
      />
    </FullScreenModal>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F44336",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  filtersContainer: {
    marginBottom: 16,
    gap: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
  },
  gradeFilterSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  gradeFilterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  gradeFilterScroll: {
    flexGrow: 0,
  },
  gradeFilterContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  gradeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 6,
    minWidth: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gradeChipActive: {
    backgroundColor: "#920734",
    borderColor: "#920734",
    shadowColor: "#920734",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  gradeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
  gradeChipTextActive: {
    color: "#FFFFFF",
  },
  resultsInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 12,
    color: "#666",
  },
  recordsList: {
    marginBottom: 16,
  },
  recordCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recordHeaderLeft: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: 6,
  },
  gradeContainer: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  recordContent: {
    gap: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  recordFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  educatorInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  educatorText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#999",
    marginTop: 16,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    marginTop: 8,
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#920734",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: "#E0E0E0",
  },
  paginationText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginHorizontal: 4,
  },
  disabledText: {
    color: "#999",
  },
  pageInfo: {
    alignItems: "center",
  },
  pageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  recordsText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
});

export default StudentAttendanceModal;
