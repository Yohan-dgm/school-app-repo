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
import FeedbackCommentModal from "./FeedbackCommentModal";
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

  // Modal state for full comment popup
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);

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

    if (getMainComment()) {
      setIsCommentModalVisible(true);
    }

    if (onPress) onPress();
  };

  // Handle comment modal close
  const handleCommentModalClose = () => {
    setIsCommentModalVisible(false);
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
          <View style={styles.categoryIcon}>
            <MaterialIcons
              name="psychology"
              size={13}
              color={feedbackCardTheme.primary}
            />
          </View>

          <View style={styles.categoryInfo}>
            <View style={styles.categoryTitleRow}>
              <Text style={styles.categoryTitle} numberOfLines={1}>
                {feedback.category.name}
              </Text>
              {!isActive && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>Inactive</Text>
                </View>
              )}
            </View>
            <Text style={styles.metaText} numberOfLines={1}>
              {feedback.created_by.call_name_with_title} •{" "}
              {formatDate(feedback.created_at)}
            </Text>
          </View>

          <View style={styles.ratingCompact}>
            <AnimatedStarRating
              rating={ratingValue}
              size={10}
              animationDelay={getStarAnimationDelay()}
              showRatingText={false}
              compact={true}
            />
            <Text
              style={[
                styles.ratingCompactText,
                { color: getRatingColor(ratingValue) },
              ]}
            >
              {ratingValue.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* Comment */}
        {getMainComment() && (
          <Text style={styles.commentText} numberOfLines={2}>
            {getMainComment()}
          </Text>
        )}

        {/* Evaluations Link */}
        {feedback.evaluations && feedback.evaluations.length > 0 && (
          <TouchableOpacity
            style={styles.evaluationsRow}
            onPress={handleEvaluationsPress}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="list-alt"
              size={13}
              color={feedbackCardTheme.primary}
            />
            <Text style={styles.evaluationsRowText}>
              View all evaluations ({feedback.evaluations.length})
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={14}
              color={feedbackCardTheme.primary}
            />
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

      {/* Full Comment Modal */}
      <FeedbackCommentModal
        visible={isCommentModalVisible}
        onClose={handleCommentModalClose}
        categoryName={feedback.category.name}
        comment={getMainComment()}
        ratingText={`${ratingValue.toFixed(1)} • ${getRatingText(ratingValue)}`}
        creatorName={feedback.created_by.call_name_with_title}
        dateText={formatDate(feedback.created_at)}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 12,
    marginVertical: 3,
  },
  card: {
    backgroundColor: feedbackCardTheme.surface,
    borderRadius: 10,
    padding: 10,
    shadowColor: feedbackCardTheme.shadow.medium,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: feedbackCardTheme.primary,
  },
  inactiveCard: {
    opacity: 0.7,
    borderLeftColor: feedbackCardTheme.grayMedium,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  categoryIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: feedbackCardTheme.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  categoryInfo: {
    flex: 1,
    marginRight: 8,
  },
  categoryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: feedbackCardTheme.black,
  },
  metaText: {
    fontSize: 10,
    color: feedbackCardTheme.grayMedium,
    fontWeight: "500",
    marginTop: 1,
  },
  inactiveBadge: {
    backgroundColor: feedbackCardTheme.grayLight,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  inactiveBadgeText: {
    fontSize: 9,
    color: feedbackCardTheme.grayMedium,
    fontWeight: "600",
  },
  ratingCompact: {
    alignItems: "flex-end",
  },
  ratingCompactText: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 1,
  },
  commentText: {
    fontSize: 12,
    color: feedbackCardTheme.grayDark,
    lineHeight: 15,
    marginBottom: 4,
  },
  evaluationsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  evaluationsRowText: {
    fontSize: 11,
    fontWeight: "600",
    color: feedbackCardTheme.primary,
    marginLeft: 6,
    flex: 1,
  },
});

export default FeedbackItem;
