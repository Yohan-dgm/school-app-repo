import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../../styles/theme";
import {
  useGetStudentDisciplineSummaryQuery,
  getConductRatingColor,
  getDisciplineStatusColor,
  getMisconductLevelColor,
  formatDisciplineDate,
  DisciplineRecordItem,
} from "../../../api/discipline-management-api";
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
} from "../../../api/notifications";

interface DisciplineRecordDrawerProps {
  visible?: boolean;
  onClose: () => void;
  studentId: number;
  studentName?: string;
}

const DisciplineRecordDrawer: React.FC<DisciplineRecordDrawerProps> = ({
  visible,
  onClose,
  studentId,
  studentName,
}) => {
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<
    string | null
  >(null);
  const [selectedRecord, setSelectedRecord] =
    useState<DisciplineRecordItem | null>(null);

  // Clear the parent-side unread red dot: while this drawer is open for this
  // student, mark any matching unread discipline notifications as read.
  const { data: unreadNotificationsData } = useGetNotificationsQuery(
    { page: 1, limit: 50, filters: { unread_only: true } },
    { skip: !visible || !studentId },
  );
  const [markNotificationAsRead] = useMarkNotificationAsReadMutation();

  useEffect(() => {
    if (!visible || !studentId || !unreadNotificationsData?.data) {
      return;
    }
    const matches = unreadNotificationsData.data.filter(
      (notification) =>
        notification.action_url?.includes(`student_id=${studentId}`) &&
        notification.action_url?.includes("discipline-record"),
    );
    matches.forEach((notification) => {
      markNotificationAsRead({ notificationId: String(notification.id) });
    });
  }, [visible, studentId, unreadNotificationsData, markNotificationAsRead]);

  const {
    data: disciplineData,
    isLoading,
    isFetching,
    error,
  } = useGetStudentDisciplineSummaryQuery(
    {
      student_id: studentId,
      ...(selectedAcademicYear ? { academic_year: selectedAcademicYear } : {}),
    },
    { skip: !studentId },
  );

  const summary = disciplineData?.data;
  const activeYear = selectedAcademicYear || summary?.academic_year;
  const remainingPercent = summary
    ? Math.max(
        0,
        Math.min(100, (summary.remaining_marks / summary.baseline_marks) * 100),
      )
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Discipline Record</Text>
          {!!studentName && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {studentName}
            </Text>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Loading State */}
        {isLoading && (
          <View style={styles.stateContainer}>
            <MaterialIcons name="sync" size={28} color="#920734" />
            <Text style={styles.stateText}>Loading discipline record...</Text>
          </View>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <View style={styles.stateContainer}>
            <MaterialIcons name="error-outline" size={28} color="#DC2626" />
            <Text style={[styles.stateText, styles.stateErrorText]}>
              Failed to load discipline record
            </Text>
          </View>
        )}

        {/* Content */}
        {!isLoading && !error && summary && (
          <>
            {/* Hero summary card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroMarksValue}>
                    {summary.remaining_marks}
                    <Text style={styles.heroMarksTotal}>
                      /{summary.baseline_marks}
                    </Text>
                  </Text>
                  <Text style={styles.heroMarksLabel}>Remaining Marks</Text>
                </View>
                <View
                  style={[
                    styles.ratingBadge,
                    {
                      backgroundColor: getConductRatingColor(
                        summary.conduct_rating,
                      ),
                    },
                  ]}
                >
                  <Text style={styles.ratingBadgeText}>
                    {summary.conduct_rating}
                  </Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${remainingPercent}%`,
                      backgroundColor: getConductRatingColor(
                        summary.conduct_rating,
                      ),
                    },
                  ]}
                />
              </View>
              <Text style={styles.heroYearLabel}>
                Academic Year {activeYear}
                {isFetching ? " · updating..." : ""}
              </Text>
            </View>

            {/* Academic Year Filter */}
            {summary.available_academic_years?.length > 0 && (
              <View style={styles.yearFilterBlock}>
                <Text style={styles.yearFilterLabel}>Academic Year</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.yearChipRow}
                >
                  {summary.available_academic_years.map((year) => {
                    const isActive = activeYear === year;
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.yearChip,
                          isActive && styles.yearChipActive,
                        ]}
                        onPress={() => setSelectedAcademicYear(year)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.yearChipText,
                            isActive && styles.yearChipTextActive,
                          ]}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Record History */}
            <View style={styles.historyBlock}>
              <Text style={styles.historyTitle}>
                Record History ({summary.records.length})
              </Text>

              {summary.records.length > 0 ? (
                summary.records.map((record) => (
                  <TouchableOpacity
                    key={record.id}
                    style={styles.recordCard}
                    onPress={() => setSelectedRecord(record)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.recordLevelBar,
                        {
                          backgroundColor: getMisconductLevelColor(
                            record.misconduct_level?.level_number,
                          ),
                        },
                      ]}
                    />
                    <View style={styles.recordCardBody}>
                      <View style={styles.recordCardTopRow}>
                        <Text style={styles.recordOffence} numberOfLines={2}>
                          {record.offence}
                        </Text>
                        <Text style={styles.recordMarks}>
                          -{record.marks_deducted}
                        </Text>
                      </View>
                      <Text style={styles.recordMeta}>
                        {record.misconduct_level?.level_name}
                        {" · "}
                        {formatDisciplineDate(record.incident_date)}
                      </Text>
                      {!!record.description && (
                        <Text
                          style={styles.recordDescription}
                          numberOfLines={2}
                        >
                          {record.description}
                        </Text>
                      )}
                      <View style={styles.recordCardFooterRow}>
                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor: getDisciplineStatusColor(
                                record.status,
                              ),
                            },
                          ]}
                        >
                          <Text style={styles.statusPillText}>
                            {record.status}
                          </Text>
                        </View>
                        <View style={styles.viewDetailsHint}>
                          <Text style={styles.viewDetailsHintText}>
                            View details
                          </Text>
                          <MaterialIcons
                            name="chevron-right"
                            size={16}
                            color="#920734"
                          />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyRecordsContainer}>
                  <MaterialIcons
                    name="verified-user"
                    size={40}
                    color="#CCCCCC"
                  />
                  <Text style={styles.emptyRecordsText}>
                    No discipline records
                  </Text>
                  <Text style={styles.emptyRecordsSubtext}>
                    Clean record for {activeYear}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Record Detail Modal */}
      <Modal
        visible={!!selectedRecord}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedRecord(null)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeaderRow}>
              <View
                style={[
                  styles.detailLevelDot,
                  {
                    backgroundColor: getMisconductLevelColor(
                      selectedRecord?.misconduct_level?.level_number ?? 0,
                    ),
                  },
                ]}
              />
              <Text style={styles.detailHeaderTitle} numberOfLines={2}>
                {selectedRecord?.offence}
              </Text>
              <TouchableOpacity
                style={styles.detailCloseButton}
                onPress={() => setSelectedRecord(null)}
              >
                <MaterialIcons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedRecord && (
              <ScrollView
                style={styles.detailScroll}
                contentContainerStyle={styles.detailScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.detailBadgeRow}>
                  <View
                    style={[
                      styles.detailStatusPill,
                      {
                        backgroundColor: getDisciplineStatusColor(
                          selectedRecord.status,
                        ),
                      },
                    ]}
                  >
                    <Text style={styles.detailStatusPillText}>
                      {selectedRecord.status}
                    </Text>
                  </View>
                  <Text style={styles.detailMarksBadge}>
                    -{selectedRecord.marks_deducted} marks
                  </Text>
                </View>

                <DetailRow
                  label="Misconduct Level"
                  value={selectedRecord.misconduct_level?.level_name}
                />
                <DetailRow
                  label="Incident Date"
                  value={formatDisciplineDate(selectedRecord.incident_date)}
                />
                <DetailRow
                  label="Academic Year"
                  value={selectedRecord.academic_year}
                />
                <DetailRow
                  label="Description"
                  value={selectedRecord.description}
                  multiline
                />
                <DetailRow
                  label="Disciplinary Action Taken"
                  value={selectedRecord.disciplinary_action_taken}
                  multiline
                />
                <DetailRow
                  label="Override Reason"
                  value={selectedRecord.override_reason}
                  multiline
                />
                <DetailRow
                  label="Student Response"
                  value={selectedRecord.student_response}
                  multiline
                />
                <DetailRow
                  label="Reviewed By"
                  value={selectedRecord.reviewed_by_user?.call_name_with_title}
                />
                <DetailRow
                  label="Reviewed Date"
                  value={
                    selectedRecord.reviewed_date
                      ? formatDisciplineDate(selectedRecord.reviewed_date)
                      : null
                  }
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

interface DetailRowProps {
  label: string;
  value?: string | null;
  multiline?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, multiline }) => {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text
        style={[
          styles.detailRowValue,
          multiline && styles.detailRowValueMultiline,
        ]}
      >
        {value}
      </Text>
    </View>
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
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: theme.spacing.sm,
  },
  stateText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#920734",
  },
  stateErrorText: {
    color: "#DC2626",
  },
  // Hero summary card
  heroCard: {
    margin: 16,
    marginBottom: 12,
    backgroundColor: "#920734",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#920734",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  heroMarksValue: {
    fontFamily: theme.fonts.bold,
    fontSize: 36,
    color: "#FFFFFF",
  },
  heroMarksTotal: {
    fontFamily: theme.fonts.medium,
    fontSize: 18,
    color: "rgba(255,255,255,0.7)",
  },
  heroMarksLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  ratingBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    maxWidth: 160,
  },
  ratingBadgeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    color: "#FFFFFF",
    textAlign: "center",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  heroYearLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 10,
  },
  // Year filter
  yearFilterBlock: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  yearFilterLabel: {
    fontFamily: theme.fonts.bold,
    fontSize: 13,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  yearChipRow: {
    gap: 8,
  },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  yearChipActive: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  yearChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: "#6B7280",
  },
  yearChipTextActive: {
    color: "#FFFFFF",
  },
  // Record history
  historyBlock: {
    marginHorizontal: 16,
    marginBottom: 30,
  },
  historyTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: "#111827",
    marginBottom: 10,
  },
  recordCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  recordLevelBar: {
    width: 5,
  },
  recordCardBody: {
    flex: 1,
    padding: 14,
  },
  recordCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  recordOffence: {
    flex: 1,
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#111827",
  },
  recordMarks: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: "#DC2626",
  },
  recordMeta: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 3,
  },
  recordDescription: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
    lineHeight: 17,
  },
  recordCardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  viewDetailsHint: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewDetailsHintText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: "#920734",
  },
  emptyRecordsContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: theme.spacing.sm,
  },
  emptyRecordsText: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: "#666666",
  },
  emptyRecordsSubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#999999",
  },
  // Record Detail Modal
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  detailHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLevelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  detailHeaderTitle: {
    flex: 1,
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: "#111827",
  },
  detailCloseButton: {
    padding: 4,
  },
  detailScroll: {
    flexShrink: 1,
    minHeight: 0,
  },
  detailScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
  },
  detailBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  detailStatusPillText: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  detailMarksBadge: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: "#DC2626",
  },
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailRowLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  detailRowValue: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#111827",
  },
  detailRowValueMultiline: {
    lineHeight: 19,
  },
});

export default DisciplineRecordDrawer;
