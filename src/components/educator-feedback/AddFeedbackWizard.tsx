import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";

interface AddFeedbackWizardProps {
  stepTitles: string[];
  currentStep: number;
  canProceed: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

// Step shell for Add Feedback: title, progress bar, scrolling body, Back/Next(Submit) footer
const AddFeedbackWizard: React.FC<AddFeedbackWizardProps> = ({
  stepTitles,
  currentStep,
  canProceed,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
  onClose,
  children,
}) => {
  const isLast = currentStep === stepTitles.length - 1;
  const disabled = !canProceed || isSubmitting;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.stepCount}>
            Step {currentStep + 1} of {stepTitles.length}
          </Text>
          <Text style={styles.title}>{stepTitles[currentStep]}</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <MaterialIcons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.progress}>
        {stepTitles.map((title, index) => (
          <View
            key={title}
            style={[styles.bar, index <= currentStep && styles.barActive]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={currentStep === 0 ? onClose : onBack}
          disabled={isSubmitting}
        >
          <Text style={styles.backText}>
            {currentStep === 0 ? "Cancel" : "Back"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, disabled && styles.nextDisabled]}
          onPress={isLast ? onSubmit : onNext}
          disabled={disabled}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.nextText}>{isLast ? "Submit" : "Next"}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  headerText: { flex: 1 },
  stepCount: { fontSize: 12, color: theme.colors.textSecondary },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 2,
  },
  progress: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginRight: 6,
  },
  barActive: { backgroundColor: theme.colors.primary },
  body: { flex: 1, paddingHorizontal: theme.spacing.md },
  footer: {
    flexDirection: "row",
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  backButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginRight: 8,
  },
  backText: { fontSize: 16, color: theme.colors.textSecondary },
  nextButton: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary,
  },
  nextDisabled: { opacity: 0.4 },
  nextText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
});

export default AddFeedbackWizard;
