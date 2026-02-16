import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { AppState } from "react-native";

// Define window for Pusher
declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo?: Echo<any>;
  }
}

export interface RealTimeNotification {
  id: number;
  recipient_id: number;
  title: string;
  message: string;
  priority: "normal" | "high" | "urgent";
  priority_label: string;
  priority_color: string;
  type: string;
  type_name: string;
  action_url?: string;
  action_text?: string;
  image_url?: string;
  is_read: boolean;
  is_delivered: boolean;
  created_at: string;
  time_ago: string;
}

export interface NotificationStats {
  user_id: number;
  unread_count: number;
  total_count: number;
  updated_at: string;
}

export interface RealTimeCallbacks {
  onNotificationCreated?: (notification: RealTimeNotification) => void;
  onNotificationRead?: (data: {
    id: number;
    recipient_id: number;
    is_read: boolean;
    read_at: string;
  }) => void;
  onChatMessage?: (message: any) => void;
  onStatsUpdated?: (stats: NotificationStats) => void;
  onConnectionStateChange?: (connected: boolean) => void;
  onError?: (error: any) => void;
}

class RealTimeNotificationService {
  private static instance: RealTimeNotificationService;
  private echo: Echo<any> | null = null;
  private channels: Map<string, any> = new Map();
  private connected: boolean = false;
  private userId: string | null = null;
  private authToken: string | null = null;
  private callbacks: RealTimeCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private chatListeners: Set<(message: any) => void> = new Set();

  static getInstance(): RealTimeNotificationService {
    if (!RealTimeNotificationService.instance) {
      RealTimeNotificationService.instance = new RealTimeNotificationService();
    }
    return RealTimeNotificationService.instance;
  }

  /**
   * Initialize Laravel Echo with Reverb/Pusher
   */
  async initialize(
    authToken: string,
    userId: string,
    callbacks: RealTimeCallbacks = {},
  ): Promise<boolean> {
    try {
      console.log("🌐 Initializing real-time notification service...", {
        userId,
        hasToken: !!authToken,
        environment: process.env.NODE_ENV || "development",
      });

      this.authToken = authToken;
      this.userId = userId;
      this.callbacks = callbacks;

      // Set Pusher globally for Laravel Echo
      if (typeof window !== "undefined") {
        window.Pusher = Pusher;
      } else {
        // For React Native, we need to assign Pusher globally
        (global as any).Pusher = Pusher;
      }

      // Get configuration from environment variables
      const reverbConfig = this.getReverbConfig();

      if (!reverbConfig.key || !reverbConfig.host) {
        console.warn(
          "⚠️ Missing Reverb configuration. Real-time notifications will not work.",
        );
        return false;
      }

      // Initialize Laravel Echo
      this.echo = new Echo({
        broadcaster: "reverb",
        key: reverbConfig.key,
        wsHost: reverbConfig.host,
        wsPort: reverbConfig.port,
        wssPort: reverbConfig.port,
        forceTLS: reverbConfig.scheme === "https",
        enabledTransports: ["ws", "wss"],
        cluster: reverbConfig.cluster || "mt1",
        encrypted: reverbConfig.scheme === "https",
        auth: {
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: "application/json",
          },
        },
        // Additional configuration for React Native
        authEndpoint: `${process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1 || "http://172.16.20.149:9999"}/broadcasting/auth`,
      });

      // Setup connection event listeners
      this.setupConnectionListeners();

      // Subscribe to user's private notification channel
      await this.subscribeToUserNotifications(userId);

      // Subscribe to user's chat channel
      await this.subscribeToUserChat(userId);

      // Setup app state change listener
      this.setupAppStateListener();

      console.log("🌐 Real-time notification service initialized successfully");
      return true;
    } catch (error) {
      console.error(
        "❌ Error initializing real-time notification service:",
        error,
      );
      this.callbacks.onError?.(error);
      return false;
    }
  }

  /**
   * Get Reverb configuration from environment variables
   */
  private getReverbConfig() {
    return {
      key: process.env.EXPO_PUBLIC_REVERB_KEY || "ftlvjzbndng2pip2xruw",
      host: process.env.EXPO_PUBLIC_REVERB_HOST || "172.16.20.149",
      port: parseInt(process.env.EXPO_PUBLIC_REVERB_PORT || "8080"),
      scheme: process.env.EXPO_PUBLIC_REVERB_SCHEME || "http",
      cluster: process.env.EXPO_PUBLIC_REVERB_CLUSTER,
    };
  }

  /**
   * Setup connection event listeners
   */
  private setupConnectionListeners(): void {
    if (!this.echo) return;

    // Access the underlying Pusher connection
    const pusher = this.echo.connector.pusher;

    if (pusher && pusher.connection) {
      pusher.connection.bind("connected", () => {
        console.log("✅ WebSocket connected successfully");
        this.connected = true;
        this.reconnectAttempts = 0;
        this.callbacks.onConnectionStateChange?.(true);
      });

      pusher.connection.bind("disconnected", () => {
        console.log("❌ WebSocket disconnected");
        this.connected = false;
        this.callbacks.onConnectionStateChange?.(false);
        this.handleReconnection();
      });

      pusher.connection.bind("error", (error: any) => {
        console.error("❌ WebSocket error:", error);
        this.connected = false;
        this.callbacks.onError?.(error);
        this.callbacks.onConnectionStateChange?.(false);
      });

      pusher.connection.bind("state_change", (states: any) => {
        console.log("🔄 WebSocket state change:", states);
        const isConnected = states.current === "connected";

        if (this.connected !== isConnected) {
          this.connected = isConnected;
          this.callbacks.onConnectionStateChange?.(isConnected);
        }
      });
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(
        "⚠️ Max reconnection attempts reached. Stopping reconnection.",
      );
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    this.reconnectAttempts++;

    console.log(
      `🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`,
    );

    this.reconnectInterval = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  /**
   * Setup app state listener for connection management
   */
  private setupAppStateListener(): void {
    AppState.addEventListener("change", (nextAppState) => {
      console.log("📱 App state changed:", nextAppState);

      if (nextAppState === "active") {
        // App came to foreground - ensure connection is active
        if (!this.connected && this.echo) {
          console.log("📱 App became active - reconnecting...");
          this.reconnect();
        }
      } else if (nextAppState === "background") {
        // App went to background - maintain connection but reset reconnect attempts
        this.reconnectAttempts = 0;
        if (this.reconnectInterval) {
          clearTimeout(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      }
    });
  }

  /**
   * Subscribe to user's private notification channel
   */
  private async subscribeToUserNotifications(userId: string): Promise<void> {
    if (!this.echo) {
      throw new Error("Echo not initialized");
    }

    const channelName = `user.${userId}.notifications`;
    console.log("📡 Subscribing to notification channel:", channelName);

    try {
      const channel = this.echo.private(channelName);

      // Listen for new notifications
      channel.listen(".notification.created", (data: RealTimeNotification) => {
        console.log("🆕 RealTimeService - New notification received:", {
          id: data.id,
          title: data.title,
          recipient_id: data.recipient_id,
          is_read: data.is_read,
          created_at: data.created_at,
          hasCallback: !!this.callbacks.onNotificationCreated,
        });

        if (this.callbacks.onNotificationCreated) {
          console.log(
            "📤 RealTimeService - Triggering onNotificationCreated callback",
          );
          this.callbacks.onNotificationCreated(data);
        } else {
          console.warn(
            "⚠️ RealTimeService - No onNotificationCreated callback registered",
          );
        }
      });

      // Listen for notification read events
      channel.listen(".notification.read", (data: any) => {
        console.log("✅ RealTimeService - Notification marked as read:", {
          id: data.id,
          recipient_id: data.recipient_id,
          is_read: data.is_read,
          hasCallback: !!this.callbacks.onNotificationRead,
        });

        if (this.callbacks.onNotificationRead) {
          console.log(
            "📤 RealTimeService - Triggering onNotificationRead callback",
          );
          this.callbacks.onNotificationRead(data);
        } else {
          console.warn(
            "⚠️ RealTimeService - No onNotificationRead callback registered",
          );
        }
      });

      // Listen for notification stats updates
      channel.listen(
        ".notification.stats.updated",
        (data: NotificationStats) => {
          console.log("📊 RealTimeService - Notification stats updated:", {
            user_id: data.user_id,
            unread_count: data.unread_count,
            total_count: data.total_count,
            hasCallback: !!this.callbacks.onStatsUpdated,
          });

          if (this.callbacks.onStatsUpdated) {
            console.log(
              "📤 RealTimeService - Triggering onStatsUpdated callback",
            );
            this.callbacks.onStatsUpdated(data);
          } else {
            console.warn(
              "⚠️ RealTimeService - No onStatsUpdated callback registered",
            );
          }
        },
      );

      // Store channel reference
      this.channels.set(channelName, channel);

      console.log("✅ Successfully subscribed to notification channel");
    } catch (error) {
      console.error("❌ Failed to subscribe to notification channel:", error);
      throw error;
    }
  }

  /**
   * Subscribe to user's private chat channel
   */
  private async subscribeToUserChat(userId: string): Promise<void> {
    if (!this.echo) return;

    const channelName = `chat.user.${userId}`;
    console.log("📡 Subscribing to chat channel:", channelName);

    try {
      const channel = this.echo.private(channelName);

      channel.listen(".message.sent", (data: any) => {
        console.log("💬 RealTimeService - New chat message received:", data);
        
        // Call global callback if exists
        if (this.callbacks.onChatMessage) {
          this.callbacks.onChatMessage(data);
        }
        
        // Call all registered listeners
        this.chatListeners.forEach(listener => {
          try {
            listener(data);
          } catch (error) {
            console.error("❌ Error in chat listener:", error);
          }
        });
      });

      this.channels.set(channelName, channel);
    } catch (error) {
      console.error("❌ Failed to subscribe to chat channel:", error);
    }
  }

  /**
   * Subscribe to additional channels
   */
  subscribeToChannel(
    channelName: string,
    eventCallbacks: Record<string, (data: any) => void> = {},
  ): any {
    if (!this.echo) {
      console.warn("⚠️ Echo not initialized");
      return null;
    }

    try {
      const channel = this.echo.channel(channelName);

      // Setup event listeners
      Object.entries(eventCallbacks).forEach(([eventName, callback]) => {
        channel.listen(eventName, callback);
      });

      this.channels.set(channelName, channel);
      console.log("✅ Subscribed to channel:", channelName);

      return channel;
    } catch (error) {
      console.error("❌ Failed to subscribe to channel:", channelName, error);
      return null;
    }
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribeFromChannel(channelName: string): void {
    if (this.channels.has(channelName)) {
      try {
        if (this.echo) {
          this.echo.leaveChannel(channelName);
        }
        this.channels.delete(channelName);
        console.log("✅ Unsubscribed from channel:", channelName);
      } catch (error) {
        console.error(
          "❌ Failed to unsubscribe from channel:",
          channelName,
          error,
        );
      }
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get number of active channels
   */
  getActiveChannelsCount(): number {
    return this.channels.size;
  }

  /**
   * Reconnect WebSocket
   */
  reconnect(): void {
    if (!this.echo) {
      console.warn("⚠️ Cannot reconnect - Echo not initialized");
      return;
    }

    try {
      console.log("🔄 Attempting to reconnect WebSocket...");
      this.echo.connector.pusher.connect();
    } catch (error) {
      console.error("❌ Failed to reconnect WebSocket:", error);
      this.callbacks.onError?.(error);
    }
  }

  /**
   * Update callbacks
   */
  updateCallbacks(callbacks: Partial<RealTimeCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Add a chat message listener
   */
  addChatMessageListener(listener: (message: any) => void): () => void {
    this.chatListeners.add(listener);
    return () => this.chatListeners.delete(listener);
  }

  /**
   * Remove a chat message listener
   */
  removeChatMessageListener(listener: (message: any) => void): void {
    this.chatListeners.delete(listener);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    console.log("🔌 Disconnecting real-time notification service...");

    // Clear reconnection timer
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    // Unsubscribe from all channels
    this.channels.forEach((channel, channelName) => {
      try {
        if (this.echo) {
          this.echo.leaveChannel(channelName);
        }
      } catch (error) {
        console.error("❌ Error leaving channel:", channelName, error);
      }
    });
    this.channels.clear();

    // Disconnect Echo
    if (this.echo) {
      try {
        this.echo.disconnect();
      } catch (error) {
        console.error("❌ Error disconnecting Echo:", error);
      }
      this.echo = null;
    }

    // Reset state
    this.connected = false;
    this.userId = null;
    this.authToken = null;
    this.reconnectAttempts = 0;
    this.callbacks = {};

    console.log("✅ Real-time notification service disconnected");
  }

  /**
   * Get service status for debugging
   */
  getStatus() {
    return {
      connected: this.connected,
      userId: this.userId,
      hasToken: !!this.authToken,
      activeChannels: this.channels.size,
      reconnectAttempts: this.reconnectAttempts,
      echoInitialized: !!this.echo,
    };
  }
}

export default RealTimeNotificationService.getInstance();
