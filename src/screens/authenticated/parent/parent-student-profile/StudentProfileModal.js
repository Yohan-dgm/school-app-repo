import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../../../styles/theme";

const { width, height } = Dimensions.get("window");

// House color mapping and validation
const getHouseInfo = (houseName) => {
  if (!houseName || houseName === "Unknown House") {
    return { isValid: false, color: "#999999" }; // Gray for no house
  }

  const lowerHouseName = houseName.toLowerCase();

  if (lowerHouseName.includes("vulcan")) {
    return { isValid: true, color: "#FF8C00" }; // Orange
  } else if (lowerHouseName.includes("tellus")) {
    return { isValid: true, color: "#FFD700" }; // Yellow
  } else if (lowerHouseName.includes("eurus")) {
    return { isValid: true, color: "#87CEEB" }; // Light blue
  } else if (lowerHouseName.includes("calypso")) {
    return { isValid: true, color: "#32CD32" }; // Green
  }

  return { isValid: false, color: "#999999" }; // Gray for unrecognized house
};

const StudentProfileModal = ({ visible, onClose, student }) => {
  if (!student) return null;

  const renderTimelineItem = (item, index) => (
    <View key={index} style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View style={styles.yearBadge}>
          <Text style={styles.yearText}>{item.year}</Text>
        </View>
        {index < student.timeline.length - 1 && (
          <View style={styles.timelineLine} />
        )}
      </View>

      <View style={styles.timelineContent}>
        <View style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Image
              source={student.profileImage}
              style={styles.timelineAvatar}
            />
            <View style={styles.timelineInfo}>
              <Text style={styles.timelineGrade}>{item.grade}</Text>
              <Text style={styles.timelineGPA}>GPA: {item.gpa}</Text>
            </View>
          </View>

          {/* Badges */}
          <View style={styles.badgesContainer}>
            {item.badges.map((badge, badgeIndex) => (
              <View key={badgeIndex} style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))}
          </View>

          {/* Achievements */}
          <View style={styles.achievementsContainer}>
            <Text style={styles.achievementsTitle}>Achievements</Text>
            {item.achievements.map((achievement, achIndex) => (
              <View key={achIndex} style={styles.achievementItem}>
                <MaterialIcons name="star" size={16} color="#FFD700" />
                <Text style={styles.achievementText}>{achievement}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Modern Header with Gradient */}
        <LinearGradient
          colors={["#920734", "#B91C4C"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {/* <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
          </TouchableOpacity> */}
          <Text style={styles.headerTitle}>Student Profile</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Modern Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileImageWrapper}>
              <Image
                source={student.profileImage}
                style={styles.profileImage}
              />
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={18} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.studentDetails}>
                {student.studentId} • Class {student.grade}
              </Text>
              <Text style={styles.campusName}>{student.campus}</Text>

              {(() => {
                const houseInfo = getHouseInfo(student.schoolHouse);

                if (!houseInfo.isValid) {
                  // Show small gray circle for no house or unrecognized house
                  return (
                    <View
                      style={[
                        styles.houseCircle,
                        { backgroundColor: houseInfo.color },
                      ]}
                    />
                  );
                }

                // Show house name with color
                return (
                  <View
                    style={[
                      styles.houseChip,
                      { backgroundColor: houseInfo.color },
                    ]}
                  >
                    <Text style={styles.houseText}>{student.schoolHouse}</Text>
                  </View>
                );
              })()}
            </View>
          </View>

          {/* Academic Timeline Section */}
          <View style={styles.timelineSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="school-outline" size={20} color="#920734" />
              <Text style={styles.sectionTitle}>Academic Timeline</Text>
            </View>

            <View style={styles.timelineContainer}>
              {student.timeline.map((item, index) =>
                renderTimelineItem(item, index),
              )}
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  // Modern Header Styles
  header: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    elevation: 0,
    shadowOpacity: 0,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },
  // Content Styles
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // Modern Profile Card
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "center",
  },
  profileImageWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: "#920734",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
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
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 6,
    textAlign: "center",
  },
  studentDetails: {
    fontSize: 15,
    color: "#666",
    marginBottom: 4,
    textAlign: "center",
  },
  campusName: {
    fontSize: 14,
    color: "#920734",
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  houseChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  houseText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  houseCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  // Modern Stats Grid
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    marginBottom: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Modern Information Section
  infoSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginLeft: 8,
  },
  infoList: {
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "500",
    flex: 1.2,
    textAlign: "right",
  },
  // Timeline Section
  timelineSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  timelineContainer: {
    paddingTop: 10,
  },
  bottomSpacing: {
    height: 30,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  timelineLeft: {
    alignItems: "center",
    marginRight: 20,
  },
  yearBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 50,
    alignItems: "center",
  },
  yearText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E0E0E0",
    marginTop: 10,
  },
  timelineContent: {
    flex: 1,
  },
  timelineCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 16,
    elevation: 4,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  timelineAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  timelineInfo: {
    flex: 1,
  },
  timelineGrade: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  timelineGPA: {
    fontSize: 14,
    color: "#666",
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    color: "#1976D2",
    fontWeight: "500",
  },
  achievementsContainer: {
    marginTop: 8,
  },
  achievementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  achievementText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
});

export default StudentProfileModal;
