import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { feedbackCardTheme } from "../../data/studentGrowthData";

interface FeedbackPaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  isLoading?: boolean;
}

// Slim pill pager: ‹  2 / 5  ›
const FeedbackPagination: React.FC<FeedbackPaginationProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  onPreviousPage,
  onNextPage,
  isLoading = false,
}) => {
  if (totalRecords === 0) return null;

  const canGoPrevious = currentPage > 1 && !isLoading;
  const canGoNext = currentPage < totalPages && !isLoading;

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <TouchableOpacity
          style={styles.button}
          onPress={onPreviousPage}
          disabled={!canGoPrevious}
        >
          <MaterialIcons
            name="chevron-left"
            size={24}
            color={canGoPrevious ? feedbackCardTheme.primary : "#C8C8C8"}
          />
        </TouchableOpacity>
        <Text style={styles.text}>
          {currentPage} / {totalPages}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={onNextPage}
          disabled={!canGoNext}
        >
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={canGoNext ? feedbackCardTheme.primary : "#C8C8C8"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: feedbackCardTheme.surface,
    borderRadius: 24,
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  button: { padding: 8 },
  text: {
    minWidth: 56,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: feedbackCardTheme.black,
  },
});

export default FeedbackPagination;
