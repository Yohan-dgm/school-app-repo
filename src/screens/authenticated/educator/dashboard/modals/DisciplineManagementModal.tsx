import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../../../../styles/theme";
import {
  useGetDisciplineRecordListDataQuery,
  useGetMisconductLevelListDataQuery,
  useCreateDisciplineRecordMutation,
  useUpdateDisciplineRecordMutation,
  useDeleteDisciplineRecordMutation,
  useApproveDisciplineRecordMutation,
  useRejectDisciplineRecordMutation,
  DisciplineRecordListItem,
  DisciplineRecordStatus,
  MisconductLevel,
  getDisciplineStatusColor,
  getMisconductLevelColor,
  formatDisciplineDate,
} from "../../../../../api/discipline-management-api";
import {
  useLazyGetStudentListQuery,
  DetailedStudentData,
} from "../../../../../api/student-management-api";

interface DisciplineManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

const STATUS_FILTERS: (DisciplineRecordStatus | "All")[] = [
  "Pending",
  "Approved",
  "Rejected",
  "All",
];

const toDateInputString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getApiErrorMessage = (error: any): string => {
  return (
    error?.data?.message ||
    error?.data?.error ||
    error?.error ||
    "Something went wrong. Please try again."
  );
};

const DisciplineManagementModal: React.FC<DisciplineManagementModalProps> = ({
  visible,
  onClose,
}) => {
  const [view, setView] = useState<"list" | "form">("list");
  const [statusFilter, setStatusFilter] = useState<
    DisciplineRecordStatus | "All"
  >("Pending");
  const [searchPhrase, setSearchPhrase] = useState("");

  const [editingRecord, setEditingRecord] =
    useState<DisciplineRecordListItem | null>(null);

  // Form fields
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] =
    useState<DetailedStudentData | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<MisconductLevel | null>(
    null,
  );
  const [offence, setOffence] = useState("");
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState(new Date());
  const [showIncidentDatePicker, setShowIncidentDatePicker] = useState(false);
  const [marksDeducted, setMarksDeducted] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [disciplinaryActionTaken, setDisciplinaryActionTaken] = useState("");
  const [parentInformed, setParentInformed] = useState(false);
  const [studentResponse, setStudentResponse] = useState("");

  // Queries
  const {
    data: listData,
    isLoading: isLoadingList,
    error: listError,
  } = useGetDisciplineRecordListDataQuery(
    {
      status: statusFilter === "All" ? undefined : statusFilter,
      search_phrase: searchPhrase || undefined,
      page: 1,
      page_size: 30,
    },
    { skip: !visible },
  );

  const { data: levelListData } = useGetMisconductLevelListDataQuery(
    undefined,
    { skip: !visible },
  );

  const [
    searchStudents,
    { data: studentSearchData, isFetching: isSearchingStudents },
  ] = useLazyGetStudentListQuery();

  const [createDisciplineRecord, { isLoading: isCreating }] =
    useCreateDisciplineRecordMutation();
  const [updateDisciplineRecord, { isLoading: isUpdating }] =
    useUpdateDisciplineRecordMutation();
  const [deleteDisciplineRecord] = useDeleteDisciplineRecordMutation();
  const [approveDisciplineRecord, { isLoading: isApproving }] =
    useApproveDisciplineRecordMutation();
  const [rejectDisciplineRecord, { isLoading: isRejecting }] =
    useRejectDisciplineRecordMutation();

  const records = listData?.data?.data || [];
  const misconductLevels = levelListData?.data || [];
  const studentResults = studentSearchData?.data?.data || [];

  const isSubmitting = isCreating || isUpdating;

  const resetForm = () => {
    setEditingRecord(null);
    setStudentSearchQuery("");
    setSelectedStudent(null);
    setSelectedLevel(null);
    setOffence("");
    setDescription("");
    setIncidentDate(new Date());
    setShowIncidentDatePicker(false);
    setMarksDeducted("");
    setOverrideReason("");
    setDisciplinaryActionTaken("");
    setParentInformed(false);
    setStudentResponse("");
  };

  const handleClose = () => {
    resetForm();
    setView("list");
    onClose();
  };

  const openCreateForm = () => {
    resetForm();
    setView("form");
  };

  const openEditForm = (record: DisciplineRecordListItem) => {
    setEditingRecord(record);
    setSelectedStudent(null);
    setStudentSearchQuery("");
    const matchingLevel =
      misconductLevels.find((l) => l.id === record.misconduct_level?.id) ||
      null;
    setSelectedLevel(matchingLevel);
    setOffence(record.offence);
    setDescription(record.description || "");
    setIncidentDate(new Date(record.incident_date.split("T")[0]));
    setMarksDeducted(String(record.marks_deducted));
    setOverrideReason(record.override_reason || "");
    setDisciplinaryActionTaken(record.disciplinary_action_taken || "");
    setParentInformed(record.parent_informed);
    setStudentResponse(record.student_response || "");
    setView("form");
  };

  const handleStudentSearchChange = (text: string) => {
    setStudentSearchQuery(text);
    if (text.trim().length >= 2) {
      searchStudents({ search: text.trim(), page_size: 10 });
    }
  };

  const handleSelectLevel = (levelId: number) => {
    const level = misconductLevels.find((l) => l.id === levelId) || null;
    setSelectedLevel(level);
    if (level && !editingRecord) {
      setMarksDeducted(String(level.indicative_deduction_min));
    }
  };

  const handleSubmit = async () => {
    if (!editingRecord && !selectedStudent) {
      Alert.alert("Missing student", "Please search for and select a student.");
      return;
    }
    if (!selectedLevel) {
      Alert.alert("Missing level", "Please select a misconduct level.");
      return;
    }
    if (!offence.trim()) {
      Alert.alert("Missing offence", "Please enter the offence.");
      return;
    }
    const marksNum = parseInt(marksDeducted, 10);
    if (isNaN(marksNum) || marksNum <= 0) {
      Alert.alert(
        "Invalid marks",
        "Please enter a valid marks-deducted value.",
      );
      return;
    }

    const basePayload = {
      misconduct_level_id: selectedLevel.id,
      offence: offence.trim(),
      description: description.trim() || undefined,
      incident_date: toDateInputString(incidentDate),
      marks_deducted: marksNum,
      override_reason: overrideReason.trim() || undefined,
      disciplinary_action_taken: disciplinaryActionTaken.trim() || undefined,
      parent_informed: parentInformed,
      student_response: studentResponse.trim() || undefined,
    };

    try {
      if (editingRecord) {
        await updateDisciplineRecord({
          id: editingRecord.id,
          ...basePayload,
        }).unwrap();
        Alert.alert("Saved", "Discipline record updated.");
      } else {
        await createDisciplineRecord({
          student_id: selectedStudent!.id,
          ...basePayload,
        }).unwrap();
        Alert.alert("Created", "Discipline record created.");
      }
      resetForm();
      setView("list");
    } catch (error) {
      Alert.alert("Failed", getApiErrorMessage(error));
    }
  };

  const handleApprove = (record: DisciplineRecordListItem) => {
    Alert.alert(
      "Approve record",
      `Approve this ${record.offence} record? The parent will be notified.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              await approveDisciplineRecord({ id: record.id }).unwrap();
            } catch (error) {
              Alert.alert("Failed", getApiErrorMessage(error));
            }
          },
        },
      ],
    );
  };

  const handleReject = (record: DisciplineRecordListItem) => {
    Alert.alert("Reject record", `Reject this ${record.offence} record?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          try {
            await rejectDisciplineRecord({ id: record.id }).unwrap();
          } catch (error) {
            Alert.alert("Failed", getApiErrorMessage(error));
          }
        },
      },
    ]);
  };

  const handleDelete = (record: DisciplineRecordListItem) => {
    Alert.alert(
      "Delete record",
      `Delete this ${record.offence} record? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDisciplineRecord({ id: record.id }).unwrap();
            } catch (error) {
              Alert.alert("Failed", getApiErrorMessage(error));
            }
          },
        },
      ],
    );
  };

  const filteredStatusCount = useMemo(
    () => listData?.data?.total ?? records.length,
    [listData, records.length],
  );

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
          {view === "form" ? (
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => {
                resetForm();
                setView("list");
              }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#920734" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerIconButton} />
          )}
          <Text style={styles.headerTitle}>
            {view === "list"
              ? "Discipline Management"
              : editingRecord
                ? "Edit Discipline Record"
                : "New Discipline Record"}
          </Text>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={handleClose}
          >
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {view === "list" ? (
          <>
            {/* Status filter chips */}
            <View style={styles.filterRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipRow}
              >
                {STATUS_FILTERS.map((status) => {
                  const isActive = statusFilter === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterChip,
                        isActive && styles.filterChipActive,
                      ]}
                      onPress={() => setStatusFilter(status)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isActive && styles.filterChipTextActive,
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Search + Add */}
            <View style={styles.searchRow}>
              <View style={styles.searchInputWrapper}>
                <MaterialIcons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search offence, student name/admission no."
                  placeholderTextColor="#9CA3AF"
                  value={searchPhrase}
                  onChangeText={setSearchPhrase}
                />
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={openCreateForm}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.listScroll}
              showsVerticalScrollIndicator={false}
            >
              {isLoadingList && (
                <View style={styles.stateContainer}>
                  <ActivityIndicator color="#920734" />
                  <Text style={styles.stateText}>Loading records...</Text>
                </View>
              )}

              {!isLoadingList && listError && (
                <View style={styles.stateContainer}>
                  <MaterialIcons
                    name="error-outline"
                    size={28}
                    color="#DC2626"
                  />
                  <Text style={[styles.stateText, styles.stateErrorText]}>
                    Failed to load discipline records
                  </Text>
                </View>
              )}

              {!isLoadingList && !listError && records.length === 0 && (
                <View style={styles.stateContainer}>
                  <MaterialIcons
                    name="verified-user"
                    size={36}
                    color="#CCCCCC"
                  />
                  <Text style={styles.stateText}>
                    No{" "}
                    {statusFilter !== "All" ? statusFilter.toLowerCase() : ""}{" "}
                    records
                  </Text>
                </View>
              )}

              {!isLoadingList && !listError && records.length > 0 && (
                <>
                  <Text style={styles.resultCount}>
                    {filteredStatusCount} record
                    {filteredStatusCount === 1 ? "" : "s"}
                  </Text>
                  {records.map((record) => (
                    <View key={record.id} style={styles.recordCard}>
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
                          <Text style={styles.recordOffence} numberOfLines={1}>
                            {record.offence}
                          </Text>
                          <Text style={styles.recordMarks}>
                            -{record.marks_deducted}
                          </Text>
                        </View>
                        <Text style={styles.recordStudent} numberOfLines={1}>
                          {record.student?.full_name_with_title ||
                            record.student?.full_name ||
                            `Student #${record.student_id}`}
                          {record.student?.admission_number
                            ? ` · ${record.student.admission_number}`
                            : ""}
                        </Text>
                        <Text style={styles.recordMeta}>
                          {record.misconduct_level?.level_name}
                          {" · "}
                          {formatDisciplineDate(record.incident_date)}
                        </Text>

                        <View style={styles.recordFooterRow}>
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

                          <View style={styles.recordActions}>
                            {record.status === "Pending" && (
                              <>
                                <TouchableOpacity
                                  style={[
                                    styles.actionIconButton,
                                    styles.approveButton,
                                  ]}
                                  onPress={() => handleApprove(record)}
                                  disabled={isApproving}
                                >
                                  <MaterialIcons
                                    name="check"
                                    size={16}
                                    color="#16A34A"
                                  />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[
                                    styles.actionIconButton,
                                    styles.rejectButton,
                                  ]}
                                  onPress={() => handleReject(record)}
                                  disabled={isRejecting}
                                >
                                  <MaterialIcons
                                    name="close"
                                    size={16}
                                    color="#DC2626"
                                  />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.actionIconButton}
                                  onPress={() => openEditForm(record)}
                                >
                                  <MaterialIcons
                                    name="edit"
                                    size={16}
                                    color="#6B7280"
                                  />
                                </TouchableOpacity>
                              </>
                            )}
                            <TouchableOpacity
                              style={styles.actionIconButton}
                              onPress={() => handleDelete(record)}
                            >
                              <MaterialIcons
                                name="delete-outline"
                                size={16}
                                color="#DC2626"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
              <View style={styles.bottomSpacing} />
            </ScrollView>
          </>
        ) : (
          <ScrollView
            style={styles.formScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Student */}
            <Text style={styles.fieldLabel}>Student</Text>
            {editingRecord ? (
              <View style={styles.readOnlyStudentBox}>
                <MaterialIcons name="person" size={18} color="#920734" />
                <Text style={styles.readOnlyStudentText}>
                  {editingRecord.student?.full_name_with_title ||
                    editingRecord.student?.full_name ||
                    `Student #${editingRecord.student_id}`}
                </Text>
              </View>
            ) : selectedStudent ? (
              <View style={styles.selectedStudentChip}>
                <MaterialIcons name="person" size={18} color="#920734" />
                <Text style={styles.selectedStudentText}>
                  {selectedStudent.full_name_with_title ||
                    selectedStudent.full_name}{" "}
                  · {selectedStudent.admission_number}
                </Text>
                <TouchableOpacity onPress={() => setSelectedStudent(null)}>
                  <MaterialIcons name="close" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.searchInputWrapper}>
                  <MaterialIcons name="search" size={18} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search student by name or admission no."
                    placeholderTextColor="#9CA3AF"
                    value={studentSearchQuery}
                    onChangeText={handleStudentSearchChange}
                  />
                  {isSearchingStudents && (
                    <ActivityIndicator size="small" color="#920734" />
                  )}
                </View>
                {studentSearchQuery.trim().length >= 2 &&
                  studentResults.length > 0 && (
                    <View style={styles.studentResultsBox}>
                      {studentResults.map((student) => (
                        <TouchableOpacity
                          key={student.id}
                          style={styles.studentResultRow}
                          onPress={() => {
                            setSelectedStudent(student);
                            setStudentSearchQuery("");
                          }}
                        >
                          <Text style={styles.studentResultName}>
                            {student.full_name_with_title || student.full_name}
                          </Text>
                          <Text style={styles.studentResultMeta}>
                            {student.admission_number}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
              </>
            )}

            {/* Misconduct Level */}
            <Text style={styles.fieldLabel}>Misconduct Level</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedLevel?.id ?? ""}
                onValueChange={(value) =>
                  value && handleSelectLevel(Number(value))
                }
              >
                <Picker.Item label="Select a level..." value="" />
                {misconductLevels.map((level) => (
                  <Picker.Item
                    key={level.id}
                    label={`Level ${level.level_number} - ${level.level_name}`}
                    value={level.id}
                  />
                ))}
              </Picker>
            </View>
            {selectedLevel && (
              <View style={styles.levelHelperBox}>
                <Text style={styles.levelHelperText}>
                  {selectedLevel.nature_of_offence}
                </Text>
                <Text style={styles.levelHelperRange}>
                  Suggested range: {selectedLevel.indicative_deduction_min}-
                  {selectedLevel.indicative_deduction_max} marks
                </Text>
                {!!selectedLevel.examples && (
                  <Text style={styles.levelHelperExamples}>
                    e.g. {selectedLevel.examples.replace(/\n/g, ", ")}
                  </Text>
                )}
              </View>
            )}

            {/* Offence */}
            <Text style={styles.fieldLabel}>Offence</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Fighting, Late arrival"
              placeholderTextColor="#9CA3AF"
              value={offence}
              onChangeText={setOffence}
            />

            {/* Description */}
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              placeholder="Brief description of the incident"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Incident Date */}
            <Text style={styles.fieldLabel}>Incident Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowIncidentDatePicker(true)}
            >
              <MaterialIcons name="calendar-today" size={18} color="#920734" />
              <Text style={styles.dateButtonText}>
                {incidentDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            {showIncidentDatePicker && (
              <DateTimePicker
                value={incidentDate}
                mode="date"
                display="default"
                onChange={(_event, selectedDate) => {
                  setShowIncidentDatePicker(false);
                  if (selectedDate) {
                    setIncidentDate(selectedDate);
                  }
                }}
              />
            )}

            {/* Marks Deducted */}
            <Text style={styles.fieldLabel}>Marks Deducted</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 5"
              placeholderTextColor="#9CA3AF"
              value={marksDeducted}
              onChangeText={setMarksDeducted}
              keyboardType="number-pad"
            />

            {/* Override Reason */}
            <Text style={styles.fieldLabel}>
              Override Reason{" "}
              <Text style={styles.fieldLabelHint}>
                (required if marks are outside the level&apos;s range)
              </Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Why the deduction is outside the suggested range"
              placeholderTextColor="#9CA3AF"
              value={overrideReason}
              onChangeText={setOverrideReason}
            />

            {/* Disciplinary Action Taken */}
            <Text style={styles.fieldLabel}>Disciplinary Action Taken</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Verbal warning, detention"
              placeholderTextColor="#9CA3AF"
              value={disciplinaryActionTaken}
              onChangeText={setDisciplinaryActionTaken}
            />

            {/* Parent Informed */}
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Parent Informed</Text>
              <Switch
                value={parentInformed}
                onValueChange={setParentInformed}
              />
            </View>

            {/* Student Response */}
            <Text style={styles.fieldLabel}>Student Response</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              placeholder="Optional - the student's response/statement"
              placeholderTextColor="#9CA3AF"
              value={studentResponse}
              onChangeText={setStudentResponse}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingRecord ? "Save Changes" : "Create Record"}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
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
    paddingTop: Platform.OS === "ios" ? 16 : 30,
    paddingBottom: 15,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerIconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: theme.fonts.bold,
    fontSize: 17,
    color: "#111827",
  },
  filterRow: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  filterChipRow: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  filterChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 4,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#111827",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#920734",
    justifyContent: "center",
    alignItems: "center",
  },
  listScroll: {
    flex: 1,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  resultCount: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  stateText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#6B7280",
  },
  stateErrorText: {
    color: "#DC2626",
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
    fontSize: 14,
    color: "#DC2626",
  },
  recordStudent: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#920734",
    marginTop: 3,
  },
  recordMeta: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  recordFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  statusPill: {
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
  recordActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionIconButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  approveButton: {
    backgroundColor: "#DCFCE7",
  },
  rejectButton: {
    backgroundColor: "#FEE2E2",
  },
  bottomSpacing: {
    height: 40,
  },
  // Form styles
  formScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  fieldLabel: {
    fontFamily: theme.fonts.bold,
    fontSize: 13,
    color: "#374151",
    marginTop: 16,
    marginBottom: 6,
  },
  fieldLabelHint: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: "#9CA3AF",
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#111827",
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#111827",
  },
  readOnlyStudentBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readOnlyStudentText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#111827",
  },
  selectedStudentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FDF2F4",
    borderWidth: 1,
    borderColor: "#F3D5DC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedStudentText: {
    flex: 1,
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#920734",
  },
  studentResultsBox: {
    marginTop: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
  },
  studentResultRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  studentResultName: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#111827",
  },
  studentResultMeta: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  pickerWrapper: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
  },
  levelHelperBox: {
    marginTop: 8,
    backgroundColor: "#FDF2F4",
    borderRadius: 10,
    padding: 10,
  },
  levelHelperText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#920734",
  },
  levelHelperRange: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  levelHelperExamples: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  submitButton: {
    backgroundColor: "#920734",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: "#FFFFFF",
  },
});

export default DisciplineManagementModal;
