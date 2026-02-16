import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Dropdown } from "react-native-element-dropdown";
import DateTimePicker from "@react-native-community/datetimepicker";
import FullScreenModal from "../components/FullScreenModal";
import {
  useGetClassTeachersQuery,
  useGetTeachersQuery,
  useCreateClassTeacherMutation,
  useUpdateClassTeacherMutation,
  useDeleteClassTeacherMutation,
  ClassTeacher,
} from "../../../../../api/academic-staff-api";
import { useGetGradeLevelsWithClassesQuery } from "../../../../../api/grade-level-api";

interface ClassTeacherModalProps {
  visible: boolean;
  onClose: () => void;
}

const ClassTeacherModal: React.FC<ClassTeacherModalProps> = ({
  visible,
  onClose,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ClassTeacher | null>(null);

  // Form state with dates
  const [formData, setFormData] = useState({
    user_id: "",
    grade_level_class_id: "",
    start_date: new Date(),
    end_date: null as Date | null,
  });

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // API hooks
  const { data: classTeachersData, isLoading: loadingClassTeachers, refetch } =
    useGetClassTeachersQuery({}, { skip: !visible, refetchOnMountOrArgChange: true });

  const { data: teachersData, isLoading: loadingTeachers } =
    useGetTeachersQuery(undefined, { skip: !visible });

  const { data: gradeLevelsData, isLoading: loadingGradeLevels } =
    useGetGradeLevelsWithClassesQuery(
      { page_size: 100, page: 1 },
      { skip: !visible }
    );

  const [createClassTeacher, { isLoading: creating }] =
    useCreateClassTeacherMutation();
  const [updateClassTeacher, { isLoading: updating }] =
    useUpdateClassTeacherMutation();
  const [deleteClassTeacher, { isLoading: deleting }] =
    useDeleteClassTeacherMutation();

  const classTeachers = classTeachersData?.data || [];
  const teachers = teachersData?.data || [];
  const gradeLevels = gradeLevelsData?.data?.data || [];

  // Flatten grade level classes for single dropdown
  const allClasses = gradeLevels.flatMap((gradeLevel) =>
    gradeLevel.grade_level_class_list.map((cls) => {
      // Extract just the class identifier (e.g., "Class 1" from "Grade 1 - Class 1")
      const className = cls.name.includes(' - ')
        ? cls.name.split(' - ')[1]
        : cls.name;

      return {
        id: cls.id,
        name: cls.name,
        gradeLevelName: gradeLevel.name,
        displayName: `${gradeLevel.name} - ${className}`,
      };
    })
  );

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setShowForm(false);
      setEditingItem(null);
      resetForm();
    }
  }, [visible]);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        user_id: editingItem.user_id.toString(),
        grade_level_class_id: editingItem.grade_level_class_id.toString(),
        start_date: editingItem.start_date ? new Date(editingItem.start_date) : new Date(),
        end_date: editingItem.end_date ? new Date(editingItem.end_date) : null,
      });
    } else {
      resetForm();
    }
  }, [editingItem]);

  const resetForm = () => {
    setFormData({
      user_id: "",
      grade_level_class_id: "",
      start_date: new Date(),
      end_date: null,
    });
  };

  const handleOpenForm = () => {
    setEditingItem(null);
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (item: ClassTeacher) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = (item: ClassTeacher) => {
    Alert.alert(
      "Delete Class Teacher",
      `Remove ${item.user.full_name} from ${item.grade_level_class.grade_level.name} - ${item.grade_level_class.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteClassTeacher({ id: item.id }).unwrap();
              Alert.alert("Success", "Class teacher removed successfully");
              refetch();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.data?.message || "Failed to delete class teacher"
              );
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.user_id) {
      Alert.alert("Validation Error", "Please select a teacher");
      return;
    }
    if (!formData.grade_level_class_id) {
      Alert.alert("Validation Error", "Please select a class");
      return;
    }

    // Format dates to YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Get current academic year (format: "2024/2025")
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const academicYear = currentMonth >= 8
      ? `${currentYear}/${currentYear + 1}`
      : `${currentYear - 1}/${currentYear}`;

    try {
      const payload = {
        user_id: parseInt(formData.user_id),
        grade_level_class_id: parseInt(formData.grade_level_class_id),
        academic_year: academicYear,
        start_date: formatDate(formData.start_date),
        end_date: formData.end_date ? formatDate(formData.end_date) : null,
      };

      if (editingItem) {
        // Update
        await updateClassTeacher({
          id: editingItem.id,
          ...payload,
        }).unwrap();
        Alert.alert("Success", "Class teacher updated successfully");
      } else {
        // Create
        await createClassTeacher(payload).unwrap();
        Alert.alert("Success", "Class teacher assigned successfully");
      }
      setShowForm(false);
      setEditingItem(null);
      resetForm();
      refetch();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.data?.message || "Failed to save class teacher"
      );
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    resetForm();
  };

  // Form View
  if (showForm) {
    return (
      <FullScreenModal
        visible={visible}
        onClose={onClose}
        title={editingItem ? "Edit Class Teacher" : "Add Class Teacher"}
        backgroundColor="#f8f9fa"
      >
        <ScrollView
          style={styles.formContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Teacher Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>
              Teacher <Text style={styles.required}>*</Text>
            </Text>
            {loadingTeachers ? (
              <ActivityIndicator color="#920734" />
            ) : teachers && teachers.length > 0 ? (
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
                data={teachers.map((t) => ({
                  label: t.full_name,
                  value: t.id.toString(),
                }))}
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Select Teacher"
                searchPlaceholder="Search teachers..."
                value={formData.user_id}
                onChange={(item) =>
                  setFormData({ ...formData, user_id: item.value })
                }
                renderRightIcon={() => (
                  <MaterialIcons
                    name="arrow-drop-down"
                    size={20}
                    color="#920734"
                  />
                )}
              />
            ) : (
              <Text style={styles.emptyText}>No teachers available</Text>
            )}
          </View>

          {/* Class Selection - Single Dropdown */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>
              Class <Text style={styles.required}>*</Text>
            </Text>
            {loadingGradeLevels ? (
              <ActivityIndicator color="#920734" />
            ) : (
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
                data={allClasses.map((c) => ({
                  label: c.displayName,
                  value: c.id.toString(),
                }))}
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Select Class"
                searchPlaceholder="Search classes..."
                value={formData.grade_level_class_id}
                onChange={(item) =>
                  setFormData({ ...formData, grade_level_class_id: item.value })
                }
                renderRightIcon={() => (
                  <MaterialIcons
                    name="arrow-drop-down"
                    size={20}
                    color="#920734"
                  />
                )}
              />
            )}
          </View>

          {/* Start Date */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>
              Start Date <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <MaterialIcons name="calendar-today" size={20} color="#920734" />
              <Text style={styles.dateButtonText}>
                {formData.start_date.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            {showStartDatePicker && (
              <DateTimePicker
                value={formData.start_date}
                mode="date"
                display="default"
                onChange={(_event, selectedDate) => {
                  setShowStartDatePicker(false);
                  if (selectedDate) {
                    setFormData({ ...formData, start_date: selectedDate });
                  }
                }}
              />
            )}
          </View>

          {/* End Date */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>End Date (Optional)</Text>
            <View style={styles.dateButtonContainer}>
              <TouchableOpacity
                style={[styles.dateButton, { flex: 1 }]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <MaterialIcons name="calendar-today" size={20} color="#920734" />
                <Text style={styles.dateButtonText}>
                  {formData.end_date
                    ? formData.end_date.toLocaleDateString()
                    : "Select End Date"}
                </Text>
              </TouchableOpacity>
              {formData.end_date && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setFormData({ ...formData, end_date: null })}
                >
                  <MaterialIcons name="close" size={20} color="#f44336" />
                </TouchableOpacity>
              )}
            </View>
            {showEndDatePicker && (
              <DateTimePicker
                value={formData.end_date || new Date()}
                mode="date"
                display="default"
                minimumDate={formData.start_date}
                onChange={(_event, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) {
                    setFormData({ ...formData, end_date: selectedDate });
                  }
                }}
              />
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={creating || updating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (creating || updating) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={creating || updating}
            >
              {creating || updating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="check" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    {editingItem ? "Update" : "Save"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </FullScreenModal>
    );
  }

  // List View
  return (
    <FullScreenModal
      visible={visible}
      onClose={onClose}
      title="Class Teachers"
      backgroundColor="#f8f9fa"
    >
      <View style={styles.container}>
        {/* Header with Add Button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.addButton} onPress={handleOpenForm}>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Class Teacher</Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {loadingClassTeachers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#920734" />
              <Text style={styles.loadingText}>Loading class teachers...</Text>
            </View>
          ) : classTeachers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No class teachers assigned</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={handleOpenForm}
              >
                <MaterialIcons name="add" size={20} color="#920734" />
                <Text style={styles.emptyButtonText}>Add First Teacher</Text>
              </TouchableOpacity>
            </View>
          ) : (
            classTeachers.map((item) => (
              <View key={item.id} style={styles.card}>
                <LinearGradient
                  colors={["#920734", "#b8285a"]}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>
                        {item.user.full_name}
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        {item.grade_level_class.grade_level.name} -{" "}
                        {item.grade_level_class.name}
                      </Text>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleEdit(item)}
                      >
                        <MaterialIcons name="edit" size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleDelete(item)}
                        disabled={deleting}
                      >
                        <MaterialIcons
                          name="delete-outline"
                          size={20}
                          color="#fff"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </FullScreenModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#920734",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#920734",
  },
  emptyButtonText: {
    color: "#920734",
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  cardGradient: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
    opacity: 0.9,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
  },
  // Form styles
  formContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#f44336",
  },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  placeholderStyle: {
    fontSize: 14,
    color: "#999",
  },
  selectedTextStyle: {
    fontSize: 14,
    color: "#920734",
    fontWeight: "600",
  },
  inputSearchStyle: {
    fontSize: 14,
    color: "#333",
    borderBottomColor: "#920734",
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  submitButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#920734",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dateButtonText: {
    fontSize: 14,
    color: "#920734",
    fontWeight: "600",
  },
  dateButtonContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  clearButton: {
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
});

export default ClassTeacherModal;
