import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { feedbackCardTheme } from "../../data/studentGrowthData";
import ParentCommentSection from "./ParentCommentSection";

interface RatingFeedbackItemProps {
  feedback: {
    id: string;
    comment: string;
    comment_feedback_id: number;
    created_at: string;
    created_by?: { call_name_with_title?: string };
    average_rating: number;
    // past feedback can carry a school note (parent-visible evaluation)
    evaluations?: {
      reviewer_feedback?: string;
      evaluation_type?: { name?: string };
    }[];
    ratings: {
      feedback_id: number;
      category: { name: string };
      rating: number;
    }[];
  };
  index: number;
}

const scoreColor = (score: number) =>
  score >= 4
    ? feedbackCardTheme.success
    : score >= 3
      ? feedbackCardTheme.warning
      : feedbackCardTheme.error;

const initials = (name = "") =>
  name
    .replace(/^(Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "E";

// Parent view of one rating-mode submission: comment + a rating bar per category
const RatingFeedbackItem: React.FC<RatingFeedbackItemProps> = ({
  feedback,
  index,
}) => {
  const [expanded, setExpanded] = useState(false);
  const educator = feedback.created_by?.call_name_with_title || "Educator";
  const date = feedback.created_at
    ? new Date(feedback.created_at).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  const average = Number(feedback.average_rating) || 0;
  const note = feedback.evaluations?.[0];

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 6) * 70).duration(350)}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(educator)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.educator} numberOfLines={1}>
            {educator}
          </Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: scoreColor(average) }]}>
          <Text style={styles.badgeText}>{average.toFixed(1)}</Text>
        </View>
      </View>

      {!!feedback.comment && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setExpanded((e) => !e)}
        >
          <Text style={styles.comment} numberOfLines={expanded ? undefined : 3}>
            {feedback.comment}
          </Text>
          {feedback.comment.length > 110 && (
            <Text style={styles.more}>
              {expanded ? "Show less" : "Read more"}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.ratings}>
        {feedback.ratings.map((item) => (
          <View key={item.feedback_id} style={styles.ratingRow}>
            <View style={styles.ratingTop}>
              <Text style={styles.category} numberOfLines={1}>
                {item.category.name}
              </Text>
              <Text style={[styles.score, { color: scoreColor(item.rating) }]}>
                {item.rating.toFixed(1)}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.min(item.rating / 5, 1) * 100}%`,
                    backgroundColor: scoreColor(item.rating),
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {!!note?.reviewer_feedback && (
        <View style={styles.note}>
          <Text style={styles.noteTitle}>
            {note.evaluation_type?.name || "School note"}
          </Text>
          <Text style={styles.noteText}>{note.reviewer_feedback}</Text>
        </View>
      )}

      {!!feedback.comment_feedback_id && (
        <ParentCommentSection
          feedbackId={String(feedback.comment_feedback_id)}
          compact={true}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: feedbackCardTheme.surface,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: feedbackCardTheme.primary + "18",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: feedbackCardTheme.primary,
  },
  headerText: { flex: 1 },
  educator: {
    fontSize: 15,
    fontWeight: "600",
    color: feedbackCardTheme.black,
  },
  date: { fontSize: 12, color: feedbackCardTheme.grayMedium, marginTop: 2 },
  badge: {
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: "center",
  },
  badgeText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  comment: {
    fontSize: 14,
    lineHeight: 21,
    color: feedbackCardTheme.grayDark,
  },
  more: {
    fontSize: 13,
    fontWeight: "600",
    color: feedbackCardTheme.primary,
    marginTop: 4,
  },
  ratings: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: feedbackCardTheme.grayLight,
  },
  note: {
    backgroundColor: feedbackCardTheme.primary + "10",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: feedbackCardTheme.primary,
    marginBottom: 2,
  },
  noteText: { fontSize: 13, lineHeight: 19, color: feedbackCardTheme.grayDark },
  ratingRow: { marginBottom: 10 },
  ratingTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  category: {
    flex: 1,
    fontSize: 13,
    color: feedbackCardTheme.grayDark,
    marginRight: 8,
  },
  score: { fontSize: 13, fontWeight: "700" },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: feedbackCardTheme.grayLight,
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: 3 },
});

export default RatingFeedbackItem;
