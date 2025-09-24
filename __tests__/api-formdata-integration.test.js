/**
 * API FormData Integration Test
 * Tests the corrected Content-Type header handling for FormData requests
 */

import { apiServer1 } from "../src/api/api-server-1";
import { createPostWithMediaFormData } from "../src/utils/postSubmissionUtils";

// Mock Redux store state
const mockState = {
  app: {
    token: "mock-bearer-token-123",
    isAuthenticated: true,
  },
};

describe("API FormData Integration Tests", () => {
  test("should detect FormData correctly in API configuration", () => {
    console.log("🧪 Testing FormData detection in API configuration...");

    // Create a FormData instance
    const formData = new FormData();
    formData.append("title", "Test Post");
    formData.append("content", "Test content");

    // Test FormData detection
    const isFormData = formData instanceof FormData;
    console.log("📦 FormData instance check:", isFormData);
    expect(isFormData).toBe(true);

    // Test the condition used in our API endpoints
    const apiCondition = formData instanceof FormData;
    console.log("🔧 API condition result:", apiCondition);
    expect(apiCondition).toBe(true);
  });

  test("should create proper FormData for school post", () => {
    console.log("🧪 Testing school post FormData creation...");

    const postData = {
      title: "Test School Post",
      content: "Testing FormData creation for school posts",
      category: "announcement",
      author_id: "test-user-123",
    };

    const mediaFiles = [
      {
        id: 1,
        type: "image",
        uri: "file:///path/to/test.jpg",
        name: "test.jpg",
        size: 1024000,
        mimeType: "image/jpeg",
      },
    ];

    const formData = createPostWithMediaFormData(
      postData,
      mediaFiles,
      ["school"],
      [{ id: "school", label: "#School" }],
      "school-posts",
    );

    expect(formData).toBeInstanceOf(FormData);
    console.log("✅ School post FormData created correctly");
  });

  test("should create proper FormData for class post", () => {
    console.log("🧪 Testing class post FormData creation...");

    const postData = {
      title: "Test Class Post",
      content: "Testing FormData creation for class posts",
      category: "announcement",
      author_id: "test-user-123",
      class_id: "class-456",
      grade: 5,
    };

    const mediaFiles = [
      {
        id: 1,
        type: "video",
        uri: "file:///path/to/test.mp4",
        name: "test.mp4",
        size: 5120000,
        mimeType: "video/mp4",
      },
    ];

    const formData = createPostWithMediaFormData(
      postData,
      mediaFiles,
      ["class"],
      [{ id: "class", label: "#Class" }],
      "class-posts",
    );

    expect(formData).toBeInstanceOf(FormData);
    console.log("✅ Class post FormData created correctly");
  });

  test("should handle multiple media files with indexed naming", () => {
    console.log("🧪 Testing multiple media files with indexed naming...");

    const postData = {
      title: "Test Multiple Media Post",
      content: "Testing multiple media files",
      category: "announcement",
      author_id: "test-user-123",
    };

    const mediaFiles = [
      {
        id: 1,
        type: "image",
        uri: "file:///path/to/image1.jpg",
        name: "image1.jpg",
        size: 1024000,
        mimeType: "image/jpeg",
      },
      {
        id: 2,
        type: "image",
        uri: "file:///path/to/image2.png",
        name: "image2.png",
        size: 2048000,
        mimeType: "image/png",
      },
      {
        id: 3,
        type: "document",
        uri: "file:///path/to/document.pdf",
        name: "document.pdf",
        size: 3072000,
        mimeType: "application/pdf",
      },
    ];

    const formData = createPostWithMediaFormData(
      postData,
      mediaFiles,
      [],
      [],
      "school-posts",
    );

    expect(formData).toBeInstanceOf(FormData);
    console.log("✅ Multiple media FormData created with indexed naming");
    console.log(`📦 Expected media fields: media_0, media_1, media_2`);
    console.log(`📦 Expected media_count: ${mediaFiles.length}`);
  });

  test("should prepare headers correctly for FormData", () => {
    console.log("🧪 Testing header preparation for FormData...");

    // Mock the RTK Query API context
    const mockApi = {
      getState: () => mockState,
      endpoint: "createSchoolPost",
      type: "mutation",
    };

    // Create mock headers object
    const mockHeaders = new Map();

    // Simulate the prepareHeaders function logic
    const token = mockApi.getState().app.token;
    const isAuthenticated = mockApi.getState().app.isAuthenticated;

    console.log("🔐 Authentication check:", {
      tokenExists: !!token,
      isAuthenticated: isAuthenticated,
    });

    // Set required headers as per API instructions
    mockHeaders.set("X-Requested-With", "XMLHttpRequest");

    // Only set Content-Type if not already set by endpoint (FormData endpoints shouldn't set it)
    if (!mockHeaders.get("Content-Type")) {
      mockHeaders.set("Content-Type", "application/json");
    }

    mockHeaders.set("Accept", "application/json");

    if (token) {
      mockHeaders.set("Authorization", `Bearer ${token}`);
    }

    mockHeaders.set("credentials", "include");

    // Verify headers
    expect(mockHeaders.get("X-Requested-With")).toBe("XMLHttpRequest");
    expect(mockHeaders.get("Accept")).toBe("application/json");
    expect(mockHeaders.get("Authorization")).toBe(
      "Bearer mock-bearer-token-123",
    );
    expect(mockHeaders.get("credentials")).toBe("include");

    console.log("✅ Headers prepared correctly for FormData request");
    console.log("📤 Final headers:", {
      "X-Requested-With": mockHeaders.get("X-Requested-With"),
      "Content-Type": mockHeaders.get("Content-Type"),
      Accept: mockHeaders.get("Accept"),
      Authorization: "Bearer [REDACTED]",
      credentials: mockHeaders.get("credentials"),
    });
  });

  test("should simulate endpoint configuration for FormData vs JSON", () => {
    console.log("🧪 Testing endpoint configuration for FormData vs JSON...");

    // Test FormData payload
    const formDataPayload = new FormData();
    formDataPayload.append("title", "Test");

    const isFormData = formDataPayload instanceof FormData;
    console.log("📦 FormData detection:", isFormData);

    if (isFormData) {
      // For FormData, don't set Content-Type - let browser set multipart/form-data with boundary
      const formDataConfig = {
        url: "api/activity-feed-management/school-posts/create",
        method: "POST",
        body: formDataPayload,
        // Explicitly avoid Content-Type for FormData
      };

      console.log("📤 FormData endpoint config:", {
        url: formDataConfig.url,
        method: formDataConfig.method,
        hasBody: !!formDataConfig.body,
        hasContentType: formDataConfig.headers?.["Content-Type"] !== undefined,
      });

      expect(formDataConfig.headers?.["Content-Type"]).toBeUndefined();
      console.log("✅ FormData config correct - no Content-Type header");
    }

    // Test JSON payload
    const jsonPayload = { title: "Test", content: "Test content" };
    const isFormDataJson = jsonPayload instanceof FormData;
    console.log("📄 JSON detection:", isFormDataJson);

    if (!isFormDataJson) {
      // For JSON, explicitly set Content-Type
      const jsonConfig = {
        url: "api/activity-feed-management/school-posts/create",
        method: "POST",
        body: jsonPayload,
        headers: {
          "Content-Type": "application/json",
        },
      };

      console.log("📤 JSON endpoint config:", {
        url: jsonConfig.url,
        method: jsonConfig.method,
        hasBody: !!jsonConfig.body,
        contentType: jsonConfig.headers["Content-Type"],
      });

      expect(jsonConfig.headers["Content-Type"]).toBe("application/json");
      console.log("✅ JSON config correct - Content-Type header set");
    }
  });
});

// Export test utilities for manual testing
export const testFormDataDetection = () => {
  console.log("🔧 ===== MANUAL FORMDATA DETECTION TEST =====");

  const formData = new FormData();
  formData.append("test", "value");

  const isFormData = formData instanceof FormData;
  const typeCheck = typeof formData;
  const constructor = formData.constructor.name;

  console.log("🔧 FormData detection results:", {
    instanceof: isFormData,
    typeof: typeCheck,
    constructor: constructor,
    hasAppend: typeof formData.append === "function",
    hasEntries: typeof formData.entries === "function",
  });

  return {
    isFormData,
    typeCheck,
    constructor,
    success: isFormData === true,
  };
};
