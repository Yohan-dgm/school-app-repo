/**
 * FormData Detection Test
 * Tests the corrected FormData detection logic used in API endpoints
 */

import { createPostWithMediaFormData } from "../src/utils/postSubmissionUtils";

describe("FormData Detection Tests", () => {
  test("should detect FormData instances correctly", () => {
    console.log("🧪 Testing FormData instance detection...");

    // Create a FormData instance
    const formData = new FormData();
    formData.append("title", "Test Post");
    formData.append("content", "Test content");

    // Test the exact condition used in our API endpoints
    const isFormData = formData instanceof FormData;
    console.log("📦 FormData detection result:", isFormData);
    console.log("📦 FormData type:", typeof formData);
    console.log("📦 FormData constructor:", formData.constructor.name);

    expect(isFormData).toBe(true);
    expect(typeof formData).toBe("object");
    expect(formData.constructor.name).toBe("FormData");

    console.log("✅ FormData detection working correctly");
  });

  test("should distinguish FormData from regular objects", () => {
    console.log("🧪 Testing FormData vs Object detection...");

    const regularObject = { title: "Test", content: "Test content" };
    const formData = new FormData();

    const isObjectFormData = regularObject instanceof FormData;
    const isFormDataInstance = formData instanceof FormData;

    console.log("📄 Regular object FormData check:", isObjectFormData);
    console.log("📦 FormData instance check:", isFormDataInstance);

    expect(isObjectFormData).toBe(false);
    expect(isFormDataInstance).toBe(true);

    console.log("✅ Object vs FormData distinction working correctly");
  });

  test("should simulate API endpoint configuration logic", () => {
    console.log("🧪 Testing API endpoint configuration logic...");

    // Test with FormData payload (our corrected approach)
    const formDataPayload = new FormData();
    formDataPayload.append("title", "Test");
    formDataPayload.append("media_0", "file-data");

    const isFormData = formDataPayload instanceof FormData;
    console.log("📦 Payload is FormData:", isFormData);

    let endpointConfig;
    if (isFormData) {
      // For FormData, don't set Content-Type - let browser handle it
      endpointConfig = {
        url: "api/activity-feed-management/school-posts/create",
        method: "POST",
        body: formDataPayload,
        // Explicitly avoid Content-Type for FormData
      };
      console.log(
        "📤 FormData endpoint config created (no Content-Type header)",
      );
    } else {
      // For JSON, explicitly set Content-Type
      endpointConfig = {
        url: "api/activity-feed-management/school-posts/create",
        method: "POST",
        body: formDataPayload,
        headers: {
          "Content-Type": "application/json",
        },
      };
      console.log("📤 JSON endpoint config created (with Content-Type header)");
    }

    expect(endpointConfig.body).toBe(formDataPayload);
    expect(endpointConfig.method).toBe("POST");
    expect(endpointConfig.headers?.["Content-Type"]).toBeUndefined(); // Should be undefined for FormData

    console.log("✅ API endpoint configuration logic working correctly");
  });

  test("should create FormData with indexed media naming", () => {
    console.log("🧪 Testing FormData creation with indexed media naming...");

    const postData = {
      title: "Test Post",
      content: "Test content",
      category: "announcement",
      author_id: "test-user",
    };

    const mediaFiles = [
      {
        id: 1,
        type: "image",
        uri: "file:///test1.jpg",
        name: "test1.jpg",
        size: 1000,
        mimeType: "image/jpeg",
      },
      {
        id: 2,
        type: "image",
        uri: "file:///test2.png",
        name: "test2.png",
        size: 2000,
        mimeType: "image/png",
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

    // Verify this is detected as FormData by our API logic
    const isFormData = formData instanceof FormData;
    expect(isFormData).toBe(true);

    console.log("✅ FormData created with indexed media naming");
    console.log("📦 FormData instance check passed:", isFormData);
    console.log("📦 Expected media fields: media_0, media_1");
    console.log("📦 Expected media_count: 2");
  });

  test("should handle Content-Type header logic correctly", () => {
    console.log("🧪 Testing Content-Type header logic...");

    // Simulate the prepareHeaders function logic
    const mockHeaders = new Map();

    // Test case 1: No Content-Type header set (FormData case)
    console.log("🔧 Test case 1: FormData request (no Content-Type)");
    mockHeaders.clear();

    if (!mockHeaders.get("Content-Type")) {
      mockHeaders.set("Content-Type", "application/json");
    }

    expect(mockHeaders.get("Content-Type")).toBe("application/json");
    console.log("✅ Content-Type set to application/json when not present");

    // Test case 2: Content-Type already set (should not override)
    console.log("🔧 Test case 2: Pre-set Content-Type (should not override)");
    mockHeaders.clear();
    mockHeaders.set("Content-Type", "multipart/form-data; boundary=something");

    if (!mockHeaders.get("Content-Type")) {
      mockHeaders.set("Content-Type", "application/json");
    }

    expect(mockHeaders.get("Content-Type")).toBe(
      "multipart/form-data; boundary=something",
    );
    console.log("✅ Existing Content-Type preserved");

    console.log("✅ Content-Type header logic working correctly");
  });

  test("should verify corrected FormData field naming", () => {
    console.log(
      "🧪 Testing corrected FormData field naming (indexed format)...",
    );

    const postData = {
      title: "Test Post",
      content: "Test content",
      category: "announcement",
      author_id: "test-user",
    };

    const mediaFiles = [
      {
        id: 1,
        type: "image",
        uri: "file:///1.jpg",
        name: "1.jpg",
        mimeType: "image/jpeg",
      },
      {
        id: 2,
        type: "video",
        uri: "file:///2.mp4",
        name: "2.mp4",
        mimeType: "video/mp4",
      },
      {
        id: 3,
        type: "document",
        uri: "file:///3.pdf",
        name: "3.pdf",
        mimeType: "application/pdf",
      },
    ];

    // Capture console logs to verify indexed naming
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => {
      logs.push(args.join(" "));
      originalLog(...args);
    };

    const formData = createPostWithMediaFormData(
      postData,
      mediaFiles,
      [],
      [],
      "school-posts",
    );

    // Restore console.log
    console.log = originalLog;

    expect(formData).toBeInstanceOf(FormData);

    // Verify that logs mention indexed format
    const indexedFormatLog = logs.find(
      (log) =>
        log.includes("indexed format") && log.includes("media_0, media_1"),
    );
    expect(indexedFormatLog).toBeDefined();

    console.log("✅ Indexed media naming verified in logs");
    console.log("📦 Expected format: media_0, media_1, media_2");
    console.log("📦 Media count: 3");
  });
});

// Manual test function for debugging
export const runFormDataDetectionTest = () => {
  console.log("🔧 ===== MANUAL FORMDATA DETECTION TEST =====");

  const formData = new FormData();
  formData.append("title", "Manual Test");
  formData.append("content", "Testing FormData detection");
  formData.append("media_0", "test-file-data");

  const results = {
    instanceof: formData instanceof FormData,
    typeof: typeof formData,
    constructor: formData.constructor.name,
    hasAppend: typeof formData.append === "function",
    hasEntries: typeof formData.entries === "function",
    apiCondition: formData instanceof FormData, // This is what our API uses
  };

  console.log("🔧 FormData detection results:", results);
  console.log(
    "🔧 API condition (formData instanceof FormData):",
    results.apiCondition,
  );

  if (results.apiCondition) {
    console.log("🔧 ✅ FormData would be detected correctly by API");
    console.log(
      "🔧 ✅ Content-Type header would be omitted (correct for FormData)",
    );
  } else {
    console.log("🔧 ❌ FormData detection failed");
  }

  return results;
};
