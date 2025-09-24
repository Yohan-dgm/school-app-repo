import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import FullScreenModal from "../../screens/authenticated/principal/dashboard/components/FullScreenModal";
import {
  useGetStudentAttendanceByDateAndClassQuery,
  createStudentAttendanceByDateAndClassParams,
  StudentAttendanceDetail,
  useUpdateStudentAttendanceMutation,
  transformStudentAttendanceDetailToEditFormat,
} from "../../api/attendance-api";
import AttendanceEditModal from "./AttendanceEditModal";

interface StudentAttendanceDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  attendanceDate: string;
  gradeLevelClassId: number;
  gradeLevelClassName: string;
}

const StudentAttendanceDetailsModal: React.FC<
  StudentAttendanceDetailsModalProps
> = ({
  visible,
  onClose,
  attendanceDate,
  gradeLevelClassId,
  gradeLevelClassName,
}) => {
  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(30);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] =
    useState<StudentAttendanceDetail | null>(null);

  // API query
  const queryParams = createStudentAttendanceByDateAndClassParams(
    gradeLevelClassId,
    attendanceDate,
    currentPage,
    pageSize,
  );

  // Skip API call if essential parameters are missing or invalid
  const shouldSkipQuery =
    !attendanceDate || !gradeLevelClassId || attendanceDate.trim() === "";

  const {
    data: studentAttendanceData,
    error,
    isLoading,
    isFetching,
  } = useGetStudentAttendanceByDateAndClassQuery(queryParams, {
    skip: shouldSkipQuery,
  });

  // Update mutation
  const [updateStudentAttendance, { isLoading: isUpdating }] =
    useUpdateStudentAttendanceMutation();

  // Reset states when modal closes
  useEffect(() => {
    if (!visible) {
      setCurrentPage(1);
      setEditModalVisible(false);
      setSelectedStudentForEdit(null);
    }
  }, [visible]);

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Handle edit button press
  const handleEditStudent = (record: StudentAttendanceDetail) => {
    setSelectedStudentForEdit(record);
    setEditModalVisible(true);
  };

  // Handle edit modal close
  const handleEditModalClose = () => {
    setEditModalVisible(false);
    setSelectedStudentForEdit(null);
  };

  // Handle save attendance changes
  const handleSaveAttendance = async (
    studentId: number,
    attendance: "present" | "absent" | "late",
    reason?: string,
    notes?: string,
    inTime?: string,
    outTime?: string,
  ) => {
    try {
      // BUILD REQUEST MATCHING EXACT API DOCUMENTATION FORMAT
      let updateData: any;

      if (attendance === "present") {
        // PRESENT ATTENDANCE - Always send reason as empty string
        updateData = {
          student_id: studentId,
          grade_level_class_id: gradeLevelClassId,
          date: attendanceDate,
          attendance_status: "present",
          in_time: inTime ? `${inTime.trim()}:00` : "08:30:00", // Default if not provided
          out_time: outTime ? `${outTime.trim()}:00` : "15:30:00", // Default if not provided
          notes: notes && notes.trim() ? notes.trim() : "", // Empty string, not null
          reason: "", // ALWAYS empty string, never null to avoid undefined array key
        };
      } else if (attendance === "absent") {
        // ABSENT ATTENDANCE - Match documentation example
        updateData = {
          student_id: studentId,
          grade_level_class_id: gradeLevelClassId,
          date: attendanceDate,
          attendance_status: "absent",
          in_time: null,
          out_time: null,
          notes: notes && notes.trim() ? notes.trim() : "", // Empty string, not null
          reason: reason && reason.trim() ? reason.trim() : "", // Empty string, not null
        };
      } else if (attendance === "late") {
        // LATE ATTENDANCE - Match documentation example
        updateData = {
          student_id: studentId,
          grade_level_class_id: gradeLevelClassId,
          date: attendanceDate,
          attendance_status: "late",
          in_time: inTime ? `${inTime.trim()}:00` : null,
          out_time: outTime ? `${outTime.trim()}:00` : null,
          notes: notes && notes.trim() ? notes.trim() : "", // Empty string, not null
          reason: reason && reason.trim() ? reason.trim() : "", // Empty string, not null
        };
      }

      // Optimistic update: update UI immediately before API call
      if (selectedStudentForEdit) {
        setSelectedStudentForEdit({
          ...selectedStudentForEdit,
          attendance_summary: {
            ...selectedStudentForEdit.attendance_summary,
            status:
              attendance === "present"
                ? "present"
                : attendance === "absent"
                  ? "absent"
                  : "late",
            in_time:
              inTime && attendance !== "absent"
                ? `${inTime.trim()}:00`
                : selectedStudentForEdit.attendance_summary.in_time,
            out_time:
              outTime && attendance !== "absent"
                ? `${outTime.trim()}:00`
                : selectedStudentForEdit.attendance_summary.out_time,
          },
        });
      }

      await updateStudentAttendance(updateData).unwrap();
    } catch (error) {
      console.error("❌ Failed to update attendance:", error);
    }
  };

  // Calculate pagination info
  const totalRecords = studentAttendanceData?.data.pagination.total || 0;
  const totalPages = studentAttendanceData?.data.pagination.total_pages || 1;
  const startRecord = totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  // Get attendance status color
  const getAttendanceStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "present":
        return "#4CAF50"; // Green
      case "late":
        return "#FF9800"; // Orange
      case "absent":
        return "#F44336"; // Red
      case "partial":
        return "#2196F3"; // Blue
      default:
        return "#666";
    }
  };

  // Get attendance status background color
  const getAttendanceStatusBackground = (status: string): string => {
    switch (status.toLowerCase()) {
      case "present":
        return "#E8F5E8"; // Light Green
      case "late":
        return "#FFF3E0"; // Light Orange
      case "absent":
        return "#FFEBEE"; // Light Red
      case "partial":
        return "#E3F2FD"; // Light Blue
      default:
        return "#F5F5F5";
    }
  };

  // Format date for display
  const formatDisplayDate = (dateString: string): string => {
    // Parse the date string properly to avoid timezone issues
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed in Date constructor

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Render student attendance record
  const renderStudentRecord = (
    record: StudentAttendanceDetail,
    index: number,
  ) => {
    const statusColor = getAttendanceStatusColor(
      record.attendance_summary.status,
    );
    const statusBackground = getAttendanceStatusBackground(
      record.attendance_summary.status,
    );

    // Create a unique key using student_id, date and index to ensure uniqueness
    const uniqueKey = `student-${record.student_id}-${record.date}-${index}`;

    return (
      <View key={uniqueKey} style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>
              {record.student.student_calling_name ||
                record.student.full_name_with_title}
            </Text>
            <Text style={styles.admissionNumber}>
              {record.student.admission_number}
            </Text>
          </View>
          <View style={styles.recordActions}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusBackground },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {record.attendance_summary.status.toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditStudent(record)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size={18} color="#999" />
              ) : (
                <MaterialIcons name="edit" size={18} color="#920734" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.recordContent}>
          {record.attendance_summary.status !== "absent" && (
            <View style={styles.timeInfo}>
              {record.attendance_summary.in_time && (
                <View style={styles.timeItem}>
                  <MaterialIcons name="login" size={16} color="#4CAF50" />
                  <Text style={styles.timeLabel}>In: </Text>
                  <Text style={styles.timeValue}>
                    {record.attendance_summary.in_time}
                  </Text>
                </View>
              )}
              {record.attendance_summary.out_time && (
                <View style={styles.timeItem}>
                  <MaterialIcons name="logout" size={16} color="#FF9800" />
                  <Text style={styles.timeLabel}>Out: </Text>
                  <Text style={styles.timeValue}>
                    {record.attendance_summary.out_time}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render loading state
  if (isLoading && !studentAttendanceData) {
    return (
      <FullScreenModal
        visible={visible}
        onClose={onClose}
        title="Student Attendance Details"
        backgroundColor="#F8F9FA"
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#920734" />
          <Text style={styles.loadingText}>Loading student attendance...</Text>
        </View>
      </FullScreenModal>
    );
  }

  // Render state when required parameters are missing
  if (shouldSkipQuery) {
    return (
      <FullScreenModal
        visible={visible}
        onClose={onClose}
        title="Student Attendance Details"
        backgroundColor="#F8F9FA"
      >
        <View style={styles.errorContainer}>
          <MaterialIcons name="info-outline" size={64} color="#FF9800" />
          <Text style={styles.errorTitle}>Missing Information</Text>
          <Text style={styles.errorText}>
            {!attendanceDate || attendanceDate.trim() === ""
              ? "Please select a date to view attendance details."
              : "Please select a class to view attendance details."}
          </Text>
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
        title="Student Attendance Details"
        backgroundColor="#F8F9FA"
      >
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Error Loading Data</Text>
          <Text style={styles.errorText}>
            Unable to load student attendance data. Please try again.
          </Text>
        </View>
      </FullScreenModal>
    );
  }

  return (
    <FullScreenModal
      visible={visible}
      onClose={onClose}
      title="Student Attendance Details"
      backgroundColor="#F8F9FA"
    >
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header Info */}
          <View style={styles.headerInfo}>
            <View style={styles.infoCard}>
              <View style={styles.infoItem}>
                <MaterialIcons
                  name="calendar-today"
                  size={16}
                  color="#920734"
                />
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>
                  {formatDisplayDate(attendanceDate)}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <MaterialIcons name="class" size={16} color="#920734" />
                <Text style={styles.infoLabel}>Class:</Text>
                <Text style={styles.infoValue}>{gradeLevelClassName}</Text>
              </View>
            </View>

            {/* Summary Stats */}
            {studentAttendanceData && (
              <View style={styles.summaryStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: "#4CAF50" }]}>
                    {studentAttendanceData.data.summary.present_count}
                  </Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: "#F44336" }]}>
                    {studentAttendanceData.data.summary.absent_count}
                  </Text>
                  <Text style={styles.statLabel}>Absent</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: "#2196F3" }]}>
                    {studentAttendanceData.data.summary.partial_count}
                  </Text>
                  <Text style={styles.statLabel}>Partial</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {studentAttendanceData.data.summary.total_students}
                  </Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
              </View>
            )}
          </View>

          {/* Results Info */}
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsText}>
              Showing {startRecord}-{endRecord} of {totalRecords} students
            </Text>
            {isFetching && <ActivityIndicator size="small" color="#920734" />}
          </View>

          {/* Student Records */}
          <View style={styles.recordsList}>
            {studentAttendanceData?.data?.attendance_records &&
            studentAttendanceData.data.attendance_records.length > 0 ? (
              studentAttendanceData.data.attendance_records.map(
                (record, index) => renderStudentRecord(record, index),
              )
            ) : (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="person-off" size={64} color="#999" />
                <Text style={styles.noDataTitle}>No Student Records</Text>
                <Text style={styles.noDataText}>
                  No student attendance records found for the selected date and
                  class.
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
                  currentPage === 1 && styles.disabledButton,
                ]}
                onPress={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={20}
                  color={currentPage === 1 ? "#999" : "#920734"}
                />
                <Text
                  style={[
                    styles.paginationText,
                    currentPage === 1 && styles.disabledText,
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              <View style={styles.pageInfo}>
                <Text style={styles.pageText}>
                  Page {currentPage} of {totalPages}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  currentPage === totalPages && styles.disabledButton,
                ]}
                onPress={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <Text
                  style={[
                    styles.paginationText,
                    currentPage === totalPages && styles.disabledText,
                  ]}
                >
                  Next
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={currentPage === totalPages ? "#999" : "#920734"}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Attendance Edit Modal */}
      {selectedStudentForEdit && (
        <AttendanceEditModal
          visible={editModalVisible}
          student={transformStudentAttendanceDetailToEditFormat(
            selectedStudentForEdit,
            gradeLevelClassId,
          )}
          onClose={handleEditModalClose}
          onSave={handleSaveAttendance}
          attendanceDate={attendanceDate}
          isLoading={isUpdating}
        />
      )}
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
  headerInfo: {
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#920734",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
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
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  studentInfo: {
    flex: 1,
    marginRight: 12,
  },
  recordActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editButton: {
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  studentName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  admissionNumber: {
    fontSize: 12,
    color: "#666",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  recordContent: {
    gap: 6,
  },
  timeInfo: {
    flexDirection: "row",
    gap: 16,
  },
  timeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeLabel: {
    fontSize: 12,
    color: "#666",
  },
  timeValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
  },
  notesText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    flex: 1,
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
  },
  detailRecord: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    marginBottom: 2,
  },
  detailTime: {
    fontSize: 12,
    color: "#333",
    minWidth: 50,
  },
  detailType: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    minWidth: 40,
  },
  detailNotes: {
    fontSize: 11,
    color: "#999",
    marginLeft: 8,
    flex: 1,
  },
  noDataContainer: {
    alignItems: "center",
    padding: 40,
  },
  noDataTitle: {
    fontSize: 16,
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
});

export default StudentAttendanceDetailsModal;
