import * as Notifications from "expo-notifications";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatDistanceToNow, parseISO } from "date-fns";

import PushNotificationService from "./PushNotificationService";
import RealTimeNotificationService, {
  RealTimeNotification,
  NotificationStats,
  RealTimeCallbacks,
} from "./RealTimeNotificationService";

export interface NotificationData {
  id: number;
  recipient_id: number;
  title: string;
  message: string;
  priority: "normal" | "high" | "urgent";
  priority_label?: string;
  priority_color?: string;
  type: string;
  type_name?: string;
  action_url?: string;
  action_text?: string;
  image_url?: string;
  is_read: boolean;
  is_delivered: boolean;
  created_at: string;
  read_at?: string;
  time_ago?: string;
}

export interface NotificationManagerCallbacks {
  onNewNotification?: (notification: NotificationData) => void;
  onNotificationRead?: (notificationId: number) => void;
  onUnreadCountChange?: (count: number) => void;
  onConnectionStateChange?: (connected: boolean) => void;
  onError?: (error: any) => void;
}

export interface NotificationManagerConfig {
  enableRealTime: boolean;
  enablePushNotifications: boolean;
  deduplicationWindowMs: number;
}

class NotificationManager {
  private static instance: NotificationManager;
  private notifications: Map<number, NotificationData> = new Map();
  private recentNotificationIds: Set<number> = new Set();
  private unreadCount: number = 0;
  private callbacks: NotificationManagerCallbacks = {};
  private config: NotificationManagerConfig = {
    enableRealTime: true,
    enablePushNotifications: true,
    deduplicationWindowMs: 5000, // 5 seconds
  };

  private authToken: string | null = null;
  private userId: string | null = null;
  private isInitialized: boolean = false;
  private _isConnected: boolean = false;

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Initialize the notification manager
   */
  async initialize(
    authToken: string,
    userId: string,
    callbacks: NotificationManagerCallbacks = {},
    config: Partial<NotificationManagerConfig> = {},
  ): Promise<boolean> {
    try {
      console.log("🚀 Initializing NotificationManager...", {
        userId,
        hasAuthToken: !!authToken,
        enableRealTime: config.enableRealTime ?? this.config.enableRealTime,
        enablePushNotifications:
          config.enablePushNotifications ?? this.config.enablePushNotifications,
      });

      // Store configuration
      this.authToken = authToken;
      this.userId = userId;
      this.callbacks = callbacks;
      this.config = { ...this.config, ...config };

      let initResults = { push: false, realTime: false };

      // DISABLED: Push notifications initialization
      // Keeping code for future re-enabling
      /*
      if (this.config.enablePushNotifications) {
        try {
          await PushNotificationService.initialize(authToken, userId);
          this.setupPushNotificationListeners();
          initResults.push = true;
          console.log("✅ Push notifications initialized");
        } catch (error) {
          console.error("❌ Push notifications initialization failed:", error);
          this.callbacks.onError?.(error);
        }
      }
      */
      // Skip push notification initialization
      console.log("⚠️ Push notifications are disabled")

      // Initialize real-time notifications if enabled
      if (this.config.enableRealTime) {
        try {
          const realTimeCallbacks: RealTimeCallbacks = {
            onNotificationCreated: this.handleRealTimeNotification.bind(this),
            onNotificationRead: this.handleRealTimeNotificationRead.bind(this),
            onStatsUpdated: this.handleStatsUpdate.bind(this),
            onConnectionStateChange:
              this.handleConnectionStateChange.bind(this),
            onError: this.callbacks.onError,
          };

          initResults.realTime = await RealTimeNotificationService.initialize(
            authToken,
            userId,
            realTimeCallbacks,
          );

          if (initResults.realTime) {
            console.log("✅ Real-time notifications initialized");
          } else {
            console.warn("⚠️ Real-time notifications initialization failed");
          }
        } catch (error) {
          console.error(
            "❌ Real-time notifications initialization failed:",
            error,
          );
          this.callbacks.onError?.(error);
        }
      }

      // Setup app state listener
      this.setupAppStateListener();

      // Load cached notifications
      await this.loadCachedNotifications();

      this.isInitialized = true;

      console.log("🚀 NotificationManager initialized successfully:", {
        pushNotifications: initResults.push,
        realTimeNotifications: initResults.realTime,
        totalSuccess: initResults.push || initResults.realTime,
      });

      return initResults.push || initResults.realTime;
    } catch (error) {
      console.error("❌ NotificationManager initialization failed:", error);
      this.callbacks.onError?.(error);
      return false;
    }
  }

  /**
   * DISABLED: Setup push notification listeners
   * Keeping code for future re-enabling
   */
  /*
  private setupPushNotificationListeners(): void {
    // Listen for notification responses (user tapped notification)
    PushNotificationService.addResponseListener(
      (response: Notifications.NotificationResponse) => {
        console.log("👆 Push notification response received:", response);

        const notificationData = response.notification.request.content.data;

        // Handle navigation based on notification data
        this.handleNotificationNavigation(notificationData);
      },
    );

    // Listen for notifications received in foreground
    PushNotificationService.addNotificationListener(
      (notification: Notifications.Notification) => {
        console.log(
          "📨 Push notification received in foreground:",
          notification,
        );

        // Convert to our notification format and process
        const notificationData =
          this.convertPushNotificationToData(notification);
        if (notificationData) {
          this.processNotification(notificationData, "push");
        }
      },
    );
  }
  */

  /**
   * DISABLED: Convert push notification to our data format
   * Keeping code for future re-enabling
   */
  /*
  private convertPushNotificationToData(
    notification: Notifications.Notification,
  ): NotificationData | null {
    try {
      const content = notification.request.content;
      const data = content.data || {};

      return {
        id: parseInt(data.id) || Date.now(),
        recipient_id:
          parseInt(data.recipient_id) || parseInt(this.userId || "0"),
        title: content.title || "Notification",
        message: content.body || "",
        priority: (data.priority as any) || "normal",
        priority_label: data.priority_label,
        priority_color: data.priority_color,
        type: data.type || "general",
        type_name: data.type_name,
        action_url: data.action_url,
        action_text: data.action_text,
        image_url: data.image_url,
        is_read: false,
        is_delivered: true,
        created_at: new Date().toISOString(),
        time_ago: "Just now",
      };
    } catch (error) {
      console.error("❌ Error converting push notification:", error);
      return null;
    }
  }
  */

  /**
   * Handle real-time notification
   */
  private handleRealTimeNotification(notification: RealTimeNotification): void {
    console.log("⚡ Real-time notification received:", notification);

    const notificationData: NotificationData = {
      ...notification,
      time_ago:
        notification.time_ago || this.formatTimeAgo(notification.created_at),
    };

    this.processNotification(notificationData, "realtime");
  }

  /**
   * Handle real-time notification read event
   */
  private handleRealTimeNotificationRead(data: {
    id: number;
    recipient_id: number;
    is_read: boolean;
    read_at: string;
  }): void {
    console.log("✅ Real-time notification read event:", data);

    const notification = this.notifications.get(data.id);
    if (notification) {
      notification.is_read = data.is_read;
      notification.read_at = data.read_at;

      if (data.is_read) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.callbacks.onUnreadCountChange?.(this.unreadCount);
        this.callbacks.onNotificationRead?.(data.id);
      }

      // Update cache
      this.cacheNotifications();
    }
  }

  /**
   * Handle stats update
   */
  private handleStatsUpdate(stats: NotificationStats): void {
    console.log("📊 Notification stats updated:", stats);

    if (stats.unread_count !== this.unreadCount) {
      this.unreadCount = stats.unread_count;
      this.callbacks.onUnreadCountChange?.(this.unreadCount);
    }
  }

  /**
   * Handle connection state change
   */
  private handleConnectionStateChange(connected: boolean): void {
    console.log("🔗 Connection state changed:", connected);

    this._isConnected = connected;
    this.callbacks.onConnectionStateChange?.(connected);
  }

  /**
   * Process a notification (with deduplication)
   */
  private processNotification(
    notification: NotificationData,
    source: "push" | "realtime",
  ): void {
    console.log(`📝 NotificationManager - Processing ${source} notification:`, {
      id: notification.id,
      title: notification.title,
      is_read: notification.is_read,
      source,
    });

    // Check for duplicates
    if (this.recentNotificationIds.has(notification.id)) {
      console.log(
        "🔄 NotificationManager - Duplicate notification detected, skipping:",
        notification.id,
      );
      return;
    }

    // Add to deduplication set
    this.recentNotificationIds.add(notification.id);

    // Remove from deduplication set after the window expires
    setTimeout(() => {
      this.recentNotificationIds.delete(notification.id);
    }, this.config.deduplicationWindowMs);

    // Store notification
    this.notifications.set(notification.id, notification);

    // Update unread count
    if (!notification.is_read) {
      this.unreadCount++;
      console.log(
        "📊 NotificationManager - Unread count updated:",
        this.unreadCount,
      );
      this.callbacks.onUnreadCountChange?.(this.unreadCount);
    }

    // Cache notifications
    this.cacheNotifications();

    // Notify callback - this is crucial for UI updates
    console.log(
      "📤 NotificationManager - Triggering onNewNotification callback",
    );
    this.callbacks.onNewNotification?.(notification);

    console.log(
      "✅ NotificationManager - Notification processed successfully:",
      {
        id: notification.id,
        source,
        unreadCount: this.unreadCount,
        totalNotifications: this.notifications.size,
        hasCallbacks: !!this.callbacks.onNewNotification,
      },
    );
  }

  /**
   * Handle notification navigation
   */
  private handleNotificationNavigation(data: any): void {
    console.log("🧭 Handling notification navigation:", data);

    // This can be enhanced based on your app's routing needs
    // For now, just log the navigation data
    if (data.action_url) {
      console.log("🔗 Should navigate to:", data.action_url);
      // TODO: Implement navigation logic based on your app's router
    }
  }

  /**
   * Setup app state listener
   */
  private setupAppStateListener(): void {
    AppState.addEventListener("change", (nextAppState) => {
      console.log("📱 App state changed:", nextAppState);

      if (nextAppState === "active") {
        // App came to foreground - sync with backend if needed
        this.syncWithBackend();
      }
    });
  }

  /**
   * Sync with backend (refresh notifications)
   */
  private async syncWithBackend(): Promise<void> {
    console.log("🔄 Syncing with backend...");
    // This can be enhanced to fetch latest notifications from the API
    // For now, we rely on real-time updates
  }

  /**
   * Format time ago string
   */
  private formatTimeAgo(timestamp: string): string {
    try {
      return formatDistanceToNow(parseISO(timestamp), { addSuffix: true });
    } catch (error) {
      console.error("❌ Error formatting time ago:", error);
      return "Unknown time";
    }
  }

  /**
   * Cache notifications to local storage
   */
  private async cacheNotifications(): Promise<void> {
    try {
      const notificationArray = Array.from(this.notifications.values());
      const cacheData = {
        notifications: notificationArray.slice(0, 50), // Keep last 50 notifications
        unreadCount: this.unreadCount,
        lastUpdated: Date.now(),
      };

      await AsyncStorage.setItem(
        `notifications_cache_${this.userId}`,
        JSON.stringify(cacheData),
      );
    } catch (error) {
      console.error("❌ Error caching notifications:", error);
    }
  }

  /**
   * Load cached notifications
   */
  private async loadCachedNotifications(): Promise<void> {
    try {
      const cachedData = await AsyncStorage.getItem(
        `notifications_cache_${this.userId}`,
      );

      if (cachedData) {
        const { notifications, unreadCount, lastUpdated } =
          JSON.parse(cachedData);

        // Only load cache if it's less than 1 hour old
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - lastUpdated < oneHour) {
          console.log("📦 Loading cached notifications:", notifications.length);

          this.notifications.clear();
          notifications.forEach((notification: NotificationData) => {
            this.notifications.set(notification.id, notification);
          });

          this.unreadCount = unreadCount || 0;
        }
      }
    } catch (error) {
      console.error("❌ Error loading cached notifications:", error);
    }
  }

  // Public API Methods

  /**
   * Get all notifications
   */
  getNotifications(): NotificationData[] {
    return Array.from(this.notifications.values()).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): NotificationData[] {
    return this.getNotifications().filter((n) => !n.is_read);
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.unreadCount;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<boolean> {
    try {
      const notification = this.notifications.get(notificationId);

      if (!notification) {
        console.warn("⚠️ Notification not found:", notificationId);
        return false;
      }

      if (notification.is_read) {
        console.log("✅ Notification already read:", notificationId);
        return true;
      }

      // Update local state optimistically
      notification.is_read = true;
      notification.read_at = new Date().toISOString();
      this.unreadCount = Math.max(0, this.unreadCount - 1);

      // DISABLED: Update badge count via push notifications
      // await PushNotificationService.setBadgeCount(this.unreadCount);

      // Cache and notify
      this.cacheNotifications();
      this.callbacks.onUnreadCountChange?.(this.unreadCount);
      this.callbacks.onNotificationRead?.(notificationId);

      console.log("✅ Notification marked as read locally:", notificationId);
      return true;
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      console.log("✅ Marking all notifications as read...");

      let markedCount = 0;
      this.notifications.forEach((notification) => {
        if (!notification.is_read) {
          notification.is_read = true;
          notification.read_at = new Date().toISOString();
          markedCount++;
        }
      });

      this.unreadCount = 0;

      // DISABLED: Update badge count via push notifications
      // await PushNotificationService.setBadgeCount(0);

      // Cache and notify
      this.cacheNotifications();
      this.callbacks.onUnreadCountChange?.(0);

      console.log(`✅ Marked ${markedCount} notifications as read`);
      return true;
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error);
      return false;
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Update callbacks
   */
  updateCallbacks(callbacks: Partial<NotificationManagerCallbacks>): void {
    console.log("🔄 NotificationManager - Updating callbacks:", {
      newCallbacks: Object.keys(callbacks),
      hasOnNewNotification: !!callbacks.onNewNotification,
      hasOnUnreadCountChange: !!callbacks.onUnreadCountChange,
      hasOnConnectionStateChange: !!callbacks.onConnectionStateChange,
    });

    this.callbacks = { ...this.callbacks, ...callbacks };

    console.log("✅ NotificationManager - Callbacks updated:", {
      totalCallbacks: Object.keys(this.callbacks).length,
      activeCallbacks: Object.keys(this.callbacks).filter(
        (key) => !!this.callbacks[key as keyof NotificationManagerCallbacks],
      ),
    });
  }

  /**
   * Update auth token
   */
  async updateAuthToken(authToken: string, userId: string): Promise<void> {
    console.log("🔄 Updating auth token in NotificationManager");

    this.authToken = authToken;
    this.userId = userId;

    // Update services
    await PushNotificationService.updateAuthToken(authToken, userId);

    // Reinitialize real-time service if it was enabled
    if (this.config.enableRealTime) {
      await RealTimeNotificationService.disconnect();
      await RealTimeNotificationService.initialize(authToken, userId, {
        onNotificationCreated: this.handleRealTimeNotification.bind(this),
        onNotificationRead: this.handleRealTimeNotificationRead.bind(this),
        onStatsUpdated: this.handleStatsUpdate.bind(this),
        onConnectionStateChange: this.handleConnectionStateChange.bind(this),
        onError: this.callbacks.onError,
      });
    }
  }

  /**
   * Get service status for debugging
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isConnected: this._isConnected,
      notificationCount: this.notifications.size,
      unreadCount: this.unreadCount,
      userId: this.userId,
      hasAuthToken: !!this.authToken,
      config: this.config,
      pushServiceStatus: PushNotificationService.getServiceStatus(),
      realTimeServiceStatus: RealTimeNotificationService.getStatus(),
    };
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    console.log("🔌 Disconnecting NotificationManager...");

    // Clear notifications
    this.notifications.clear();
    this.recentNotificationIds.clear();
    this.unreadCount = 0;

    // Disconnect services
    if (this.config.enableRealTime) {
      RealTimeNotificationService.disconnect();
    }

    // Clear auth data
    this.authToken = null;
    this.userId = null;
    this.isInitialized = false;
    this._isConnected = false;
    this.callbacks = {};

    console.log("✅ NotificationManager disconnected");
  }
}

export default NotificationManager.getInstance();
