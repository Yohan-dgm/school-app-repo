import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import axios from "axios";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  categoryId?: string;
  priority?: "low" | "normal" | "high" | "max";
  sound?: string;
  vibrate?: boolean;
}

export interface ScheduledNotification extends NotificationData {
  trigger: Notifications.NotificationTriggerInput;
}

export interface PushTokenRegistrationData {
  push_token: string;
  device_id: string;
  platform: "ios" | "android";
  app_version: string;
  device_name?: string;
  device_model?: string;
  os_version?: string;
}

export interface BackendApiResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: any;
}

class PushNotificationService {
  // ENABLED: Push notifications are now enabled
  private static PUSH_NOTIFICATIONS_DISABLED = false;

  private static instance: PushNotificationService;
  private pushToken: string | null = null;
  private authToken: string | null = null;
  private userId: string | null = null;
  private isRegisteredWithBackend: boolean = false;
  private notificationListeners: ((
    notification: Notifications.Notification,
  ) => void)[] = [];
  private responseListeners: ((
    response: Notifications.NotificationResponse,
  ) => void)[] = [];

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(authToken?: string, userId?: string): Promise<void> {
    // Check if push notifications are disabled
    if (PushNotificationService.PUSH_NOTIFICATIONS_DISABLED) {
      console.log("⚠️ Push notifications are disabled by feature flag");
      return;
    }

    try {
      console.log("📱 Initializing push notification service...", {
        hasAuthToken: !!authToken,
        userId: userId || "not provided",
      });

      // Store authentication details
      this.authToken = authToken || null;
      this.userId = userId || null;

      // Request permissions (this may fail on simulator)
      const permissionsGranted = await this.requestPermissions();

      if (!permissionsGranted) {
        console.warn(
          "⚠️ Push notification permissions not available, but local notifications will still work",
        );
      }

      // Get push token (this may fail without valid project ID)
      const token = await this.registerForPushNotifications();

      if (!token) {
        console.warn(
          "⚠️ Push token not available, but local notifications will still work",
        );
      }

      // Register with backend if we have authentication and token
      // NOTE: This is optional - local notifications work without backend registration
      if (token && authToken && userId) {
        this.registerTokenWithBackend(token).catch((error) => {
          console.warn("⚠️ Backend registration failed, but local notifications will still work:", error?.message || error);
        });
      }

      // Set up listeners (this should always work)
      this.setupNotificationListeners();

      console.log("📱 Push notification service initialized successfully");
    } catch (error) {
      console.warn(
        "⚠️ Push notification service initialization had issues, but local notifications should still work:",
        error,
      );

      // Ensure listeners are set up even if other parts fail
      try {
        this.setupNotificationListeners();
      } catch (listenerError) {
        console.error(
          "❌ Failed to setup notification listeners:",
          listenerError,
        );
      }
    }
  }

  private async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn(
        "⚠️ Push notifications are only supported on physical devices",
      );
      return false;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("⚠️ Push notification permissions not granted");
      return false;
    }

    console.log("✅ Push notification permissions granted");
    return true;
  }

  private async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn("⚠️ Push notifications only work on physical devices");
        return null;
      }

      // Try to get cached token first
      const cachedToken = await AsyncStorage.getItem("expo_push_token");
      if (cachedToken) {
        this.pushToken = cachedToken;
        console.log("📱 Using cached push token");

        // Configure Android channels if needed
        if (Platform.OS === "android") {
          await this.setupAndroidChannels();
        }

        return this.pushToken;
      }

      // Get project ID from Constants or environment
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        process.env.EXPO_PUBLIC_PROJECT_ID;

      if (!projectId) {
        console.warn(
          "⚠️ No valid Expo project ID configured. Push notifications will work locally only.",
        );

        // Configure Android channels for local notifications
        if (Platform.OS === "android") {
          await this.setupAndroidChannels();
        }

        return null;
      }

      console.log("📱 Using project ID for push token:", projectId);

      // Try to get Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      this.pushToken = token.data;

      // Store token locally
      await AsyncStorage.setItem("expo_push_token", this.pushToken);

      console.log("📱 Push token registered:", this.pushToken);

      // Configure Android notification channels
      if (Platform.OS === "android") {
        await this.setupAndroidChannels();
      }

      return this.pushToken;
    } catch (error) {
      console.warn("⚠️ Failed to register for push notifications:", error);

      // Configure Android channels even if token registration fails
      if (Platform.OS === "android") {
        try {
          await this.setupAndroidChannels();
        } catch (channelError) {
          console.warn("⚠️ Failed to setup Android channels:", channelError);
        }
      }

      // Don't throw error, just return null - local notifications will still work
      return null;
    }
  }

  private async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync("school-notifications", {
      name: "School Notifications",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("academic-alerts", {
      name: "Academic Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2196F3",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("payment-reminders", {
      name: "Payment Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4CAF50",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("events", {
      name: "School Events",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF9800",
      sound: "default",
    });
  }

  private setupNotificationListeners(): void {
    // Listen for notifications received while app is foregrounded
    Notifications.addNotificationReceivedListener((notification) => {
      console.log("📨 Notification received in foreground:", notification);
      this.notificationListeners.forEach((listener) => listener(notification));
    });

    // Listen for user interactions with notifications
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("👆 Notification response received:", response);
      this.responseListeners.forEach((listener) => listener(response));
    });
  }

  async sendLocalNotification(notification: NotificationData): Promise<string> {
    // Check if notifications are disabled
    if (PushNotificationService.PUSH_NOTIFICATIONS_DISABLED) {
      console.log("⚠️ Local notifications are disabled by feature flag");
      return "disabled";
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          ...(notification.categoryId && {
            categoryIdentifier: notification.categoryId,
          }),
          priority: this.mapPriority(notification.priority),
          sound: notification.sound || "default",
        },
        trigger: null, // Send immediately
      });

      console.log("📤 Local notification sent:", notificationId);
      return notificationId;
    } catch (error) {
      console.error("❌ Failed to send local notification:", error);
      throw error;
    }
  }

  async scheduleNotification(
    notification: ScheduledNotification,
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          ...(notification.categoryId && {
            categoryIdentifier: notification.categoryId,
          }),
          priority: this.mapPriority(notification.priority),
          sound: notification.sound || "default",
        },
        trigger: notification.trigger,
      });

      console.log("⏰ Scheduled notification:", notificationId);
      return notificationId;
    } catch (error) {
      console.error("❌ Failed to schedule notification:", error);
      throw error;
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log("🗑️ Notification cancelled:", notificationId);
    } catch (error) {
      console.error("❌ Failed to cancel notification:", error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("🗑️ All notifications cancelled");
    } catch (error) {
      console.error("❌ Failed to cancel all notifications:", error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error("❌ Failed to get badge count:", error);
      return 0;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error("❌ Failed to set badge count:", error);
    }
  }

  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  getPushToken(): string | null {
    return this.pushToken;
  }

  isPushNotificationAvailable(): boolean {
    return this.pushToken !== null;
  }

  isLocalNotificationAvailable(): boolean {
    return Device.isDevice || Platform.OS === "web";
  }

  addNotificationListener(
    listener: (notification: Notifications.Notification) => void,
  ): void {
    this.notificationListeners.push(listener);
  }

  removeNotificationListener(
    listener: (notification: Notifications.Notification) => void,
  ): void {
    this.notificationListeners = this.notificationListeners.filter(
      (l) => l !== listener,
    );
  }

  addResponseListener(
    listener: (response: Notifications.NotificationResponse) => void,
  ): void {
    this.responseListeners.push(listener);
  }

  removeResponseListener(
    listener: (response: Notifications.NotificationResponse) => void,
  ): void {
    this.responseListeners = this.responseListeners.filter(
      (l) => l !== listener,
    );
  }

  private mapPriority(
    priority?: string,
  ): Notifications.AndroidNotificationPriority {
    switch (priority) {
      case "low":
        return Notifications.AndroidNotificationPriority.LOW;
      case "normal":
        return Notifications.AndroidNotificationPriority.DEFAULT;
      case "high":
        return Notifications.AndroidNotificationPriority.HIGH;
      case "max":
        return Notifications.AndroidNotificationPriority.MAX;
      default:
        return Notifications.AndroidNotificationPriority.DEFAULT;
    }
  }

  // Backend Integration Methods

  /**
   * Register push token with Laravel backend
   */
  async registerTokenWithBackend(pushToken: string, retryCount = 0): Promise<boolean> {
    const maxRetries = 2; // Allow 2 retries
    try {
      if (!this.authToken) {
        console.warn("⚠️ No auth token available for backend registration");
        return false;
      }

      const deviceInfo = await this.getDeviceInfo();
      const registrationData: PushTokenRegistrationData = {
        push_token: pushToken,
        ...deviceInfo,
      };

      console.log("📤 Registering push token with backend:", {
        ...registrationData,
        push_token: `${pushToken.substring(0, 20)}...`,
        tokenLength: this.authToken?.length
      });

      // Get base URL from environment
      const baseUrl = 
        process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1 || 
        process.env.EXPO_PUBLIC_API_BASE_URL || 
        "http://172.20.10.3:9999";
      
      console.log("🔧 [DEBUG] Base URL resolution:", {
        finalBaseUrl: baseUrl
      });
      
      const response = await axios.post<BackendApiResponse>(
        `${baseUrl}/api/user-management/push-tokens/register`,
        registrationData,
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 second timeout
        },
      );

      if (response.data?.success) {
        console.log(
          "✅ Push token registered successfully with backend:",
          response.data.data,
        );
        this.isRegisteredWithBackend = true;
        return true;
      } else {
        console.error(
          "❌ Failed to register push token:",
          response.data?.message,
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Error registering push token with backend:", error);

      if (axios.isAxiosError(error)) {
        console.error("API Error details:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          url: error.config?.url,
          method: error.config?.method,
        });
        
        // Log specific error details for debugging
        if (error.response?.status === 500) {
          console.warn("🔧 Backend server error (500) - this is likely a backend issue, not frontend");
          console.warn("💡 Local notifications will still work fine without backend registration");
        } else if (error.response?.status === 422) {
          console.warn("🔧 Validation error (422) - check device data format:");
          console.warn("📋 Registration data sent:", registrationData);
        } else if (error.response?.status === 401) {
          console.warn("🔧 Authentication error (401) - token might be invalid for this endpoint");
        }
      }

      // Retry logic for specific error types
      if (retryCount < maxRetries) {
        if (axios.isAxiosError(error) && (
          error.response?.status === 500 || // Server error
          error.response?.status === 503 || // Service unavailable
          error.code === 'NETWORK_ERROR' || 
          error.code === 'TIMEOUT'
        )) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.warn(`🔄 Retrying backend registration in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.registerTokenWithBackend(pushToken, retryCount + 1);
        }
      }

      // Don't throw - return false to indicate failure but allow service to continue
      return false;
    }
  }

  /**
   * Remove push token from backend (on logout)
   */
  async removeTokenFromBackend(deviceId?: string): Promise<boolean> {
    try {
      if (!this.authToken) {
        console.warn("⚠️ No auth token available for backend token removal");
        return false;
      }

      const payload: any = {};
      if (deviceId) {
        payload.device_id = deviceId;
      } else if (this.pushToken) {
        payload.push_token = this.pushToken;
      }

      console.log("🗑️ Removing push token from backend:", payload);

      const baseUrl =
        process.env.EXPO_PUBLIC_API_BASE_URL ||
        process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1 ||
        "http://172.20.10.3:9999"; // Updated fallback to match new server
      const response = await axios.post<BackendApiResponse>(
        `${baseUrl}/api/user-management/push-tokens/delete`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 30000,
        },
      );

      if (response.data?.success) {
        console.log("✅ Push token removed successfully from backend");
        this.isRegisteredWithBackend = false;
        return true;
      } else {
        console.error(
          "❌ Failed to remove push token:",
          response.data?.message,
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Error removing push token from backend:", error);

      if (axios.isAxiosError(error)) {
        console.error("API Error details:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }

      return false;
    }
  }

  /**
   * Update authentication token and re-register if needed
   */
  async updateAuthToken(authToken: string, userId: string): Promise<void> {
    console.log("🔄 Updating auth token and re-registering with backend");

    this.authToken = authToken;
    this.userId = userId;

    // Re-register with backend if we have a push token
    if (this.pushToken) {
      await this.registerTokenWithBackend(this.pushToken);
    }
  }

  /**
   * Get device information for registration
   */
  private async getDeviceInfo(): Promise<
    Omit<PushTokenRegistrationData, "push_token">
  > {
    const appVersion = Constants.expoConfig?.version || "1.0.0";

    return {
      device_id: await this.getDeviceId(),
      platform: Platform.OS as "ios" | "android",
      app_version: appVersion,
      device_name: Device.deviceName || "Unknown Device",
      device_model: Device.modelName || "Unknown Model",
      os_version: Device.osVersion || "Unknown OS",
    };
  }

  /**
   * Get a unique device identifier
   */
  private async getDeviceId(): Promise<string> {
    try {
      // Try to get stored device ID first
      let deviceId = await AsyncStorage.getItem("device_id");

      if (!deviceId) {
        // Generate a new device ID using available device info
        const deviceName = Device.deviceName || "UnknownDevice";
        const modelName = Device.modelName || "UnknownModel";
        const timestamp = Date.now().toString();
        deviceId =
          `${Platform.OS}_${deviceName}_${modelName}_${timestamp}`.replace(
            /[^a-zA-Z0-9_-]/g,
            "_",
          );

        // Store it for future use
        await AsyncStorage.setItem("device_id", deviceId);
      }

      return deviceId;
    } catch (error) {
      console.error("❌ Error getting device ID:", error);
      // Fallback device ID
      return `${Platform.OS}_${Date.now()}`;
    }
  }

  /**
   * Check if token is registered with backend
   */
  isTokenRegisteredWithBackend(): boolean {
    return this.isRegisteredWithBackend;
  }

  /**
   * Get service status for debugging
   */
  getServiceStatus() {
    return {
      hasPushToken: !!this.pushToken,
      hasAuthToken: !!this.authToken,
      userId: this.userId,
      isRegisteredWithBackend: this.isRegisteredWithBackend,
      isPushNotificationAvailable: this.isPushNotificationAvailable(),
      isLocalNotificationAvailable: this.isLocalNotificationAvailable(),
      // Additional status info
      serviceReady: this.isLocalNotificationAvailable(), // Service is ready if local notifications work
      backendOptional: true, // Backend registration is optional for functionality
    };
  }

  // School-specific notification methods
  async sendAcademicAlert(
    title: string,
    body: string,
    studentId?: string,
  ): Promise<string> {
    return this.sendLocalNotification({
      id: `academic-${Date.now()}`,
      title,
      body,
      categoryId: "academic-alerts",
      priority: "high",
      data: { type: "academic", studentId },
    });
  }

  async sendPaymentReminder(
    title: string,
    body: string,
    amount?: number,
  ): Promise<string> {
    return this.sendLocalNotification({
      id: `payment-${Date.now()}`,
      title,
      body,
      categoryId: "payment-reminders",
      priority: "high",
      data: { type: "payment", amount },
    });
  }

  async sendEventNotification(
    title: string,
    body: string,
    eventId?: string,
  ): Promise<string> {
    return this.sendLocalNotification({
      id: `event-${Date.now()}`,
      title,
      body,
      categoryId: "events",
      priority: "normal",
      data: { type: "event", eventId },
    });
  }

  async sendGeneralNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<string> {
    return this.sendLocalNotification({
      id: `general-${Date.now()}`,
      title,
      body,
      categoryId: "school-notifications",
      priority: "normal",
      data: { type: "general", ...data },
    });
  }
}

export default PushNotificationService.getInstance();
