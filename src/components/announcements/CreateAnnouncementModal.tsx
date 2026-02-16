import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  RichEditor,
  RichToolbar,
  actions,
} from "react-native-pell-rich-editor";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  useCreateAnnouncementMutation,
  useGetAnnouncementCategoriesQuery,
  CreateAnnouncementRequest,
} from "../../api/announcements-api";
import {
  ANNOUNCEMENT_CATEGORIES,
  PRIORITY_LEVELS,
  ANNOUNCEMENT_STATUS_OPTIONS,
  TARGET_TYPES,
  getCategoryById,
  getPriorityLevel,
} from "../../constants/announcementCategories";
import {
  USER_CATEGORIES,
  getUserCategoryDisplayName,
} from "../../constants/userCategories";
import GradeLevelSelector from "./GradeLevelSelector";
import StudentSelector from "./StudentSelector";

interface CreateAnnouncementModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateAnnouncementModal({
  visible,
  onClose,
  onSuccess,
}: CreateAnnouncementModalProps) {
  const { data: categoriesResponse } = useGetAnnouncementCategoriesQuery(
    undefined,
    {
      // Skip the API call and use fallback categories to avoid 404 errors
      skip: true,
    },
  );
  const [createAnnouncement, { isLoading }] = useCreateAnnouncementMutation();

  // Use fallback categories if API fails
  const categories = categoriesResponse?.data || ANNOUNCEMENT_CATEGORIES;

  const [formData, setFormData] = useState<CreateAnnouncementRequest>({
    title: "",
    content: "",
    excerpt: "",
    category_id: 1,
    priority_level: 1,
    status: "published",
    target_type: "All",
    target_data: { group_filter: "All" },
    image_url: "",
    attachment_urls: [],
    is_featured: false,
    is_pinned: false,
    scheduled_at: undefined,
    expires_at: undefined,
    tags: "",
    meta_data: {},
  });

  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  
  // New state for dynamic selection
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const richText = React.useRef<RichEditor>(null);

  useEffect(() => {
    if (categories.length > 0 && formData.category_id === 0) {
      setFormData((prev) => ({
        ...prev,
        category_id: categories[0].id,
      }));
    }
  }, [categories, formData.category_id]);

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      excerpt: "",
      category_id: categories.length > 0 ? categories[0].id : 1,
      priority_level: 1,
      status: "published",
      target_type: "All",
      target_data: { group_filter: "All" },
      image_url: "",
      attachment_urls: [],
      is_featured: false,
      is_pinned: false,
      scheduled_at: undefined,
      expires_at: undefined,
      tags: "",
      meta_data: {},
    });
    setSelectedRoles([]);
    setSelectedUsers([]);
    // Reset new state
    setSelectedGradeLevelId(null);
    setSelectedClassId(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      Alert.alert(
        "Error",
        "Please fill in all required fields (Title and Content)",
      );
      return;
    }

    if (formData.status === "scheduled" && !formData.scheduled_at) {
      Alert.alert(
        "Error",
        "Please select a schedule time for scheduled announcements",
      );
      return;
    }

    try {
      const targetData: any = {};

      if (formData.target_type === "Student" && selectedUsers.length > 0) {
        targetData.student_id = selectedUsers[0];
      } else {
        // For All, Educator, Management, Grade_Level, Grade_Level_class, Primary, Secondary, Early_Years
        targetData.group_filter = formData.target_type;

        if (formData.target_type === "Grade_Level" && selectedGradeLevelId) {
          targetData.grade_level_id = selectedGradeLevelId;
        } else if (
          formData.target_type === "Grade_Level_class" &&
          selectedClassId
        ) {
          targetData.grade_level_class_id = selectedClassId;
        }
      }

      const announcementData: CreateAnnouncementRequest = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        excerpt: formData.excerpt.trim() || undefined,
        category_id: formData.category_id,
        priority_level: formData.priority_level,
        status: formData.status,
        target_type: formData.target_type,
        target_data:
          Object.keys(targetData).length > 0 ? targetData : undefined,
        image_url: formData.image_url.trim() || undefined,
        attachment_urls: formData.attachment_urls?.length
          ? formData.attachment_urls
          : undefined,
        is_featured: formData.is_featured,
        is_pinned: formData.is_pinned,
        scheduled_at: formData.scheduled_at
          ? new Date(formData.scheduled_at).toISOString()
          : undefined,
        expires_at: formData.expires_at
          ? new Date(formData.expires_at).toISOString()
          : undefined,
        tags: formData.tags.trim() || undefined,
        meta_data: formData.meta_data,
      };

      await createAnnouncement(announcementData).unwrap();

      Alert.alert("Success", "Announcement created successfully!");
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.data?.message || "Failed to create announcement",
      );
    }
  };

  const renderCategorySelection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name="category" size={18} color="#7c2d3e" />
        <Text style={styles.sectionTitle}>Category *</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.categoryContainer}>
          {categories.map((category: any) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                {
                  borderColor: category.color,
                  backgroundColor:
                    formData.category_id === category.id
                      ? category.color
                      : "#f9fafb",
                },
              ]}
              onPress={() =>
                setFormData((prev) => ({ ...prev, category_id: category.id }))
              }
            >
              <MaterialIcons
                name={category.icon as any}
                size={16}
                color={
                  formData.category_id === category.id
                    ? "#ffffff"
                    : category.color
                }
              />
              <Text
                style={[
                  styles.categoryText,
                  {
                    color:
                      formData.category_id === category.id
                        ? "#ffffff"
                        : "#6b7280",
                  },
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderBasicInfo = () => (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="title" size={18} color="#7c2d3e" />
          <Text style={styles.sectionTitle}>Title *</Text>
        </View>
        <TextInput
          style={styles.textInput}
          placeholder="Enter announcement title"
          value={formData.title}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, title: text }))
          }
          maxLength={500}
        />
        <Text style={styles.charCount}>{formData.title.length}/500</Text>
      </View>

      <View style={[styles.section, { zIndex: 1000 }]}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="description" size={18} color="#7c2d3e" />
          <Text style={styles.sectionTitle}>Content *</Text>
        </View>
        <View style={styles.richTextContainer}>
          <RichToolbar
            editor={richText}
            actions={[
              actions.setBold,
              actions.setItalic,
              actions.setUnderline,
              actions.insertBulletsList,
              actions.insertOrderedList,
              actions.insertLink,
              actions.heading1,
            ]}
            iconTint="#5c1f2e"
            selectedIconTint="#7c2d3e"
            selectedButtonStyle={{ backgroundColor: "#f8f4f5" }}
            style={styles.richToolbar}
          />
          <ScrollView
            style={styles.richEditorScroll}
            nestedScrollEnabled={true}
            keyboardDismissMode="none"
          >
            <RichEditor
              ref={richText}
              initialContentHTML={formData.content}
              placeholder="Enter announcement content..."
              onChange={(html) =>
                setFormData((prev) => ({ ...prev, content: html }))
              }
              editorStyle={{
                backgroundColor: "#fefefd",
                color: "#2c1810",
                placeholderColor: "#9ca3af",
                contentCSSText: "font-size: 16px; min-height: 200px;",
              }}
              style={styles.richEditor}
              initialHeight={200}
            />
          </ScrollView>
        </View>
      </View>

      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>Excerpt (Optional)</Text>
        <TextInput
          style={[styles.textInput, styles.multilineInput]}
          placeholder="Brief summary (auto-generated if empty)"
          value={formData.excerpt}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, excerpt: text }))
          }
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.charCount}>
          {(formData.excerpt || "").length}/1000
        </Text>
      </View> */}
    </>
  );

  const renderPriorityAndStatus = () => (
    <View style={styles.row}>
      <View style={styles.flex1}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="priority-high" size={18} color="#7c2d3e" />
          <Text style={styles.sectionTitle}>Priority *</Text>
        </View>
        <View style={styles.priorityContainer}>
          {PRIORITY_LEVELS.map((priority) => (
            <TouchableOpacity
              key={priority.value}
              style={[
                styles.priorityButton,
                {
                  backgroundColor:
                    formData.priority_level === priority.value
                      ? priority.color
                      : "#f9fafb",
                  borderColor:
                    formData.priority_level === priority.value
                      ? priority.color
                      : "#d1d5db",
                },
              ]}
              onPress={() =>
                setFormData((prev) => ({
                  ...prev,
                  priority_level: priority.value,
                }))
              }
            >
              <MaterialIcons
                name={
                  priority.value === 3
                    ? "priority-high"
                    : priority.value === 2
                      ? "notifications-active"
                      : "notifications"
                }
                size={14}
                color={
                  formData.priority_level === priority.value
                    ? "#ffffff"
                    : "#8d5a5e"
                }
              />
              <Text
                style={[
                  styles.priorityText,
                  {
                    color:
                      formData.priority_level === priority.value
                        ? "#ffffff"
                        : "#6b7280",
                  },
                ]}
              >
                {priority.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.flex1}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="publish" size={18} color="#7c2d3e" />
          <Text style={styles.sectionTitle}>Status *</Text>
        </View>
        <View style={styles.statusContainer}>
          {ANNOUNCEMENT_STATUS_OPTIONS.map((status) => (
            <TouchableOpacity
              key={status.value}
              style={[
                styles.statusButton,
                formData.status === status.value && styles.selectedStatusButton,
              ]}
              onPress={() =>
                setFormData((prev) => ({ ...prev, status: status.value }))
              }
            >
              <MaterialIcons
                name={
                  status.value === "published"
                    ? "publish"
                    : status.value === "scheduled"
                      ? "schedule"
                      : "drafts"
                }
                size={14}
                color={formData.status === status.value ? "#ffffff" : "#8d5a5e"}
              />
              <Text
                style={[
                  styles.statusText,
                  formData.status === status.value && styles.selectedStatusText,
                ]}
              >
                {status.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderTargetSelection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name="group" size={18} color="#7c2d3e" />
        <Text style={styles.sectionTitle}>Target Audience</Text>
      </View>
      
      {/* Target Type Chips */}
      <View style={styles.targetChipsContainer}>
        {TARGET_TYPES.map((target) => (
          <TouchableOpacity
            key={target.value}
            style={[
              styles.targetChip,
              formData.target_type === target.value && styles.selectedTargetChip,
            ]}
            onPress={() => {
              setFormData((prev) => ({
                ...prev,
                target_type: target.value,
                target_data: target.value === "All" ? { group_filter: "All" } : {},
              }));
              // Reset sub-selections
              setSelectedRoles([]);
              setSelectedUsers([]);
            }}
          >
            <Text
              style={[
                styles.targetChipText,
                formData.target_type === target.value && styles.selectedTargetChipText,
              ]}
            >
              {target.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Dynamic Sub-selection Logic */}
      {formData.target_type !== "All" && formData.target_type !== "broadcast" && (
        <View style={styles.subSelectionContainer}>
          <Text style={styles.subSectionTitle}>
            Select {formData.target_type.replace(/_/g, " ")}
          </Text>
          
          {/* Dummy Selectors for demonstration */}
      {/* Dynamic Sub-selection Logic */}
      {(formData.target_type === "Grade_Level" || formData.target_type === "Grade_Level_class") && (
        <GradeLevelSelector
          targetType={formData.target_type}
          selectedGradeLevelId={selectedGradeLevelId}
          selectedClassId={selectedClassId}
          onGradeLevelChange={(gradeId, classId) => {
            setSelectedGradeLevelId(gradeId);
            setSelectedClassId(classId); 
          }}
          onClassChange={(classId) => setSelectedClassId(classId)}
        />
      )}

      {formData.target_type === "Student" && (
        <StudentSelector
          selectedStudentIds={selectedUsers}
          onSelectionChange={setSelectedUsers}
        />
      )}

      {/* Legacy Role Selector (if keeping) */}
      {formData.target_type === "role" && (
         <View style={styles.roleSelection}>
             {/* ... existing role selector Logic if any ... */}
             <Text>Role selection not fully implemented for dynamic backend yet.</Text>
         </View>
      )}
        </View>
      )}
    </View>
  );

  const renderActions = () => (
    <View style={styles.actionsContainer}>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleClose}
        disabled={isLoading}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.createButton, isLoading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <Text style={styles.createButtonText}>Creating...</Text>
        ) : (
          <>
            <MaterialIcons name="publish" size={16} color="#ffffff" />
            <Text style={styles.createButtonText}>Create Announcement</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Announcement</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderCategorySelection()}
          {renderBasicInfo()}
          {/* Priority and Status are removed from UI but kept in state */}
          {renderTargetSelection()}
        </ScrollView>

        {renderActions()}

        {/* Date Pickers */}
        {showSchedulePicker && (
          <DateTimePicker
            value={
              formData.scheduled_at
                ? new Date(formData.scheduled_at)
                : new Date()
            }
            mode="datetime"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowSchedulePicker(false);
              if (selectedDate) {
                setFormData((prev) => ({
                  ...prev,
                  scheduled_at: selectedDate.toISOString(),
                }));
              }
            }}
          />
        )}

        {showExpiryPicker && (
          <DateTimePicker
            value={
              formData.expires_at ? new Date(formData.expires_at) : new Date()
            }
            mode="datetime"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowExpiryPicker(false);
              if (selectedDate) {
                setFormData((prev) => ({ ...prev, expires_at: selectedDate.toISOString() }));
              }
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf7f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "#7c2d3e",
    borderBottomWidth: 1,
    borderBottomColor: "#5c1f2e",
  },
  closeButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#7c2d3e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7c2d3e",
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5c1f2e",
    marginBottom: 8,
    marginTop: 12,
  },
  categoryContainer: {
    flexDirection: "row",
    gap: 8,
  },
  categoryButton: {
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
    minWidth: 80,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e5d3d6",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#2c1810",
    backgroundColor: "#fefefd",
    borderStyle: "solid",
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    color: "#7c2d3e",
    textAlign: "right",
    marginTop: 4,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  flex1: {
    flex: 1,
  },
  priorityContainer: {
    gap: 8,
  },
  priorityButton: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusContainer: {
    gap: 8,
  },
  statusButton: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5d3d6",
    backgroundColor: "#fefefd",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  selectedStatusButton: {
    backgroundColor: "#7c2d3e",
    borderColor: "#7c2d3e",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5c1f2e",
  },
  selectedStatusText: {
    color: "#ffffff",
  },
  targetContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  targetButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#fefefd",
    borderWidth: 1,
    borderColor: "#e5d3d6",
    flex: 1,
    minWidth: "48%",
  },
  selectedTargetButton: {
    backgroundColor: "#7c2d3e",
    borderColor: "#7c2d3e",
  },
  targetTextContainer: {
    alignItems: "center",
  },
  targetText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5c1f2e",
    textAlign: "center",
  },
  selectedTargetText: {
    color: "#ffffff",
  },
  targetDescription: {
    fontSize: 11,
    color: "#8d5a5e",
    marginTop: 2,
    textAlign: "center",
  },
  selectedTargetDescription: {
    color: "#f3e8ea",
  },
  roleSelection: {
    marginTop: 12,
  },
  roleContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  roleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f8f4f5",
    borderWidth: 1,
    borderColor: "#e5d3d6",
  },
  selectedRoleButton: {
    backgroundColor: "#7c2d3e",
    borderColor: "#7c2d3e",
  },
  roleText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#5c1f2e",
  },
  selectedRoleText: {
    color: "#ffffff",
  },
  featureContainer: {
    gap: 12,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#e5d3d6",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    backgroundColor: "#fefefd",
  },
  checkedCheckbox: {
    backgroundColor: "#7c2d3e",
    borderColor: "#7c2d3e",
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5c1f2e",
    marginBottom: 2,
  },
  checkboxDescription: {
    fontSize: 11,
    color: "#8d5a5e",
  },
  mediaContainer: {
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5c1f2e",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fefefd",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionsContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5d3d6",
    backgroundColor: "#ffffff",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#f8f4f5",
    borderWidth: 1,
    borderColor: "#e5d3d6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#5c1f2e",
  },
  createButton: {
    flex: 2,
    flexDirection: "row",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#7c2d3e",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7c2d3e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: "#a17a82",
    shadowOpacity: 0,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  // Rich Editor Styles
  richTextContainer: {
    borderWidth: 1,
    borderColor: "#e5d3d6",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fefefd",
    minHeight: 250,
  },
  richToolbar: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5d3d6",
    backgroundColor: "#f8f4f5",
  },
  richEditorScroll: {
    flex: 1,
    backgroundColor: "#fefefd",
  },
  richEditor: {
    minHeight: 200,
    backgroundColor: "#fefefd",
  },
  // New Styles for Target Chips
  targetChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  targetChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#fefefd",
    borderWidth: 1,
    borderColor: "#e5d3d6",
  },
  selectedTargetChip: {
    backgroundColor: "#7c2d3e",
    borderColor: "#7c2d3e",
  },
  targetChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#5c1f2e",
  },
  selectedTargetChipText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  subSelectionContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5d3d6",
  },
  dummySelector: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
});
