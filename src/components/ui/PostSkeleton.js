import React from "react";
import { View, StyleSheet } from "react-native";
import Skeleton from "./Skeleton";

const PostSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header section representing the user avatar and name snippet */}
      <View style={styles.header}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.headerText}>
          <Skeleton width={150} height={16} style={styles.marginBottom} />
          <Skeleton width={100} height={12} />
        </View>
      </View>
      
      {/* Content section representing post text */}
      <View style={styles.content}>
        <Skeleton width="100%" height={14} style={styles.marginBottom} />
        <Skeleton width="90%" height={14} style={styles.marginBottom} />
        <Skeleton width="60%" height={14} />
      </View>

      {/* Media section representing attached image/video */}
      <View style={styles.media}>
        <Skeleton width="100%" height={200} borderRadius={12} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  marginBottom: {
    marginBottom: 8,
  },
  content: {
    marginBottom: 16,
  },
  media: {
    width: "100%",
  },
});

export default PostSkeleton;
