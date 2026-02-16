import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  NotificationItem,
  NotificationItemProps,
  PRIORITY_COLORS,
} from "../../types/communication-management";
import { BaseNotification } from "../../types/notifications";
import MediaPreviewModal from "../common/MediaPreviewModal";

const { width: screenWidth } = Dimensions.get("window");

interface EnhancedNotificationItemProps {
  notification: NotificationItem | BaseNotification;
  onRead?: (id: number) => void;
  onDelete?: (id: number) => void;
  onSelect?: (id: number, selected: boolean) => void;
  selected?: boolean;
  showActions?: boolean;
  compact?: boolean;
}

export default function EnhancedNotificationItem({
  notification,
  onRead,
  onDelete,
  onSelect,
  selected = false,
  showActions = true,
  compact = false,
}: EnhancedNotificationItemProps) {
  const [isPreviewVisible, setIsPreviewVisible] = React.useState(false);
  const handlePress = () => {
    const isRead = notification.is_read;
    if (!isRead && onRead) {
      onRead(
        typeof notification.id === "string"
          ? parseInt(notification.id)
          : notification.id
      );
    }
  };

  const handleDelete = () =>
    onDelete?.(
      typeof notification.id === "string"
        ? parseInt(notification.id)
        : notification.id
    );
  const handleSelect = () =>
    onSelect?.(
      typeof notification.id === "string"
        ? parseInt(notification.id)
        : notification.id,
      !selected
    );

  const priorityColor =
    PRIORITY_COLORS[notification.priority] ||
    notification.priority_color ||
    "#6b7280";
  const isUrgent = notification.priority === "urgent";
  const isHigh = notification.priority === "high";

  const getNotificationIcon = () => {
    const notifType =
      "notification_type" in notification
        ? notification.notification_type
        : null;
    const safeNotifType =
      typeof notifType === "object" && notifType ? notifType : null;
    const iconData = {
      icon: safeNotifType?.icon || "notifications",
      color: safeNotifType?.color || "#6b7280",
    };

    // Override with priority-based colors for urgent notifications
    if (isUrgent) {
      iconData.color = "#ef4444";
    } else if (isHigh) {
      iconData.color = "#f59e0b";
    }

    return iconData;
  };

  const iconInfo = getNotificationIcon();

  const renderSelectionCheckbox = () => {
    if (!showActions) return null;

    return (
      <TouchableOpacity
        style={styles.selectionContainer}
        onPress={handleSelect}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <MaterialIcons name="check" size={16} color="#ffffff" />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderNotificationIcon = () => (
    <View style={styles.iconContainer}>
      <View
        style={[
          styles.iconBackground,
          {
            backgroundColor: iconInfo.color + "15",
          },
          isUrgent && styles.urgentIconBackground,
        ]}
      >
        <MaterialIcons
          name={iconInfo.icon as any}
          size={compact ? 18 : 24}
          color={iconInfo.color}
        />
      </View>

      {/* Priority indicator dot */}
      {(isUrgent || isHigh) && (
        <View
          style={[styles.priorityDot, { backgroundColor: priorityColor }]}
        />
      )}
    </View>
  );

  const renderContent = () => (
    <View style={styles.contentContainer}>
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.title,
            !(notification.is_read) && styles.unreadTitle,
            compact && styles.compactTitle,
          ]}
          numberOfLines={compact ? 1 : 2}
        >
          {notification.title}
        </Text>

        <View style={styles.headerRight}>
          <Text style={styles.timeAgo}>
            {notification.time_ago}
          </Text>
          {!(notification.is_read) && <View style={styles.unreadIndicator} />}
        </View>
      </View>

      <Text
        style={[styles.message, compact && styles.compactMessage]}
        numberOfLines={compact ? 2 : 3}
      >
        {"message" in notification
          ? notification.message
          : (notification as any).description}
      </Text>

      {/* Notification metadata */}
      <View style={styles.metadataContainer}>
        <View style={styles.metadataLeft}>
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
              {notification.priority_label || 
                (notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1))}
            </Text>
          </View>

          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor:
                  (("notification_type" in notification
                    ? typeof notification.notification_type === "object" &&
                      notification.notification_type
                      ? notification.notification_type.color
                      : null
                    : null) || "#6b7280") + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.typeText,
                {
                  color:
                    ("notification_type" in notification
                      ? typeof notification.notification_type === "object" &&
                        notification.notification_type
                        ? notification.notification_type.color
                        : null
                      : null) || "#6b7280",
                },
              ]}
            >
              {("notification_type" in notification
                ? (notification.notification_type as any).name
                : (notification as any).type) || "Notification"}
            </Text>
          </View>
        </View>

        <Text style={styles.targetText}>
          {"target_display" in notification
            ? notification.target_display
            : "All Users"}
        </Text>
      </View>

      {/* Image attachment */}
      {notification.image_url && !compact && (
        <TouchableOpacity 
          onPress={() => setIsPreviewVisible(true)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: notification.image_url }}
            style={styles.attachmentImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {/* Action button */}
      {notification.action_url &&
        ("action_text" in notification
          ? notification.action_text
          : (notification as any).actionUrl) && (
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <Text style={styles.actionButtonText}>
              {("action_text" in notification
                ? notification.action_text
                : "View") || "View"}
            </Text>
            <MaterialIcons name="arrow-forward" size={16} color="#3b82f6" />
          </TouchableOpacity>
        )}

      {/* Expiration warning */}
      {notification.expires_at && (
        <View style={styles.expirationWarning}>
          <MaterialIcons name="schedule" size={14} color="#f59e0b" />
          <Text style={styles.expirationText}>
            Expires: {new Date(notification.expires_at).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  );

  const renderActions = () => {
    if (!showActions) return null;

    return (
      <View style={styles.actionsContainer}>
        {!notification.is_read && (
          <TouchableOpacity
            style={styles.actionIconButton}
            onPress={() =>
              onRead?.(
                typeof notification.id === "string"
                  ? parseInt(notification.id)
                  : notification.id
              )
            }
            activeOpacity={0.7}
          >
            <MaterialIcons name="mark-email-read" size={20} color="#10b981" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionIconButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !notification.is_read && styles.unreadContainer,
        selected && styles.selectedContainer,
        compact && styles.compactContainer,
        isUrgent && styles.urgentContainer,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {renderSelectionCheckbox()}

      <View style={styles.mainContent}>
        {renderNotificationIcon()}
        {renderContent()}
      </View>

      {renderActions()}

      <MediaPreviewModal
        visible={isPreviewVisible}
        onClose={() => setIsPreviewVisible(false)}
        mediaUrl={notification.image_url || null}
        mediaType="image"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  unreadContainer: {
    backgroundColor: "#fefefe",
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
    shadowOpacity: 0.15,
  },
  selectedContainer: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  compactContainer: {
    padding: 8,
    marginVertical: 2,
  },
  urgentContainer: {
    borderLeftColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  selectionContainer: {
    marginRight: 8,
    paddingTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  mainContent: {
    flex: 1,
    flexDirection: "row",
  },
  iconContainer: {
    position: "relative",
    marginRight: 12,
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  urgentIconBackground: {
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  priorityDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    marginRight: 8,
    lineHeight: 20,
  },
  unreadTitle: {
    fontWeight: "700",
    color: "#000000",
  },
  compactTitle: {
    fontSize: 14,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeAgo: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
  },
  message: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 18,
    marginBottom: 8,
  },
  compactMessage: {
    fontSize: 13,
    marginBottom: 6,
  },
  metadataContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  metadataLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "600",
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  targetText: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
    fontStyle: "italic",
  },
  attachmentImage: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 6,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3b82f6",
  },
  expirationWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    gap: 4,
  },
  expirationText: {
    fontSize: 11,
    color: "#f59e0b",
    fontWeight: "600",
  },
  actionsContainer: {
    flexDirection: "column",
    alignItems: "center",
    marginLeft: 8,
    gap: 8,
  },
  actionIconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#f9fafb",
  },
});
