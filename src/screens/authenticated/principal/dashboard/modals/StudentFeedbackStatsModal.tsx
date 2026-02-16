import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import FullScreenModal from "../components/FullScreenModal";
import { useGetStudentFeedbackStatsQuery } from "../../../../../api/educator-feedback-api";

const { width } = Dimensions.get("window");

type PeriodType = "this_week" | "this_month" | "this_year" | null;

interface PeriodOption {
  id: PeriodType;
  label: string;
}

interface StudentFeedbackStatsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface FeedbackCategory {
  category_id: number;
  category_name: string;
  count: number;
}

interface Student {
  student_id: number;
  full_name: string;
  admission_number: string;
  grade_level_id: number;
  grade_level_name: string;
  feedback_count: number;
  accepted_count: number;
  pending_count: number;
  categories: FeedbackCategory[];
}

interface GradeGroup {
  grade_level_id: number;
  grade_level_name: string;
  students: Student[];
  total_students: number;
  total_feedback_count: number;
}

const periodOptions: PeriodOption[] = [
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "this_year", label: "This Year" },
  { id: null, label: "All Time" },
];

const StatsCard = ({
  title,
  value,
  icon,
  colors,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: keyof typeof MaterialIcons.glyphMap;
  colors: [string, string];
  subtitle?: string;
}) => (
  <View style={styles.statsCard}>
    <LinearGradient colors={colors} style={styles.cardGradient}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <MaterialIcons name={icon} size={20} color="white" />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <Text style={styles.cardValue}>{value}</Text>
        {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>
    </LinearGradient>
  </View>
);

const StudentFeedbackStatsModal: React.FC<StudentFeedbackStatsModalProps> = ({
  visible,
  onClose,
}) => {
  const [selectedPeriod, setSelectedPeriod] =
    useState<PeriodType>("this_month");
  const [expandedGrades, setExpandedGrades] = useState<Set<number>>(new Set());

  const { data, isLoading, error, refetch } = useGetStudentFeedbackStatsQuery(
    { period: selectedPeriod },
    { skip: !visible, refetchOnMountOrArgChange: true }
  );

  const statsData = data?.data;
  const summary = statsData?.summary;
  const students = statsData?.students || [];

  // Group students by grade level
  const groupedByGrade = useMemo(() => {
    const grouped: Record<number, GradeGroup> = {};

    students.forEach((student: Student) => {
      const gradeId = student.grade_level_id;
      if (!grouped[gradeId]) {
        grouped[gradeId] = {
          grade_level_id: gradeId,
          grade_level_name: student.grade_level_name,
          students: [],
          total_students: 0,
          total_feedback_count: 0,
        };
      }
      grouped[gradeId].students.push(student);
      grouped[gradeId].total_students++;
      grouped[gradeId].total_feedback_count += student.feedback_count;
    });

    // Sort students within each grade by feedback count
    Object.values(grouped).forEach((grade) => {
      grade.students.sort(
        (a, b) =>
          b.feedback_count - a.feedback_count ||
          a.full_name.localeCompare(b.full_name)
      );
    });

    return grouped;
  }, [students]);

  // Sort grades by name
  const sortedGrades = useMemo(() => {
    return Object.values(groupedByGrade).sort((a, b) =>
      a.grade_level_name.localeCompare(b.grade_level_name)
    );
  }, [groupedByGrade]);

  const toggleGrade = (gradeId: number) => {
    const newExpanded = new Set(expandedGrades);
    if (newExpanded.has(gradeId)) {
      newExpanded.delete(gradeId);
    } else {
      newExpanded.add(gradeId);
    }
    setExpandedGrades(newExpanded);
  };

  return (
    <FullScreenModal
      visible={visible}
      onClose={onClose}
      title="Student Feedback Statistics"
      backgroundColor="#f8f9fa"
    >
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Period Filter Chips */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Select Period:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterChipsContainer}
            contentContainerStyle={styles.filterChipsContent}
          >
            {periodOptions.map((option) => (
              <TouchableOpacity
                key={option.id || "all"}
                style={[
                  styles.filterChip,
                  selectedPeriod === option.id && styles.filterChipActive,
                ]}
                onPress={() => setSelectedPeriod(option.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedPeriod === option.id && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#920734" />
            <Text style={styles.loadingText}>Loading statistics...</Text>
          </View>
        )}

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color="#DC2626" />
            <Text style={styles.errorText}>Unable to load statistics</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetch}>
              <MaterialIcons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Display */}
        {!isLoading && !error && statsData && (
          <>
            {/* Period Display */}
            <View style={styles.periodDisplay}>
              <MaterialIcons name="date-range" size={18} color="#666" />
              <Text style={styles.periodText}>{summary?.filtered_period}</Text>
            </View>

            {/* Summary Cards */}
            <View style={styles.statsGrid}>
              <StatsCard
                title="Total Students"
                value={summary?.total_students || 0}
                icon="school"
                colors={["#4F46E5", "#7C3AED"]}
                subtitle="Active students"
              />
              <StatsCard
                title="Total Feedbacks"
                value={summary?.total_feedback_count || 0}
                icon="rate-review"
                colors={["#7C3AED", "#A855F7"]}
                subtitle="Received"
              />
            </View>

            {/* Status Cards */}
            <View style={styles.statsGrid}>
              <StatsCard
                title="Accepted"
                value={summary?.total_accepted || 0}
                icon="check-circle"
                colors={["#10B981", "#059669"]}
                subtitle="Approved"
              />
              <StatsCard
                title="Pending"
                value={summary?.total_pending || 0}
                icon="pending"
                colors={["#F59E0B", "#D97706"]}
                subtitle="Awaiting review"
              />
            </View>

            {/* Grade Levels Section */}
            <View style={styles.gradeLevelsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Grade Levels ({sortedGrades.length})
                </Text>
              </View>

              {sortedGrades.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="school" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>
                    No grade levels with students found
                  </Text>
                </View>
              ) : (
                <View style={styles.gradesList}>
                  {sortedGrades.map((grade) => (
                    <View
                      key={grade.grade_level_id}
                      style={styles.gradeContainer}
                    >
                      {/* Grade Header */}
                      <TouchableOpacity
                        style={styles.gradeRow}
                        onPress={() => toggleGrade(grade.grade_level_id)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name={
                            expandedGrades.has(grade.grade_level_id)
                              ? "expand-more"
                              : "chevron-right"
                          }
                          size={24}
                          color="#666"
                        />
                        <View style={styles.gradeInfo}>
                          <Text style={styles.gradeName}>
                            {grade.grade_level_name}
                          </Text>
                          <View style={styles.gradeMeta}>
                            <MaterialIcons
                              name="people"
                              size={14}
                              color="#666"
                            />
                            <Text style={styles.gradeMetaText}>
                              {grade.total_students}
                            </Text>
                            <Text style={styles.separator}>|</Text>
                            <MaterialIcons
                              name="rate-review"
                              size={14}
                              color="#920734"
                            />
                            <Text style={styles.feedbackCount}>
                              {grade.total_feedback_count}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Student List (if expanded) */}
                      {expandedGrades.has(grade.grade_level_id) && (
                        <View style={styles.studentList}>
                          {grade.students.map((student) => (
                            <View
                              key={student.student_id}
                              style={styles.studentCard}
                            >
                              {/* Student Header */}
                              <View style={styles.studentHeader}>
                                <View style={styles.studentInfo}>
                                  <Text
                                    style={styles.studentName}
                                    numberOfLines={1}
                                  >
                                    {student.full_name}
                                  </Text>
                                  <Text style={styles.admissionNumber}>
                                    {student.admission_number}
                                  </Text>
                                </View>
                                <View style={styles.totalBadge}>
                                  <Text style={styles.totalBadgeLabel}>
                                    Total
                                  </Text>
                                  <Text style={styles.totalBadgeValue}>
                                    {student.feedback_count}
                                  </Text>
                                </View>
                              </View>

                              {/* Status Row */}
                              <View style={styles.statusRow}>
                                <View style={styles.statusBadge}>
                                  <MaterialIcons
                                    name="check-circle"
                                    size={14}
                                    color="#10B981"
                                  />
                                  <Text
                                    style={[
                                      styles.statusText,
                                      { color: "#10B981" },
                                    ]}
                                  >
                                    Accepted: {student.accepted_count}
                                  </Text>
                                </View>
                                <View style={styles.statusBadge}>
                                  <MaterialIcons
                                    name="pending"
                                    size={14}
                                    color="#F59E0B"
                                  />
                                  <Text
                                    style={[
                                      styles.statusText,
                                      { color: "#F59E0B" },
                                    ]}
                                  >
                                    Pending: {student.pending_count}
                                  </Text>
                                </View>
                              </View>

                              {/* Categories */}
                              {student.categories &&
                                student.categories.length > 0 && (
                                  <View style={styles.categoriesSection}>
                                    <Text style={styles.categoriesLabel}>
                                      Categories:
                                    </Text>
                                    <View style={styles.categoriesGrid}>
                                      {student.categories.map((category) => (
                                        <View
                                          key={category.category_id}
                                          style={styles.categoryBadge}
                                        >
                                          <Text
                                            style={styles.categoryName}
                                            numberOfLines={1}
                                          >
                                            {category.category_name}
                                          </Text>
                                          <Text style={styles.categoryCount}>
                                            {category.count}
                                          </Text>
                                        </View>
                                      ))}
                                    </View>
                                  </View>
                                )}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
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
    padding: 20,
    paddingBottom: 40,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 10,
  },
  filterChipsContainer: {
    marginBottom: 0,
  },
  filterChipsContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  periodDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  periodText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    height: 110,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardGradient: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "white",
  },
  cardValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "white",
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 9,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  gradeLevelsSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  gradesList: {
    gap: 0,
  },
  gradeContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  gradeInfo: {
    flex: 1,
  },
  gradeName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  gradeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  gradeMetaText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  separator: {
    fontSize: 13,
    color: "#ccc",
    marginHorizontal: 4,
  },
  feedbackCount: {
    fontSize: 13,
    color: "#920734",
    fontWeight: "600",
  },
  studentList: {
    paddingLeft: 36,
    paddingBottom: 12,
    gap: 10,
  },
  studentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
    gap: 4,
    marginRight: 12,
  },
  studentName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    flexShrink: 1,
  },
  admissionNumber: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "400",
  },
  totalBadge: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#10B981",
    alignItems: "center",
  },
  totalBadgeLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#059669",
    marginBottom: 2,
  },
  totalBadgeValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#059669",
  },
  statusRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  statusBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  categoriesSection: {
    marginTop: 4,
  },
  categoriesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  categoryName: {
    fontSize: 11,
    fontWeight: "500",
    color: "#374151",
    minWidth: 210,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  errorContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    fontWeight: "600",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#920734",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});

export default StudentFeedbackStatsModal;
