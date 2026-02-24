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
  onMessageUpdated?: (message: any) => void;
  onMessageDeleted?: (data: { id: number; chat_group_id: number }) => void;
  onGroupDeleted?: (data: { chat_group_id: number }) => void;
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
  private connectionListeners: Set<(connected: boolean) => void> = new Set();

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
            "X-Requested-With": "XMLHttpRequest", // Explicitly identify as AJAX
          },
          // CRITICAL: Ensure cookies (like t_session) are sent with the auth request
          withCredentials: true,
        },

        // Additional configuration for React Native
        authEndpoint: reverbConfig.authEndpoint,
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
   * Get Reverb configuration from environment variables with intelligent fallbacks
   */
  private getReverbConfig() {
    // 1. Get base API info (This is our source of truth for remote vs local)
    const apiBaseUrl = process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1 || "https://school-app.toyar.lk";
    const isApiRemote = apiBaseUrl.includes("https://") || (!apiBaseUrl.includes("127.0.0.1") && !apiBaseUrl.includes("localhost") && !apiBaseUrl.includes("172.") && !apiBaseUrl.includes("192."));
    const apiHost = apiBaseUrl.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];

    // 2. Initial values from .env
    const pusherKey = process.env.EXPO_PUBLIC_REVERB_KEY || "ftlvjzbndng2pip2xruw";
    let reverbHost = process.env.EXPO_PUBLIC_REVERB_HOST || apiHost;
    let reverbPort = parseInt(process.env.EXPO_PUBLIC_REVERB_PORT || "8080");
    let reverbScheme = process.env.EXPO_PUBLIC_REVERB_SCHEME || "http";

    // 3. SMART RESOLUTION:
    // If we're talking to a remote API, but Reverb is configured as local,
    // we MUST override Reverb to use the remote API's domain and standard ports.
    if (isApiRemote && (reverbHost.includes('172.') || reverbHost.includes('192.') || reverbHost === 'localhost' || reverbHost === '0.0.0.0')) {
      console.warn(`🌐 RealTimeService - Overriding local Reverb config (${reverbHost}) for remote API environment`);
      reverbHost = apiHost;
      reverbPort = 443;
      reverbScheme = "https";
    }

    // 4. Resolve authEndpoint
    // Use the main API URL as the base for broadcasting auth
    const authEndpoint = `${apiBaseUrl.replace(/\/$/, '')}/api/broadcasting/auth`;

    console.log(`🔌 WebSocket Resolving: ${reverbScheme}://${reverbHost}:${reverbPort}`);
    console.log(`🔐 Auth Endpoint: ${authEndpoint}`);

    return {
      key: pusherKey,
      host: reverbHost,
      port: reverbPort,
      scheme: reverbScheme,
      authEndpoint,
      cluster: process.env.EXPO_PUBLIC_REVERB_CLUSTER || "mt1",
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
        console.log("🟢 RealTimeService - WebSocket connected successfully!");
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
        
        // Log detailed error information for authorization failures
        if (error?.error?.data?.code === 403 || error?.type === 'AuthError') {
          console.error("⛔ Authorization failed for WebSocket. Token might be invalid, expired, or the auth endpoint is incorrect.");
          console.error("Auth Details:", {
            endpoint: this.echo?.options?.authEndpoint,
            userId: this.userId,
            hasAuthToken: !!this.authToken
          });
        }
        
        this.callbacks.onError?.(error);
        this.callbacks.onConnectionStateChange?.(false);
        this.handleReconnection(); // Try to reconnect on error too
      });

      pusher.connection.bind("state_change", (states: any) => {
        console.log("🔄 WebSocket state change:", states);
        const isConnected = states.current === "connected";

        if (this.connected !== isConnected) {
          this.connected = isConnected;
          this.callbacks.onConnectionStateChange?.(isConnected);
          
          // Notify registered components of connection state changes
          this.connectionListeners.forEach(listener => listener(isConnected));
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
        console.log("💬 RealTimeService - New chat message received (Global):", data);
        if (this.callbacks.onChatMessage) this.callbacks.onChatMessage(data);
        this.chatListeners.forEach(listener => listener({ event: 'sent', message: data }));
      });

      channel.listen(".message.deleted", (data: any) => {
        console.log("🗑️ RealTimeService - Message deleted (Global):", data);
        if (this.callbacks.onMessageDeleted) this.callbacks.onMessageDeleted(data);
        this.chatListeners.forEach(listener => listener({ event: 'deleted', message: data }));
      });

      this.channels.set(channelName, channel);
    } catch (error) {
      console.error("❌ Failed to subscribe to chat channel:", error);
    }
  }

  /**
   * Subscribe to a specific group chat channel
   */
  subscribeToGroup(groupId: number, handlers: {
    onMessageSent?: (message: any) => void;
    onMessageUpdated?: (data: any) => void;
    onMessageDeleted?: (data: { id: number; chat_group_id: number }) => void;
    onTyping?: (data: { user_id: number; user_name: string; is_typing: boolean }) => void;
    onPresenceChange?: (users: any[]) => void;
    onGroupDeleted?: (data: { chat_group_id: number }) => void;
    onGroupUpdated?: (data: any) => void;
    onMessageRead?: (data: { user_id: number; message_ids: number[]; read_at: string }) => void;
  }): void {
    if (!this.echo) return;

    const channelName = `chat.group.${groupId}`;
    console.log("📡 Subscribing to group Presence channel:", channelName);

    try {
      console.log(`📡 RealTimeService - Attempting to JOIN presence channel: ${channelName}`);
      const channel = this.echo.join(channelName);

      // ADD ROBUST ERROR LISTENERS
      channel.error((error: any) => {
        console.error(`❌ Presence Error joining ${channelName}:`, error);
      });

      // Low level subscription failure (auth failure etc)
      // Note: Pusher-js event name is 'pusher:subscription_error'
      const pusherChannel = channel.connector.pusher.channel(channelName);
      if (pusherChannel) {
        pusherChannel.bind('pusher:subscription_error', (status: any) => {
          console.error(`❌ Subscription Error on ${channelName}: Status:`, status);
          if (status === 403) console.error("⚠️ [403 Access Denied] Check channels.php authorization or session cookie!");
        });
      }

      channel.here((users: any[]) => {
        console.log("👥 Presence: Successfully joined group channel. Users online:", users.length);
        if (handlers.onPresenceChange) handlers.onPresenceChange(users);
      })
      .joining((user: any) => {
        console.log("👋 Presence: User joining:", user.name);
        // Echo.join result doesn't provide the full list in joining(), so we might need a local state or fetch
        // But for now, we'll let the component handle it if needed
      })
      .leaving((user: any) => {
        console.log("🚶 Presence: User leaving:", user.name);
      })
      .error((error: any) => {
        console.error("❌ RealTimeService - Error joining presence channel:", error);
        if (error?.status === 403) {
          console.error("🚫 Access Denied: You might not be a member of this group or session cookie is missing/invalid.");
        }
      });

      if (handlers.onMessageSent) {
        channel.listen(".message.sent", (data: any) => {
          console.log("💬 RealTimeService - Group message received:", data);
          handlers.onMessageSent!(data);
        });
      }
      if (handlers.onMessageUpdated) {
        channel.listen(".message.updated", (data: any) => {
          console.log("🔄 RealTimeService - Group message updated:", data);
          handlers.onMessageUpdated!(data);
        });
      }
      if (handlers.onMessageDeleted) {
        channel.listen(".message.deleted", (data: any) => {
          console.log("🗑️ RealTimeService - Group message deleted:", data);
          handlers.onMessageDeleted!(data);
        });
      }
      
      // typing indicators using listenForWhisper
      if (handlers.onTyping) {
        channel.listenForWhisper('typing', (data: any) => {
          console.log("✍️ RealTimeService - Typing indicator:", data);
          handlers.onTyping!(data);
        });
      }

      if (handlers.onMessageRead) {
        channel.listen(".message.read", (data: any) => {
          console.log("👁️ RealTimeService - Group message read:", data);
          handlers.onMessageRead!(data);
        });
      }

      if (handlers.onGroupDeleted) {
        channel.listen(".group.deleted", (data: any) => {
        console.log("🔄 RealTimeService - Chat group deleted:", data);
        handlers.onGroupDeleted?.(data);
      })
      .listen(".group.updated", (data: any) => {
        console.log("🔄 RealTimeService - Chat group updated:", data);
        handlers.onGroupUpdated?.(data);
      });
      }

      this.channels.set(channelName, channel);
    } catch (error) {
      console.error(`❌ Failed to subscribe to group ${groupId}:`, error);
    }
  }

  /**
   * Send typing indicator (whisper)
   */
  sendTypingIndicator(groupId: number, userName: string): void {
    if (!this.echo) return;
    const channelName = `chat.group.${groupId}`;
    // Use private() fallback if join() wasn't used, but join() is preferred for whisper on presence channels
    const channel = this.channels.get(channelName) || this.echo.join(channelName);
    
    if (channel) {
      console.log(`✍️ Sending typing indicator to group ${groupId}`);
      channel.whisper('typing', {
        user_id: parseInt(this.userId || '0'),
        user_name: userName,
      });
    }
  }

  /**
   * Unsubscribe from a specific group
   */
  unsubscribeFromGroup(groupId: number): void {
    this.unsubscribeFromChannel(`chat.group.${groupId}`);
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
      if (this.echo && this.echo.connector && this.echo.connector.pusher) {
        this.echo.connector.pusher.disconnect(); // Clear existing connection state
        this.echo.connector.pusher.connect();
      }
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
   * Add a connection state listener (helps components like ChatView refetch on reconnect)
   */
  addConnectionStateListener(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.add(listener);
    // Immediately call it with the current state just in case we're already connected
    listener(this.connected);
    return () => this.connectionListeners.delete(listener);
  }

  /**
   * Remove a connection state listener
   */
  removeConnectionStateListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.delete(listener);
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
