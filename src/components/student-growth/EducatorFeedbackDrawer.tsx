import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import { feedbackCardTheme } from "../../data/studentGrowthData";
import { useGetStudentCategoryFeedbackListQuery } from "../../api/educator-feedback-api";
import {
  useGetFeedbackModeQuery,
  useGetStudentRatingFeedbackListQuery,
} from "../../api/educator-feedback-rating-api";
import FeedbackItem from "./FeedbackItem";
import RatingFeedbackItem from "./RatingFeedbackItem";
import FeedbackPagination from "./FeedbackPagination";

const { height: screenHeight } = Dimensions.get("window");

interface EducatorFeedbackDrawerProps {
  visible: boolean;
  onClose: () => void;
  studentId: number;
  studentName?: string;
}

const pageSize = 10;

const EducatorFeedbackDrawer: React.FC<EducatorFeedbackDrawerProps> = ({
  visible,
  onClose,
  studentId,
  studentName = "Student",
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [slideAnim] = useState(new Animated.Value(screenHeight));

  // The school chooses the feedback style in the database: "rating" or "classic"
  const { data: feedbackMode, isLoading: modeLoading } =
    useGetFeedbackModeQuery(undefined, { skip: !visible });
  const isRatingMode = feedbackMode === "rating";
  const noStudent = !studentId || studentId === 0;
  const skipBase = !visible || noStudent || modeLoading;

  const classicQuery = useGetStudentCategoryFeedbackListQuery(
    { student_id: studentId, page: currentPage, page_size: pageSize },
    { skip: skipBase || isRatingMode, refetchOnMountOrArgChange: true },
  );
  const ratingQuery = useGetStudentRatingFeedbackListQuery(
    { student_id: studentId, page: currentPage, page_size: pageSize },
    { skip: skipBase || !isRatingMode, refetchOnMountOrArgChange: true },
  );

  const active = isRatingMode ? ratingQuery : classicQuery;
  const isLoading = modeLoading || active.isLoading;
  const { isError, error, refetch } = active;

  // Same shape for both lists
  const items: any[] = isRatingMode
    ? ratingQuery.data?.data?.feedbacks || []
    : classicQuery.data?.data?.feedback_list || [];
  const totalRecords: number = isRatingMode
    ? ratingQuery.data?.data?.pagination?.total_count || 0
    : classicQuery.data?.data?.pagination?.total || 0;
  const totalPages = Math.max(Math.ceil(totalRecords / pageSize), 1);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Start from the first page whenever the drawer opens
  useEffect(() => {
    if (visible) {
      setCurrentPage(1);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const renderMessage = (
    icon: any,
    color: string,
    title: string,
    subtitle: string,
    showRetry = false,
  ) => (
    <View style={styles.messageContainer}>
      <View style={[styles.messageIcon, { backgroundColor: color + "18" }]}>
        <MaterialIcons name={icon} size={36} color={color} />
      </View>
      <Text style={styles.messageTitle}>{title}</Text>
      <Text style={styles.messageSubtitle}>{subtitle}</Text>
      {showRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <MaterialIcons name="refresh" size={18} color="#FFF" />
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderError = () => {
    const status = (error as any)?.status ?? (error as any)?.data?.status;
    if (status === 401 || status === "authentication-required") {
      return renderMessage(
        "lock-outline",
        "#F59E0B",
        "Sign in required",
        "Please log in to view educator feedback.",
      );
    }
    if (status === 404 || status === "not-found") {
      return renderMessage(
        "search-off",
        "#FF6B35",
        "Not available yet",
        "Educator feedback is not available on the server yet.",
      );
    }
    const message =
      (error as any)?.data?.message || (error as any)?.message || "";
    return renderMessage(
      "error-outline",
      feedbackCardTheme.error,
      "Couldn't load feedback",
      message || "Please try again.",
      true,
    );
  };

  const renderContent = () => {
    if (noStudent) {
      return renderMessage(
        "person-outline",
        feedbackCardTheme.grayMedium,
        "No student selected",
        "Select a student to see their educator feedback.",
      );
    }
    if (isLoading) {
      return (
        <View style={styles.messageContainer}>
          <ActivityIndicator size="large" color={feedbackCardTheme.primary} />
        </View>
      );
    }
    if (isError) return renderError();
    if (items.length === 0) {
      return renderMessage(
        "chat-bubble-outline",
        feedbackCardTheme.grayMedium,
        "No feedback yet",
        `No educator feedback has been shared for ${studentName} yet.`,
      );
    }

    return (
      <>
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {items.map((feedback: any, index: number) =>
            isRatingMode ? (
              <RatingFeedbackItem
                key={feedback.id}
                feedback={feedback}
                index={index}
              />
            ) : (
              <FeedbackItem
                key={feedback.id}
                feedback={feedback}
                index={index}
              />
            ),
          )}
        </ScrollView>

        {totalRecords > pageSize && (
          <FeedbackPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            pageSize={pageSize}
            onPreviousPage={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            onNextPage={() =>
              setCurrentPage((p) => Math.min(p + 1, totalPages))
            }
            isLoading={isLoading}
          />
        )}
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />

      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
      </TouchableOpacity>

      <Animated.View
        style={[styles.drawer, { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Educator Feedback</Text>
            <View style={styles.subtitleRow}>
              <Text style={styles.subtitle} numberOfLines={1}>
                {studentName}
              </Text>
              {totalRecords > 0 && (
                <View style={styles.countChip}>
                  <Text style={styles.countChipText}>{totalRecords}</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="close"
              size={20}
              color={feedbackCardTheme.grayDark}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>{renderContent()}</View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.45)" },
  drawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.88,
    backgroundColor: feedbackCardTheme.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: "#D5D5D5",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: "700", color: feedbackCardTheme.black },
  subtitleRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  subtitle: {
    fontSize: 14,
    color: feedbackCardTheme.grayMedium,
    flexShrink: 1,
  },
  countChip: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: feedbackCardTheme.primary + "18",
  },
  countChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: feedbackCardTheme.primary,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ECECEC",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingTop: 4, paddingBottom: 12 },
  messageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  messageIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: feedbackCardTheme.black,
    marginBottom: 6,
    textAlign: "center",
  },
  messageSubtitle: {
    fontSize: 14,
    color: feedbackCardTheme.grayMedium,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: feedbackCardTheme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    marginTop: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
    marginLeft: 8,
  },
});

export default EducatorFeedbackDrawer;
