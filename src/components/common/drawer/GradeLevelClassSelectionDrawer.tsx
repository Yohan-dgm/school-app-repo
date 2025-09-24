import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
  Image,
  Alert,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  useGetGradeLevelsWithClassesQuery,
  GradeLevelWithClasses,
  GradeLevelClass,
} from "../../../api/grade-level-api";
import {
  useGetStudentDetailsByClassQuery,
  StudentDetails,
} from "../../../api/student-details-api";
import {
  getStudentProfilePicture,
  getLocalFallbackProfileImage,
} from "../../../utils/studentProfileUtils";

interface GradeLevelClassSelectionDrawerProps {
  onClose: () => void;
  onSelectClass: (
    classData: GradeLevelClass & { gradeLevelName: string }
  ) => void;
}

const GradeLevelClassSelectionDrawer: React.FC<
  GradeLevelClassSelectionDrawerProps
> = ({ onClose, onSelectClass }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [selectedClassData, setSelectedClassData] = useState<
    (GradeLevelClass & { gradeLevelName: string }) | null
  >(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // Fetch grade levels with classes
  const {
    data: gradeLevelsData,
    isLoading,
    error,
    refetch,
  } = useGetGradeLevelsWithClassesQuery({
    page_size: 50,
    page: 1,
  });

  // Fetch students data when in student details mode
  const {
    data: studentsData,
    isLoading: studentsLoading,
    error: studentsError,
  } = useGetStudentDetailsByClassQuery(
    {
      grade_level_class_id: selectedClassData?.id || 0,
      page: 1,
      page_size: 100,
    },
    { skip: !showStudentDetails || !selectedClassData?.id }
  );

  // Flatten and filter classes based on search
  const filteredClasses = useMemo(() => {
    if (!gradeLevelsData?.data?.data) return [];

    const allClasses: (GradeLevelClass & { gradeLevelName: string })[] = [];

    gradeLevelsData.data.data.forEach((gradeLevel: GradeLevelWithClasses) => {
      gradeLevel.grade_level_class_list.forEach(
        (classItem: GradeLevelClass) => {
          allClasses.push({
            ...classItem,
            gradeLevelName: gradeLevel.name,
          });
        }
      );
    });

    if (!searchQuery.trim()) return allClasses;

    return allClasses.filter(
      (classItem) =>
        classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        classItem.gradeLevelName
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
  }, [gradeLevelsData, searchQuery]);

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!studentsData?.data?.data) return [];

    if (!studentSearchQuery.trim()) return studentsData.data.data;

    return studentsData.data.data.filter(
      (student: StudentDetails) =>
        student.full_name
          .toLowerCase()
          .includes(studentSearchQuery.toLowerCase()) ||
        student.admission_number
          .toLowerCase()
          .includes(studentSearchQuery.toLowerCase()) ||
        student.father_full_name
          ?.toLowerCase()
          .includes(studentSearchQuery.toLowerCase()) ||
        student.mother_full_name
          ?.toLowerCase()
          .includes(studentSearchQuery.toLowerCase())
    );
  }, [studentsData, studentSearchQuery]);

  const handleSelectClass = (
    classData: GradeLevelClass & { gradeLevelName: string }
  ) => {
    console.log("🎯 Class selected from drawer:", classData);
    setSelectedClassData(classData);
    setShowStudentDetails(true);
    // Don't call onSelectClass or onClose - keep the drawer open to show student details
  };

  const handleBackToClassList = () => {
    setShowStudentDetails(false);
    setSelectedClassData(null);
    setStudentSearchQuery("");
  };

  // Phone call handler
  const handlePhoneCall = (phoneNumber: string, contactName: string) => {
    if (!phoneNumber || phoneNumber === "N/A") {
      Alert.alert(
        "No Phone Number",
        "Phone number not available for this contact."
      );
      return;
    }

    const cleanedNumber = phoneNumber.replace(/[^0-9+]/g, "");

    Alert.alert("Make Call", `Call ${contactName} at ${phoneNumber}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: () => {
          Linking.openURL(`tel:${cleanedNumber}`).catch((err) => {
            Alert.alert(
              "Error",
              "Unable to make phone call. Please check if your device supports calling."
            );
            console.error("Error making phone call:", err);
          });
        },
      },
    ]);
  };

  const renderClassItem = ({
    item,
  }: {
    item: GradeLevelClass & { gradeLevelName: string };
  }) => (
    <TouchableOpacity
      style={styles.classItem}
      onPress={() => handleSelectClass(item)}
      activeOpacity={0.7}
    >
      <View style={styles.classInfo}>
        <View style={styles.classHeader}>
          <MaterialIcons name="class" size={20} color="#920734" />
          <Text style={styles.className}>{item.name}</Text>
        </View>
        <Text style={styles.gradeLevelName}>{item.gradeLevelName}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#666" />
    </TouchableOpacity>
  );

  // Render student details content
  const renderStudentDetailsContent = () => {
    if (studentsLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#920734" />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      );
    }

    if (studentsError) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>Failed to load students</Text>
          <Text style={styles.errorSubtext}>Please try again later</Text>
        </View>
      );
    }

    if (!filteredStudents.length) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="school" size={48} color="#999" />
          <Text style={styles.emptyText}>
            {studentSearchQuery
              ? "No students found"
              : "No students in this class"}
          </Text>
          <Text style={styles.emptySubtext}>
            {studentSearchQuery
              ? "Try a different search term"
              : "Students will appear here when enrolled"}
          </Text>
        </View>
      );
    }

    return (
      <>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students or parents..."
            value={studentSearchQuery}
            onChangeText={setStudentSearchQuery}
            placeholderTextColor="#999"
          />
          {studentSearchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setStudentSearchQuery("")}
              style={styles.clearButton}
            >
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Results Count */}
        <Text style={styles.resultsCount}>
          {filteredStudents.length} student
          {filteredStudents.length !== 1 ? "s" : ""} found
        </Text>

        {/* Students List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.studentsList}
        >
          {filteredStudents.map((student: StudentDetails) => {
            // Get student profile image using utility function
            const profileImageSource =
              getStudentProfilePicture(student) ||
              getLocalFallbackProfileImage();

            return (
              <View key={student.id} style={styles.studentCard}>
                {/* Student Header */}
                <View style={styles.studentHeader}>
                  <View style={styles.studentAvatar}>
                    <Image
                      source={profileImageSource}
                      style={styles.studentAvatarImage}
                    />
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.full_name}</Text>
                    <Text style={styles.studentMeta}>
                      {student.admission_number} •{" "}
                      {student.grade_level_class?.name || "No Class"}
                    </Text>
                    <Text style={styles.studentMeta}>
                      {student.school_house?.name || "No House"} •{" "}
                      {student.gender}
                    </Text>
                  </View>
                </View>

                {/* Parent Contact Cards */}
                <View style={styles.contactCardsContainer}>
                  {/* Father Contact */}
                  {student.father_full_name && (
                    <View style={styles.contactCard}>
                      <View style={styles.contactHeader}>
                        <MaterialIcons
                          name="person"
                          size={16}
                          color="#920734"
                        />
                        <Text style={styles.contactRole}>Father</Text>
                      </View>
                      <Text style={styles.contactName}>
                        {student.father_full_name}
                      </Text>
                      <View style={styles.contactActions}>
                        {student.father_phone &&
                          student.father_phone !== "N/A" && (
                            <TouchableOpacity
                              style={styles.phoneButton}
                              onPress={() =>
                                handlePhoneCall(
                                  student.father_phone || "",
                                  `${student.father_full_name || "Father"} (Father)`
                                )
                              }
                            >
                              <MaterialIcons
                                name="phone"
                                size={16}
                                color="#FFFFFF"
                              />
                              <Text style={styles.phoneButtonText}>
                                {student.father_phone}
                              </Text>
                            </TouchableOpacity>
                          )}
                        {student.father_whatsapp &&
                          student.father_whatsapp !== "N/A" && (
                            <TouchableOpacity
                              style={styles.whatsappButton}
                              onPress={() =>
                                handlePhoneCall(
                                  student.father_whatsapp || "",
                                  `${student.father_full_name || "Father"} (WhatsApp)`
                                )
                              }
                            >
                              <MaterialIcons
                                name="chat"
                                size={16}
                                color="#FFFFFF"
                              />
                              <Text style={styles.phoneButtonText}>
                                {student.father_whatsapp}
                              </Text>
                            </TouchableOpacity>
                          )}
                      </View>
                    </View>
                  )}

                  {/* Mother Contact */}
                  {student.mother_full_name && (
                    <View style={styles.contactCard}>
                      <View style={styles.contactHeader}>
                        <MaterialIcons
                          name="person"
                          size={16}
                          color="#920734"
                        />
                        <Text style={styles.contactRole}>Mother</Text>
                      </View>
                      <Text style={styles.contactName}>
                        {student.mother_full_name}
                      </Text>
                      <View style={styles.contactActions}>
                        {student.mother_phone &&
                          student.mother_phone !== "N/A" && (
                            <TouchableOpacity
                              style={styles.phoneButton}
                              onPress={() =>
                                handlePhoneCall(
                                  student.mother_phone || "",
                                  `${student.mother_full_name || "Mother"} (Mother)`
                                )
                              }
                            >
                              <MaterialIcons
                                name="phone"
                                size={16}
                                color="#FFFFFF"
                              />
                              <Text style={styles.phoneButtonText}>
                                {student.mother_phone}
                              </Text>
                            </TouchableOpacity>
                          )}
                        {student.mother_whatsapp &&
                          student.mother_whatsapp !== "N/A" && (
                            <TouchableOpacity
                              style={styles.whatsappButton}
                              onPress={() =>
                                handlePhoneCall(
                                  student.mother_whatsapp || "",
                                  `${student.mother_full_name || "Mother"} (WhatsApp)`
                                )
                              }
                            >
                              <MaterialIcons
                                name="chat"
                                size={16}
                                color="#FFFFFF"
                              />
                              <Text style={styles.phoneButtonText}>
                                {student.mother_whatsapp}
                              </Text>
                            </TouchableOpacity>
                          )}
                      </View>
                    </View>
                  )}

                  {/* Guardian Contact */}
                  {student.guardian_full_name && (
                    <View style={styles.contactCard}>
                      <View style={styles.contactHeader}>
                        <MaterialIcons
                          name="person"
                          size={16}
                          color="#920734"
                        />
                        <Text style={styles.contactRole}>Guardian</Text>
                      </View>
                      <Text style={styles.contactName}>
                        {student.guardian_full_name}
                      </Text>
                      <View style={styles.contactActions}>
                        {student.guardian_phone &&
                          student.guardian_phone !== "N/A" && (
                            <TouchableOpacity
                              style={styles.phoneButton}
                              onPress={() =>
                                handlePhoneCall(
                                  student.guardian_phone || "",
                                  `${student.guardian_full_name || "Guardian"} (Guardian)`
                                )
                              }
                            >
                              <MaterialIcons
                                name="phone"
                                size={16}
                                color="#FFFFFF"
                              />
                              <Text style={styles.phoneButtonText}>
                                {student.guardian_phone}
                              </Text>
                            </TouchableOpacity>
                          )}
                        {student.guardian_whatsapp &&
                          student.guardian_whatsapp !== "N/A" && (
                            <TouchableOpacity
                              style={styles.whatsappButton}
                              onPress={() =>
                                handlePhoneCall(
                                  student.guardian_whatsapp || "",
                                  `${student.guardian_full_name || "Guardian"} (WhatsApp)`
                                )
                              }
                            >
                              <MaterialIcons
                                name="chat"
                                size={16}
                                color="#FFFFFF"
                              />
                              <Text style={styles.phoneButtonText}>
                                {student.guardian_whatsapp}
                              </Text>
                            </TouchableOpacity>
                          )}
                      </View>
                    </View>
                  )}
                </View>

                {/* Additional Student Details */}
                <View style={styles.studentDetails}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="cake" size={16} color="#666" />
                    <Text style={styles.detailLabel}>DOB:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(student.date_of_birth).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons
                      name="local-hospital"
                      size={16}
                      color="#666"
                    />
                    <Text style={styles.detailLabel}>Blood:</Text>
                    <Text style={styles.detailValue}>
                      {student.blood_group}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="home" size={16} color="#666" />
                    <Text style={styles.detailLabel}>House:</Text>
                    <Text style={styles.detailValue}>
                      {student.school_house?.name || "Not assigned"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#920734" />
          <Text style={styles.loadingText}>Loading classes...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>Failed to load classes</Text>
          <Text style={styles.errorSubtext}>Please try again later</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filteredClasses.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="search-off" size={48} color="#999" />
          <Text style={styles.emptyText}>
            {searchQuery ? "No classes found" : "No classes available"}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? "Try a different search term"
              : "Contact administrator"}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredClasses}
        renderItem={renderClassItem}
        keyExtractor={(item) => `${item.id}-${item.grade_level_id}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    );
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {showStudentDetails ? (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleBackToClassList}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {showStudentDetails ? "My Class" : "Select Class"}
            </Text>
            {showStudentDetails && selectedClassData && (
              <Text style={styles.headerSubtitle}>
                {selectedClassData.name} - {selectedClassData.gradeLevelName}
              </Text>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Bar - Only show when not in student details mode */}
        {!showStudentDetails && (
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <MaterialIcons
                name="search"
                size={20}
                color="#666"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search classes or grade levels..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={styles.clearButton}
                >
                  <MaterialIcons name="clear" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {/* Results Count */}
            {!isLoading && !error && (
              <Text style={styles.resultsCount}>
                {filteredClasses.length} class
                {filteredClasses.length !== 1 ? "es" : ""} found
              </Text>
            )}
          </View>
        )}

        {/* Content Area */}
        <View style={styles.content}>
          {showStudentDetails ? renderStudentDetailsContent() : renderContent()}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Class Management System</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#920734",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  searchSection: {
    backgroundColor: "#F8F9FA",
    paddingTop: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 10,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a1a",
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: "#666",
    marginHorizontal: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  content: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  classItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  classInfo: {
    flex: 1,
  },
  classHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  className: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginLeft: 8,
  },
  gradeLevelName: {
    fontSize: 14,
    color: "#666",
    marginLeft: 28,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#920734",
    marginTop: 16,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F44336",
    marginTop: 16,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#920734",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#F8F9FA",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  footerText: {
    fontSize: 14,
    color: "#999999",
  },
  // Student Details Styles
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
    opacity: 0.8,
    marginTop: 2,
  },
  studentsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  studentCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  studentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  studentAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  studentMeta: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  contactCardsContainer: {
    marginBottom: 16,
  },
  contactCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  contactRole: {
    fontSize: 12,
    fontWeight: "600",
    color: "#920734",
    marginLeft: 4,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  contactActions: {
    flexDirection: "row",
    gap: 8,
  },
  phoneButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "maroon",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flex: 1,
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "maroon",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flex: 1,
  },
  phoneButtonText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
    marginLeft: 4,
  },
  studentDetails: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    marginRight: 8,
    minWidth: 40,
  },
  detailValue: {
    fontSize: 12,
    color: "#1a1a1a",
    flex: 1,
  },
});

export default GradeLevelClassSelectionDrawer;
