import { useEffect, useState, useCallback } from "react";
import * as Notifications from "expo-notifications";
import PushNotificationService, {
  NotificationData as PushNotificationData,
  ScheduledNotification,
} from "../services/notifications/PushNotificationService";
import NotificationManager, {
  NotificationData,
  NotificationManagerCallbacks,
  NotificationManagerConfig,
} from "../services/notifications/NotificationManager";
import RealTimeNotificationService from "../services/notifications/RealTimeNotificationService";

export interface UseNotificationsReturn {
  // State
  isInitialized: boolean;
  pushToken: string | null;
  lastNotification: Notifications.Notification | null;
  lastResponse: Notifications.NotificationResponse | null;
  badgeCount: number;

  // New unified notification state
  notifications: NotificationData[];
  unreadNotifications: NotificationData[];
  unreadCount: number;
  isConnected: boolean;

  // Actions
  sendNotification: (notification: PushNotificationData) => Promise<string>;
  scheduleNotification: (
    notification: ScheduledNotification,
  ) => Promise<string>;
  cancelNotification: (id: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  updateBadgeCount: (count: number) => Promise<void>;
  clearBadge: () => Promise<void>;

  // New unified notification actions
  markAsRead: (notificationId: number) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  refreshNotifications: () => void;

  // School-specific actions
  sendAcademicAlert: (
    title: string,
    body: string,
    studentId?: string,
  ) => Promise<string>;
  sendPaymentReminder: (
    title: string,
    body: string,
    amount?: number,
  ) => Promise<string>;
  sendEventNotification: (
    title: string,
    body: string,
    eventId?: string,
  ) => Promise<string>;
  sendGeneralNotification: (
    title: string,
    body: string,
    data?: Record<string, any>,
  ) => Promise<string>;

  // Service status
  getServiceStatus: () => any;
}

export const useNotifications = (
  authToken?: string,
  userId?: string,
): UseNotificationsReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [lastNotification, setLastNotification] =
    useState<Notifications.Notification | null>(null);
  const [lastResponse, setLastResponse] =
    useState<Notifications.NotificationResponse | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);

  // New unified notification state
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<
    NotificationData[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize notification manager
  useEffect(() => {
    const initializeNotifications = async () => {
      if (!authToken || !userId) {
        console.warn(
          "⚠️ Missing auth token or user ID for notification initialization",
        );
        return;
      }

      try {
        console.log("🔔 Initializing notifications in hook...");

        // Setup callbacks for NotificationManager
        const callbacks: NotificationManagerCallbacks = {
          onNewNotification: (notification) => {
            console.log("🆕 New notification in hook:", notification);
            refreshNotificationState();
          },
          onNotificationRead: (notificationId) => {
            console.log("✅ Notification read in hook:", notificationId);
            refreshNotificationState();
          },
          onUnreadCountChange: (count) => {
            console.log("📊 Unread count changed:", count);
            setUnreadCount(count);
            setBadgeCount(count);
          },
          onConnectionStateChange: (connected) => {
            console.log("🔗 Connection state changed:", connected);
            setIsConnected(connected);
          },
          onError: (error) => {
            console.error("❌ Notification error:", error);
          },
        };

        // Initialize NotificationManager
        const initialized = await NotificationManager.initialize(
          authToken,
          userId,
          callbacks,
        );

        if (initialized) {
          // Get push token from service
          const token = PushNotificationService.getPushToken();
          setPushToken(token);

          // Initial state refresh
          refreshNotificationState();

          setIsInitialized(true);
          console.log("✅ useNotifications hook initialized successfully");
        } else {
          console.warn("⚠️ Notification manager initialization failed");
        }
      } catch (error) {
        console.error("❌ Failed to initialize notifications in hook:", error);
      }
    };

    initializeNotifications();
  }, [authToken, userId]);

  // Helper function to refresh notification state
  const refreshNotificationState = useCallback(() => {
    const allNotifications = NotificationManager.getNotifications();
    const unread = NotificationManager.getUnreadNotifications();
    const count = NotificationManager.getUnreadCount();

    setNotifications(allNotifications);
    setUnreadNotifications(unread);
    setUnreadCount(count);
    setBadgeCount(count);
  }, []);

  // DISABLED: Push notification listeners
  // Keeping code for future re-enabling
  /*
  useEffect(() => {
    if (!isInitialized) return;

    const notificationListener = (notification: Notifications.Notification) => {
      setLastNotification(notification);
      console.log("🔔 Notification received in hook:", notification);
    };

    const responseListener = (response: Notifications.NotificationResponse) => {
      setLastResponse(response);
      console.log("👆 Notification response in hook:", response);
    };

    PushNotificationService.addNotificationListener(notificationListener);
    PushNotificationService.addResponseListener(responseListener);

    return () => {
      PushNotificationService.removeNotificationListener(notificationListener);
      PushNotificationService.removeResponseListener(responseListener);
    };
  }, [isInitialized]);
  */

  // Action callbacks (enhanced with unified system)
  const sendNotification = useCallback(
    async (notification: PushNotificationData): Promise<string> => {
      return await PushNotificationService.sendLocalNotification(notification);
    },
    [],
  );

  // New unified notification actions
  const markAsRead = useCallback(
    async (notificationId: number): Promise<boolean> => {
      return await NotificationManager.markAsRead(notificationId);
    },
    [],
  );

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    return await NotificationManager.markAllAsRead();
  }, []);

  const refreshNotifications = useCallback(() => {
    refreshNotificationState();
  }, [refreshNotificationState]);

  const scheduleNotification = useCallback(
    async (notification: ScheduledNotification): Promise<string> => {
      return await PushNotificationService.scheduleNotification(notification);
    },
    [],
  );

  const cancelNotification = useCallback(async (id: string): Promise<void> => {
    await PushNotificationService.cancelNotification(id);
  }, []);

  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    await PushNotificationService.cancelAllNotifications();
  }, []);

  const updateBadgeCount = useCallback(async (count: number): Promise<void> => {
    await PushNotificationService.setBadgeCount(count);
    setBadgeCount(count);
  }, []);

  const clearBadge = useCallback(async (): Promise<void> => {
    await PushNotificationService.clearBadge();
    setBadgeCount(0);
  }, []);

  // School-specific callbacks
  const sendAcademicAlert = useCallback(
    async (
      title: string,
      body: string,
      studentId?: string,
    ): Promise<string> => {
      return await PushNotificationService.sendAcademicAlert(
        title,
        body,
        studentId,
      );
    },
    [],
  );

  const sendPaymentReminder = useCallback(
    async (title: string, body: string, amount?: number): Promise<string> => {
      return await PushNotificationService.sendPaymentReminder(
        title,
        body,
        amount,
      );
    },
    [],
  );

  const sendEventNotification = useCallback(
    async (title: string, body: string, eventId?: string): Promise<string> => {
      return await PushNotificationService.sendEventNotification(
        title,
        body,
        eventId,
      );
    },
    [],
  );

  const sendGeneralNotification = useCallback(
    async (
      title: string,
      body: string,
      data?: Record<string, any>,
    ): Promise<string> => {
      return await PushNotificationService.sendGeneralNotification(
        title,
        body,
        data,
      );
    },
    [],
  );

  // Service status
  const getServiceStatus = useCallback(() => {
    return {
      notificationManager: NotificationManager.getStatus(),
      realTimeService: RealTimeNotificationService.getStatus(),
      pushService: PushNotificationService.getServiceStatus(),
    };
  }, []);

  return {
    // State
    isInitialized,
    pushToken,
    lastNotification,
    lastResponse,
    badgeCount,

    // New unified notification state
    notifications,
    unreadNotifications,
    unreadCount,
    isConnected,

    // Actions
    sendNotification,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    updateBadgeCount,
    clearBadge,

    // New unified notification actions
    markAsRead,
    markAllAsRead,
    refreshNotifications,

    // School-specific actions
    sendAcademicAlert,
    sendPaymentReminder,
    sendEventNotification,
    sendGeneralNotification,

    // Service status
    getServiceStatus,
  };
};
