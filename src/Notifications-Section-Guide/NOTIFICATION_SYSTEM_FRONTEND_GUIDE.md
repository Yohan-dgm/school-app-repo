# Notification System - Frontend Integration Guide

## 🔔 Overview

This guide provides complete instructions for integrating the school management app's notification system with React Native (Expo) frontend. The system combines **Expo Push Notifications** for mobile alerts and **Laravel Echo WebSockets** for real-time updates.

### Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Native  │    │  Laravel Backend │    │  Expo Push API  │
│                 │    │                  │    │                 │
│  • Push Tokens  │◄──►│  • NotificationService  │◄──►│  • Push Delivery│
│  • WebSockets   │    │  • ExpoPushService      │    │  • Receipts     │
│  • State Mgmt   │    │  • Broadcasting         │    │                 │
│  • UI Components│    │  • Queue Jobs           │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                         ┌────▼────┐
                         │ Database│
                         │ • notifications│
                         │ • notification_recipients│
                         │ • user_push_tokens│
                         └─────────┘
```

## 🚀 Quick Setup

### 1. Install Required Dependencies

```bash
# Core dependencies
npx expo install expo-notifications expo-device expo-constants

# WebSocket for real-time updates
npm install laravel-echo pusher-js

# State management (if not already installed)
npm install @react-native-async-storage/async-storage

# Optional: Better date handling
npm install date-fns
```

### 2. Configure app.json

```json
{
  "expo": {
    "name": "School Management App",
    "slug": "school-management-app",
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#ffffff",
      "iosDisplayInForeground": true,
      "androidMode": "default",
      "androidCollapsedTitle": "New notification from school"
    },
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "WAKE_LOCK"
      ]
    }
  }
}
```

### 3. Environment Configuration

Create or update your `.env` file:

```env
# Backend API
EXPO_PUBLIC_API_BASE_URL=http://172.16.20.183:9999
EXPO_PUBLIC_API_PREFIX=/api

# WebSocket Configuration (Laravel Reverb)
EXPO_PUBLIC_REVERB_HOST=172.16.20.183
EXPO_PUBLIC_REVERB_PORT=8080
EXPO_PUBLIC_REVERB_KEY=ftlvjzbndng2pip2xruw
EXPO_PUBLIC_REVERB_SCHEME=http

# Development settings
EXPO_PUBLIC_ENVIRONMENT=development
```

## 📱 Core Services Implementation

### 1. Push Notification Service

Create `services/PushNotificationService.js`:

```javascript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
    this.token = null;
  }

  /**
   * Initialize push notifications
   * Call this on app startup after user authentication
   */
  async initialize(userId) {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return null;
      }

      // Get push token
      this.token = await this.getPushToken();
      
      if (this.token) {
        // Register token with backend
        await this.registerTokenWithBackend(this.token, userId);
        
        // Store token locally
        await AsyncStorage.setItem('expo_push_token', this.token);
        
        // Setup notification listeners
        this.setupNotificationListeners();
        
        console.log('Push notifications initialized successfully');
        return this.token;
      }
      
      return null;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return null;
    }
  }

  /**
   * Get Expo push token
   */
  async getPushToken() {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      return tokenData.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Register push token with Laravel backend
   */
  async registerTokenWithBackend(pushToken, userId) {
    try {
      const deviceInfo = {
        push_token: pushToken,
        device_id: Device.deviceName || 'unknown',
        platform: Platform.OS,
        app_version: '1.0.0', // Get from app config
        device_name: Device.deviceName,
        device_model: Device.modelName,
        os_version: Device.osVersion,
      };

      const response = await ApiService.post('/user-management/push-tokens/register', deviceInfo);
      
      if (response.success) {
        console.log('Push token registered successfully:', response.data);
        return response.data;
      } else {
        console.error('Failed to register push token:', response.message);
        return null;
      }
    } catch (error) {
      console.error('Error registering push token:', error);
      return null;
    }
  }

  /**
   * Setup notification event listeners
   */
  setupNotificationListeners() {
    // Listener for notifications received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      
      // Handle notification received (update badge, play sound, etc.)
      this.handleNotificationReceived(notification);
    });

    // Listener for user interaction with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      // Handle notification tap/action
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle notification received while app is active
   */
  handleNotificationReceived(notification) {
    const { title, body, data } = notification.request.content;
    
    // Update app badge
    Notifications.setBadgeCountAsync(data.unread_count || 1);
    
    // You can dispatch custom events here
    // EventEmitter.emit('notificationReceived', notification);
    
    // Show in-app notification if needed
    // this.showInAppNotification(title, body, data);
  }

  /**
   * Handle user interaction with notifications
   */
  handleNotificationResponse(response) {
    const { actionIdentifier } = response;
    const { data } = response.notification.request.content;
    
    if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      // User tapped the notification
      this.handleNotificationTap(data);
    }
  }

  /**
   * Handle notification tap - navigate to appropriate screen
   */
  handleNotificationTap(data) {
    // Navigate based on notification type and data
    switch (data.type) {
      case 'announcement':
        // Navigate to announcement details
        // Navigation.navigate('AnnouncementDetails', { id: data.announcement_id });
        break;
      case 'grade_update':
        // Navigate to grades screen
        // Navigation.navigate('Grades', { student_id: data.student_id });
        break;
      case 'attendance_alert':
        // Navigate to attendance screen
        // Navigation.navigate('Attendance', { student_id: data.student_id });
        break;
      default:
        // Navigate to notifications list
        // Navigation.navigate('Notifications');
        break;
    }
  }

  /**
   * Clear notification badge
   */
  async clearBadge() {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Remove push token from backend (on logout)
   */
  async removeToken(deviceId = null) {
    try {
      const payload = {};
      if (deviceId) {
        payload.device_id = deviceId;
      }

      await ApiService.post('/user-management/push-tokens/delete', payload);
      
      // Clear local storage
      await AsyncStorage.removeItem('expo_push_token');
      
      console.log('Push token removed successfully');
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }

  /**
   * Cleanup listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  /**
   * Test push notification (development only)
   */
  async testPushNotification() {
    if (!this.token) {
      console.warn('No push token available');
      return;
    }

    // Schedule a local notification for testing
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
        body: "This is a test notification",
        data: { test: true },
      },
      trigger: { seconds: 2 },
    });
  }
}

export default new PushNotificationService();
```

### 2. Real-time WebSocket Service

Create `services/RealTimeService.js`:

```javascript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

class RealTimeService {
  constructor() {
    this.echo = null;
    this.channels = new Map();
    this.connected = false;
  }

  /**
   * Initialize Laravel Echo with Reverb
   */
  async initialize(authToken, userId) {
    try {
      // Configure Pusher client
      window.Pusher = Pusher;

      this.echo = new Echo({
        broadcaster: 'reverb',
        key: process.env.EXPO_PUBLIC_REVERB_KEY,
        wsHost: process.env.EXPO_PUBLIC_REVERB_HOST,
        wsPort: process.env.EXPO_PUBLIC_REVERB_PORT,
        wssPort: process.env.EXPO_PUBLIC_REVERB_PORT,
        forceTLS: process.env.EXPO_PUBLIC_REVERB_SCHEME === 'https',
        enabledTransports: ['ws', 'wss'],
        auth: {
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json',
          },
        },
      });

      // Setup connection event listeners
      this.setupConnectionListeners();

      // Subscribe to user's private notification channel
      this.subscribeToUserNotifications(userId);

      console.log('Real-time service initialized');
      return true;
    } catch (error) {
      console.error('Error initializing real-time service:', error);
      return false;
    }
  }

  /**
   * Setup connection event listeners
   */
  setupConnectionListeners() {
    if (!this.echo) return;

    this.echo.connector.pusher.connection.bind('connected', () => {
      console.log('WebSocket connected');
      this.connected = true;
    });

    this.echo.connector.pusher.connection.bind('disconnected', () => {
      console.log('WebSocket disconnected');
      this.connected = false;
    });

    this.echo.connector.pusher.connection.bind('error', (error) => {
      console.error('WebSocket error:', error);
      this.connected = false;
    });
  }

  /**
   * Subscribe to user's private notification channel
   */
  subscribeToUserNotifications(userId, callbacks = {}) {
    if (!this.echo) return null;

    const channelName = `user.${userId}.notifications`;
    
    const channel = this.echo.private(channelName);
    
    // Listen for new notifications
    channel.listen('notification.created', (data) => {
      console.log('New notification received:', data);
      if (callbacks.onNotificationCreated) {
        callbacks.onNotificationCreated(data);
      }
    });

    // Listen for notification read events
    channel.listen('notification.read', (data) => {
      console.log('Notification marked as read:', data);
      if (callbacks.onNotificationRead) {
        callbacks.onNotificationRead(data);
      }
    });

    // Listen for notification stats updates
    channel.listen('notification.stats.updated', (data) => {
      console.log('Notification stats updated:', data);
      if (callbacks.onStatsUpdated) {
        callbacks.onStatsUpdated(data);
      }
    });

    // Store channel reference
    this.channels.set(channelName, channel);
    
    return channel;
  }

  /**
   * Subscribe to additional channels (announcements, grades, etc.)
   */
  subscribeToChannel(channelName, eventCallbacks = {}) {
    if (!this.echo) return null;

    const channel = this.echo.channel(channelName);
    
    // Setup event listeners
    Object.entries(eventCallbacks).forEach(([eventName, callback]) => {
      channel.listen(eventName, callback);
    });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribeFromChannel(channelName) {
    if (this.channels.has(channelName)) {
      const channel = this.channels.get(channelName);
      this.echo.leaveChannel(channelName);
      this.channels.delete(channelName);
      console.log(`Unsubscribed from channel: ${channelName}`);
    }
  }

  /**
   * Get connection status
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Reconnect WebSocket
   */
  reconnect() {
    if (this.echo) {
      this.echo.connector.pusher.connect();
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.echo) {
      // Unsubscribe from all channels
      this.channels.forEach((channel, channelName) => {
        this.echo.leaveChannel(channelName);
      });
      this.channels.clear();

      // Disconnect Echo
      this.echo.disconnect();
      this.echo = null;
      this.connected = false;
      
      console.log('Real-time service disconnected');
    }
  }
}

export default new RealTimeService();
```

### 3. Notification State Management Hook

Create `hooks/useNotifications.js`:

```javascript
import { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';
import RealTimeService from '../services/RealTimeService';
import PushNotificationService from '../services/PushNotificationService';

export const useNotifications = (userId) => {
  // State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('all');

  // Initialize real-time updates
  useEffect(() => {
    if (!userId) return;

    const callbacks = {
      onNotificationCreated: handleNewNotification,
      onNotificationRead: handleNotificationRead,
      onStatsUpdated: handleStatsUpdate,
    };

    RealTimeService.subscribeToUserNotifications(userId, callbacks);

    return () => {
      RealTimeService.unsubscribeFromChannel(`user.${userId}.notifications`);
    };
  }, [userId]);

  /**
   * Load notifications from API
   */
  const loadNotifications = useCallback(async (page = 1, reset = false) => {
    if (loading && !reset) return;
    
    setLoading(true);
    if (reset) {
      setRefreshing(true);
      setCurrentPage(1);
    }

    try {
      const params = {
        page: reset ? 1 : page,
        per_page: 20,
        filter: filter,
      };

      const response = await ApiService.post('/communication-management/notifications/list', params);

      if (response.success) {
        const newNotifications = response.data.data || [];
        
        if (reset || page === 1) {
          setNotifications(newNotifications);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }
        
        setUnreadCount(response.data.unread_count || 0);
        setHasMore(response.data.has_more_pages || false);
        setCurrentPage(response.data.current_page || page);
        
        // Update badge count
        PushNotificationService.clearBadge();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, loading]);

  /**
   * Load more notifications (pagination)
   */
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadNotifications(currentPage + 1);
    }
  }, [loading, hasMore, currentPage, loadNotifications]);

  /**
   * Refresh notifications
   */
  const refresh = useCallback(() => {
    loadNotifications(1, true);
  }, [loadNotifications]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      // Optimistic update
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      const response = await ApiService.post('/communication-management/notifications/mark-read', {
        notification_id: notificationId
      });

      if (!response.success) {
        // Revert optimistic update on failure
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: false, read_at: null }
              : notif
          )
        );
        setUnreadCount(prev => prev + 1);
        console.error('Failed to mark notification as read:', response.message);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert optimistic update
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: false, read_at: null }
            : notif
        )
      );
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true, read_at: new Date().toISOString() }))
      );
      const previousUnreadCount = unreadCount;
      setUnreadCount(0);

      const response = await ApiService.post('/communication-management/notifications/mark-read', {
        mark_all: true
      });

      if (!response.success) {
        // Revert optimistic update on failure
        refresh();
        console.error('Failed to mark all notifications as read:', response.message);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      refresh(); // Revert by refreshing
    }
  }, [unreadCount, refresh]);

  /**
   * Delete notification
   */
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      // Optimistic update
      const notificationToDelete = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      if (notificationToDelete && !notificationToDelete.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      const response = await ApiService.post('/communication-management/notifications/delete', {
        notification_id: notificationId
      });

      if (!response.success) {
        // Revert optimistic update on failure
        refresh();
        console.error('Failed to delete notification:', response.message);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      refresh(); // Revert by refreshing
    }
  }, [notifications, refresh]);

  /**
   * Handle new notification from real-time updates
   */
  const handleNewNotification = useCallback((data) => {
    const newNotification = {
      id: data.id,
      recipient_id: data.recipient_id,
      title: data.title,
      message: data.message,
      priority: data.priority,
      priority_label: data.priority_label,
      priority_color: data.priority_color,
      type: data.type,
      type_name: data.type_name,
      action_url: data.action_url,
      action_text: data.action_text,
      image_url: data.image_url,
      is_read: data.is_read,
      is_delivered: data.is_delivered,
      created_at: data.created_at,
      time_ago: data.time_ago,
    };

    // Add to the beginning of the list
    setNotifications(prev => [newNotification, ...prev]);
    
    // Increment unread count if not read
    if (!data.is_read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  /**
   * Handle notification read from real-time updates
   */
  const handleNotificationRead = useCallback((data) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === data.id 
          ? { ...notif, is_read: true, read_at: data.read_at }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  /**
   * Handle stats update from real-time updates
   */
  const handleStatsUpdate = useCallback((data) => {
    setUnreadCount(data.unread_count || 0);
  }, []);

  /**
   * Change filter
   */
  const changeFilter = useCallback((newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
    loadNotifications(1, true);
  }, [loadNotifications]);

  // Initial load
  useEffect(() => {
    if (userId) {
      loadNotifications(1, true);
    }
  }, [userId, filter]);

  return {
    // Data
    notifications,
    unreadCount,
    filter,
    
    // States
    loading,
    refreshing,
    hasMore,
    
    // Actions
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    changeFilter,
  };
};
```

## 🎨 UI Components

### 1. Notification List Component

Create `components/NotificationList.js`:

```javascript
import React from 'react';
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import NotificationItem from './NotificationItem';

const NotificationList = ({
  notifications,
  loading,
  refreshing,
  hasMore,
  unreadCount,
  onRefresh,
  onLoadMore,
  onMarkAsRead,
  onDeleteNotification,
  onNotificationPress,
  onMarkAllAsRead,
}) => {
  const renderNotification = ({ item }) => (
    <NotificationItem
      notification={item}
      onPress={() => onNotificationPress(item)}
      onMarkAsRead={() => onMarkAsRead(item.id)}
      onDelete={() => onDeleteNotification(item.id)}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={onMarkAllAsRead}
          >
            <Text style={styles.markAllButtonText}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>
      {unreadCount > 0 && (
        <Text style={styles.unreadCount}>
          {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>No more notifications</Text>
        </View>
      );
    }

    if (loading && notifications.length > 0) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      );
    }

    return null;
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyMessage}>
        You'll see notifications from the school here
      </Text>
    </View>
  );

  return (
    <FlatList
      data={notifications}
      renderItem={renderNotification}
      keyExtractor={(item) => item.id.toString()}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#007AFF']}
          tintColor="#007AFF"
        />
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.1}
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={!loading ? renderEmpty : null}
      contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : null}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  markAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  unreadCount: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationList;
```

### 2. Notification Item Component

Create `components/NotificationItem.js`:

```javascript
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow, parseISO } from 'date-fns';

const NotificationItem = ({
  notification,
  onPress,
  onMarkAsRead,
  onDelete,
}) => {
  const handleDelete = () => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return '#ff4444';
      case 'high':
        return '#ff8800';
      default:
        return '#007AFF';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'alert-circle';
      case 'high':
        return 'warning';
      default:
        return 'information-circle';
    }
  };

  const timeAgo = formatDistanceToNow(parseISO(notification.created_at), {
    addSuffix: true,
  });

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !notification.is_read && styles.unread,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Priority Indicator */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.priorityContainer}>
            <Ionicons
              name={getPriorityIcon(notification.priority)}
              size={16}
              color={getPriorityColor(notification.priority)}
              style={styles.priorityIcon}
            />
            <Text style={[styles.priority, { color: getPriorityColor(notification.priority) }]}>
              {notification.priority_label || notification.priority.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.time}>{timeAgo}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {notification.title}
        </Text>
        
        <Text style={styles.message} numberOfLines={3}>
          {notification.message}
        </Text>

        {notification.type_name && (
          <View style={styles.typeContainer}>
            <Text style={styles.type}>{notification.type_name}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {!notification.is_read && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onMarkAsRead();
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#28a745" />
              <Text style={[styles.actionText, { color: '#28a745' }]}>
                Mark Read
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#dc3545" />
            <Text style={[styles.actionText, { color: '#dc3545' }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </div>

      {/* Unread indicator */}
      {!notification.is_read && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 16,
    paddingHorizontal: 16,
    position: 'relative',
  },
  unread: {
    backgroundColor: '#f8f9ff',
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityIcon: {
    marginRight: 4,
  },
  priority: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 22,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  typeContainer: {
    marginBottom: 8,
  },
  type: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#007AFF',
  },
});

export default NotificationItem;
```

### 3. Notification Badge Component

Create `components/NotificationBadge.js`:

```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NotificationBadge = ({ count, style }) => {
  if (!count || count <= 0) return null;

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>
        {count > 99 ? '99+' : count.toString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default NotificationBadge;
```

## 📲 Usage Examples

### 1. Main App Integration

In your main `App.js` or authentication flow:

```javascript
import { useEffect } from 'react';
import { useAuthContext } from './contexts/AuthContext';
import PushNotificationService from './services/PushNotificationService';
import RealTimeService from './services/RealTimeService';

export default function App() {
  const { user, token } = useAuthContext();

  useEffect(() => {
    if (user && token) {
      // Initialize push notifications
      PushNotificationService.initialize(user.id);
      
      // Initialize real-time updates
      RealTimeService.initialize(token, user.id);
    }

    return () => {
      // Cleanup on logout
      PushNotificationService.cleanup();
      RealTimeService.disconnect();
    };
  }, [user, token]);

  // ... rest of your app
}
```

### 2. Notifications Screen

Create `screens/NotificationsScreen.js`:

```javascript
import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useAuthContext } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import NotificationList from '../components/NotificationList';

const NotificationsScreen = ({ navigation }) => {
  const { user } = useAuthContext();
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    hasMore,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(user?.id);

  const handleNotificationPress = (notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type or action_url
    if (notification.action_url) {
      // Parse and navigate to the specified URL/screen
      // navigation.navigate(notification.action_url);
    } else {
      // Navigate to notification details
      navigation.navigate('NotificationDetails', { 
        notificationId: notification.id 
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <NotificationList
        notifications={notifications}
        loading={loading}
        refreshing={refreshing}
        hasMore={hasMore}
        unreadCount={unreadCount}
        onRefresh={refresh}
        onLoadMore={loadMore}
        onMarkAsRead={markAsRead}
        onDeleteNotification={deleteNotification}
        onNotificationPress={handleNotificationPress}
        onMarkAllAsRead={markAllAsRead}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default NotificationsScreen;
```

### 3. Tab Bar with Notification Badge

```javascript
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useNotifications } from '../hooks/useNotifications';
import NotificationBadge from '../components/NotificationBadge';
import NotificationsScreen from '../screens/NotificationsScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { user } = useAuthContext();
  const { unreadCount } = useNotifications(user?.id);

  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="notifications-outline" size={size} color={color} />
              <NotificationBadge 
                count={unreadCount} 
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -5,
                }}
              />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};
```

## 🔧 Configuration & Environment

### Backend Requirements

Ensure your Laravel backend has:

1. **Laravel Reverb** configured for WebSocket broadcasting
2. **Queue workers** running for push notification jobs
3. **Proper CORS** settings for your React Native app

### Environment Variables (.env)

```env
# Required
EXPO_PUBLIC_API_BASE_URL=http://your-backend-url
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id

# WebSocket (Laravel Reverb)
EXPO_PUBLIC_REVERB_HOST=your-reverb-host
EXPO_PUBLIC_REVERB_PORT=8080
EXPO_PUBLIC_REVERB_KEY=your-reverb-key
EXPO_PUBLIC_REVERB_SCHEME=http

# Optional
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_DEBUG_NOTIFICATIONS=true
```

## 🐛 Troubleshooting

### Common Issues

1. **Push notifications not working**
   - Check if running on physical device (not simulator)
   - Verify Expo push token is correctly generated
   - Check backend logs for push notification errors

2. **WebSocket connection issues**
   - Verify Reverb server is running
   - Check network connectivity
   - Ensure correct authentication token

3. **Permissions denied**
   - Request permissions properly in `PushNotificationService.initialize()`
   - Check iOS/Android notification settings

### Debug Logging

Enable debug logging in development:

```javascript
// In your services
if (__DEV__) {
  console.log('Debug info:', data);
}
```

## 📚 Next Steps

1. **Test on physical devices** - Push notifications only work on physical devices
2. **Configure production settings** - Update URLs and keys for production
3. **Add analytics** - Track notification engagement
4. **Customize UI** - Match your app's design system
5. **Add more notification types** - Handle specific school app notifications

This guide provides a complete foundation for implementing notifications in your React Native school management app. The system is designed to be scalable, reliable, and user-friendly.