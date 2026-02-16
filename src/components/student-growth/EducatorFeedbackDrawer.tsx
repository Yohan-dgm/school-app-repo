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
import {
  modernColors,
  maroonTheme,
  feedbackCardTheme,
} from "../../data/studentGrowthData";
import { useGetStudentCategoryFeedbackListQuery } from "../../api/educator-feedback-api";
import FeedbackItem from "./FeedbackItem";
import FeedbackPagination from "./FeedbackPagination";

const { height: screenHeight } = Dimensions.get("window");

interface EducatorFeedbackDrawerProps {
  visible: boolean;
  onClose: () => void;
  studentId: number;
  studentName?: string;
}

const EducatorFeedbackDrawer: React.FC<EducatorFeedbackDrawerProps> = ({
  visible,
  onClose,
  studentId,
  studentName = "Student",
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [slideAnim] = useState(new Animated.Value(screenHeight));
  const pageSize = 10;

  // API call for feedback data
  const {
    data: apiResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetStudentCategoryFeedbackListQuery(
    {
      student_id: studentId,
      page: currentPage,
      page_size: pageSize,
    },
    {
      skip: !visible || !studentId || studentId === 0,
      refetchOnMountOrArgChange: true,
    }
  );

  console.log("📋 EducatorFeedbackDrawer - API Response:", apiResponse);
  console.log("📋 EducatorFeedbackDrawer - Current Page:", currentPage);
  console.log("📋 EducatorFeedbackDrawer - Loading:", isLoading);
  console.log("📋 EducatorFeedbackDrawer - Student ID:", studentId);
  console.log("📋 EducatorFeedbackDrawer - Visible:", visible);
  console.log(
    "📋 EducatorFeedbackDrawer - API Query Skip:",
    !visible || !studentId || studentId === 0
  );
  console.log("📋 EducatorFeedbackDrawer - API Error:", error);

  // Animation effects
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

  // Reset page when drawer opens
  useEffect(() => {
    if (visible) {
      setCurrentPage(1);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(
      (apiResponse?.data?.pagination?.total || 0) / pageSize
    );
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleFeedbackPress = (feedback: any) => {
    console.log("📋 Feedback selected:", feedback);
    // Future: Open detailed view modal
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={feedbackCardTheme.primary} />
      <Text style={styles.loadingText}>Loading feedback data...</Text>
    </View>
  );

  const renderErrorState = () => {
    // Check for different error types
    const isAuthError =
      error &&
      typeof error === "object" &&
      (("status" in error && (error as any).status === 401) ||
        ("data" in error &&
          (error as any).data?.status === "authentication-required"));

    const isServerError =
      error &&
      typeof error === "object" &&
      (("status" in error && (error as any).status === 500) ||
        ("data" in error && (error as any).data?.status === "server-error"));

    const isNotFoundError =
      error &&
      typeof error === "object" &&
      (("status" in error && (error as any).status === 404) ||
        ("data" in error && (error as any).data?.status === "not-found"));

    let iconName = "error-outline";
    let iconColor = feedbackCardTheme.error;
    let title = "Unable to Load Feedback";
    let subtitle = "Please try again later";
    let showRetry = true;

    if (isAuthError) {
      iconName = "lock-outline";
      iconColor = "#F59E0B";
      title = "Authentication Required";
      subtitle = "Please log in to view educator feedback data";
      showRetry = false;
    } else if (isServerError) {
      iconName = "build-outline";
      iconColor = "#FF6B35";
      title = "Feature Under Development";
      subtitle =
        "The educator feedback feature is not yet available on the server. Please check back later.";
      showRetry = false;
    } else if (isNotFoundError) {
      iconName = "search-off";
      iconColor = "#FF6B35";
      title = "Feature Not Available";
      subtitle = "The educator feedback API endpoint is not available yet.";
      showRetry = false;
    } else if (
      error &&
      typeof error === "object" &&
      "data" in error &&
      (error as any).data?.message
    ) {
      subtitle = (error as any).data.message;
    } else if (error && typeof error === "object" && "message" in error) {
      subtitle = (error as any).message;
    }

    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name={iconName} size={48} color={iconColor} />
        <Text style={[styles.errorTitle, { color: iconColor }]}>{title}</Text>
        <Text style={styles.errorSubtitle}>{subtitle}</Text>
        {showRetry && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <MaterialIcons
              name="refresh"
              size={20}
              color={feedbackCardTheme.white}
            />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons
        name="feedback"
        size={64}
        color={feedbackCardTheme.grayMedium}
      />
      <Text style={styles.emptyTitle}>No Feedback Available</Text>
      <Text style={styles.emptySubtitle}>
        No educator feedback has been recorded for {studentName} yet.
      </Text>
    </View>
  );

  const renderContent = () => {
    console.log("📋 renderContent - isLoading:", isLoading);
    console.log("📋 renderContent - isError:", isError);
    console.log("📋 renderContent - apiResponse:", apiResponse);

    // If no valid student ID, show appropriate message
    if (!studentId || studentId === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="person-outline"
            size={64}
            color={feedbackCardTheme.grayMedium}
          />
          <Text style={styles.emptyTitle}>No Student Selected</Text>
          <Text style={styles.emptySubtitle}>
            Please select a student to view their educator feedback.
          </Text>
        </View>
      );
    }

    if (isLoading) {
      return renderLoadingState();
    }

    if (isError) {
      return renderErrorState();
    }

    const feedbackList = apiResponse?.data?.feedback_list || [];
    const pagination = apiResponse?.data?.pagination;

    console.log("📋 renderContent - feedbackList:", feedbackList);
    console.log("📋 renderContent - feedbackList length:", feedbackList.length);
    console.log("📋 renderContent - pagination:", pagination);

    if (feedbackList.length === 0) {
      return renderEmptyState();
    }

    return (
      <>
        <ScrollView
          style={styles.feedbackList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.feedbackListContent}
        >
          {feedbackList.map((feedback: any, index: number) => (
            <FeedbackItem
              key={feedback.id}
              feedback={feedback}
              index={index}
              onPress={() => handleFeedbackPress(feedback)}
            />
          ))}
        </ScrollView>

        {pagination && pagination.total > pageSize && (
          <FeedbackPagination
            currentPage={currentPage}
            totalPages={Math.ceil(pagination.total / pageSize)}
            totalRecords={pagination.total}
            pageSize={pageSize}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
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

      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
      </TouchableOpacity>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <MaterialIcons
              name="feedback"
              size={24}
              color={feedbackCardTheme.primary}
            />
            <View style={styles.headerText}>
              <Text style={styles.title}>Educator Feedback</Text>
              <Text style={styles.subtitle}>
                Feedback history for {studentName}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="close"
              size={24}
              color={feedbackCardTheme.grayMedium}
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>{renderContent()}</View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  drawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.85,
    backgroundColor: feedbackCardTheme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: feedbackCardTheme.shadow.large,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: feedbackCardTheme.grayMedium + "40",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: feedbackCardTheme.grayLight,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: feedbackCardTheme.black,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: feedbackCardTheme.grayMedium,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  feedbackList: {
    flex: 1,
  },
  feedbackListContent: {
    paddingTop: 8,
    paddingBottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: feedbackCardTheme.grayMedium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: feedbackCardTheme.error,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 14,
    color: feedbackCardTheme.grayMedium,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: feedbackCardTheme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: feedbackCardTheme.white,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: feedbackCardTheme.grayMedium,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: feedbackCardTheme.grayMedium,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default EducatorFeedbackDrawer;
