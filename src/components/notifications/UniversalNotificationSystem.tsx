import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

// Working Notifications API (correct endpoints)
import {
  useGetNotificationsQuery,
  useGetNotificationStatsQuery,
  useMarkNotificationAsReadMutation,
  useDeleteNotificationMutation,
} from "../../api/notifications";

// Import types
import {
  BaseNotification,
  NotificationFilters,
} from "../../types/notifications";

import {
  getUserCategoryDisplayName,
  getUserCategoryId,
  USER_CATEGORIES,
} from "../../constants/userCategories";
import NotificationDetailsModal from "./NotificationDetailsModal";
import CreateAnnouncementModal from "../announcements/CreateAnnouncementModal";

interface UniversalNotificationSystemProps {
  userCategory: string;
  userId: string;
  token?: string | null;
}

export default function UniversalNotificationSystem({
  userCategory,
  userId,
  token,
}: UniversalNotificationSystemProps) {
  const [refreshing, setRefreshing] = React.useState(false);
  const [showDebugPanel, setShowDebugPanel] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | "unread" | "read">("all");
  const [selectedNotification, setSelectedNotification] =
    React.useState<BaseNotification | null>(null);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] =
    React.useState(false);

  // Enhanced logging utility
  const apiLogger = {
    info: (message: string, data?: any) => {
      console.log(
        `🔵 [NotificationAPI] ${message}`,
        data
          ? {
              ...data,
              timestamp: new Date().toISOString(),
              userCategory,
              userId,
            }
          : "",
      );
    },
    success: (message: string, data?: any) => {
      console.log(
        `🟢 [NotificationAPI] ${message}`,
        data
          ? {
              ...data,
              timestamp: new Date().toISOString(),
            }
          : "",
      );
    },
    error: (message: string, data?: any) => {
      console.error(
        `🔴 [NotificationAPI] ${message}`,
        data
          ? {
              ...data,
              timestamp: new Date().toISOString(),
            }
          : "",
      );
    },
    warn: (message: string, data?: any) => {
      console.warn(
        `🟡 [NotificationAPI] ${message}`,
        data
          ? {
              ...data,
              timestamp: new Date().toISOString(),
            }
          : "",
      );
    },
  };

  // Convert string userCategory to number for permission checks
  const userCategoryNumber = getUserCategoryId(userCategory);

  // Permission check for announcement creation
  const canCreateAnnouncements = (userCategoryNum: number): boolean => {
    // Allow Principal (4), Management (5), Admin (6), Senior Management (3)
    return [3, 4, 5, 6].includes(userCategoryNum);
  };

  // API Hooks with comprehensive logging - using correct working endpoints
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery(
    {
      page: 1,
      limit: 20,
      filters: {
        filter: "all",
        search: "",
        type_id: null,
        priority: "",
        unread_only: false,
      },
    },
    {
      skip: !userId || !token,
    },
  );

  // Stats API - disabled temporarily but hook must be called to maintain hook order
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useGetNotificationStatsQuery(
    {
      filters: {
        date_range: "all",
        priority_filter: [],
        type_filter: [],
        include_read: true,
        include_archived: false,
      },
    },
    {
      skip: true, // Always skip to prevent API calls until backend is ready
    },
  );

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  // Log API responses when data changes
  React.useEffect(() => {
    if (notificationsData) {
      apiLogger.success("Notifications data received", {
        endpoint: `/api/communication-management/notifications/list`,
        method: "POST",
        responseStructure: {
          hasData: !!notificationsData.data,
          notificationCount: notificationsData.data?.length || 0,
          hasMetadata: !!notificationsData.metadata,
        },
        fullResponse: notificationsData,
      });
    }
  }, [notificationsData, userId]);

  // Stats success logging - disabled until API is working
  React.useEffect(() => {
    if (statsData) {
      apiLogger.success("Stats data received", {
        endpoint: `/api/communication-management/notifications/stats`,
        method: "POST",
        responseStructure: {
          hasStats: !!statsData,
          statsKeys: statsData ? Object.keys(statsData).slice(0, 5) : [],
        },
        fullResponse: statsData,
      });
    }
  }, [statsData, userId]);

  // Log API errors
  React.useEffect(() => {
    if (notificationsError) {
      apiLogger.error("Notifications API failed", {
        endpoint: `/api/communication-management/notifications/list`,
        error: notificationsError,
        status: (notificationsError as any)?.status,
        data: (notificationsError as any)?.data,
      });
    }
  }, [notificationsError, userId]);

  // Stats error logging - disabled until API is working
  React.useEffect(() => {
    if (statsError) {
      apiLogger.error("Stats API failed", {
        endpoint: `/api/communication-management/notifications/stats`,
        error: statsError,
        status: (statsError as any)?.status,
        data: (statsError as any)?.data,
      });
    }
  }, [statsError, userId]);

  // Component initialization logging and initial refresh
  React.useEffect(() => {
    apiLogger.info("UniversalNotificationSystem initialized", {
      userCategory,
      userId,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 15)}...` : "No token",
    });

    // Auto-refresh on initial component mount
    const initialRefresh = async () => {
      apiLogger.info("Initial component load - refreshing notifications");
      try {
        await refetchNotifications();
        apiLogger.success("Initial refresh completed");
      } catch (error) {
        apiLogger.error("Initial refresh failed", { error });
      }
    };

    // Only refresh if we have token and user data
    if (token && userId) {
      initialRefresh();
    }

    // Make API test functions available globally for debugging
    if (__DEV__ && typeof window !== "undefined") {
      window.testNotificationAPI = {
        async testInComponent() {
          console.log("🧪 Testing APIs from component context...");

          // Test notifications API
          try {
            await refetchNotifications();
            console.log("✅ Notifications refetch successful");
          } catch (error) {
            console.error("❌ Notifications refetch failed:", error);
          }

          // Test stats API
          try {
            await refetchStats();
            console.log("✅ Stats refetch successful");
          } catch (error) {
            console.error("❌ Stats refetch failed:", error);
          }
        },

        // Current component state
        getCurrentState() {
          return {
            userCategory,
            userId,
            hasToken: !!token,
            notificationsLoading,
            statsLoading,
            hasNotificationsError: !!notificationsError,
            hasStatsError: !!statsError,
            notificationCount: notificationsData?.data?.length || 0,
          };
        },
      };

      console.log(
        "🧪 Component test functions available at window.testNotificationAPI",
      );
    }
  }, [userCategory, userId, token, refetchNotifications, refetchStats]);

  // Auto-refresh notifications on screen focus and navigation
  useFocusEffect(
    React.useCallback(() => {
      apiLogger.info("Screen focused - auto-refreshing notifications");

      // Refresh notifications when screen comes into focus
      const refreshOnFocus = async () => {
        try {
          await refetchNotifications();
          apiLogger.success("Auto-refresh on focus completed");
        } catch (error) {
          apiLogger.error("Auto-refresh on focus failed", { error });
        }
      };

      refreshOnFocus();

      // Optional: Set up interval for periodic refresh while screen is active
      const refreshInterval = setInterval(() => {
        apiLogger.info("Periodic auto-refresh triggered");
        refetchNotifications().catch((error) => {
          apiLogger.warn("Periodic refresh failed", { error });
        });
      }, 30000); // Refresh every 30 seconds

      // Cleanup interval on screen blur
      return () => {
        clearInterval(refreshInterval);
        apiLogger.info("Auto-refresh cleanup completed");
      };
    }, [refetchNotifications]),
  );

  const handleRefresh = React.useCallback(async () => {
    apiLogger.info("Manual refresh triggered");
    setRefreshing(true);

    try {
      // Only refetch queries that are actually running
      await refetchNotifications();
      // Note: Stats query is skipped, so we don't refetch it to avoid errors
      apiLogger.success("Manual refresh completed");
    } catch (error) {
      apiLogger.error("Manual refresh failed", { error });
    } finally {
      setRefreshing(false);
    }
  }, [refetchNotifications]);

  const handleMarkAsRead = async (notificationId: number) => {
    apiLogger.info("Marking notification as read", { notificationId });

    try {
      const result = await markAsRead({
        notificationId: notificationId.toString(),
      }).unwrap();

      apiLogger.success("Notification marked as read", {
        notificationId,
        response: result,
      });

      Alert.alert("Success", "Notification marked as read");
    } catch (error) {
      apiLogger.error("Failed to mark notification as read", {
        notificationId,
        error,
      });
      Alert.alert("Error", "Failed to mark notification as read");
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    apiLogger.info("Deleting notification", { notificationId });

    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteNotification({
                notificationId: notificationId.toString(),
              }).unwrap();

              apiLogger.success("Notification deleted", {
                notificationId,
                response: result,
              });

              Alert.alert("Success", "Notification deleted");
            } catch (error) {
              apiLogger.error("Failed to delete notification", {
                notificationId,
                error,
              });
              Alert.alert("Error", "Failed to delete notification");
            }
          },
        },
      ],
    );
  };

  const handleNotificationPress = (notification: BaseNotification) => {
    // Open details modal
    setSelectedNotification(notification);
    setShowDetailsModal(true);

    // If notification is unread, mark it as read
    const isUnread = !(notification.is_read ?? notification.isRead);
    if (isUnread) {
      handleMarkAsRead(notification.id);
    }
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedNotification(null);
  };

  const handleOpenAnnouncementModal = () => {
    setShowAnnouncementModal(true);
  };

  const handleCloseAnnouncementModal = () => {
    setShowAnnouncementModal(false);
  };

  const renderNotification = ({ item }: { item: BaseNotification }) => {
    // Safety check to ensure we have valid item data
    if (!item || typeof item !== "object") {
      console.warn("Invalid notification item:", item);
      return null;
    }

    // Get comprehensive type information using new mapping
    const typeInfo = getNotificationTypeInfo(item);
    const priorityColor = getPriorityColor(item.priority || "normal");
    const isUnread = !(item.is_read ?? item.isRead);

    return (
      <TouchableOpacity
        style={[styles.notificationCard, isUnread && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Left indicator for unread */}
        {isUnread && <View style={styles.unreadIndicator} />}

        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: typeInfo.color + "15" },
            isUnread && styles.unreadIconContainer,
          ]}
        >
          <MaterialIcons
            name={typeInfo.icon as any}
            size={20}
            color={typeInfo.color}
          />
          {/* Priority indicator on icon */}
          {(item.priority === "urgent" || item.priority === "high") && (
            <View
              style={[
                styles.priorityIndicator,
                { backgroundColor: priorityColor },
              ]}
            />
          )}
        </View>

        {/* Content */}
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text
              style={[styles.notificationTitle, isUnread && styles.unreadTitle]}
              numberOfLines={2}
            >
              {String(item.title || "No Title")}
            </Text>
            <View style={styles.timeAndActions}>
              <Text style={styles.timeAgo}>
                {String(
                  item.time_ago ||
                    formatTimeAgo(item.timestamp || item.created_at) ||
                    "Unknown time",
                )}
              </Text>
            </View>
          </View>

          <Text style={styles.notificationDescription} numberOfLines={3}>
            {String(item.message || item.description || "No message")}
          </Text>

          {/* Footer with type and priority */}
          <View style={styles.notificationFooter}>
            <View style={styles.footerLeft}>
              {/* <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: typeInfo.color + "20" },
                ]}
              > */}
              {/* <Text style={[styles.typeText, { color: typeInfo.color }]}> */}
              {/* {String(typeInfo.name)} */}
              {/* </Text> */}
              {/* </View> */}

              {item.priority !== "normal" && (
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
                    {String(item.priority || "normal").toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.footerRight}>
              {isUnread ? (
                <TouchableOpacity
                  style={styles.markReadButton}
                  onPress={() => handleMarkAsRead(item.id)}
                >
                  <MaterialIcons
                    name="mark-email-read"
                    size={14}
                    color="#10b981"
                  />
                  <Text style={styles.markReadText}>Mark Read</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.readIndicator}>
                  <MaterialIcons name="done-all" size={12} color="#6b7280" />
                  <Text style={styles.readText}>Read</Text>
                </View>
              )}

              {/* Delete button hidden per user request */}
              {/* <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteNotification(item.id)}
              >
                <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
              </TouchableOpacity> */}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Helper function for time formatting
  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Comprehensive notification type mapping
  const getNotificationTypeInfo = (notification: BaseNotification) => {
    // First check if we have a type_id and map it to the correct type
    let typeId: number | null = null;
    let typeName = "";
    let typeSlug = "";

    // Extract type_id from notification_type object or fallback fields
    if (
      typeof notification.notification_type === "object" &&
      notification.notification_type
    ) {
      typeId = notification.notification_type.id;
      typeName = notification.notification_type.name;
      typeSlug = notification.notification_type.slug;
    }

    // Map type_id to proper names and details
    const typeMapping: Record<
      number,
      { name: string; slug: string; icon: string; color: string }
    > = {
      1: {
        name: "Announcements",
        slug: "announcements",
        icon: "campaign",
        color: "#10b981",
      },
      2: {
        name: "Private Messages",
        slug: "messages",
        icon: "message",
        color: "#8b5cf6",
      },
      3: {
        name: "System Alerts",
        slug: "alerts",
        icon: "warning",
        color: "#ef4444",
      },
      4: {
        name: "Importance Notifications",
        slug: "important",
        icon: "priority-high",
        color: "#f59e0b",
      },
      5: {
        name: "Birthday Alert",
        slug: "birthday",
        icon: "cake",
        color: "#ec4899",
      },
    };

    // Use type_id mapping if available
    if (typeId && typeMapping[typeId]) {
      return typeMapping[typeId];
    }

    // Fallback to slug-based mapping for legacy data
    const slugMapping: Record<
      string,
      { name: string; slug: string; icon: string; color: string }
    > = {
      announcements: typeMapping[1],
      messages: typeMapping[2],
      alerts: typeMapping[3],
      important: typeMapping[4],
      birthday: typeMapping[5],
      // Additional legacy mappings
      announcement: typeMapping[1],
      message: typeMapping[2],
      alert: typeMapping[3],
      assignment: {
        name: "Assignment",
        slug: "assignment",
        icon: "assignment",
        color: "#3b82f6",
      },
      reminder: {
        name: "Reminder",
        slug: "reminder",
        icon: "schedule",
        color: "#f59e0b",
      },
    };

    if (typeSlug && slugMapping[typeSlug]) {
      return slugMapping[typeSlug];
    }

    // Try with the old type field
    if (notification.type && slugMapping[notification.type]) {
      return slugMapping[notification.type];
    }

    // Final fallback
    return {
      name: typeName || notification.type || "General Notification",
      slug: typeSlug || notification.type || "general",
      icon: "notifications",
      color: "#3b82f6",
    };
  };

  const getNotificationIcon = (type?: string) => {
    // Legacy function kept for backwards compatibility
    const typeMapping: Record<string, { icon: string; color: string }> = {
      assignment: { icon: "assignment", color: "#3b82f6" },
      announcement: { icon: "campaign", color: "#10b981" },
      reminder: { icon: "schedule", color: "#f59e0b" },
      alert: { icon: "warning", color: "#ef4444" },
      message: { icon: "message", color: "#8b5cf6" },
      announcements: { icon: "campaign", color: "#10b981" },
      messages: { icon: "message", color: "#8b5cf6" },
      alerts: { icon: "warning", color: "#ef4444" },
      important: { icon: "priority-high", color: "#f59e0b" },
      birthday: { icon: "cake", color: "#ec4899" },
    };

    return (
      typeMapping[type || ""] || { icon: "notifications", color: "#3b82f6" }
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "#ef4444";
      case "high":
        return "#f59e0b";
      case "normal":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  // IMPORTANT: All hooks must be called before any conditional returns
  // This ensures consistent hook order on every render to prevent React hooks violations
  const allNotifications = notificationsData?.data || [];

  // Filter notifications based on selected filter
  const notifications = React.useMemo(() => {
    // First ensure we have valid notifications
    const validNotifications = allNotifications.filter(
      (n) => n && typeof n === "object" && n.id && (n.title || n.message),
    );

    switch (filter) {
      case "unread":
        return validNotifications.filter((n) => !(n.is_read ?? n.isRead));
      case "read":
        return validNotifications.filter((n) => n.is_read ?? n.isRead);
      default:
        return validNotifications;
    }
  }, [allNotifications, filter]);

  // Show loading state (after all hooks are called)
  if (notificationsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.userCategory}>
            {getUserCategoryDisplayName(
              typeof userCategory === "string"
                ? parseInt(userCategory)
                : userCategory,
            )}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="hourglass-empty" size={48} color="#6b7280" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
          <Text style={styles.loadingSubtext}>Check terminal for API logs</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {/* <Text style={styles.userCategory}>
              {getUserCategoryDisplayName(
                typeof userCategory === "string"
                  ? parseInt(userCategory)
                  : userCategory
              )}
            </Text> */}
          </View>
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>
              {allNotifications.filter((n) => !(n.is_read ?? n.isRead)).length}
            </Text>
          </View>

          <View style={styles.headerRight}>
            {/* Announcement Create Button - for authorized users only */}
            {canCreateAnnouncements(userCategoryNumber) && (
              <TouchableOpacity
                style={styles.createAnnouncementButton}
                onPress={() => setShowAnnouncementModal(true)}
              >
                <MaterialIcons name="campaign" size={18} color="#ffffff" />
                <Text style={styles.createButtonText}>Announcement</Text>
              </TouchableOpacity>
            )}

            {/* Developer tools button hidden per user request */}
            {/* <TouchableOpacity 
              style={styles.debugToggle}
              onPress={() => setShowDebugPanel(!showDebugPanel)}
            >
              <MaterialIcons 
                name={showDebugPanel ? "bug-report" : "settings"} 
                size={20} 
                color="#6b7280" 
              />
            </TouchableOpacity> */}
          </View>
        </View>
      </View>
      {/* <SafeAreaView style={styles.container}> */}
      <View style={styles.header}>
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {["all", "unread", "read"].map((filterType) => (
            <TouchableOpacity
              key={filterType}
              style={[
                styles.filterTab,
                filter === filterType && styles.activeFilterTab,
              ]}
              onPress={() => setFilter(filterType as any)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === filterType && styles.activeFilterText,
                ]}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                {filterType === "unread" && (
                  <Text style={styles.filterCount}>
                    {" "}
                    (
                    {
                      allNotifications.filter((n) => !(n.is_read ?? n.isRead))
                        .length
                    }
                    )
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Collapsible Debug Panel */}
        {showDebugPanel && (
          <View style={styles.debugPanel}>
            <View style={styles.debugHeader}>
              <MaterialIcons name="bug-report" size={18} color="#6b7280" />
              <Text style={styles.debugTitle}>Developer Tools</Text>
            </View>

            <View style={styles.debugContent}>
              <TouchableOpacity
                style={styles.debugButton}
                onPress={() => {
                  const error = notificationsError as any;
                  Alert.alert(
                    "API Status",
                    notificationsError
                      ? `❌ Error: ${error?.status || "Unknown"}\n${error?.data?.message || error?.message || "API failed"}`
                      : "✅ Notifications API working correctly",
                  );
                }}
              >
                <MaterialIcons
                  name={notificationsError ? "error" : "check-circle"}
                  size={16}
                  color={notificationsError ? "#ef4444" : "#10b981"}
                />
                <Text style={styles.debugButtonText}>
                  API Status: {notificationsError ? "Error" : "OK"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.debugButton}
                onPress={handleRefresh}
              >
                <MaterialIcons name="refresh" size={16} color="#3b82f6" />
                <Text style={styles.debugButtonText}>
                  Refresh Notifications
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.debugButton}
                onPress={() => {
                  Alert.alert(
                    "Stats API Status",
                    "Stats API is temporarily disabled to prevent 500 errors.\n\nWill be re-enabled when backend is ready.",
                  );
                }}
              >
                <MaterialIcons name="analytics" size={16} color="#f59e0b" />
                <Text style={styles.debugButtonText}>Stats API: Disabled</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.debugButton}
                onPress={() => {
                  Alert.alert(
                    "Console Commands",
                    "Open browser console and run:\n\n" +
                      "• testNotificationAPI.testAll()\n" +
                      "• testNotificationAPI.interactive()\n" +
                      "• window.testNotificationAPI.testInComponent()",
                    [{ text: "Got it" }],
                  );
                }}
              >
                <MaterialIcons name="terminal" size={16} color="#8b5cf6" />
                <Text style={styles.debugButtonText}>Console Tests</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons
                name={
                  filter === "unread" ? "mark-email-read" : "notifications-none"
                }
                size={56}
                color="#d1d5db"
              />
            </View>
            <Text style={styles.emptyText}>
              {filter === "unread"
                ? "All caught up!"
                : filter === "read"
                  ? "No read notifications"
                  : "No notifications yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              {filter === "unread"
                ? "You've read all your notifications"
                : filter === "read"
                  ? "Read notifications will appear here"
                  : "New notifications will appear here"}
            </Text>
            {allNotifications.length > 0 && filter !== "all" && (
              <TouchableOpacity
                style={styles.showAllButton}
                onPress={() => setFilter("all")}
              >
                <Text style={styles.showAllText}>Show All Notifications</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.notificationsList}>
            <FlatList
              data={notifications}
              renderItem={renderNotification}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>

      {/* Notification Details Modal */}
      <NotificationDetailsModal
        visible={showDetailsModal}
        notification={selectedNotification}
        onClose={handleCloseModal}
        onMarkAsRead={handleMarkAsRead}
      />

      {/* Create Announcement Modal */}
      <CreateAnnouncementModal
        visible={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        onSuccess={() => {
          setShowAnnouncementModal(false);
          // Optionally refresh notifications to show the new announcement if it creates notifications
          refetchNotifications();
        }}
      />
      {/* </SafeAreaView> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  userCategory: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "500",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  // createAnnouncementButton: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   backgroundColor: "gray",
  //   paddingHorizontal: 12,
  //   paddingVertical: 8,
  //   borderRadius: 8,
  //   gap: 6,
  //   shadowColor: "gray",
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.2,
  //   shadowRadius: 4,
  //   elevation: 3,
  // },
  createButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  notificationBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    position: "relative",
    right: 15,
    top: 5,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  debugToggle: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  createAnnouncementButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7c2d3e",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    shadowColor: "#7c2d3e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createAnnouncementText: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: "600",
  },
  filterContainer: {
    flexDirection: "row",
    gap: 4,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  activeFilterTab: {
    backgroundColor: "#3b82f6",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  activeFilterText: {
    color: "white",
  },
  filterCount: {
    fontSize: 12,
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    backgroundColor: "white",
    margin: 16,
    borderRadius: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 16,
    fontWeight: "500",
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },

  debugPanel: {
    backgroundColor: "white",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#8b5cf6",
  },
  debugHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  debugContent: {
    gap: 8,
  },
  debugButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  debugButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },

  notificationsList: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    backgroundColor: "white",
    margin: 16,
    borderRadius: 12,
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    color: "#374151",
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  showAllButton: {
    marginTop: 16,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  showAllText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  notificationCard: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 0,
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
  unreadCard: {
    backgroundColor: "#ffffff",
    borderColor: "#3b82f6",
    borderLeftWidth: 4,
    shadowOpacity: 0.12,
    elevation: 3,
    opacity: 1.0,
    shadowRadius: 6,
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
  priorityIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "white",
  },
  notificationContent: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  notificationTitle: {
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
  timeAndActions: {
    marginLeft: 12,
  },
  timeAgo: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  notificationDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationFooter: {
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
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "600",
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
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#fef2f2",
  },
});
