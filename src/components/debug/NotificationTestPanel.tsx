import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { useSelector } from "react-redux";
import { MaterialIcons } from "@expo/vector-icons";
import notificationTester from "../../utils/notificationTester";
import { useNotifications } from "../../hooks/useNotifications";
import PushNotificationService from "../../services/notifications/PushNotificationService";
import ConnectionTestPanel from "./ConnectionTestPanel";

interface NotificationTestPanelProps {
  onClose?: () => void;
}

export const NotificationTestPanel: React.FC<NotificationTestPanelProps> = ({
  onClose,
}) => {
  // DISABLED: Push notification test panel is currently disabled
  // Original component code kept for future re-enabling
  /*
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [customTitle, setCustomTitle] = useState("Test Notification");
  const [customBody, setCustomBody] = useState(
    "This is a test notification message.",
  );
  const [showConnectionPanel, setShowConnectionPanel] = useState(false);

  // Get auth data from Redux store (from app slice)
  const authToken = useSelector((state: any) => state.app?.token);
  const userId = useSelector((state: any) => state.app?.user?.id);

  // Use the notifications hook
  const {
    isInitialized,
    pushToken,
    unreadCount,
    isConnected,
    sendGeneralNotification,
    sendAcademicAlert,
    sendPaymentReminder,
    sendEventNotification,
    getServiceStatus,
  } = useNotifications(authToken, userId?.toString());

  const runFullTest = async () => {
    setIsRunning(true);
    try {
      console.log("🧪 Starting full notification test...");
      const results = await notificationTester.runAllTests(
        authToken,
        userId?.toString(),
      );
      setTestResults(results);
    } catch (error) {
      console.error("❌ Test failed:", error);
      Alert.alert("Test Failed", error.message || "Unknown error occurred");
    } finally {
      setIsRunning(false);
    }
  };

  const testPermissions = async () => {
    try {
      const result = await notificationTester.testPermissions();
      Alert.alert(
        "Permission Test Result",
        result ? "✅ Permissions granted!" : "❌ Permissions not granted",
      );
    } catch (error) {
      Alert.alert("Test Failed", error.message);
    }
  };

  const testLocalNotification = async () => {
    try {
      await sendGeneralNotification(customTitle, customBody);
      Alert.alert("Success", "✅ Local notification sent!");
    } catch (error) {
      Alert.alert(
        "Test Failed",
        error.message || "Failed to send notification",
      );
    }
  };

  const testSchoolNotifications = async () => {
    try {
      const results = [];

      // Test academic alert
      const academicId = await sendAcademicAlert(
        "📚 Academic Test",
        "Test academic notification",
      );
      results.push(`Academic: ${academicId}`);

      // Test payment reminder
      const paymentId = await sendPaymentReminder(
        "💰 Payment Test",
        "Test payment notification",
        100,
      );
      results.push(`Payment: ${paymentId}`);

      // Test event notification
      const eventId = await sendEventNotification(
        "🎉 Event Test",
        "Test event notification",
      );
      results.push(`Event: ${eventId}`);

      Alert.alert(
        "School Notifications Sent",
        `✅ Sent ${results.length} notifications:\n${results.join("\n")}`,
      );
    } catch (error) {
      Alert.alert(
        "Test Failed",
        error.message || "Failed to send school notifications",
      );
    }
  };

  const showServiceStatus = () => {
    const status = getServiceStatus();
    const statusText = JSON.stringify(status, null, 2);

    Alert.alert(
      "Service Status",
      `Initialized: ${isInitialized ? "✅" : "❌"}
Push Token: ${pushToken ? "✅" : "❌"}
Connected: ${isConnected ? "✅" : "❌"}
Unread Count: ${unreadCount}

Detailed Status:
${statusText.length > 500 ? statusText.substring(0, 500) + "..." : statusText}`,
    );
  };

  const clearAllNotifications = async () => {
    try {
      await PushNotificationService.cancelAllNotifications();
      Alert.alert("Success", "✅ All scheduled notifications cleared!");
    } catch (error) {
      Alert.alert("Error", "Failed to clear notifications");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧪 Notification Test Panel</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Current Status</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Initialized</Text>
              <Text
                style={[
                  styles.statusValue,
                  isInitialized ? styles.success : styles.error,
                ]}
              >
                {isInitialized ? "✅" : "❌"}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Push Token</Text>
              <Text
                style={[
                  styles.statusValue,
                  pushToken ? styles.success : styles.error,
                ]}
              >
                {pushToken ? "✅" : "❌"}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Connected</Text>
              <Text
                style={[
                  styles.statusValue,
                  isConnected ? styles.success : styles.warning,
                ]}
              >
                {isConnected ? "✅" : "⚠️"}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Unread</Text>
              <Text style={styles.statusValue}>{unreadCount}</Text>
            </View>
          </View>
        </View>

        {/* Quick Tests Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Tests</Text>

          <TouchableOpacity style={styles.testButton} onPress={testPermissions}>
            <MaterialIcons name="security" size={18} color="#ffffff" />
            <Text style={styles.testButtonText}>Test Permissions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={showServiceStatus}
          >
            <MaterialIcons name="info" size={18} color="#ffffff" />
            <Text style={styles.testButtonText}>Show Service Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={testSchoolNotifications}
          >
            <MaterialIcons name="school" size={18} color="#ffffff" />
            <Text style={styles.testButtonText}>Test School Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={clearAllNotifications}
          >
            <MaterialIcons name="clear-all" size={18} color="#ffffff" />
            <Text style={styles.testButtonText}>Clear All Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.connectionButton]}
            onPress={() => setShowConnectionPanel(true)}
          >
            <MaterialIcons name="settings-ethernet" size={18} color="#ffffff" />
            <Text style={styles.testButtonText}>Connection Tests</Text>
          </TouchableOpacity>
        </View>

        {/* Custom Notification Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✏️ Custom Notification</Text>

          <TextInput
            style={styles.input}
            placeholder="Notification Title"
            value={customTitle}
            onChangeText={setCustomTitle}
            placeholderTextColor="#9ca3af"
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Notification Message"
            value={customBody}
            onChangeText={setCustomBody}
            multiline
            numberOfLines={3}
            placeholderTextColor="#9ca3af"
          />

          <TouchableOpacity
            style={styles.testButton}
            onPress={testLocalNotification}
          >
            <MaterialIcons name="send" size={18} color="#ffffff" />
            <Text style={styles.testButtonText}>Send Custom Notification</Text>
          </TouchableOpacity>
        </View>

        {/* Full Test Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Comprehensive Test</Text>

          <TouchableOpacity
            style={[styles.fullTestButton, isRunning && styles.disabledButton]}
            onPress={runFullTest}
            disabled={isRunning}
          >
            <MaterialIcons
              name={isRunning ? "hourglass-empty" : "play-arrow"}
              size={20}
              color="#ffffff"
            />
            <Text style={styles.fullTestButtonText}>
              {isRunning ? "Running Tests..." : "Run Full Test Suite"}
            </Text>
          </TouchableOpacity>

          {testResults && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>📋 Test Results:</Text>
              <View style={styles.resultsList}>
                <Text style={styles.resultItem}>
                  Device: {testResults.deviceCapabilities ? "✅" : "❌"}
                </Text>
                <Text style={styles.resultItem}>
                  Permissions: {testResults.permissions ? "✅" : "❌"}
                </Text>
                <Text style={styles.resultItem}>
                  Push Token: {testResults.pushTokenRegistration ? "✅" : "❌"}
                </Text>
                <Text style={styles.resultItem}>
                  Local Notifications:{" "}
                  {testResults.localNotifications ? "✅" : "❌"}
                </Text>
                <Text style={styles.resultItem}>
                  Backend Registration:{" "}
                  {testResults.backendRegistration ? "✅" : "❌"}
                </Text>
                <Text style={styles.resultItem}>
                  School Notifications:{" "}
                  {testResults.schoolNotifications?.length || 0} sent
                </Text>
                <Text style={styles.resultItem}>
                  Notification Manager:{" "}
                  {testResults.notificationManager ? "✅" : "❌"}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📖 Instructions</Text>
          <Text style={styles.instructions}>
            1. Run "Test Permissions" first to ensure notifications are allowed
            {"\n"}
            2. Use "Test School Notifications" to test different notification
            types{"\n"}
            3. Check "Show Service Status" for detailed system information{"\n"}
            4. Run "Full Test Suite" for comprehensive testing{"\n"}
            5. Check the console for detailed logs and error information{"\n"}
            6. For push notifications, test on a physical device only
          </Text>
        </View>
      </ScrollView>

      {/* Connection Test Panel Modal */}
      {showConnectionPanel && (
        <View style={styles.connectionPanelOverlay}>
          <ConnectionTestPanel onClose={() => setShowConnectionPanel(false)} />
        </View>
      )}
    </View>
  );
  */

  // Return disabled message instead
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚫 Test Panel Disabled</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications Disabled</Text>
          <Text style={styles.instructions}>
            Push notification functionality has been temporarily disabled.{"\n\n"}
            The notification system is still functional, but push notification
            alerts and test features are hidden.{"\n\n"}
            Contact the development team to re-enable this feature.
          </Text>
        </View>
      </View>
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
    flexWrap: "wrap",
    gap: 12,
  },
  statusItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  success: {
    color: "#10b981",
  },
  warning: {
    color: "#f59e0b",
  },
  error: {
    color: "#ef4444",
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
  testButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  fullTestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  fullTestButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  resultsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  resultsList: {
    gap: 4,
  },
  resultItem: {
    fontSize: 12,
    color: "#6b7280",
  },
  instructions: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18,
  },
  connectionButton: {
    backgroundColor: "#059669",
  },
  connectionPanelOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
});

export default NotificationTestPanel;
