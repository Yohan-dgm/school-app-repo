import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  LayoutAnimation,
  UIManager,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  SlideInDown,
  SlideOutUp,
  SlideInUp,
  SlideOutDown,
} from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import FullScreenModal from "../components/FullScreenModal";

// API imports (students and feedback submission)
import {
  useGetCategoryListQuery,
  useGetFeedbackCategoriesWithQuestionsQuery,
  useGetEducatorFeedbacksQuery,
  useSubmitEducatorFeedbackMutation,
  useCreateFeedbackCategoryMutation,
  useUpdateEducatorFeedbackMutation,
  useAddEvaluationMutation,
  useDeleteEvaluationMutation,
  useDeleteFeedbackMutation,
  useCreateCommentMutation,
} from "../../../../../api/educator-feedback-api";

// Constants imports
import {
  GRADE_LEVELS,
  GradeLevel,
  getGradeNameById,
} from "../../../../../constants/gradeLevels";
import {
  INTELLIGENCE_TYPES,
  getIntelligenceTypeById,
} from "../../../../../constants/intelligenceTypes";

// Component imports
import StudentSelectionWithPagination from "../../../../../components/common/StudentSelectionWithPagination";
import CategorySelectionComponent from "../../../../../components/educator-feedback/CategorySelectionComponent";
import QuestionnaireComponent from "../../../../../components/educator-feedback/QuestionnaireComponent";

// Profile picture utility imports
import {
  getStudentProfilePicture,
  getLocalFallbackProfileImage,
} from "../../../../../utils/studentProfileUtils";

// ===== CONSTANTS =====
// Constants for feedback management
const DEFAULT_PAGE_SIZE = 10;
const RATING_SCALE_MAX = 5;

interface EducatorFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

interface EvaluationType {
  id: number;
  name: string;
  status_code: number;
}

interface Evaluation {
  id: number;
  edu_fb_id: number;
  edu_fd_evaluation_type_id: number;
  reviewer_feedback: string;
  created_at: string;
  evaluation_type: EvaluationType;
}

interface Student {
  id: number;
  student_calling_name: string;
  admission_number: string;
  profileImage?: string;
}

interface GradeLevel {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface Comment {
  comment: string;
}

interface CreatedBy {
  call_name_with_title: string;
}

interface FeedbackItem {
  id: string;
  student: Student;
  grade_level: GradeLevel;
  category: Category;
  comments: Comment[];
  created_by: CreatedBy;
  evaluations: Evaluation[];
  created_at: string;
  rating?: number;
}

// Main component starts here
interface MCQOption {
  id: number;
  text: string;
  marks: number;
}

interface Question {
  id: number;
  text: string;
  answerType: "likert" | "mcq" | "custom";
  marks: number; // For likert and custom types
  required: boolean;
  mcqOptions: MCQOption[]; // Only for MCQ type
}

interface CategoryData {
  title: string;
  questions: Question[];
}

interface AddCategoryOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryData) => void;
}

const AddCategoryOverlay: React.FC<AddCategoryOverlayProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  console.log("🎯 AddCategoryOverlay COMPONENT CREATED with visible:", visible);
  const [categoryTitle, setCategoryTitle] = React.useState<string>("");
  const [showCategoryDropdown, setShowCategoryDropdown] = React.useState(false);
  const [questions, setQuestions] = React.useState<Question[]>([
    {
      id: 1,
      text: "",
      answerType: "likert",
      mcqOptions: [],
      marks: 5,
      required: false,
    },
  ]);

  const handleSubmit = () => {
    // Basic validation
    if (!categoryTitle) {
      Alert.alert("Error", "Please select a category title");
      return;
    }

    const emptyQuestions = questions.filter((q) => !q.text.trim());
    if (emptyQuestions.length > 0) {
      Alert.alert("Error", "Please fill in all question texts");
      return;
    }

    // Validate marks for all questions
    const invalidMarks = questions.filter((q) => q.marks <= 0);
    if (invalidMarks.length > 0) {
      Alert.alert("Error", "All questions must have marks greater than 0");
      return;
    }

    // Validate MCQ questions
    const mcqQuestions = questions.filter((q) => q.answerType === "mcq");
    for (const mcq of mcqQuestions) {
      if (mcq.mcqOptions.length < 2) {
        Alert.alert(
          "Error",
          "Multiple choice questions must have at least 2 options"
        );
        return;
      }

      const emptyOptions = mcq.mcqOptions.filter((opt) => !opt.text.trim());
      if (emptyOptions.length > 0) {
        Alert.alert("Error", "All multiple choice options must have text");
        return;
      }

      const invalidOptionMarks = mcq.mcqOptions.filter((opt) => opt.marks < 0);
      if (invalidOptionMarks.length > 0) {
        Alert.alert(
          "Error",
          "All multiple choice options must have marks >= 0"
        );
        return;
      }
    }

    // Submit the data with proper formatting for backend
    onSubmit({
      title: categoryTitle,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text.trim(),
        answerType: q.answerType,
        marks: q.answerType === "mcq" ? 0 : q.marks, // MCQ marks are per option
        required: q.required,
        mcqOptions:
          q.answerType === "mcq"
            ? q.mcqOptions.map((opt) => ({
                id: opt.id,
                text: opt.text.trim(),
                marks: opt.marks,
              }))
            : [],
      })),
    });

    // Reset form
    setCategoryTitle("");
    setQuestions([
      {
        id: 1,
        text: "",
        answerType: "likert",
        mcqOptions: [],
        marks: 5,
        required: false,
      },
    ]);
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now(),
      text: "",
      answerType: "likert",
      mcqOptions: [],
      marks: 5,
      required: false,
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (questionId: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((q) => q.id !== questionId));
    }
  };

  const updateQuestion = (
    questionId: number,
    field: keyof Question,
    value: any
  ) => {
    setQuestions(
      questions.map((q) => (q.id === questionId ? { ...q, [field]: value } : q))
    );
  };

  const addMCQOption = (questionId: number) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const newOption: MCQOption = {
      id: Date.now(),
      text: "",
      marks: 1,
    };
    updateQuestion(questionId, "mcqOptions", [
      ...question.mcqOptions,
      newOption,
    ]);
  };

  const removeMCQOption = (questionId: number, optionId: number) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const updatedOptions = question.mcqOptions.filter(
      (opt) => opt.id !== optionId
    );
    updateQuestion(questionId, "mcqOptions", updatedOptions);
  };

  const updateMCQOption = (
    questionId: number,
    optionId: number,
    field: keyof MCQOption,
    value: any
  ) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const updatedOptions = question.mcqOptions.map((opt) =>
      opt.id === optionId ? { ...opt, [field]: value } : opt
    );
    updateQuestion(questionId, "mcqOptions", updatedOptions);
  };

  if (!visible) return null;

  return (
    <View style={styles.addCategoryOverlay}>
      <TouchableOpacity
        style={styles.addCategoryBackdrop}
        onPress={onClose}
        activeOpacity={1}
      />
      <View style={styles.addCategoryContent}>
        <ScrollView style={styles.addCategoryScrollView}>
          {/* Header */}
          <View style={styles.addCategoryHeader}>
            <Text style={styles.addCategoryTitle}>Add Category</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.addCategoryCloseButton}
            >
              <MaterialIcons name="close" size={24} color="#920734" />
            </TouchableOpacity>
          </View>

          {/* Category Title */}
          <View style={styles.addCategorySectionContainer}>
            <Text style={styles.addCategorySectionTitle}>Category Title</Text>
            <TouchableOpacity
              style={styles.addCategoryTitleInput}
              onPress={() => setShowCategoryDropdown(true)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  !categoryTitle && styles.placeholderText,
                ]}
              >
                {categoryTitle || "Select intelligence type..."}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* Questions Section */}
          <View style={styles.addCategorySectionContainer}>
            <View style={styles.addCategoryQuestionsHeader}>
              <Text style={styles.addCategorySectionTitle}>Questions</Text>
              <TouchableOpacity
                style={styles.addCategoryAddQuestionButton}
                onPress={addQuestion}
              >
                <MaterialIcons name="add" size={16} color="#920734" />
                <Text style={styles.addCategoryAddQuestionText}>
                  Add Question
                </Text>
              </TouchableOpacity>
            </View>

            {questions.map((question, index) => (
              <View
                key={question.id}
                style={styles.addCategoryQuestionContainer}
              >
                <View style={styles.addCategoryQuestionHeader}>
                  <Text style={styles.addCategoryQuestionLabel}>
                    Question {index + 1}
                  </Text>
                  {questions.length > 1 && (
                    <TouchableOpacity
                      style={styles.addCategoryRemoveQuestionButton}
                      onPress={() => removeQuestion(question.id)}
                    >
                      <MaterialIcons name="close" size={20} color="#F44336" />
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={styles.addCategoryQuestionInput}
                  placeholder="Enter your question..."
                  value={question.text}
                  onChangeText={(text) =>
                    updateQuestion(question.id, "text", text)
                  }
                  multiline
                />

                <Text style={styles.addCategoryAnswerTypeLabel}>
                  Answer Type
                </Text>
                <View style={styles.addCategoryAnswerTypeContainer}>
                  {(["likert", "mcq", "custom"] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.addCategoryAnswerTypeChip,
                        question.answerType === type &&
                          styles.addCategorySelectedAnswerType,
                      ]}
                      onPress={() => {
                        updateQuestion(question.id, "answerType", type);
                        // Reset marks based on answer type
                        if (type === "likert") {
                          updateQuestion(question.id, "marks", 5);
                        } else if (type === "custom") {
                          updateQuestion(question.id, "marks", 1);
                        }
                        // Clear MCQ options when switching away from MCQ
                        if (type !== "mcq") {
                          updateQuestion(question.id, "mcqOptions", []);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.addCategoryAnswerTypeText,
                          question.answerType === type &&
                            styles.addCategorySelectedAnswerTypeText,
                        ]}
                      >
                        {type === "likert"
                          ? "Likert Scale (1-5)"
                          : type === "mcq"
                            ? "Multiple Choice"
                            : "Custom Answer"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Marks Input for Likert and Custom types */}
                {(question.answerType === "likert" ||
                  question.answerType === "custom") && (
                  <View style={styles.addCategoryMarksContainer}>
                    <Text style={styles.addCategoryMarksLabel}>
                      Marks
                      {question.answerType === "likert"
                        ? " (for all scale points)"
                        : ""}
                      :
                    </Text>
                    <TextInput
                      style={styles.addCategoryMarksInput}
                      placeholder="Enter marks"
                      value={question.marks.toString()}
                      onChangeText={(text) => {
                        const marks = parseInt(text) || 1;
                        updateQuestion(question.id, "marks", marks);
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                )}

                {/* Likert Scale Preview */}
                {question.answerType === "likert" && (
                  <View style={styles.addCategoryLikertPreview}>
                    <Text style={styles.addCategoryPreviewLabel}>
                      Likert Scale Preview:
                    </Text>
                    <View style={styles.addCategoryLikertScale}>
                      {[
                        { value: 1, label: "Very Low" },
                        { value: 2, label: "Low" },
                        { value: 3, label: "Average" },
                        { value: 4, label: "High" },
                        { value: 5, label: "Very High" },
                      ].map((item) => (
                        <View
                          key={item.value}
                          style={styles.addCategoryLikertItem}
                        >
                          <View style={styles.addCategoryLikertCircle}>
                            <Text style={styles.addCategoryLikertNumber}>
                              {item.value}
                            </Text>
                          </View>
                          <Text style={styles.addCategoryLikertLabel}>
                            {item.label}
                          </Text>
                          <Text style={styles.addCategoryLikertMarks}>
                            ({question.marks} marks)
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* MCQ Options */}
                {question.answerType === "mcq" && (
                  <View style={styles.addCategoryMCQContainer}>
                    <View style={styles.addCategoryMCQHeader}>
                      <Text style={styles.addCategoryMCQLabel}>
                        Multiple Choice Options
                      </Text>
                      <TouchableOpacity
                        style={styles.addCategoryMCQAddButton}
                        onPress={() => addMCQOption(question.id)}
                      >
                        <MaterialIcons name="add" size={16} color="#920734" />
                        <Text style={styles.addCategoryMCQAddText}>
                          Add Option
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {question.mcqOptions.map((option, optionIndex) => (
                      <View
                        key={option.id}
                        style={styles.addCategoryMCQOptionContainer}
                      >
                        <View style={styles.addCategoryMCQOptionHeader}>
                          <Text style={styles.addCategoryMCQOptionLabel}>
                            Option {optionIndex + 1}
                          </Text>
                          {question.mcqOptions.length > 1 && (
                            <TouchableOpacity
                              style={styles.addCategoryMCQRemoveButton}
                              onPress={() =>
                                removeMCQOption(question.id, option.id)
                              }
                            >
                              <MaterialIcons
                                name="close"
                                size={16}
                                color="#F44336"
                              />
                            </TouchableOpacity>
                          )}
                        </View>

                        <TextInput
                          style={styles.addCategoryMCQOptionInput}
                          placeholder="Enter option text..."
                          value={option.text}
                          onChangeText={(text) =>
                            updateMCQOption(
                              question.id,
                              option.id,
                              "text",
                              text
                            )
                          }
                        />

                        <View style={styles.addCategoryMCQMarksContainer}>
                          <Text style={styles.addCategoryMCQMarksLabel}>
                            Marks:
                          </Text>
                          <TextInput
                            style={styles.addCategoryMCQMarksInput}
                            placeholder="0"
                            value={option.marks.toString()}
                            onChangeText={(text) => {
                              const marks = parseInt(text) || 0;
                              updateMCQOption(
                                question.id,
                                option.id,
                                "marks",
                                marks
                              );
                            }}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    ))}

                    {question.mcqOptions.length === 0 && (
                      <TouchableOpacity
                        style={styles.addCategoryMCQFirstOption}
                        onPress={() => addMCQOption(question.id)}
                      >
                        <MaterialIcons name="add" size={20} color="#920734" />
                        <Text style={styles.addCategoryMCQFirstOptionText}>
                          Add First Option
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Custom Answer Preview */}
                {question.answerType === "custom" && (
                  <View style={styles.addCategoryCustomPreview}>
                    <Text style={styles.addCategoryPreviewLabel}>
                      Custom Answer Preview:
                    </Text>
                    <TextInput
                      style={styles.addCategoryCustomAnswerPreview}
                      placeholder="Students will type their custom answer here..."
                      multiline
                      editable={false}
                    />
                    <Text style={styles.addCategoryCustomMarksInfo}>
                      Each custom answer will be awarded {question.marks} marks
                    </Text>
                  </View>
                )}

                {/* Required Toggle */}
                <TouchableOpacity
                  style={styles.addCategoryRequiredToggle}
                  onPress={() =>
                    updateQuestion(question.id, "required", !question.required)
                  }
                >
                  <MaterialIcons
                    name={
                      question.required
                        ? "check-box"
                        : "check-box-outline-blank"
                    }
                    size={20}
                    color={question.required ? "#920734" : "#999"}
                  />
                  <Text
                    style={[
                      styles.addCategoryRequiredLabel,
                      question.required &&
                        styles.addCategoryRequiredLabelActive,
                    ]}
                  >
                    Required field
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.addCategoryFooter}>
          <TouchableOpacity
            style={styles.addCategoryCancelButton}
            onPress={onClose}
          >
            <Text style={styles.addCategoryCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addCategorySubmitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.addCategorySubmitButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Dropdown Modal */}
      <Modal
        visible={showCategoryDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryDropdown(false)}
        >
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>Select Intelligence Type</Text>
            <ScrollView style={styles.dropdownList}>
              {INTELLIGENCE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.dropdownItem,
                    categoryTitle === type.label && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setCategoryTitle(type.label);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      categoryTitle === type.label &&
                        styles.dropdownItemTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                  {categoryTitle === type.label && (
                    <MaterialIcons name="check" size={20} color="#920734" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Evaluation Section Component with Animations
const EvaluationSection: React.FC<{
  feedbackItem: any;
  isExpanded: boolean;
  showAddEvaluationForm: string | null;
  onToggleAddEvaluationForm: (feedbackId: string) => void;
  onDeleteEvaluation: (evaluationId: number) => void;
  onDeleteFeedback: (feedbackId: string) => void;
  onSubmitEvaluation: (data: any) => void;
  isDeletingFeedback?: boolean;
  isDeletingEvaluation?: boolean;
}> = ({
  feedbackItem,
  isExpanded,
  showAddEvaluationForm,
  onToggleAddEvaluationForm,
  onDeleteEvaluation,
  onDeleteFeedback,
  onSubmitEvaluation,
  isDeletingFeedback = false,
  isDeletingEvaluation = false,
}) => {
  const animatedHeight = useSharedValue(0);
  const animatedOpacity = useSharedValue(0);

  const getEvaluationStatusColor = (evaluationTypeId: number) => {
    switch (evaluationTypeId) {
      case 1:
        return { background: "#FFF3E0", text: "#FF9800", border: "#FFB74D" }; // Under Observation
      case 2:
        return { background: "#E8F5E8", text: "#4CAF50", border: "#81C784" }; // Accept
      case 3:
        return { background: "#FFEBEE", text: "#F44336", border: "#E57373" }; // Decline
      case 4:
        return { background: "#E3F2FD", text: "#2196F3", border: "#64B5F6" }; // Aware Parents
      case 5:
        return { background: "#FFF8E1", text: "#FFC107", border: "#FFD54F" }; // Assigning to Counselor
      case 6:
        return { background: "#FCE4EC", text: "#E91E63", border: "#F48FB1" }; // Correction Required
      default:
        return { background: "#F5F5F5", text: "#757575", border: "#BDBDBD" }; // Default
    }
  };

  React.useEffect(() => {
    if (isExpanded) {
      animatedHeight.value = withTiming(300, { duration: 300 });
      animatedOpacity.value = withTiming(1, { duration: 300 });
    } else {
      animatedHeight.value = withTiming(0, { duration: 300 });
      animatedOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isExpanded, animatedHeight, animatedOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: animatedOpacity.value,
    overflow: "hidden",
  }));

  const evaluations = feedbackItem?.evaluations || [];

  return (
    <Animated.View style={[styles.evaluationSection, animatedStyle]}>
      <View style={styles.evaluationSectionContent}>
        {/* Student Info Header */}
        {/* <View style={styles.studentInfoHeader}>
          <Image
            source={{
              uri:
                feedbackItem.student?.profile_picture_url ||
                feedbackItem.profile_picture_url ||
                "https://via.placeholder.com/50",
            }}
            style={styles.studentAvatarSmall}
          />
          <View style={styles.studentDetailsHeader}>
            <Text style={styles.studentNameHeader}>
              {feedbackItem.student?.name ||
                feedbackItem.student_name ||
                "Unknown Student"}
            </Text>
            <Text style={styles.studentMetaHeader}>
              Grade:{" "}
              {feedbackItem.grade_level?.name ||
                feedbackItem.grade_name ||
                "N/A"}{" "}
              | ID:{" "}
              {feedbackItem.student?.id || feedbackItem.student_id || "N/A"}
            </Text>
            <Text style={styles.feedbackCategoryHeader}>
              {feedbackItem.category?.name ||
                feedbackItem.category_name ||
                "General Feedback"}
            </Text>
          </View>
        </View> */}

        {/* Evaluation Timeline */}
        <ScrollView
          style={styles.evaluationTimeline}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          <Text style={styles.timelineTitle}>Evaluation Timeline</Text>

          {evaluations.length > 0 ? (
            evaluations.map((evaluation: any, index: number) => {
              const colors = getEvaluationStatusColor(
                evaluation.edu_fd_evaluation_type_id
              );
              const isLast = index === evaluations.length - 1;

              return (
                <View key={evaluation.id || index} style={styles.timelineItem}>
                  {/* Status Badge with Parent Visibility */}
                  <View style={styles.statusBadgeContainer}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: colors.text }]}>
                        {evaluation.evaluation_type?.name ||
                          `Type ${evaluation.edu_fd_evaluation_type_id}`}
                      </Text>
                    </View>
                    {evaluation.is_parent_visible === 1 && (
                      <View style={styles.parentVisibleBadge}>
                        <MaterialIcons
                          name="visibility"
                          size={12}
                          color="#4CAF50"
                        />
                        <Text style={styles.parentVisibleText}>
                          Parent Visible
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Evaluation Content */}
                  <View
                    style={[
                      styles.timelineContent,
                      { borderLeftColor: colors.border },
                    ]}
                  >
                    <View style={styles.evaluationHeader}>
                      <Text style={styles.evaluationFeedbackText}>
                        {evaluation.reviewer_feedback || "No feedback provided"}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.deleteEvaluationButton,
                          isDeletingEvaluation && styles.disabledButton,
                        ]}
                        onPress={() => onDeleteEvaluation(evaluation.id)}
                        disabled={isDeletingEvaluation}
                      >
                        {isDeletingEvaluation ? (
                          <MaterialIcons
                            name="hourglass-empty"
                            size={18}
                            color="#999"
                          />
                        ) : (
                          <MaterialIcons
                            name="delete-outline"
                            size={18}
                            color="#F44336"
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.evaluationDateText}>
                      {evaluation.created_at
                        ? new Date(evaluation.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "Date not available"}
                    </Text>
                  </View>

                  {/* Timeline Connector */}
                  {!isLast && <View style={styles.timelineConnector} />}
                </View>
              );
            })
          ) : (
            <View style={styles.noEvaluationsState}>
              <MaterialIcons name="timeline" size={32} color="#DDD" />
              <Text style={styles.noEvaluationsTitle}>No Evaluations Yet</Text>
              <Text style={styles.noEvaluationsDesc}>
                This feedback item hasn't been evaluated yet.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Evaluation Timeline */}
      <ScrollView
        style={styles.evaluationTimeline}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        <Text style={styles.timelineTitle}>Evaluation Timeline</Text>

        {evaluations.length > 0 ? (
          evaluations.map((evaluation: any, index: number) => {
            const colors = getEvaluationStatusColor(
              evaluation.edu_fd_evaluation_type_id
            );
            const isLast = index === evaluations.length - 1;

            return (
              <View key={evaluation.id || index} style={styles.timelineItem}>
                {/* Status Badge with Parent Visibility */}
                <View style={styles.statusBadgeContainer}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: colors.text }]}>
                      {evaluation.evaluation_type?.name ||
                        `Type ${evaluation.edu_fd_evaluation_type_id}`}
                    </Text>
                  </View>
                  {evaluation.is_parent_visible === 1 && (
                    <View style={styles.parentVisibleBadge}>
                      <MaterialIcons
                        name="visibility"
                        size={12}
                        color="#4CAF50"
                      />
                      <Text style={styles.parentVisibleText}>
                        Parent Visible
                      </Text>
                    </View>
                  )}
                </View>

                {/* Evaluation Content */}
                <View
                  style={[
                    styles.timelineContent,
                    { borderLeftColor: colors.border },
                  ]}
                >
                  <View style={styles.evaluationHeader}>
                    <Text style={styles.evaluationFeedbackText}>
                      {evaluation.reviewer_feedback || "No feedback provided"}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteEvaluationButton}
                      onPress={() => onDeleteEvaluation(evaluation.id)}
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={18}
                        color="#F44336"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.evaluationDateText}>
                    {evaluation.created_at
                      ? new Date(evaluation.created_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "Date not available"}
                  </Text>
                </View>

                {/* Timeline Connector */}
                {!isLast && <View style={styles.timelineConnector} />}
              </View>
            );
          })
        ) : (
          <View style={styles.noEvaluationsState}>
            <MaterialIcons name="timeline" size={32} color="#DDD" />
            <Text style={styles.noEvaluationsTitle}>No Evaluations Yet</Text>
            <Text style={styles.noEvaluationsDesc}>
              This feedback item hasn't been evaluated yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
};

// Add Evaluation Form Component
const AddEvaluationForm: React.FC<{
  feedbackItem: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}> = ({ feedbackItem, onSubmit, onCancel }) => {
  const [selectedEvaluationType, setSelectedEvaluationType] =
    useState<number>(1);
  const [reviewerFeedback, setReviewerFeedback] = useState<string>("");
  const [isParentVisible, setIsParentVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const evaluationTypes = [
    { id: 1, name: "Under Observation", color: "#FF9800" },
    { id: 2, name: "Accept", color: "#4CAF50" },
    { id: 3, name: "Decline", color: "#F44336" },
    { id: 4, name: "Aware Parents", color: "#2196F3" },
    { id: 5, name: "Assigning to Counselor", color: "#FFC107" },
    { id: 6, name: "Correction Required", color: "#E91E63" },
  ];

  const handleSubmit = async () => {
    if (!reviewerFeedback.trim()) {
      Alert.alert("Validation Error", "Please provide reviewer feedback.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        edu_fb_id: feedbackItem.id,
        edu_fd_evaluation_type_id: selectedEvaluationType,
        reviewer_feedback: reviewerFeedback.trim(),
        is_parent_visible: isParentVisible,
      });
    } catch (error) {
      console.error("Failed to submit evaluation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Animated.View
      style={styles.addEvaluationForm}
      entering={SlideInDown}
      exiting={SlideOutDown}
    >
      <View style={styles.addEvaluationContent}>
        {/* Header */}
        <View style={styles.addEvaluationHeader}>
          <Text style={styles.addEvaluationTitle}>Add New Evaluation</Text>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <MaterialIcons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Evaluation Type Picker */}
        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Evaluation Type *</Text>
          <View style={styles.evaluationTypePicker}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {evaluationTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.evaluationTypeChip,
                    {
                      backgroundColor:
                        selectedEvaluationType === type.id
                          ? type.color
                          : "#F5F5F5",
                      borderColor: type.color,
                    },
                  ]}
                  onPress={() => setSelectedEvaluationType(type.id)}
                >
                  <Text
                    style={[
                      styles.evaluationTypeChipText,
                      {
                        color:
                          selectedEvaluationType === type.id
                            ? "#FFFFFF"
                            : type.color,
                      },
                    ]}
                  >
                    {type.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Reviewer Feedback */}
        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Reviewer Feedback *</Text>
          <TextInput
            style={styles.feedbackInput}
            multiline
            numberOfLines={4}
            placeholder="Enter detailed feedback about this student's performance..."
            value={reviewerFeedback}
            onChangeText={setReviewerFeedback}
            textAlignVertical="top"
          />
        </View>

        {/* Parent Visible Checkbox */}
        <View style={styles.formField}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setIsParentVisible(!isParentVisible)}
          >
            <View
              style={[
                styles.checkbox,
                isParentVisible && styles.checkboxChecked,
              ]}
            >
              {isParentVisible && (
                <MaterialIcons name="check" size={16} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              Make this evaluation visible to parents
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.formActions}>
          <TouchableOpacity
            style={styles.cancelFormButton}
            onPress={onCancel}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelFormButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitFormButton,
              isSubmitting && styles.submitFormButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="check" size={18} color="#FFFFFF" />
                <Text style={styles.submitFormButtonText}>Submit</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const EducatorFeedbackModal: React.FC<EducatorFeedbackModalProps> = ({
  visible = false,
  onClose,
}) => {
  // ===== ERROR BOUNDARY STATE =====
  const [hasError, setHasError] = React.useState(false);
  const [errorInfo, setErrorInfo] = React.useState<string>("");

  // ===== PROP VALIDATION =====
  // Add safety checks for props
  if (typeof visible !== "boolean") {
    console.warn(
      "⚠️ EducatorFeedbackModal: 'visible' prop should be boolean, received:",
      typeof visible,
      visible
    );
  }
  if (typeof onClose !== "function") {
    console.warn(
      "⚠️ EducatorFeedbackModal: 'onClose' prop should be function, received:",
      typeof onClose,
      onClose
    );
  }

  // ===== ERROR BOUNDARY EFFECT =====
  React.useEffect(() => {
    const handleError = (error: Error) => {
      console.error("🚨 EducatorFeedbackModal Error:", error);
      setHasError(true);
      setErrorInfo(error.message || "An unexpected error occurred");
    };

    // Reset error state when modal closes
    if (!visible) {
      setHasError(false);
      setErrorInfo("");
    }

    return () => {
      // Cleanup if needed
    };
  }, [visible]);

  // ===== COMPONENT LOGIC =====
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [selectedFilterGradeId, setSelectedFilterGradeId] = useState<
    number | null
  >(null); // null = "All Grades"
  const [selectedEvaluationType, setSelectedEvaluationType] = useState<
    number | null
  >(null); // Default to show all

  // Debounced search text for API calls
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  // Debounced filter values to reduce API calls
  const [debouncedFilterGradeId, setDebouncedFilterGradeId] = useState<
    number | null
  >(null);
  const [debouncedEvaluationType, setDebouncedEvaluationType] = useState<
    number | null
  >(null);

  // Debounce search input to avoid too many API calls
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchText]);

  // Debounce filter changes to reduce API calls
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilterGradeId(selectedFilterGradeId);
    }, 300); // 300ms delay for filters

    return () => clearTimeout(timer);
  }, [selectedFilterGradeId]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEvaluationType(selectedEvaluationType);
    }, 300); // 300ms delay for filters

    return () => clearTimeout(timer);
  }, [selectedEvaluationType]);

  // Expandable Card State
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Comment Edit State
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedComment, setEditedComment] = useState<string>("");

  // Evaluation Form State
  const [showAddEvaluationForm, setShowAddEvaluationForm] = useState<
    string | null
  >(null);

  // Add Feedback Modal States
  const [showAddFeedbackModal, setShowAddFeedbackModal] = useState(false);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [mainCategory, setMainCategory] = useState<string>("");
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(
    []
  );
  const [feedbackRating, setFeedbackRating] = useState(0);
  // Inline Add Category State
  const [showInlineCategoryForm, setShowInlineCategoryForm] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState<string>("");
  const [showInlineCategoryDropdown, setShowInlineCategoryDropdown] =
    useState(false);
  const [newCategoryQuestions, setNewCategoryQuestions] = useState<
    {
      text: string;
      answerType: string;
      mcqOptions?: { text: string; marks: number }[];
    }[]
  >([{ text: "", answerType: "likert", mcqOptions: [] }]);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // API Hooks for category management
  const [createFeedbackCategory, { isLoading: isCreatingCategoryAPI }] =
    useCreateFeedbackCategoryMutation();
  const [customCategories, setCustomCategories] = useState<
    {
      id: string;
      title: string;
      questions: {
        id: number;
        text: string;
        answerType: string;
        mcqOptions?: { id: number; text: string; marks: number }[];
        marks: number;
      }[];
    }[]
  >([]);

  // Debug state changes

  // Questionnaire States (inline display)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null
  );
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<{
    [key: string]: {
      answer: string | number | boolean;
      marks?: number;
      weight?: number;
      answerId?: number;
    };
  }>({});

  // Enhanced subcategory state management
  const [selectedAdditionalCategories, setSelectedAdditionalCategories] =
    useState<string[]>([]);

  // Enhanced answer change handler
  const handleEnhancedAnswerChange = (
    questionId: string,
    answer: any,
    marks?: number,
    weight?: number,
    answerId?: number
  ) => {
    setQuestionnaireAnswers((prev) => ({
      ...prev,
      [questionId]: {
        answer,
        marks,
        weight,
        answerId,
      },
    }));
  };

  // Refs for input focus
  const descriptionInputRef = useRef<TextInput>(null);

  // ===== API HOOKS =====

  // Get categories with questions from new API
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useGetCategoryListQuery();

  // Fallback to legacy API if new one fails
  const {
    data: legacyCategoriesData,
    isLoading: legacyCategoriesLoading,
    error: legacyCategoriesError,
  } = useGetFeedbackCategoriesWithQuestionsQuery();

  // Use static grades instead of API
  const availableGrades = GRADE_LEVELS;
  console.log("🎓 Using static grades:", availableGrades);

  // Early safety check for critical data
  const isInitialDataLoading = categoriesLoading;
  const hasInitialDataError = categoriesError;

  // Get selected grade name for display
  const selectedGradeName = React.useMemo(() => {
    if (!selectedGradeId) return null;
    const grade = availableGrades.find((g) => g.id === selectedGradeId);
    return grade ? grade.name : null;
  }, [selectedGradeId, availableGrades]);

  // Feedback submission mutation
  const [submitFeedback, { isLoading: isSubmitting }] =
    useSubmitEducatorFeedbackMutation();

  // Evaluation mutations
  const [addEvaluation, { isLoading: isAddingEvaluation }] =
    useAddEvaluationMutation();
  const [deleteEvaluation, { isLoading: isDeletingEvaluation }] =
    useDeleteEvaluationMutation();
  const [deleteFeedback, { isLoading: isDeletingFeedback }] =
    useDeleteFeedbackMutation();
  const [updateFeedback, { isLoading: isUpdatingFeedback }] =
    useUpdateEducatorFeedbackMutation();
  const [createComment, { isLoading: isCreatingComment }] =
    useCreateCommentMutation();

  // Note: created_by_designation will be sent as null, so no need for user data

  // Enhanced debugging for filter values
  const filterPayload = React.useMemo(() => {
    const payload = {
      page: currentPage,
      page_size: DEFAULT_PAGE_SIZE,
      filters: {
        search: debouncedSearchText,
        grade_filter: debouncedFilterGradeId || "", // Send grade ID or empty string for "All"
        evaluation_type_filter: debouncedEvaluationType,
        search_filter_list: [],
      },
    };

    console.log("🔍 FILTER DEBUG - Current Filter State:", {
      selectedFilterGradeId,
      debouncedFilterGradeId,
      selectedFilterGradeName: debouncedFilterGradeId
        ? getGradeNameById(debouncedFilterGradeId)
        : "All Grades",
      selectedEvaluationType,
      debouncedEvaluationType,
      debouncedSearchText,
      currentPage,
      filterPayload: payload,
      timestamp: new Date().toISOString(),
    });

    return payload;
  }, [
    currentPage,
    debouncedSearchText,
    debouncedFilterGradeId,
    debouncedEvaluationType,
  ]);

  // Get feedback list with filters
  const {
    data: feedbacksData,
    isLoading: feedbacksLoading,
    error: feedbacksError,
    refetch: refetchFeedbacks,
  } = useGetEducatorFeedbacksQuery(filterPayload);

  const itemsPerPage = DEFAULT_PAGE_SIZE;

  // Reset to page 1 when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchText, debouncedFilterGradeId, debouncedEvaluationType]);

  // Debug expanded card state changes
  React.useEffect(() => {
    console.log(
      "🔄 Expanded card state changed - expandedItemId:",
      expandedItemId
    );
  }, [expandedItemId]);

  // ===== DATA PROCESSING =====

  // Process categories data from API
  const mainCategories = React.useMemo(() => {
    console.log(
      "🔍 Processing categories - Raw categoriesData:",
      categoriesData
    );
    console.log("🔍 Legacy categoriesData:", legacyCategoriesData);

    // Handle different possible response structures
    let categoriesArray = [];

    // Try new API first
    if (categoriesData?.status === "successful" && categoriesData?.data) {
      categoriesArray = categoriesData.data;
      console.log("✅ Using new category list API");
    }
    // Fallback to legacy API
    else if (legacyCategoriesData?.data?.categories) {
      categoriesArray = legacyCategoriesData.data.categories;
      console.log("⚠️ Falling back to legacy categories API");
    } else if (
      legacyCategoriesData?.data &&
      Array.isArray(legacyCategoriesData.data)
    ) {
      categoriesArray = legacyCategoriesData.data;
      console.log("⚠️ Falling back to legacy categories API (direct array)");
    } else if (legacyCategoriesData?.categories) {
      categoriesArray = legacyCategoriesData.categories;
      console.log("⚠️ Falling back to legacy categories API (root level)");
    }

    if (categoriesArray.length === 0) {
      console.warn("⚠️ No categories found in any expected structure");
      return [];
    }

    const filteredCategories = categoriesArray.filter(
      (cat: any) => cat?.active !== false
    );
    console.log("✅ Filtered categories:", filteredCategories);
    return filteredCategories;
  }, [categoriesData, legacyCategoriesData]);

  // Process feedback data from API with enhanced debugging
  const existingFeedbacks = React.useMemo(() => {
    console.log("🔍 FILTER DEBUG - API Response Analysis:", {
      feedbacksData,
      hasData: !!feedbacksData?.data,
      dataKeys: feedbacksData?.data ? Object.keys(feedbacksData.data) : [],
      feedbacksArray:
        feedbacksData?.data?.feedbacks || feedbacksData?.data || [],
      feedbacksCount: (
        feedbacksData?.data?.feedbacks ||
        feedbacksData?.data ||
        []
      ).length,
      sampleFeedback: (feedbacksData?.data?.feedbacks ||
        feedbacksData?.data ||
        [])[0],
      timestamp: new Date().toISOString(),
    });

    if (!feedbacksData?.data) return [];
    // Handle new API response format
    const feedbacks = feedbacksData.data.feedbacks || feedbacksData.data || [];

    console.log("🔍 FILTER DEBUG - Processed Feedbacks:", {
      totalCount: feedbacks.length,
      firstFeedback: feedbacks[0],
      evaluationTypesFound: feedbacks
        .map((f: any) => f.evaluations?.[0]?.edu_fd_evaluation_type_id)
        .filter(Boolean),
      gradesFound: feedbacks
        .map((f: any) => f.grade_level?.name)
        .filter(Boolean),
    });

    return feedbacks;
  }, [feedbacksData]);
  // Debug logging for add feedback section
  console.log("🎓 Available Grades (static):", availableGrades?.length);
  console.log("🎯 Selected Grade ID:", selectedGradeId);
  console.log("🎯 Selected Grade Name:", selectedGradeName);
  console.log("📋 Main Categories (length):", mainCategories?.length);
  console.log("📤 Categories Data:", categoriesData);
  console.log("🔄 Categories Loading:", categoriesLoading);
  console.log("❌ Categories Error:", categoriesError || "No error");

  // ===== ERROR HANDLING METHODS =====

  const handleAPIError = React.useCallback((error: any, context: string) => {
    console.error(`❌ ${context} Error:`, error);

    // Log detailed error information for debugging
    if (error?.status) {
      console.error(`HTTP Status: ${error.status}`);
    }
    if (error?.data) {
      console.error(`Error Data:`, error.data);
    }
    if (error?.message) {
      console.error(`Error Message:`, error.message);
    }

    // Return user-friendly error message based on error type
    if (error?.status === 401) {
      return "Authentication expired. Please log in again.";
    } else if (error?.status === 403) {
      return "You don't have permission to access this data.";
    } else if (error?.status === 404) {
      return "The requested data was not found.";
    } else if (error?.status === 422) {
      return error?.data?.message || "Invalid data provided.";
    } else if (error?.status === 500) {
      return "Server error. Please try again later.";
    } else if (
      error?.message?.includes("network") ||
      error?.message?.includes("fetch")
    ) {
      return "Network error. Please check your connection.";
    } else {
      return (
        error?.data?.message ||
        error?.message ||
        "An unexpected error occurred."
      );
    }
  }, []);

  const handleDataProcessingError = React.useCallback(
    (data: any, context: string) => {
      console.warn(`⚠️ ${context} Data Processing Warning:`, data);

      // Log data structure for debugging
      console.warn(`Data type: ${typeof data}`);
      console.warn(`Data keys:`, Object.keys(data || {}));

      return `Data processing error in ${context}. Please refresh and try again.`;
    },
    []
  );

  const handleValidationError = React.useCallback(
    (field: string, value: any, rule: string) => {
      console.warn(
        `⚠️ Validation Error - Field: ${field}, Rule: ${rule}, Value:`,
        value
      );
      return `${field} ${rule}`;
    },
    []
  );

  const handleRetryableAction = React.useCallback(
    async (
      action: () => Promise<any>,
      maxRetries: number = 3,
      context: string = "Action"
    ) => {
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 ${context} attempt ${attempt}/${maxRetries}`);
          const result = await action();
          console.log(`✅ ${context} succeeded on attempt ${attempt}`);
          return result;
        } catch (error) {
          lastError = error;
          console.warn(`❌ ${context} failed on attempt ${attempt}:`, error);

          // Don't retry on certain errors
          if (
            error?.status === 401 ||
            error?.status === 403 ||
            error?.status === 404
          ) {
            console.log(
              `🚫 Not retrying ${context} due to error status: ${error.status}`
            );
            break;
          }

          // Wait before retrying (exponential backoff)
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      console.error(`❌ ${context} failed after ${maxRetries} attempts`);
      throw lastError;
    },
    []
  );

  // ===== ERROR STATE CHECKS =====

  const hasDataLoadingErrors = React.useMemo(() => {
    return !!(categoriesError || feedbacksError);
  }, [categoriesError, feedbacksError]);

  const getErrorMessage = React.useCallback(() => {
    if (categoriesError) {
      return handleAPIError(categoriesError, "Categories");
    }
    if (feedbacksError) {
      return handleAPIError(feedbacksError, "Feedback");
    }
    return "Unknown error occurred";
  }, [categoriesError, feedbacksError, handleAPIError]);

  const shouldShowErrorState = React.useMemo(() => {
    // Show error state only if there are critical errors and no data available
    return (
      hasDataLoadingErrors && (!mainCategories || mainCategories.length === 0)
    );
  }, [hasDataLoadingErrors, mainCategories]);

  // Get real category data from API
  const selectedCategoryData = React.useMemo(() => {
    return mainCategories.find((cat: any) => cat.name === mainCategory);
  }, [mainCategories, mainCategory]);

  const questionnaireData = React.useMemo(() => {
    return selectedCategoryData?.questions || [];
  }, [selectedCategoryData]);

  // Answer types
  const ANSWER_TYPES = {
    SCALE: "scale", // 1-5 range with labels
    PREDEFINED: "predefined", // List of answers with marks
    CUSTOM: "custom", // Text input, no marks
  };

  // Scale labels for 1-5 rating
  const SCALE_LABELS = {
    1: "Very Low",
    2: "Low",
    3: "Average",
    4: "High",
    5: "Very High",
  };

  // Note: questionnaireData is now provided by API integration above
  // Keeping ANSWER_TYPES and SCALE_LABELS for compatibility

  // Pagination info from API
  const paginationInfo = React.useMemo(() => {
    return (
      feedbacksData?.data?.pagination ||
      feedbacksData?.pagination || {
        current_page: 1,
        total_pages: 1,
        total_count: existingFeedbacks.length,
        page_size: DEFAULT_PAGE_SIZE,
        has_next: false,
        has_previous: false,
      }
    );
  }, [feedbacksData, existingFeedbacks.length]);

  // Create grades list for filter - include "All" option plus all grade levels
  const filterGradesOptions = React.useMemo(() => {
    return [
      { id: null, name: "All Grades", display_name: "All Grades" },
      ...availableGrades,
    ];
  }, [availableGrades]);

  // Evaluation Types with IDs as requested
  const evaluationTypes = [
    { id: null, name: "All Evaluations" },
    { id: 1, name: "Under Observation" },
    { id: 2, name: "Accept" },
    { id: 3, name: "Decline" },
    { id: 4, name: "Aware Parents" },
    { id: 5, name: "Assigning to Counselor" },
    { id: 6, name: "Correction Required" },
  ];
  // Create categories list from API data for picker
  const baseCategories = React.useMemo(() => {
    const categoryNames = mainCategories
      .map((cat: any) => cat.name)
      .filter(Boolean);
    return ["All", ...categoryNames];
  }, [mainCategories]);

  // Combine base categories with custom categories
  const categories = [
    ...baseCategories,
    ...customCategories.map((cat) => cat.title),
  ];
  const ratings = ["All", "5 Stars", "4 Stars", "3 Stars", "2 Stars", "1 Star"];
  const educators = [
    "All",
    "Ms. Sarah Johnson",
    "Mr. David Wilson",
    "Dr. Lisa Anderson",
    "Ms. Rachel Green",
    "Mr. Robert Clark",
    "Ms. Jennifer Lee",
    "Teacher 1",
    "Teacher 2",
    "Teacher 3",
  ];

  // Main Categories from API (combine with custom categories)
  const allMainCategories = React.useMemo(() => {
    const apiCategoryNames = mainCategories
      .map((cat: any) => cat.name)
      .filter(Boolean);
    const customCategoryNames = customCategories.map((cat) => cat.title);
    return [...apiCategoryNames, ...customCategoryNames];
  }, [mainCategories, customCategories]);

  // Create subcategories from API data
  const baseSubcategoriesByMainCategory = React.useMemo(() => {
    const result: { [key: string]: string[] } = {};

    // Add subcategories from API data
    mainCategories.forEach((category: any) => {
      if (category.subcategories && Array.isArray(category.subcategories)) {
        result[category.name] = category.subcategories.map(
          (sub: any) => sub.name
        );
      } else {
        result[category.name] = [];
      }
    });

    return result;
  }, [mainCategories]);

  // Fallback hardcoded subcategories (for development/testing)
  const fallbackSubcategories: { [key: string]: string[] } = {
    "Academic Performance": [
      "Mathematics",
      "English Language",
      "Science",
      "History",
      "Geography",
      "Problem Solving",
      "Critical Thinking",
      "Research Skills",
    ],
    "Behavioral Development": [
      "Classroom Behavior",
      "Attendance & Punctuality",
      "Following Instructions",
      "Responsibility",
      "Self-Discipline",
      "Respect for Others",
      "Honesty & Integrity",
    ],
    "Social Skills": [
      "Communication",
      "Teamwork",
      "Collaboration",
      "Peer Interaction",
      "Conflict Resolution",
      "Empathy",
      "Cultural Awareness",
    ],
    "Creative Arts": [
      "Visual Arts",
      "Music",
      "Drama & Theater",
      "Creative Writing",
      "Design Thinking",
      "Innovation",
      "Artistic Expression",
    ],
    "Physical Development": [
      "Sports & Athletics",
      "Physical Fitness",
      "Motor Skills",
      "Health Awareness",
      "Outdoor Activities",
      "Coordination",
      "Stamina & Endurance",
    ],
    "Leadership Qualities": [
      "Initiative Taking",
      "Decision Making",
      "Mentoring Others",
      "Public Speaking",
      "Project Management",
      "Delegation",
      "Motivation & Inspiration",
    ],
  };

  // Add custom categories and their questions as subcategories
  const customSubcategories: { [key: string]: string[] } = {};
  customCategories.forEach((category) => {
    customSubcategories[category.title] = category.questions.map(
      (q) => q.text || `Question ${q.id}`
    );
  });

  // Combine API subcategories with custom subcategories
  const subcategoriesByMainCategory = React.useMemo(() => {
    return {
      ...baseSubcategoriesByMainCategory,
      ...fallbackSubcategories,
      ...customSubcategories,
    };
  }, [baseSubcategoriesByMainCategory, customSubcategories]);

  // 🚨 TEMPORARY: Apply frontend filtering for grades and evaluation types (remove once backend implements both)
  //
  // BACKEND TEAM: Once you implement both grade_filter and evaluation_type_filter in the API endpoints,
  // this entire filteredData logic can be simplified to just:
  // const filteredData = existingFeedbacks.filter((item) => !item || !item.student ? false : true);
  //
  // Current implementation does client-side filtering for both grades and evaluation types as fallback
  const filteredData = existingFeedbacks.filter((item) => {
    // Safety check - ensure item exists and has required structure
    if (!item || !item.student) {
      console.warn("⚠️ Invalid feedback item found, filtering out:", item);
      return false;
    }

    // Apply grade filter if selected (frontend fallback until backend implements it)
    if (selectedFilterGradeId !== null) {
      const itemGradeId = item.grade_level?.id || item.grade_level_id;
      if (itemGradeId !== selectedFilterGradeId) {
        console.log("🔍 FILTER DEBUG - Filtering out feedback due to grade:", {
          feedbackId: item.id,
          selectedFilterGradeId,
          itemGradeId,
          itemGradeName: item.grade_level?.name,
        });
        return false;
      }
    }

    // Apply evaluation type filter if selected
    if (selectedEvaluationType !== null) {
      const hasMatchingEvaluation = item.evaluations?.some(
        (evaluation: any) => {
          return (
            evaluation.is_active === true &&
            evaluation.edu_fd_evaluation_type_id === selectedEvaluationType
          );
        }
      );

      if (!hasMatchingEvaluation) {
        console.log(
          "🔍 FILTER DEBUG - Filtering out feedback due to evaluation type:",
          {
            feedbackId: item.id,
            selectedEvaluationType,
            availableEvaluations: item.evaluations?.map((e: any) => ({
              id: e.edu_fd_evaluation_type_id,
              isActive: e.is_active,
            })),
          }
        );
        return false;
      }
    }

    return true;
  });

  // Final result debugging
  React.useEffect(() => {
    console.log("🔍 FILTER DEBUG - Final Results:", {
      originalCount: existingFeedbacks.length,
      filteredCount: filteredData.length,
      activeFilters: {
        grade: selectedFilterGradeId
          ? `Grade ID ${selectedFilterGradeId} (${getGradeNameById(selectedFilterGradeId)})`
          : "All Grades",
        evaluationType: selectedEvaluationType
          ? `Evaluation Type ${selectedEvaluationType}`
          : "All Evaluations",
      },
      paginationInfo,
      sampleFilteredItems: filteredData.slice(0, 3).map((item: any) => ({
        id: item.id,
        gradeId: item.grade_level?.id || item.grade_level_id,
        gradeName: item.grade_level?.name,
        evaluationTypes: item.evaluations
          ?.map((e: any) => e.edu_fd_evaluation_type_id)
          .filter(Boolean),
      })),
      timestamp: new Date().toISOString(),
    });
  }, [
    filteredData.length,
    existingFeedbacks.length,
    selectedFilterGradeId,
    selectedEvaluationType,
    paginationInfo,
  ]);

  // Server-side pagination - use filtered data
  const paginatedData = filteredData; // Combined server + client filtering
  const totalPages = paginationInfo.total_pages;

  const handleActionPress = (feedbackItem: any) => {
    console.log("🎯 handleActionPress called for item:", feedbackItem.id);

    // Configure layout animation for smooth expansion
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Toggle expansion: if same item is clicked, collapse it; otherwise expand new item
    if (expandedItemId === feedbackItem.id) {
      setExpandedItemId(null);
      console.log("📊 Collapsing item:", feedbackItem.id);
    } else {
      setExpandedItemId(feedbackItem.id);
      console.log("📊 Expanding item:", feedbackItem.id);
    }
  };

  // Evaluation Management Handlers
  const handleToggleAddEvaluationForm = (feedbackId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAddEvaluationForm(
      showAddEvaluationForm === feedbackId ? null : feedbackId
    );
  };

  const handleDeleteEvaluation = async (evaluationId: number) => {
    Alert.alert(
      "Delete Evaluation",
      "Are you sure you want to delete this evaluation? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("🗑️ Deleting evaluation with ID:", evaluationId);
              const result = await deleteEvaluation(evaluationId).unwrap();
              console.log("✅ Evaluation deleted successfully:", result);

              // Force refetch to update the UI immediately
              refetchFeedbacks();

              Alert.alert("Success", "Evaluation deleted successfully.", [
                { text: "OK" },
              ]);
            } catch (error) {
              console.error("❌ Failed to delete evaluation:", error);
              Alert.alert(
                "Error",
                "Failed to delete evaluation. Please try again.",
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    console.log("🗑️ Delete feedback called with ID:", feedbackId);
    console.log("🗑️ Feedback ID type:", typeof feedbackId);

    Alert.alert(
      "Delete Feedback",
      "Are you sure you want to delete this entire feedback? This will permanently remove the feedback and all its evaluations. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log(
                "🚀 Sending delete request for feedback ID:",
                feedbackId
              );
              await deleteFeedback(feedbackId).unwrap();
              console.log("✅ Feedback deleted successfully");

              // Immediately refresh the feedback list
              refetchFeedbacks();

              // Close the expanded item if it was the one being deleted
              if (expandedItemId === feedbackId) {
                setExpandedItemId(null);
              }

              // Show success message
              Alert.alert(
                "Success",
                "Feedback has been deleted successfully.",
                [{ text: "OK" }]
              );
            } catch (error) {
              console.error("❌ Failed to delete feedback:", error);
              Alert.alert(
                "Error",
                "Failed to delete feedback. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleSubmitEvaluation = async (evaluationData: {
    edu_fb_id: number;
    edu_fd_evaluation_type_id: number;
    reviewer_feedback: string;
    is_parent_visible: boolean;
  }) => {
    try {
      console.log("🚀 Submitting evaluation with data:", evaluationData);
      await addEvaluation(evaluationData).unwrap();
      console.log("✅ Evaluation added successfully");

      // Immediately refresh the feedback list to show new evaluation
      refetchFeedbacks();

      // Close the form (the form component will handle its own state reset)
      setShowAddEvaluationForm(null);

      Alert.alert("Success", "Evaluation added successfully!");
    } catch (error) {
      console.error("❌ Failed to add evaluation:", error);
      Alert.alert("Error", "Failed to add evaluation. Please try again.");
    }
  };

  // Comment Edit Handlers
  const handleEditComment = (feedbackId: string, currentComment: string) => {
    setEditingCommentId(feedbackId);
    setEditedComment(currentComment);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditedComment("");
  };

  const handleSaveComment = async (feedbackId: string) => {
    if (!editedComment.trim()) {
      Alert.alert("Error", "Comment cannot be empty.");
      return;
    }

    try {
      console.log("💬 Creating comment for feedback ID:", feedbackId);
      await createComment({
        edu_fb_id: feedbackId,
        comment: editedComment.trim(),
      }).unwrap();

      console.log("✅ Comment updated successfully");

      // Refresh the feedback list to show updated comment
      refetchFeedbacks();

      // Exit edit mode
      setEditingCommentId(null);
      setEditedComment("");

      Alert.alert("Success", "Comment updated successfully!");
    } catch (error) {
      console.error("❌ Failed to update comment:", error);
      Alert.alert("Error", "Failed to update comment. Please try again.");
    }
  };

  const handleAddFeedback = () => {
    setShowAddFeedbackModal(true);
  };

  // Utility function for evaluation status colors
  const getEvaluationStatusColor = (evaluationTypeId: number) => {
    switch (evaluationTypeId) {
      case 1: // Under Observation
        return { background: "#FFF3E0", text: "#FF9800", border: "#FFB74D" };
      case 2: // Accept
        return { background: "#E8F5E8", text: "#4CAF50", border: "#81C784" };
      case 3: // Decline
        return { background: "#FFEBEE", text: "#F44336", border: "#E57373" };
      case 4: // Aware Parents
        return { background: "#E3F2FD", text: "#2196F3", border: "#64B5F6" };
      case 5: // Assigning to Counselor
        return { background: "#F3E5F5", text: "#9C27B0", border: "#BA68C8" };
      case 6: // Correction Required
        return { background: "#FBE9E7", text: "#FF5722", border: "#FF8A65" };
      default:
        return { background: "#F5F5F5", text: "#666666", border: "#BDBDBD" };
    }
  };

  const handleMainCategorySelect = (category: string) => {
    setMainCategory(category);
    setQuestionnaireAnswers({});
    setSelectedQuestionId(null);
    setFeedbackRating(0);
  };

  // Helper function to get used marks for a specific question
  const getUsedMarks = (questionIndex: number, excludeOptionIndex?: number) => {
    const question = newCategoryQuestions[questionIndex];
    if (!question.mcqOptions) return [];

    return question.mcqOptions
      .filter((_, index) => index !== excludeOptionIndex)
      .map((option) => option.marks);
  };

  const handleCreateInlineCategory = async () => {
    // Validation
    if (!newCategoryTitle) {
      Alert.alert("Error", "Please select a category title");
      return;
    }

    const validQuestions = newCategoryQuestions.filter((q) => q.text.trim());
    if (validQuestions.length === 0) {
      Alert.alert("Error", "Please add at least one question");
      return;
    }

    // Validate MCQ questions
    for (let i = 0; i < validQuestions.length; i++) {
      const question = validQuestions[i];
      if (question.answerType === "mcq") {
        // Check if MCQ has options
        if (!question.mcqOptions || question.mcqOptions.length === 0) {
          Alert.alert(
            "Error",
            `MCQ question "${question.text}" must have at least one option`
          );
          return;
        }

        // Check if all MCQ options have text
        const emptyOptions = question.mcqOptions.filter(
          (opt) => !opt.text.trim()
        );
        if (emptyOptions.length > 0) {
          Alert.alert(
            "Error",
            `All MCQ options for question "${question.text}" must have text`
          );
          return;
        }

        // Check if all MCQ options have valid marks (1-5)
        const invalidMarks = question.mcqOptions.filter(
          (opt) => opt.marks < 1 || opt.marks > 5
        );
        if (invalidMarks.length > 0) {
          Alert.alert(
            "Error",
            `All MCQ options for question "${question.text}" must have marks between 1 and 5`
          );
          return;
        }

        // Check for duplicate marks
        const marks = question.mcqOptions.map((opt) => opt.marks);
        const uniqueMarks = [...new Set(marks)];
        if (marks.length !== uniqueMarks.length) {
          Alert.alert(
            "Error",
            `MCQ options for question "${question.text}" cannot have duplicate marks. Each option must have a unique mark value.`
          );
          return;
        }
      }
    }

    setIsCreatingCategory(true);

    try {
      // Prepare data for API
      const categoryData = {
        title: newCategoryTitle,
        questions: validQuestions.map((q, index) => {
          // Map answer types to IDs
          let answerTypeId;
          switch (q.answerType) {
            case "likert":
              answerTypeId = 1;
              break;
            case "mcq":
              answerTypeId = 2;
              break;
            case "custom":
              answerTypeId = 3;
              break;
            default:
              answerTypeId = 1; // Default to Likert Scale
          }

          const questionData: any = {
            text: q.text.trim(),
            answerType: q.answerType, // Keep string for backend compatibility
            answerTypeId: answerTypeId, // Add numeric ID
            marks: 1,
            required: index === 0, // First question is required
          };

          // Add MCQ options if it's an MCQ question
          if (
            q.answerType === "mcq" &&
            q.mcqOptions &&
            q.mcqOptions.length > 0
          ) {
            questionData.mcqOptions = q.mcqOptions
              .filter((opt) => opt.text.trim()) // Only include options with text
              .map((opt) => ({
                text: opt.text.trim(),
                marks: opt.marks,
              }));
          }

          return questionData;
        }),
      };

      console.log("📤 Creating inline category:", categoryData);

      // Call API
      const result = await createFeedbackCategory(categoryData).unwrap();
      console.log("✅ Category created successfully:", result);

      // Add to custom categories for immediate UI update
      const newCategory = {
        id: result.data?.category?.id || Date.now().toString(),
        title: newCategoryTitle,
        questions: validQuestions,
      };
      setCustomCategories((prev) => [...prev, newCategory]);

      // Auto-select the new category
      setMainCategory(newCategoryTitle);
      setQuestionnaireAnswers({});
      setSelectedQuestionId(null);
      setFeedbackRating(0);

      // Reset form and close
      setNewCategoryTitle("");
      setNewCategoryQuestions([
        { text: "", answerType: "likert", mcqOptions: [] },
      ]);
      setShowInlineCategoryForm(false);

      Alert.alert(
        "Success",
        `Category "${newCategoryTitle}" created successfully! It has been automatically selected as your main category.`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("❌ Failed to create category:", error);

      let errorMessage = "Failed to create category. Please try again.";
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleQuestionClick = (questionId: string) => {
    setSelectedQuestionId(
      selectedQuestionId === questionId ? null : questionId
    );
  };

  const handleQuestionAnswer = (
    questionId: string,
    answer: any,
    marks?: number,
    weight?: number,
    answerId?: number
  ) => {
    console.log("🎯 Answer Handler Called:", {
      questionId,
      answer,
      marks,
      weight,
      answerId,
    });

    setQuestionnaireAnswers((prev) => ({
      ...prev,
      [questionId]: { answer, marks, weight, answerId },
    }));

    // Calculate and update rating after each answer with proper 1-5 scale
    const updatedAnswers = {
      ...questionnaireAnswers,
      [questionId]: { answer, marks, weight, answerId },
    };
    const answers = Object.values(updatedAnswers);
    const validAnswers = answers.filter(
      (answer) => answer.marks !== undefined && answer.marks > 0
    );

    if (validAnswers.length > 0) {
      console.log("🔢 Rating Calculation Debug:", {
        validAnswers: validAnswers.map((a) => ({
          answer: a.answer,
          marks: a.marks,
          weight: a.weight,
        })),
        totalAnswers: validAnswers.length,
      });

      const totalMarks = validAnswers.reduce(
        (sum, answer) => sum + (answer.marks || 0),
        0
      );

      // Calculate average and ensure it's within 1-5 bounds
      let averageRating = totalMarks / validAnswers.length;

      // Normalize to 1-5 scale: ensure minimum is 1, maximum is 5
      averageRating = Math.max(1, Math.min(5, averageRating));

      // Round to 1 decimal place
      const finalRating = Math.round(averageRating * 10) / 10;

      console.log("📊 Final Rating Calculation:", {
        totalMarks,
        validAnswersCount: validAnswers.length,
        rawAverage: totalMarks / validAnswers.length,
        boundedAverage: averageRating,
        finalRating,
      });

      setFeedbackRating(finalRating);
    } else {
      // Reset rating if no valid answers
      setFeedbackRating(0);
    }
  };

  const handleSubcategoryToggle = (subcategory: string) => {
    if (selectedSubcategories.includes(subcategory)) {
      // Remove subcategory
      setSelectedSubcategories(
        selectedSubcategories.filter((sub) => sub !== subcategory)
      );
    } else {
      // Add subcategory (max 5)
      if (selectedSubcategories.length < 5) {
        setSelectedSubcategories([...selectedSubcategories, subcategory]);
      } else {
        Alert.alert(
          "Maximum Limit",
          "You can select up to 5 subcategories only."
        );
      }
    }
  };

  const handleClearMainCategory = () => {
    Alert.alert(
      "Clear Main Category",
      "This will remove the main category and all selected subcategories. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            setMainCategory("");
            setSelectedSubcategories([]);
          },
        },
      ]
    );
  };

  const isFormValid = () => {
    return (
      selectedGradeId &&
      selectedStudent &&
      mainCategory &&
      feedbackDescription.trim()
    );
  };

  const handleDescriptionFocus = () => {
    // Focus the description input and show keyboard
    if (descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  };

  const handleSubmitFeedback = async () => {
    // Comprehensive validation
    const missingFields = [];
    const warnings = [];

    // Required field validation
    if (!selectedGradeId) {
      missingFields.push("• Grade selection");
    }

    if (!selectedStudent) {
      missingFields.push("• Student selection");
    }

    if (!mainCategory) {
      missingFields.push("• Main category selection");
    }

    if (!feedbackDescription.trim()) {
      missingFields.push("• Description");
    } else if (feedbackDescription.trim().length < 10) {
      warnings.push("• Description is very short (less than 10 characters)");
    }

    // Check if questionnaire has required questions
    const requiredQuestions = questionnaireData.filter((q: any) => q.required);
    const answeredRequiredQuestions = requiredQuestions.filter(
      (q: any) => questionnaireAnswers[q.id]
    );

    if (
      requiredQuestions.length > 0 &&
      answeredRequiredQuestions.length < requiredQuestions.length
    ) {
      const unansweredCount =
        requiredQuestions.length - answeredRequiredQuestions.length;
      missingFields.push(
        `• ${unansweredCount} required questionnaire question(s)`
      );
    }

    // Show validation errors
    if (missingFields.length > 0) {
      const warningText =
        warnings.length > 0 ? `\n\nWarnings:\n${warnings.join("\n")}` : "";
      Alert.alert(
        "Required Fields Missing",
        `Please complete the following required fields:\n\n${missingFields.join("\n")}${warningText}\n\nNote: Subcategories are optional.`
      );
      return;
    }

    // Show warnings (non-blocking)
    if (warnings.length > 0) {
      Alert.alert(
        "Review Your Input",
        `${warnings.join("\n")}\n\nDo you want to continue submitting?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Submit Anyway", onPress: () => performSubmission() },
        ]
      );
      return;
    }

    await performSubmission();
  };

  const performSubmission = async () => {
    try {
      // Use retryable action for better reliability
      const result = await handleRetryableAction(
        async () => {
          // Get category ID from selected category
          const selectedCategoryData = mainCategories.find(
            (cat: any) => cat.name === mainCategory
          );
          const categoryId = selectedCategoryData?.id;

          if (!categoryId) {
            throw new Error(
              "Category ID not found. Please select a valid category."
            );
          }

          // Additional validation for required backend fields
          if (!selectedGradeId) {
            throw new Error(
              "Grade level ID is required for backend submission."
            );
          }

          if (!selectedStudent?.id) {
            throw new Error("Student ID is required for backend submission.");
          }

          // Set user designation as null as requested
          const userDesignation = null;

          // Transform questionnaireAnswers to backend format
          const question_answers = Object.entries(questionnaireAnswers).map(
            ([questionId, answerData]) => ({
              edu_fb_predefined_question_id: parseInt(questionId),
              edu_fb_predefined_answer_id: answerData.answerId || null,
              selected_predefined_answer_id: answerData.answerId || null,
              answer_mark: answerData.marks || 0,
            })
          );

          // Transform subcategories to backend format
          const subcategories_formatted = selectedSubcategories.map(
            (subcategoryName) => ({
              subcategory_name: subcategoryName,
            })
          );

          // Prepare data for API submission in backend format
          const feedbackData = {
            student_id: selectedStudent.id,
            grade_level_id: selectedGradeId,
            grade_level_class_id: selectedGradeId, // Same as grade_level_id as requested
            edu_fb_category_id: categoryId,
            rating: feedbackRating || null,
            created_by_designation: userDesignation,
            comments: feedbackDescription.trim() || null,
            question_answers: question_answers,
            subcategories: subcategories_formatted,
          };

          console.log("🚀 Submitting feedback to API (Backend Format):", {
            ...feedbackData,
            debug_info: {
              original_student_name: selectedStudent.name,
              original_category_name: mainCategory,
              original_grade_name: selectedGradeName,
              original_subcategories: selectedSubcategories,
              original_questionnaire_answers: questionnaireAnswers,
              transformed_question_answers_count: question_answers.length,
              transformed_subcategories_count: subcategories_formatted.length,
            },
          });

          // Submit to API with loading state - handle response directly instead of unwrap()
          const apiResponse = await submitFeedback(feedbackData);

          console.log("🔍 RAW API Response (before unwrap):", {
            apiResponse,
            error: apiResponse.error,
            data: apiResponse.data,
            isSuccess: "data" in apiResponse,
            isError: "error" in apiResponse,
          });

          // Handle both success and error cases manually
          if (apiResponse.error) {
            console.error("❌ API returned error response:", apiResponse.error);
            throw apiResponse.error;
          }

          // Return the successful data
          return apiResponse.data;
        },
        2,
        "Feedback Submission"
      );

      console.log("✅ Feedback submitted successfully:", result);

      // Show simple success message
      Alert.alert("Feedback Saved Successfully!", "", [
        { text: "OK", onPress: resetForm },
      ]);
    } catch (error) {
      console.error("❌ DETAILED Failed to submit feedback:", {
        error: error,
        errorMessage: error?.message,
        errorStatus: error?.status,
        errorData: error?.data,
        errorStack: error?.stack,
        originalError: error?.originalStatus,
        timestamp: new Date().toISOString(),
      });

      // Use centralized error handling
      const errorMessage = handleAPIError(error, "Feedback Submission");

      // Determine error title based on error type
      let errorTitle = "Submission Failed";
      if (error?.status === 401) errorTitle = "Authentication Error";
      else if (error?.status === 403) errorTitle = "Permission Denied";
      else if (error?.status === 404) errorTitle = "Not Found";
      else if (error?.status === 422) errorTitle = "Validation Error";
      else if (error?.status === 500) errorTitle = "Server Error";
      else if (error?.message?.includes("network"))
        errorTitle = "Network Error";

      // Show error with conditional retry option
      const showRetry =
        error?.status !== 401 && error?.status !== 403 && error?.status !== 404;

      Alert.alert(
        errorTitle,
        errorMessage,
        showRetry
          ? [
              { text: "Cancel", style: "cancel" },
              { text: "Retry", onPress: () => performSubmission() },
            ]
          : [{ text: "OK" }]
      );
    }
  };

  const resetForm = () => {
    setSelectedGradeId(null);
    setSelectedStudent(null);
    setFeedbackDescription("");
    setMainCategory("");
    setSelectedSubcategories([]);
    setFeedbackRating(0);
    setQuestionnaireAnswers({});
    setSelectedQuestionId(null);
    setShowAddFeedbackModal(false);
  };

  // Pagination handlers
  const handleNextPage = () => {
    if (paginationInfo.has_next) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (paginationInfo.has_previous) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= paginationInfo.total_pages) {
      setCurrentPage(page);
    }
  };

  const handleAddCategory = async (categoryData: any) => {
    console.log("✅ New category data from main modal:", categoryData);

    try {
      // Call the API to create the category
      const result = await createFeedbackCategory(categoryData).unwrap();
      console.log("✅ Category created successfully via main modal:", result);

      Alert.alert(
        "Category Created!",
        `Category "${categoryData.title}" with ${categoryData.questions.length} questions has been created successfully!`,
        [{ text: "OK" }]
      );

      // Close the modal
      setShowAddCategoryPopup(false);
    } catch (error: any) {
      console.error("❌ Failed to create category via main modal:", error);

      let errorMessage = "Failed to create category. Please try again.";
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    }
  };

  const renderStarRating = (
    rating: number,
    onRatingPress?: (rating: number) => void
  ) => {
    return Array.from({ length: 5 }, (_, index) => (
      <TouchableOpacity
        key={index}
        onPress={() => onRatingPress && onRatingPress(index + 1)}
        disabled={!onRatingPress}
      >
        <MaterialIcons
          name={index < rating ? "star" : "star-border"}
          size={onRatingPress ? 24 : 16}
          color={index < rating ? "#FFD700" : "#E0E0E0"}
        />
      </TouchableOpacity>
    ));
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <MaterialIcons
        key={index}
        name={index < rating ? "star" : "star-border"}
        size={16}
        color={index < rating ? "#FFD700" : "#E0E0E0"}
      />
    ));
  };

  // Early return if modal is not visible to prevent unnecessary rendering
  if (!visible) {
    return null;
  }

  // Error boundary - show error state if something goes wrong
  if (hasError) {
    return (
      <FullScreenModal
        visible={visible}
        onClose={onClose}
        title="Educator Feedback - Error"
        backgroundColor="#F5F5F5"
      >
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{errorInfo}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setHasError(false);
              setErrorInfo("");
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </FullScreenModal>
    );
  }

  // Always render the modal - static grades ensure we have grades to show
  console.log("✅ Rendering main modal interface with data:", {
    staticGradesCount: availableGrades.length,
    categoriesLoading: categoriesLoading,
    hasError: !!categoriesError,
  });

  // Early error state check
  if (shouldShowErrorState) {
    return (
      <FullScreenModal
        visible={visible}
        onClose={onClose}
        title="Educator Feedbacks"
        backgroundColor="#F5F5F5"
      >
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Unable to Load Data</Text>
          <Text style={styles.errorText}>{getErrorMessage()}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              // Force refresh by closing and reopening modal
              onClose();
              setTimeout(() => {
                // Could trigger a refetch here if needed
              }, 100);
            }}
          >
            <Text style={styles.retryButtonText}>Close and Try Again</Text>
          </TouchableOpacity>
        </View>
      </FullScreenModal>
    );
  }

  return (
    <>
      {/* TEMPORARILY DISABLED - AddCategoryPopup Modal causes nesting issues */}
      {/* <AddCategoryPopup
        visible={showAddCategoryPopup}
        onClose={() => setShowAddCategoryPopup(false)}
        onSubmit={async (categoryData) => {
          console.log("New category being submitted:", categoryData);

          try {
            // Call backend API to create the category
            const response =
              await createFeedbackCategory(categoryData).unwrap();
            console.log("✅ Category created successfully:", response);

            // Add the new category to our custom categories state for immediate UI update
            const newCategory = {
              id: response.data?.id || Date.now().toString(),
              title: categoryData.title,
              questions: categoryData.questions,
            };

            setCustomCategories((prev) => [...prev, newCategory]);

            Alert.alert(
              "Category Added Successfully!",
              `Category "${categoryData.title}" with ${categoryData.questions.length} questions has been added successfully!\n\nYou can now use this category when creating feedback.`,
              [
                {
                  text: "OK",
                  onPress: () => {
                    setShowAddCategoryPopup(false);
                  },
                },
              ],
            );
          } catch (error: any) {
            console.error("❌ Failed to create category:", error);

            // Still add to local state for development/fallback
            const newCategory = {
              id: Date.now().toString(),
              title: categoryData.title,
              questions: categoryData.questions,
            };

            setCustomCategories((prev) => [...prev, newCategory]);

            Alert.alert(
              "Category Added (Local Only)",
              `Category "${categoryData.title}" has been added locally.\n\nNote: Backend integration is in progress. The category will be available for this session.`,
              [
                {
                  text: "OK",
                  onPress: () => {
                    setShowAddCategoryPopup(false);
                  },
                },
              ],
            );
          }
        }}
      /> */}

      <FullScreenModal
        visible={visible}
        onClose={onClose}
        title="Educator Feedbacks"
        backgroundColor="#F5F5F5"
        headerAction={
          <TouchableOpacity
            style={styles.headerAddButton}
            onPress={handleAddFeedback}
          >
            <MaterialIcons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.headerAddButtonText}>Add Feedback</Text>
          </TouchableOpacity>
        }
      >
        <View style={styles.container}>
          {/* Search Section */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, admission number"
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholderTextColor="#999"
                  returnKeyType="search"
                  onSubmitEditing={Keyboard.dismiss}
                  blurOnSubmit={true}
                />
                {searchText !== debouncedSearchText && (
                  <ActivityIndicator
                    size={16}
                    color="#920734"
                    style={{ marginLeft: 8 }}
                  />
                )}
                {searchText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchText("");
                      setDebouncedSearchText("");
                      Keyboard.dismiss();
                    }}
                    style={styles.clearSearchButton}
                  >
                    <MaterialIcons name="clear" size={18} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>

          {/* New Filter Section */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.newFilterContainer}>
              {/* Filter Header with Reset Button */}
              <View style={styles.filterHeader}>
                <Text style={styles.filterHeaderText}>Filter Results</Text>
                <TouchableOpacity
                  style={styles.resetFiltersButton}
                  onPress={() => {
                    setSelectedFilterGradeId(null);
                    setSelectedEvaluationType(null);
                    setSearchText("");
                  }}
                >
                  <Text style={styles.resetFiltersText}>Reset All</Text>
                </TouchableOpacity>
              </View>

              {/* Filter Loading Indicator */}
              {feedbacksLoading && (
                <View style={styles.filterLoadingIndicator}>
                  <ActivityIndicator size="small" color="#920734" />
                  <Text style={styles.filterLoadingText}>
                    Updating filters...
                  </Text>
                </View>
              )}

              {/* Grade Filter - Horizontal Scroll */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.gradeFilterScrollView}
                contentContainerStyle={styles.gradeFilterContent}
              >
                {filterGradesOptions.map((gradeOption) => (
                  <TouchableOpacity
                    key={gradeOption.id || "all"}
                    style={[
                      styles.gradeFilterChip,
                      selectedFilterGradeId === gradeOption.id &&
                        styles.gradeFilterChipSelected,
                    ]}
                    onPress={() => setSelectedFilterGradeId(gradeOption.id)}
                  >
                    <Text
                      style={[
                        styles.gradeFilterText,
                        selectedFilterGradeId === gradeOption.id &&
                          styles.gradeFilterTextSelected,
                      ]}
                    >
                      {gradeOption.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Evaluation Types Filter */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.evaluationFilterScrollView}
                contentContainerStyle={styles.evaluationFilterContent}
              >
                {evaluationTypes.map((evalType) => (
                  <TouchableOpacity
                    key={evalType.id || "all"}
                    style={[
                      styles.evaluationFilterChip,
                      selectedEvaluationType === evalType.id &&
                        styles.evaluationFilterChipSelected,
                    ]}
                    onPress={() => setSelectedEvaluationType(evalType.id)}
                  >
                    <Text
                      style={[
                        styles.evaluationFilterText,
                        selectedEvaluationType === evalType.id &&
                          styles.evaluationFilterTextSelected,
                      ]}
                    >
                      {evalType.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>

          {/* Results Info */}
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsText}>
              Showing{" "}
              {(paginationInfo.current_page - 1) * paginationInfo.page_size + 1}
              -
              {Math.min(
                paginationInfo.current_page * paginationInfo.page_size,
                paginationInfo.total_count
              )}{" "}
              of {paginationInfo.total_count} feedback(s)
            </Text>
          </View>

          {/* Feedback List */}
          {feedbacksLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#920734" />
              <Text style={styles.loadingText}>Loading feedback...</Text>
            </View>
          ) : feedbacksError ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color="#F44336" />
              <Text style={styles.errorText}>
                Failed to load feedback. Please try again.
              </Text>
            </View>
          ) : paginatedData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="feedback" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No feedback found</Text>
              <Text style={styles.emptySubText}>
                Try adjusting your filters or add some feedback
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.feedbackList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={Keyboard.dismiss}
            >
              {paginatedData.map((item) => {
                // Additional safety check for rendering
                if (!item || !item.student) {
                  console.warn("⚠️ Skipping invalid item in render:", item);
                  return null;
                }

                // Ensure all text values are safe strings
                const studentName = String(
                  item.student.student_calling_name || "Unknown Student"
                );
                const admissionNumber = String(
                  item.student.admission_number || "N/A"
                );
                const grade = String(item.grade_level.name || "Unknown Grade");
                const description = String(
                  item.comments?.[0]?.comment || "No description available"
                );
                const createdBy = String(
                  item.created_by.call_name_with_title || "Unknown Educator"
                );
                const primaryCategory = String(item.category.name || "General");
                const evaluationType = String(
                  item.evaluations?.[0]?.evaluation_type?.name || ""
                );
                // Get student profile image using utility function
                const profileImageSource =
                  getStudentProfilePicture(item.student) ||
                  getLocalFallbackProfileImage();
                const rating = item.rating;
                const date = item.created_at
                  ? new Date(item.created_at).toLocaleDateString()
                  : "Unknown Date";
                const subcategories = Array.isArray(item.subcategories)
                  ? item.subcategories
                      .map((sub) => sub.subcategory_name)
                      .filter(Boolean)
                  : [];

                return (
                  <View
                    key={item.id || Math.random()}
                    style={styles.feedbackCard}
                  >
                    {/* Evaluation Type Bar - Top */}
                    {evaluationType && (
                      <View style={styles.evaluationTypeBar}>
                        <Text style={styles.evaluationTypeText}>
                          {evaluationType}
                        </Text>
                      </View>
                    )}

                    {/* Student Info */}
                    <View style={styles.studentHeader}>
                      <Image
                        source={profileImageSource}
                        style={styles.profileImage}
                      />

                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{studentName}</Text>
                        <Text style={styles.studentDetails}>
                          {admissionNumber} • {grade}
                        </Text>
                      </View>
                      <View style={styles.ratingContainer}>
                        <View style={styles.stars}>{renderStars(rating)}</View>
                        <Text style={styles.ratingText}>{rating}</Text>
                      </View>
                    </View>

                    {/* Categories */}
                    <View style={styles.categoriesContainer}>
                      <View
                        style={[styles.categoryTag, styles.primaryCategory]}
                      >
                        <MaterialIcons name="star" size={12} color="#920734" />
                        <Text style={styles.primaryCategoryText}>
                          {primaryCategory}
                        </Text>
                      </View>
                    </View>

                    {/* Description with Edit Functionality */}
                    {editingCommentId === item.id ? (
                      // Edit Mode
                      <View style={styles.editCommentContainer}>
                        <TextInput
                          style={styles.editCommentInput}
                          value={editedComment}
                          onChangeText={setEditedComment}
                          placeholder="Enter comment..."
                          multiline
                          numberOfLines={3}
                          autoFocus
                        />
                        <View style={styles.editCommentActions}>
                          <TouchableOpacity
                            style={[
                              styles.editActionButton,
                              styles.editCancelButton,
                            ]}
                            onPress={handleCancelEdit}
                            disabled={isCreatingComment}
                          >
                            <MaterialIcons
                              name="close"
                              size={16}
                              color="#F44336"
                            />
                            <Text style={styles.editCancelButtonText}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.editActionButton, styles.saveButton]}
                            onPress={() => handleSaveComment(item.id)}
                            disabled={
                              isCreatingComment || !editedComment.trim()
                            }
                          >
                            {isCreatingComment ? (
                              <MaterialIcons
                                name="hourglass-empty"
                                size={16}
                                color="#FFF"
                              />
                            ) : (
                              <MaterialIcons
                                name="check"
                                size={16}
                                color="#FFF"
                              />
                            )}
                            <Text style={styles.saveButtonText}>
                              {isCreatingComment ? "Saving..." : "Save"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      // View Mode
                      <View style={styles.descriptionContainer}>
                        <Text style={styles.description}>{description}</Text>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() =>
                            handleEditComment(item.id, description)
                          }
                        >
                          <MaterialIcons
                            name="edit"
                            size={16}
                            color="#920734"
                          />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Footer */}
                    <View style={styles.feedbackFooter}>
                      <View style={styles.metaInfo}>
                        <Text style={styles.createdBy}>
                          Created by: {createdBy}
                        </Text>
                        <Text style={styles.date}>{date}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleActionPress(item)}
                      >
                        <Text style={styles.actionButtonText}>
                          {expandedItemId === item.id ? "Collapse" : "Progress"}
                        </Text>
                        <MaterialIcons
                          name={
                            expandedItemId === item.id
                              ? "expand-less"
                              : "expand-more"
                          }
                          size={16}
                          color="#920734"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Subcategories Tags - Bottom with horizontal scroll */}
                    {subcategories.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.subcategoriesScrollContainer}
                        contentContainerStyle={styles.subcategoriesContainer}
                      >
                        {subcategories.map((subcategory, index) => (
                          <View key={index} style={styles.subcategoryTag}>
                            <Text style={styles.subcategoryText}>
                              #{subcategory}
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    )}

                    {/* Expandable Evaluation Section */}
                    <EvaluationSection
                      feedbackItem={item}
                      isExpanded={expandedItemId === item.id}
                      showAddEvaluationForm={showAddEvaluationForm}
                      onToggleAddEvaluationForm={handleToggleAddEvaluationForm}
                      onDeleteEvaluation={handleDeleteEvaluation}
                      onDeleteFeedback={handleDeleteFeedback}
                      onSubmitEvaluation={handleSubmitEvaluation}
                      isDeletingFeedback={isDeletingFeedback}
                      isDeletingEvaluation={isDeletingEvaluation}
                    />

                    {/* Add Evaluation Form - Above Action Buttons */}
                    {showAddEvaluationForm === item.id && (
                      <AddEvaluationForm
                        feedbackItem={item}
                        onSubmit={handleSubmitEvaluation}
                        onCancel={() => handleToggleAddEvaluationForm(item.id)}
                      />
                    )}

                    {/* Fixed Bottom Action Bar */}
                    <View style={styles.fixedBottomActionBar}>
                      <TouchableOpacity
                        style={[
                          styles.bottomDeleteButton,
                          isDeletingFeedback && styles.buttonDisabled,
                        ]}
                        onPress={() => {
                          console.log(
                            "🗑️ Delete button clicked for item:",
                            item
                          );
                          console.log("🗑️ Item ID:", item.id);
                          console.log("🗑️ Item ID type:", typeof item.id);
                          console.log(
                            "🗑️ Available item fields:",
                            Object.keys(item)
                          );

                          // Ensure ID is properly formatted
                          const feedbackId = String(item.id);
                          console.log("🗑️ Converted feedback ID:", feedbackId);

                          handleDeleteFeedback(feedbackId);
                        }}
                        disabled={isDeletingFeedback}
                      >
                        {isDeletingFeedback ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <MaterialIcons
                            name="delete"
                            size={18}
                            color="#FFFFFF"
                          />
                        )}
                        <Text style={styles.bottomDeleteButtonText}>
                          {isDeletingFeedback ? "Deleting..." : "Delete"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.bottomAddButton,
                          showAddEvaluationForm === item.id &&
                            styles.bottomButtonActive,
                        ]}
                        onPress={() => handleToggleAddEvaluationForm(item.id)}
                      >
                        <Text style={styles.bottomAddButtonText}>
                          {showAddEvaluationForm === item.id
                            ? "Cancel"
                            : "Next Action"}
                        </Text>
                        <MaterialIcons
                          name={
                            showAddEvaluationForm === item.id
                              ? "expand_less"
                              : "arrow-forward"
                          }
                          size={18}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Pagination */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  !paginationInfo.has_previous && styles.disabledButton,
                ]}
                onPress={handlePreviousPage}
                disabled={!paginationInfo.has_previous}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={20}
                  color={!paginationInfo.has_previous ? "#CCC" : "#920734"}
                />
                <Text
                  style={[
                    styles.paginationText,
                    !paginationInfo.has_previous && styles.disabledText,
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              <View style={styles.pageInfo}>
                <Text style={styles.pageText}>
                  Page {paginationInfo.current_page} of {totalPages}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  !paginationInfo.has_next && styles.disabledButton,
                ]}
                onPress={handleNextPage}
                disabled={!paginationInfo.has_next}
              >
                <Text
                  style={[
                    styles.paginationText,
                    !paginationInfo.has_next && styles.disabledText,
                  ]}
                >
                  Next
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={!paginationInfo.has_next ? "#CCC" : "#920734"}
                />
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>

          {/* Add Feedback Modal */}
          <Modal
            visible={showAddFeedbackModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowAddFeedbackModal(false)}
          >
            <KeyboardAvoidingView
              style={styles.modalOverlay}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
              <View style={styles.addFeedbackModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New Feedback</Text>
                  <TouchableOpacity
                    onPress={() => setShowAddFeedbackModal(false)}
                  >
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.addFeedbackContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Form Validation Info */}
                  {/* <View style={styles.validationInfoContainer}>
                  <Text style={styles.validationInfoTitle}>Required Fields:</Text>
                  <View style={styles.validationCheckList}>
                    <View style={styles.validationItem}>
                      <MaterialIcons 
                        name={selectedStudent ? "check-circle" : "radio-button-unchecked"} 
                        size={16} 
                        color={selectedStudent ? "#4CAF50" : "#CCC"} 
                      />
                      <Text style={[styles.validationText, selectedStudent && styles.validationCompleted]}>
                        Student Selection
                      </Text>
                    </View>
                    <View style={styles.validationItem}>
                      <MaterialIcons 
                        name={mainCategory ? "check-circle" : "radio-button-unchecked"} 
                        size={16} 
                        color={mainCategory ? "#4CAF50" : "#CCC"} 
                      />
                      <Text style={[styles.validationText, mainCategory && styles.validationCompleted]}>
                        Main Category
                      </Text>
                    </View>
                    <View style={styles.validationItem}>
                      <MaterialIcons 
                        name={feedbackDescription.trim() ? "check-circle" : "radio-button-unchecked"} 
                        size={16} 
                        color={feedbackDescription.trim() ? "#4CAF50" : "#CCC"} 
                      />
                      <Text style={[styles.validationText, feedbackDescription.trim() && styles.validationCompleted]}>
                        Description
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.validationNote}>
                    Subcategories are optional. Rating will be calculated from questionnaire answers.
                  </Text>
                </View> */}

                  {/* Grade Selection */}
                  <View style={styles.formSection}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        !selectedGradeId && styles.requiredFieldTitle,
                      ]}
                    >
                      Select Grade{" "}
                      <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>
                    <Text style={styles.categoryHelpText}>
                      First select the grade to view students from that grade.
                    </Text>

                    {selectedGradeId ? (
                      <View style={styles.selectedGradeCard}>
                        <View style={styles.gradeInfo}>
                          <MaterialIcons
                            name="school"
                            size={20}
                            color="#920734"
                          />
                          <Text style={styles.selectedGradeName}>
                            {selectedGradeName}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedGradeId(null);
                            setSelectedStudent(null); // Clear student when grade changes
                          }}
                          style={styles.removeGradeButton}
                        >
                          <MaterialIcons
                            name="close"
                            size={20}
                            color="#FF5252"
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.gradesList}
                      >
                        {availableGrades.map((grade: GradeLevel) => (
                          <TouchableOpacity
                            key={grade.id}
                            style={[
                              styles.gradeCard,
                              selectedGradeId === grade.id &&
                                styles.selectedGradeCard,
                            ]}
                            onPress={() => {
                              setSelectedGradeId(grade.id);
                              setSelectedStudent(null); // Clear student when grade changes
                            }}
                          >
                            <MaterialIcons
                              name="school"
                              size={24}
                              color="#920734"
                            />
                            <Text style={styles.gradeCardName}>
                              {grade.name}
                            </Text>
                            <Text style={styles.gradeCardStudents}>
                              {grade.category === "early_years"
                                ? "Early Years"
                                : grade.category === "primary"
                                  ? "Primary"
                                  : "Secondary"}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>

                  {/* Student Selection */}
                  <View style={styles.formSection}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        !selectedStudent && styles.requiredFieldTitle,
                      ]}
                    >
                      Select Student{" "}
                      <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>

                    <StudentSelectionWithPagination
                      gradeId={selectedGradeId}
                      onStudentSelect={setSelectedStudent}
                      selectedStudent={selectedStudent}
                      pageSize={10}
                      enableInfiniteScroll={true}
                      style={{ marginTop: 8 }}
                    />
                  </View>

                  {/* Rating will be calculated automatically from questionnaire */}

                  {/* Main Category Selection */}
                  <View style={styles.formSection}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        !mainCategory && styles.requiredFieldTitle,
                      ]}
                    >
                      Main Category{" "}
                      <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>
                    <Text style={styles.categoryHelpText}>
                      Select the primary focus area for this feedback.
                      Assessment guidelines will be shown to help with
                      evaluation.
                    </Text>

                    {mainCategory ? (
                      <View style={styles.selectedMainCategory}>
                        <View style={styles.mainCategoryBadge}>
                          <MaterialIcons
                            name="stars"
                            size={20}
                            color="#FFD700"
                          />
                          <Text style={styles.mainCategoryTitle}>
                            {mainCategory}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={handleClearMainCategory}
                          style={styles.clearMainCategoryButton}
                        >
                          <MaterialIcons
                            name="close"
                            size={20}
                            color="#FF5252"
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        {/* Debug information for categories */}
                        {allMainCategories.length === 0 && (
                          <View style={styles.debugContainer}>
                            <Text style={styles.debugTitle}>
                              🔍 DEBUG: No categories found
                            </Text>
                            <Text style={styles.debugText}>
                              Categories Loading:{" "}
                              {categoriesLoading ? "Yes" : "No"}
                            </Text>
                            <Text style={styles.debugText}>
                              Categories Error: {categoriesError ? "Yes" : "No"}
                            </Text>
                            <Text style={styles.debugText}>
                              Raw Categories Data:{" "}
                              {JSON.stringify(categoriesData, null, 2)}
                            </Text>
                            <Text style={styles.debugText}>
                              Main Categories:{" "}
                              {JSON.stringify(mainCategories, null, 2)}
                            </Text>
                          </View>
                        )}

                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.mainCategoriesList}
                        >
                          {allMainCategories.map((category) => (
                            <TouchableOpacity
                              key={category}
                              style={styles.mainCategorySelectChip}
                              onPress={() => handleMainCategorySelect(category)}
                            >
                              <MaterialIcons
                                name="category"
                                size={18}
                                color="#920734"
                              />
                              <Text style={styles.mainCategorySelectText}>
                                {category}
                              </Text>
                            </TouchableOpacity>
                          ))}

                          {/* Add Category Button */}
                          <TouchableOpacity
                            style={[
                              styles.addCategoryChip,
                              showInlineCategoryForm &&
                                styles.addCategoryChipActive,
                            ]}
                            onPress={() =>
                              setShowInlineCategoryForm(!showInlineCategoryForm)
                            }
                          >
                            <MaterialIcons
                              name={
                                showInlineCategoryForm
                                  ? "remove-circle-outline"
                                  : "add-circle-outline"
                              }
                              size={20}
                              color={
                                showInlineCategoryForm ? "#FFFFFF" : "#920734"
                              }
                            />
                            <Text
                              style={[
                                styles.addCategoryChipText,
                                showInlineCategoryForm &&
                                  styles.addCategoryChipTextActive,
                              ]}
                            >
                              {showInlineCategoryForm
                                ? "Cancel"
                                : "Add Category"}
                            </Text>
                          </TouchableOpacity>
                        </ScrollView>
                      </>
                    )}
                  </View>

                  {/* Inline Add Category Form */}
                  {showInlineCategoryForm && (
                    <View style={styles.inlineCategoryForm}>
                      <View style={styles.inlineCategoryHeader}>
                        <Text style={styles.inlineCategoryTitle}>
                          Create New Category
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setShowInlineCategoryForm(false);
                            setNewCategoryTitle("");
                            setNewCategoryQuestions([
                              {
                                text: "",
                                answerType: "likert",
                                mcqOptions: [],
                              },
                            ]);
                          }}
                          style={styles.closeCategoryFormButton}
                        >
                          <MaterialIcons name="close" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.categoryFormContent}>
                        <Text style={styles.categoryFormLabel}>
                          Category Title *
                        </Text>
                        <TouchableOpacity
                          style={styles.categoryTitleInput}
                          onPress={() => setShowInlineCategoryDropdown(true)}
                        >
                          <Text
                            style={[
                              styles.dropdownText,
                              !newCategoryTitle && styles.placeholderText,
                            ]}
                          >
                            {newCategoryTitle || "Select intelligence type..."}
                          </Text>
                          <MaterialIcons
                            name="keyboard-arrow-down"
                            size={24}
                            color="#666"
                          />
                        </TouchableOpacity>

                        <View style={styles.questionsHeaderContainer}>
                          <Text style={styles.categoryFormLabel}>
                            Questions ({newCategoryQuestions.length})
                          </Text>
                          {isCreatingCategory && (
                            <View style={styles.processingIndicator}>
                              <ActivityIndicator size="small" color="#920734" />
                              <Text style={styles.processingText}>
                                Creating...
                              </Text>
                            </View>
                          )}
                        </View>

                        {newCategoryQuestions.map((question, index) => (
                          <View key={index} style={styles.questionFormItem}>
                            <View style={styles.questionFormHeader}>
                              <Text style={styles.questionFormNumber}>
                                Question {index + 1}
                              </Text>
                              {newCategoryQuestions.length > 1 && (
                                <TouchableOpacity
                                  onPress={() => {
                                    const updatedQuestions =
                                      newCategoryQuestions.filter(
                                        (_, i) => i !== index
                                      );
                                    setNewCategoryQuestions(updatedQuestions);
                                  }}
                                  style={styles.removeQuestionButton}
                                >
                                  <MaterialIcons
                                    name="remove-circle"
                                    size={18}
                                    color="#F44336"
                                  />
                                </TouchableOpacity>
                              )}
                            </View>

                            <TextInput
                              style={styles.questionFormInput}
                              placeholder="Enter question text..."
                              value={question.text}
                              onChangeText={(text) => {
                                const updatedQuestions = [
                                  ...newCategoryQuestions,
                                ];
                                updatedQuestions[index].text = text;
                                setNewCategoryQuestions(updatedQuestions);
                              }}
                              multiline
                            />

                            <View style={styles.answerTypeContainer}>
                              <Text style={styles.answerTypeLabel}>
                                Answer Type:
                              </Text>
                              <View style={styles.answerTypeChips}>
                                {[
                                  { id: "likert", label: "Likert Scale" },
                                  { id: "mcq", label: "MCQ" },
                                  { id: "custom", label: "Custom" },
                                ].map((type) => (
                                  <TouchableOpacity
                                    key={type.id}
                                    style={[
                                      styles.answerTypeChip,
                                      question.answerType === type.id &&
                                        styles.selectedAnswerTypeChip,
                                    ]}
                                    onPress={() => {
                                      const updatedQuestions = [
                                        ...newCategoryQuestions,
                                      ];
                                      updatedQuestions[index].answerType =
                                        type.id;

                                      // Initialize MCQ options if selecting MCQ
                                      if (
                                        type.id === "mcq" &&
                                        !updatedQuestions[index].mcqOptions
                                          ?.length
                                      ) {
                                        updatedQuestions[index].mcqOptions = [
                                          { text: "", marks: 1 },
                                          { text: "", marks: 1 },
                                        ];
                                      } else if (type.id !== "mcq") {
                                        // Clear MCQ options if not MCQ
                                        updatedQuestions[index].mcqOptions = [];
                                      }

                                      setNewCategoryQuestions(updatedQuestions);
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.answerTypeChipText,
                                        question.answerType === type.id &&
                                          styles.selectedAnswerTypeChipText,
                                      ]}
                                    >
                                      {type.label}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>

                            {/* MCQ Options Builder */}
                            {question.answerType === "mcq" && (
                              <View style={styles.mcqOptionsBuilder}>
                                <View style={styles.mcqOptionsHeader}>
                                  <Text style={styles.mcqOptionsTitle}>
                                    MCQ Options
                                  </Text>
                                  <TouchableOpacity
                                    style={styles.addMcqOptionButton}
                                    onPress={() => {
                                      const updatedQuestions = [
                                        ...newCategoryQuestions,
                                      ];
                                      if (!updatedQuestions[index].mcqOptions) {
                                        updatedQuestions[index].mcqOptions = [];
                                      }
                                      updatedQuestions[index].mcqOptions!.push({
                                        text: "",
                                        marks: 1,
                                      });
                                      setNewCategoryQuestions(updatedQuestions);
                                    }}
                                  >
                                    <MaterialIcons
                                      name="add"
                                      size={16}
                                      color="#920734"
                                    />
                                    <Text style={styles.addMcqOptionText}>
                                      Add Option
                                    </Text>
                                  </TouchableOpacity>
                                </View>

                                {question.mcqOptions?.map(
                                  (option, optionIndex) => (
                                    <View
                                      key={optionIndex}
                                      style={styles.mcqOptionRow}
                                    >
                                      <View style={styles.mcqOptionContainer}>
                                        <View style={styles.mcqOptionHeader}>
                                          <Text style={styles.mcqOptionLabel}>
                                            Option {optionIndex + 1}
                                          </Text>

                                          {question.mcqOptions &&
                                            question.mcqOptions.length > 1 && (
                                              <TouchableOpacity
                                                style={
                                                  styles.removeMcqOptionButtonInside
                                                }
                                                onPress={() => {
                                                  const updatedQuestions = [
                                                    ...newCategoryQuestions,
                                                  ];
                                                  updatedQuestions[
                                                    index
                                                  ].mcqOptions =
                                                    updatedQuestions[
                                                      index
                                                    ].mcqOptions!.filter(
                                                      (_, i) =>
                                                        i !== optionIndex
                                                    );
                                                  setNewCategoryQuestions(
                                                    updatedQuestions
                                                  );
                                                }}
                                              >
                                                <MaterialIcons
                                                  name="close"
                                                  size={18}
                                                  color="#F44336"
                                                />
                                              </TouchableOpacity>
                                            )}
                                        </View>

                                        <TextInput
                                          style={styles.mcqOptionInput}
                                          placeholder="Enter option text..."
                                          value={option.text}
                                          multiline={true}
                                          numberOfLines={2}
                                          textAlignVertical="top"
                                          onChangeText={(text) => {
                                            const updatedQuestions = [
                                              ...newCategoryQuestions,
                                            ];
                                            updatedQuestions[index].mcqOptions![
                                              optionIndex
                                            ].text = text;
                                            setNewCategoryQuestions(
                                              updatedQuestions
                                            );
                                          }}
                                        />

                                        <View style={styles.mcqMarksContainer}>
                                          <Text style={styles.mcqMarksLabel}>
                                            Marks:
                                          </Text>
                                          <View style={styles.marksSelector}>
                                            {[1, 2, 3, 4, 5].map(
                                              (markValue) => {
                                                const usedMarks = getUsedMarks(
                                                  index,
                                                  optionIndex
                                                );
                                                const isUsed =
                                                  usedMarks.includes(markValue);
                                                const isSelected =
                                                  option.marks === markValue;

                                                return (
                                                  <TouchableOpacity
                                                    key={markValue}
                                                    style={[
                                                      styles.markChip,
                                                      isSelected &&
                                                        styles.selectedMarkChip,
                                                      isUsed &&
                                                        !isSelected &&
                                                        styles.disabledMarkChip,
                                                    ]}
                                                    onPress={() => {
                                                      if (
                                                        !isUsed ||
                                                        isSelected
                                                      ) {
                                                        const updatedQuestions =
                                                          [
                                                            ...newCategoryQuestions,
                                                          ];
                                                        updatedQuestions[
                                                          index
                                                        ].mcqOptions![
                                                          optionIndex
                                                        ].marks = markValue;
                                                        setNewCategoryQuestions(
                                                          updatedQuestions
                                                        );
                                                      }
                                                    }}
                                                    disabled={
                                                      isUsed && !isSelected
                                                    }
                                                  >
                                                    <Text
                                                      style={[
                                                        styles.markChipText,
                                                        isSelected &&
                                                          styles.selectedMarkChipText,
                                                        isUsed &&
                                                          !isSelected &&
                                                          styles.disabledMarkChipText,
                                                      ]}
                                                    >
                                                      {markValue}
                                                    </Text>
                                                  </TouchableOpacity>
                                                );
                                              }
                                            )}
                                          </View>
                                        </View>
                                      </View>
                                    </View>
                                  )
                                )}

                                {(!question.mcqOptions ||
                                  question.mcqOptions.length === 0) && (
                                  <View style={styles.noMcqOptionsContainer}>
                                    <Text style={styles.noMcqOptionsText}>
                                      No options added yet
                                    </Text>
                                    <TouchableOpacity
                                      style={styles.firstMcqOptionButton}
                                      onPress={() => {
                                        const updatedQuestions = [
                                          ...newCategoryQuestions,
                                        ];
                                        updatedQuestions[index].mcqOptions = [
                                          { text: "", marks: 1 },
                                          { text: "", marks: 1 },
                                        ];
                                        setNewCategoryQuestions(
                                          updatedQuestions
                                        );
                                      }}
                                    >
                                      <MaterialIcons
                                        name="add"
                                        size={18}
                                        color="#920734"
                                      />
                                      <Text style={styles.firstMcqOptionText}>
                                        Add First Option
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                            )}
                          </View>
                        ))}

                        <TouchableOpacity
                          style={styles.addQuestionButton}
                          onPress={() => {
                            setNewCategoryQuestions([
                              ...newCategoryQuestions,
                              {
                                text: "",
                                answerType: "likert",
                                mcqOptions: [],
                              },
                            ]);
                          }}
                        >
                          <MaterialIcons name="add" size={16} color="#920734" />
                          <Text style={styles.addQuestionButtonText}>
                            Add Question
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.categoryFormActions}>
                          <TouchableOpacity
                            style={styles.cancelCategoryButton}
                            onPress={() => {
                              setShowInlineCategoryForm(false);
                              setNewCategoryTitle("");
                              setNewCategoryQuestions([
                                {
                                  text: "",
                                  answerType: "likert",
                                  mcqOptions: [],
                                },
                              ]);
                            }}
                            disabled={isCreatingCategory}
                          >
                            <Text style={styles.cancelCategoryButtonText}>
                              Cancel
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.createCategoryButton,
                              isCreatingCategory && styles.disabledButton,
                            ]}
                            onPress={handleCreateInlineCategory}
                            disabled={isCreatingCategory || !newCategoryTitle}
                          >
                            {isCreatingCategory ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={styles.createCategoryButtonText}>
                                Create Category
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Inline Category Dropdown Modal */}
                  <Modal
                    visible={showInlineCategoryDropdown}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowInlineCategoryDropdown(false)}
                  >
                    <TouchableOpacity
                      style={styles.dropdownOverlay}
                      activeOpacity={1}
                      onPress={() => setShowInlineCategoryDropdown(false)}
                    >
                      <View style={styles.dropdownModal}>
                        <Text style={styles.dropdownTitle}>
                          Select Intelligence Type
                        </Text>
                        <ScrollView style={styles.dropdownList}>
                          {INTELLIGENCE_TYPES.map((type) => (
                            <TouchableOpacity
                              key={type.id}
                              style={[
                                styles.dropdownItem,
                                newCategoryTitle === type.label &&
                                  styles.dropdownItemSelected,
                              ]}
                              onPress={() => {
                                setNewCategoryTitle(type.label);
                                setShowInlineCategoryDropdown(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownItemText,
                                  newCategoryTitle === type.label &&
                                    styles.dropdownItemTextSelected,
                                ]}
                              >
                                {type.label}
                              </Text>
                              {newCategoryTitle === type.label && (
                                <MaterialIcons
                                  name="check"
                                  size={20}
                                  color="#920734"
                                />
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </TouchableOpacity>
                  </Modal>

                  {/* Assessment Questions Section */}
                  {mainCategory && (
                    <View style={styles.formSection}>
                      <Text style={styles.sectionTitle}>
                        Assessment Questions for {mainCategory}
                      </Text>
                      <Text style={styles.categoryHelpText}>
                        Click on each question to answer. Rating will be
                        calculated automatically.
                      </Text>

                      <QuestionnaireComponent
                        questions={questionnaireData || []}
                        answers={questionnaireAnswers}
                        selectedQuestionId={
                          selectedQuestionId?.toString() || null
                        }
                        onQuestionSelect={(questionId) => {
                          console.log("🎯 Question Selected:", questionId);
                          setSelectedQuestionId(
                            questionId ? parseInt(questionId) : null
                          );
                        }}
                        onAnswerChange={handleQuestionAnswer}
                      />

                      {/* Rating Display */}
                      {feedbackRating > 0 && (
                        <View style={styles.calculatedRatingContainer}>
                          <Text style={styles.calculatedRatingLabel}>
                            Calculated Rating:
                          </Text>
                          <View style={styles.ratingDisplay}>
                            <Text style={styles.ratingValue}>
                              {feedbackRating}
                            </Text>
                            <Text style={styles.ratingOutOf}>/5.0</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Subcategories Selection */}
                  {mainCategory && (
                    <View style={styles.formSection}>
                      <Text style={styles.sectionTitle}>
                        Subcategories (Optional) ({selectedSubcategories.length}
                        /5)
                      </Text>
                      <Text style={styles.categoryHelpText}>
                        Optionally select specific areas within {mainCategory}{" "}
                        to focus your feedback on.
                      </Text>

                      {selectedSubcategories.length > 0 && (
                        <View style={styles.selectedSubcategoriesContainer}>
                          {selectedSubcategories.map((subcategory, index) => (
                            <View
                              key={index}
                              style={styles.selectedSubcategoryChip}
                            >
                              <Text style={styles.selectedSubcategoryText}>
                                {subcategory}
                              </Text>
                              <TouchableOpacity
                                onPress={() =>
                                  handleSubcategoryToggle(subcategory)
                                }
                                style={styles.removeSubcategoryButton}
                              >
                                <MaterialIcons
                                  name="close"
                                  size={14}
                                  color="#666"
                                />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}

                      <Text style={styles.subcategoryGroupTitle}>
                        All Available Categories:
                      </Text>
                      <ScrollView
                        style={styles.subcategoriesList}
                        showsVerticalScrollIndicator={false}
                      >
                        <View style={styles.subcategoriesGrid}>
                          {allMainCategories
                            .filter((category) => category !== mainCategory) // Exclude the selected main category
                            .map((category) => (
                              <TouchableOpacity
                                key={category}
                                style={[
                                  styles.subcategorySelectChip,
                                  selectedSubcategories.includes(category) &&
                                    styles.subcategorySelectedChip,
                                ]}
                                onPress={() =>
                                  handleSubcategoryToggle(category)
                                }
                                disabled={
                                  !selectedSubcategories.includes(category) &&
                                  selectedSubcategories.length >= 5
                                }
                              >
                                <MaterialIcons
                                  name={
                                    selectedSubcategories.includes(category)
                                      ? "check-circle"
                                      : "add-circle-outline"
                                  }
                                  size={16}
                                  color={
                                    selectedSubcategories.includes(category)
                                      ? "#4CAF50"
                                      : "#920734"
                                  }
                                />
                                <Text
                                  style={[
                                    styles.subcategorySelectText,
                                    selectedSubcategories.includes(category) &&
                                      styles.subcategorySelectedText,
                                    !selectedSubcategories.includes(category) &&
                                      selectedSubcategories.length >= 5 &&
                                      styles.subcategoryDisabledText,
                                  ]}
                                >
                                  {category}
                                </Text>
                              </TouchableOpacity>
                            ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* Description */}
                  <View style={styles.formSection}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        !feedbackDescription.trim() &&
                          styles.requiredFieldTitle,
                      ]}
                    >
                      Description <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={handleDescriptionFocus}
                      style={styles.descriptionTouchableContainer}
                    >
                      <TextInput
                        ref={descriptionInputRef}
                        style={styles.descriptionInput}
                        placeholder="Tap here to enter detailed feedback description..."
                        multiline
                        numberOfLines={4}
                        value={feedbackDescription}
                        onChangeText={setFeedbackDescription}
                        textAlignVertical="top"
                        autoFocus={false}
                        blurOnSubmit={false}
                      />
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowAddFeedbackModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!isFormValid() || isSubmitting) &&
                        styles.disabledSubmitButton,
                    ]}
                    onPress={handleSubmitFeedback}
                    disabled={!isFormValid() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text
                          style={[styles.submitButtonText, { marginLeft: 8 }]}
                        >
                          Submitting...
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.submitButtonText,
                          !isFormValid() && styles.disabledSubmitButtonText,
                        ]}
                      >
                        Submit Feedback
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </View>
      </FullScreenModal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  topBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#920734",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "white",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  headerAddButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  headerAddButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  searchSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  feedbackListContainer: {
    flex: 1,
  },
  filterSection: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  filterScrollView: {
    paddingHorizontal: 16,
  },
  filterScrollContent: {
    alignItems: "center",
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minWidth: 120,
  },
  filterChipLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginRight: 8,
  },
  filterChipPicker: {
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
  },
  horizontalPicker: {
    height: 40,
    fontSize: 12,
    backgroundColor: "transparent",
    color: "#333",
  },
  clearFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3F3",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#920734",
    gap: 6,
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#920734",
  },
  resultsInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  resultsText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  feedbackList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  feedbackCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E0E0E0",
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  studentDetails: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  ratingContainer: {
    alignItems: "center",
    gap: 2,
    position: "absolute",
    top: 0,
    right: 9,
    width: 100,
    flexDirection: "row",
  },
  stars: {
    flexDirection: "row",
    gap: 1,
  },
  ratingText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
    borderWidth: 1,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderColor: "#E0E0E0",
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  categoryTag: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  primaryCategory: {
    backgroundColor: "#FFF3F3",
    borderColor: "#920734",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  primaryCategoryText: {
    fontSize: 12,
    color: "#920734",
    fontWeight: "700",
  },
  categoryText: {
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 16,
    flex: 1,
  },
  descriptionContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 4,
    backgroundColor: "#F8F9FA",
  },
  editCommentContainer: {
    marginBottom: 16,
  },
  editCommentInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    minHeight: 80,
  },
  editCommentActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  editActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  editCancelButton: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  editCancelButtonText: {
    fontSize: 12,
    color: "#F44336",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#920734",
    borderWidth: 1,
    borderColor: "#920734",
  },
  saveButtonText: {
    fontSize: 12,
    color: "#FFF",
    fontWeight: "600",
  },
  feedbackFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  metaInfo: {
    flex: 1,
  },
  createdBy: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: "#888",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#920734",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#920734",
    fontWeight: "600",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#920734",
    gap: 6,
  },
  disabledButton: {
    borderColor: "black",
    backgroundColor: "white",
  },
  paginationText: {
    fontSize: 14,
    color: "#920734",
    fontWeight: "600",
  },
  disabledText: {
    color: "black",
  },
  pageInfo: {
    alignItems: "center",
  },
  pageText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  actionModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    width: "80%",
    maxWidth: 400,
  },
  addFeedbackModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "92%",
    height: "85%",
    maxWidth: 600,
    minHeight: 500,
    flexDirection: "column",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 15,
  },
  addCategoryModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "95%",
    height: "90%",
    maxWidth: 600,
    minHeight: 500,
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#920734",
    flex: 1,
  },
  modalContent: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    lineHeight: 24,
  },
  addFeedbackContent: {
    flex: 1,
    padding: 20,
    minHeight: 400,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  requiredFieldTitle: {
    color: "black",
  },
  requiredAsterisk: {
    color: "#FF5252",
    fontSize: 16,
    fontWeight: "bold",
  },
  categoryHelpText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 16,
    fontStyle: "italic",
  },
  debugText: {
    fontSize: 10,
    color: "#FF0000",
    marginBottom: 8,
    fontFamily: "monospace",
  },
  studentsList: {
    marginTop: 8,
  },
  studentCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: "center",
    width: 100,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  studentCardImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  studentCardName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 4,
  },
  studentCardDetails: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    marginBottom: 2,
  },
  studentCardGrade: {
    fontSize: 10,
    color: "#888",
    textAlign: "center",
  },
  selectedStudentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#920734",
  },
  selectedStudentImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  selectedStudentInfo: {
    flex: 1,
  },
  selectedStudentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  selectedStudentDetails: {
    fontSize: 14,
    color: "#666",
  },
  removeStudentButton: {
    padding: 8,
    backgroundColor: "#FFE6E6",
    borderRadius: 20,
  },
  ratingSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  starRatingContainer: {
    flexDirection: "row",
    gap: 4,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  selectedCategoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  selectedCategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    marginBottom: 8,
  },
  mainCategoryChip: {
    backgroundColor: "#920734",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  additionalCategoryChip: {
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#920734",
  },
  mainCategoryIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFD700",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  mainCategoryLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#920734",
  },
  selectedCategoryText: {
    fontSize: 12,
    fontWeight: "600",
  },
  mainCategoryText: {
    color: "#FFFFFF",
  },
  additionalCategoryText: {
    color: "#920734",
  },
  removeCategoryButton: {
    padding: 2,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  // Main Category Styles
  selectedMainCategory: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F8FF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#920734",
  },
  mainCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mainCategoryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#920734",
  },
  clearMainCategoryButton: {
    padding: 8,
    backgroundColor: "#FFE6E6",
    borderRadius: 20,
  },
  mainCategoriesList: {
    marginTop: 8,
  },
  mainCategorySelectChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#920734",
    gap: 8,
    minWidth: 150,
  },
  mainCategorySelectText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#920734",
    textAlign: "center",
  },
  addCategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#920734",
    borderStyle: "dashed",
    gap: 8,
    minWidth: 150,
  },
  addCategoryChipActive: {
    backgroundColor: "#920734",
    borderStyle: "solid",
  },
  addCategoryChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#920734",
    textAlign: "center",
  },
  addCategoryChipTextActive: {
    color: "#FFFFFF",
  },
  // Inline Category Form Styles
  inlineCategoryForm: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#920734",
    overflow: "hidden",
  },
  inlineCategoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#920734",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inlineCategoryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  closeCategoryFormButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  categoryFormContent: {
    padding: 16,
  },
  categoryFormLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 12,
  },
  categoryTitleInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  questionFormItem: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  questionFormHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  questionFormNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  removeQuestionButton: {
    padding: 4,
  },
  questionFormInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 8,
    minHeight: 60,
    textAlignVertical: "top",
  },
  answerTypeContainer: {
    marginTop: 8,
  },

  answerTypeChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  answerTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectedAnswerTypeChip: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  answerTypeChipText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  selectedAnswerTypeChipText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  addQuestionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#920734",
    borderStyle: "dashed",
  },
  addQuestionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#920734",
    marginLeft: 6,
  },
  categoryFormActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelCategoryButton: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  cancelCategoryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  createCategoryButton: {
    flex: 1,
    backgroundColor: "#920734",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  createCategoryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  questionsHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  processingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  processingText: {
    fontSize: 12,
    color: "#920734",
    fontWeight: "500",
  },
  // MCQ Options Builder Styles
  mcqOptionsBuilder: {
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#920734",
  },
  mcqOptionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mcqOptionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#920734",
  },
  addMcqOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#920734",
  },
  addMcqOptionText: {
    fontSize: 12,
    color: "#920734",
    fontWeight: "500",
    marginLeft: 4,
  },
  mcqOptionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  mcqOptionContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  mcqOptionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
  },
  mcqOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  removeMcqOptionButtonInside: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: 4,
    zIndex: 1,
  },
  mcqOptionInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 8,
    minHeight: 50,
    textAlignVertical: "top",
  },
  mcqMarksContainer: {
    marginTop: 8,
  },
  mcqMarksLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
  },
  marksSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  markChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedMarkChip: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  disabledMarkChip: {
    backgroundColor: "#F0F0F0",
    borderColor: "#CCCCCC",
    opacity: 0.5,
  },
  markChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  selectedMarkChipText: {
    color: "#FFFFFF",
  },
  disabledMarkChipText: {
    color: "#999",
  },
  removeMcqOptionButton: {
    padding: 4,
    marginLeft: 8,
    marginTop: 20,
  },
  noMcqOptionsContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  noMcqOptionsText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  firstMcqOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#920734",
    borderStyle: "dashed",
  },
  firstMcqOptionText: {
    fontSize: 14,
    color: "#920734",
    fontWeight: "600",
    marginLeft: 6,
  },
  // Subcategory Styles for Feedback Form
  selectedSubcategoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  selectedSubcategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  selectedSubcategoryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  removeSubcategoryButton: {
    padding: 2,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  subcategoryGroupTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    marginTop: 8,
  },
  subcategoriesList: {
    maxHeight: 200,
  },
  subcategoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  subcategorySelectChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    gap: 6,
    marginBottom: 8,
  },
  subcategorySelectedChip: {
    backgroundColor: "#E8F5E8",
    borderColor: "#4CAF50",
  },
  subcategorySelectText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  subcategorySelectedText: {
    color: "#4CAF50",
  },
  subcategoryDisabledText: {
    color: "#CCC",
  },
  subcategoriesScrollContainer: {
    marginTop: 8,
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  subcategoriesContainer: {
    flexDirection: "row",
    paddingVertical: 8,
  },
  subcategoryTag: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  subcategoryText: {
    fontSize: 9,
    color: "#666",
    fontWeight: "500",
  },
  categoriesList: {
    marginTop: 8,
  },
  categorySelectChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#920734",
    gap: 6,
  },
  categorySelectText: {
    color: "#920734",
    fontSize: 12,
    fontWeight: "600",
  },
  descriptionTouchableContainer: {
    width: "100%",
  },
  descriptionInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 12,
    flexShrink: 0,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  cancelButtonText: {
    // flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#920734",
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
  },
  disabledSubmitButton: {
    backgroundColor: "#CCC",
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  disabledSubmitButtonText: {
    color: "#999",
  },
  // Questionnaire Modal Styles
  questionnaireModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "95%",
    maxHeight: "85%",
    maxWidth: 600,
    flexDirection: "column",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  questionnaireContent: {
    flex: 1,
    padding: 20,
  },
  questionProgress: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#920734",
    borderRadius: 2,
  },
  questionContainer: {
    flex: 1,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
    lineHeight: 22,
  },
  // answerTypeLabel: {
  //   fontSize: 12,
  //   fontWeight: "600",
  //   color: "#666",
  //   marginBottom: 6,
  // },
  answerTypeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 15,
  },
  // Scale Answer Styles
  scaleAnswerContainer: {
    marginBottom: 20,
  },
  scaleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectedScaleOption: {
    backgroundColor: "#E8F5E8",
    borderColor: "#4CAF50",
  },
  scaleOptionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  scaleValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#920734",
    marginRight: 15,
    minWidth: 30,
  },
  scaleLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  // Predefined Answer Styles
  predefinedAnswerContainer: {
    marginBottom: 20,
  },
  predefinedOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectedPredefinedOption: {
    backgroundColor: "#E8F5E8",
    borderColor: "#4CAF50",
  },
  predefinedOptionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  predefinedText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  marksContainer: {
    backgroundColor: "#920734",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  marksText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  // Custom Answer Styles
  customAnswerContainer: {
    marginBottom: 20,
  },
  customAnswerInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 15,
    fontSize: 14,
    color: "#333",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  // Navigation Styles
  questionnaireActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#920734",
    gap: 6,
  },
  disabledNavButton: {
    borderColor: "#CCC",
    backgroundColor: "#F5F5F5",
  },
  navButtonText: {
    fontSize: 14,
    color: "#920734",
    fontWeight: "600",
  },
  disabledNavText: {
    color: "#CCC",
  },
  questionIndicator: {
    backgroundColor: "#920734",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  questionIndicatorText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  completeButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  // Inline Questionnaire Styles
  questionsList: {
    marginTop: 16,
  },
  questionItem: {
    marginBottom: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    overflow: "hidden",
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  selectedQuestionHeader: {
    backgroundColor: "#F0F8FF",
    borderLeftWidth: 4,
    borderLeftColor: "#920734",
  },
  answeredQuestionHeader: {
    backgroundColor: "#F0FFF4",
  },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#920734",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  questionNumberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  questionListText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    lineHeight: 20,
  },
  questionStatus: {
    marginLeft: 8,
  },
  answerSection: {
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  // Rating Display
  calculatedRatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F8FF",
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#920734",
  },
  calculatedRatingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#920734",
    marginRight: 12,
  },
  ratingDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#920734",
  },
  ratingOutOf: {
    fontSize: 16,
    color: "#666",
    marginLeft: 2,
  },
  // Grade Selection Styles
  selectedGradeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F8FF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#920734",
  },
  gradeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedGradeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#920734",
  },
  removeGradeButton: {
    padding: 8,
    backgroundColor: "#FFE6E6",
    borderRadius: 20,
  },
  gradesList: {
    marginTop: 8,
  },
  gradeCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: "center",
    minWidth: 120,
    borderWidth: 1,
    borderColor: "#920734",
  },
  gradeCardName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#920734",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  gradeCardStudents: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  noStudentsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    gap: 8,
  },
  noStudentsText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  selectGradeFirstContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    gap: 8,
  },
  selectGradeFirstText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  // Student Section Header Styles
  studentSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  gradeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#920734",
    gap: 4,
  },
  gradeIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#920734",
  },
  // Validation Info Styles
  validationInfoContainer: {
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#920734",
  },
  validationInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#920734",
    marginBottom: 12,
  },
  validationCheckList: {
    marginBottom: 8,
  },
  validationItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  validationText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  validationCompleted: {
    color: "#4CAF50",
    fontWeight: "500",
  },
  validationNote: {
    fontSize: 11,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
  // Loading and Error States
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    marginVertical: 8,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: "#F5F5F5",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F44336",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#920734",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    color: "#333333",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#D32F2F",
    marginTop: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#920734",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  debugContainer: {
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#FF9800",
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E65100",
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: "#BF360C",
    marginBottom: 4,
    fontFamily: "monospace",
  },
  // ADD CATEGORY OVERLAY STYLES
  addCategoryOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  addCategoryBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 999,
  },
  addCategoryContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    margin: 20,
    maxHeight: "90%",
    width: "95%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  addCategoryScrollView: {
    flex: 1,
  },
  addCategoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  addCategoryTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#920734",
    flex: 1,
  },
  addCategoryCloseButton: {
    padding: 4,
  },
  addCategorySectionContainer: {
    padding: 20,
  },
  addCategorySectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  addCategoryTitleInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerStyle: {
    height: 44,
    width: "100%",
    color: "#333",
  },
  dropdownText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  placeholderText: {
    color: "#999",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dropdownModal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    maxHeight: 400,
    width: "100%",
    maxWidth: 350,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dropdownItemSelected: {
    backgroundColor: "#FFF5F5",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: "#920734",
    fontWeight: "500",
  },
  addCategoryQuestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addCategoryAddQuestionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#920734",
  },
  addCategoryAddQuestionText: {
    color: "#920734",
    fontWeight: "600",
    marginLeft: 4,
    fontSize: 14,
  },
  addCategoryQuestionContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  addCategoryQuestionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addCategoryQuestionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  addCategoryRemoveQuestionButton: {
    padding: 4,
  },
  addCategoryQuestionInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: "#333",
    minHeight: 60,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 12,
    textAlignVertical: "top",
  },
  addCategoryAnswerTypeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  addCategoryAnswerTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  addCategoryAnswerTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  addCategorySelectedAnswerType: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  addCategoryAnswerTypeText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
  },
  addCategorySelectedAnswerTypeText: {
    color: "white",
    fontWeight: "600",
  },
  addCategoryRequiredToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  addCategoryRequiredLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  addCategoryRequiredLabelActive: {
    color: "#920734",
    fontWeight: "500",
  },
  addCategoryFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  addCategoryCancelButton: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  addCategoryCancelButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  addCategorySubmitButton: {
    flex: 1,
    backgroundColor: "#920734",
    paddingVertical: 14,
    borderRadius: 8,
    marginLeft: 10,
  },
  addCategorySubmitButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  // Marks Input Styles
  addCategoryMarksContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  addCategoryMarksLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginRight: 12,
    flex: 2,
  },
  addCategoryMarksInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    flex: 1,
    textAlign: "center",
  },
  // Likert Scale Styles
  addCategoryLikertPreview: {
    marginBottom: 16,
  },
  addCategoryPreviewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  addCategoryLikertScale: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  addCategoryLikertItem: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 2,
  },
  addCategoryLikertCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#920734",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  addCategoryLikertNumber: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  addCategoryLikertLabel: {
    fontSize: 10,
    color: "#333",
    textAlign: "center",
    marginBottom: 2,
  },
  addCategoryLikertMarks: {
    fontSize: 8,
    color: "#666",
    textAlign: "center",
  },
  // MCQ Styles
  addCategoryMCQContainer: {
    marginBottom: 16,
  },
  addCategoryMCQHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addCategoryMCQLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  addCategoryMCQAddButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addCategoryMCQAddText: {
    color: "#920734",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  addCategoryMCQOptionContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  addCategoryMCQOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addCategoryMCQOptionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  addCategoryMCQRemoveButton: {
    padding: 4,
  },
  addCategoryMCQOptionInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 8,
  },
  addCategoryMCQMarksContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  addCategoryMCQMarksLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  addCategoryMCQMarksInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 4,
    padding: 6,
    fontSize: 12,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    width: 60,
    textAlign: "center",
  },
  addCategoryMCQFirstOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#920734",
    borderStyle: "dashed",
  },
  addCategoryMCQFirstOptionText: {
    color: "#920734",
    fontWeight: "600",
    marginLeft: 8,
  },
  // Custom Answer Styles
  addCategoryCustomPreview: {
    marginBottom: 16,
  },
  addCategoryCustomAnswerPreview: {
    backgroundColor: "#F8F9FA",
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: "#666",
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    textAlignVertical: "top",
    marginBottom: 8,
  },
  addCategoryCustomMarksInfo: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  evaluationTypeBar: {
    backgroundColor: "#920734",
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginHorizontal: -12,
    marginTop: -12,
  },
  evaluationTypeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // New Filter Styles
  newFilterContainer: {
    backgroundColor: "#F8F9FA",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  filterHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  resetFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#920734",
    borderRadius: 6,
  },
  resetFiltersText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  filterLoadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: "#920734",
    borderRadius: 6,
  },
  filterLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  gradeFilterScrollView: {
    marginBottom: 12,
  },
  gradeFilterContent: {
    paddingHorizontal: 0,
  },
  gradeFilterChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minWidth: 50,
    alignItems: "center",
  },
  gradeFilterChipSelected: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  gradeFilterText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  gradeFilterTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  evaluationFilterScrollView: {
    marginTop: 4,
  },
  evaluationFilterContent: {
    paddingHorizontal: 0,
  },
  evaluationFilterChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  evaluationFilterChipSelected: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  evaluationFilterText: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
  },
  evaluationFilterTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  // Evaluation Modal Styles
  evaluationModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    minHeight: "60%",
    marginTop: "auto",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  evaluationModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  evaluationModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  evaluationModalContent: {
    flex: 1,
    padding: 20,
  },
  studentInfoCard: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  studentAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  studentDetails: {
    flex: 1,
  },
  studentNameModal: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  studentMetaModal: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  feedbackCategoryModal: {
    fontSize: 12,
    color: "#920734",
    fontWeight: "600",
  },
  evaluationsSection: {
    flex: 1,
  },
  evaluationsSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  evaluationItem: {
    marginBottom: 16,
    position: "relative",
  },
  evaluationStatusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  evaluationStatusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  evaluationContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#E0E0E0",
    marginLeft: 8,
  },
  evaluationFeedback: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 8,
  },
  evaluationDate: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
  timelineConnector: {
    position: "absolute",
    left: 20,
    top: 60,
    width: 2,
    height: 30,
    backgroundColor: "#E0E0E0",
  },
  noEvaluationsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noEvaluationsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  noEvaluationsSubText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 4,
  },

  // Expandable Evaluation Section Styles
  evaluationSection: {
    backgroundColor: "#F8F9FA",
    marginTop: 16,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopWidth: 2,
    borderTopColor: "#E0E7FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  evaluationSectionContent: {
    paddingVertical: 5,
  },
  studentInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  studentDetailsHeader: {
    flex: 1,
  },
  studentNameHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  studentMetaHeader: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  feedbackCategoryHeader: {
    fontSize: 11,
    color: "#920734",
    fontWeight: "600",
  },
  evaluationTimeline: {
    flex: 1,
    maxHeight: 300,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 12,
  },
  timelineItem: {
    marginBottom: 16,
    position: "relative",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#E0E7FF",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timelineContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    marginLeft: 4,
  },
  evaluationFeedbackText: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 16,
    marginBottom: 6,
  },
  evaluationDateText: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
    fontWeight: "500",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  timelineConnector: {
    position: "absolute",
    left: 16,
    top: 40,
    width: 2,
    height: 20,
    backgroundColor: "#E5E7EB",
  },
  noEvaluationsState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    margin: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  noEvaluationsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginTop: 12,
  },
  noEvaluationsDesc: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 20,
  },

  // Enhanced Timeline Styles
  statusBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  parentVisibleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  parentVisibleText: {
    fontSize: 10,
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 4,
  },
  evaluationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  deleteEvaluationButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "#FFEBEE",
  },

  // Action Buttons Styles
  evaluationActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  deleteFeedbackButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F44336",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flex: 0.48,
    shadowColor: "#F44336",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteFeedbackButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    textAlign: "center",
  },
  addEvaluationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#920734",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flex: 0.48,
    shadowColor: "#920734",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonActive: {
    backgroundColor: "#7A0627",
  },
  buttonDisabled: {
    backgroundColor: "#CCC",
    shadowOpacity: 0,
    elevation: 0,
  },
  addEvaluationButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },

  // Fixed Bottom Action Bar Styles
  fixedBottomActionBar: {
    flexDirection: "row",
    backgroundColor: "#920734",
    marginTop: -10,
    marginHorizontal: -20,
    marginBottom: -20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: "hidden",
  },
  bottomDeleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B91C1C",
    paddingVertical: 14,
    gap: 8,
  },
  bottomDeleteButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  bottomAddButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#920734",
    paddingVertical: 14,
    gap: 8,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255, 255, 255, 0.2)",
  },
  bottomAddButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  bottomButtonActive: {
    backgroundColor: "#7A0627",
  },

  // Add Evaluation Form Styles
  addEvaluationForm: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addEvaluationContent: {
    flex: 1,
  },
  addEvaluationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addEvaluationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  cancelButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "#F3F4F6",
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  evaluationTypePicker: {
    maxHeight: 50,
  },
  evaluationTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  evaluationTypeChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#374151",
    backgroundColor: "#FFFFFF",
    minHeight: 100,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderRadius: 4,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelFormButton: {
    flex: 0.45,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  cancelFormButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  submitFormButton: {
    flex: 0.45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#920734",
  },
  submitFormButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitFormButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 6,
  },
});

export default EducatorFeedbackModal;
