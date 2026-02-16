import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface PredefinedAnswer {
  id: number;
  text: string;
  weight: number;
  marks: number;
  question_id: number;
}

interface Question {
  id: number;
  text: string;
  answer_type: "mcq" | "text" | "number" | "boolean" | "likert" | "custom";
  answer_type_id?: number; // 1=MCQ, 2=Likert, 3=Custom
  category_id?: number;
  mcq_options?: string[];
  predefined_answers?: PredefinedAnswer[];
  marks?: number;
  required?: boolean;
}

interface QuestionAnswer {
  answer: string | number | boolean;
  marks?: number;
  weight?: number;
  answerId?: number;
}

interface QuestionnaireComponentProps {
  questions: Question[];
  answers: Record<string, QuestionAnswer>;
  onAnswerChange: (
    questionId: string,
    answer: any,
    marks?: number,
    weight?: number,
    answerId?: number,
  ) => void;
  selectedQuestionId?: string | null;
  onQuestionSelect?: (questionId: string | null) => void;
  isReadOnly?: boolean;
  showValidationErrors?: boolean;
}

/**
 * QuestionnaireComponent - Reusable component for answering questionnaires
 *
 * Features:
 * - Supports multiple question types: MCQ, Text, Number, Boolean
 * - Real-time answer validation
 * - Expandable question cards
 * - Required field validation
 * - Marks calculation for MCQ questions
 * - Read-only mode for viewing responses
 */
const QuestionnaireComponent: React.FC<QuestionnaireComponentProps> = ({
  questions,
  answers,
  onAnswerChange,
  selectedQuestionId,
  onQuestionSelect,
  isReadOnly = false,
  showValidationErrors = false,
}) => {
  // State for custom marks input for each question
  const [customMarksState, setCustomMarksState] = React.useState<
    Record<string, string>
  >({});
  // Get answer for a question
  const getAnswerForQuestion = (
    questionId: string,
  ): QuestionAnswer | undefined => {
    return answers[questionId];
  };

  // Check if question is answered
  const isQuestionAnswered = (question: Question): boolean => {
    const answer = getAnswerForQuestion(question.id.toString());
    if (!answer) return false;

    if (question.answer_type === "text") {
      return (
        typeof answer.answer === "string" && answer.answer.trim().length > 0
      );
    }

    return (
      answer.answer !== undefined &&
      answer.answer !== null &&
      answer.answer !== ""
    );
  };

  // Check if question has validation error
  const hasValidationError = (question: Question): boolean => {
    return (
      showValidationErrors && question.required && !isQuestionAnswered(question)
    );
  };

  // Handle MCQ selection
  const handleMCQSelection = (
    question: Question,
    option: string,
    index: number,
    predefinedAnswer?: PredefinedAnswer,
  ) => {
    if (isReadOnly) return;

    if (predefinedAnswer) {
      // Use predefined answer data
      onAnswerChange(
        question.id.toString(),
        option,
        predefinedAnswer.marks,
        predefinedAnswer.weight,
        predefinedAnswer.id,
      );
    } else {
      // Fallback to old logic for backward compatibility
      const marks = question.marks ? Math.max(1, question.marks - index) : 1;
      onAnswerChange(question.id.toString(), option, marks);
    }
  };

  // Handle text input change
  const handleTextChange = (question: Question, text: string) => {
    if (isReadOnly) return;

    onAnswerChange(question.id.toString(), text, question.marks || 0);
  };

  // Handle number input change
  const handleNumberChange = (question: Question, value: string) => {
    if (isReadOnly) return;

    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      onAnswerChange(question.id.toString(), numericValue, question.marks || 0);
    } else if (value === "") {
      onAnswerChange(question.id.toString(), "", question.marks || 0);
    }
  };

  // Handle boolean selection
  const handleBooleanSelection = (question: Question, value: boolean) => {
    if (isReadOnly) return;

    onAnswerChange(question.id.toString(), value, question.marks || 0);
  };

  // Handle Likert scale selection
  const handleLikertSelection = (
    question: Question,
    value: number,
    label: string,
  ) => {
    if (isReadOnly) return;

    onAnswerChange(question.id.toString(), label, value, value, undefined);
  };

  // Handle custom answer change
  const handleCustomAnswerChange = (
    question: Question,
    text: string,
    marks: number,
  ) => {
    if (isReadOnly) return;

    onAnswerChange(question.id.toString(), text, marks, marks, undefined);
  };

  // Toggle question expansion
  const toggleQuestionExpansion = (questionId: string) => {
    console.log("🔄 Question toggle:", {
      questionId,
      currentSelected: selectedQuestionId,
      willExpand: selectedQuestionId !== questionId,
    });

    if (onQuestionSelect) {
      onQuestionSelect(selectedQuestionId === questionId ? null : questionId);
    }
  };

  // Render MCQ options
  const renderMCQOptions = (question: Question) => {
    const currentAnswer = getAnswerForQuestion(question.id.toString());

    // Use predefined answers if available, otherwise fall back to mcq_options
    const optionsToRender =
      question.predefined_answers ||
      question.mcq_options?.map((option, index) => ({
        id: index,
        text: option,
        weight: question.marks ? Math.max(1, question.marks - index) : 1,
        marks: question.marks ? Math.max(1, question.marks - index) : 1,
        question_id: question.id,
      })) ||
      [];

    console.log("🎯 MCQ Options Debug:", {
      questionId: question.id,
      predefined_answers: question.predefined_answers,
      mcq_options: question.mcq_options,
      optionsToRender: optionsToRender,
      optionsCount: optionsToRender.length,
    });

    return (
      <View style={styles.mcqContainer}>
        {optionsToRender.map((optionData, index) => {
          const isSelected = currentAnswer?.answer === optionData.text;

          return (
            <TouchableOpacity
              key={optionData.id}
              style={[
                styles.mcqOption,
                isSelected && styles.selectedMCQOption,
                isReadOnly && styles.readOnlyOption,
              ]}
              onPress={() =>
                handleMCQSelection(
                  question,
                  optionData.text,
                  index,
                  question.predefined_answers
                    ? (optionData as PredefinedAnswer)
                    : undefined,
                )
              }
              disabled={isReadOnly}
            >
              <View
                style={[
                  styles.mcqIndicator,
                  isSelected && styles.selectedMCQIndicator,
                ]}
              >
                {isSelected && (
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                )}
              </View>

              <View style={styles.mcqContent}>
                <Text
                  style={[
                    styles.mcqOptionText,
                    isSelected && styles.selectedMCQOptionText,
                  ]}
                >
                  {optionData.text}
                </Text>

                <View style={styles.mcqMetaContainer}>
                  <Text
                    style={[
                      styles.mcqMarks,
                      isSelected && styles.selectedMCQMarks,
                    ]}
                  >
                    {optionData.marks} mark{optionData.marks !== 1 ? "s" : ""}
                  </Text>

                  {question.predefined_answers && (
                    <Text
                      style={[
                        styles.mcqWeight,
                        isSelected && styles.selectedMCQWeight,
                      ]}
                    >
                      Weight: {optionData.weight}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render text input
  const renderTextInput = (question: Question) => {
    const currentAnswer = getAnswerForQuestion(question.id.toString());

    return (
      <TextInput
        style={[
          styles.textInput,
          hasValidationError(question) && styles.errorInput,
          isReadOnly && styles.readOnlyInput,
        ]}
        placeholder={`Enter your response${question.required ? " (required)" : ""}...`}
        placeholderTextColor="#999"
        value={(currentAnswer?.answer as string) || ""}
        onChangeText={(text) => handleTextChange(question, text)}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        editable={!isReadOnly}
      />
    );
  };

  // Render number input
  const renderNumberInput = (question: Question) => {
    const currentAnswer = getAnswerForQuestion(question.id.toString());

    return (
      <TextInput
        style={[
          styles.numberInput,
          hasValidationError(question) && styles.errorInput,
          isReadOnly && styles.readOnlyInput,
        ]}
        placeholder={`Enter a number${question.required ? " (required)" : ""}...`}
        placeholderTextColor="#999"
        value={currentAnswer?.answer?.toString() || ""}
        onChangeText={(text) => handleNumberChange(question, text)}
        keyboardType="numeric"
        editable={!isReadOnly}
      />
    );
  };

  // Render boolean options
  const renderBooleanOptions = (question: Question) => {
    const currentAnswer = getAnswerForQuestion(question.id.toString());

    return (
      <View style={styles.booleanContainer}>
        <TouchableOpacity
          style={[
            styles.booleanOption,
            currentAnswer?.answer === true && styles.selectedBooleanOption,
            isReadOnly && styles.readOnlyOption,
          ]}
          onPress={() => handleBooleanSelection(question, true)}
          disabled={isReadOnly}
        >
          <MaterialIcons
            name={
              currentAnswer?.answer === true
                ? "radio-button-checked"
                : "radio-button-unchecked"
            }
            size={20}
            color={currentAnswer?.answer === true ? "#920734" : "#999"}
          />
          <Text
            style={[
              styles.booleanOptionText,
              currentAnswer?.answer === true &&
                styles.selectedBooleanOptionText,
            ]}
          >
            Yes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.booleanOption,
            currentAnswer?.answer === false && styles.selectedBooleanOption,
            isReadOnly && styles.readOnlyOption,
          ]}
          onPress={() => handleBooleanSelection(question, false)}
          disabled={isReadOnly}
        >
          <MaterialIcons
            name={
              currentAnswer?.answer === false
                ? "radio-button-checked"
                : "radio-button-unchecked"
            }
            size={20}
            color={currentAnswer?.answer === false ? "#920734" : "#999"}
          />
          <Text
            style={[
              styles.booleanOptionText,
              currentAnswer?.answer === false &&
                styles.selectedBooleanOptionText,
            ]}
          >
            No
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render Likert scale (1-5: Very Bad, Bad, Normal, Good, Very Good)
  const renderLikertScale = (question: Question) => {
    const currentAnswer = getAnswerForQuestion(question.id.toString());
    const likertOptions = [
      { value: 1, label: "Very Bad", color: "#F44336" },
      { value: 2, label: "Bad", color: "#FF9800" },
      { value: 3, label: "Normal", color: "#FFC107" },
      { value: 4, label: "Good", color: "#4CAF50" },
      { value: 5, label: "Very Good", color: "#2E7D32" },
    ];

    return (
      <View style={styles.likertContainer}>
        {likertOptions.map((option) => {
          const isSelected = currentAnswer?.answer === option.label;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.likertOption,
                isSelected && styles.selectedLikertOption,
                isReadOnly && styles.readOnlyOption,
              ]}
              onPress={() =>
                handleLikertSelection(question, option.value, option.label)
              }
              disabled={isReadOnly}
            >
              <View
                style={[
                  styles.likertIndicator,
                  { borderColor: option.color },
                  isSelected && { backgroundColor: option.color },
                ]}
              >
                <Text
                  style={[
                    styles.likertValue,
                    isSelected && styles.selectedLikertValue,
                  ]}
                >
                  {option.value}
                </Text>
              </View>
              <Text
                style={[
                  styles.likertLabel,
                  isSelected && styles.selectedLikertLabel,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render custom answer with marks input
  const renderCustomAnswer = (question: Question) => {
    const currentAnswer = getAnswerForQuestion(question.id.toString());
    const questionId = question.id.toString();
    const customMarks =
      customMarksState[questionId] || currentAnswer?.marks?.toString() || "1";

    const setCustomMarks = (value: string) => {
      setCustomMarksState((prev) => ({
        ...prev,
        [questionId]: value,
      }));
    };

    return (
      <View style={styles.customContainer}>
        <TextInput
          style={[
            styles.customTextInput,
            hasValidationError(question) && styles.errorInput,
            isReadOnly && styles.readOnlyInput,
          ]}
          placeholder={`Enter your custom response${question.required ? " (required)" : ""}...`}
          placeholderTextColor="#999"
          value={(currentAnswer?.answer as string) || ""}
          onChangeText={(text) => {
            const marks = Math.min(5, Math.max(1, parseInt(customMarks) || 1));
            handleCustomAnswerChange(question, text, marks);
          }}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
          editable={!isReadOnly}
        />

        <View style={styles.customMarksContainer}>
          <Text style={styles.customMarksLabel}>Marks (1-5):</Text>
          <TextInput
            style={[
              styles.customMarksInput,
              isReadOnly && styles.readOnlyInput,
            ]}
            value={customMarks}
            onChangeText={(text) => {
              const numericValue = parseInt(text) || 1;
              const clampedValue = Math.min(5, Math.max(1, numericValue));
              setCustomMarks(clampedValue.toString());

              const currentText = (currentAnswer?.answer as string) || "";
              handleCustomAnswerChange(question, currentText, clampedValue);
            }}
            keyboardType="numeric"
            maxLength={1}
            editable={!isReadOnly}
          />
        </View>
      </View>
    );
  };

  if (!questions || questions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="help-outline" size={24} color="#999" />
        <Text style={styles.emptyText}>
          No questions available for this category.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Questions</Text>
      <Text style={styles.helpText}>
        Answer the questions below. Required questions are marked with an
        asterisk (*).
      </Text>

      {questions.map((question, index) => {
        const isExpanded = selectedQuestionId === question.id.toString();
        const isAnswered = isQuestionAnswered(question);
        const hasError = hasValidationError(question);

        return (
          <View
            key={question.id}
            style={[
              styles.questionCard,
              isExpanded && styles.expandedQuestionCard,
              hasError && styles.errorQuestionCard,
            ]}
          >
            <TouchableOpacity
              style={styles.questionHeader}
              onPress={() => toggleQuestionExpansion(question.id.toString())}
              activeOpacity={0.7}
            >
              <View style={styles.questionHeaderLeft}>
                <View
                  style={[
                    styles.questionNumber,
                    isAnswered && styles.answeredQuestionNumber,
                    hasError && styles.errorQuestionNumber,
                  ]}
                >
                  <Text
                    style={[
                      styles.questionNumberText,
                      isAnswered && styles.answeredQuestionNumberText,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>

                <View style={styles.questionTitleContainer}>
                  <Text
                    style={[
                      styles.questionText,
                      hasError && styles.errorQuestionText,
                    ]}
                    numberOfLines={isExpanded ? undefined : 2}
                  >
                    {question.text}
                    {question.required && (
                      <Text style={styles.requiredAsterisk}> *</Text>
                    )}
                  </Text>

                  <View style={styles.questionMeta}>
                    <Text style={styles.questionType}>
                      {question.answer_type?.toUpperCase() || 'UNKNOWN'}
                    </Text>
                    {question.marks && (
                      <Text style={styles.questionMarks}>
                        {/* {question.marks} mark{question.marks !== 1 ? "s" : ""} */}
                      </Text>
                    )}
                    {isAnswered && (
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color="#4CAF50"
                      />
                    )}
                  </View>
                </View>
              </View>

              <MaterialIcons
                name={isExpanded ? "expand-less" : "expand-more"}
                size={24}
                color="#666"
              />
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.questionContent}>
                {(() => {
                  // Debug logging for answer type rendering
                  console.log("🎯 Rendering question:", {
                    questionId: question.id,
                    text: question.text,
                    answer_type: question.answer_type,
                    answer_type_id: question.answer_type_id,
                    predefined_answers:
                      question.predefined_answers?.length || 0,
                    mcq_options: question.mcq_options?.length || 0,
                  });
                  return null;
                })()}

                {/* Render based on answer_type_id with improved logic */}
                {(question.answer_type_id === 1 ||
                  (!question.answer_type_id &&
                    question.answer_type === "mcq")) &&
                  renderMCQOptions(question)}

                {(question.answer_type_id === 2 ||
                  (!question.answer_type_id &&
                    question.answer_type === "likert")) &&
                  renderLikertScale(question)}

                {(question.answer_type_id === 3 ||
                  (!question.answer_type_id &&
                    question.answer_type === "custom")) &&
                  renderCustomAnswer(question)}

                {/* Legacy support for other answer types (only if no answer_type_id) */}
                {!question.answer_type_id &&
                  question.answer_type === "text" &&
                  renderTextInput(question)}

                {!question.answer_type_id &&
                  question.answer_type === "number" &&
                  renderNumberInput(question)}

                {!question.answer_type_id &&
                  question.answer_type === "boolean" &&
                  renderBooleanOptions(question)}

                {hasError && (
                  <Text style={styles.validationError}>
                    This question is required and must be answered.
                  </Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  helpText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  emptyContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  emptyText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
  },
  expandedQuestionCard: {
    borderColor: "#920734",
  },
  errorQuestionCard: {
    borderColor: "#F44336",
    backgroundColor: "#FFF5F5",
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  questionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  answeredQuestionNumber: {
    backgroundColor: "#4CAF50",
  },
  errorQuestionNumber: {
    backgroundColor: "#F44336",
  },
  questionNumberText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  answeredQuestionNumberText: {
    color: "#FFFFFF",
  },
  questionTitleContainer: {
    flex: 1,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
    lineHeight: 22,
  },
  errorQuestionText: {
    color: "#D32F2F",
  },
  requiredAsterisk: {
    color: "#F44336",
    fontSize: 16,
    fontWeight: "bold",
  },
  questionMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  questionType: {
    fontSize: 11,
    fontWeight: "600",
    color: "#920734",
    backgroundColor: "#F0F8FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  questionMarks: {
    fontSize: 12,
    color: "#666",
    marginRight: 8,
  },
  questionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  mcqContainer: {
    marginTop: 8,
  },
  mcqOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectedMCQOption: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  readOnlyOption: {
    opacity: 0.7,
  },
  mcqIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#920734",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  selectedMCQIndicator: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  mcqContent: {
    flex: 1,
  },
  mcqOptionText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  selectedMCQOptionText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  mcqMetaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mcqMarks: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  selectedMCQMarks: {
    color: "#E0E0E0",
  },
  mcqWeight: {
    fontSize: 11,
    color: "#920734",
    fontWeight: "600",
    backgroundColor: "#F0F8FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedMCQWeight: {
    color: "#FFFFFF",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#FFFFFF",
    minHeight: 80,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#FFFFFF",
  },
  errorInput: {
    borderColor: "#F44336",
    backgroundColor: "#FFF5F5",
  },
  readOnlyInput: {
    backgroundColor: "#F5F5F5",
    opacity: 0.7,
  },
  booleanContainer: {
    flexDirection: "row",
    marginTop: 8,
  },
  booleanOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectedBooleanOption: {
    backgroundColor: "#F0F8FF",
    borderColor: "#920734",
  },
  booleanOptionText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
  },
  selectedBooleanOptionText: {
    color: "#920734",
    fontWeight: "500",
  },
  // Likert scale styles
  likertContainer: {
    marginTop: 8,
  },
  likertOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectedLikertOption: {
    backgroundColor: "#F0F8FF",
    borderColor: "#920734",
  },
  likertIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "#FFFFFF",
  },
  likertValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  selectedLikertValue: {
    color: "#FFFFFF",
  },
  likertLabel: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  selectedLikertLabel: {
    color: "#920734",
    fontWeight: "500",
  },
  // Custom answer styles
  customContainer: {
    marginTop: 8,
  },
  customTextInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#FFFFFF",
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  customMarksContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  customMarksLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  customMarksInput: {
    borderWidth: 1,
    borderColor: "#920734",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#FFFFFF",
    textAlign: "center",
    minWidth: 40,
  },
  validationError: {
    fontSize: 12,
    color: "#F44336",
    marginTop: 8,
    fontStyle: "italic",
  },
});

export default QuestionnaireComponent;
