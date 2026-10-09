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
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import FullScreenModal from "../components/FullScreenModal";

// API imports (students and feedback submission)
import {
  useGetCategoryEyListQuery,
  useGetCategoryPrListQuery,
  useGetCategoryScListQuery,
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
  getCategoryApiForGrade,
} from "../../../../../constants/gradeLevels";
import {
  INTELLIGENCE_TYPES,
  getIntelligenceTypeById,
} from "../../../../../constants/intelligenceTypes";

// Component imports
import StudentSelectionWithPagination from "../../../../../components/common/StudentSelectionWithPagination";
import CategorySelectionComponent from "../../../../../components/educator-feedback/CategorySelectionComponent";
import QuestionnaireComponent from "../../../../../components/educator-feedback/QuestionnaireComponent";
import FeedbackCard from "../../../../../components/educator-feedback/FeedbackCard";
import AddFeedbackWizard from "../../../../../components/educator-feedback/AddFeedbackWizard";
import {
  RatingCategoriesStep,
  RatingCommentStep,
} from "../../../../../components/educator-feedback/RatingModeFeedbackForm";
import {
  useGetFeedbackModeQuery,
  useGetRatingCategoriesQuery,
  useSubmitRatingFeedbackMutation,
  useGetRatingFeedbackListQuery,
  useDeleteRatingFeedbackMutation,
  useAddRatingEvaluationMutation,
  useDeleteRatingEvaluationMutation,
} from "../../../../../api/educator-feedback-rating-api";

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
                evaluation.edu_fd_evaluation_type_id,
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
                            },
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
      visible,
    );
  }
  if (typeof onClose !== "function") {
    console.warn(
      "⚠️ EducatorFeedbackModal: 'onClose' prop should be function, received:",
      typeof onClose,
      onClose,
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
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);

  // Debounced search text for API calls
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  // Debounced filter values to reduce API calls
  const [debouncedFilterGradeId, setDebouncedFilterGradeId] = useState<
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
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [mainCategory, setMainCategory] = useState<string>("");
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(
    [],
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
    null,
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
    answerId?: number,
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

  // Determine which category API to use based on selected grade
  const categoryApiType = selectedGradeId
    ? getCategoryApiForGrade(selectedGradeId)
    : null;

  // Section-specific category API calls (conditional)
  const {
    data: eyCategories,
    isLoading: eyLoading,
    error: eyError,
  } = useGetCategoryEyListQuery(undefined, {
    skip: categoryApiType !== "ey",
  });

  const {
    data: prCategories,
    isLoading: prLoading,
    error: prError,
  } = useGetCategoryPrListQuery(undefined, {
    skip: categoryApiType !== "pr",
  });

  const {
    data: scCategories,
    isLoading: scLoading,
    error: scError,
  } = useGetCategoryScListQuery(undefined, {
    skip: categoryApiType !== "sc",
  });

  // Fallback to legacy API if new one fails
  const {
    data: legacyCategoriesData,
    isLoading: legacyCategoriesLoading,
    error: legacyCategoriesError,
  } = useGetFeedbackCategoriesWithQuestionsQuery();

  // Select the appropriate categories data based on grade
  const categoriesData = React.useMemo(() => {
    if (!categoryApiType) return null;

    switch (categoryApiType) {
      case "ey":
        return eyCategories;
      case "pr":
        return prCategories;
      case "sc":
        return scCategories;
      default:
        return null;
    }
  }, [categoryApiType, eyCategories, prCategories, scCategories]);

  // Select the appropriate loading state
  const categoriesLoading = React.useMemo(() => {
    if (!categoryApiType) return false;

    switch (categoryApiType) {
      case "ey":
        return eyLoading;
      case "pr":
        return prLoading;
      case "sc":
        return scLoading;
      default:
        return false;
    }
  }, [categoryApiType, eyLoading, prLoading, scLoading]);

  // Select the appropriate error state
  const categoriesError = React.useMemo(() => {
    if (!categoryApiType) return null;

    switch (categoryApiType) {
      case "ey":
        return eyError;
      case "pr":
        return prError;
      case "sc":
        return scError;
      default:
        return null;
    }
  }, [categoryApiType, eyError, prError, scError]);

  // Use static grades instead of API
  const availableGrades = GRADE_LEVELS;
  console.log("🎓 Using static grades:", availableGrades);
  console.log("🎯 Selected Grade ID:", selectedGradeId);
  console.log("📋 Category API Type:", categoryApiType);
  console.log("📤 Categories Data:", categoriesData);
  console.log("🔄 Categories Loading:", categoriesLoading);

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

  // Rating mode (second Add Feedback flow, chosen by the database; defaults to classic)
  const { data: feedbackMode } = useGetFeedbackModeQuery();
  const isRatingMode = feedbackMode === "rating";
  const [ratingComment, setRatingComment] = useState("");
  const [categoryRatings, setCategoryRatings] = useState<{
    [categoryId: number]: number;
  }>({});
  const {
    data: ratingCategories,
    isLoading: ratingCategoriesLoading,
    error: ratingCategoriesError,
  } = useGetRatingCategoriesQuery(
    { section: categoryApiType || "" },
    { skip: !isRatingMode || !categoryApiType },
  );
  const [submitRatingFeedback, { isLoading: isSubmittingRating }] =
    useSubmitRatingFeedbackMutation();

  // Add Feedback wizard: 0 = who, 1 = comment (rating) / category (classic), 2 = ratings / description
  const [wizardStep, setWizardStep] = useState(0);
  const wizardStepTitles = isRatingMode
    ? ["Select students", "Add comment", "Rate categories"]
    : ["Select students", "Choose category", "Description"];
  const canProceedWizardStep =
    wizardStep === 0
      ? !!selectedGradeId && selectedStudents.length > 0
      : wizardStep === 1
        ? isRatingMode
          ? !!ratingComment.trim()
          : !!mainCategory
        : isRatingMode
          ? Object.values(categoryRatings).some((r) => r > 0)
          : !!feedbackDescription.trim();

  // Category ids differ per section, so clear ratings when the grade section changes
  React.useEffect(() => {
    setCategoryRatings({});
  }, [categoryApiType]);

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
        grade_filter: debouncedFilterGradeId ?? null, // Send grade ID or null for "All Grades"
        search_filter_list: [],
      },
    };

    console.log("🔍 FILTER DEBUG - Current Filter State:", {
      selectedFilterGradeId,
      debouncedFilterGradeId,
      selectedFilterGradeName: debouncedFilterGradeId
        ? getGradeNameById(debouncedFilterGradeId)
        : "All Grades",
      debouncedSearchText,
      currentPage,
      filterPayload: payload,
      timestamp: new Date().toISOString(),
      apiWillReceive: {
        grade_filter: payload.filters.grade_filter,
        grade_filter_type: typeof payload.filters.grade_filter,
        will_filter_grades: payload.filters.grade_filter !== null,
      },
    });

    return payload;
  }, [currentPage, debouncedSearchText, debouncedFilterGradeId]);

  // Get feedback list with filters
  // Rating mode lists one card per submission (new API); classic keeps the per-row list
  const classicFeedbacks = useGetEducatorFeedbacksQuery(filterPayload, {
    skip: isRatingMode,
  });
  const ratingFeedbacks = useGetRatingFeedbackListQuery(
    {
      page: currentPage,
      page_size: DEFAULT_PAGE_SIZE,
      grade_filter: debouncedFilterGradeId ?? null,
    },
    { skip: !isRatingMode },
  );
  const {
    data: feedbacksData,
    isLoading: feedbacksLoading,
    error: feedbacksError,
    refetch: refetchFeedbacks,
  } = isRatingMode ? ratingFeedbacks : classicFeedbacks;
  const [deleteRatingFeedback] = useDeleteRatingFeedbackMutation();
  const [addRatingEvaluation] = useAddRatingEvaluationMutation();
  const [deleteRatingEvaluation] = useDeleteRatingEvaluationMutation();

  const itemsPerPage = DEFAULT_PAGE_SIZE;

  // Reset to page 1 when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchText, debouncedFilterGradeId]);

  // Reset pagination loading state when data arrives
  React.useEffect(() => {
    if (!feedbacksLoading && isPaginationLoading) {
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        setIsPaginationLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [feedbacksLoading, isPaginationLoading]);

  // Debug expanded card state changes
  React.useEffect(() => {
    console.log(
      "🔄 Expanded card state changed - expandedItemId:",
      expandedItemId,
    );
  }, [expandedItemId]);

  // ===== DATA PROCESSING =====

  // Process categories data from API
  const mainCategories = React.useMemo(() => {
    console.log(
      "🔍 Processing categories - Raw categoriesData:",
      categoriesData,
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
      (cat: any) => cat?.active !== false,
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

  // Pagination info from API - backend now provides accurate pagination
  const paginationInfo = React.useMemo(() => {
    // Backend returns proper pagination structure after our changes
    if (feedbacksData?.data?.pagination) {
      return feedbacksData.data.pagination;
    }

    // Fallback for edge cases
    return {
      current_page: currentPage,
      total_pages: 1,
      total_count: existingFeedbacks.length,
      page_size: DEFAULT_PAGE_SIZE,
      has_next: false,
      has_previous: false,
    };
  }, [feedbacksData, currentPage, existingFeedbacks.length]);

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

    // Extract status from various possible error structures (RTK Query, Fetch, etc.)
    const getErrorStatus = (err: any): number | null => {
      return err?.status || err?.data?.status || err?.response?.status || null;
    };

    // Extract error message from various possible structures
    const getErrorMessage = (err: any): string | null => {
      return (
        err?.data?.message ||
        err?.message ||
        err?.response?.data?.message ||
        null
      );
    };

    const status = getErrorStatus(error);
    const message = getErrorMessage(error);

    // Log detailed error information for debugging
    if (status) {
      console.error(`HTTP Status: ${status}`);
    }
    if (error?.data) {
      console.error(`Error Data:`, error.data);
    }
    if (message) {
      console.error(`Error Message:`, message);
    }

    // Return user-friendly error message based on error type
    if (status === 401) {
      return "Authentication expired. Please log in again.";
    } else if (status === 403) {
      return "You don't have permission to access this data.";
    } else if (status === 404) {
      return "The requested data was not found.";
    } else if (status === 422) {
      return message || "Invalid data provided.";
    } else if (status === 500) {
      return "Server error. Please try again later.";
    } else if (
      message?.includes("network") ||
      message?.includes("fetch") ||
      error?.name?.includes("fetch")
    ) {
      return "Network error. Please check your connection.";
    } else {
      return message || "An unexpected error occurred.";
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
    [],
  );

  const handleValidationError = React.useCallback(
    (field: string, value: any, rule: string) => {
      console.warn(
        `⚠️ Validation Error - Field: ${field}, Rule: ${rule}, Value:`,
        value,
      );
      return `${field} ${rule}`;
    },
    [],
  );

  const handleRetryableAction = React.useCallback(
    async (
      action: () => Promise<any>,
      maxRetries: number = 3,
      context: string = "Action",
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
          const getErrorStatus = (err: any): number | null => {
            return (
              err?.status || err?.data?.status || err?.response?.status || null
            );
          };
          const status = getErrorStatus(error);

          if (status === 401 || status === 403 || status === 404) {
            console.log(
              `🚫 Not retrying ${context} due to error status: ${status}`,
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
    [],
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
    const rawQuestions = selectedCategoryData?.predefined_questions || [];

    // Map API response format to component expected format
    return rawQuestions.map((q: any) => ({
      id: q.id,
      text: q.question, // API uses 'question', component expects 'text'
      answer_type_id: q.edu_fb_answer_type_id, // API uses 'edu_fb_answer_type_id'
      answer_type:
        q.edu_fb_answer_type_id === 1
          ? "mcq"
          : q.edu_fb_answer_type_id === 2
            ? "likert"
            : q.edu_fb_answer_type_id === 3
              ? "custom"
              : "text",
      category_id:
        q.edu_fb_category_ey_id ||
        q.edu_fb_category_pr_id ||
        q.edu_fb_category_sc_id,
      predefined_answers: (q.predefined_answers || []).map((a: any) => ({
        id: a.id,
        text: a.predefined_answer, // API uses 'predefined_answer', component expects 'text'
        weight: a.predefined_answer_weight || a.weight || 0,
        marks: a.marks || 0,
        question_id: q.id,
      })),
      marks: q.marks || 5,
      required: q.required || false,
    }));
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

  // Create grades list for filter - include "All" option plus all grade levels
  const filterGradesOptions = React.useMemo(() => {
    return [
      { id: null, name: "All Grades", display_name: "All Grades" },
      ...availableGrades,
    ];
  }, [availableGrades]);

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
          (sub: any) => sub.name,
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
      (q) => q.text || `Question ${q.id}`,
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

  // Backend now handles all filtering - no client-side filtering needed
  // The existingFeedbacks array already contains filtered and paginated data from the backend
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
      showAddEvaluationForm === feedbackId ? null : feedbackId,
    );
  };

  // Rating submissions have a uuid id; past (classic) feedback has a numeric row id
  const isRatingId = (id: any) => typeof id === "string" && id.includes("-");

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
              const result = isRatingId(expandedItemId)
                ? await deleteRatingEvaluation({
                    submission_id: String(expandedItemId),
                    evaluation_id: evaluationId,
                  }).unwrap()
                : await deleteEvaluation(evaluationId).unwrap();
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
                [{ text: "OK" }],
              );
            }
          },
        },
      ],
    );
  };

  const handleDeleteFeedback = async (feedbackId: string | number) => {
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
                feedbackId,
              );
              if (isRatingId(feedbackId)) {
                await deleteRatingFeedback({
                  submission_id: String(feedbackId),
                }).unwrap();
              } else {
                await deleteFeedback(String(feedbackId)).unwrap();
              }
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
                [{ text: "OK" }],
              );
            } catch (error) {
              console.error("❌ Failed to delete feedback:", error);
              Alert.alert(
                "Error",
                "Failed to delete feedback. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleSubmitEvaluation = async (evaluationData: {
    edu_fb_id: number | string;
    edu_fd_evaluation_type_id: number;
    reviewer_feedback: string;
    is_parent_visible: boolean;
  }) => {
    try {
      console.log("🚀 Submitting evaluation with data:", evaluationData);
      if (isRatingId(evaluationData.edu_fb_id)) {
        // For a rating submission the item id is its submission_id
        const { edu_fb_id, ...rest } = evaluationData;
        await addRatingEvaluation({
          ...rest,
          submission_id: String(edu_fb_id),
        }).unwrap();
      } else {
        await addEvaluation(evaluationData as any).unwrap();
      }
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
    setWizardStep(0);
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

  const handleQuestionClick = (questionId: string) => {
    setSelectedQuestionId(
      selectedQuestionId === questionId ? null : questionId,
    );
  };

  const handleQuestionAnswer = (
    questionId: string,
    answer: any,
    marks?: number,
    weight?: number,
    answerId?: number,
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
      (answer) => answer.marks !== undefined && answer.marks > 0,
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
        0,
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
        selectedSubcategories.filter((sub) => sub !== subcategory),
      );
    } else {
      // Add subcategory (max 5)
      if (selectedSubcategories.length < 5) {
        setSelectedSubcategories([...selectedSubcategories, subcategory]);
      } else {
        Alert.alert(
          "Maximum Limit",
          "You can select up to 5 subcategories only.",
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
      ],
    );
  };

  const isFormValid = () => {
    if (isRatingMode) {
      return (
        selectedGradeId &&
        selectedStudents.length > 0 &&
        ratingComment.trim() &&
        Object.values(categoryRatings).some((r) => r > 0)
      );
    }
    return (
      selectedGradeId &&
      selectedStudents.length > 0 &&
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

    if (selectedStudents.length === 0) {
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
      (q: any) => questionnaireAnswers[q.id],
    );

    if (
      requiredQuestions.length > 0 &&
      answeredRequiredQuestions.length < requiredQuestions.length
    ) {
      const unansweredCount =
        requiredQuestions.length - answeredRequiredQuestions.length;
      missingFields.push(
        `• ${unansweredCount} required questionnaire question(s)`,
      );
    }

    // Show validation errors
    if (missingFields.length > 0) {
      const warningText =
        warnings.length > 0 ? `\n\nWarnings:\n${warnings.join("\n")}` : "";
      Alert.alert(
        "Required Fields Missing",
        `Please complete the following required fields:\n\n${missingFields.join("\n")}${warningText}\n\nNote: Subcategories are optional.`,
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
        ],
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
            (cat: any) => cat.name === mainCategory,
          );
          const categoryId = selectedCategoryData?.id;

          if (!categoryId) {
            throw new Error(
              "Category ID not found. Please select a valid category.",
            );
          }

          // Additional validation for required backend fields
          if (!selectedGradeId) {
            throw new Error(
              "Grade level ID is required for backend submission.",
            );
          }

          if (selectedStudents.length === 0) {
            throw new Error(
              "At least one student must be selected for backend submission.",
            );
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
            }),
          );

          // Transform subcategories to backend format
          const subcategories_formatted = selectedSubcategories.map(
            (subcategoryName) => ({
              subcategory_name: subcategoryName,
            }),
          );

          // Prepare data for API submission in backend format
          const feedbackData = {
            student_ids: selectedStudents.map((student) => student.id),
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
              original_student_names: selectedStudents
                .map((s) => s.name || s.full_name)
                .join(", "),
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
        "Feedback Submission",
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

      // Extract status and message using the same logic as handleAPIError
      const getErrorStatus = (err: any): number | null => {
        return (
          err?.status || err?.data?.status || err?.response?.status || null
        );
      };
      const getErrorMessage = (err: any): string | null => {
        return (
          err?.data?.message ||
          err?.message ||
          err?.response?.data?.message ||
          null
        );
      };
      const status = getErrorStatus(error);
      const message = getErrorMessage(error);

      // Determine error title based on error type
      let errorTitle = "Submission Failed";
      if (status === 401) errorTitle = "Authentication Error";
      else if (status === 403) errorTitle = "Permission Denied";
      else if (status === 404) errorTitle = "Not Found";
      else if (status === 422) errorTitle = "Validation Error";
      else if (status === 500) errorTitle = "Server Error";
      else if (message?.includes("network")) errorTitle = "Network Error";

      // Show error with conditional retry option
      const showRetry = status !== 401 && status !== 403 && status !== 404;

      Alert.alert(
        errorTitle,
        errorMessage,
        showRetry
          ? [
              { text: "Cancel", style: "cancel" },
              { text: "Retry", onPress: () => performSubmission() },
            ]
          : [{ text: "OK" }],
      );
    }
  };

  const handleSubmitRatingFeedback = async () => {
    if (!isFormValid() || !selectedGradeId || !categoryApiType) return;

    try {
      await submitRatingFeedback({
        student_ids: selectedStudents.map((s) => s.id),
        grade_level_id: selectedGradeId,
        grade_level_class_id: selectedGradeId,
        section: categoryApiType as "ey" | "pr" | "sc",
        comment: ratingComment.trim(),
        ratings: Object.entries(categoryRatings)
          .filter(([, rating]) => rating > 0)
          .map(([categoryId, rating]) => ({
            category_id: Number(categoryId),
            rating,
          })),
      }).unwrap();

      Alert.alert("Success", "Feedback submitted successfully.");
      resetForm();
    } catch (error: any) {
      Alert.alert(
        "Submission Failed",
        error?.data?.message || "Failed to submit feedback. Please try again.",
      );
    }
  };

  const resetForm = () => {
    setWizardStep(0);
    setRatingComment("");
    setCategoryRatings({});
    setSelectedGradeId(null);
    setSelectedStudents([]);
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
    if (paginationInfo.has_next && !isPaginationLoading) {
      setIsPaginationLoading(true);
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (paginationInfo.has_previous && !isPaginationLoading) {
      setIsPaginationLoading(true);
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= paginationInfo.total_pages) {
      setCurrentPage(page);
    }
  };

  const renderStarRating = (
    rating: number,
    onRatingPress?: (rating: number) => void,
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
          {/* Search Section - Hidden as per requirements */}
          {/* <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
          </TouchableWithoutFeedback> */}

          {/* Grade filter */}
          <View style={styles.newFilterContainer}>
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
          </View>

          {/* Content Area */}
          <View style={styles.contentAreaWrapper}>
            {feedbacksLoading || isPaginationLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#920734" />
              </View>
            ) : feedbacksError ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={48} color="#F44336" />
                <Text style={styles.errorText}>Failed to load feedback.</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => refetchFeedbacks()}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : existingFeedbacks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="feedback" size={48} color="#CCC" />
                <Text style={styles.emptyText}>No feedback found</Text>
              </View>
            ) : (
              <Animated.View
                key={`page-${currentPage}`}
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(150)}
                style={{ flex: 1 }}
              >
                <ScrollView
                  style={styles.feedbackList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  onScrollBeginDrag={Keyboard.dismiss}
                >
                  {existingFeedbacks.map((item) => {
                    if (!item?.student) return null;
                    const isExpanded = expandedItemId === item.id;

                    return (
                      <FeedbackCard
                        key={item.id}
                        item={item}
                        isExpanded={isExpanded}
                        onToggle={() => handleActionPress(item)}
                        isEditing={editingCommentId === item.id}
                        editedComment={editedComment}
                        onEditedCommentChange={setEditedComment}
                        onEditComment={(comment) =>
                          handleEditComment(item.id, comment)
                        }
                        onCancelEdit={handleCancelEdit}
                        onSaveComment={() =>
                          handleSaveComment(item.comment_feedback_id ?? item.id)
                        }
                        isSavingComment={isCreatingComment}
                        onDelete={() => handleDeleteFeedback(item.id)}
                        isDeleting={isDeletingFeedback}
                        onToggleEvaluation={() =>
                          handleToggleAddEvaluationForm(item.id)
                        }
                        isEvaluationOpen={showAddEvaluationForm === item.id}
                        showEvaluation={item.type !== "rating"}
                      >
                        {item.type !== "rating" && (
                          <>
                        <EvaluationSection
                          feedbackItem={item}
                          isExpanded={isExpanded}
                          showAddEvaluationForm={showAddEvaluationForm}
                          onToggleAddEvaluationForm={
                            handleToggleAddEvaluationForm
                          }
                          onDeleteEvaluation={handleDeleteEvaluation}
                          onDeleteFeedback={handleDeleteFeedback}
                          onSubmitEvaluation={handleSubmitEvaluation}
                          isDeletingFeedback={isDeletingFeedback}
                          isDeletingEvaluation={isDeletingEvaluation}
                        />
                        {showAddEvaluationForm === item.id && (
                          <AddEvaluationForm
                            feedbackItem={item}
                            onSubmit={handleSubmitEvaluation}
                            onCancel={() =>
                              handleToggleAddEvaluationForm(item.id)
                            }
                          />
                        )}
                          </>
                        )}
                      </FeedbackCard>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            )}
          </View>

          {/* Pagination */}
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[
                styles.paginationButton,
                (!paginationInfo.has_previous || isPaginationLoading) &&
                  styles.disabledButton,
              ]}
              onPress={handlePreviousPage}
              disabled={!paginationInfo.has_previous || isPaginationLoading}
            >
              <MaterialIcons
                name="chevron-left"
                size={24}
                color={!paginationInfo.has_previous ? "#CCC" : "#920734"}
              />
            </TouchableOpacity>

            <Text style={styles.pageText}>
              {paginationInfo.current_page} / {totalPages}
            </Text>

            <TouchableOpacity
              style={[
                styles.paginationButton,
                (!paginationInfo.has_next || isPaginationLoading) &&
                  styles.disabledButton,
              ]}
              onPress={handleNextPage}
              disabled={!paginationInfo.has_next || isPaginationLoading}
            >
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={!paginationInfo.has_next ? "#CCC" : "#920734"}
              />
            </TouchableOpacity>
          </View>

          {/* Add Feedback Modal */}
          <Modal
            visible={showAddFeedbackModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowAddFeedbackModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.addFeedbackModal}>
                <AddFeedbackWizard
                  stepTitles={wizardStepTitles}
                  currentStep={wizardStep}
                  canProceed={canProceedWizardStep}
                  isSubmitting={isSubmitting || isSubmittingRating}
                  onBack={() => setWizardStep((s) => Math.max(0, s - 1))}
                  onNext={() => setWizardStep((s) => s + 1)}
                  onSubmit={
                    isRatingMode
                      ? handleSubmitRatingFeedback
                      : handleSubmitFeedback
                  }
                  onClose={() => setShowAddFeedbackModal(false)}
                >
                  {wizardStep === 0 && (
                    <View>
                      <Text style={styles.sectionTitle}>Grade</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 16 }}
                      >
                        {availableGrades.map((grade: GradeLevel) => (
                          <TouchableOpacity
                            key={grade.id}
                            style={[
                              styles.gradeFilterChip,
                              selectedGradeId === grade.id &&
                                styles.gradeFilterChipSelected,
                            ]}
                            onPress={() => {
                              setSelectedGradeId(grade.id);
                              setSelectedStudents([]); // Clear students when grade changes
                            }}
                          >
                            <Text
                              style={[
                                styles.gradeFilterText,
                                selectedGradeId === grade.id &&
                                  styles.gradeFilterTextSelected,
                              ]}
                            >
                              {grade.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      {selectedGradeId && (
                        <>
                          <Text style={styles.sectionTitle}>
                            Students ({selectedStudents.length} selected)
                          </Text>
                          <StudentSelectionWithPagination
                            gradeId={selectedGradeId}
                            onStudentSelect={(student) => {
                              if (!student) return;
                              setSelectedStudents((prev) =>
                                prev.some((s) => s.id === student.id)
                                  ? prev.filter((s) => s.id !== student.id)
                                  : [...prev, student],
                              );
                            }}
                            selectedStudent={null}
                            selectedStudents={selectedStudents}
                            pageSize={10}
                            enableInfiniteScroll={true}
                            showSelectAllButton={true}
                            onSelectAll={(students) =>
                              setSelectedStudents(students)
                            }
                            onDeselectAll={() => setSelectedStudents([])}
                            style={{ marginTop: 8 }}
                          />
                        </>
                      )}
                    </View>
                  )}

                  {wizardStep === 1 && isRatingMode && (
                    <RatingCommentStep
                      comment={ratingComment}
                      onCommentChange={setRatingComment}
                    />
                  )}

                  {wizardStep === 2 && isRatingMode && (
                    <RatingCategoriesStep
                      categories={ratingCategories || []}
                      isLoading={ratingCategoriesLoading}
                      hasError={!!ratingCategoriesError}
                      ratings={categoryRatings}
                      onRatingChange={(categoryId, rating) =>
                        setCategoryRatings((prev) => ({
                          ...prev,
                          [categoryId]: rating,
                        }))
                      }
                    />
                  )}

                  {wizardStep === 1 && !isRatingMode && (
                    <View>
                      {categoriesLoading ? (
                        <ActivityIndicator size="small" color="#920734" />
                      ) : allMainCategories.length === 0 ? (
                        <Text style={styles.categoryHelpText}>
                          No categories available for this grade.
                        </Text>
                      ) : (
                        <View style={styles.subcategoriesGrid}>
                          {allMainCategories.map((category) => (
                            <TouchableOpacity
                              key={category}
                              style={[
                                styles.gradeFilterChip,
                                mainCategory === category &&
                                  styles.gradeFilterChipSelected,
                              ]}
                              onPress={() => handleMainCategorySelect(category)}
                            >
                              <Text
                                style={[
                                  styles.gradeFilterText,
                                  mainCategory === category &&
                                    styles.gradeFilterTextSelected,
                                ]}
                              >
                                {category}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {!!mainCategory && (
                        <View style={{ marginTop: 16 }}>
                          <QuestionnaireComponent
                            questions={questionnaireData || []}
                            answers={questionnaireAnswers}
                            selectedQuestionId={
                              selectedQuestionId?.toString() || null
                            }
                            onQuestionSelect={(questionId) =>
                              setSelectedQuestionId(
                                questionId ? parseInt(questionId) : null,
                              )
                            }
                            onAnswerChange={handleQuestionAnswer}
                          />
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
                    </View>
                  )}

                  {wizardStep === 2 && !isRatingMode && (
                    <TextInput
                      ref={descriptionInputRef}
                      style={styles.descriptionInput}
                      placeholder="Enter feedback description..."
                      multiline
                      numberOfLines={6}
                      value={feedbackDescription}
                      onChangeText={setFeedbackDescription}
                      textAlignVertical="top"
                    />
                  )}
                </AddFeedbackWizard>
              </View>
            </View>
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
  contentAreaWrapper: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  feedbackList: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  categoryHelpText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
    fontStyle: "italic",
  },
  // Main Category Styles
  // Inline Category Form Styles

  // MCQ Options Builder Styles
  // Subcategory Styles for Feedback Form
  subcategoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  descriptionInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#E0E0E0",
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
  // Questionnaire Modal Styles
  // answerTypeLabel: {
  //   fontSize: 12,
  //   fontWeight: "600",
  //   color: "#666",
  //   marginBottom: 6,
  // },
  // Scale Answer Styles
  // Predefined Answer Styles
  // Custom Answer Styles
  // Navigation Styles
  // Inline Questionnaire Styles
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
  // Student Section Header Styles
  // Validation Info Styles
  // Loading and Error States
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    margin: 16,
  },
  errorContainer: {
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
  // ADD CATEGORY OVERLAY STYLES
  // Marks Input Styles
  // Likert Scale Styles
  // MCQ Styles
  // Custom Answer Styles
  // New Filter Styles
  newFilterContainer: {
    backgroundColor: "#F8F9FA",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
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
  // Evaluation Modal Styles
  timelineConnector: {
    position: "absolute",
    left: 20,
    top: 60,
    width: 2,
    height: 30,
    backgroundColor: "#E0E0E0",
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

  // Fixed Bottom Action Bar Styles

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
