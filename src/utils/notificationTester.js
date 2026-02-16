/**
 * Push Notification Testing Utility
 *
 * This utility provides comprehensive testing functions for the push notification system.
 * Use this to test notification registration, permissions, and sending/receiving notifications.
 *
 * Usage:
 * 1. Import this utility in your app
 * 2. Call the test functions from the console or UI
 * 3. Check console logs for detailed results
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform, Alert } from "react-native";
import PushNotificationService from "../services/notifications/PushNotificationService";
import NotificationManager from "../services/notifications/NotificationManager";

export class NotificationTester {
  constructor() {
    this.results = {
      permissions: null,
      pushToken: null,
      localNotifications: null,
      backendRegistration: null,
      errors: [],
    };
  }

  /**
   * Log test results with consistent formatting
   */
  log(message, data = null, type = "info") {
    const emoji = {
      info: "🔍",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      test: "🧪",
    };

    console.log(`${emoji[type]} [NotificationTest] ${message}`, data || "");
  }

  /**
   * Test 1: Check device capabilities and permissions
   */
  async testDeviceCapabilities() {
    this.log("Testing device capabilities...", null, "test");

    try {
      const results = {
        isPhysicalDevice: Device.isDevice,
        platform: Platform.OS,
        deviceName: Device.deviceName,
        modelName: Device.modelName,
        osVersion: Device.osVersion,
      };

      this.log("Device Info:", results, "info");

      if (!Device.isDevice) {
        this.log(
          "Push notifications require a physical device",
          null,
          "warning",
        );
      }

      return results;
    } catch (error) {
      this.log("Error checking device capabilities:", error, "error");
      this.results.errors.push(error);
      return null;
    }
  }

  /**
   * Test 2: Request and check permissions
   */
  async testPermissions() {
    this.log("Testing notification permissions...", null, "test");

    try {
      // Check existing permissions
      const existingPermissions = await Notifications.getPermissionsAsync();
      this.log("Existing permissions:", existingPermissions, "info");

      // Request permissions if needed
      let finalPermissions = existingPermissions;
      if (existingPermissions.status !== "granted") {
        this.log("Requesting notification permissions...", null, "info");
        finalPermissions = await Notifications.requestPermissionsAsync();
      }

      this.results.permissions = finalPermissions;

      if (finalPermissions.status === "granted") {
        this.log(
          "Permissions granted successfully!",
          finalPermissions,
          "success",
        );
        return true;
      } else {
        this.log("Permissions not granted", finalPermissions, "warning");
        return false;
      }
    } catch (error) {
      this.log("Error testing permissions:", error, "error");
      this.results.errors.push(error);
      return false;
    }
  }

  /**
   * Test 3: Test push token registration
   */
  async testPushTokenRegistration() {
    this.log("Testing push token registration...", null, "test");

    try {
      if (!Device.isDevice) {
        this.log(
          "Skipping push token test - simulator not supported",
          null,
          "warning",
        );
        return false;
      }

      // Initialize the push notification service
      await PushNotificationService.initialize();

      // Get push token
      const pushToken = PushNotificationService.getPushToken();
      this.results.pushToken = pushToken;

      if (pushToken) {
        this.log(
          "Push token obtained successfully:",
          `${pushToken.substring(0, 20)}...`,
          "success",
        );
        return true;
      } else {
        this.log("Failed to obtain push token", null, "warning");
        return false;
      }
    } catch (error) {
      this.log("Error testing push token registration:", error, "error");
      this.results.errors.push(error);
      return false;
    }
  }

  /**
   * Test 4: Test local notifications
   */
  async testLocalNotifications() {
    this.log("Testing local notifications...", null, "test");

    try {
      const testNotification = {
        id: `test-${Date.now()}`,
        title: "🧪 Test Notification",
        body: "This is a test notification from the notification tester utility.",
        priority: "normal",
        categoryId: "school-notifications",
        data: {
          type: "test",
          timestamp: new Date().toISOString(),
        },
      };

      const notificationId =
        await PushNotificationService.sendLocalNotification(testNotification);

      if (notificationId) {
        this.log(
          "Local notification sent successfully:",
          notificationId,
          "success",
        );
        this.results.localNotifications = { success: true, id: notificationId };
        return true;
      } else {
        this.log("Failed to send local notification", null, "error");
        this.results.localNotifications = { success: false };
        return false;
      }
    } catch (error) {
      this.log("Error testing local notifications:", error, "error");
      this.results.errors.push(error);
      this.results.localNotifications = { success: false, error };
      return false;
    }
  }

  /**
   * Test 5: Test backend token registration
   */
  async testBackendRegistration(authToken, userId) {
    this.log("Testing backend token registration...", null, "test");

    if (!authToken || !userId) {
      this.log(
        "Missing auth token or user ID - skipping backend test",
        null,
        "warning",
      );
      return false;
    }

    try {
      // Initialize with auth credentials
      await PushNotificationService.initialize(authToken, userId);

      const pushToken = PushNotificationService.getPushToken();
      if (!pushToken) {
        this.log(
          "No push token available for backend registration",
          null,
          "warning",
        );
        return false;
      }

      // Test backend registration
      const registrationSuccess =
        await PushNotificationService.registerTokenWithBackend(pushToken);
      this.results.backendRegistration = { success: registrationSuccess };

      if (registrationSuccess) {
        this.log("Backend registration successful!", null, "success");
        return true;
      } else {
        this.log("Backend registration failed", null, "error");
        return false;
      }
    } catch (error) {
      this.log("Error testing backend registration:", error, "error");
      this.results.errors.push(error);
      this.results.backendRegistration = { success: false, error };
      return false;
    }
  }

  /**
   * Test 6: Test school-specific notifications
   */
  async testSchoolNotifications() {
    this.log("Testing school-specific notifications...", null, "test");

    try {
      const testResults = [];

      // Test academic alert
      try {
        const academicId = await PushNotificationService.sendAcademicAlert(
          "📚 Academic Alert Test",
          "This is a test academic alert notification.",
          "student123",
        );
        testResults.push({ type: "academic", success: true, id: academicId });
        this.log("Academic alert sent successfully:", academicId, "success");
      } catch (error) {
        testResults.push({ type: "academic", success: false, error });
        this.log("Academic alert failed:", error, "error");
      }

      // Test payment reminder
      try {
        const paymentId = await PushNotificationService.sendPaymentReminder(
          "💰 Payment Reminder Test",
          "This is a test payment reminder notification.",
          150.0,
        );
        testResults.push({ type: "payment", success: true, id: paymentId });
        this.log("Payment reminder sent successfully:", paymentId, "success");
      } catch (error) {
        testResults.push({ type: "payment", success: false, error });
        this.log("Payment reminder failed:", error, "error");
      }

      // Test event notification
      try {
        const eventId = await PushNotificationService.sendEventNotification(
          "🎉 Event Notification Test",
          "This is a test event notification.",
          "event456",
        );
        testResults.push({ type: "event", success: true, id: eventId });
        this.log("Event notification sent successfully:", eventId, "success");
      } catch (error) {
        testResults.push({ type: "event", success: false, error });
        this.log("Event notification failed:", error, "error");
      }

      // Test general notification
      try {
        const generalId = await PushNotificationService.sendGeneralNotification(
          "📢 General Notification Test",
          "This is a test general notification.",
          { extraData: "test data" },
        );
        testResults.push({ type: "general", success: true, id: generalId });
        this.log(
          "General notification sent successfully:",
          generalId,
          "success",
        );
      } catch (error) {
        testResults.push({ type: "general", success: false, error });
        this.log("General notification failed:", error, "error");
      }

      return testResults;
    } catch (error) {
      this.log("Error testing school notifications:", error, "error");
      this.results.errors.push(error);
      return [];
    }
  }

  /**
   * Test 7: Test notification manager integration
   */
  async testNotificationManager(authToken, userId) {
    this.log("Testing notification manager integration...", null, "test");

    if (!authToken || !userId) {
      this.log(
        "Missing auth token or user ID - skipping manager test",
        null,
        "warning",
      );
      return false;
    }

    try {
      // Initialize notification manager
      const initialized = await NotificationManager.initialize(
        authToken,
        userId,
        {
          onNewNotification: (notification) => {
            this.log(
              "Manager received new notification:",
              notification,
              "info",
            );
          },
          onUnreadCountChange: (count) => {
            this.log("Manager unread count changed:", count, "info");
          },
          onConnectionStateChange: (connected) => {
            this.log("Manager connection state:", connected, "info");
          },
          onError: (error) => {
            this.log("Manager error:", error, "error");
          },
        },
      );

      if (initialized) {
        // Get status
        const status = NotificationManager.getStatus();
        this.log("Notification manager status:", status, "info");

        // Test getting notifications
        const notifications = NotificationManager.getNotifications();
        const unreadCount = NotificationManager.getUnreadCount();

        this.log(
          "Manager test results:",
          {
            notificationCount: notifications.length,
            unreadCount,
          },
          "success",
        );

        return true;
      } else {
        this.log("Notification manager initialization failed", null, "error");
        return false;
      }
    } catch (error) {
      this.log("Error testing notification manager:", error, "error");
      this.results.errors.push(error);
      return false;
    }
  }

  /**
   * Run all tests in sequence
   */
  async runAllTests(authToken = null, userId = null) {
    this.log(
      "Starting comprehensive notification system test...",
      null,
      "test",
    );
    this.log("==========================================", null, "info");

    const testResults = {
      deviceCapabilities: false,
      permissions: false,
      pushTokenRegistration: false,
      localNotifications: false,
      backendRegistration: false,
      schoolNotifications: [],
      notificationManager: false,
      overall: false,
    };

    try {
      // Test 1: Device capabilities
      testResults.deviceCapabilities = !!(await this.testDeviceCapabilities());

      // Test 2: Permissions
      testResults.permissions = await this.testPermissions();

      // Test 3: Push token (only on physical devices)
      if (Device.isDevice) {
        testResults.pushTokenRegistration =
          await this.testPushTokenRegistration();
      }

      // Test 4: Local notifications
      testResults.localNotifications = await this.testLocalNotifications();

      // Test 5: Backend registration (if auth provided)
      if (authToken && userId) {
        testResults.backendRegistration = await this.testBackendRegistration(
          authToken,
          userId,
        );
      }

      // Test 6: School notifications
      testResults.schoolNotifications = await this.testSchoolNotifications();

      // Test 7: Notification manager (if auth provided)
      if (authToken && userId) {
        testResults.notificationManager = await this.testNotificationManager(
          authToken,
          userId,
        );
      }

      // Calculate overall success
      const successCount = Object.values(testResults).filter(
        (result) =>
          result === true || (Array.isArray(result) && result.length > 0),
      ).length;
      testResults.overall = successCount > 0;

      this.log("==========================================", null, "info");
      this.log("Test Results Summary:", testResults, "info");
      this.log("==========================================", null, "info");

      if (testResults.overall) {
        this.log("Push notification system is working!", null, "success");
      } else {
        this.log("Push notification system has issues", null, "warning");
      }

      // Store results
      this.results = { ...this.results, ...testResults };

      return testResults;
    } catch (error) {
      this.log("Error running comprehensive tests:", error, "error");
      this.results.errors.push(error);
      return testResults;
    }
  }

  /**
   * Get test results
   */
  getResults() {
    return this.results;
  }

  /**
   * Show user-friendly test results
   */
  showResults() {
    const results = this.getResults();

    Alert.alert(
      "Notification Test Results",
      `
Device: ${Device.isDevice ? "✅ Physical Device" : "⚠️ Simulator"}
Permissions: ${results.permissions?.status === "granted" ? "✅ Granted" : "❌ Not Granted"}
Push Token: ${results.pushToken ? "✅ Available" : "❌ Not Available"}
Local Notifications: ${results.localNotifications?.success ? "✅ Working" : "❌ Failed"}
Backend Registration: ${results.backendRegistration?.success ? "✅ Success" : "❌ Failed"}

${results.errors.length > 0 ? `\n⚠️ Errors: ${results.errors.length}` : ""}
      `.trim(),
      [{ text: "OK" }],
    );
  }
}

// Create singleton instance
const notificationTester = new NotificationTester();

// Make testing functions available globally in development
if (__DEV__ && typeof window !== "undefined") {
  window.testNotifications = {
    runAll: (authToken, userId) =>
      notificationTester.runAllTests(authToken, userId),
    testPermissions: () => notificationTester.testPermissions(),
    testLocal: () => notificationTester.testLocalNotifications(),
    testSchool: () => notificationTester.testSchoolNotifications(),
    showResults: () => notificationTester.showResults(),
    getResults: () => notificationTester.getResults(),
    instance: notificationTester,
  };

  console.log(
    "🧪 Notification testing functions available at window.testNotifications",
  );
  console.log("Usage:");
  console.log(
    "  window.testNotifications.runAll(authToken, userId) - Run all tests",
  );
  console.log(
    "  window.testNotifications.testPermissions() - Test permissions only",
  );
  console.log(
    "  window.testNotifications.testLocal() - Test local notifications",
  );
  console.log("  window.testNotifications.showResults() - Show results dialog");
}

export default notificationTester;
