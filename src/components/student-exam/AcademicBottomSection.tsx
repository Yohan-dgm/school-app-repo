import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import LinearGradient from "react-native-linear-gradient";
import { modernTheme } from "../../styles/modernTheme";
import { AnimatedCard } from "../ui/AnimatedCard";
import { PerformanceRing } from "../ui/PerformanceRing";
import { StudentExamData } from "../../types/student-exam";

interface AcademicBottomSectionProps {
  data: StudentExamData;
}

const { width } = Dimensions.get("window");

const AcademicBottomSection: React.FC<AcademicBottomSectionProps> = ({
  data,
}) => {
  const [activeWidget, setActiveWidget] = useState<
    "calendar" | "gpa" | "goals" | "tips"
  >("calendar");

  // Calculate academic metrics
  const academicMetrics = useMemo(() => {
    const examMarks = data?.student_exam_marks || [];
    const reports = data?.student_exam_reports || [];

    if (examMarks.length === 0) {
      return {
        currentGPA: 0,
        totalCredits: 0,
        upcomingExams: [],
        recentExams: [],
        academicGoals: [],
      };
    }

    // Calculate GPA (simplified 4.0 scale)
    const currentGPA =
      examMarks.length > 0
        ? (
            examMarks.reduce((sum, exam) => {
              const percentage = exam.percentage || 0;
              // Convert percentage to 4.0 scale
              if (percentage >= 85) return sum + 4.0;
              if (percentage >= 75) return sum + 3.0;
              if (percentage >= 65) return sum + 2.0;
              if (percentage >= 55) return sum + 1.0;
              return sum + 0.0;
            }, 0) / examMarks.length
          ).toFixed(2)
        : "0.00";

    // Get recent and upcoming exams
    const now = new Date();
    const recentExams = examMarks
      .filter(
        (exam) => exam.exam?.exam_date && new Date(exam.exam.exam_date) <= now,
      )
      .sort(
        (a, b) =>
          new Date(b.exam?.exam_date || 0).getTime() -
          new Date(a.exam?.exam_date || 0).getTime(),
      )
      .slice(0, 3);

    const upcomingExams = examMarks
      .filter(
        (exam) => exam.exam?.exam_date && new Date(exam.exam.exam_date) > now,
      )
      .sort(
        (a, b) =>
          new Date(a.exam?.exam_date || 0).getTime() -
          new Date(b.exam?.exam_date || 0).getTime(),
      )
      .slice(0, 3);

    // Academic goals (mock data - would come from backend)
    const academicGoals = [
      { id: 1, title: "Maintain 85% Average", progress: 78, target: 85 },
      { id: 2, title: "Improve Mathematics", progress: 72, target: 80 },
      { id: 3, title: "Perfect Attendance", progress: 94, target: 100 },
    ];

    return {
      currentGPA: parseFloat(currentGPA),
      totalCredits: examMarks.length * 3, // Mock credits
      upcomingExams,
      recentExams,
      academicGoals,
    };
  }, [data]);

  // Study tips (rotating)
  const studyTips = [
    "📚 Review notes within 24 hours for better retention",
    "🎯 Set specific study goals for each session",
    "⏰ Use the Pomodoro Technique for focused study",
    "🤝 Form study groups with classmates",
    "📝 Practice past exam papers regularly",
    "💡 Teach concepts to others to solidify understanding",
    "🧠 Take regular breaks to avoid mental fatigue",
    "🎵 Find your ideal study environment and music",
  ];

  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const nextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % studyTips.length);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "TBD";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "TBD";
    }
  };

  const renderCalendarWidget = () => (
    <View style={styles.widgetContent}>
      <Text style={styles.widgetTitle}>Upcoming Exams</Text>
      {academicMetrics.upcomingExams.length > 0 ? (
        academicMetrics.upcomingExams.map((exam, index) => (
          <View key={index} style={styles.examItem}>
            <View style={styles.examDate}>
              <Text style={styles.examDateText}>
                {formatDate(exam.exam?.exam_date || "")}
              </Text>
            </View>
            <View style={styles.examInfo}>
              <Text style={styles.examName} numberOfLines={1}>
                {exam.exam?.exam_name || "Exam"}
              </Text>
              <Text style={styles.examType}>
                {exam.exam?.exam_type || "Regular"}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.noDataText}>No upcoming exams scheduled</Text>
      )}
    </View>
  );

  const renderGPAWidget = () => (
    <View style={styles.widgetContent}>
      <Text style={styles.widgetTitle}>GPA Calculator</Text>
      <View style={styles.gpaContainer}>
        <PerformanceRing
          percentage={(academicMetrics.currentGPA / 4.0) * 100}
          size={80}
          strokeWidth={8}
          showLabel={false}
          color={modernTheme.colors.primary}
        />
        <View style={styles.gpaDetails}>
          <Text style={styles.gpaValue}>{academicMetrics.currentGPA}</Text>
          <Text style={styles.gpaScale}>/ 4.0</Text>
          <Text style={styles.creditsText}>
            {academicMetrics.totalCredits} Credits
          </Text>
        </View>
      </View>
    </View>
  );

  const renderGoalsWidget = () => (
    <View style={styles.widgetContent}>
      <Text style={styles.widgetTitle}>Academic Goals</Text>
      {academicMetrics.academicGoals.map((goal) => (
        <View key={goal.id} style={styles.goalItem}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalTitle} numberOfLines={1}>
              {goal.title}
            </Text>
            <Text style={styles.goalProgress}>{goal.progress}%</Text>
          </View>
          <View style={styles.goalProgressBar}>
            <View
              style={[
                styles.goalProgressFill,
                {
                  width: `${(goal.progress / goal.target) * 100}%`,
                  backgroundColor:
                    goal.progress >= goal.target
                      ? modernTheme.colors.success
                      : modernTheme.colors.primary,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );

  const renderTipsWidget = () => (
    <View style={styles.widgetContent}>
      <Text style={styles.widgetTitle}>Study Tip</Text>
      <View style={styles.tipContainer}>
        <Text style={styles.tipText}>{studyTips[currentTipIndex]}</Text>
        <TouchableOpacity onPress={nextTip} style={styles.nextTipButton}>
          <MaterialIcons
            name="refresh"
            size={18}
            color={modernTheme.colors.primary}
          />
          <Text style={styles.nextTipText}>Next Tip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderActiveWidget = () => {
    switch (activeWidget) {
      case "calendar":
        return renderCalendarWidget();
      case "gpa":
        return renderGPAWidget();
      case "goals":
        return renderGoalsWidget();
      case "tips":
        return renderTipsWidget();
      default:
        return renderCalendarWidget();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Academic Dashboard</Text>

      {/* Widget Selector */}
      <View style={styles.widgetSelector}>
        {[
          { id: "calendar", icon: "event", label: "Calendar" },
          { id: "gpa", icon: "calculate", label: "GPA" },
          { id: "goals", icon: "flag", label: "Goals" },
          { id: "tips", icon: "lightbulb", label: "Tips" },
        ].map((widget) => (
          <TouchableOpacity
            key={widget.id}
            onPress={() => setActiveWidget(widget.id as any)}
            style={[
              styles.widgetTab,
              activeWidget === widget.id && styles.activeWidgetTab,
            ]}
          >
            <MaterialIcons
              name={widget.icon as any}
              size={16}
              color={
                activeWidget === widget.id
                  ? modernTheme.colors.textInverse
                  : modernTheme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.widgetTabText,
                activeWidget === widget.id && styles.activeWidgetTabText,
              ]}
            >
              {widget.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Active Widget */}
      <AnimatedCard variant="gradient" style={styles.widgetCard}>
        {renderActiveWidget()}
      </AnimatedCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: modernTheme.spacing.xxxl,
    paddingBottom: modernTheme.spacing.xl,
  },

  sectionTitle: {
    fontFamily: modernTheme.fonts.heading,
    fontSize: modernTheme.fontSizes.title,
    color: modernTheme.colors.primary,
    marginBottom: modernTheme.spacing.lg,
    textAlign: "center",
  },

  // Widget Selector
  widgetSelector: {
    flexDirection: "row",
    backgroundColor: modernTheme.colors.surface,
    borderRadius: modernTheme.borderRadius.lg,
    padding: 4,
    marginBottom: modernTheme.spacing.lg,
    ...modernTheme.shadows.sm,
  },

  widgetTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: modernTheme.spacing.xs,
    paddingVertical: modernTheme.spacing.sm,
    borderRadius: modernTheme.borderRadius.md,
  },

  activeWidgetTab: {
    backgroundColor: modernTheme.colors.primary,
  },

  widgetTabText: {
    fontFamily: modernTheme.fonts.caption,
    fontSize: modernTheme.fontSizes.tiny,
    color: modernTheme.colors.textSecondary,
  },

  activeWidgetTabText: {
    color: modernTheme.colors.textInverse,
    fontFamily: modernTheme.fonts.title,
  },

  // Widget Card
  widgetCard: {
    minHeight: modernTheme.layout.bottomSectionHeight,
    padding: modernTheme.spacing.lg,
  },

  widgetContent: {
    flex: 1,
  },

  widgetTitle: {
    fontFamily: modernTheme.fonts.title,
    fontSize: modernTheme.fontSizes.body,
    color: modernTheme.colors.text,
    marginBottom: modernTheme.spacing.md,
    textAlign: "center",
  },

  // Calendar Widget
  examItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: modernTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: modernTheme.colors.borderLight,
  },

  examDate: {
    width: 50,
    alignItems: "center",
    marginRight: modernTheme.spacing.md,
  },

  examDateText: {
    fontFamily: modernTheme.fonts.title,
    fontSize: modernTheme.fontSizes.caption,
    color: modernTheme.colors.primary,
  },

  examInfo: {
    flex: 1,
  },

  examName: {
    fontFamily: modernTheme.fonts.title,
    fontSize: modernTheme.fontSizes.caption,
    color: modernTheme.colors.text,
  },

  examType: {
    fontFamily: modernTheme.fonts.caption,
    fontSize: modernTheme.fontSizes.tiny,
    color: modernTheme.colors.textSecondary,
    marginTop: 2,
  },

  // GPA Widget
  gpaContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: modernTheme.spacing.lg,
  },

  gpaDetails: {
    alignItems: "center",
  },

  gpaValue: {
    fontFamily: modernTheme.fonts.heading,
    fontSize: 32,
    color: modernTheme.colors.primary,
  },

  gpaScale: {
    fontFamily: modernTheme.fonts.title,
    fontSize: modernTheme.fontSizes.body,
    color: modernTheme.colors.textSecondary,
    marginTop: -8,
  },

  creditsText: {
    fontFamily: modernTheme.fonts.caption,
    fontSize: modernTheme.fontSizes.small,
    color: modernTheme.colors.textSecondary,
    marginTop: modernTheme.spacing.xs,
  },

  // Goals Widget
  goalItem: {
    marginBottom: modernTheme.spacing.md,
  },

  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: modernTheme.spacing.xs,
  },

  goalTitle: {
    fontFamily: modernTheme.fonts.title,
    fontSize: modernTheme.fontSizes.caption,
    color: modernTheme.colors.text,
    flex: 1,
  },

  goalProgress: {
    fontFamily: modernTheme.fonts.title,
    fontSize: modernTheme.fontSizes.caption,
    color: modernTheme.colors.primary,
  },

  goalProgressBar: {
    height: 4,
    backgroundColor: modernTheme.colors.borderLight,
    borderRadius: modernTheme.borderRadius.xs,
    overflow: "hidden",
  },

  goalProgressFill: {
    height: "100%",
    borderRadius: modernTheme.borderRadius.xs,
  },

  // Tips Widget
  tipContainer: {
    alignItems: "center",
    paddingVertical: modernTheme.spacing.lg,
  },

  tipText: {
    fontFamily: modernTheme.fonts.bodyRegular,
    fontSize: modernTheme.fontSizes.body,
    color: modernTheme.colors.text,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: modernTheme.spacing.lg,
  },

  nextTipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: modernTheme.spacing.xs,
    paddingHorizontal: modernTheme.spacing.md,
    paddingVertical: modernTheme.spacing.sm,
    backgroundColor: modernTheme.colors.glass,
    borderRadius: modernTheme.borderRadius.md,
  },

  nextTipText: {
    fontFamily: modernTheme.fonts.title,
    fontSize: modernTheme.fontSizes.caption,
    color: modernTheme.colors.primary,
  },

  // No Data
  noDataText: {
    fontFamily: modernTheme.fonts.bodyRegular,
    fontSize: modernTheme.fontSizes.caption,
    color: modernTheme.colors.textTertiary,
    textAlign: "center",
    paddingVertical: modernTheme.spacing.xl,
  },
});

export default AcademicBottomSection;
