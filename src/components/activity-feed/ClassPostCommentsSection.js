import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { theme } from "../../styles/theme";
import {
  useGetClassPostCommentsQuery,
  useCreateClassPostCommentMutation,
  useDeleteClassPostCommentMutation,
} from "../../api/activity-feed-api";

// Comment text longer than this shows a "See more" toggle
const COMMENT_TRUNCATE_LENGTH = 120;

const ClassPostCommentsSection = ({ postId, commentsCount = 0 }) => {
  const [showAll, setShowAll] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [expandedComments, setExpandedComments] = useState({});

  // Collapsed (default): only the 2 most recent comments.
  const { data: previewData, isLoading: isPreviewLoading } =
    useGetClassPostCommentsQuery(
      { post_id: postId, page: 1, page_size: 2, order: "desc" },
      { skip: showAll },
    );

  // Expanded (after "View all comments"): every comment on the post.
  const { data: fullData, isLoading: isFullLoading } =
    useGetClassPostCommentsQuery(
      { post_id: postId, page: 1, page_size: 50, order: "asc" },
      { skip: !showAll },
    );

  const [createComment, { isLoading: isPosting }] =
    useCreateClassPostCommentMutation();
  const [deleteComment] = useDeleteClassPostCommentMutation();

  // Preview comments come back newest-first; reverse for chronological display.
  const previewComments = [...(previewData?.comments || [])].reverse();
  const fullComments = fullData?.comments || [];
  const displayedComments = showAll ? fullComments : previewComments;
  const totalComments =
    (showAll ? fullData?.pagination?.total : previewData?.pagination?.total) ??
    commentsCount;
  const isLoading = showAll ? isFullLoading : isPreviewLoading;
  const hasMoreToLoad = !showAll && totalComments > displayedComments.length;

  const handleSend = async () => {
    const content = commentText.trim();
    if (!content) return;

    try {
      setCommentText("");
      await createComment({ post_id: postId, content }).unwrap();
    } catch (error) {
      console.error("❌ Failed to add comment:", error);
      Alert.alert("Error", "Failed to add comment. Please try again.");
    }
  };

  const handleDelete = (commentId) => {
    Alert.alert("Delete Comment", "Delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteComment({ id: commentId, post_id: postId }).unwrap();
          } catch (error) {
            console.error("❌ Failed to delete comment:", error);
            Alert.alert("Error", "Failed to delete comment. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {totalComments > 0 && (
        <View style={styles.countRow}>
          <Icon name="chat-bubble-outline" size={16} color="#666" />
          <Text style={styles.actionText}>
            {totalComments} {totalComments === 1 ? "Comment" : "Comments"}
          </Text>
        </View>
      )}

      <View>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={styles.loadingIndicator}
          />
        ) : (
          <>
            {displayedComments.map((comment) => {
              const isCommentExpanded = !!expandedComments[comment.id];
              const isCommentLong =
                (comment.content?.length || 0) > COMMENT_TRUNCATE_LENGTH;
              const displayedCommentText =
                isCommentLong && !isCommentExpanded
                  ? `${comment.content.slice(0, COMMENT_TRUNCATE_LENGTH)}…`
                  : comment.content;

              return (
                <View key={comment.id} style={styles.commentRow}>
                  <View style={styles.commentBubble}>
                    <Text style={styles.commentAuthor}>
                      {comment.user_name}
                    </Text>
                    <Text style={styles.commentContent}>
                      {displayedCommentText}
                    </Text>
                    {isCommentLong && (
                      <TouchableOpacity
                        onPress={() =>
                          setExpandedComments((prev) => ({
                            ...prev,
                            [comment.id]: !isCommentExpanded,
                          }))
                        }
                      >
                        <Text style={styles.commentSeeMoreText}>
                          {isCommentExpanded ? "See less" : "See more"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {comment.is_own && (
                    <TouchableOpacity
                      onPress={() => handleDelete(comment.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="close" size={16} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {hasMoreToLoad && (
              <TouchableOpacity
                onPress={() => setShowAll(true)}
                style={styles.loadMoreButton}
              >
                <Text style={styles.loadMoreText}>
                  View all {totalComments} comments
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Write a comment..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={isPosting || !commentText.trim()}
            style={styles.sendButton}
          >
            <Icon
              name="send"
              size={20}
              color={commentText.trim() ? theme.colors.primary : "#ccc"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#666",
  },
  loadingIndicator: {
    paddingVertical: 12,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  commentContent: {
    fontSize: 12,
    color: theme.colors.text,
  },
  commentSeeMoreText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
    marginTop: 2,
  },
  loadMoreButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  loadMoreText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 4,
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    padding: 6,
  },
});

export default ClassPostCommentsSection;
