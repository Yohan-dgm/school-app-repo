import React from "react";
import { Platform } from "react-native";
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
  // IMMEDIATE DEBUG - Check if component mounts at all
  console.log("🟦 [MOUNT DEBUG] BackgroundNotificationService component mounting...");
  
  try {
    const dispatch = useDispatch();
    const { user, token } = useSelector((state: RootState) => state.app);
    const userId = user?.id;
  
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
        console.log("🌐 [DEBUG] Auth details:", { 
          hasToken: !!token, 
          tokenLength: token?.length,
          userId: userId.toString(),
          userIdType: typeof userId
        });
        
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
            console.log("📥 [DEBUG] Notification data received:", {
              fullNotification: notification,
              hasTitle: !!notification?.title,
              hasMessage: !!notification?.message,
              hasBody: !!notification?.body,
              titleValue: notification?.title,
              messageValue: notification?.message,
              bodyValue: notification?.body
            });
            
            // Also use apiLogger for regular logging
            apiLogger.info("Real-time notification received", { 
              notification,
              hasTitle: !!notification?.title,
              hasMessage: !!notification?.message,
              hasBody: !!notification?.body
            });
            
            // Invalidate ALL notification cache entries to update all components
            dispatch(apiServer1.util.invalidateTags(["Notifications"]));
            console.log("✅ [DEBUG] Cache invalidation triggered");

            // DISABLED: Push notification popup functionality
            // Keeping code for future re-enabling
            /*
            // Check PushNotificationService state before attempting to use it
            const serviceStatus = PushNotificationService.getServiceStatus();
            console.log("🔍 [DEBUG] PushNotificationService status:", serviceStatus);

            // Show push notification popup for new notifications
            // Note: Real-time notifications use 'message' field, not 'body'
            const title = notification?.title;
            const body = notification?.body || notification?.message; // Real-time uses 'message'

            console.log("🎯 [DEBUG] Extracted notification content:", {
              title,
              body,
              titleType: typeof title,
              bodyType: typeof body,
              titleLength: title?.length,
              bodyLength: body?.length
            });

            if (title && body) {
              console.log("💡 [DEBUG] Starting push notification process...");

              // Check if service is available
              const isAvailable = PushNotificationService.isLocalNotificationAvailable();
              console.log("📲 [DEBUG] Local notification available:", isAvailable);

              const notificationPayload = {
                id: `realtime-${notification?.id || Date.now()}`,
                title: title,
                body: body,
                data: notification?.data || {
                  type: "realtime",
                  notification_id: notification?.id,
                  recipient_id: notification?.recipient_id
                },
                priority: notification?.priority || "normal"
              };

              console.log("📤 [DEBUG] Sending push notification with payload:", notificationPayload);

              PushNotificationService.sendLocalNotification(notificationPayload)
                .then((notificationId) => {
                  console.log("✅ [DEBUG] Push notification sent successfully! ID:", notificationId);
                  apiLogger.success("Push notification sent successfully", { notificationId });
                })
                .catch((error) => {
                  console.error("❌ [DEBUG] Push notification failed:", error);
                  console.error("❌ [DEBUG] Error details:", {
                    message: error?.message,
                    stack: error?.stack,
                    code: error?.code,
                    notification: notificationPayload
                  });
                  apiLogger.error("Failed to show push notification", {
                    error: error.message || error,
                    notification: { title, body, id: notification?.id }
                  });

                  // Show an alert as fallback for debugging
                  if (__DEV__) {
                    setTimeout(() => {
                      alert(`Push notification failed: ${error?.message || 'Unknown error'}`);
                    }, 100);
                  }
                });
            } else {
              console.warn("⚠️ [DEBUG] Cannot show push notification - missing title or body");
              console.warn("⚠️ [DEBUG] Missing data details:", {
                title,
                body,
                titleIsMissing: !title,
                bodyIsMissing: !body,
                originalNotification: notification
              });

              apiLogger.warn("Cannot show push notification - missing title or body", {
                title,
                body,
                originalNotification: notification
              });

              // Show debug alert
              if (__DEV__) {
                setTimeout(() => {
                  alert(`Missing notification data - Title: ${!!title}, Body: ${!!body}`);
                }, 100);
              }
            }
            */
          },
          onChatMessage: (message: any) => {
            console.log("💬 [DEBUG] Real-time chat message received:", message);
            // Invalidate chat-related tags to trigger refetch
            dispatch(apiServer1.util.invalidateTags(["ChatThreads"]));
            if (message.chat_group_id) {
              dispatch(apiServer1.util.invalidateTags([{ type: "ChatMessages", id: message.chat_group_id.toString() }]));
            }
          },
          onNotificationRead: (data: any) => {
            console.log("✅ [DEBUG] Real-time notification read event:", data);
            apiLogger.info("Real-time notification read", { data });
            // Invalidate ALL notification cache entries to update all components
            dispatch(apiServer1.util.invalidateTags(["Notifications"]));
          },
          onStatsUpdated: (stats: any) => {
            console.log("📊 [DEBUG] Real-time stats updated:", stats);
            apiLogger.info("Real-time stats updated", { stats });
            // Could update a badge count here if needed
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
        
        // Check connection status
        const rtStatus = RealTimeNotificationService.getStatus();
        console.log("🌐 [DEBUG] Real-time service status:", rtStatus);
        
      } catch (error) {
        console.error("❌ [DEBUG] RealTimeNotificationService initialization failed:", error);
        apiLogger.error("Failed to initialize real-time notifications", {
          error,
        });
      }
    };

    // Initialize services
    console.log("🔄 [DEBUG] Initializing notification services...");
    // DISABLED: Push notification service
    initializePushService();
    initializeRealTime();

    // Cleanup on unmount or auth change
    return () => {
      console.log("🧹 [DEBUG] Cleaning up background notification services...");
      apiLogger.info("Cleaning up background notification services");
      RealTimeNotificationService.disconnect();
    };
  }, [token, userId, dispatch, user?.user_category, user?.full_name]);





    // This component renders nothing - it just runs background services
    return null;
  } catch (error) {
    console.error("❌ [MOUNT DEBUG] BackgroundNotificationService crashed:", error);
    
    // Show crash info in development
    if (__DEV__) {
      setTimeout(() => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`BackgroundNotificationService crashed: ${errorMessage}`);
      }, 100);
    }
    
    return null;
  }
};

export default BackgroundNotificationService;