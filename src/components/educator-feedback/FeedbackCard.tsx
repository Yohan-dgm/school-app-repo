import React from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";
import {
  getLocalFallbackProfileImage,
  getStudentProfilePicture,
} from "../../utils/studentProfileUtils";

interface FeedbackCardProps {
  item: any;
  isExpanded: boolean;
  onToggle: () => void;
  // comment editing
  isEditing: boolean;
  editedComment: string;
  onEditedCommentChange: (text: string) => void;
  onEditComment: (comment: string) => void;
  onCancelEdit: () => void;
  onSaveComment: () => void;
  isSavingComment: boolean;
  // actions
  onDelete: () => void;
  isDeleting: boolean;
  onToggleEvaluation: () => void;
  isEvaluationOpen: boolean;
  // false hides the status pill and the Add evaluation button (rating mode)
  showEvaluation?: boolean;
  // timeline + evaluation form
  children?: React.ReactNode;
}

const Stars: React.FC<{ rating?: number }> = ({ rating = 0 }) => (
  <View style={styles.stars}>
    {[1, 2, 3, 4, 5].map((value) => (
      <MaterialIcons
        key={value}
        name={value <= rating ? "star" : "star-border"}
        size={16}
        color={value <= rating ? "#FFC107" : "#D0D0D0"}
      />
    ))}
  </View>
);

// Compact feedback card: tap to expand for the full comment, timeline and actions
const FeedbackCard: React.FC<FeedbackCardProps> = ({
  item,
  isExpanded,
  onToggle,
  isEditing,
  editedComment,
  onEditedCommentChange,
  onEditComment,
  onCancelEdit,
  onSaveComment,
  isSavingComment,
  onDelete,
  isDeleting,
  onToggleEvaluation,
  isEvaluationOpen,
  showEvaluation = true,
  children,
}) => {
  const studentName = item.student.student_calling_name || "Unknown Student";
  const admissionNumber = item.student.admission_number || "N/A";
  const grade = item.grade_level?.name || "Unknown Grade";
  const category = item.category?.name || "General";
  const status = item.evaluations?.[0]?.evaluation_type?.name || "";
  // Rating-mode submissions carry one comment and a rating per category
  const ratings:
    | { feedback_id: number; category: { name: string }; rating: number }[]
    | undefined = item.ratings;
  const comment = item.comment ?? item.comments?.[0]?.comment ?? "";
  const createdBy = item.created_by?.call_name_with_title || "Unknown Educator";
  const date = item.created_at
    ? new Date(item.created_at).toLocaleDateString()
    : "Unknown Date";
  const image =
    getStudentProfilePicture(item.student) || getLocalFallbackProfileImage();

  return (
    <View style={styles.card}>
      <TouchableOpacity activeOpacity={0.7} onPress={onToggle}>
        <View style={styles.header}>
          <Image source={image} style={styles.avatar} />
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {studentName}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {grade} • {admissionNumber}
            </Text>
          </View>
          <MaterialIcons
            name={isExpanded ? "expand-less" : "expand-more"}
            size={24}
            color={theme.colors.textSecondary}
          />
        </View>

        {/* Rating-mode cards list every category below instead */}
        {(!ratings || showEvaluation) && (
          <View style={styles.chipRow}>
            {!ratings && (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{category}</Text>
              </View>
            )}
            {showEvaluation && !!status && (
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText}>{status}</Text>
              </View>
            )}
            {!ratings && (
              <View style={styles.ratingBox}>
                <Stars
                  rating={Math.round(item.average_rating ?? item.rating ?? 0)}
                />
              </View>
            )}
          </View>
        )}

        {!!ratings && (
          <View style={styles.ratingList}>
            {ratings.map((r) => (
              <View key={r.feedback_id} style={styles.ratingRow}>
                <Text style={styles.ratingCategory} numberOfLines={1}>
                  {r.category.name}
                </Text>
                <Stars rating={r.rating} />
              </View>
            ))}
          </View>
        )}

        {!isExpanded && !!comment && (
          <Text style={styles.comment} numberOfLines={2}>
            {comment}
          </Text>
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expanded}>
          {isEditing ? (
            <>
              <TextInput
                style={styles.editInput}
                value={editedComment}
                onChangeText={onEditedCommentChange}
                placeholder="Enter comment..."
                multiline
                autoFocus
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  onPress={onCancelEdit}
                  disabled={isSavingComment}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (isSavingComment || !editedComment.trim()) &&
                      styles.disabled,
                  ]}
                  onPress={onSaveComment}
                  disabled={isSavingComment || !editedComment.trim()}
                >
                  <Text style={styles.saveText}>
                    {isSavingComment ? "Saving..." : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.commentRow}>
              <Text style={styles.fullComment}>
                {comment || "No description available"}
              </Text>
              <TouchableOpacity
                onPress={() => onEditComment(comment)}
                hitSlop={8}
              >
                <MaterialIcons
                  name="edit"
                  size={18}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.meta}>
            By {createdBy} • {date}
          </Text>

          {children}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.deleteButton, isDeleting && styles.disabled]}
              onPress={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#F44336" />
              ) : (
                <MaterialIcons
                  name="delete-outline"
                  size={18}
                  color="#F44336"
                />
              )}
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
            {showEvaluation && (
              <TouchableOpacity
                style={styles.evaluateButton}
                onPress={onToggleEvaluation}
              >
                <Text style={styles.evaluateText}>
                  {isEvaluationOpen ? "Cancel" : "Add evaluation"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  headerText: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  sub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 12,
  },
  categoryChip: {
    backgroundColor: "#FBE9EE",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  statusChip: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  statusChipText: { fontSize: 12, fontWeight: "600", color: "#E65100" },
  ratingBox: { marginLeft: "auto" },
  ratingList: { marginTop: 10 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  ratingCategory: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    marginRight: 8,
  },
  stars: { flexDirection: "row" },
  comment: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    marginTop: 10,
  },
  expanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  commentRow: { flexDirection: "row", alignItems: "flex-start" },
  fullComment: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    marginRight: 8,
  },
  meta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8 },
  editInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: 10,
    minHeight: 70,
    fontSize: 14,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
  },
  cancelText: { color: theme.colors.textSecondary, marginRight: 16 },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveText: { color: "#FFF", fontWeight: "600" },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  deleteButton: { flexDirection: "row", alignItems: "center", padding: 8 },
  deleteText: { color: "#F44336", fontWeight: "600", marginLeft: 4 },
  evaluateButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  evaluateText: { color: "#FFF", fontWeight: "600" },
  disabled: { opacity: 0.5 },
});

export default FeedbackCard;
