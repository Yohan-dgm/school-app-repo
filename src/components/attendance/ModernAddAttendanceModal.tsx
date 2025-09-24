import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Dimensions,
  FlatList,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Calendar } from "react-native-calendars";
import FullScreenModal from "../../screens/authenticated/principal/dashboard/components/FullScreenModal";
import {
  formatAttendanceDate,
  useCreateStudentAttendanceMutation,
  transformStudentsToAttendanceData,
  validateAttendanceData,
} from "../../api/attendance-api";
import {
  useGetGradeLevelsWithClassesQuery,
  GradeLevelWithClasses,
  GradeLevelClass,
} from "../../api/grade-level-api";
import {
  useGetStudentDetailsByClassQuery,
  useLazyGetStudentDetailsByClassQuery,
} from "../../api/student-details-api";

// Import new modern components
import ModernStudentAttendanceCard from "./ModernStudentAttendanceCard";
import ModernStudentAttendanceListItem from "./ModernStudentAttendanceListItem";
import AttendanceEditModal from "./AttendanceEditModal";
import CompactAttendanceChart from "./CompactAttendanceChart";
import BulkAttendanceActions from "./BulkAttendanceActions";

const { width, height } = Dimensions.get("window");

interface Student {
  id: number;
  name: string;
  full_name: string;
  student_calling_name?: string;
  admission_number: string;
  profile_image?: string | null;
  attachment?: any;
  attachments?: any[];
  student_attachment_list?: any[];
  grade: string;
  class: string;
  // house?: string;
  attendance: "present" | "absent" | "late";
  grade_level_id?: number;
  grade_level?: any;
  grade_level_class_id?: number;
}

interface AddAttendanceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ModernAddAttendanceModal: React.FC<AddAttendanceModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  // State management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedGrade, setSelectedGrade] =
    useState<GradeLevelWithClasses | null>(null);
  const [selectedClass, setSelectedClass] = useState<GradeLevelClass | null>(
    null,
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Attendance details state - tracks reason, notes, and times for each student
  const [attendanceDetails, setAttendanceDetails] = useState<{
    [studentId: number]: {
      reason?: string;
      notes?: string;
      inTime?: string;
      outTime?: string;
    };
  }>({});

  // Debug logging for bulk actions visibility
  useEffect(() => {
    console.log("📊 showBulkActions changed:", showBulkActions);
  }, [showBulkActions]);
  const [selectedStudentForEdit, setSelectedStudentForEdit] =
    useState<Student | null>(null);
  const [lateAttendanceMode, setLateAttendanceMode] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list"); // Default to list view

  // Animation values
  const fadeValue = useSharedValue(0);
  const slideValue = useSharedValue(50);

  // API hooks
  const [createStudentAttendance, { isLoading: isCreatingAttendance }] =
    useCreateStudentAttendanceMutation();

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
    error: studentsError,
    isLoading: studentsLoading,
  } = useGetStudentDetailsByClassQuery(
    {
      grade_level_class_id: selectedClass?.id || 0,
      page: 1,
      page_size: 10,
    },
    { skip: !selectedClass?.id },
  );

  const [fetchAdditionalPages] = useLazyGetStudentDetailsByClassQuery();

  // School houses are now fetched from API via student.school_house.name

  // Reset all states to default values
  const resetToDefaultState = () => {
    console.log("🔄 Resetting Add Attendance Modal to default state...");
    console.log("   📅 Selected date: Reset to today");
    console.log("   🏫 Selected grade: Reset to null");
    console.log("   🎓 Selected class: Reset to null");
    console.log("   👥 Students: Clear all data");
    console.log("   🔍 Search query: Clear search");
    console.log("   💾 Attendance details: Clear all details");
    console.log("   🎨 View mode: Reset to list view");

    setSelectedDate(new Date());
    setSelectedGrade(null);
    setSelectedClass(null);
    setStudents([]);
    setFilteredStudents([]);
    setSearchQuery("");
    setIsLoading(false);
    setShowDatePicker(false);
    setIsLoadingStudents(false);
    setShowBulkActions(false);
    setIsSaving(false);
    setAttendanceDetails({});
    setSelectedStudentForEdit(null);
    setLateAttendanceMode(false);
    setViewMode("list");

    console.log("✅ Add Attendance Modal reset completed");
  };

  // Entry animation and state reset
  useEffect(() => {
    if (visible) {
      // Reset to default state when modal opens
      resetToDefaultState();

      // Start entry animation
      fadeValue.value = withTiming(1, { duration: 300 });
      slideValue.value = withSpring(0, { damping: 15, stiffness: 150 });
    } else {
      // Reset animation values when modal closes
      fadeValue.value = 0;
      slideValue.value = 50;
    }
  }, [visible]);

  // Process API students data
  useEffect(() => {
    if (selectedClass) {
      if (studentsLoading) {
        setIsLoadingStudents(true);
        return;
      }

      if (studentsData?.data?.data && studentsData.data.data.length > 0) {
        let apiStudents = studentsData.data.data.map((student, index) => ({
          id: student.id || index + 1,
          name:
            student.student_calling_name ||
            student.full_name ||
            "Unknown Student",
          full_name: student.full_name || "Unknown Student",
          student_calling_name:
            student.student_calling_name ||
            `Student ${student.id || index + 1}`,
          admission_number:
            student.admission_number ||
            `ADM${String(index + 1).padStart(3, "0")}`,
          profile_image:
            student.student_attachment_list?.[0]?.file_name || null,
          attachment: student.student_attachment_list?.[0] || null,
          attachments: student.student_attachment_list || [],
          student_attachment_list: student.student_attachment_list || [],
          grade:
            selectedGrade?.name || student.grade_level?.name || "Unknown Grade",
          class:
            selectedClass.name ||
            student.grade_level_class?.name ||
            "Unknown Class",
          attendance: "present" as const,
          grade_level_id: student.grade_level_id,
          grade_level: student.grade_level,
          grade_level_class_id: student.grade_level_class_id,
        }));

        // Frontend filtering as backup
        const filteredByClass = apiStudents.filter((student) => {
          if (student.grade_level_class_id) {
            return student.grade_level_class_id === selectedClass.id;
          }
          return true;
        });

        setStudents(filteredByClass);
      } else {
        setStudents([]);
      }
      setIsLoadingStudents(false);
    } else {
      setStudents([]);
      setIsLoadingStudents(false);
    }
  }, [
    selectedClass,
    selectedGrade,
    studentsData,
    studentsLoading,
    studentsError,
  ]);

  // Filter students based on search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(
        (student) =>
          student.student_calling_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          student.admission_number
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
        // ||
        // student.house?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [students, searchQuery]);

  // Attendance statistics
  const attendanceStats = useMemo(() => {
    const present = students.filter((s) => s.attendance === "present").length;
    const absent = students.filter((s) => s.attendance === "absent").length;
    const late = students.filter((s) => s.attendance === "late").length;
    return { present, absent, late, total: students.length };
  }, [students]);

  // Handle attendance change
  const handleAttendanceChange = (
    studentId: number,
    attendance: "present" | "absent" | "late",
  ) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, attendance } : student,
      ),
    );
  };

  // Handle opening student edit modal (regular)
  const handleStudentPress = (student: Student) => {
    setSelectedStudentForEdit(student);
    setLateAttendanceMode(false);
  };

  // Handle opening student edit modal for late attendance
  const handleStudentPressForLate = (student: Student) => {
    setSelectedStudentForEdit(student);
    setLateAttendanceMode(true);
  };

  // Handle student edit
  const handleStudentEdit = (
    studentId: number,
    attendance: "present" | "absent" | "late",
    reason?: string,
    notes?: string,
    inTime?: string,
    outTime?: string,
  ) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, attendance } : student,
      ),
    );

    // Save attendance details
    setAttendanceDetails((prev) => ({
      ...prev,
      [studentId]: {
        reason,
        notes,
        inTime,
        outTime,
      },
    }));

    // Reset late attendance mode after saving
    setLateAttendanceMode(false);
  };

  // Bulk actions
  const handleMarkAllPresent = () => {
    setStudents((prev) =>
      prev.map((student) => ({ ...student, attendance: "present" as const })),
    );
  };

  const handleMarkAllAbsent = () => {
    setStudents((prev) =>
      prev.map((student) => ({ ...student, attendance: "absent" as const })),
    );
  };

  const handleMarkAllLate = () => {
    setStudents((prev) =>
      prev.map((student) => ({ ...student, attendance: "late" as const })),
    );
  };

  const handleResetAll = () => {
    setStudents((prev) =>
      prev.map((student) => ({ ...student, attendance: "present" as const })),
    );
  };

  // Save attendance data to backend
  const handleSaveAttendance = async () => {
    if (!selectedClass || students.length === 0) {
      Alert.alert(
        "Error",
        "Please select a class and ensure students are loaded.",
      );
      return;
    }

    setIsSaving(true);

    try {
      // Create attendance states mapping
      const attendanceStates: {
        [studentId: number]: {
          status: "present" | "absent" | "late";
          reason?: string;
          notes?: string;
          inTime?: string;
          outTime?: string;
        };
      } = {};

      students.forEach((student) => {
        const details = attendanceDetails[student.id] || {};
        attendanceStates[student.id] = {
          status: student.attendance,
          reason: details.reason,
          notes: details.notes,
          inTime: details.inTime,
          outTime: details.outTime,
        };
      });

      // Transform data for API - use student's actual grade_level_class_id
      const attendanceData = transformStudentsToAttendanceData(
        students,
        formatDateForCalendar(selectedDate), // YYYY-MM-DD format in local timezone
        students[0]?.grade_level_class_id || selectedClass.id, // Use actual student grade_level_class_id
        attendanceStates,
      );

      console.log("📊 Attendance data being sent:", {
        selectedDate: selectedDate,
        selectedDateString: formatDateForCalendar(selectedDate),
        selectedDateDisplay: formatAttendanceDate(
          formatDateForCalendar(selectedDate),
        ),
        selectedClassId: selectedClass.id,
        studentGradeLevelClassId: students[0]?.grade_level_class_id,
        studentsCount: students.length,
        sampleStudentData: students[0],
        attendanceData: attendanceData.slice(0, 2), // Log first 2 records
      });

      // Validate data
      const validation = validateAttendanceData(attendanceData);
      if (!validation.isValid) {
        Alert.alert("Validation Error", validation.errors.join("\n"));
        setIsSaving(false);
        return;
      }

      // Call API
      const response = await createStudentAttendance({
        attendance_data: attendanceData,
      }).unwrap();

      console.log("✅ Attendance saved successfully:", response);

      Alert.alert("Success", `Attendance saved successfully!`, [
        {
          text: "OK",
          onPress: () => {
            onSuccess?.(); // Call success callback
            onClose(); // Close the modal
          },
        },
      ]);
    } catch (error: any) {
      console.error("❌ Error saving attendance:", error);

      const errorMessage =
        error?.data?.message ||
        error?.message ||
        "Failed to save attendance. Please try again.";

      Alert.alert("Error", errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedClass) {
      Alert.alert("Error", "Please select a class");
      return;
    }
    if (students.length === 0) {
      Alert.alert("Error", "No students found for selected class");
      return;
    }

    setIsLoading(true);
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      Alert.alert("Success", "Attendance has been recorded successfully!", [
        {
          text: "OK",
          onPress: () => {
            onSuccess?.();
            onClose();
          },
        },
      ]);
    } catch {
      Alert.alert("Error", "Failed to save attendance. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle modal close - Simple direct close without unsaved changes alert
  const handleClose = () => {
    onClose();
  };

  // Format date for calendar
  const formatDateForCalendar = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  // Custom handler for attendance changes that includes late attendance logic
  const handleAttendanceChangeWithLateModal = (
    studentId: number,
    attendance: "present" | "absent" | "late",
  ) => {
    if (attendance === "late") {
      // Find the student and open modal for late attendance
      const student = students.find((s) => s.id === studentId);
      if (student) {
        handleStudentPressForLate(student);
      }
    } else {
      // For present/absent, directly change attendance
      handleAttendanceChange(studentId, attendance);
    }
  };

  // Render student item based on view mode
  const renderStudentItem = ({ item }: { item: Student }) => {
    if (viewMode === "list") {
      return (
        <ModernStudentAttendanceListItem
          student={item}
          onAttendanceChange={handleAttendanceChangeWithLateModal}
          onStudentPress={handleStudentPress}
        />
      );
    } else {
      return (
        <ModernStudentAttendanceCard
          student={item}
          onAttendanceChange={handleAttendanceChangeWithLateModal}
          onStudentPress={handleStudentPress}
        />
      );
    }
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeValue.value,
    transform: [{ translateY: slideValue.value }],
  }));

  return (
    <FullScreenModal
      visible={visible}
      onClose={handleClose}
      title="Mark Attendance"
      backgroundColor="#F8F9FA"
    >
      <Animated.View style={[styles.container, animatedStyle]}>
        {/* Main Content with Single FlatList */}
        {selectedClass && filteredStudents.length > 0 ? (
          viewMode === "list" ? (
            <FlatList
              key="attendance-list-view"
              data={filteredStudents}
              renderItem={renderStudentItem}
              keyExtractor={(item) => `list-${item.id}`}
              numColumns={1}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.studentsGrid,
                styles.studentsGridList,
              ]}
              ListHeaderComponent={
                <View>
                  {/* Compact Date Selection */}
                  <View style={styles.dateSection}>
                    <LinearGradient
                      colors={["#920734", "#A91D47"]}
                      style={styles.dateCard}
                    >
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <MaterialIcons
                          name="calendar-today"
                          size={20}
                          color="#FFFFFF"
                        />
                        <Text style={styles.dateText}>
                          {formatAttendanceDate(
                            formatDateForCalendar(selectedDate),
                          )}
                        </Text>
                        <MaterialIcons
                          name="expand-more"
                          size={20}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>

                  {/* Simple Grade Level List */}
                  <View style={styles.gradeSection}>
                    {gradeLevelsLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#920734" />
                        <Text style={styles.loadingText}>
                          Loading grades...
                        </Text>
                      </View>
                    ) : gradeLevelsError ? (
                      <View style={styles.errorContainer}>
                        <MaterialIcons name="error" size={20} color="#F44336" />
                        <Text style={styles.errorText}>
                          Failed to load grades
                        </Text>
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.gradeScroll}
                        contentContainerStyle={styles.gradeScrollContent}
                      >
                        {gradeLevelsData?.data?.data?.map((grade) => (
                          <TouchableOpacity
                            key={grade.id}
                            style={[
                              styles.gradeChip,
                              selectedGrade?.id === grade.id &&
                                styles.selectedGradeChip,
                            ]}
                            onPress={() => {
                              if (selectedGrade?.id === grade.id) {
                                setSelectedGrade(null);
                                setSelectedClass(null);
                                setStudents([]);
                              } else {
                                setSelectedGrade(grade);
                                setSelectedClass(null);
                                setStudents([]);
                              }
                            }}
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

                  {/* Small Class Icons */}
                  {selectedGrade && (
                    <View style={styles.classIconsSection}>
                      <View style={styles.classIconsContainer}>
                        {selectedGrade.grade_level_class_list.map(
                          (classItem) => (
                            <TouchableOpacity
                              key={classItem.id}
                              style={[
                                styles.classIcon,
                                selectedClass?.id === classItem.id &&
                                  styles.selectedClassIcon,
                              ]}
                              onPress={() => {
                                setSelectedClass(classItem);
                                setStudents([]);
                              }}
                            >
                              <LinearGradient
                                colors={
                                  selectedClass?.id === classItem.id
                                    ? ["#4CAF50", "#66BB6A"]
                                    : ["#E3F2FD", "#BBDEFB"]
                                }
                                style={styles.classIconGradient}
                              >
                                <Text
                                  style={[
                                    styles.classIconText,
                                    selectedClass?.id === classItem.id &&
                                      styles.selectedClassIconText,
                                  ]}
                                >
                                  {classItem.name
                                    .split(" ")
                                    .pop()
                                    ?.replace(/[^0-9A-Z]/gi, "") || "C"}
                                </Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          ),
                        )}
                      </View>
                      {selectedClass && (
                        <Text style={styles.selectedClassLabel}>
                          {selectedClass.name} • {students.length} students
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Search and Controls */}
                  <View style={styles.controlsSection}>
                    <View style={styles.searchRow}>
                      <View style={styles.searchContainer}>
                        <MaterialIcons name="search" size={20} color="#666" />
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Search students..."
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          placeholderTextColor="#999"
                        />
                        {searchQuery.length > 0 && (
                          <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <MaterialIcons
                              name="clear"
                              size={20}
                              color="#666"
                            />
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.controlButtons}>
                        <TouchableOpacity
                          style={[
                            styles.viewModeButton,
                            viewMode === "grid" && styles.activeViewMode,
                          ]}
                          onPress={() => setViewMode("grid")}
                        >
                          <MaterialIcons
                            name="grid-view"
                            size={16}
                            color={viewMode === "grid" ? "#FFFFFF" : "#666"}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.viewModeButton,
                            viewMode === "list" && styles.activeViewMode,
                          ]}
                          onPress={() => setViewMode("list")}
                        >
                          <MaterialIcons
                            name="list"
                            size={16}
                            color={viewMode === "list" ? "#FFFFFF" : "#666"}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.bulkActionButton}
                          onPress={() => {
                            console.log("🔥 Bulk Actions button pressed!");
                            setShowBulkActions(true);
                          }}
                        >
                          <MaterialIcons
                            name="more-vert"
                            size={16}
                            color="#FFFFFF"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              }
            />
          ) : (
            <FlatList
              key="attendance-grid-view"
              data={filteredStudents}
              renderItem={renderStudentItem}
              keyExtractor={(item) => `grid-${item.id}`}
              numColumns={2}
              columnWrapperStyle={styles.gridRow}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.studentsGrid,
                styles.studentsGridGrid,
              ]}
              ListHeaderComponent={
                <View>
                  {/* Compact Date Selection */}
                  <View style={styles.dateSection}>
                    <LinearGradient
                      colors={["#920734", "#A91D47"]}
                      style={styles.dateCard}
                    >
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <MaterialIcons
                          name="calendar-today"
                          size={20}
                          color="#FFFFFF"
                        />
                        <Text style={styles.dateText}>
                          {formatAttendanceDate(
                            formatDateForCalendar(selectedDate),
                          )}
                        </Text>
                        <MaterialIcons
                          name="expand-more"
                          size={20}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>

                  {/* Simple Grade Level List */}
                  <View style={styles.gradeSection}>
                    {gradeLevelsLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#920734" />
                        <Text style={styles.loadingText}>
                          Loading grades...
                        </Text>
                      </View>
                    ) : gradeLevelsError ? (
                      <View style={styles.errorContainer}>
                        <MaterialIcons name="error" size={20} color="#F44336" />
                        <Text style={styles.errorText}>
                          Failed to load grades
                        </Text>
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.gradeScroll}
                        contentContainerStyle={styles.gradeScrollContent}
                      >
                        {gradeLevelsData?.data?.data?.map((grade) => (
                          <TouchableOpacity
                            key={grade.id}
                            style={[
                              styles.gradeChip,
                              selectedGrade?.id === grade.id &&
                                styles.selectedGradeChip,
                            ]}
                            onPress={() => {
                              if (selectedGrade?.id === grade.id) {
                                setSelectedGrade(null);
                                setSelectedClass(null);
                                setStudents([]);
                              } else {
                                setSelectedGrade(grade);
                                setSelectedClass(null);
                                setStudents([]);
                              }
                            }}
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

                  {/* Small Class Icons */}
                  {selectedGrade && (
                    <View style={styles.classIconsSection}>
                      <View style={styles.classIconsContainer}>
                        {selectedGrade.grade_level_class_list.map(
                          (classItem) => (
                            <TouchableOpacity
                              key={classItem.id}
                              style={[
                                styles.classIcon,
                                selectedClass?.id === classItem.id &&
                                  styles.selectedClassIcon,
                              ]}
                              onPress={() => {
                                setSelectedClass(classItem);
                                setStudents([]);
                              }}
                            >
                              <LinearGradient
                                colors={
                                  selectedClass?.id === classItem.id
                                    ? ["#4CAF50", "#66BB6A"]
                                    : ["#E3F2FD", "#BBDEFB"]
                                }
                                style={styles.classIconGradient}
                              >
                                <Text
                                  style={[
                                    styles.classIconText,
                                    selectedClass?.id === classItem.id &&
                                      styles.selectedClassIconText,
                                  ]}
                                >
                                  {classItem.name
                                    .split(" ")
                                    .pop()
                                    ?.replace(/[^0-9A-Z]/gi, "") || "C"}
                                </Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          ),
                        )}
                      </View>
                      {selectedClass && (
                        <Text style={styles.selectedClassLabel}>
                          {selectedClass.name} • {students.length} students
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Search and Controls */}
                  <View style={styles.controlsSection}>
                    <View style={styles.searchRow}>
                      <View style={styles.searchContainer}>
                        <MaterialIcons name="search" size={20} color="#666" />
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Search students..."
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          placeholderTextColor="#999"
                        />
                        {searchQuery.length > 0 && (
                          <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <MaterialIcons
                              name="clear"
                              size={20}
                              color="#666"
                            />
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.controlButtons}>
                        <TouchableOpacity
                          style={[
                            styles.viewModeButton,
                            viewMode === "grid" && styles.activeViewMode,
                          ]}
                          onPress={() => setViewMode("grid")}
                        >
                          <MaterialIcons
                            name="grid-view"
                            size={16}
                            color={viewMode === "grid" ? "#FFFFFF" : "#666"}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.viewModeButton,
                            viewMode === "list" && styles.activeViewMode,
                          ]}
                          onPress={() => setViewMode("list")}
                        >
                          <MaterialIcons
                            name="list"
                            size={16}
                            color={viewMode === "list" ? "#FFFFFF" : "#666"}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.bulkActionButton}
                          onPress={() => {
                            console.log("🔥 Bulk Actions button pressed!");
                            setShowBulkActions(true);
                          }}
                        >
                          <MaterialIcons
                            name="more-vert"
                            size={16}
                            color="#FFFFFF"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              }
            />
          )
        ) : (
          <View style={styles.mainContent}>
            {/* Compact Date Selection */}
            <View style={styles.dateSection}>
              <LinearGradient
                colors={["#920734", "#A91D47"]}
                style={styles.dateCard}
              >
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.dateText}>
                    {formatAttendanceDate(formatDateForCalendar(selectedDate))}
                  </Text>
                  <MaterialIcons name="expand-more" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* Simple Grade Level List */}
            <View style={styles.gradeSection}>
              {gradeLevelsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#920734" />
                  <Text style={styles.loadingText}>Loading grades...</Text>
                </View>
              ) : gradeLevelsError ? (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error" size={20} color="#F44336" />
                  <Text style={styles.errorText}>Failed to load grades</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.gradeScroll}
                  contentContainerStyle={styles.gradeScrollContent}
                >
                  {gradeLevelsData?.data?.data?.map((grade) => (
                    <TouchableOpacity
                      key={grade.id}
                      style={[
                        styles.gradeChip,
                        selectedGrade?.id === grade.id &&
                          styles.selectedGradeChip,
                      ]}
                      onPress={() => {
                        setSelectedGrade(grade);
                        setSelectedClass(null);
                        setStudents([]);
                      }}
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

              {/* Class Selection */}
              {selectedGrade && (
                <View style={styles.classSection}>
                  <Text style={styles.sectionTitle}>Classes</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.classScroll}
                    contentContainerStyle={styles.classScrollContent}
                  >
                    {selectedGrade.grade_level_class_list.map((classItem) => (
                      <TouchableOpacity
                        key={classItem.id}
                        style={[
                          styles.classIcon,
                          selectedClass?.id === classItem.id &&
                            styles.selectedClassIcon,
                        ]}
                        onPress={() => {
                          setSelectedClass(classItem);
                          setStudents([]);
                        }}
                      >
                        <View style={styles.classIconInner}>
                          {/* <MaterialIcons
                            name="class"
                            size={16}
                            color={
                              selectedClass?.id === classItem.id
                                ? "#FFFFFF"
                                : "#920734"
                            }
                          /> */}
                          {/* {classItem.name} */}

                          <LinearGradient
                            colors={
                              selectedClass?.id === classItem.id
                                ? ["#4CAF50", "#66BB6A"]
                                : ["#E3F2FD", "#BBDEFB"]
                            }
                            style={styles.classIconGradient}
                          >
                            <Text
                              style={[
                                styles.classIconText,
                                selectedClass?.id === classItem.id &&
                                  styles.selectedClassIconText,
                              ]}
                            >
                              {classItem.name
                                .split(" ")
                                .pop()
                                ?.replace(/[^0-9A-Z]/gi, "") || "C"}
                            </Text>
                          </LinearGradient>
                        </View>
                        <Text
                          style={[
                            styles.classIconText,
                            selectedClass?.id === classItem.id &&
                              styles.selectedClassIconText,
                          ]}
                        >
                          {/* {classItem.name} */}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Loading/Error/No Students States */}
            {selectedClass && (
              <>
                {isLoadingStudents || studentsLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#920734" />
                    <Text style={styles.loadingText}>Loading students...</Text>
                  </View>
                ) : studentsError ? (
                  <View style={styles.errorContainer}>
                    <MaterialIcons name="error" size={48} color="#F44336" />
                    <Text style={styles.errorText}>
                      Failed to load students
                    </Text>
                  </View>
                ) : (
                  <View style={styles.noStudentsContainer}>
                    <MaterialIcons name="person-off" size={48} color="#999" />
                    <Text style={styles.noStudentsText}>
                      {searchQuery
                        ? "No students match your search"
                        : "No students found"}
                    </Text>
                  </View>
                )}
              </>
            )}

            {!selectedClass && (
              <View style={styles.selectPromptContainer}>
                <MaterialIcons name="school" size={64} color="#920734" />
                <Text style={styles.selectPromptText}>
                  Select a class to get started
                </Text>
                <Text style={styles.selectPromptSubtext}>
                  Choose a grade level and class to view and mark attendance for
                  students
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Floating Action Buttons */}
        {selectedClass && students.length > 0 && (
          <View style={styles.floatingActions}>
            <TouchableOpacity
              style={styles.floatingButton}
              onPress={() => {
                console.log("🔥 Floating Bulk Actions button pressed!");
                setShowBulkActions(true);
              }}
            >
              <LinearGradient
                colors={["#FF9800", "#FB8C00"]}
                style={styles.fabGradient}
              >
                <MaterialIcons name="groups" size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Save Button */}
        {selectedClass && students.length > 0 && (
          <View style={styles.saveContainer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (isSaving || isCreatingAttendance) && styles.disabledButton,
              ]}
              onPress={handleSaveAttendance}
              disabled={isSaving || isCreatingAttendance}
            >
              <LinearGradient
                colors={
                  isSaving || isCreatingAttendance
                    ? ["#CCCCCC", "#BBBBBB"]
                    : ["#920734", "#A91D47"]
                }
                style={styles.saveGradient}
              >
                <MaterialIcons
                  name={
                    isSaving || isCreatingAttendance
                      ? "hourglass-empty"
                      : "save"
                  }
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.saveButtonText}>
                  {isSaving || isCreatingAttendance
                    ? "Saving..."
                    : `Save Attendance (${students.length})`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Bulk Actions Modal - Using BulkAttendanceActions Component */}
        <BulkAttendanceActions
          visible={showBulkActions}
          onClose={() => setShowBulkActions(false)}
          onMarkAllPresent={handleMarkAllPresent}
          onMarkAllAbsent={handleMarkAllAbsent}
          onMarkAllLate={handleMarkAllLate}
          onResetAll={handleResetAll}
          studentCount={students.length}
          presentCount={attendanceStats.present}
          absentCount={attendanceStats.absent}
          lateCount={attendanceStats.late}
        />

        {/* Calendar Modal - Inside FullScreenModal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.calendarOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <Calendar
                current={formatDateForCalendar(selectedDate)}
                onDayPress={(day) => {
                  const [year, month, dayNum] = day.dateString
                    .split("-")
                    .map(Number);
                  setSelectedDate(new Date(year, month - 1, dayNum));
                  setShowDatePicker(false);
                }}
                markedDates={{
                  [formatDateForCalendar(selectedDate)]: {
                    selected: true,
                    selectedColor: "#920734",
                  },
                }}
                theme={{
                  selectedDayBackgroundColor: "#920734",
                  todayTextColor: "#920734",
                  arrowColor: "#920734",
                }}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Student Edit Modal - Inside FullScreenModal */}
        <AttendanceEditModal
          visible={!!selectedStudentForEdit}
          student={selectedStudentForEdit}
          onClose={() => {
            setSelectedStudentForEdit(null);
            setLateAttendanceMode(false);
          }}
          onSave={handleStudentEdit}
          attendanceDate={formatDateForCalendar(selectedDate)}
          preSelectedStatus={lateAttendanceMode ? "late" : undefined}
        />
      </Animated.View>
    </FullScreenModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 14,
    paddingBottom: 50,
  },
  mainContent: {
    flex: 1,
    padding: 16,
    paddingBottom: 100,
  },
  dateSection: {
    marginBottom: 20,
  },
  dateCard: {
    borderRadius: 16,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  gradeSection: {
    marginBottom: 16,
  },
  gradeScroll: {
    flexGrow: 0,
  },
  gradeScrollContent: {
    paddingRight: 16,
  },
  gradeChip: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectedGradeChip: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  gradeChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  selectedGradeChipText: {
    color: "#FFFFFF",
  },
  controlsSection: {
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  controlButtons: {
    flexDirection: "row",
    gap: 8,
  },
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  activeViewMode: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  bulkActionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF9800",
  },
  studentsSection: {
    flex: 1,
    minHeight: 300,
  },
  studentsGrid: {
    paddingBottom: 20,
  },
  studentsGridList: {
    paddingHorizontal: 0,
  },
  studentsGridGrid: {
    paddingHorizontal: 8,
  },
  gridRow: {
    justifyContent: "space-between",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#F44336",
  },
  noStudentsContainer: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#F9F9F9",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  noStudentsText: {
    marginTop: 16,
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  selectPromptContainer: {
    alignItems: "center",
    paddingVertical: 80,
    backgroundColor: "rgba(146, 7, 52, 0.05)",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(146, 7, 52, 0.1)",
    borderStyle: "dashed",
  },
  selectPromptText: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: "700",
    color: "#920734",
    textAlign: "center",
  },
  selectPromptSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  floatingActions: {
    position: "absolute",
    bottom: 100,
    right: 20,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  saveContainer: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  saveButton: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  saveGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  disabledButton: {
    shadowOpacity: 0.05,
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },

  // Simple Popup Modal Styles
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  popupContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 25,
  },
  popupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#920734",
  },
  popupCloseButton: {
    padding: 4,
  },
  popupSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  popupStats: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  popupStatsText: {
    fontSize: 13,
    color: "#333",
    textAlign: "center",
  },
  popupActions: {
    gap: 12,
  },
  popupActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  popupActionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  presentButton: {
    backgroundColor: "#4CAF50",
  },
  absentButton: {
    backgroundColor: "#F44336",
  },
  lateButton: {
    backgroundColor: "#FF9800",
  },
  resetButton: {
    backgroundColor: "#666",
  },

  // New Styles for Grade & Class Selection
  gradeClassContainer: {
    maxHeight: 300,
  },
  gradeItem: {
    marginBottom: 8,
  },
  gradeHeader: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  expandedGradeHeader: {
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  gradeHeaderGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
  },
  gradeHeaderContent: {
    flex: 1,
  },
  gradeHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  selectedGradeHeaderTitle: {
    color: "#FFFFFF",
  },
  gradeHeaderSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  selectedGradeHeaderSubtitle: {
    color: "rgba(255,255,255,0.9)",
  },
  classesContainer: {
    marginTop: 8,
    paddingLeft: 16,
    gap: 4,
  },
  classItem: {
    borderRadius: 8,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedClassItem: {
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  classItemGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
  },
  classItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  classItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  selectedClassItemTitle: {
    color: "#FFFFFF",
  },
  classStudentCount: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },

  // Small Class Icon Styles
  classIconsSection: {
    marginBottom: 16,
  },
  classIconsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  classIcon: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  selectedClassIcon: {
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  classIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  classIconText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1976D2",
  },
  selectedClassIconText: {
    color: "#FFFFFF",
  },
  selectedClassLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
    textAlign: "center",
  },
  classSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  classScroll: {
    flexGrow: 0,
  },
  classScrollContent: {
    paddingRight: 16,
  },
  classIconInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    margin: 6,
  },
});

export default ModernAddAttendanceModal;
