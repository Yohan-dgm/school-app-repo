import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import NotificationList from "./NotificationList";
import NotificationBadge from "./NotificationBadge";
import { useGetNotificationsQuery } from "../../api/notifications";

// Define interfaces locally to match API data
interface UnifiedNotification {
  id: number; // API returns number, not string
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  [key: string]: any;
}

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
  onNotificationPress?: (notification: UnifiedNotification) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  visible,
  onClose,
  onNotificationPress,
}) => {
  const insets = useSafeAreaInsets();
  const [slideAnim] = useState(
    new Animated.Value(Dimensions.get("window").height)
  );

  // Get auth data from Redux store following UniversalNotificationSystem pattern
  const sessionData = useSelector((state: any) => state.app);
  const userToken = sessionData?.token || sessionData?.data?.token;
  const userId = sessionData?.data?.id || sessionData?.id;

  // API integration following UniversalNotificationSystem pattern
  const { data: notificationsData, refetch: refetchNotifications } =
    useGetNotificationsQuery(
      {
        page: 1,
        limit: 50,
        filters: {
          filter: "all",
          search: "",
          type_id: undefined, // Standardized: match other components for shared cache
          priority: undefined, // Standardized: match other components for shared cache
          unread_only: false,
        },
      },
      {
        skip: !userId || !userToken,
      }
    );

  // Simple unread count calculation following UniversalNotificationSystem pattern
  const allNotifications = notificationsData?.data || [];
  const unreadCount = allNotifications.filter(
    (notification) => !notification.is_read
  ).length;

  // Real-time updates are now handled by UniversalNotificationSystem via cache invalidation
  // No need for component-specific real-time setup

  const handleNotificationPress = useCallback(
    (notification: UnifiedNotification) => {
      onNotificationPress?.(notification);
      onClose();
    },
    [onNotificationPress, onClose]
  );

  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: Dimensions.get("window").height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.container,
            {
              paddingTop:
                insets.top +
                (Platform.OS === "ios" ? 0 : StatusBar.currentHeight || 0),
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.titleContainer}>
                <MaterialIcons name="notifications" size={24} color="#333" />
                <Text style={styles.title}>Notifications</Text>
                {unreadCount > 0 && (
                  <NotificationBadge
                    count={unreadCount}
                    size="small"
                    style={{
                      position: "relative",
                      top: 0,
                      right: 0,
                      marginLeft: 8,
                    }}
                  />
                )}
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Notification List */}
          <View style={styles.content}>
            <NotificationList
              onNotificationPress={handleNotificationPress}
              showActions={true}
              compact={false}
              autoRefresh={true}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

interface NotificationIconProps {
  onPress: () => void;
  size?: number;
  color?: string;
  showBadge?: boolean;
  style?: any;
}

export const NotificationIcon: React.FC<NotificationIconProps> = ({
  onPress,
  size = 24,
  color = "#333",
  showBadge = true,
  style,
}) => {
  // Get auth data from Redux store following UniversalNotificationSystem pattern
  const sessionData = useSelector((state: any) => state.app);
  const userToken = sessionData?.token || sessionData?.data?.token;
  const userId = sessionData?.data?.id || sessionData?.id;

  // API integration following UniversalNotificationSystem pattern
  const { data: notificationsData, refetch: refetchNotifications } =
    useGetNotificationsQuery(
      {
        page: 1,
        limit: 50, // Standardized: match other components for shared cache
        filters: {
          filter: "all",
          search: "",
          type_id: undefined, // Standardized: match other components for shared cache
          priority: undefined, // Standardized: match other components for shared cache
          unread_only: false,
        },
      },
      {
        skip: !userId || !userToken,
      }
    );

  // Simple unread count calculation following UniversalNotificationSystem pattern
  const allNotifications = notificationsData?.data || [];
  const unreadCount = allNotifications.filter(
    (notification) => !notification.is_read
  ).length;

  // Real-time updates are now handled by UniversalNotificationSystem via cache invalidation
  // No need for component-specific real-time setup

  return (
    <TouchableOpacity
      style={[styles.iconContainer, style]}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <MaterialIcons name="notifications" size={size} color={color} />
      {showBadge && unreadCount > 0 && (
        <NotificationBadge count={unreadCount} size="small" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdrop: {
    flex: 1,
  },
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#f5f5f5",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  iconContainer: {
    position: "relative",
  },
});

export default NotificationCenter;
