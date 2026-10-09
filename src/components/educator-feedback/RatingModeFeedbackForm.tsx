import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { RatingCategory } from "../../api/educator-feedback-rating-api";
import { theme } from "../../styles/theme";

// Rating-mode wizard steps: the comment step and the 1-5 rating step

export const RatingCommentStep: React.FC<{
  comment: string;
  onCommentChange: (text: string) => void;
}> = ({ comment, onCommentChange }) => (
  <View>
    <Text style={styles.help}>
      Write one comment. It is saved with this feedback for every selected
      student.
    </Text>
    <TextInput
      style={styles.commentInput}
      placeholder="Enter your comment..."
      multiline
      value={comment}
      onChangeText={onCommentChange}
      textAlignVertical="top"
    />
  </View>
);

export const RatingCategoriesStep: React.FC<{
  categories: RatingCategory[];
  isLoading: boolean;
  hasError: boolean;
  ratings: { [categoryId: number]: number };
  onRatingChange: (categoryId: number, rating: number) => void;
}> = ({ categories, isLoading, hasError, ratings, onRatingChange }) => {
  if (isLoading) {
    return <ActivityIndicator size="small" color={theme.colors.primary} />;
  }
  if (hasError)
    return <Text style={styles.help}>Failed to load categories.</Text>;
  if (categories.length === 0) {
    return <Text style={styles.help}>No categories available.</Text>;
  }

  return (
    <View>
      <Text style={styles.help}>
        Tap a star to rate (1-5). Tap the same star again to clear. Rate at
        least one category.
      </Text>
      {categories.map((category) => (
        <View key={category.id} style={styles.row}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity
                key={value}
                hitSlop={4}
                onPress={() =>
                  onRatingChange(
                    category.id,
                    ratings[category.id] === value ? 0 : value,
                  )
                }
              >
                <MaterialIcons
                  name={
                    (ratings[category.id] || 0) >= value
                      ? "star"
                      : "star-border"
                  }
                  size={28}
                  color="#F5A623"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  help: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 12 },
  commentInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: 12,
    minHeight: 140,
    fontSize: 15,
    backgroundColor: theme.colors.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    marginRight: 8,
  },
  stars: { flexDirection: "row" },
});
