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
// Remove useFocusEffect to avoid navigation context errors
// import { useFocusEffect } from "@react-navigation/native";

// Working Notifications API (correct endpoints)
import {
  useGetNotificationsQuery,
  useGetNotificationStatsQuery,
  useMarkNotificationAsReadMutation,
  // useDeleteNotificationMutation, // Commented out - not currently used
} from "../../api/notifications";
import { useGetAnnouncementsQuery } from "../../api/announcements-api";
import {
  useGetChatThreadsQuery,
  useMarkChatAsReadMutation as useMarkChatAsReadMutationChat,
  useCreateNewChatGroupMutation
} from "../../api/chat-api";
import { apiServer1 } from "../../api/api-server-1";
import { useDispatch } from "react-redux";
// DISABLED: Push notifications
// import PushNotificationService from "../../services/notifications/PushNotificationService";

// Import types
import { BaseNotification } from "../../types/notifications";

import {
  getUserCategoryDisplayName,
  getUserCategoryId,
} from "../../constants/userCategories";
import NotificationDetailsModal from "./NotificationDetailsModal";
import CreateAnnouncementModal from "../announcements/CreateAnnouncementModal";
import NotificationTestPanel from "../debug/NotificationTestPanel";
import RealTimeNotificationService from "../../services/notifications/RealTimeNotificationService";

// Chat Components
import ChatListView from "./chat/ChatListView";
import ChatView from "./chat/ChatView";
import CreateGroupModal from "./chat/CreateGroupModal";
import GroupInfoScreen from "./chat/GroupInfoScreen";
import { ChatGroup } from "./chat/ChatTypes";

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
  const [showDebugPanel] = React.useState(false);
  const [filter, setFilter] = React.useState<
    "all" | "unread" | "read" | "chats" | "notifications"
  >("all");
  const [selectedNotification, setSelectedNotification] =
    React.useState<BaseNotification | null>(null);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] =
    React.useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = React.useState(false);
  const [selectedChat, setSelectedChat] = React.useState<ChatGroup | null>(null);
  const [currentView, setCurrentView] = React.useState<"list" | "chat" | "info">("list");
  // DISABLED: Push notification test panel
  // const [showTestPanel, setShowTestPanel] = React.useState(false);

  // Redux dispatch for cache invalidation
  const dispatch = useDispatch();

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
          : ""
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
          : ""
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
          : ""
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
          : ""
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
      limit: 50, // Standardized: match Header component for shared cache
      filters: {
        filter: "all",
        search: "",
        type_id: undefined,
        priority: undefined,
        unread_only: false,
      },
    },
    {
      skip: !userId || !token,
    }
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
    }
  );

  const {
    data: realAnnouncementsData,
    isLoading: announcementsLoading,
    refetch: refetchRealAnnouncements,
  } = useGetAnnouncementsQuery(
    { status: "published" },
    { skip: !userId || !token }
  );

  const {
    data: chatThreadsData,
    isLoading: chatThreadsLoading,
    refetch: refetchChatThreads,
  } = useGetChatThreadsQuery(
    { type: "all" },
    { 
      skip: !userId || !token,
      pollingInterval: 5000, // Poll every 5 seconds for new messages/groups
    }
  );

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markChatAsRead] = useMarkChatAsReadMutationChat();
  const [createChatGroup, { isLoading: isCreatingGroup }] = useCreateNewChatGroupMutation();

  const handleCreateGroup = async (data: { name: string; description: string; category: string, selectionData?: any, only_admins_can_message?: boolean }) => {
    try {
      apiLogger.info("Attempting to create chat group", data);
      
      const payload: any = {
        name: data.name,
        type: "group",
        category: data.category,
        only_admins_can_message: data.only_admins_can_message,
        is_disabled: false,
        ...data.selectionData,
      };

      const result = await createChatGroup(payload).unwrap();
      
      apiLogger.success("Chat group created", result);
      setShowCreateGroupModal(false);
      
      // If result contains the new group, we could potentially open it directly
      if (result?.data?.id) {
        setSelectedChat(result.data);
        setCurrentView("chat");
      } else {
        Alert.alert("Success", `Group "${data.name}" created successfully!`);
      }
    } catch (err: any) {
      apiLogger.error("Failed to create chat group", err);
      Alert.alert("Error", err?.data?.message || "Failed to create group. Please try again.");
    }
  };
  // const [deleteNotification] = useDeleteNotificationMutation(); // Commented out - not currently used

  // Log API responses when data changes
  React.useEffect(() => {
    if (notificationsData) {
      apiLogger.success("Notifications data received", {
        endpoint: `api/communication-management/notifications/list`,
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
        endpoint: `api/communication-management/notifications/list`,
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
      (window as any).testNotificationAPI = {
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
        "🧪 Component test functions available at window.testNotificationAPI"
      );
    }
  }, [userCategory, userId, token, refetchNotifications, refetchStats]);

  // Auto-refresh notifications with standard useEffect (removed useFocusEffect dependency)
  React.useEffect(() => {
    // Initial refresh when component mounts
    const initialRefresh = async () => {
      try {
        await refetchNotifications();
        apiLogger.success("Auto-refresh completed");
      } catch (error) {
        apiLogger.error("Auto-refresh failed", { error });
      }
    };

    initialRefresh();

    // Set up periodic refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      apiLogger.info("Periodic auto-refresh triggered");
      refetchNotifications().catch((error) => {
        apiLogger.warn("Periodic refresh failed", { error });
      });
    }, 30000); // Refresh every 30 seconds

    // Cleanup interval on unmount
    return () => {
      clearInterval(refreshInterval);
      apiLogger.info("Auto-refresh cleanup completed");
    };
  }, [refetchNotifications]);

  // Real-time notification listeners
  React.useEffect(() => {
    if (!token || !userId) {
      apiLogger.warn("Real-time setup skipped - missing auth credentials");
      return;
    }

    apiLogger.info("Setting up real-time notification listeners");

    // DISABLED: Push notification service initialization
    // Keeping code for future re-enabling
    /*
    const initializePushService = async () => {
      try {
        console.log(
          "🔧 [DEBUG] Starting PushNotificationService initialization..."
        );
        await PushNotificationService.initialize(token, userId.toString());

        const status = PushNotificationService.getServiceStatus();
        console.log(
          "🔧 [DEBUG] PushNotificationService initialized successfully:",
          status
        );
        apiLogger.info("Push notification service initialized");

        // Test if service can send notifications
        console.log("🧪 [DEBUG] Testing push notification availability...");
        const isAvailable =
          PushNotificationService.isLocalNotificationAvailable();
        console.log("🧪 [DEBUG] Local notifications available:", isAvailable);
      } catch (error) {
        console.error(
          "❌ [DEBUG] PushNotificationService initialization failed:",
          error
        );
        apiLogger.warn("Push notification service initialization failed", {
          error,
        });
      }
    };
    */

    const initializeRealTime = async () => {
      apiLogger.info("Real-time notification listeners are handled by BackgroundNotificationService");
    };

    // Initialize services
    // DISABLED: Push notification service
    // initializePushService();
    initializeRealTime();

    // Cleanup on unmount - Lifecycle is managed by BackgroundNotificationService
    return () => {
      apiLogger.info("Unmounting UniversalNotificationSystem - keeping real-time connection alive");
    };
  }, [token, userId, dispatch]);

  const handleRefresh = React.useCallback(async () => {
    apiLogger.info("Manual refresh triggered");
    setRefreshing(true);

    try {
      // Only refetch queries that are actually running
      await Promise.all([
        refetchNotifications(),
        refetchRealAnnouncements(),
        refetchChatThreads(),
      ]);
      // Note: Stats query is skipped, so we don't refetch it to avoid errors
      apiLogger.success("Manual refresh completed");
    } catch (error) {
      apiLogger.error("Manual refresh failed", { error });
    } finally {
      setRefreshing(false);
    }
  }, [refetchNotifications, refetchRealAnnouncements]);

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

  // const handleDeleteNotification = async (notificationId: number) => {
  //   apiLogger.info("Deleting notification", { notificationId });

  //   Alert.alert(
  //     "Confirm Delete",
  //     "Are you sure you want to delete this notification?",
  //     [
  //       { text: "Cancel", style: "cancel" },
  //       {
  //         text: "Delete",
  //         style: "destructive",
  //         onPress: async () => {
  //           try {
  //             const result = await deleteNotification({
  //               notificationId: notificationId.toString(),
  //             }).unwrap();

  //             apiLogger.success("Notification deleted", {
  //               notificationId,
  //               response: result,
  //             });

  //             Alert.alert("Success", "Notification deleted");
  //           } catch (error) {
  //             apiLogger.error("Failed to delete notification", {
  //               notificationId,
  //               error,
  //             });
  //             Alert.alert("Error", "Failed to delete notification");
  //           }
  //         },
  //       },
  //     ]
  //   );
  // };

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

  // const handleOpenAnnouncementModal = () => {
  //   setShowAnnouncementModal(true);
  // };

  // const handleCloseAnnouncementModal = () => {
  //   setShowAnnouncementModal(false);
  // };

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
                    "Unknown time"
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

  // const getNotificationIcon = (type?: string) => {
  //   // Legacy function kept for backwards compatibility
  //   const typeMapping: Record<string, { icon: string; color: string }> = {
  //     assignment: { icon: "assignment", color: "#3b82f6" },
  //     announcement: { icon: "campaign", color: "#10b981" },
  //     reminder: { icon: "schedule", color: "#f59e0b" },
  //     alert: { icon: "warning", color: "#ef4444" },
  //     message: { icon: "message", color: "#8b5cf6" },
  //     announcements: { icon: "campaign", color: "#10b981" },
  //     messages: { icon: "message", color: "#8b5cf6" },
  //     alerts: { icon: "warning", color: "#ef4444" },
  //     important: { icon: "priority-high", color: "#f59e0b" },
  //     birthday: { icon: "cake", color: "#ec4899" },
  //   };

  //   return (
  //     typeMapping[type || ""] || { icon: "notifications", color: "#3b82f6" }
  //   );
  // };

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

  // Filter notifications based on unified filter
  const notifications = React.useMemo(() => {
    // First ensure we have valid notifications
    let validNotifications = allNotifications.filter(
      (n) => n && typeof n === "object" && n.id && (n.title || n.message)
    );

    // Apply unified filter
    switch (filter) {
      case "all":
        // Show all notifications
        return validNotifications;

      case "unread":
        // Show only unread notifications
        return validNotifications.filter((n) => !(n.is_read ?? n.isRead));

      case "read":
        // Show only read notifications
        return validNotifications.filter((n) => n.is_read ?? n.isRead);

      case "notifications":
        // Show all notifications
        return validNotifications;

      default:
        return validNotifications;
    }
  }, [allNotifications, filter]);

  // Map real announcements and notifications to ChatGroup format
  const combinedChats = React.useMemo(() => {
    // 1. Map filtered notifications
    const mappedNotifications: ChatGroup[] = (notifications || []).map(item => ({
      id: `notification-${item.id}`,
      name: item.title,
      description: item.message,
      avatar_url: "https://ui-avatars.com/api/?name=N&background=3b82f6&color=fff",
      unread_count: (item.is_read ?? item.isRead) ? 0 : 1,
      type: "system",
      created_at: item.created_at || (item as any).timestamp || new Date().toISOString(),
      updated_at: (item as any).updated_at || item.created_at || new Date().toISOString(),
      last_message: {
        id: `msg-not-${item.id}`,
        sender_name: "System",
        type: "text",
        content: item.message,
        timestamp: item.timestamp || item.created_at || new Date().toISOString(),
        created_at: item.created_at || new Date().toISOString(),
      },
    }));

    // 2. Map real announcements
    // Only show announcements if filter is 'all' or 'school' or 'unread' (if unread)
    const showAnnouncements = ["all", "notifications", "read", "unread"].includes(filter);
    const mappedAnnouncements: ChatGroup[] = showAnnouncements 
      ? (realAnnouncementsData?.announcements || []).map(item => ({
          id: `announcement-${item.id}`,
          name: item.title,
          description: item.excerpt || item.content,
          avatar_url: item.image_url || "https://ui-avatars.com/api/?name=A&background=f59e0b&color=fff",
          unread_count: 0,
          type: "system",
          created_at: item.published_at || item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || item.created_at || new Date().toISOString(),
          last_message: {
            id: `msg-ann-${item.id}`,
            sender_name: "School Admin",
            type: "text",
            content: item.excerpt || item.content,
            timestamp: item.published_at || item.created_at || new Date().toISOString(),
            created_at: item.created_at || new Date().toISOString(),
          },
        }))
      : [];

    // 3. Real chat threads
    // Only show if filter is 'all' or 'chats'
    const showChats = ["all", "chats", "read", "unread"].includes(filter);
    const realChatThreads: ChatGroup[] = showChats
      ? (chatThreadsData?.data?.threads || []).map(chat => ({
          ...chat,
          // Ensure they have root dates for sorting if missing
          created_at: chat.created_at || (chat.last_message?.timestamp) || new Date().toISOString(),
        }))
      : [];

    console.log("📊 UniversalNotificationSystem - Data Summary:", {
      filter,
      notificationsCount: mappedNotifications.length,
      announcementsCount: mappedAnnouncements.length,
      chatThreadsCount: realChatThreads.length,
      totalCombined: mappedNotifications.length + mappedAnnouncements.length + realChatThreads.length,
    });

    return [...mappedAnnouncements, ...mappedNotifications, ...realChatThreads];
  }, [notifications, realAnnouncementsData, chatThreadsData, filter]);

  // Show loading state (after all hooks are called)
  if (notificationsLoading || announcementsLoading || chatThreadsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.userCategory}>
            {getUserCategoryDisplayName(
              typeof userCategory === "string"
                ? parseInt(userCategory)
                : userCategory
            )}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="hourglass-empty" size={48} color="#6b7280" />
          <Text style={styles.loadingText}>Loading data for User #{userId}...</Text>
          <Text style={styles.loadingSubtext}>
            N: {notificationsData?.data?.length || 0} | 
            A: {realAnnouncementsData?.announcements?.length || 0} | 
            C: {chatThreadsData?.data?.threads?.length || 0}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render logic for different views
  if (currentView === "chat" && selectedChat) {
    return (
      <ChatView
        group={selectedChat}
        onBack={() => {
          setCurrentView("list");
          setSelectedChat(null);
        }}
        onInfoPress={() => setCurrentView("info")}
      />
    );
  }

  if (currentView === "info" && selectedChat) {
    return (
      <GroupInfoScreen
        chat={selectedChat}
        onBack={() => setCurrentView("chat")}
        onUpdateGroup={(updatedChat) => {
          setSelectedChat(updatedChat);
          // In a real app, update the global state or refetch
        }}
        onDeleteGroup={(id) => {
          setCurrentView("list");
          setSelectedChat(null);
          Alert.alert("Deleted", "Group has been deleted.");
        }}
        currentUserId={userId}
      />
    );
  }


  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: 'white' }}>
      <ChatListView
        chats={combinedChats}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        activeFilter={filter}
        onFilterChange={setFilter as any}
        onChatPress={(chat) => {
          if (chat.type === 'system') {
            const chatIdStr = chat.id.toString();
            // Find corresponding announcement if it's an announcement
            const announcementMatch = chatIdStr.match(/^announcement-(\d+)$/);
            if (announcementMatch) {
              const realId = parseInt(announcementMatch[1]);
              const original = (realAnnouncementsData?.announcements || []).find(a => a.id === realId);
              
              if (original) {
                const mappedNotification: any = {
                  id: original.id,
                  title: original.title,
                  message: original.content,
                  timestamp: original.published_at || original.created_at,
                  isRead: true,
                  priority: original.priority_level === 3 ? 'urgent' : (original.priority_level === 2 ? 'high' : 'normal'),
                  type: 'announcement',
                  image_url: original.image_url
                };
                setSelectedNotification(mappedNotification);
                setShowDetailsModal(true);
                return;
              }
            }

            // Find corresponding notification if it's a notification
            const notificationMatch = chatIdStr.match(/^notification-(\d+)$/);
            if (notificationMatch) {
              const realId = parseInt(notificationMatch[1]);
              const original = (notificationsData?.data || []).find(n => n.id === realId);
              
              if (original) {
                handleNotificationPress(original);
                return;
              }
            }

            // Fallback for other system messages
            const mockNotification: any = {
              id: chat.id,
              title: chat.name,
              message: chat.last_message?.content || "No content",
              timestamp: chat.last_message?.timestamp || new Date().toISOString(),
              isRead: true,
              priority: 'normal',
              type: 'announcement'
            };
            setSelectedNotification(mockNotification);
            setShowDetailsModal(true);
          } else {
            setSelectedChat(chat);
            setCurrentView("chat");
          }
        }}
        onCreateGroup={() => setShowCreateGroupModal(true)}
        onCreateAnnouncement={() => setShowAnnouncementModal(true)}
      />
      
      {/* Group Creation Flow */}
      <CreateGroupModal
        visible={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onSuccess={handleCreateGroup}
      />

      {/* Notification Details Modal for read-only viewing */}
      <NotificationDetailsModal
        visible={showDetailsModal}
        notification={selectedNotification}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedNotification(null);
        }}
        onMarkAsRead={(id) => console.log("Marking as read:", id)}
      />

      {/* Create Announcement Modal kept for admin utility */}
      <CreateAnnouncementModal
        visible={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        onSuccess={() => {
          setShowAnnouncementModal(false);
          refetchNotifications();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  userCategory: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "500",
  },
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginBottom: 12,
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
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: "white",
    fontSize: 13,
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
    shadowColor: "#7c2d3e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  createAnnouncementText: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: "600",
  },
  filterScrollContent: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    gap: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  activeFilterTab: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  activeFilterText: {
    color: "white",
  },
  filterCount: {
    fontSize: 11,
    opacity: 0.9,
    fontWeight: "500",
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
    backgroundColor: "#0000ff0d",
    borderColor: "#3b82f6",
    borderLeftWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
    opacity: 1.0,
    shadowRadius: 6,
  },
  unreadIndicator: {
    width: 0,
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
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  testButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  testPanelOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
});
