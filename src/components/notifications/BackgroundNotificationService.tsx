import React from "react";
import { Platform, AppState } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import * as Notifications from "expo-notifications";
import Toast from "react-native-toast-message";
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
 * Checks the push token registration status and shows user-facing feedback.
 *
 * Three possible outcomes:
 *  1. Token obtained + registered with backend → silent success ✅
 *  2. Token obtained but backend registration failed → info toast + retry
 *  3. No token (permission denied or FCM error) → actionable toast
 */
const checkAndReportPushStatus = async (
  token: string,
  userId: string,
  isRetry = false,
): Promise<void> => {
  const pushToken = PushNotificationService.getPushToken();
  const isRegistered = PushNotificationService.isTokenRegisteredWithBackend();

  // ── CASE 1: Fully registered ──────────────────────────────────────────────
  if (pushToken && isRegistered) {
    apiLogger.success("Push token confirmed registered with backend", {
      tokenPreview: pushToken.substring(0, 25) + "...",
    });
    return; // No toast needed – everything is working
  }

  // ── CASE 2: Token exists but not yet registered with backend ──────────────
  if (pushToken && !isRegistered) {
    apiLogger.warn("Push token obtained but not registered with backend — retrying", {
      isRetry,
    });

    const retrySuccess = await PushNotificationService.registerTokenWithBackend(pushToken);

    if (retrySuccess) {
      apiLogger.success("Push token registered with backend on retry ✅");
    } else {
      // Only show toast if this is already a retry (don't spam on first attempt)
      if (isRetry) {
        Toast.show({
          type: "info",
          text1: "🔔 Notifications Pending",
          text2: "Notifications will activate when connection is restored.",
          position: "bottom",
          visibilityTime: 5000,
        });
        apiLogger.warn("Push token backend registration failed after retry");
      }
    }
    return;
  }

  // ── CASE 3: No push token at all ─────────────────────────────────────────
  if (!pushToken) {
    // Check if it's a permissions issue
    const permResult = await Notifications.getPermissionsAsync();

    if (permResult.status === "denied") {
      // User explicitly denied — inform them
      Toast.show({
        type: "info",
        text1: "🔕 Notifications are Disabled",
        text2: "Enable notifications in Settings to receive school alerts.",
        position: "bottom",
        visibilityTime: 6000,
      });
      apiLogger.warn("Notification permissions denied — user must enable in Settings");
    } else if (permResult.status === "granted") {
      // Permission granted but FCM/Expo token failed — try once more
      if (!isRetry) {
        apiLogger.warn("Permission granted but no push token — retrying initialization...");

        // Wait 3 seconds then reinitialize
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await PushNotificationService.initialize(token, userId);

        // Check again after retry
        await checkAndReportPushStatus(token, userId, true);
      } else {
        // Second attempt also failed
        Toast.show({
          type: "error",
          text1: "🔔 Notification Setup Failed",
          text2: "Could not activate push notifications. Please restart the app.",
          position: "bottom",
          visibilityTime: 6000,
        });
        apiLogger.error("Push token could not be obtained after retry");
      }
    } else {
      // Status is "undetermined" — permissions not yet asked (should not reach here normally)
      apiLogger.warn("Push notification permissions not yet determined");
    }
  }
};

/**
 * Background notification service that runs app-wide.
 * Handles real-time notifications and push notifications regardless of current screen.
 */
export const BackgroundNotificationService: React.FC = () => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.app);
  const userId = user?.id;

  // ── Main initialization effect ────────────────────────────────────────────
  React.useEffect(() => {
    // Skip on web platform
    if (Platform.OS === "web") {
      console.log("🌐 [DEBUG] Skipping notification services on web platform");
      return;
    }

    if (!token || !userId) {
      console.log("⏸️ [BackgroundNotificationService] Waiting for authentication...", {
        hasToken: !!token,
        hasUserId: !!userId,
      });
      return;
    }

    apiLogger.info("Setting up background notification services", {
      userId,
      userCategory: user?.user_category,
      userName: user?.full_name,
    });

    // Initialize Push notification service then verify token was saved
    const initializePushService = async () => {
      try {
        console.log("🔧 [DEBUG] Starting PushNotificationService initialization...");
        await PushNotificationService.initialize(token, userId.toString());

        const status = PushNotificationService.getServiceStatus();
        console.log("🔧 [DEBUG] PushNotificationService initialized:", status);

        // ── Verify push token status and show feedback if needed ───────────
        // Give the backend registration call a moment to complete
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await checkAndReportPushStatus(token, userId.toString());

      } catch (error) {
        console.error("❌ [DEBUG] PushNotificationService initialization failed:", error);
        apiLogger.error("Push notification service initialization failed", { error });
      }
    };

    // Initialize real-time service
    const initializeRealTime = async () => {
      try {
        console.log("🌐 [DEBUG] Starting RealTimeNotificationService initialization...");

        await RealTimeNotificationService.initialize(token, userId.toString(), {
          onNotificationCreated: (notification: any) => {
            console.log("🚀 [DEBUG] Real-time notification callback triggered!");
            apiLogger.info("Real-time notification received", { notification });
            dispatch(apiServer1.util.invalidateTags(["Notifications"]));
          },
          onChatMessage: (message: any) => {
            console.log("💬 [DEBUG] Real-time chat message received:", message);
            dispatch(apiServer1.util.invalidateTags(["ChatThreads"]));
            if (message.chat_group_id) {
              dispatch(
                apiServer1.util.invalidateTags([
                  { type: "ChatMessages", id: String(message.chat_group_id) },
                ]),
              );
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
        apiLogger.error("Failed to initialize real-time notifications", { error });
      }
    };

    // Start both services
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

  // ── Foreground resync and push token retry ────────────────────────────────
  React.useEffect(() => {
    if (!token || !userId) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        console.log(
          "🌅 [BackgroundNotificationService] App returned to foreground. Refreshing data...",
        );

        // Invalidate RTK Query caches to trigger refetches
        dispatch(apiServer1.util.invalidateTags(["ChatThreads", "ChatMessages"]));
        dispatch(apiServer1.util.invalidateTags(["Notifications"]));

        // If we have a token but it's not registered with backend yet — silently retry
        const pushToken = PushNotificationService.getPushToken();
        if (pushToken && !PushNotificationService.isTokenRegisteredWithBackend()) {
          console.log(
            "🔄 [BackgroundNotificationService] Foreground: retrying push token backend registration...",
          );
          PushNotificationService.registerTokenWithBackend(pushToken)
            .then((success) => {
              if (success) {
                apiLogger.success("Push token registered with backend on foreground resume ✅");
              } else {
                apiLogger.warn("Push token backend registration failed on foreground resume");
              }
            })
            .catch(() => {});
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [token, userId, dispatch]);

  // This component renders nothing — it just runs background services
  return null;
};

export default BackgroundNotificationService;