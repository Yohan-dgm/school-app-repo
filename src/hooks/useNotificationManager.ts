import { useEffect, useState, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import NotificationManager, {
  NotificationData,
  NotificationManagerCallbacks,
  NotificationManagerConfig,
} from "../services/notifications/NotificationManager";

export interface UseNotificationManagerOptions {
  config?: Partial<NotificationManagerConfig>;
  autoInitialize?: boolean;
}

export interface UseNotificationManagerReturn {
  // State
  isInitialized: boolean;
  isConnected: boolean;
  notifications: NotificationData[];
  unreadNotifications: NotificationData[];
  unreadCount: number;

  // Actions
  initialize: (authToken: string, userId: string) => Promise<boolean>;
  markAsRead: (notificationId: number) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  refresh: () => void;
  refreshNotifications: () => void; // Add alias for backward compatibility
  updateAuthToken: (authToken: string, userId: string) => Promise<void>;
  disconnect: () => Promise<void>;

  // Callbacks
  setCallbacks: (callbacks: Partial<NotificationManagerCallbacks>) => void;

  // Status
  getStatus: () => any;

  // Error handling
  lastError: any;
}

export const useNotificationManager = (
  options: UseNotificationManagerOptions = {},
): UseNotificationManagerReturn => {
  // Configuration
  const { config, autoInitialize = true } = options;

  // Get auth data from Redux store (from app slice)
  const authToken = useSelector((state: any) => state.app?.token);
  const userId = useSelector((state: any) => state.app?.user?.id);

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<
    NotificationData[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastError, setLastError] = useState<any>(null);

  // Refs to avoid stale closures
  const callbacksRef = useRef<NotificationManagerCallbacks>({});
  const isInitializedRef = useRef(false);

  // Refresh notification state from manager
  const refreshState = useCallback(() => {
    try {
      // Check if manager is initialized before calling methods
      if (!isInitializedRef.current) {
        console.warn(
          "⚠️ NotificationManager not initialized, using default values",
        );
        setIsConnected(false);
        setUnreadCount(0);
        setNotifications([]);
        setUnreadNotifications([]);
        return;
      }

      const allNotifications = NotificationManager.getNotifications();
      const unread = NotificationManager.getUnreadNotifications();
      const count = NotificationManager.getUnreadCount();
      const connected = NotificationManager.isConnected();

      setNotifications(allNotifications);
      setUnreadNotifications(unread);
      setUnreadCount(count);
      setIsConnected(connected);
    } catch (error) {
      console.error("❌ Error refreshing notification state:", error);
      setLastError(error);
      // Set safe defaults on error
      setIsConnected(false);
      setUnreadCount(0);
      setNotifications([]);
      setUnreadNotifications([]);
    }
  }, []);

  // Default callbacks
  const defaultCallbacks: NotificationManagerCallbacks = {
    onNewNotification: (notification) => {
      console.log("🆕 Hook - New notification received:", notification);
      refreshState();
      callbacksRef.current.onNewNotification?.(notification);
    },
    onNotificationRead: (notificationId) => {
      console.log("✅ Hook - Notification read:", notificationId);
      refreshState();
      callbacksRef.current.onNotificationRead?.(notificationId);
    },
    onUnreadCountChange: (count) => {
      console.log("📊 Hook - Unread count changed:", count);
      setUnreadCount(count);
      // Also refresh state to ensure UI is synchronized
      refreshState();
      callbacksRef.current.onUnreadCountChange?.(count);
    },
    onConnectionStateChange: (connected) => {
      console.log("🔗 Hook - Connection state changed:", connected);
      setIsConnected(connected);
      if (connected) {
        // Refresh state when connection is restored
        refreshState();
      }
      callbacksRef.current.onConnectionStateChange?.(connected);
    },
    onError: (error) => {
      console.error("❌ Hook - Notification error:", error);
      setLastError(error);
      callbacksRef.current.onError?.(error);
    },
  };

  // Initialize notification manager
  const initialize = useCallback(
    async (token: string, userIdParam: string): Promise<boolean> => {
      try {
        console.log("🚀 Initializing notification manager from hook...", {
          hasToken: !!token,
          userId: userIdParam,
        });

        setLastError(null);

        const success = await NotificationManager.initialize(
          token,
          userIdParam,
          defaultCallbacks,
          config,
        );

        if (success) {
          setIsInitialized(true);
          isInitializedRef.current = true;
          refreshState();
          console.log("✅ Notification manager initialized successfully");
        } else {
          console.warn("⚠️ Notification manager initialization failed");
          setIsInitialized(false);
          isInitializedRef.current = false;
        }

        return success;
      } catch (error) {
        console.error("❌ Failed to initialize notification manager:", error);
        setLastError(error);
        setIsInitialized(false);
        isInitializedRef.current = false;
        return false;
      }
    },
    [config, refreshState],
  );

  // Auto-initialize when auth data is available
  useEffect(() => {
    if (autoInitialize && authToken && userId && !isInitializedRef.current) {
      console.log("🔄 Auto-initializing notification manager...");
      initialize(authToken, userId.toString());
    }
  }, [autoInitialize, authToken, userId, initialize]);

  // Cleanup on unmount or auth changes
  useEffect(() => {
    return () => {
      if (isInitializedRef.current) {
        console.log("🧹 Cleaning up notification manager...");
        NotificationManager.disconnect();
        isInitializedRef.current = false;
        setIsInitialized(false);
      }
    };
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: number): Promise<boolean> => {
      try {
        if (!isInitializedRef.current) {
          console.warn(
            "⚠️ NotificationManager not initialized, cannot mark as read",
          );
          return false;
        }
        const success = await NotificationManager.markAsRead(notificationId);
        if (success) {
          refreshState();
        }
        return success;
      } catch (error) {
        console.error("❌ Error marking notification as read:", error);
        setLastError(error);
        return false;
      }
    },
    [refreshState],
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      if (!isInitializedRef.current) {
        console.warn(
          "⚠️ NotificationManager not initialized, cannot mark all as read",
        );
        return false;
      }
      const success = await NotificationManager.markAllAsRead();
      if (success) {
        refreshState();
      }
      return success;
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error);
      setLastError(error);
      return false;
    }
  }, [refreshState]);

  // Refresh notifications
  const refresh = useCallback(() => {
    refreshState();
  }, [refreshState]);

  // Update auth token
  const updateAuthToken = useCallback(
    async (token: string, userIdParam: string): Promise<void> => {
      try {
        console.log("🔄 Updating auth token in notification manager...");
        await NotificationManager.updateAuthToken(token, userIdParam);
        refreshState();
      } catch (error) {
        console.error("❌ Error updating auth token:", error);
        setLastError(error);
      }
    },
    [refreshState],
  );

  // Disconnect
  const disconnect = useCallback(async (): Promise<void> => {
    try {
      console.log("🔌 Disconnecting notification manager...");
      await NotificationManager.disconnect();
      setIsInitialized(false);
      isInitializedRef.current = false;
      setIsConnected(false);
      setNotifications([]);
      setUnreadNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("❌ Error disconnecting notification manager:", error);
      setLastError(error);
    }
  }, []);

  // Set custom callbacks
  const setCallbacks = useCallback(
    (callbacks: Partial<NotificationManagerCallbacks>) => {
      callbacksRef.current = { ...callbacksRef.current, ...callbacks };

      // Update NotificationManager callbacks if already initialized
      if (isInitializedRef.current) {
        NotificationManager.updateCallbacks({
          ...defaultCallbacks,
          ...callbacks,
        });
      }
    },
    [],
  );

  // Get service status
  const getStatus = useCallback(() => {
    try {
      if (!isInitializedRef.current) {
        return {
          isInitialized: false,
          isConnected: false,
          notificationCount: 0,
          unreadCount: 0,
          userId: null,
          hasAuthToken: false,
        };
      }
      return NotificationManager.getStatus();
    } catch (error) {
      console.error("❌ Error getting notification status:", error);
      setLastError(error);
      return null;
    }
  }, []);

  // Update auth when it changes (if already initialized)
  useEffect(() => {
    if (isInitializedRef.current && authToken && userId) {
      const currentUserId = userId.toString();
      console.log("🔄 Auth data changed, updating notification manager...");
      updateAuthToken(authToken, currentUserId);
    }
  }, [authToken, userId, updateAuthToken]);

  return {
    // State
    isInitialized,
    isConnected,
    notifications,
    unreadNotifications,
    unreadCount,

    // Actions
    initialize,
    markAsRead,
    markAllAsRead,
    refresh,
    refreshNotifications: refresh, // Add alias for backward compatibility
    updateAuthToken,
    disconnect,

    // Callbacks
    setCallbacks,

    // Status
    getStatus,

    // Error handling
    lastError,
  };
};

export default useNotificationManager;
