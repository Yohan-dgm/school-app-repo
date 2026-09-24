import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { theme } from "../../styles/theme";
import MediaViewer from "../media/MediaViewer";
import { TextWithLinks } from "../common/TextWithLinks";
import { transformMediaData } from "../../utils/mediaUtils";

// Post content longer than this shows a "See more" toggle
const TRUNCATE_LENGTH = 180;

/**
 * Shared post card used by School/Class/Student feed tabs. Handles the
 * header, truncated content, media, hashtags, and like/delete actions that
 * are identical across all three. Tab-specific bits (Class's grade/class
 * indicator, its comments section) are passed in via `extraContent` /
 * `belowActions` rather than duplicated here.
 */
const PostCard = React.memo(function PostCard({
  post,
  currentUserId,
  isLiked,
  onLike,
  onDelete,
  extraContent,
  belowActions,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongContent = (post.content?.length || 0) > TRUNCATE_LENGTH;
  const displayedContent =
    isLongContent && !isExpanded
      ? `${post.content.slice(0, TRUNCATE_LENGTH)}…`
      : post.content;

  return (
    <View style={styles.postContainer}>
      {extraContent}

      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{post.title}</Text>
          <Text style={styles.timestamp}>
            {new Date(post.created_at).toLocaleDateString()} • {post.category}
          </Text>
        </View>

        {/* Delete Button - Visible only to post creator */}
        {currentUserId === post.created_by && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(post.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="delete" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Post Content */}
      <TextWithLinks style={styles.postContent}>
        {displayedContent}
      </TextWithLinks>
      {isLongContent && (
        <TouchableOpacity onPress={() => setIsExpanded((prev) => !prev)}>
          <Text style={styles.seeMoreText}>
            {isExpanded ? "See less" : "See more"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <MediaViewer
          media={transformMediaData(post.media)}
          style={styles.mediaContainer}
        />
      )}

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && (
        <View style={styles.hashtagContainer}>
          {post.hashtags.map((hashtag, index) => (
            <Text key={`${post.id}-hashtag-${index}`} style={styles.hashtag}>
              #{hashtag}
            </Text>
          ))}
        </View>
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={[styles.actionButton, isLiked && styles.likedButton]}
          onPress={() => onLike(post)}
        >
          <Icon
            name={isLiked ? "thumb-up" : "thumb-up-off-alt"}
            size={20}
            color={isLiked ? "#3b5998" : "#666"}
          />
          <Text style={[styles.actionText, isLiked && styles.likedText]}>
            {post.likes_count}
          </Text>
        </TouchableOpacity>
      </View>

      {belowActions}
    </View>
  );
});

const styles = StyleSheet.create({
  postContainer: {
    backgroundColor: "white",
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  authorInfo: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
  },
  authorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  postContent: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 10,
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
    marginTop: -6,
    marginBottom: 10,
  },
  mediaContainer: {
    marginVertical: 10,
  },
  hashtagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 5,
  },
  hashtag: {
    color: "#3b5998",
    fontSize: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  likedButton: {
    backgroundColor: "#e3f2fd",
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#666",
  },
  likedText: {
    color: "#3b5998",
  },
});

export default PostCard;
