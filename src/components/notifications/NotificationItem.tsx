import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { UnifiedNotification } from "../../services/notifications/NotificationManager";

interface NotificationItemProps {
  notification: UnifiedNotification;
  onPress?: (notification: UnifiedNotification) => void;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onMarkAsRead,
  onDelete,
  showActions = true,
  compact = false,
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "academic":
        return { name: "school", color: "#3b82f6" };
      case "payment":
        return { name: "payment", color: "#f59e0b" };
      case "event":
        return { name: "event", color: "#10b981" };
      case "security":
        return { name: "security", color: "#ef4444" };
      case "system":
        return { name: "settings", color: "#6b7280" };
      case "communication":
        return { name: "message", color: "#8b5cf6" };
      default:
        return { name: "notifications", color: "#3b82f6" };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "#ef4444";
      case "high":
        return "#f59e0b";
      case "normal":
        return "#10b981";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  const typeIcon = getTypeIcon(notification.type);
  const priorityColor = getPriorityColor(notification.priority);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !notification.read && styles.unreadContainer,
        compact && styles.compactContainer,
      ]}
      onPress={() => onPress?.(notification)}
      activeOpacity={0.7}
    >
      {/* Left unread indicator bar */}
      {!notification.read && <View style={styles.unreadIndicator} />}

      {/* Icon Container */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: typeIcon.color + "15" },
          !notification.read && styles.unreadIconContainer,
        ]}
      >
        <MaterialIcons
          name={typeIcon.name as any}
          size={compact ? 18 : 20}
          color={typeIcon.color}
        />
        {/* Priority badge on icon for high/urgent */}
        {(notification.priority === "urgent" ||
          notification.priority === "high") && (
          <View
            style={[styles.priorityDot, { backgroundColor: priorityColor }]}
          />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Header with title and time */}
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              !notification.read && styles.unreadTitle,
              compact && styles.compactTitle,
            ]}
            numberOfLines={compact ? 1 : 2}
          >
            {notification.title}
          </Text>
          <Text style={[styles.timeText, compact && styles.compactText]}>
            {formatTime(notification.timestamp)}
          </Text>
        </View>

        {/* Body */}
        <Text
          style={[styles.body, compact && styles.compactBody]}
          numberOfLines={compact ? 1 : 3}
        >
          {notification.body}
        </Text>

        {/* Footer with priority and actions */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {/* Show priority badge only for non-normal priorities */}
            {notification.priority && notification.priority !== "normal" && (
              <View
                style={[
                  styles.priorityBadge,
                  {
                    backgroundColor: priorityColor + "20",
                    borderColor: priorityColor + "40",
                  },
                ]}
              >
                <Text style={[styles.priorityText, { color: priorityColor }]}>
                  {notification.priority.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          {showActions && !compact && (
            <View style={styles.footerRight}>
              {!notification.read ? (
                <>
                  {onMarkAsRead && (
                    <TouchableOpacity
                      style={styles.markReadButton}
                      onPress={() => onMarkAsRead(notification.id)}
                    >
                      <MaterialIcons
                        name="mark-email-read"
                        size={14}
                        color="#10b981"
                      />
                      <Text style={styles.markReadText}>Mark Read</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.readIndicator}>
                  <MaterialIcons name="done-all" size={12} color="#6b7280" />
                  <Text style={styles.readText}>Read</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    opacity: 0.85,
  },
  unreadContainer: {
    backgroundColor: "#ffffff",
    borderColor: "#3b82f6",
    borderLeftWidth: 4,
    shadowOpacity: 0.12,
    elevation: 3,
    opacity: 1.0,
    shadowRadius: 6,
  },
  compactContainer: {
    marginBottom: 8,
  },
  unreadIndicator: {
    width: 6,
    backgroundColor: "#3b82f6",
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    margin: 16,
    position: "relative",
  },
  unreadIconContainer: {
    transform: [{ scale: 1.1 }],
  },
  priorityDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "white",
  },
  content: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    lineHeight: 22,
  },
  unreadTitle: {
    fontWeight: "800",
    color: "#1e40af",
    fontSize: 16.5,
  },
  timeText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginLeft: 12,
  },
  body: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
  },
  markReadButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#10b981",
    gap: 4,
  },
  markReadText: {
    fontSize: 10,
    color: "#10b981",
    fontWeight: "600",
  },
  readIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    gap: 3,
  },
  readText: {
    fontSize: 9,
    color: "#6b7280",
    fontWeight: "500",
  },
  compactText: {
    fontSize: 10,
  },
  compactTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  compactBody: {
    fontSize: 12,
    marginBottom: 8,
  },
});

export default NotificationItem;
