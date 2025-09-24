import { apiServer1 } from "./api-server-1";
import {
  BaseNotification,
  MessageThread,
  NotificationPreferences,
  NotificationStats,
  CreateNotificationRequest,
  NotificationFilters,
  PaginatedNotifications,
  PaginatedMessageThreads,
} from "../types/notifications";

// Enhanced logging utility for API calls (like educator-feedback-api.ts)
const apiLogger = {
  request: (endpoint: string, method: string, params?: any) => {
    console.log(`📤 [NotificationAPI] Request - ${method} ${endpoint}`, {
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      params,
      baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
    });
  },
  response: (
    endpoint: string,
    method: string,
    data: any,
    duration?: number,
  ) => {
    console.log(`📥 [NotificationAPI] Response - ${method} ${endpoint}`, {
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      responseType: typeof data,
      hasData: !!data,
      duration: duration ? `${duration}ms` : "unknown",
      preview: data
        ? {
            success: data.success,
            message: data.message,
            dataKeys: data.data ? Object.keys(data.data).slice(0, 5) : [],
          }
        : null,
      fullResponse: data,
    });
  },
  error: (endpoint: string, method: string, error: any) => {
    console.error(`❌ [NotificationAPI] Error - ${method} ${endpoint}`, {
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status: error?.status,
      statusText: error?.statusText,
      errorData: error?.data,
      errorMessage: error?.message,
      fullError: error,
    });
  },
};

export const notificationsApi = apiServer1.injectEndpoints({
  endpoints: (builder) => ({
    // POST /api/communication-management/notifications/list
    getNotifications: builder.query<
      PaginatedNotifications,
      {
        page?: number;
        limit?: number;
        filters?: NotificationFilters;
      }
    >({
      query: ({ page = 1, limit = 20, filters = {} }) => {
        const requestBody = {
          page,
          per_page: limit,
          search: filters.search || "",
          filter: filters.status || "all",
          priority: filters.priority || "",
          type_id: filters.type_id || null,
          unread_only: filters.unread_only || false,
        };

        const endpoint = "api/communication-management/notifications/list";
        const method = "POST";
        apiLogger.request(endpoint, method, requestBody);

        return {
          url: endpoint,
          method: method,
          body: requestBody,
        };
      },
      providesTags: ["Notifications"],
      transformResponse: (response: any) => {
        const endpoint = "api/communication-management/notifications/list";
        const method = "POST";
        apiLogger.response(endpoint, method, response);

        // Handle backend response format
        if (response?.success && response?.data) {
          return {
            data: response.data.notifications || [],
            metadata: response.data.pagination || {
              current_page: response.data.current_page || 1,
              total: response.data.total || 0,
              per_page: response.data.per_page || 20,
              last_page: response.data.last_page || 1,
              from: response.data.from || 0,
              to: response.data.to || 0,
            },
            unread_count: response.data.unread_count || 0,
          };
        }

        // Handle validation errors gracefully - don't throw error for client consumption
        if (response?.success === false && response?.errors) {
          console.error("❌ Notification API validation errors:", {
            errors: response.errors,
            message: response.message,
            endpoint,
            method,
          });
          // Return empty data instead of throwing to prevent UI crashes
          return {
            data: [],
            metadata: {
              current_page: 1,
              total: 0,
              per_page: 20,
              last_page: 1,
              from: 0,
              to: 0,
            },
            unread_count: 0,
            error: response.message || "Validation failed",
          };
        }

        // Handle server errors gracefully - don't throw error for client consumption
        if (response?.success === false && response?.message) {
          console.error("❌ Notification API server error:", {
            message: response.message,
            endpoint,
            method,
          });
          // Return empty data instead of throwing to prevent UI crashes
          return {
            data: [],
            metadata: {
              current_page: 1,
              total: 0,
              per_page: 20,
              last_page: 1,
              from: 0,
              to: 0,
            },
            unread_count: 0,
            error: response.message,
          };
        }

        // Handle unexpected response
        console.error("❌ Unexpected notifications response format:", response);
        return {
          data: [],
          metadata: {
            current_page: 1,
            total: 0,
            per_page: 20,
            last_page: 1,
            from: 0,
            to: 0,
          },
          unread_count: 0,
          error: "Unexpected response format",
        };
      },
    }),

    // POST /api/communication-management/notifications/stats
    getNotificationStatsNew: builder.query<
      NotificationStats,
      { filters?: any }
    >({
      query: ({ filters = {} }) => {
        const requestBody = {
          date_range: filters.date_range || "all",
          priority_filter: filters.priority_filter || [],
          type_filter: filters.type_filter || [],
          include_read:
            filters.include_read !== undefined ? filters.include_read : true,
          include_archived:
            filters.include_archived !== undefined
              ? filters.include_archived
              : false,
        };

        const endpoint = "api/communication-management/notifications/stats";
        const method = "POST";
        apiLogger.request(endpoint, method, requestBody);

        return {
          url: endpoint,
          method: method,
          body: requestBody,
        };
      },
      providesTags: ["Notifications"],
      transformResponse: (response: any) => {
        const endpoint = "api/communication-management/notifications/stats";
        const method = "POST";
        apiLogger.response(endpoint, method, response);

        // Handle backend response format
        if (response?.success && response?.data) {
          return {
            total_notifications: response.data.total_notifications || 0,
            unread_count: response.data.unread_count || 0,
            unread_by_priority: response.data.unread_by_priority || {
              normal: 0,
              high: 0,
              urgent: 0,
            },
            recent_activity: response.data.recent_activity || {
              today: 0,
              this_week: 0,
              this_month: 0,
            },
            by_type: response.data.by_type || {},
            priority_breakdown: response.data.priority_breakdown || {
              normal: 0,
              high: 0,
              urgent: 0,
            },
            last_notification_at: response.data.last_notification_at || null,
            generated_at:
              response.data.generated_at || new Date().toISOString(),
          };
        }

        // Handle validation errors
        if (response?.success === false && response?.errors) {
          console.error("❌ Stats API validation errors:", {
            errors: response.errors,
            message: response.message,
            endpoint,
            method,
          });
          throw new Error(
            `Stats validation failed: ${response.message || "Check required parameters"}`,
          );
        }

        // Handle server errors
        if (response?.success === false && response?.message) {
          console.error("❌ Stats API server error:", {
            message: response.message,
            endpoint,
            method,
          });
          throw new Error(`Stats server error: ${response.message}`);
        }

        // Handle unexpected response
        console.error("❌ Unexpected stats response format:", response);
        return {
          total_notifications: 0,
          unread_count: 0,
          unread_by_priority: { normal: 0, high: 0, urgent: 0 },
          recent_activity: { today: 0, this_week: 0, this_month: 0 },
          by_type: {},
          priority_breakdown: { normal: 0, high: 0, urgent: 0 },
          last_notification_at: null,
          generated_at: new Date().toISOString(),
        };
      },
    }),

    getMessageThreads: builder.query<
      PaginatedMessageThreads,
      {
        page?: number;
        limit?: number;
      }
    >({
      query: ({ page = 1, limit = 20 }) => {
        const requestBody = {
          page,
          per_page: limit,
          search: "",
        };

        const endpoint = "api/communication-management/messages/threads";
        const method = "POST";
        apiLogger.request(endpoint, method, requestBody);

        return {
          url: endpoint,
          method: method,
          body: requestBody,
        };
      },
      providesTags: ["Messages"],
      transformResponse: (response: any) => {
        const endpoint = "api/communication-management/messages/threads";
        const method = "POST";
        apiLogger.response(endpoint, method, response);

        // Handle backend response format
        if (response?.success && response?.data) {
          return {
            data: response.data.threads || response.data || [],
            metadata: response.data.pagination || {
              current_page: response.data.current_page || 1,
              total: response.data.total || 0,
              per_page: response.data.per_page || 20,
              last_page: response.data.last_page || 1,
              from: response.data.from || 0,
              to: response.data.to || 0,
            },
          };
        }

        // Handle unexpected response
        console.error(
          "❌ Unexpected message threads response format:",
          response,
        );
        return {
          data: [],
          metadata: {
            current_page: 1,
            total: 0,
            per_page: 20,
            last_page: 1,
            from: 0,
            to: 0,
          },
        };
      },
    }),

    // POST /api/communication-management/notifications/mark-read
    markNotificationAsRead: builder.mutation<void, { notificationId: string }>({
      query: ({ notificationId }) => {
        const requestBody = {
          notification_id: parseInt(notificationId),
        };

        const endpoint = "api/communication-management/notifications/mark-read";
        const method = "POST";
        apiLogger.request(endpoint, method, requestBody);

        return {
          url: endpoint,
          method: method,
          body: requestBody,
        };
      },
      invalidatesTags: ["Notifications"],
      transformResponse: (response: any) => {
        const endpoint = "api/communication-management/notifications/mark-read";
        const method = "POST";
        apiLogger.response(endpoint, method, response);
        return response;
      },
    }),

    // POST /api/communication-management/notifications/mark-read (with mark_all: true)
    markAllNotificationsAsRead: builder.mutation<void, void>({
      query: () => {
        const requestBody = {
          mark_all: true,
        };

        const endpoint = "api/communication-management/notifications/mark-read";
        const method = "POST";
        apiLogger.request(endpoint, method, requestBody);

        return {
          url: endpoint,
          method: method,
          body: requestBody,
        };
      },
      invalidatesTags: ["Notifications"],
      transformResponse: (response: any) => {
        const endpoint = "api/communication-management/notifications/mark-read";
        const method = "POST";
        apiLogger.response(endpoint, method, response);
        return response;
      },
    }),

    // POST /api/communication-management/notifications/delete
    deleteNotification: builder.mutation<void, { notificationId: string }>({
      query: ({ notificationId }) => {
        const requestBody = {
          notification_id: parseInt(notificationId),
        };

        const endpoint = "api/communication-management/notifications/delete";
        const method = "POST";
        apiLogger.request(endpoint, method, requestBody);

        return {
          url: endpoint,
          method: method,
          body: requestBody,
        };
      },
      invalidatesTags: ["Notifications"],
      transformResponse: (response: any) => {
        const endpoint = "api/communication-management/notifications/delete";
        const method = "POST";
        apiLogger.response(endpoint, method, response);
        return response;
      },
    }),

    createNotification: builder.mutation<
      BaseNotification,
      CreateNotificationRequest & { senderId: string }
    >({
      query: (notification) => {
        const requestBody = {
          notification_type_id: 1,
          title: notification.title,
          message: notification.message,
          priority: notification.priority || "normal",
          target_type: notification.target_type || "broadcast",
          sender_id: notification.senderId,
          action_url: notification.action_url,
          action_text: notification.action_text,
          image_url: notification.image_url,
        };

        const endpoint = "api/communication-management/notifications/create";
        const method = "POST";
        apiLogger.request(endpoint, method, requestBody);

        return {
          url: endpoint,
          method: method,
          body: requestBody,
        };
      },
      invalidatesTags: ["Notifications"],
      transformResponse: (response: any) => {
        const endpoint = "api/communication-management/notifications/create";
        const method = "POST";
        apiLogger.response(endpoint, method, response);
        return response?.data || response;
      },
    }),

    getNotificationPreferences: builder.query<NotificationPreferences, void>({
      query: () => {
        const requestBody = {};

        const endpoint =
          "api/communication-management/notifications/preferences";
        const method = "POST";
        apiLogger.request(endpoint, method, requestBody);

        return {
          url: endpoint,
          method: method,
          body: requestBody,
        };
      },
      providesTags: ["NotificationPreferences"],
      transformResponse: (response: any) => {
        const endpoint =
          "api/communication-management/notifications/preferences";
        const method = "POST";
        apiLogger.response(endpoint, method, response);

        // Handle backend response format
        if (response?.success && response?.data) {
          return response.data;
        }

        // Handle unexpected response
        console.error("❌ Unexpected preferences response format:", response);
        return {
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
          in_app_notifications: true,
        };
      },
    }),

    updateNotificationPreferences: builder.mutation<
      NotificationPreferences,
      { preferences: Partial<NotificationPreferences> }
    >({
      query: ({ preferences }) => {
        const requestBody = {
          ...preferences,
        };

        const endpoint =
          "api/communication-management/notifications/preferences/update";
        const method = "POST";
        apiLogger.request(endpoint, method, requestBody);

        return {
          url: endpoint,
          method: method,
          body: requestBody,
        };
      },
      invalidatesTags: ["NotificationPreferences"],
      transformResponse: (response: any) => {
        const endpoint =
          "api/communication-management/notifications/preferences/update";
        const method = "POST";
        apiLogger.response(endpoint, method, response);
        return response?.data || response;
      },
    }),

    sendMessage: builder.mutation<
      void,
      {
        senderId: string;
        recipientId: string;
        message: string;
        threadId?: string;
      }
    >({
      query: (messageData) => {
        const requestBody = {
          sender_id: messageData.senderId,
          recipient_id: messageData.recipientId,
          message: messageData.message,
          thread_id: messageData.threadId,
        };

        const endpoint = "api/communication-management/messages/send";
        const method = "POST";
        apiLogger.request(endpoint, method, requestBody);

        return {
          url: endpoint,
          method: method,
          body: requestBody,
        };
      },
      invalidatesTags: ["Messages", "Notifications"],
      transformResponse: (response: any) => {
        const endpoint = "api/communication-management/messages/send";
        const method = "POST";
        apiLogger.response(endpoint, method, response);
        return response;
      },
    }),

    getThreadMessages: builder.query<
      {
        messages: {
          id: string;
          senderId: string;
          message: string;
          timestamp: string;
          isRead: boolean;
        }[];
        threadInfo: MessageThread;
      },
      { threadId: string; page?: number; limit?: number }
    >({
      query: ({ threadId, page = 1, limit = 50 }) => {
        const requestBody = {
          thread_id: threadId,
          page,
          per_page: limit,
        };

        const endpoint =
          "api/communication-management/messages/thread-messages";
        const method = "POST";
        apiLogger.request(endpoint, method, requestBody);

        return {
          url: endpoint,
          method: method,
          body: requestBody,
        };
      },
      providesTags: ["Messages"],
      transformResponse: (response: any) => {
        const endpoint =
          "api/communication-management/messages/thread-messages";
        const method = "POST";
        apiLogger.response(endpoint, method, response);

        // Handle backend response format
        if (response?.success && response?.data) {
          return {
            messages: response.data.messages || response.data.data || [],
            threadInfo:
              response.data.thread_info || response.data.threadInfo || {},
          };
        }

        // Handle unexpected response
        console.error(
          "❌ Unexpected thread messages response format:",
          response,
        );
        return { messages: [], threadInfo: {} };
      },
    }),

    markMessagesAsRead: builder.mutation<void, { threadId: string }>({
      query: ({ threadId }) => {
        const requestBody = {
          thread_id: threadId,
        };

        const endpoint = "api/communication-management/messages/mark-read";
        const method = "POST";
        apiLogger.request(endpoint, method, requestBody);

        return {
          url: endpoint,
          method: method,
          body: requestBody,
        };
      },
      invalidatesTags: ["Messages", "Notifications"],
      transformResponse: (response: any) => {
        const endpoint = "api/communication-management/messages/mark-read";
        const method = "POST";
        apiLogger.response(endpoint, method, response);
        return response;
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNotificationsQuery,
  useGetNotificationStatsNewQuery,
  useGetMessageThreadsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useCreateNotificationMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
  useSendMessageMutation,
  useGetThreadMessagesQuery,
  useMarkMessagesAsReadMutation,
} = notificationsApi;

// Export the correct stats query with the expected name for backward compatibility
export const useGetNotificationStatsQuery = useGetNotificationStatsNewQuery;
