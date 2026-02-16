import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useSelector } from "react-redux";
import { MaterialIcons } from "@expo/vector-icons";
import RealTimeNotificationService from "../../services/notifications/RealTimeNotificationService";
import PushNotificationService from "../../services/notifications/PushNotificationService";
import NotificationManager from "../../services/notifications/NotificationManager";

interface ConnectionTestPanelProps {
  onClose?: () => void;
}

export const ConnectionTestPanel: React.FC<ConnectionTestPanelProps> = ({
  onClose,
}) => {
  const [connectionStatus, setConnectionStatus] = useState<{
    websocket: boolean;
    pushService: boolean;
    notificationManager: boolean;
  }>({
    websocket: false,
    pushService: false,
    notificationManager: false,
  });

  const [testResults, setTestResults] = useState<{
    websocketConnection: string;
    pushToken: string;
    managerStatus: string;
    lastTest: string;
  }>({
    websocketConnection: "Not tested",
    pushToken: "Not tested",
    managerStatus: "Not tested",
    lastTest: "Never",
  });

  // Get auth data from Redux store (from app slice)
  const authToken = useSelector((state: any) => state.app?.token);
  const userId = useSelector((state: any) => state.app?.user?.id);

  useEffect(() => {
    updateConnectionStatus();

    // Debug logging for authentication state
    console.log("🔐 [ConnectionTest] Auth State:", {
      hasAuthToken: !!authToken,
      tokenPreview: authToken ? `${authToken.substring(0, 20)}...` : "No token",
      hasUserId: !!userId,
      userId: userId,
      timestamp: new Date().toISOString(),
    });
  }, [authToken, userId]);

  const updateConnectionStatus = () => {
    const websocketConnected = RealTimeNotificationService.isConnected();
    const pushAvailable = PushNotificationService.isPushNotificationAvailable();
    const managerStatus = NotificationManager.getStatus();

    setConnectionStatus({
      websocket: websocketConnected,
      pushService: pushAvailable,
      notificationManager: managerStatus.isInitialized,
    });
  };

  const testWebSocketConnection = async () => {
    try {
      console.log("🧪 Testing WebSocket connection...");

      if (!authToken || !userId) {
        const missingItems = [];
        if (!authToken) missingItems.push("auth token");
        if (!userId) missingItems.push("user ID");

        const errorMsg = `Missing: ${missingItems.join(", ")}`;
        setTestResults((prev) => ({
          ...prev,
          websocketConnection: `Failed - ${errorMsg}`,
          lastTest: new Date().toLocaleTimeString(),
        }));

        Alert.alert(
          "Test Failed",
          `Missing authentication credentials:\n${missingItems.join(", ")}\n\nPlease ensure you are logged in.`,
        );
        return;
      }

      // Initialize real-time service
      const initialized = await RealTimeNotificationService.initialize(
        authToken,
        userId.toString(),
        {
          onConnectionStateChange: (connected) => {
            console.log("WebSocket connection state:", connected);
            setConnectionStatus((prev) => ({ ...prev, websocket: connected }));
            setTestResults((prev) => ({
              ...prev,
              websocketConnection: connected
                ? "Connected ✅"
                : "Disconnected ❌",
              lastTest: new Date().toLocaleTimeString(),
            }));
          },
          onError: (error) => {
            console.error("WebSocket error:", error);
            setTestResults((prev) => ({
              ...prev,
              websocketConnection: `Error: ${error.message || "Unknown error"}`,
              lastTest: new Date().toLocaleTimeString(),
            }));
          },
        },
      );

      if (initialized) {
        setTestResults((prev) => ({
          ...prev,
          websocketConnection: "Initialized - Connecting...",
          lastTest: new Date().toLocaleTimeString(),
        }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          websocketConnection: "Failed to initialize",
          lastTest: new Date().toLocaleTimeString(),
        }));
      }
    } catch (error: any) {
      console.error("WebSocket test failed:", error);
      setTestResults((prev) => ({
        ...prev,
        websocketConnection: `Failed: ${error.message}`,
        lastTest: new Date().toLocaleTimeString(),
      }));
      Alert.alert("WebSocket Test Failed", error.message || "Unknown error");
    }
  };

  const testPushToken = async () => {
    try {
      console.log("🧪 Testing push token...");

      // Initialize push service
      await PushNotificationService.initialize(authToken, userId?.toString());

      const token = PushNotificationService.getPushToken();
      const isAvailable = PushNotificationService.isPushNotificationAvailable();

      if (token) {
        setTestResults((prev) => ({
          ...prev,
          pushToken: `Available ✅ (${token.substring(0, 20)}...)`,
          lastTest: new Date().toLocaleTimeString(),
        }));
        setConnectionStatus((prev) => ({ ...prev, pushService: true }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          pushToken: isAvailable ? "Not generated ⚠️" : "Not available ❌",
          lastTest: new Date().toLocaleTimeString(),
        }));
        setConnectionStatus((prev) => ({ ...prev, pushService: false }));
      }
    } catch (error: any) {
      console.error("Push token test failed:", error);
      setTestResults((prev) => ({
        ...prev,
        pushToken: `Failed: ${error.message}`,
        lastTest: new Date().toLocaleTimeString(),
      }));
      Alert.alert("Push Token Test Failed", error.message || "Unknown error");
    }
  };

  const testNotificationManager = async () => {
    try {
      console.log("🧪 Testing notification manager...");

      if (!authToken || !userId) {
        const missingItems = [];
        if (!authToken) missingItems.push("auth token");
        if (!userId) missingItems.push("user ID");

        const errorMsg = `Missing: ${missingItems.join(", ")}`;
        setTestResults((prev) => ({
          ...prev,
          managerStatus: `Failed - ${errorMsg}`,
          lastTest: new Date().toLocaleTimeString(),
        }));
        return;
      }

      // Initialize notification manager
      const initialized = await NotificationManager.initialize(
        authToken,
        userId.toString(),
        {
          onConnectionStateChange: (connected) => {
            console.log("Manager connection state:", connected);
            setConnectionStatus((prev) => ({
              ...prev,
              notificationManager: connected,
            }));
          },
          onError: (error) => {
            console.error("Manager error:", error);
          },
        },
      );

      if (initialized) {
        const status = NotificationManager.getStatus();
        setTestResults((prev) => ({
          ...prev,
          managerStatus: `Initialized ✅ (${status.notificationCount} notifications)`,
          lastTest: new Date().toLocaleTimeString(),
        }));
        setConnectionStatus((prev) => ({ ...prev, notificationManager: true }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          managerStatus: "Failed to initialize ❌",
          lastTest: new Date().toLocaleTimeString(),
        }));
        setConnectionStatus((prev) => ({
          ...prev,
          notificationManager: false,
        }));
      }
    } catch (error: any) {
      console.error("Notification manager test failed:", error);
      setTestResults((prev) => ({
        ...prev,
        managerStatus: `Failed: ${error.message}`,
        lastTest: new Date().toLocaleTimeString(),
      }));
      Alert.alert("Manager Test Failed", error.message || "Unknown error");
    }
  };

  const runAllTests = async () => {
    console.log("🧪 Running all connection tests...");
    await testPushToken();
    await testNotificationManager();
    await testWebSocketConnection();
  };

  const showDetailedStatus = () => {
    const realtimeStatus = RealTimeNotificationService.getStatus();
    const pushStatus = PushNotificationService.getServiceStatus();
    const managerStatus = NotificationManager.getStatus();

    const statusText = `
REAL-TIME SERVICE:
Connected: ${realtimeStatus.connected}
Active Channels: ${realtimeStatus.activeChannels}
Reconnect Attempts: ${realtimeStatus.reconnectAttempts}

PUSH SERVICE:
Has Token: ${pushStatus.hasPushToken}
Push Available: ${pushStatus.isPushNotificationAvailable}
Local Available: ${pushStatus.isLocalNotificationAvailable}

NOTIFICATION MANAGER:
Initialized: ${managerStatus.isInitialized}
Connected: ${managerStatus.isConnected}
Notification Count: ${managerStatus.notificationCount}
Unread Count: ${managerStatus.unreadCount}

ENVIRONMENT:
Reverb Host: ${process.env.EXPO_PUBLIC_REVERB_HOST}
Reverb Port: ${process.env.EXPO_PUBLIC_REVERB_PORT}
API Base URL: ${process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1}
    `.trim();

    Alert.alert("Detailed Status", statusText);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔗 Connection Test Panel</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Connection Status Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Connection Status</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>WebSocket</Text>
              <View
                style={[
                  styles.statusIndicator,
                  connectionStatus.websocket
                    ? styles.connected
                    : styles.disconnected,
                ]}
              >
                <MaterialIcons
                  name={connectionStatus.websocket ? "wifi" : "wifi-off"}
                  size={16}
                  color="white"
                />
              </View>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Push Service</Text>
              <View
                style={[
                  styles.statusIndicator,
                  connectionStatus.pushService
                    ? styles.connected
                    : styles.disconnected,
                ]}
              >
                <MaterialIcons
                  name={
                    connectionStatus.pushService
                      ? "notifications-active"
                      : "notifications-off"
                  }
                  size={16}
                  color="white"
                />
              </View>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Manager</Text>
              <View
                style={[
                  styles.statusIndicator,
                  connectionStatus.notificationManager
                    ? styles.connected
                    : styles.disconnected,
                ]}
              >
                <MaterialIcons
                  name={
                    connectionStatus.notificationManager
                      ? "check-circle"
                      : "error"
                  }
                  size={16}
                  color="white"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Individual Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Individual Tests</Text>

          <TouchableOpacity
            style={styles.testButton}
            onPress={testWebSocketConnection}
          >
            <MaterialIcons name="swap-horiz" size={18} color="#ffffff" />
            <Text style={styles.testButtonText}>Test WebSocket Connection</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testPushToken}>
            <MaterialIcons name="notifications" size={18} color="#ffffff" />
            <Text style={styles.testButtonText}>Test Push Token</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={testNotificationManager}
          >
            <MaterialIcons name="settings" size={18} color="#ffffff" />
            <Text style={styles.testButtonText}>Test Notification Manager</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.primaryButton]}
            onPress={runAllTests}
          >
            <MaterialIcons
              name="play-circle-filled"
              size={18}
              color="#ffffff"
            />
            <Text style={styles.testButtonText}>Run All Tests</Text>
          </TouchableOpacity>
        </View>

        {/* Test Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Test Results</Text>
          <Text style={styles.lastTestTime}>
            Last tested: {testResults.lastTest}
          </Text>

          <View style={styles.resultsList}>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>WebSocket:</Text>
              <Text style={styles.resultValue}>
                {testResults.websocketConnection}
              </Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Push Token:</Text>
              <Text style={styles.resultValue}>{testResults.pushToken}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Manager:</Text>
              <Text style={styles.resultValue}>
                {testResults.managerStatus}
              </Text>
            </View>
          </View>
        </View>

        {/* Utilities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛠️ Utilities</Text>

          <TouchableOpacity
            style={styles.utilButton}
            onPress={updateConnectionStatus}
          >
            <MaterialIcons name="refresh" size={18} color="#3b82f6" />
            <Text style={styles.utilButtonText}>Refresh Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilButton}
            onPress={showDetailedStatus}
          >
            <MaterialIcons name="info" size={18} color="#3b82f6" />
            <Text style={styles.utilButtonText}>Show Detailed Status</Text>
          </TouchableOpacity>
        </View>

        {/* Configuration Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Configuration</Text>
          <Text style={styles.configText}>
            Reverb Host: {process.env.EXPO_PUBLIC_REVERB_HOST || "Not set"}
            {"\n"}
            Reverb Port: {process.env.EXPO_PUBLIC_REVERB_PORT || "Not set"}
            {"\n"}
            API Base:{" "}
            {process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1 || "Not set"}
            {"\n"}
            User ID: {userId || "Not available"}
            {"\n"}
            Has Auth Token:{" "}
            {authToken ? `Yes (${authToken.substring(0, 20)}...)` : "No"}
            {"\n"}
            App Authenticated: {authToken && userId ? "Yes" : "No"}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: "white",
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 12,
  },
  statusItem: {
    alignItems: "center",
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
    textAlign: "center",
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  connected: {
    backgroundColor: "#10b981",
  },
  disconnected: {
    backgroundColor: "#ef4444",
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#7c3aed",
  },
  testButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  lastTestTime: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 12,
    fontStyle: "italic",
  },
  resultsList: {
    gap: 8,
  },
  resultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  resultLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  resultValue: {
    fontSize: 12,
    color: "#6b7280",
    flex: 2,
    textAlign: "right",
  },
  utilButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  utilButtonText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
  },
  configText: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18,
    fontFamily: "monospace",
  },
});

export default ConnectionTestPanel;
