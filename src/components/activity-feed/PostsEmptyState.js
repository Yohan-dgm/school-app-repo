import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

/**
 * Shared "no posts" empty state for the School/Class/Student feed tabs.
 */
const PostsEmptyState = ({ icon = "inbox", title, message }) => (
  <View style={styles.emptyContainer}>
    <Icon name={icon} size={48} color="#ccc" style={styles.emptyIcon} />
    {title ? <Text style={styles.emptyTitle}>{title}</Text> : null}
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginHorizontal: 20,
    lineHeight: 20,
  },
});

export default PostsEmptyState;
