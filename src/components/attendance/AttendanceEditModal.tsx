import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import FullScreenModal from "../../screens/authenticated/principal/dashboard/components/FullScreenModal";
import TimePickerInput from "./TimePickerInput";
import {
  getStudentProfilePicture,
  getDefaultStudentProfileImage,
  getLocalFallbackProfileImage,
} from "../../utils/studentProfileUtils";
import { getDefaultAttendanceTimes } from "../../api/attendance-api";

interface Student {
  id: number;
  name: string;
  full_name: string;
  student_calling_name?: string;
  admission_number: string;
  profile_image?: string;
  attachment?: any;
  attachments?: any[];
  student_attachment_list?: any[];
  grade: string;
  class: string;
  house?: string;
  attendance: "present" | "absent" | "late";
}

interface AttendanceEditModalProps {
  visible: boolean;
  student: Student | null;
  onClose: () => void;
  onSave: (
    studentId: number,
    attendance: "present" | "absent" | "late",
    reason?: string,
    notes?: string,
    inTime?: string,
    outTime?: string,
  ) => void;
  attendanceDate: string;
  preSelectedStatus?: "present" | "absent" | "late";
  isLoading?: boolean;
}

const ABSENCE_REASONS = [
  {
    id: "illness",
    label: "Illness/Medical",
    icon: "medical-services",
    color: "#F44336",
  },
  {
    id: "family",
    label: "Family Emergency",
    icon: "family-restroom",
    color: "#FF5722",
  },
  {
    id: "vacation",
    label: "Family Vacation",
    icon: "flight-takeoff",
    color: "#2196F3",
  },
  {
    id: "appointment",
    label: "Medical Appointment",
    icon: "schedule",
    color: "#FF9800",
  },
  {
    id: "transport",
    label: "Transportation Issues",
    icon: "directions-bus",
    color: "#607D8B",
  },
  {
    id: "weather",
    label: "Weather Conditions",
    icon: "cloud",
    color: "#9C27B0",
  },
  {
    id: "personal",
    label: "Personal Reasons",
    icon: "person",
    color: "#795548",
  },
  { id: "other", label: "Other", icon: "help", color: "#666" },
];

const AttendanceEditModal: React.FC<AttendanceEditModalProps> = ({
  visible,
  student,
  onClose,
  onSave,
  attendanceDate,
  preSelectedStatus,
  isLoading = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<
    "present" | "absent" | "late"
  >("present");
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  const [inTime, setInTime] = useState<string>("");
  const [outTime, setOutTime] = useState<string>("");

  // Initialize state when student changes
  useEffect(() => {
    if (student) {
      const defaultTimes = getDefaultAttendanceTimes();

      // Use preSelectedStatus if provided, otherwise use student's current attendance
      const initialStatus = preSelectedStatus || student.attendance;
      setSelectedStatus(initialStatus);
      setSelectedReason("");
      setNotes("");
      setHasChanges(false);
      setInTime(defaultTimes.schoolStartTime);
      setOutTime(defaultTimes.currentTime);

      // If status is "late" (either pre-selected or student's current status),
      // ensure we show the time section and mark as having changes
      if (initialStatus === "late") {
        setHasChanges(true); // Mark as having changes to enable save button
      }
    }
  }, [student, preSelectedStatus]);

  // Track changes
  useEffect(() => {
    if (student) {
      const statusChanged = selectedStatus !== student.attendance;
      const hasNotes = notes.trim().length > 0;
      const hasReason = selectedReason.length > 0;
      const hasTimeChanges = inTime.length > 0 || outTime.length > 0;
      setHasChanges(statusChanged || hasNotes || hasReason || hasTimeChanges);
    }
  }, [selectedStatus, notes, selectedReason, inTime, outTime, student]);

  if (!student) return null;

  // Get status configuration
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "present":
        return {
          color: "#4CAF50",
          background: "#E8F5E8",
          gradient: ["#4CAF50", "#45A049"],
          icon: "check-circle",
          label: "Present",
          description: "Student is present in class",
        };
      case "absent":
        return {
          color: "#F44336",
          background: "#FFEBEE",
          gradient: ["#F44336", "#E53935"],
          icon: "cancel",
          label: "Absent",
          description: "Student is not present in class",
        };
      case "late":
        return {
          color: "#FF9800",
          background: "#FFF3E0",
          gradient: ["#FF9800", "#FB8C00"],
          icon: "schedule",
          label: "Late",
          description: "Student arrived late to class",
        };
      default:
        return {
          color: "#666",
          background: "#F5F5F5",
          gradient: ["#666", "#555"],
          icon: "help",
          label: "Unknown",
          description: "",
        };
    }
  };

  const currentStatusConfig = getStatusConfig(selectedStatus);

  // Get student profile image
  const getStudentImage = () => {
    const profilePictureSource = getStudentProfilePicture(student);
    const profileImage =
      profilePictureSource || getDefaultStudentProfileImage();
    return profileImage || getLocalFallbackProfileImage();
  };

  // Handle save
  const handleSave = () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    // Validate required reason for absence
    if (selectedStatus === "absent" && !selectedReason) {
      Alert.alert(
        "Missing Information",
        "Please select a reason for the absence.",
      );
      return;
    }

    // Validate required time fields for late attendance
    if (selectedStatus === "late") {
      if (!inTime || !outTime) {
        Alert.alert(
          "Missing Information",
          "Please set both in time and out time for late attendance.",
        );
        return;
      }
    }

    // Clear reason and notes for present status to ensure clean data
    const finalReason =
      selectedStatus === "present" ? undefined : selectedReason;
    const finalNotes = selectedStatus === "present" ? undefined : notes;

    onSave(
      student.id,
      selectedStatus,
      finalReason,
      finalNotes,
      inTime,
      outTime,
    );
    onClose();
  };

  // Handle close - simplified without unsaved changes alert
  const handleClose = () => {
    onClose();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <FullScreenModal
      visible={visible}
      onClose={handleClose}
      title="Edit Attendance"
      backgroundColor="#F8F9FA"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Student Profile Header */}
          <View style={styles.profileHeader}>
            {/* <LinearGradient
              colors={currentStatusConfig.gradient}
              style={styles.profileGradient}
            >
              <Image
                source={getStudentImage()}
                style={styles.profileImage}
                defaultSource={getLocalFallbackProfileImage()}
              />
            </LinearGradient> */}

            <View style={styles.profileInfo}>
              <Text style={styles.studentName}>
                {student.student_calling_name || student.full_name}
              </Text>
              <Text style={styles.admissionNumber}>
                ID: {student.admission_number}
              </Text>
              <View style={styles.studentMeta}>
                <Text style={styles.gradeClass}>{student.grade}</Text>
                {student.house && (
                  <>
                    <Text style={styles.separator}> • </Text>
                    <Text style={styles.house}>{student.house}</Text>
                  </>
                )}
              </View>
            </View>

            {/* Current Status Badge */}
            <View
              style={[
                styles.currentStatusBadge,
                { backgroundColor: currentStatusConfig.background },
              ]}
            >
              <MaterialIcons
                name={currentStatusConfig.icon as any}
                size={20}
                color={currentStatusConfig.color}
              />
              <Text
                style={[
                  styles.currentStatusText,
                  { color: currentStatusConfig.color },
                ]}
              >
                {currentStatusConfig.label}
              </Text>
            </View>
          </View>

          {/* Date Information */}
          <View style={styles.dateCard}>
            <MaterialIcons name="calendar-today" size={20} color="#920734" />
            <View style={styles.dateInfo}>
              <Text style={styles.dateLabel}>Attendance Date</Text>
              <Text style={styles.dateValue}>{formatDate(attendanceDate)}</Text>
            </View>
          </View>

          {/* Status Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attendance Status</Text>
            <Text style={styles.sectionDescription}>
              Select the attendance status for this student
            </Text>

            <View style={styles.statusOptions}>
              {["present", "absent", "late"].map((status) => {
                const config = getStatusConfig(status);
                const isSelected = selectedStatus === status;

                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      isSelected && {
                        backgroundColor: config.background,
                        borderColor: config.color,
                      },
                    ]}
                    onPress={() => {
                      setSelectedStatus(status as any);
                      // Clear reason and notes when switching to present status
                      if (status === "present") {
                        setSelectedReason("");
                        setNotes("");
                      }
                    }}
                  >
                    <View style={styles.statusOptionHeader}>
                      <MaterialIcons
                        name={config.icon as any}
                        size={24}
                        color={isSelected ? config.color : "#666"}
                      />
                      <Text
                        style={[
                          styles.statusOptionLabel,
                          isSelected && {
                            color: config.color,
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {config.label}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.statusOptionDescription,
                        isSelected && { color: config.color },
                      ]}
                    >
                      {config.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Reason Selection (for absent/late) */}
          {(selectedStatus === "absent" || selectedStatus === "late") && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Reason{" "}
                {selectedStatus === "absent" && (
                  <Text style={styles.required}>*</Text>
                )}
              </Text>
              <Text style={styles.sectionDescription}>
                Select a reason for the{" "}
                {selectedStatus === "absent" ? "absence" : "late arrival"}
              </Text>

              <View style={styles.reasonGrid}>
                {ABSENCE_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    style={[
                      styles.reasonOption,
                      selectedReason === reason.id && {
                        backgroundColor: reason.color + "15",
                        borderColor: reason.color,
                      },
                    ]}
                    onPress={() => setSelectedReason(reason.id)}
                  >
                    <MaterialIcons
                      name={reason.icon as any}
                      size={20}
                      color={
                        selectedReason === reason.id ? reason.color : "#666"
                      }
                    />
                    <Text
                      style={[
                        styles.reasonLabel,
                        selectedReason === reason.id && {
                          color: reason.color,
                          fontWeight: "600",
                        },
                      ]}
                    >
                      {reason.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Time Selection (for late attendance) */}
          {selectedStatus === "late" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Arrival Times <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.sectionDescription}>
                Set the in time and out time for late arrival
              </Text>

              <View style={styles.timePickersContainer}>
                <TimePickerInput
                  label="In Time"
                  value={inTime}
                  onTimeChange={setInTime}
                  placeholder="07:30"
                  required={true}
                />

                <TimePickerInput
                  label="Out Time"
                  value={outTime}
                  onTimeChange={setOutTime}
                  placeholder="13:00"
                  required={true}
                />
              </View>
            </View>
          )}

          {/* Notes Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <Text style={styles.sectionDescription}>
              Add any additional information or context (optional)
            </Text>

            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={4}
              placeholder="Enter any additional notes..."
              placeholderTextColor="#999"
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (!hasChanges || isLoading) && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={!hasChanges || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator
                  size={16}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
              ) : (
                <MaterialIcons
                  name="save"
                  size={16}
                  color={hasChanges ? "#fff" : "#999"}
                  style={{ marginRight: 8 }}
                />
              )}
              <Text
                style={[
                  styles.saveButtonText,
                  (!hasChanges || isLoading) && styles.disabledText,
                ]}
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </FullScreenModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  profileHeader: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  profileGradient: {
    borderRadius: 50,
    padding: 4,
    marginBottom: 12,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  profileInfo: {
    alignItems: "center",
    marginBottom: 12,
  },
  studentName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 4,
  },
  admissionNumber: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  studentMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  gradeClass: {
    fontSize: 14,
    fontWeight: "600",
    color: "#920734",
  },
  separator: {
    color: "#999",
  },
  house: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  currentStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  currentStatusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  dateInfo: {
    marginLeft: 12,
  },
  dateLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  required: {
    color: "#F44336",
  },
  statusOptions: {
    gap: 12,
  },
  statusOption: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  statusOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  statusOptionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  statusOptionDescription: {
    fontSize: 14,
    color: "#666",
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  reasonOption: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    minWidth: "45%",
    flex: 1,
  },
  reasonLabel: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
    marginTop: 6,
  },
  notesInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    fontSize: 14,
    color: "#333",
    minHeight: 100,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 20,
    paddingBottom: 40,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#920734",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  disabledButton: {
    backgroundColor: "#E0E0E0",
  },
  disabledText: {
    color: "#999",
  },
  timePickersContainer: {
    gap: 16,
  },
});

export default AttendanceEditModal;
