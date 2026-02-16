import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { feedbackCardTheme } from "../../data/studentGrowthData";
import {
  useGetParentCommentsQuery,
  useCreateParentCommentMutation,
  useUpdateParentCommentMutation,
  useDeleteParentCommentMutation,
} from "../../api/educator-feedback-api";
import ParentCommentItem from "./ParentCommentItem";

interface ParentCommentSectionProps {
  feedbackId: string; // edu_fb_id
  compact?: boolean;
}

const ParentCommentSection: React.FC<ParentCommentSectionProps> = ({
  feedbackId,
  compact = true,
}) => {
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");

  const inputHeightAnim = useRef(new Animated.Value(0)).current;

  // API hooks
  const {
    data: commentsResponse,
    isLoading: isLoadingComments,
    error: commentsError,
  } = useGetParentCommentsQuery(
    { edu_fb_id: feedbackId },
    { skip: !feedbackId }
  );

  const [createComment, { isLoading: isCreating }] =
    useCreateParentCommentMutation();
  const [updateComment, { isLoading: isUpdating }] =
    useUpdateParentCommentMutation();
  const [deleteComment, { isLoading: isDeleting }] =
    useDeleteParentCommentMutation();

  // Extract comments from response
  const comments = commentsResponse?.data || [];
  const hasComments = comments.length > 0;

  console.log("💬 ParentCommentSection - feedbackId:", feedbackId);
  console.log("💬 ParentCommentSection - comments:", comments);
  console.log("💬 ParentCommentSection - isLoading:", isLoadingComments);

  // Handle add comment button
  const handleAddCommentPress = () => {
    setIsAddingComment(true);
    Animated.spring(inputHeightAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  // Handle cancel add
  const handleCancelAdd = () => {
    setNewCommentText("");
    setIsAddingComment(false);
    Animated.timing(inputHeightAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  // Handle submit new comment
  const handleSubmitComment = async () => {
    if (newCommentText.trim().length === 0) {
      Alert.alert("Invalid Comment", "Please enter a comment before submitting");
      return;
    }

    try {
      await createComment({
        edu_fb_id: feedbackId,
        comment: newCommentText.trim(),
      }).unwrap();

      // Success - clear input and close
      setNewCommentText("");
      setIsAddingComment(false);
      Animated.timing(inputHeightAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();

      // Optional: Show success message
      // Alert.alert("Success", "Comment added successfully");
    } catch (error: any) {
      console.error("❌ Failed to create comment:", error);
      Alert.alert(
        "Error",
        error?.data?.message || "Failed to add comment. Please try again."
      );
    }
  };

  // Handle update comment
  const handleUpdateComment = async (id: number, newText: string) => {
    try {
      await updateComment({
        id,
        comment: newText,
        edu_fb_id: feedbackId,
      }).unwrap();
    } catch (error: any) {
      console.error("❌ Failed to update comment:", error);
      throw error;
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (id: number) => {
    try {
      await deleteComment({
        id,
        edu_fb_id: feedbackId,
      }).unwrap();
    } catch (error: any) {
      console.error("❌ Failed to delete comment:", error);
      throw error;
    }
  };

  // Log any errors but don't block the UI
  if (commentsError) {
    console.log("⚠️ Comment fetch error (non-blocking):", commentsError);
  }

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons
            name="chat-bubble-outline"
            size={16}
            color={feedbackCardTheme.primary}
          />
          <Text style={styles.headerTitle}>
            Parent Comments {hasComments && `(${comments.length})`}
          </Text>
        </View>
        {isLoadingComments && (
          <ActivityIndicator size="small" color={feedbackCardTheme.primary} />
        )}
      </View>

      {/* Add Comment Input (Expandable) - Always show first */}
      {isAddingComment && (
        <Animated.View
          style={[
            styles.addCommentContainer,
            {
              maxHeight: inputHeightAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 150],
              }),
              opacity: inputHeightAnim,
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={100}
          >
            <TextInput
              style={styles.addInput}
              value={newCommentText}
              onChangeText={setNewCommentText}
              placeholder="Write your comment here..."
              placeholderTextColor={feedbackCardTheme.grayMedium}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={styles.addActions}>
              <TouchableOpacity
                style={[styles.addButton, styles.cancelAddButton]}
                onPress={handleCancelAdd}
                disabled={isCreating}
              >
                <MaterialIcons
                  name="close"
                  size={14}
                  color={feedbackCardTheme.grayMedium}
                />
                <Text style={styles.cancelAddText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.addButton, styles.submitButton]}
                onPress={handleSubmitComment}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color={feedbackCardTheme.white} />
                ) : (
                  <>
                    <MaterialIcons
                      name="send"
                      size={14}
                      color={feedbackCardTheme.white}
                    />
                    <Text style={styles.submitButtonText}>Post</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* Add Comment Button */}
      {!isAddingComment && (
        <TouchableOpacity
          style={styles.addCommentButton}
          onPress={handleAddCommentPress}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="add-comment"
            size={16}
            color={feedbackCardTheme.primary}
          />
          <Text style={styles.addCommentButtonText}>Add Comment</Text>
        </TouchableOpacity>
      )}

      {/* Comments List - Show below Add Comment */}
      {hasComments && (
        <View style={styles.commentsList}>
          {comments.map((comment: any) => (
            <ParentCommentItem
              key={comment.id}
              comment={comment}
              onUpdate={handleUpdateComment}
              onDelete={handleDeleteComment}
              isUpdating={isUpdating}
              isDeleting={isDeleting}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: feedbackCardTheme.grayLight,
  },
  compactContainer: {
    marginTop: 10,
    paddingTop: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: feedbackCardTheme.grayDark,
  },
  commentsList: {
    marginTop: 10,
    marginBottom: 8,
  },
  emptyState: {
    paddingVertical: 12,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
    color: feedbackCardTheme.grayMedium,
    fontStyle: "italic",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: feedbackCardTheme.grayMedium,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: feedbackCardTheme.error,
  },
  addCommentContainer: {
    overflow: "hidden",
    marginBottom: 8,
  },
  addInput: {
    backgroundColor: feedbackCardTheme.white,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: feedbackCardTheme.grayDark,
    minHeight: 70,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: feedbackCardTheme.primary + "30",
    marginBottom: 8,
  },
  addActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  cancelAddButton: {
    backgroundColor: feedbackCardTheme.grayLight,
  },
  cancelAddText: {
    fontSize: 12,
    fontWeight: "600",
    color: feedbackCardTheme.grayMedium,
  },
  submitButton: {
    backgroundColor: feedbackCardTheme.primary,
    minWidth: 70,
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: feedbackCardTheme.white,
  },
  addCommentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: feedbackCardTheme.primary + "10",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: feedbackCardTheme.primary + "20",
    borderStyle: "dashed",
  },
  addCommentButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: feedbackCardTheme.primary,
    marginLeft: 6,
  },
});

export default ParentCommentSection;
