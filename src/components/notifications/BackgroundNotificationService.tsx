import React from "react";
import { Platform, AppState } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../state-store/store";
import { apiServer1 } from "../../api/api-server-1";
import RealTimeNotificationService from "../../services/notifications/RealTimeNotificationService";
import PushNotificationService from "../../services/notifications/PushNotificationService";

// Enhanced logging utility for notifications
const apiLogger = {
  info: (message: string, data?: any) => {
    console.log(`🔵 [BackgroundNotificationService] ${message}`, data);
  },
  success: (message: string, data?: any) => {
    console.log(`✅ [BackgroundNotificationService] ${message}`, data);
  },
  warn: (message: string, data?: any) => {
    console.warn(`⚠️ [BackgroundNotificationService] ${message}`, data);
  },
  error: (message: string, data?: any) => {
    console.error(`❌ [BackgroundNotificationService] ${message}`, data);
  },
};

/**
 * Background notification service that runs app-wide
 * Handles real-time notifications and push notifications regardless of current screen
 */
export const BackgroundNotificationService: React.FC = () => {
  // 1. CALL HOOKS AT TOP LEVEL (REQUIRED BY REACT RULES)
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.app);
  const userId = user?.id;

  // IMMEDIATE DEBUG - Check if component mounts at all
  console.log("🟦 [MOUNT DEBUG] BackgroundNotificationService component mounting...");
  
  // DEBUG - Check Redux state immediately
  console.log("🟦 [MOUNT DEBUG] Redux state check:", {
    hasUser: !!user,
    hasToken: !!token,
    hasUserId: !!userId,
    userCategory: user?.user_category,
    userName: user?.full_name,
    tokenLength: token?.length,
    userIdValue: userId,
    timestamp: new Date().toISOString()
  });

  // Initialize notification services when user is authenticated
  React.useEffect(() => {
    // Skip on web platform to avoid compatibility issues
    if (Platform.OS === "web") {
      console.log("🌐 [DEBUG] Skipping notification services on web platform");
      return;
    }

    if (!token || !userId) {
      // Expected behavior when user is not logged in - no need to warn
      console.log("⏸️ [BackgroundNotificationService] Waiting for authentication...", {
        hasToken: !!token,
        hasUserId: !!userId
      });
      return;
    }

    console.log("🚀 [DEBUG] Background notification service starting...");
    apiLogger.info("Setting up background notification services", {
      userId,
      userCategory: user?.user_category,
      userName: user?.full_name
    });

    // Initialize Push notification service
    const initializePushService = async () => {
      try {
        console.log("🔧 [DEBUG] Starting PushNotificationService initialization...");
        await PushNotificationService.initialize(token, userId.toString());

        const status = PushNotificationService.getServiceStatus();
        console.log("🔧 [DEBUG] PushNotificationService initialized successfully:", status);
        apiLogger.success("Push notification service initialized", status);

        // Test if service can send notifications
        console.log("🧪 [DEBUG] Testing push notification availability...");
        const isAvailable = PushNotificationService.isLocalNotificationAvailable();
        console.log("🧪 [DEBUG] Local notifications available:", isAvailable);

      } catch (error) {
        console.error("❌ [DEBUG] PushNotificationService initialization failed:", error);
        apiLogger.error("Push notification service initialization failed", { error });
      }
    };

    // Initialize real-time service
    const initializeRealTime = async () => {
      try {
        console.log("🌐 [DEBUG] Starting RealTimeNotificationService initialization...");
        
        // Add WebSocket environment check
        console.log("🌐 [WEBSOCKET DEBUG] Environment variables:", {
          REVERB_KEY: process.env.EXPO_PUBLIC_REVERB_KEY,
          REVERB_HOST: process.env.EXPO_PUBLIC_REVERB_HOST,
          REVERB_PORT: process.env.EXPO_PUBLIC_REVERB_PORT,
          REVERB_SCHEME: process.env.EXPO_PUBLIC_REVERB_SCHEME,
          API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1
        });
        
        await RealTimeNotificationService.initialize(token, userId.toString(), {
          onNotificationCreated: (notification: any) => {
            console.log("🚀 [DEBUG] Real-time notification callback triggered!");
            apiLogger.info("Real-time notification received", { notification });
            
            // Invalidate ALL notification cache entries to update all components
            dispatch(apiServer1.util.invalidateTags(["Notifications"]));
            console.log("✅ [DEBUG] Cache invalidation triggered");
          },
          onChatMessage: (message: any) => {
            console.log("💬 [DEBUG] Real-time chat message received:", message);
            // Invalidate chat-related tags to trigger refetch
            dispatch(apiServer1.util.invalidateTags(["ChatThreads"]));
            if (message.chat_group_id) {
              dispatch(apiServer1.util.invalidateTags([{ type: "ChatMessages", id: String(message.chat_group_id) }]));
            }
          },
          onNotificationRead: (data: any) => {
            console.log("✅ [DEBUG] Real-time notification read event:", data);
            apiLogger.info("Real-time notification read", { data });
            dispatch(apiServer1.util.invalidateTags(["Notifications"]));
          },
          onStatsUpdated: (stats: any) => {
            console.log("📊 [DEBUG] Real-time stats updated:", stats);
            apiLogger.info("Real-time stats updated", { stats });
          },
          onConnectionStateChange: (connected: boolean) => {
            console.log("🔗 [DEBUG] Real-time connection state changed:", connected);
            apiLogger.info("Real-time connection state changed", { connected });
          },
          onError: (error: any) => {
            console.error("❌ [DEBUG] Real-time notification error:", error);
            apiLogger.error("Real-time notification error", { error });
          },
        });
        
        console.log("🌐 [DEBUG] RealTimeNotificationService initialized successfully");
        
      } catch (error) {
        console.error("❌ [DEBUG] RealTimeNotificationService initialization failed:", error);
        apiLogger.error("Failed to initialize real-time notifications", {
          error,
        });
      }
    };

    // Initialize services
    console.log("🔄 [DEBUG] Initializing notification services...");
    initializePushService();
    initializeRealTime();

    // Cleanup on unmount or auth change
    return () => {
      console.log("🧹 [DEBUG] Cleaning up background notification services...");
      apiLogger.info("Cleaning up background notification services");
      RealTimeNotificationService.disconnect();
    };
  }, [token, userId, dispatch, user?.user_category, user?.full_name]);

  // Foreground Resynchronization logic
  React.useEffect(() => {
    if (!token || !userId) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        console.log("🌅 [BackgroundNotificationService] App returned to foreground. Refreshing chat data...");
        // Invalidate tags to trigger refetches for active components
        dispatch(apiServer1.util.invalidateTags(["ChatThreads", "ChatMessages"]));
        dispatch(apiServer1.util.invalidateTags(["Notifications"]));
      }
    });

    return () => {
      subscription.remove();
    };
  }, [token, userId, dispatch]);

  // This component renders nothing - it just runs background services
  return null;
};

export default BackgroundNotificationService;