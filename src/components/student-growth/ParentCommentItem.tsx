import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { feedbackCardTheme } from "../../data/studentGrowthData";

interface ParentCommentData {
  id: number;
  edu_fb_id: string;
  comment: string;
  created_by: {
    id: number;
    full_name: string;
    call_name_with_title?: string;
  };
  updated_by?: {
    id: number;
    full_name: string;
    call_name_with_title?: string;
  } | null;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  is_active: boolean;
}

interface ParentCommentItemProps {
  comment: ParentCommentData;
  onUpdate: (id: number, newComment: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

const ParentCommentItem: React.FC<ParentCommentItemProps> = ({
  comment,
  onUpdate,
  onDelete,
  isUpdating = false,
  isDeleting = false,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedText, setEditedText] = useState(comment.comment);
  const [showActions, setShowActions] = useState(true);

  const heightAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.spring(heightAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  // Format timestamp to relative time
  const getRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Handle edit button press
  const handleEditPress = () => {
    setEditedText(comment.comment);
    setIsEditMode(true);
    setShowActions(false);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (editedText.trim().length === 0) {
      Alert.alert("Invalid Comment", "Comment cannot be empty");
      return;
    }

    if (editedText.trim() === comment.comment) {
      setIsEditMode(false);
      setShowActions(true);
      return;
    }

    try {
      await onUpdate(comment.id, editedText.trim());
      setIsEditMode(false);
      setShowActions(true);
    } catch (error) {
      Alert.alert("Error", "Failed to update comment. Please try again.");
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditedText(comment.comment);
    setIsEditMode(false);
    setShowActions(true);
  };

  // Handle delete with confirmation
  const handleDeletePress = () => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Animate out
              Animated.parallel([
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: false,
                }),
                Animated.timing(heightAnim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: false,
                }),
              ]).start();

              await onDelete(comment.id);
            } catch (error) {
              // Animate back in on error
              Animated.parallel([
                Animated.timing(fadeAnim, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: false,
                }),
                Animated.timing(heightAnim, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: false,
                }),
              ]).start();

              Alert.alert("Error", "Failed to delete comment. Please try again.");
            }
          },
        },
      ],
    );
  };

  const authorName =
    comment.created_by.call_name_with_title || comment.created_by.full_name;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            {
              scaleY: heightAnim,
            },
          ],
        },
      ]}
    >
      <View style={styles.commentItem}>
        {isEditMode ? (
          // Edit Mode
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={editedText}
              onChangeText={setEditedText}
              multiline
              numberOfLines={3}
              placeholder="Enter your comment..."
              placeholderTextColor={feedbackCardTheme.grayMedium}
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editButton, styles.cancelButton]}
                onPress={handleCancelEdit}
                disabled={isUpdating}
              >
                <MaterialIcons
                  name="close"
                  size={16}
                  color={feedbackCardTheme.grayMedium}
                />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editButton, styles.saveButton]}
                onPress={handleSaveEdit}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={feedbackCardTheme.white} />
                ) : (
                  <>
                    <MaterialIcons
                      name="check"
                      size={16}
                      color={feedbackCardTheme.white}
                    />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // View Mode
          <>
            <View style={styles.commentContent}>
              <Text style={styles.commentText}>{comment.comment}</Text>
              {comment.edited_at && (
                <View style={styles.editedBadge}>
                  <MaterialIcons
                    name="edit"
                    size={10}
                    color={feedbackCardTheme.grayMedium}
                  />
                  <Text style={styles.editedText}>edited</Text>
                </View>
              )}
            </View>

            <View style={styles.commentMeta}>
              <View style={styles.authorInfo}>
                <MaterialIcons
                  name="person"
                  size={12}
                  color={feedbackCardTheme.grayMedium}
                />
                <Text style={styles.authorText}>{authorName}</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.timeText}>
                  {getRelativeTime(comment.created_at)}
                </Text>
              </View>

              {showActions && (
                <View style={styles.commentActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleEditPress}
                    disabled={isDeleting}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons
                      name="edit"
                      size={16}
                      color={feedbackCardTheme.primary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleDeletePress}
                    disabled={isDeleting}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {isDeleting ? (
                      <ActivityIndicator
                        size="small"
                        color={feedbackCardTheme.error}
                      />
                    ) : (
                      <MaterialIcons
                        name="delete"
                        size={16}
                        color={feedbackCardTheme.error}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 6,
  },
  commentItem: {
    backgroundColor: feedbackCardTheme.grayLight,
    borderRadius: 8,
    padding: 10,
  },
  commentContent: {
    marginBottom: 6,
  },
  commentText: {
    fontSize: 13,
    color: feedbackCardTheme.grayDark,
    lineHeight: 18,
  },
  editedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  editedText: {
    fontSize: 10,
    color: feedbackCardTheme.grayMedium,
    marginLeft: 2,
    fontStyle: "italic",
  },
  commentMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  authorText: {
    fontSize: 11,
    color: feedbackCardTheme.grayMedium,
    fontWeight: "500",
    marginLeft: 4,
  },
  dotSeparator: {
    fontSize: 11,
    color: feedbackCardTheme.grayMedium,
    marginHorizontal: 6,
  },
  timeText: {
    fontSize: 11,
    color: feedbackCardTheme.grayMedium,
  },
  commentActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  editContainer: {
    gap: 8,
  },
  editInput: {
    backgroundColor: feedbackCardTheme.white,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: feedbackCardTheme.grayDark,
    minHeight: 70,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: feedbackCardTheme.primary + "30",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  cancelButton: {
    backgroundColor: feedbackCardTheme.grayLight,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: feedbackCardTheme.grayMedium,
  },
  saveButton: {
    backgroundColor: feedbackCardTheme.primary,
    minWidth: 70,
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: feedbackCardTheme.white,
  },
});

export default ParentCommentItem;
