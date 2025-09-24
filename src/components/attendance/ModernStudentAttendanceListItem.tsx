import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getStudentProfilePicture,
  getDefaultStudentProfileImage,
  getLocalFallbackProfileImage,
} from "../../utils/studentProfileUtils";

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

interface ModernStudentAttendanceListItemProps {
  student: Student;
  onAttendanceChange: (
    studentId: number,
    status: "present" | "absent" | "late",
  ) => void;
  onStudentPress: (student: Student) => void;
}

const ModernStudentAttendanceListItem: React.FC<
  ModernStudentAttendanceListItemProps
> = ({ student, onAttendanceChange, onStudentPress }) => {
  // Get status colors and configuration
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "present":
        return {
          color: "#4CAF50",
          background: "#E8F5E8",
          icon: "check-circle",
          label: "Present",
        };
      case "absent":
        return {
          color: "#F44336",
          background: "#FFEBEE",
          icon: "cancel",
          label: "Absent",
        };
      case "late":
        return {
          color: "#FF9800",
          background: "#FFF3E0",
          icon: "schedule",
          label: "Late",
        };
      default:
        return {
          color: "#666",
          background: "#F5F5F5",
          icon: "help",
          label: "Unknown",
        };
    }
  };

  const statusConfig = getStatusConfig(student.attendance);

  // Get student profile image with fallback
  const getStudentProfileImage = (student: Student) => {
    const profilePictureSource = getStudentProfilePicture(student);
    const profileImage =
      profilePictureSource || getDefaultStudentProfileImage();
    const finalProfileImage = profileImage || getLocalFallbackProfileImage();
    return finalProfileImage;
  };

  // Quick status change buttons
  const StatusButton = ({
    status,
    config,
  }: {
    status: string;
    config: any;
  }) => (
    <TouchableOpacity
      style={[
        styles.statusButton,
        student.attendance === status && { backgroundColor: config.color },
      ]}
      onPress={() => {
        // Use the centralized attendance change handler
        // which will handle late attendance modal logic
        onAttendanceChange(student.id, status as any);
      }}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name={config.icon}
        size={18}
        color={student.attendance === status ? "#fff" : config.color}
      />
    </TouchableOpacity>
  );

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onStudentPress(student)}
      activeOpacity={0.7}
    >
      {/* Status Strip */}
      <View
        style={[styles.statusStrip, { backgroundColor: statusConfig.color }]}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Left Section - Profile */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={getStudentProfileImage(student)}
              style={styles.profileImage}
              defaultSource={getLocalFallbackProfileImage()}
            />

            {/* Status Badge */}
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusConfig.color },
              ]}
            >
              <MaterialIcons
                name={statusConfig.icon as any}
                size={8}
                color="#fff"
              />
            </View>
          </View>
        </View>

        {/* Middle Section - Student Info */}
        <View style={styles.infoSection}>
          <Text style={styles.studentName} numberOfLines={1}>
            {student.student_calling_name || `Student ${student.id}`}
          </Text>
          <Text style={styles.admissionNumber}>
            ID: {student.admission_number}
          </Text>
          <View style={styles.metaInfo}>
            <Text style={styles.gradeClass}>{student.grade}</Text>
            {student.house && (
              <>
                <Text style={styles.separator}> • </Text>
                <Text style={styles.house}>{student.house}</Text>
              </>
            )}
          </View>
        </View>

        {/* Right Section - Status and Actions */}
        <View style={styles.actionSection}>
          {/* Current Status */}
          <View
            style={[
              styles.currentStatus,
              { backgroundColor: statusConfig.background },
            ]}
          >
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <StatusButton
              status="present"
              config={getStatusConfig("present")}
            />
            <StatusButton status="absent" config={getStatusConfig("absent")} />
            <StatusButton status="late" config={getStatusConfig("late")} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    overflow: "hidden",
  },
  statusStrip: {
    height: 3,
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    minHeight: 80,
  },
  profileSection: {
    marginRight: 12,
  },
  profileImageContainer: {
    position: "relative",
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  infoSection: {
    flex: 1,
    paddingRight: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  admissionNumber: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  gradeClass: {
    fontSize: 12,
    fontWeight: "500",
    color: "#920734",
  },
  separator: {
    fontSize: 12,
    color: "#999",
  },
  house: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  actionSection: {
    alignItems: "flex-end",
    minWidth: 110,
  },
  currentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 6,
  },
  statusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
});

export default ModernStudentAttendanceListItem;
