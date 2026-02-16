import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useSelector } from "react-redux";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../../../../styles/theme";
import {
  useGetGradeLevelsWithClassesQuery,
  GradeLevelWithClasses,
  GradeLevelClass,
} from "../../../../../api/grade-level-api";
import {
  useGetStudentDetailsByClassQuery,
  StudentDetails,
} from "../../../../../api/student-details-api";
import { useCreateStudentAchievementMutation } from "../../../../../api/student-achievement-api";
import {
  getStudentProfilePicture,
  getLocalFallbackProfileImage,
} from "../../../../../utils/studentProfileUtils";

interface StudentAchievementModalProps {
  visible: boolean;
  onClose: () => void;
}

// Time range options
const TIME_RANGES = [
  { id: "1_month", label: "1 Month" },
  { id: "3_month", label: "3 Months" },
  { id: "1_year", label: "1 Year" },
  { id: "10_year", label: "10 Years" },
] as const;

// Achievement titles
const ACHIEVEMENT_TITLES = [
  "Athletic Star",
  "Best Attendance Award",
  "Best Communicator",
  "Best Leadership Award",
  "Best Role Model",
  "Best Team Player",
  "Creativity Award",
  "Hardworking Award",
  "Helping Hand",
  "Kindness Award",
  "Leadership",
  "Most Responsible Student",
  "Perseverance Award",
  "Positive Attitude Award",
  "High Flyer in Sport",
];


const StudentAchievementModal: React.FC<StudentAchievementModalProps> = ({
  visible,
  onClose,
}) => {
  // Redux session data
  const sessionData = useSelector((state: any) => state.session?.sessionData);

  // Step management
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Grade and Class selection
  const [selectedGrade, setSelectedGrade] =
    useState<GradeLevelWithClasses | null>(null);
  const [selectedClass, setSelectedClass] = useState<GradeLevelClass | null>(
    null
  );

  // Step 2: Student selection
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Step 3: Achievement details
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "1_month" | "3_month" | "1_year" | "10_year"
  >("1_month");
  const [selectedTitle, setSelectedTitle] = useState<string>(
    ACHIEVEMENT_TITLES[0]
  );
  const [description, setDescription] = useState("");

  // API hooks
  const {
    data: gradeLevelsData,
    isLoading: gradeLevelsLoading,
    error: gradeLevelsError,
  } = useGetGradeLevelsWithClassesQuery({
    page_size: 50,
    page: 1,
  });

  const {
    data: studentsData,
    isLoading: studentsLoading,
    error: studentsError,
  } = useGetStudentDetailsByClassQuery(
    {
      grade_level_class_id: selectedClass?.id || 0,
      page: 1,
      page_size: 100,
    },
    { skip: !selectedClass?.id }
  );

  const [createAchievement, { isLoading: isSubmitting }] =
    useCreateStudentAchievementMutation();

  // Filtered students based on search
  const students = useMemo(() => {
    if (!studentsData?.data?.data) return [];
    return studentsData.data.data;
  }, [studentsData]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    return students.filter(
      (student) =>
        student.student_calling_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        student.admission_number
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  // Reset form
  const resetForm = () => {
    setCurrentStep(1);
    setSelectedGrade(null);
    setSelectedClass(null);
    setSelectedStudent(null);
    setSearchQuery("");
    setSelectedTimeRange("1_month");
    setSelectedTitle(ACHIEVEMENT_TITLES[0]);
    setDescription("");
  };

  // Handle close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Handle grade selection
  const handleGradeSelect = (grade: GradeLevelWithClasses) => {
    if (selectedGrade?.id === grade.id) {
      setSelectedGrade(null);
      setSelectedClass(null);
    } else {
      setSelectedGrade(grade);
      setSelectedClass(null);
    }
  };

  // Handle class selection
  const handleClassSelect = (classItem: GradeLevelClass) => {
    setSelectedClass(classItem);
  };

  // Handle next to step 2
  const handleNextToStep2 = () => {
    if (!selectedGrade || !selectedClass) {
      Alert.alert(
        "Selection Required",
        "Please select both grade level and class."
      );
      return;
    }
    setCurrentStep(2);
  };

  // Handle next to step 3
  const handleNextToStep3 = () => {
    if (!selectedStudent) {
      Alert.alert("Selection Required", "Please select a student.");
      return;
    }
    setCurrentStep(3);
  };

  // Handle back navigation
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    // Validation
    if (!selectedStudent || !selectedGrade || !selectedClass) {
      Alert.alert("Error", "Please select grade, class, and student.");
      return;
    }

    if (!selectedTitle) {
      Alert.alert("Error", "Please select an achievement title.");
      return;
    }

    if (!selectedTimeRange) {
      Alert.alert("Error", "Please select a time range.");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please enter an achievement description.");
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert("Error", "Description must be at least 10 characters long.");
      return;
    }

    try {
      // Calculate dates based on time range
      const startDate = new Date();
      const endDate = new Date();

      if (selectedTimeRange === "1_month") {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (selectedTimeRange === "3_month") {
        endDate.setMonth(endDate.getMonth() + 3);
      } else if (selectedTimeRange === "1_year") {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else if (selectedTimeRange === "10_year") {
        endDate.setFullYear(endDate.getFullYear() + 10);
      }

      const requestData = {
        student_id: selectedStudent.id,
        grade_level_id: selectedGrade.id,
        grade_level_class_id: selectedClass.id,
        achievement_type: "award",
        title: selectedTitle,
        description: description.trim(),
        time_range: selectedTimeRange,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        created_by_user_id: sessionData?.user?.id || 0,
        school_id: sessionData?.school_id || 0,
      };

      const response = await createAchievement(requestData).unwrap();

      if (response.status === "successful") {
        Alert.alert(
          "Success",
          "Student achievement has been created successfully!",
          [
            {
              text: "OK",
              onPress: handleClose,
            },
          ]
        );
      } else {
        Alert.alert(
          "Error",
          response.message || "Failed to create achievement"
        );
      }
    } catch (error: any) {
      console.error("Error creating achievement:", error);
      Alert.alert(
        "Error",
        error?.data?.message ||
          "Failed to create achievement. Please try again."
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <MaterialIcons name="arrow-back" size={24} color="#920734" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>Create Student Achievement</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            <View style={styles.stepRow}>
              <View
                style={[
                  styles.stepDot,
                  currentStep >= 1 && styles.stepDotActive,
                ]}
              >
                <Text
                  style={[
                    styles.stepDotText,
                    currentStep >= 1 && styles.stepDotTextActive,
                  ]}
                >
                  1
                </Text>
              </View>
              <View
                style={[
                  styles.stepLine,
                  currentStep >= 2 && styles.stepLineActive,
                ]}
              />
              <View
                style={[
                  styles.stepDot,
                  currentStep >= 2 && styles.stepDotActive,
                ]}
              >
                <Text
                  style={[
                    styles.stepDotText,
                    currentStep >= 2 && styles.stepDotTextActive,
                  ]}
                >
                  2
                </Text>
              </View>
              <View
                style={[
                  styles.stepLine,
                  currentStep >= 3 && styles.stepLineActive,
                ]}
              />
              <View
                style={[
                  styles.stepDot,
                  currentStep >= 3 && styles.stepDotActive,
                ]}
              >
                <Text
                  style={[
                    styles.stepDotText,
                    currentStep >= 3 && styles.stepDotTextActive,
                  ]}
                >
                  3
                </Text>
              </View>
            </View>
            <View style={styles.stepLabels}>
              <Text style={styles.stepLabel}>Grade & Class</Text>
              <Text style={styles.stepLabel}>Student</Text>
              <Text style={styles.stepLabel}>Details</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Step 1: Grade and Class Selection */}
          {currentStep === 1 && (
            <View style={styles.stepContent}>
              {/* Grade Level Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Grade Level</Text>
                {gradeLevelsLoading ? (
                  <ActivityIndicator size="small" color="#920734" />
                ) : gradeLevelsError ? (
                  <Text style={styles.errorText}>Failed to load grades</Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.gradeScroll}
                  >
                    {gradeLevelsData?.data?.data?.map((grade) => (
                      <TouchableOpacity
                        key={grade.id}
                        style={[
                          styles.gradeChip,
                          selectedGrade?.id === grade.id &&
                            styles.selectedGradeChip,
                        ]}
                        onPress={() => handleGradeSelect(grade)}
                      >
                        <Text
                          style={[
                            styles.gradeChipText,
                            selectedGrade?.id === grade.id &&
                              styles.selectedGradeChipText,
                          ]}
                        >
                          {grade.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Class Selection */}
              {selectedGrade && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Select Class</Text>
                  <View style={styles.classGrid}>
                    {selectedGrade.grade_level_class_list.map((classItem) => (
                      <TouchableOpacity
                        key={classItem.id}
                        style={[
                          styles.classCard,
                          selectedClass?.id === classItem.id &&
                            styles.selectedClassCard,
                        ]}
                        onPress={() => handleClassSelect(classItem)}
                      >
                        <LinearGradient
                          colors={
                            selectedClass?.id === classItem.id
                              ? ["#920734", "#B8093E"]
                              : ["#F8F9FA", "#E9ECEF"]
                          }
                          style={styles.classCardGradient}
                        >
                          <Text
                            style={[
                              styles.classCardText,
                              selectedClass?.id === classItem.id &&
                                styles.selectedClassCardText,
                            ]}
                          >
                            {classItem.name
                              .split(" ")
                              .pop()
                              ?.replace(/[^0-9A-Z]/gi, "") || "C"}
                          </Text>
                          <Text
                            style={[
                              styles.classCardSubtext,
                              selectedClass?.id === classItem.id &&
                                styles.selectedClassCardSubtext,
                            ]}
                          >
                            Class
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Step 2: Student Selection */}
          {currentStep === 2 && (
            <View style={styles.stepContent}>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or admission number..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <MaterialIcons name="clear" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Student List */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Select Student ({filteredStudents.length} found)
                </Text>
                {studentsLoading ? (
                  <ActivityIndicator size="small" color="#920734" />
                ) : studentsError ? (
                  <Text style={styles.errorText}>Failed to load students</Text>
                ) : filteredStudents.length === 0 ? (
                  <Text style={styles.emptyText}>No students found</Text>
                ) : (
                  <View style={styles.studentList}>
                    {filteredStudents.map((student) => (
                      <TouchableOpacity
                        key={student.id}
                        style={[
                          styles.studentCard,
                          selectedStudent?.id === student.id &&
                            styles.selectedStudentCard,
                        ]}
                        onPress={() => setSelectedStudent(student)}
                      >
                        <Image
                          source={
                            getStudentProfilePicture(student) ||
                            getLocalFallbackProfileImage()
                          }
                          style={styles.studentImage}
                        />
                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName}>
                            {student.student_calling_name || "Unknown"}
                          </Text>
                          <Text style={styles.studentAdmission}>
                            {student.admission_number}
                          </Text>
                        </View>
                        {selectedStudent?.id === student.id && (
                          <MaterialIcons
                            name="check-circle"
                            size={24}
                            color="#920734"
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Step 3: Achievement Details */}
          {currentStep === 3 && (
            <View style={styles.stepContent}>
              {/* Selected Student Info */}
              {selectedStudent && (
                <View style={styles.selectedStudentBanner}>
                  <Image
                    source={
                      getStudentProfilePicture(selectedStudent) ||
                      getLocalFallbackProfileImage()
                    }
                    style={styles.bannerStudentImage}
                  />
                  <View style={styles.bannerStudentInfo}>
                    <Text style={styles.bannerStudentName}>
                      {selectedStudent.student_calling_name}
                    </Text>
                    <Text style={styles.bannerStudentClass}>
                      {selectedGrade?.name} - {selectedClass?.name}
                    </Text>
                  </View>
                </View>
              )}

              {/* Achievement Title Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Achievement Title *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedTitle}
                    onValueChange={(value) => setSelectedTitle(value)}
                    style={styles.picker}
                  >
                    {ACHIEVEMENT_TITLES.map((title) => (
                      <Picker.Item key={title} label={title} value={title} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Time Range Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Achievement Period *</Text>
                <View style={styles.timeRangeContainer}>
                  {TIME_RANGES.map((range) => (
                    <TouchableOpacity
                      key={range.id}
                      style={[
                        styles.timeRangeButton,
                        selectedTimeRange === range.id &&
                          styles.activeTimeRangeButton,
                      ]}
                      onPress={() => setSelectedTimeRange(range.id)}
                    >
                      <Text
                        style={[
                          styles.timeRangeText,
                          selectedTimeRange === range.id &&
                            styles.activeTimeRangeText,
                        ]}
                      >
                        {range.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Description Input */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Achievement Description *
                </Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Describe the student's achievement (minimum 10 characters)..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={styles.characterCount}>
                  {description.length}/500 characters
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Fixed Bottom Button - Always Visible */}
        {currentStep === 1 && selectedGrade && selectedClass && (
          <View style={styles.fixedBottomContainer}>
            <TouchableOpacity
              style={styles.fixedNextButton}
              onPress={handleNextToStep2}
            >
              <Text style={styles.fixedNextButtonText}>
                Next: Select Student
              </Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        {currentStep === 2 && selectedStudent && (
          <View style={styles.fixedBottomContainer}>
            <TouchableOpacity
              style={styles.fixedNextButton}
              onPress={handleNextToStep3}
            >
              <Text style={styles.fixedNextButtonText}>Next: Add Details</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        {currentStep === 3 && (
          <View style={styles.fixedBottomContainer}>
            <TouchableOpacity
              style={[
                styles.fixedNextButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <MaterialIcons name="check" size={20} color="#FFF" />
                  <Text style={styles.fixedNextButtonText}>
                    Create Achievement
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 10,
    paddingHorizontal: 15,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backButton: {
    padding: 3,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    padding: 3,
  },
  stepIndicator: {
    paddingVertical: 6,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: "#920734",
  },
  stepDotText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  stepDotTextActive: {
    color: "#FFF",
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: "#920734",
  },
  stepLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
  stepLabel: {
    fontSize: 9,
    color: "#6B7280",
    flex: 1,
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 15,
  },
  stepContent: {
    flex: 1,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  gradeScroll: {
    marginBottom: 5,
  },
  gradeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedGradeChip: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  gradeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  selectedGradeChipText: {
    color: "#FFF",
  },
  classGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -3,
  },
  classCard: {
    width: "30%",
    margin: 3,
    borderRadius: 10,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedClassCard: {
    elevation: 4,
    shadowOpacity: 0.2,
  },
  classCardGradient: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 70,
  },
  classCardText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 3,
  },
  selectedClassCardText: {
    color: "#FFF",
  },
  classCardSubtext: {
    fontSize: 9,
    color: "#6B7280",
  },
  selectedClassCardSubtext: {
    color: "#FFF",
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1F2937",
    marginLeft: 8,
  },
  studentList: {
    gap: 8,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  selectedStudentCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#920734",
  },
  studentImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  studentInfo: {
    flex: 1,
    marginLeft: 10,
  },
  studentName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  studentAdmission: {
    fontSize: 11,
    color: "#6B7280",
  },
  selectedStudentBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#920734",
    borderRadius: 10,
    marginBottom: 15,
  },
  bannerStudentImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
  },
  bannerStudentInfo: {
    flex: 1,
    marginLeft: 10,
  },
  bannerStudentName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 2,
  },
  bannerStudentClass: {
    fontSize: 11,
    color: "#FFF",
    opacity: 0.9,
  },
  pickerContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  picker: {
    fontSize: 13,
    color: "#1F2937",
  },
  awardInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  timeRangeContainer: {
    flexDirection: "row",
    gap: 6,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#F8F9FA",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  activeTimeRangeButton: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  timeRangeText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
  },
  activeTimeRangeText: {
    color: "#FFF",
    fontWeight: "600",
  },
  descriptionInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: "#1F2937",
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  characterCount: {
    fontSize: 10,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 3,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#920734",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  nextButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#920734",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 1,
    // paddingBottom: 14,
    gap: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    padding: 20,
  },
  fixedBottomContainer: {
    paddingHorizontal: 15,
    paddingTop: 1,
    paddingBottom: Platform.OS === "ios" ? 15 : 10,
    backgroundColor: "#920734",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  fixedNextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#920734",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 6,
    paddingBottom: 46,
  },
  fixedNextButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
});

export default StudentAchievementModal;
