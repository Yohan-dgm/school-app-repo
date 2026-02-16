import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import FullScreenModal from "../components/FullScreenModal";
import {
  useGetStudentAttendanceStatsQuery,
  StudentAttendanceStatsStudent,
} from "../../../../../api/attendance-api";
import {
  useGetGradeLevelsWithClassesQuery,
  GradeLevelWithClasses,
  GradeLevelClass,
} from "../../../../../api/grade-level-api";

type FilterType = "year" | "month";

interface FilterOption {
  id: FilterType;
  label: string;
}

interface StudentAttendanceStatsModalProps {
  visible: boolean;
  onClose: () => void;
  gradeLevelClassId?: number;
  gradeLevelClassName?: string;
}

interface GradeGroup {
  grade_level_id: number;
  grade_level_name: string;
  students: StudentAttendanceStatsStudent[];
}

const filterOptions: FilterOption[] = [
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

const AttendanceCount = ({
  icon,
  count,
  color,
  label,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  count: number;
  color: string;
  label: string;
}) => (
  <View style={styles.attendanceCount}>
    <MaterialIcons name={icon} size={14} color={color} />
    <Text style={[styles.countLabel, { color }]}>{label}</Text>
    <Text style={[styles.countValue, { color }]}>{count}</Text>
  </View>
);

const StudentAttendanceStatsModal: React.FC<
  StudentAttendanceStatsModalProps
> = ({ visible, onClose, gradeLevelClassId: initialClassId, gradeLevelClassName: initialClassName }) => {
  // Internal class selection state
  const [selectedClassId, setSelectedClassId] = useState<number | null>(initialClassId || null);
  const [selectedClassName, setSelectedClassName] = useState<string>(initialClassName || "");

  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedFilterType, setSelectedFilterType] = useState<FilterType>("month");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Fetch grade levels with classes for selection
  const {
    data: gradeLevelsData,
    isLoading: isLoadingClasses,
  } = useGetGradeLevelsWithClassesQuery(
    {
      page_size: 50,
      page: 1,
    },
    { skip: !visible }
  );

  // Flatten classes for selection
  const allClasses = useMemo(() => {
    if (!gradeLevelsData?.data?.data) return [];

    const classes: (GradeLevelClass & { gradeLevelName: string })[] = [];
    gradeLevelsData.data.data.forEach((gradeLevel: GradeLevelWithClasses) => {
      gradeLevel.grade_level_class_list.forEach((classItem: GradeLevelClass) => {
        classes.push({
          ...classItem,
          gradeLevelName: gradeLevel.name,
        });
      });
    });
    return classes;
  }, [gradeLevelsData]);

  // Build query params based on filter type
  const queryParams = useMemo(() => {
    if (!selectedClassId) return null;

    const params: any = {
      grade_level_class_id: selectedClassId,
      filter_type: selectedFilterType,
      year: selectedYear
    };

    if (selectedFilterType === "month") {
      params.month = selectedMonth;
    }

    return params;
  }, [selectedClassId, selectedFilterType, selectedYear, selectedMonth]);

  const { data, isLoading, error, refetch } = useGetStudentAttendanceStatsQuery(
    queryParams!,
    { skip: !visible || !queryParams, refetchOnMountOrArgChange: true }
  );

  // Log API response for debugging
  React.useEffect(() => {
    if (visible) {
      console.log("📊 Student Attendance Stats Modal - Query Params:", queryParams);
      console.log("📊 Student Attendance Stats Modal - API Response:", { data, isLoading, error });
      if (error) {
        console.error("❌ Student Attendance Stats Error:", error);
      }
    }
  }, [visible, data, isLoading, error]);

  const statsData = data?.data;
  const students = statsData?.students || [];

  // Group students by grade level
  const groupedByGrade = useMemo(() => {
    const grouped: Record<number, GradeGroup> = {};

    students.forEach((student) => {
      const gradeId = student.grade_level_id;
      if (!grouped[gradeId]) {
        grouped[gradeId] = {
          grade_level_id: gradeId,
          grade_level_name: student.grade_level_name,
          students: [],
        };
      }
      grouped[gradeId].students.push(student);
    });

    // Sort students within each grade by total attendance records
    Object.values(grouped).forEach((grade) => {
      grade.students.sort(
        (a, b) =>
          b.total_attendance_records - a.total_attendance_records ||
          a.full_name.localeCompare(b.full_name)
      );
    });

    return grouped;
  }, [students]);

  // Get unique grade levels for chips
  const gradeLevels = useMemo(() => {
    return Object.values(groupedByGrade)
      .map((grade) => ({
        id: grade.grade_level_id,
        name: grade.grade_level_name,
      }))
      .sort((a, b) => {
        // Natural sort for grade levels (e.g., Grade 1, Grade 2, ..., Grade 10, Grade 11)
        const aNum = parseInt(a.name.match(/\d+/)?.[0] || "0");
        const bNum = parseInt(b.name.match(/\d+/)?.[0] || "0");
        return aNum - bNum;
      });
  }, [groupedByGrade]);

  // Filter students by selected grade
  const filteredStudents = useMemo(() => {
    if (!selectedGrade) return [];
    return groupedByGrade[selectedGrade]?.students || [];
  }, [selectedGrade, groupedByGrade]);

  // Auto-select first grade when data loads
  useEffect(() => {
    if (gradeLevels.length > 0 && !selectedGrade) {
      setSelectedGrade(gradeLevels[0].id);
    }
  }, [gradeLevels]);

  // Year options (current year ± 5 years)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  }, []);

  // Month options
  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  return (
    <FullScreenModal
      visible={visible}
      onClose={onClose}
      title={selectedClassName ? `Attendance Stats - ${selectedClassName}` : "Student Attendance Statistics"}
      backgroundColor="#f5f7fa"
    >
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Class Selection Section */}
        <View style={styles.classSelectionSection}>
          <Text style={styles.sectionTitle}>Select Grade Level Class</Text>
          {isLoadingClasses ? (
            <View style={styles.classLoadingContainer}>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={styles.classLoadingText}>Loading classes...</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={styles.classChipsContainer}
              style={styles.classScrollView}
            >
              {allClasses.map((classItem) => (
                <TouchableOpacity
                  key={classItem.id}
                  style={[
                    styles.classChip,
                    selectedClassId === classItem.id && styles.classChipActive,
                  ]}
                  onPress={() => {
                    setSelectedClassId(classItem.id);
                    setSelectedClassName(`${classItem.name} - ${classItem.gradeLevelName}`);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="class"
                    size={18}
                    color={selectedClassId === classItem.id ? "#fff" : "#059669"}
                  />
                  <View style={styles.classChipTextContainer}>
                    <Text
                      style={[
                        styles.classChipText,
                        selectedClassId === classItem.id && styles.classChipTextActive,
                      ]}
                    >
                      {classItem.name}
                    </Text>
                    <Text
                      style={[
                        styles.classChipSubtext,
                        selectedClassId === classItem.id && styles.classChipSubtextActive,
                      ]}
                    >
                      {classItem.gradeLevelName}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Show message if no class selected */}
        {!selectedClassId && !isLoadingClasses && (
          <View style={styles.centerContainer}>
            <MaterialIcons name="school" size={64} color="#ccc" />
            <Text style={styles.noClassText}>Please select a class to view statistics</Text>
          </View>
        )}

        {/* Loading State */}
        {selectedClassId && isLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>Loading statistics...</Text>
          </View>
        )}

        {/* Error State */}
        {selectedClassId && error && (
          <View style={styles.centerContainer}>
            <MaterialIcons name="error-outline" size={48} color="#DC2626" />
            <Text style={styles.errorText}>Unable to load statistics</Text>
            <Text style={styles.errorDetails}>
              {error && 'status' in error
                ? `Error ${error.status}`
                : 'Please check your connection'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetch}>
              <MaterialIcons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Display */}
        {selectedClassId && !isLoading && !error && statsData && (
          <>
            {/* Filter Section */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Filter By</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsContainer}
              >
                {filterOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.filterChip,
                      selectedFilterType === option.id && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedFilterType(option.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="filter-list"
                      size={16}
                      color={selectedFilterType === option.id ? "#fff" : "#059669"}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedFilterType === option.id && styles.filterChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Conditional Filter Inputs */}
              <View style={styles.filterInputsSection}>
                {selectedFilterType === "year" && (
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Select Year</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={selectedYear}
                        onValueChange={(value) => setSelectedYear(value)}
                        style={styles.picker}
                      >
                        {yearOptions.map((year) => (
                          <Picker.Item
                            key={year}
                            label={year.toString()}
                            value={year}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                )}

                {selectedFilterType === "month" && (
                  <View style={styles.filtersRow}>
                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Year</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={selectedYear}
                          onValueChange={(value) => setSelectedYear(value)}
                          style={styles.picker}
                        >
                          {yearOptions.map((year) => (
                            <Picker.Item
                              key={year}
                              label={year.toString()}
                              value={year}
                            />
                          ))}
                        </Picker>
                      </View>
                    </View>

                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Month</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={selectedMonth}
                          onValueChange={(value) => setSelectedMonth(value)}
                          style={styles.picker}
                        >
                          {monthOptions.map((month) => (
                            <Picker.Item
                              key={month.value}
                              label={month.label}
                              value={month.value}
                            />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Grade Selection Chips */}
            <View style={styles.gradeSelectionSection}>
              <Text style={styles.sectionTitle}>Select Grade Level</Text>
              {gradeLevels.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="school" size={40} color="#ccc" />
                  <Text style={styles.emptyStateText}>
                    No grade levels found
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.gradeChipsContainer}
                >
                  {gradeLevels.map((grade) => (
                    <TouchableOpacity
                      key={grade.id}
                      style={[
                        styles.gradeChip,
                        selectedGrade === grade.id && styles.gradeChipActive,
                      ]}
                      onPress={() => setSelectedGrade(grade.id)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="school"
                        size={18}
                        color={selectedGrade === grade.id ? "#fff" : "#059669"}
                      />
                      <Text
                        style={[
                          styles.gradeChipText,
                          selectedGrade === grade.id && styles.gradeChipTextActive,
                        ]}
                      >
                        {grade.name}
                      </Text>
                      <View
                        style={[
                          styles.gradeChipBadge,
                          selectedGrade === grade.id && styles.gradeChipBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.gradeChipBadgeText,
                            selectedGrade === grade.id &&
                              styles.gradeChipBadgeTextActive,
                          ]}
                        >
                          {groupedByGrade[grade.id]?.students.length || 0}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Student List */}
            {selectedGrade && (
              <View style={styles.studentListSection}>
                <View style={styles.listHeader}>
                  <Text style={styles.listTitle}>
                    Students
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {filteredStudents.length}
                    </Text>
                  </View>
                </View>

                {filteredStudents.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="people-outline" size={40} color="#ccc" />
                    <Text style={styles.emptyStateText}>
                      No students found for this grade
                    </Text>
                  </View>
                ) : (
                  <View style={styles.studentsList}>
                    {filteredStudents.map((student) => (
                      <View key={student.student_id} style={styles.studentCard}>
                        {/* Student Info */}
                        <View style={styles.studentHeader}>
                          <View style={styles.studentAvatar}>
                            <MaterialIcons name="person" size={20} color="#059669" />
                          </View>
                          <View style={styles.studentInfo}>
                            <Text style={styles.studentName} numberOfLines={1}>
                              {student.full_name}
                            </Text>
                            <Text style={styles.admissionNumber}>
                              {student.admission_number}
                            </Text>
                          </View>
                          <View style={styles.totalBadge}>
                            <Text style={styles.totalBadgeLabel}>Total Days</Text>
                            <Text style={styles.totalBadgeValue}>
                              {student.in_time_count + student.out_time_count + student.absent_count}
                            </Text>
                          </View>
                        </View>

                        {/* Attendance Counts */}
                        <View style={styles.attendanceCounts}>
                          <AttendanceCount
                            icon="check-circle"
                            count={student.in_time_count + student.out_time_count}
                            color="#10B981"
                            label="Present"
                          />
                          <AttendanceCount
                            icon="cancel"
                            count={student.absent_count}
                            color="#EF4444"
                            label="Absent"
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </FullScreenModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    paddingVertical: 80,
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 17,
    color: "#DC2626",
    fontWeight: "700",
  },
  errorDetails: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  classSelectionSection: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  classLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 12,
  },
  classLoadingText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  classScrollView: {
    maxHeight: 120,
  },
  classChipsContainer: {
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  classChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#059669",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 140,
  },
  classChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  classChipTextContainer: {
    flex: 1,
  },
  classChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
    marginBottom: 2,
  },
  classChipTextActive: {
    color: "#fff",
  },
  classChipSubtext: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6b7280",
  },
  classChipSubtextActive: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  noClassText: {
    fontSize: 16,
    color: "#999",
    fontWeight: "500",
    marginTop: 12,
    textAlign: "center",
  },
  filterSection: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipsContainer: {
    gap: 10,
    paddingVertical: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#059669",
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  filterInputsSection: {
    marginTop: 12,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 10,
  },
  inputWrapper: {
    marginBottom: 0,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  gradeSelectionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 14,
  },
  gradeChipsContainer: {
    gap: 10,
    paddingVertical: 8,
  },
  gradeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#059669",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gradeChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  gradeChipText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#059669",
  },
  gradeChipTextActive: {
    color: "#fff",
  },
  gradeChipBadge: {
    backgroundColor: "#e6f7f1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 28,
    alignItems: "center",
  },
  gradeChipBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  gradeChipBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669",
  },
  gradeChipBadgeTextActive: {
    color: "#fff",
  },
  studentListSection: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  countBadge: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#059669",
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#059669",
  },
  studentsList: {
    gap: 12,
  },
  studentCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e6f7f1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 3,
  },
  admissionNumber: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "400",
  },
  totalBadge: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#059669",
    alignItems: "center",
    minWidth: 50,
  },
  totalBadgeLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#059669",
    marginBottom: 1,
  },
  totalBadgeValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#059669",
  },
  attendanceCounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  attendanceCount: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    justifyContent: "center",
  },
  countLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  countValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  emptyState: {
    paddingVertical: 50,
    alignItems: "center",
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
});

export default StudentAttendanceStatsModal;
