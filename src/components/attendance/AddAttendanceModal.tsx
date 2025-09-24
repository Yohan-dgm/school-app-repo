import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import FullScreenModal from "../../screens/authenticated/principal/dashboard/components/FullScreenModal";
import { Calendar } from "react-native-calendars";
import { formatAttendanceDate } from "../../api/attendance-api";
import { formatDateToYYYYMMDD } from "../../utils/dateUtils";
import {
  useGetStudentsByGradeWithPaginationQuery,
  useLazyGetStudentsByGradeWithPaginationQuery,
} from "../../api/educator-feedback-api";
import { GRADE_LEVELS } from "../../constants/gradeLevels";
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
  // Attachment data for proper photo handling
  attachment?: any;
  attachments?: any[];
  student_attachment_list?: any[];
  grade: string;
  class: string;
  house?: string;
  attendance: "present" | "absent" | "late";
}

interface AddAttendanceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddAttendanceModal: React.FC<AddAttendanceModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  // Enhanced form state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // API hooks for student data by grade - load all students with large page size
  const {
    data: studentsData,
    error: studentsError,
    isLoading: studentsLoading,
  } = useGetStudentsByGradeWithPaginationQuery(
    {
      grade_level_id: selectedGrade?.id,
      page: 1,
      page_size: 10000, // Increased to load all students for the grade
      search_phrase: "",
      search_filter_list: [],
    },
    { skip: !selectedGrade?.id },
  );

  // Lazy query for additional pages if needed
  const [fetchAdditionalPages] = useLazyGetStudentsByGradeWithPaginationQuery();

  // Reset all states to default values
  const resetToDefaultState = () => {
    console.log(
      "🔄 Resetting Add Attendance Modal (legacy) to default state...",
    );
    setSelectedDate(new Date());
    setSelectedGrade(null);
    setStudents([]);
    setSearchQuery("");
    setIsLoading(false);
    setShowDatePicker(false);
    setIsLoadingStudents(false);
    console.log("✅ Add Attendance Modal (legacy) reset completed");
  };

  // Reset modal state when visibility changes
  useEffect(() => {
    if (visible) {
      resetToDefaultState();
    }
  }, [visible]);

  // Attendance status options
  const attendanceOptions = [
    {
      value: "present",
      label: "Present",
      color: "#4CAF50",
      icon: "check-circle",
    },
    { value: "absent", label: "Absent", color: "#F44336", icon: "cancel" },
    { value: "late", label: "Late", color: "#FF9800", icon: "schedule" },
  ];

  // Houses for students
  const houses = useMemo(() => ["Vulcan", "Tellus", "Eurus", "Calypso"], []);

  // Process API students data for selected grade with enhanced filtering
  useEffect(() => {
    console.log("🎓 Selected Grade:", selectedGrade);
    console.log("📊 API Students Data:", {
      totalStudents: studentsData?.data?.students?.length || 0,
      totalCount: studentsData?.data?.total_count || 0,
      studentsData: studentsData?.data?.students,
    });
    console.log("🔄 Students Loading:", studentsLoading);
    console.log("❌ Students Error:", studentsError);

    if (selectedGrade) {
      if (studentsLoading) {
        setIsLoadingStudents(true);
        return;
      }

      // Process API data if available
      if (
        studentsData?.data?.students &&
        studentsData.data.students.length > 0
      ) {
        let apiStudents = studentsData.data.students.map((student, index) => ({
          id: student.id || index + 1,
          name:
            student.name || student.student_calling_name || "Unknown Student",
          full_name:
            student.full_name ||
            student.student_full_name ||
            student.name ||
            "Unknown Student",
          admission_number:
            student.admission_number ||
            student.student_admission_number ||
            `ADM${String(index + 1).padStart(3, "0")}`,
          profile_image:
            student.profile_image ||
            student.profile_picture ||
            `https://via.placeholder.com/50?text=${(student.name || "S").charAt(0)}`,
          // Include attachment data for proper photo handling
          attachment: student.attachment || null,
          attachments: student.attachments || [],
          student_attachment_list: student.student_attachment_list || [],
          grade: selectedGrade.display_name,
          class: student.class || "A",
          house: student.house || houses[index % houses.length],
          attendance: "present" as const,
          // Store original grade data for filtering
          grade_level_id: student.grade_level_id,
          grade_level: student.grade_level,
        }));

        // Frontend filtering as backup - filter by selected grade ID
        const filteredByGrade = apiStudents.filter((student) => {
          // If student has grade_level_id, use it for filtering
          if (student.grade_level_id) {
            return student.grade_level_id === selectedGrade.id;
          }
          // If student has grade_level object, use its id
          if (student.grade_level?.id) {
            return student.grade_level.id === selectedGrade.id;
          }
          // If no grade data, include all students (backend should have filtered)
          return true;
        });

        console.log("✅ Grade Filtering Results:", {
          totalFromAPI: apiStudents.length,
          filteredByGrade: filteredByGrade.length,
          selectedGradeId: selectedGrade.id,
          selectedGradeName: selectedGrade.display_name,
          totalCount: studentsData.data.total_count,
          currentPage: studentsData.data.current_page || 1,
          sampleStudentGradeIds: apiStudents.slice(0, 5).map((s) => ({
            id: s.id,
            name: s.full_name,
            grade_level_id: s.grade_level_id,
            grade_level: s.grade_level,
          })),
        });

        // Check if we need to fetch additional pages
        const totalCount =
          studentsData.data.total_count || filteredByGrade.length;
        const currentPage = studentsData.data.current_page || 1;
        const pageSize = 10000;

        if (
          totalCount > filteredByGrade.length &&
          filteredByGrade.length >= pageSize
        ) {
          console.log(
            "🔄 Fetching additional pages for grade:",
            selectedGrade.display_name,
          );

          // Fetch remaining pages
          const totalPages = Math.ceil(totalCount / pageSize);
          const additionalPromises = [];

          for (let page = currentPage + 1; page <= totalPages; page++) {
            additionalPromises.push(
              fetchAdditionalPages({
                grade_level_id: selectedGrade.id,
                page,
                page_size: pageSize,
                search_phrase: "",
                search_filter_list: [],
              }).unwrap(),
            );
          }

          // Process additional pages
          Promise.allSettled(additionalPromises)
            .then((results) => {
              const additionalStudents = [];

              results.forEach((result, index) => {
                if (
                  result.status === "fulfilled" &&
                  result.value?.data?.students
                ) {
                  const pageStudents = result.value.data.students.map(
                    (student, studentIndex) => ({
                      id:
                        student.id ||
                        `page${currentPage + 1 + index}_${studentIndex}`,
                      name:
                        student.name ||
                        student.student_calling_name ||
                        "Unknown Student",
                      full_name:
                        student.full_name ||
                        student.student_full_name ||
                        student.name ||
                        "Unknown Student",
                      admission_number:
                        student.admission_number ||
                        student.student_admission_number ||
                        `ADM${String(studentIndex + 1).padStart(3, "0")}`,
                      profile_image:
                        student.profile_image ||
                        student.profile_picture ||
                        `https://via.placeholder.com/50?text=${(student.name || "S").charAt(0)}`,
                      attachment: student.attachment || null,
                      attachments: student.attachments || [],
                      student_attachment_list:
                        student.student_attachment_list || [],
                      grade: selectedGrade.display_name,
                      class: student.class || "A",
                      house:
                        student.house || houses[studentIndex % houses.length],
                      attendance: "present" as const,
                      grade_level_id: student.grade_level_id,
                      grade_level: student.grade_level,
                    }),
                  );

                  // Filter additional students by grade as well
                  const filteredPageStudents = pageStudents.filter(
                    (student) => {
                      if (student.grade_level_id) {
                        return student.grade_level_id === selectedGrade.id;
                      }
                      if (student.grade_level?.id) {
                        return student.grade_level.id === selectedGrade.id;
                      }
                      return true;
                    },
                  );

                  additionalStudents.push(...filteredPageStudents);
                }
              });

              console.log("✅ Additional pages processed:", {
                additionalStudents: additionalStudents.length,
                totalStudents:
                  filteredByGrade.length + additionalStudents.length,
              });

              // Update students with all pages combined
              setStudents([...filteredByGrade, ...additionalStudents]);
            })
            .catch((error) => {
              console.error("❌ Error fetching additional pages:", error);
              // Use first page results even if additional pages fail
              setStudents(filteredByGrade);
            });
        } else {
          // Single page is sufficient
          setStudents(filteredByGrade);
        }
      } else {
        // Fallback to empty array if no students found
        console.log(
          "⚠️ No students found for grade:",
          selectedGrade.display_name,
        );
        setStudents([]);
      }

      setIsLoadingStudents(false);
    } else {
      setStudents([]);
      setIsLoadingStudents(false);
    }
  }, [selectedGrade, studentsData, studentsLoading, studentsError, houses]);

  // Handle student attendance change
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

  // Filter students based on search query
  const filteredStudents = students.filter(
    (student) =>
      student.student_calling_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      student.admission_number
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  // Quick date selection helpers

  // Bulk attendance actions
  const markAllPresent = () => {
    setStudents((prev) =>
      prev.map((student) => ({ ...student, attendance: "present" })),
    );
  };

  const markAllAbsent = () => {
    setStudents((prev) =>
      prev.map((student) => ({ ...student, attendance: "absent" })),
    );
  };

  // Date validation (allow back dates up to 30 days)
  const isValidDate = (date: Date): boolean => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    return date >= thirtyDaysAgo && date <= today;
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!selectedGrade) {
      Alert.alert("Error", "Please select a grade");
      return false;
    }
    if (!isValidDate(selectedDate)) {
      Alert.alert("Error", "Please select a valid date (up to 30 days back)");
      return false;
    }
    if (students.length === 0) {
      Alert.alert("Error", "No students found for selected grade");
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Mock API call - in real app, this would save to backend
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("📝 Attendance Submission:", {
        date: formatDateToYYYYMMDD(selectedDate),
        grade: selectedGrade,
        students: students,
        presentCount: students.filter((s) => s.attendance === "present").length,
        absentCount: students.filter((s) => s.attendance === "absent").length,
        lateCount: students.filter((s) => s.attendance === "late").length,
      });

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

  // Handle modal close
  const handleClose = () => {
    setSelectedDate(new Date());
    setSelectedGrade(null);
    setStudents([]);
    setSearchQuery("");
    onClose();
  };

  // Get student profile image with fallback (like HeaderAuthenticated)
  const getStudentProfileImage = (student: Student) => {
    // Get profile picture for the student using professional utility
    const profilePictureSource = getStudentProfilePicture(student);

    // Fallback to default image if no profile picture
    const profileImage =
      profilePictureSource || getDefaultStudentProfileImage();

    // If still no profile image, use local fallback
    const finalProfileImage = profileImage || getLocalFallbackProfileImage();

    // Debug log
    console.log("🖼️ AddAttendanceModal - Student profile picture:", {
      studentId: student.id,
      studentName: student.full_name,
      profilePictureSource,
      profileImage,
      finalProfileImage,
      hasAttachment: !!student.attachment,
      hasAttachments: !!student.attachments,
      studentKeys: Object.keys(student),
    });

    return finalProfileImage;
  };

  // Helper function to format date without timezone issues
  const formatDateForCalendar = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  // Helper function to get student count for a grade
  const getStudentCountForGrade = (gradeId: number): string => {
    if (selectedGrade?.id === gradeId) {
      if (studentsLoading) return "Loading...";
      if (studentsError) return "Error";
      if (students.length > 0) {
        // Show actual filtered student count
        return `${students.length} students`;
      }
      if (studentsData?.data?.students) {
        // If we have API data but no filtered students, show API count
        return `${studentsData.data.students.length} total`;
      }
      return "0 students";
    }
    return "Select to view";
  };

  // Render enhanced student card (following StudentSelectionComponent pattern)
  const renderStudentCard = (student: Student) => {
    return (
      <View style={styles.studentCard}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image
            source={getStudentProfileImage(student)}
            style={styles.studentImage}
            onError={(e) => {
              console.log(
                `🖼️ Student Image Error for ${student.full_name}:`,
                e.nativeEvent,
              );
              // Try local fallback on error
              return getLocalFallbackProfileImage();
            }}
            onLoad={() =>
              console.log(
                `🖼️ Student Image Loaded Successfully for ${student.full_name}`,
              )
            }
            defaultSource={getLocalFallbackProfileImage()}
            resizeMode="cover"
          />
        </View>

        {/* Student Info Section */}
        <View style={styles.studentInfo}>
          <Text style={styles.studentName} numberOfLines={1}>
            {student.student_calling_name || student.full_name}
          </Text>
          <Text style={styles.admissionNumber}>{student.admission_number}</Text>
          <View style={styles.studentDetails}>
            <Text style={styles.gradeClass}>
              {student.grade} - {student.class}
            </Text>
            {student.house && (
              <>
                <Text style={styles.separator}> • </Text>
                <Text style={styles.house}>{student.house}</Text>
              </>
            )}
          </View>
        </View>

        {/* Attendance Section */}
        <View style={styles.attendanceSection}>
          {attendanceOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.attendanceButton,
                student.attendance === option.value && [
                  styles.selectedAttendanceButton,
                  { backgroundColor: option.color },
                ],
              ]}
              onPress={() =>
                handleAttendanceChange(student.id, option.value as any)
              }
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={option.icon as any}
                size={18}
                color={
                  student.attendance === option.value ? "#fff" : option.color
                }
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <FullScreenModal
      visible={visible}
      onClose={handleClose}
      title="Mark Attendance"
      backgroundColor="#F8F9FA"
    >
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Enhanced Date Selection */}
          <View style={styles.dateSection}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <TouchableOpacity
              style={styles.compactDateButton}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="calendar-today" size={20} color="#920734" />
              <Text style={styles.compactDateText}>
                {formatAttendanceDate(formatDateForCalendar(selectedDate))}
              </Text>
              <MaterialIcons name="expand-more" size={16} color="#666" />
            </TouchableOpacity>

            {/* Date Helper Text */}
            <Text style={styles.dateHelperText}>
              📅 Select any date for attendance marking
            </Text>
          </View>

          {/* Grade Selection */}
          <View style={styles.gradeSection}>
            <Text style={styles.sectionTitle}>Select Grade Level</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.gradeScroll}
              contentContainerStyle={styles.gradeScrollContent}
            >
              {GRADE_LEVELS.map((grade) => (
                <TouchableOpacity
                  key={grade.id}
                  style={[
                    styles.gradeCard,
                    selectedGrade?.id === grade.id && styles.selectedGradeCard,
                  ]}
                  onPress={() => {
                    setSelectedGrade(grade);
                    setStudents([]); // Reset student list when grade changes
                  }}
                >
                  <Text style={styles.gradeName}>{grade.display_name}</Text>
                  <Text style={styles.gradeStudentCount}>
                    {getStudentCountForGrade(grade.id)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Search & Students Section */}
          {selectedGrade && (
            <View style={styles.studentsSection}>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search students by name or admission number..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#666"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <MaterialIcons name="clear" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Students Header with Bulk Actions */}
              <View style={styles.studentsHeader}>
                <Text style={styles.studentsTitle}>
                  Students ({filteredStudents.length})
                </Text>
                <View style={styles.bulkActions}>
                  <TouchableOpacity
                    onPress={markAllPresent}
                    style={[
                      styles.bulkActionButton,
                      { backgroundColor: "#4CAF50" },
                    ]}
                  >
                    <MaterialIcons name="check-circle" size={14} color="#fff" />
                    <Text style={styles.bulkActionText}>All Present</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={markAllAbsent}
                    style={[
                      styles.bulkActionButton,
                      { backgroundColor: "#F44336" },
                    ]}
                  >
                    <MaterialIcons name="cancel" size={14} color="#fff" />
                    <Text style={styles.bulkActionText}>All Absent</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Students List */}
              {isLoadingStudents || studentsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#920734" />
                  <Text style={styles.loadingText}>Loading students...</Text>
                </View>
              ) : studentsError ? (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error" size={48} color="#F44336" />
                  <Text style={styles.errorText}>Failed to load students</Text>
                  <Text style={styles.errorSubtext}>
                    Please check your connection and try again
                  </Text>
                </View>
              ) : filteredStudents.length > 0 ? (
                <View style={styles.studentsList}>
                  {filteredStudents.map((student) => (
                    <View key={student.id}>{renderStudentCard(student)}</View>
                  ))}
                </View>
              ) : (
                <View style={styles.noStudentsContainer}>
                  <MaterialIcons name="person-off" size={48} color="#999" />
                  <Text style={styles.noStudentsText}>
                    {searchQuery
                      ? "No students match your search"
                      : "No students found in this class"}
                  </Text>
                </View>
              )}
            </View>
          )}

          {!selectedGrade && (
            <View style={styles.selectPromptContainer}>
              <MaterialIcons name="school" size={48} color="#999" />
              <Text style={styles.selectPromptText}>
                Select a grade to view students
              </Text>
            </View>
          )}

          {/* Enhanced Footer */}
          {selectedGrade && students.length > 0 && (
            <View style={styles.footer}>
              <View style={styles.attendanceSummary}>
                <View style={styles.summaryItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color="#4CAF50"
                  />
                  <Text style={styles.summaryText}>
                    Present:{" "}
                    {students.filter((s) => s.attendance === "present").length}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <MaterialIcons name="cancel" size={16} color="#F44336" />
                  <Text style={styles.summaryText}>
                    Absent:{" "}
                    {students.filter((s) => s.attendance === "absent").length}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <MaterialIcons name="schedule" size={16} color="#FF9800" />
                  <Text style={styles.summaryText}>
                    Late:{" "}
                    {students.filter((s) => s.attendance === "late").length}
                  </Text>
                </View>
              </View>

              <View style={styles.footerButtons}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={[styles.footerButton, styles.cancelButton]}
                >
                  <Text style={styles.footerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isLoading}
                  style={[
                    styles.footerButton,
                    styles.saveButton,
                    isLoading && styles.disabledButton,
                  ]}
                >
                  <MaterialIcons
                    name={isLoading ? "hourglass-empty" : "save"}
                    size={16}
                    color="#fff"
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[styles.footerButtonText, styles.saveButtonText]}
                  >
                    {isLoading ? "Saving..." : "Save Attendance"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Enhanced Footer */}
        {selectedGrade && students.length > 0 && (
          <View style={styles.footer}>
            <View style={styles.attendanceSummary}>
              <View style={styles.summaryItem}>
                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.summaryText}>
                  Present:{" "}
                  {students.filter((s) => s.attendance === "present").length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <MaterialIcons name="cancel" size={16} color="#F44336" />
                <Text style={styles.summaryText}>
                  Absent:{" "}
                  {students.filter((s) => s.attendance === "absent").length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <MaterialIcons name="schedule" size={16} color="#FF9800" />
                <Text style={styles.summaryText}>
                  Late: {students.filter((s) => s.attendance === "late").length}
                </Text>
              </View>
            </View>

            <View style={styles.footerButtons}>
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.footerButton, styles.cancelButton]}
              >
                <Text style={styles.footerButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isLoading}
                style={[
                  styles.footerButton,
                  styles.saveButton,
                  isLoading && styles.disabledButton,
                ]}
              >
                <MaterialIcons
                  name={isLoading ? "hourglass-empty" : "save"}
                  size={16}
                  color="#fff"
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.footerButtonText, styles.saveButtonText]}>
                  {isLoading ? "Saving..." : "Save Attendance"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Calendar Popup Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.calendarModalOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={styles.calendarPopupContainer}>
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarTitle}>Select Date</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={styles.calendarCloseButton}
                  >
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <Calendar
                  current={formatDateForCalendar(selectedDate)}
                  onDayPress={(day) => {
                    // Use dateString to avoid timezone issues (format: YYYY-MM-DD)
                    const [year, month, dayNum] = day.dateString
                      .split("-")
                      .map(Number);
                    const selectedDateFromCalendar = new Date(
                      year,
                      month - 1,
                      dayNum,
                    );
                    setSelectedDate(selectedDateFromCalendar);
                    setShowDatePicker(false);
                  }}
                  markedDates={{
                    [formatDateForCalendar(selectedDate)]: {
                      selected: true,
                      selectedColor: "#920734",
                      selectedTextColor: "#FFFFFF",
                    },
                  }}
                  theme={{
                    backgroundColor: "#ffffff",
                    calendarBackground: "#ffffff",
                    textSectionTitleColor: "#333",
                    selectedDayBackgroundColor: "#920734",
                    selectedDayTextColor: "#ffffff",
                    todayTextColor: "#920734",
                    dayTextColor: "#333",
                    textDisabledColor: "#999",
                    dotColor: "#920734",
                    selectedDotColor: "#ffffff",
                    arrowColor: "#920734",
                    disabledArrowColor: "#d9e1e8",
                    monthTextColor: "#333",
                    indicatorColor: "#920734",
                    textDayFontFamily: "System",
                    textMonthFontFamily: "System",
                    textDayHeaderFontFamily: "System",
                    textDayFontWeight: "400",
                    textMonthFontWeight: "700",
                    textDayHeaderFontWeight: "600",
                    textDayFontSize: 16,
                    textMonthFontSize: 18,
                    textDayHeaderFontSize: 14,
                  }}
                  style={styles.calendar}
                />

                <View style={styles.calendarFooter}>
                  <Text style={styles.calendarHelperText}>
                    📅 Tap any date to select
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </FullScreenModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },

  // Enhanced Date Section
  dateSection: {
    marginBottom: 24,
    backgroundColor: "#FAFAFA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  compactDateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 8,
  },
  compactDateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    flex: 1,
    marginLeft: 8,
  },
  dateHelperText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },

  // Grade Cards Section
  gradeScroll: {
    flexDirection: "row",
  },
  gradeScrollContent: {
    paddingHorizontal: 4,
  },
  gradeCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    alignItems: "center",
    minWidth: 120,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedGradeCard: {
    borderColor: "#920734",
    backgroundColor: "#920734" + "10",
  },
  gradeName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 4,
  },
  gradeStudentCount: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
  },

  // Enhanced Grade Section
  gradeSection: {
    marginBottom: 24,
  },

  // Students Section
  studentsSection: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  studentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  studentsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  bulkActions: {
    flexDirection: "row",
    gap: 8,
  },
  bulkActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  bulkActionText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },

  // Student Cards (Following StudentSelectionComponent pattern)
  studentsList: {
    gap: 12,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  profileSection: {
    marginRight: 16,
  },
  studentImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E0E0E0",
    borderWidth: 2,
    borderColor: "#920734",
  },
  studentInfo: {
    flex: 1,
    marginRight: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  admissionNumber: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  studentDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  gradeClass: {
    fontSize: 12,
    color: "#920734",
    fontWeight: "500",
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
  attendanceSection: {
    flexDirection: "row",
    gap: 8,
  },
  attendanceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F0",
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  selectedAttendanceButton: {
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Loading and Empty States
  loadingContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  errorContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#F44336",
    textAlign: "center",
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  noStudentsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
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
    justifyContent: "center",
    paddingVertical: 60,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectPromptText: {
    marginTop: 16,
    fontSize: 18,
    color: "#999",
    textAlign: "center",
    fontWeight: "500",
  },

  // Enhanced Footer
  footer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  attendanceSummary: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  footerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  footerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 4,
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  saveButton: {
    backgroundColor: "#920734",
    shadowColor: "#920734",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  saveButtonText: {
    color: "#FFFFFF",
  },

  // Common Styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },

  // Calendar Popup Modal Styles
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarPopupContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    maxWidth: 400,
    width: "100%",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  calendarCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  calendar: {
    borderWidth: 0,
    marginHorizontal: 0,
  },
  calendarFooter: {
    padding: 16,
    backgroundColor: "#FAFAFA",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    alignItems: "center",
  },
  calendarHelperText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default AddAttendanceModal;
