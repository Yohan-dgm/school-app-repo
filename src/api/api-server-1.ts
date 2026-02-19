import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
export const apiServer1 = createApi({
  reducerPath: "apiServer1",
  tagTypes: [
    "Students",
    "Teachers",
    "Posts",
    "ActivityFeed",
    "Calendar",
    "MonthData",
    "UserManagement",
    "EducatorFeedback",
    "Attendance",
    "StudentAttendance",
    "StudentAttendanceAggregated",
    "StudentAttendanceById",
    "StudentAttendanceByDateAndClass",
    "StudentAttendanceStats",
    "Auth",
    "News",
    "NewsCategories",
    "Notifications",
    "Messages",
    "NotificationPreferences",
    "NotificationTypes",
    "NotificationStats",
    "Announcements",
    "AnnouncementCategories",
    "StudentGrowth",
    "Payment",
    "StudentDetail",
    "StudentAchievement",
    "StudentAttachment",
    "GradeLevels",
    "AcademicStaff",
    "ClassTeachers",
    "SectionalHeads",
    "StudentList",
    "ChatThreads",
    "ChatMessages",
    "ChatMembers",
  ],
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
    timeout: 60000, // 60 seconds timeout for file uploads
    credentials: "include", // CRITICAL: Move here from prepareHeaders
    prepareHeaders: (headers, api: any) => {
      const token = api.getState().app.token;
      const isAuthenticated = api.getState().app.isAuthenticated;

      console.log("🔐 API Server 1 - Authentication check:", {
        tokenExists: !!token,
        tokenLength: token ? token.length : 0,
        tokenPreview: token ? `${token.substring(0, 15)}...` : "No token",
        isAuthenticated: isAuthenticated,
        endpoint: api.endpoint,
        method: api.type,
      });

      // CRITICAL: Check if this is a FormData request
      // FormData requests need the Content-Type to be auto-set by fetch with boundary
      const isFormDataRequest =
        api.endpoint === "uploadMedia" ||
        api.endpoint === "pushUploadChunk" ||
        (api.arg instanceof FormData) ||
        headers.get("Content-Type") === "multipart/form-data";

      console.log("📋 Request Type Analysis:", {
        endpoint: api.endpoint,
        isFormDataRequest: isFormDataRequest,
        existingContentType: headers.get("Content-Type"),
        arg: api.arg,
      });

      // Set required headers as per API instructions
      headers.set("X-Requested-With", "XMLHttpRequest");

      // CRITICAL FIX for Android FormData uploads:
      // For FormData requests, DELETE the Content-Type header entirely
      // React Native's fetch will automatically set multipart/form-data with proper boundary
      if (isFormDataRequest) {
        // Delete Content-Type to let fetch set it automatically
        headers.delete("Content-Type");
        console.log("🔧 FormData request detected - Content-Type header removed to allow auto-generation");
        console.log("📎 This fixes 'Network request failed' error on Android");
      } else {
        // For non-FormData requests, use application/json
        if (!headers.get("Content-Type")) {
          headers.set("Content-Type", "application/json");
          console.log("📝 JSON request - Content-Type set to application/json");
        }
      }

      headers.set("Accept", "application/json");

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
        console.log("✅ API Server 1 - Authorization header set successfully");
      } else {
        console.warn(
          "⚠️ API Server 1 - No authentication token found, request may fail",
        );
      }

      console.log("📤 API Server 1 - Final headers:", {
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": headers.get("Content-Type") || "AUTO (for FormData)",
        Accept: "application/json",
        Authorization: token ? "Bearer [REDACTED]" : "None",
        endpoint: api.endpoint,
        method: api.type,
        isFormDataRequest: isFormDataRequest,
      });

      return headers;
    },

    // prepareHeaders: async (headers) => {
    //   // const user = await AsyncStorageService.getStoredData();
    //   // const hasUser = !!user && !!user!.userToken;

    //   // if (hasUser) {
    //   //   headers.set("Authorization", `Token ${user.userToken}`);
    //   // }

    //   // headers.set("Content-Type", "application/json");

    //   // return headers;
    // },
  }),
  endpoints: () => ({}),
});
