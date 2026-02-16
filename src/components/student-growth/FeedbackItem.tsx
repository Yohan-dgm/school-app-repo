import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { feedbackCardTheme } from "../../data/studentGrowthData";
import AnimatedStarRating from "./AnimatedStarRating";
import EvaluationsListModal from "./EvaluationsListModal";
import ParentCommentSection from "./ParentCommentSection";

interface FeedbackItemData {
  id: number;
  edu_fb_id?: string; // Added for parent comments
  student_id: number;
  category: {
    id: number;
    name: string;
  };
  comments: {
    id: number;
    comment: string;
  }[];
  rating: string | number; // Can be string or number from API
  created_at: string;
  status: number; // Using status instead of is_active
  created_by: {
    id: number;
    call_name_with_title: string;
  };
  evaluations: {
    id: number;
    edu_fb_id: number;
    edu_fd_evaluation_type_id: number;
    reviewer_feedback: string;
    created_at: string;
    is_parent_visible: number;
    is_active: boolean;
    created_by: {
      id: number;
      call_name_with_title: string;
    };
    evaluation_type: {
      id: number;
      name: string;
      status_code: number;
    };
  }[];
}

interface FeedbackItemProps {
  feedback: FeedbackItemData;
  index: number;
  onPress?: () => void;
}

const FeedbackItem: React.FC<FeedbackItemProps> = ({
  feedback,
  index,
  onPress,
}) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Modal state for evaluations list
  const [isEvaluationsModalVisible, setIsEvaluationsModalVisible] =
    useState(false);

  // Helper function to safely parse rating from string or number
  const parseRating = (rating: string | number): number => {
    if (typeof rating === "number") return rating;
    if (typeof rating === "string") return parseFloat(rating) || 0;
    return 0;
  };

  const ratingValue = parseRating(feedback.rating);

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return feedbackCardTheme.success;
    if (rating >= 3.5) return feedbackCardTheme.warning;
    if (rating >= 2.0) return feedbackCardTheme.error;
    return feedbackCardTheme.grayMedium;
  };

  const getRatingText = (rating: number) => {
    if (rating >= 4.5) return "Excellent";
    if (rating >= 3.5) return "Good";
    if (rating >= 2.0) return "Needs Improvement";
    return "Poor";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Animation effects
  useEffect(() => {
    const delay = index * 150; // Staggered animation

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [index]);

  // Press animation
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (onPress) onPress();
  };

  // Helper to get the main comment text
  const getMainComment = () => {
    if (feedback.comments && feedback.comments.length > 0) {
      return feedback.comments[0].comment;
    }
    return "";
  };

  // Helper to determine if feedback is inactive (assuming status 2 is active)
  const isActive = feedback.status === 2;

  // Calculate animation delay for star rating
  const getStarAnimationDelay = () => {
    return index * 150 + 400; // Start after card animation
  };

  // Handle evaluations list press
  const handleEvaluationsPress = () => {
    console.log(
      "📋 FeedbackItem - Opening evaluations list for category:",
      feedback.category.name,
    );
    setIsEvaluationsModalVisible(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsEvaluationsModalVisible(false);
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
        !isActive && styles.inactiveCard,
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.95}
      >
        {/* Card Header */}
        <View style={styles.header}>
          <View style={styles.categorySection}>
            <View style={styles.categoryIcon}>
              <MaterialIcons
                name="psychology"
                size={20}
                color={feedbackCardTheme.primary}
              />
            </View>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryTitle} numberOfLines={1}>
                {feedback.category.name}
              </Text>
              <Text style={styles.categorySubtitle}>
                {getRatingText(ratingValue)}
              </Text>
            </View>
            {!isActive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </View>

          <AnimatedStarRating
            rating={ratingValue}
            size={18}
            animationDelay={getStarAnimationDelay()}
            showRatingText={false}
            compact={true}
          />
        </View>

        {/* Rating Badge */}
        <View style={styles.ratingBadgeContainer}>
          <View
            style={[
              styles.ratingBadge,
              { backgroundColor: getRatingColor(ratingValue) + "15" },
            ]}
          >
            <Text
              style={[
                styles.ratingBadgeText,
                { color: getRatingColor(ratingValue) },
              ]}
            >
              {ratingValue.toFixed(1)} • {getRatingText(ratingValue)}
            </Text>
          </View>
        </View>

        {/* Comment Section */}
        {getMainComment() && (
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Feedback Comment</Text>
            <Text style={styles.commentText} numberOfLines={3}>
              {getMainComment()}
            </Text>
          </View>
        )}

        {/* Meta Information */}
        <View style={styles.metaSection}>
          <View style={styles.creatorInfo}>
            <MaterialIcons
              name="person"
              size={16}
              color={feedbackCardTheme.grayMedium}
            />
            <Text style={styles.creatorText}>
              {feedback.created_by.call_name_with_title}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatDate(feedback.created_at)}</Text>
        </View>

        {/* Evaluations Button */}
        {feedback.evaluations && feedback.evaluations.length > 0 && (
          <TouchableOpacity
            style={styles.evaluationsButton}
            onPress={handleEvaluationsPress}
            activeOpacity={0.8}
          >
            <View style={styles.evaluationsButtonContent}>
              <MaterialIcons
                name="list"
                size={18}
                color={feedbackCardTheme.white}
              />
              <Text style={styles.evaluationsButtonText}>
                View All Evaluations ({feedback.evaluations.length})
              </Text>
              <MaterialIcons
                name="arrow-forward"
                size={16}
                color={feedbackCardTheme.white}
              />
            </View>
          </TouchableOpacity>
        )}

        {/* Parent Comments Section */}
        {feedback.id && (
          <ParentCommentSection
            feedbackId={String(feedback.id)}
            compact={true}
          />
        )}
      </TouchableOpacity>

      {/* Evaluations List Modal */}
      <EvaluationsListModal
        visible={isEvaluationsModalVisible}
        onClose={handleModalClose}
        evaluations={feedback.evaluations || []}
        categoryName={feedback.category.name}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 12, // Reduced from 16
    marginVertical: 6, // Reduced from 8
  },
  card: {
    backgroundColor: feedbackCardTheme.surface,
    borderRadius: 12, // Reduced from 16
    padding: 14, // Reduced from 20
    shadowColor: feedbackCardTheme.shadow.medium,
    shadowOffset: { width: 0, height: 3 }, // Reduced from 4
    shadowOpacity: 1,
    shadowRadius: 10, // Reduced from 12
    elevation: 6, // Reduced from 8
    borderLeftWidth: 3, // Reduced from 4
    borderLeftColor: feedbackCardTheme.primary,
  },
  inactiveCard: {
    opacity: 0.7,
    borderLeftColor: feedbackCardTheme.grayMedium,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12, // Reduced from 16
  },
  categorySection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12, // Reduced from 16
  },
  categoryIcon: {
    width: 34, // Reduced from 40
    height: 34, // Reduced from 40
    borderRadius: 17, // Reduced from 20
    backgroundColor: feedbackCardTheme.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10, // Reduced from 12
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15, // Reduced from 16
    fontWeight: "700",
    color: feedbackCardTheme.black,
    marginBottom: 2,
  },
  categorySubtitle: {
    fontSize: 12, // Reduced from 13
    color: feedbackCardTheme.grayMedium,
    fontWeight: "500",
  },
  inactiveBadge: {
    backgroundColor: feedbackCardTheme.grayLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  inactiveBadgeText: {
    fontSize: 10,
    color: feedbackCardTheme.grayMedium,
    fontWeight: "600",
  },
  ratingBadgeContainer: {
    marginBottom: 12, // Reduced from 16
  },
  ratingBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 16, // Reduced from 20
    paddingHorizontal: 10, // Reduced from 12
    paddingVertical: 5, // Reduced from 6
  },
  ratingBadgeText: {
    fontSize: 11, // Reduced from 12
    fontWeight: "600",
  },
  commentSection: {
    marginBottom: 12, // Reduced from 16
  },
  commentLabel: {
    fontSize: 11, // Reduced from 12
    fontWeight: "600",
    color: feedbackCardTheme.grayMedium,
    marginBottom: 5, // Reduced from 6
  },
  commentText: {
    fontSize: 13, // Reduced from 14
    color: feedbackCardTheme.grayDark,
    lineHeight: 18, // Reduced from 20
  },
  metaSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10, // Reduced from 12
  },
  creatorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  creatorText: {
    fontSize: 12, // Reduced from 13
    color: feedbackCardTheme.grayMedium,
    fontWeight: "500",
    marginLeft: 5, // Reduced from 6
  },
  dateText: {
    fontSize: 11, // Reduced from 12
    color: feedbackCardTheme.grayMedium,
    fontWeight: "500",
  },
  evaluationsButton: {
    marginTop: 10, // Reduced from 12
    borderTopWidth: 1,
    borderTopColor: feedbackCardTheme.grayLight,
    paddingTop: 10, // Reduced from 12
  },
  evaluationsButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: feedbackCardTheme.primary,
    borderRadius: 20, // Reduced from 24
    paddingVertical: 10, // Reduced from 12
    paddingHorizontal: 16, // Reduced from 20
    shadowColor: feedbackCardTheme.shadow.small,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  evaluationsButtonText: {
    fontSize: 13, // Reduced from 14
    fontWeight: "600",
    color: feedbackCardTheme.white,
    marginHorizontal: 6, // Reduced from 8
    flex: 1,
    textAlign: "center",
  },
});

export default FeedbackItem;
