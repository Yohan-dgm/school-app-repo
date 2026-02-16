import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import NotificationItem from "./NotificationItem";
import NotificationBadge from "./NotificationBadge";
import { useSelector } from "react-redux";
import { useGetNotificationsQuery } from "../../api/notifications";

// Define the interfaces locally to match API data
interface UnifiedNotification {
  id: number; // API returns number, not string
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  [key: string]: any;
}

type NotificationFilter =
  | "all"
  | "unread"
  | "academic"
  | "payment"
  | "event"
  | "communication";

interface NotificationListProps {
  onNotificationPress?: (notification: UnifiedNotification) => void;
  showActions?: boolean;
  compact?: boolean;
  maxItems?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  onNotificationPress,
  showActions = true,
  compact = false,
  maxItems,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");

  // Get auth data from Redux store following UniversalNotificationSystem pattern
  const sessionData = useSelector((state: any) => state.app);
  const userToken = sessionData?.token || sessionData?.data?.token;
  const userId = sessionData?.data?.id || sessionData?.id;

  // Simple API integration following UniversalNotificationSystem pattern
  const { data: notificationsData, refetch: refetchNotifications } =
    useGetNotificationsQuery(
      {
        page: 1,
        limit: 50, // Standardized: fixed limit for shared cache (maxItems handled by filtering)
        filters: {
          filter: "all",
          search: "",
          type_id: undefined,
          priority: undefined,
          unread_only: false,
        },
      },
      {
        skip: !userId || !userToken,
      }
    );

  // Simple data processing following UniversalNotificationSystem pattern
  const allNotifications = notificationsData?.data || [];
  const unreadCount = allNotifications.filter(
    (notification) => !notification.is_read
  ).length;

  // Apply filter
  const filteredNotifications = React.useMemo(() => {
    let filtered = allNotifications;
    if (filter === "unread") {
      filtered = allNotifications.filter((n) => !n.is_read);
    }
    return maxItems ? filtered.slice(0, maxItems) : filtered;
  }, [allNotifications, filter, maxItems]);

  // Real-time updates are now handled by UniversalNotificationSystem via cache invalidation
  // No need for component-specific real-time setup

  // Simple loading state management following UniversalNotificationSystem pattern
  useEffect(() => {
    if (notificationsData !== undefined) {
      setLoading(false);
    }
  }, [notificationsData]);

  // Simple debug logging following UniversalNotificationSystem pattern
  useEffect(() => {
    console.log("📱 NotificationList - Notification state:", {
      totalNotifications: allNotifications.length,
      filteredNotifications: filteredNotifications.length,
      unreadCount,
      hasData: !!notificationsData,
      filter,
    });
  }, [
    allNotifications.length,
    filteredNotifications.length,
    unreadCount,
    notificationsData,
    filter,
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simple refresh following UniversalNotificationSystem pattern
    refetchNotifications().finally(() => {
      setRefreshing(false);
    });
  }, [refetchNotifications]);

  const handleMarkAsRead = useCallback(
    async (id: string | number) => {
      try {
        // Note: Could use markAsRead API mutation here
        console.log("Mark as read functionality to be implemented:", id);
        refetchNotifications(); // Refresh to get updated state
      } catch (error) {
        console.error("Error marking notification as read:", error);
        Alert.alert("Error", "Failed to mark notification as read");
      }
    },
    [refetchNotifications]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      Alert.alert(
        "Delete Notification",
        "Are you sure you want to delete this notification?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                // Note: NotificationManager doesn't have deleteNotification method
                // This functionality may need to be implemented or use API directly
                console.log("Delete notification not implemented yet:", id);
                Alert.alert("Info", "Delete functionality not implemented yet");
                refetchNotifications();
              } catch (error) {
                console.error("Error deleting notification:", error);
                Alert.alert("Error", "Failed to delete notification");
              }
            },
          },
        ]
      );
    },
    [refetchNotifications]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      // Note: Could use markAllAsRead API mutation here
      console.log("Mark all as read functionality to be implemented");
      refetchNotifications(); // Refresh to get updated state
    } catch (error) {
      console.error("Error marking all as read:", error);
      Alert.alert("Error", "Failed to mark all notifications as read");
    }
  }, [refetchNotifications]);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to clear all notifications? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              // Note: Clear all functionality to be implemented with API
              console.log("Clear all notifications not implemented yet");
              Alert.alert(
                "Info",
                "Clear all functionality not implemented yet"
              );
              refetchNotifications();
            } catch (error) {
              console.error("Error clearing notifications:", error);
              Alert.alert("Error", "Failed to clear notifications");
            }
          },
        },
      ]
    );
  }, [refetchNotifications]);

  // Auto refresh following UniversalNotificationSystem pattern
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetchNotifications();
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetchNotifications]);

  // Filter options
  const filterOptions: {
    key: NotificationFilter;
    label: string;
    icon: string;
  }[] = [
    { key: "all", label: "All", icon: "notifications" },
    { key: "unread", label: "Unread", icon: "mark-email-unread" },
    { key: "academic", label: "Academic", icon: "school" },
    { key: "payment", label: "Payment", icon: "payment" },
    { key: "event", label: "Events", icon: "event" },
    { key: "communication", label: "Messages", icon: "message" },
  ];

  const renderFilterButton = ({
    item,
  }: {
    item: (typeof filterOptions)[0];
  }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === item.key && styles.activeFilterButton,
      ]}
      onPress={() => setFilter(item.key)}
    >
      <MaterialIcons
        name={item.icon as any}
        size={16}
        color={filter === item.key ? "#fff" : "#666"}
      />
      <Text
        style={[
          styles.filterText,
          filter === item.key && styles.activeFilterText,
        ]}
      >
        {item.label}
      </Text>
      {item.key === "unread" && unreadCount > 0 && (
        <NotificationBadge
          count={unreadCount}
          size="small"
          style={{ position: "relative", top: 0, right: 0 }}
        />
      )}
    </TouchableOpacity>
  );

  const renderNotification = ({ item }: { item: UnifiedNotification }) => (
    <NotificationItem
      notification={item}
      onPress={onNotificationPress}
      onMarkAsRead={handleMarkAsRead}
      onDelete={handleDelete}
      showActions={showActions}
      compact={compact}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Filter buttons */}
      <FlatList
        data={filterOptions}
        renderItem={renderFilterButton}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterList}
        contentContainerStyle={styles.filterContent}
      />

      {/* Action buttons */}
      {!compact && (
        <View style={styles.actionBar}>
          <Text style={styles.countText}>
            {filteredNotifications.length} notification
            {filteredNotifications.length !== 1 ? "s" : ""}
            {unreadCount > 0 && ` (${unreadCount} unread)`}
          </Text>

          <View style={styles.actionButtons}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleMarkAllAsRead}
              >
                <MaterialIcons
                  name="mark-email-read"
                  size={16}
                  color="#4CAF50"
                />
                <Text style={[styles.actionButtonText, { color: "#4CAF50" }]}>
                  Mark All Read
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleClearAll}
            >
              <MaterialIcons name="clear-all" size={16} color="#f44336" />
              <Text style={[styles.actionButtonText, { color: "#f44336" }]}>
                Clear All
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="notifications-none" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptyText}>
        {filter === "all"
          ? "You're all caught up!"
          : `No ${filter} notifications found`}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2196F3"]}
            tintColor="#2196F3"
          />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          filteredNotifications.length === 0
            ? styles.emptyContainer
            : styles.listContent
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterList: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  activeFilterButton: {
    backgroundColor: "#2196F3",
  },
  filterText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    fontWeight: "500",
  },
  activeFilterText: {
    color: "#fff",
  },
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  countText: {
    fontSize: 14,
    color: "#666",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default NotificationList;
