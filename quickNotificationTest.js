/**
 * Quick Push Notification Test Script
 *
 * Run this script to test push notifications immediately.
 * This script can be executed in the browser console or imported into your app.
 */

// Test notification registration and basic functionality
async function quickNotificationTest() {
  console.log("🧪 Starting Quick Push Notification Test...");
  console.log("==============================================");

  try {
    // Import required modules (this works in the app context)
    const { default: PushNotificationService } = await import(
      "./src/services/notifications/PushNotificationService"
    );
    const { default: NotificationManager } = await import(
      "./src/services/notifications/NotificationManager"
    );
    const { default: notificationTester } = await import(
      "./src/utils/notificationTester"
    );

    // Test 1: Basic Service Status
    console.log("📊 1. Checking service status...");
    const serviceStatus = PushNotificationService.getServiceStatus();
    console.log("Service Status:", serviceStatus);

    // Test 2: Test Permissions
    console.log("🔐 2. Testing permissions...");
    const hasPermissions = await notificationTester.testPermissions();
    console.log(
      "Permissions Result:",
      hasPermissions ? "✅ Granted" : "❌ Denied",
    );

    // Test 3: Test Local Notification
    console.log("📱 3. Testing local notification...");
    try {
      const notificationId =
        await PushNotificationService.sendLocalNotification({
          id: `test-${Date.now()}`,
          title: "🧪 Quick Test Notification",
          body: "This is a quick test of the push notification system!",
          priority: "high",
          data: {
            type: "test",
            timestamp: new Date().toISOString(),
          },
        });
      console.log("✅ Local notification sent successfully:", notificationId);
    } catch (error) {
      console.error("❌ Local notification failed:", error);
    }

    // Test 4: Test School-Specific Notifications
    console.log("🏫 4. Testing school notifications...");
    try {
      const academicId = await PushNotificationService.sendAcademicAlert(
        "📚 Quick Academic Test",
        "Testing academic notification functionality",
      );
      console.log("✅ Academic notification sent:", academicId);

      const eventId = await PushNotificationService.sendEventNotification(
        "🎉 Quick Event Test",
        "Testing event notification functionality",
      );
      console.log("✅ Event notification sent:", eventId);
    } catch (error) {
      console.error("❌ School notifications failed:", error);
    }

    console.log("==============================================");
    console.log(
      "🎉 Quick test completed! Check your device for notifications.",
    );
    console.log(
      "💡 For comprehensive testing, use: window.testNotifications.runAll()",
    );

    return {
      success: true,
      serviceStatus,
      hasPermissions,
    };
  } catch (error) {
    console.error("❌ Quick test failed:", error);
    console.log(
      "💡 Make sure you're running this in the app context with the development server running.",
    );
    return {
      success: false,
      error,
    };
  }
}

// Test function for immediate execution
function testNotificationPermissions() {
  console.log("🔐 Testing notification permissions...");

  if (typeof window !== "undefined" && window.Notification) {
    // Web environment
    if (Notification.permission === "granted") {
      console.log("✅ Web notifications already granted");
      return true;
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        console.log("Web notification permission:", permission);
      });
    }
  } else {
    console.log(
      "ℹ️  Not in web environment - use the mobile app for push notification testing",
    );
  }
}

// Simple test notification function
function sendTestNotification() {
  console.log("📨 Attempting to send test notification...");

  try {
    if (
      typeof window !== "undefined" &&
      window.Notification &&
      Notification.permission === "granted"
    ) {
      new Notification("🧪 Push Notification Test", {
        body: "This is a test notification from your school app!",
        icon: "/icon.png",
        badge: "/badge.png",
      });
      console.log("✅ Web notification sent successfully");
    } else {
      console.log("⚠️  Web notifications not available or not permitted");
    }
  } catch (error) {
    console.error("❌ Failed to send web notification:", error);
  }
}

// Make functions available globally for console testing
if (typeof window !== "undefined") {
  window.quickNotificationTest = quickNotificationTest;
  window.testNotificationPermissions = testNotificationPermissions;
  window.sendTestNotification = sendTestNotification;

  console.log("🧪 Quick notification test functions loaded:");
  console.log("  quickNotificationTest() - Run quick comprehensive test");
  console.log("  testNotificationPermissions() - Test permissions only");
  console.log("  sendTestNotification() - Send simple web notification");
}

// Auto-run permission test on load
if (typeof window !== "undefined") {
  testNotificationPermissions();
}

export {
  quickNotificationTest,
  testNotificationPermissions,
  sendTestNotification,
};
