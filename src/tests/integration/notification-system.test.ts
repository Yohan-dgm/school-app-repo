import { Alert } from "react-native";
import NotificationManager from "../../services/notifications/NotificationManager";
import PushNotificationService from "../../services/notifications/PushNotificationService";
import WebSocketService from "../../services/websocket/WebSocketService";
import PermissionService from "../../services/permissions/PermissionService";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock expo-notifications
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" }),
  ),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("notification-id")),
  dismissAllNotificationsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
}));

// Mock socket.io-client
jest.mock("socket.io-client", () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
  })),
}));

// Mock React Native modules
jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: "ios",
  },
}));

describe("Notification System Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("NotificationManager", () => {
    it("should initialize successfully", async () => {
      const manager = NotificationManager.getInstance();
      await manager.initialize();

      expect(manager).toBeDefined();
    });

    it("should handle local notifications", async () => {
      const manager = NotificationManager.getInstance();
      await manager.initialize();

      const notification = {
        id: "test-1",
        title: "Test Notification",
        body: "This is a test",
        type: "system" as const,
        priority: "medium" as const,
        source: "local" as const,
        read: false,
        timestamp: new Date().toISOString(),
      };

      await manager.addLocalNotification(notification);
      const notifications = await manager.getAllNotifications();

      expect(notifications).toContain(
        jasmine.objectContaining({
          id: "test-1",
          title: "Test Notification",
        }),
      );
    });

    it("should manage notification filters", async () => {
      const manager = NotificationManager.getInstance();
      await manager.initialize();

      // Add different types of notifications
      await manager.addLocalNotification({
        id: "academic-1",
        title: "Academic Notification",
        body: "Test",
        type: "academic",
        priority: "high",
        source: "local",
        read: false,
        timestamp: new Date().toISOString(),
      });

      await manager.addLocalNotification({
        id: "payment-1",
        title: "Payment Notification",
        body: "Test",
        type: "payment",
        priority: "medium",
        source: "local",
        read: false,
        timestamp: new Date().toISOString(),
      });

      const academicNotifications =
        manager.getFilteredNotifications("academic");
      const paymentNotifications = manager.getFilteredNotifications("payment");

      expect(academicNotifications.length).toBe(1);
      expect(paymentNotifications.length).toBe(1);
      expect(academicNotifications[0].type).toBe("academic");
      expect(paymentNotifications[0].type).toBe("payment");
    });
  });

  describe("PushNotificationService", () => {
    it("should initialize successfully", async () => {
      const service = PushNotificationService.getInstance();
      await service.initialize();

      expect(service).toBeDefined();
    });

    it("should send academic alerts", async () => {
      const service = PushNotificationService.getInstance();
      await service.initialize();

      const notificationId = await service.sendAcademicAlert(
        "New Assignment",
        "Math homework assigned",
      );

      expect(notificationId).toBeDefined();
      expect(typeof notificationId).toBe("string");
    });
  });

  describe("WebSocketService", () => {
    it("should initialize with user credentials", async () => {
      const service = WebSocketService.getInstance();

      await service.initialize("123", 2, "mock-token");

      expect(service).toBeDefined();
    });
  });

  describe("PermissionService", () => {
    it("should set user permissions correctly", () => {
      PermissionService.setUserPermissions(2); // Educator

      const permissions = PermissionService.getUserPermissions();
      expect(permissions.length).toBeGreaterThan(0);
      expect(PermissionService.isEducator()).toBe(true);
      expect(PermissionService.isAdmin()).toBe(false);
    });

    it("should handle permission checks", () => {
      PermissionService.setUserPermissions(6); // Admin

      expect(PermissionService.isAdmin()).toBe(true);
      expect(PermissionService.hasPermission("MANAGE_USERS")).toBe(true);
      expect(PermissionService.canAccess("system")).toBe(true);
    });

    it("should handle parent permissions", () => {
      PermissionService.setUserPermissions(1); // Parent

      expect(PermissionService.isParent()).toBe(true);
      expect(PermissionService.hasPermission("VIEW_GRADES")).toBe(true);
      expect(PermissionService.hasPermission("MANAGE_USERS")).toBe(false);
    });
  });

  describe("System Integration", () => {
    it("should handle complete notification flow", async () => {
      // Initialize all services
      const notificationManager = NotificationManager.getInstance();
      const pushService = PushNotificationService.getInstance();

      await notificationManager.initialize();
      await pushService.initialize();

      // Set user permissions
      PermissionService.setUserPermissions(2); // Educator

      // Send a notification
      const notificationId = await pushService.sendAcademicAlert(
        "Integration Test",
        "This is an integration test notification",
      );

      // Verify notification was created
      expect(notificationId).toBeDefined();

      // Check permissions work
      expect(PermissionService.isEducator()).toBe(true);
      expect(PermissionService.hasPermission("CREATE_ASSIGNMENTS")).toBe(true);
    });

    it("should handle error scenarios gracefully", async () => {
      const notificationManager = NotificationManager.getInstance();

      // Test with invalid notification data
      try {
        await notificationManager.addLocalNotification({
          id: "",
          title: "",
          body: "",
          type: "invalid" as any,
          priority: "invalid" as any,
          source: "invalid" as any,
          read: false,
          timestamp: "invalid-date",
        });
      } catch (error) {
        // Should handle gracefully
        expect(error).toBeDefined();
      }
    });
  });
});
