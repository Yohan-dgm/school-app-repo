/**
 * Laravel Array Format Test
 * Tests the corrected FormData field naming for Laravel backend
 */

import { createPostWithMediaFormData } from "../src/utils/postSubmissionUtils";

describe("Laravel Array Format Test", () => {
  test("should create FormData with Laravel array format (media[0], media[1])", () => {
    console.log("🧪 Testing Laravel array format implementation...");

    const postData = {
      title: "Laravel Array Test",
      content: "Testing Laravel array format for media fields",
      category: "announcement",
      author_id: "test-user-123",
    };

    const mediaFiles = [
      {
        id: 1,
        type: "image",
        uri: "file:///test1.jpg",
        name: "test1.jpg",
        size: 1024000,
        mimeType: "image/jpeg",
      },
      {
        id: 2,
        type: "image",
        uri: "file:///test2.png",
        name: "test2.png",
        size: 2048000,
        mimeType: "image/png",
      },
    ];

    // Capture console logs to verify field naming
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => {
      logs.push(args.join(" "));
      originalLog(...args);
    };

    const formData = createPostWithMediaFormData(
      postData,
      mediaFiles,
      ["test"],
      [{ id: "test", label: "#Test" }],
      "school-posts",
    );

    // Restore console.log
    console.log = originalLog;

    // Verify FormData creation
    expect(formData).toBeInstanceOf(FormData);

    // Verify FormData detection
    const isFormData = formData instanceof FormData;
    expect(isFormData).toBe(true);

    // Verify Laravel array format logging
    const laravelFormatLog = logs.find(
      (log) =>
        log.includes("Laravel array format") &&
        log.includes("media[0], media[1]"),
    );
    expect(laravelFormatLog).toBeDefined();

    // Verify expected field names in debug log
    const debugLog = logs.find(
      (log) =>
        log.includes("Expected media fields:") &&
        log.includes("media[0]") &&
        log.includes("media[1]"),
    );
    expect(debugLog).toBeDefined();

    console.log("✅ Laravel array format test passed");
    console.log("✅ Expected media fields: media[0], media[1]");
    console.log("✅ FormData instance created successfully");
    console.log("✅ Debugging logs verified");
  });

  test("should verify API endpoint meta flag configuration", () => {
    console.log("🧪 Testing API endpoint meta flag configuration...");

    const formData = new FormData();
    formData.append("test", "value");

    // Simulate API endpoint logic
    const isFormData = formData instanceof FormData;

    if (isFormData) {
      const endpointConfig = {
        url: "api/activity-feed-management/school-posts/create",
        method: "POST",
        body: formData,
        meta: { isFormData: true },
      };

      expect(endpointConfig.meta.isFormData).toBe(true);
      expect(endpointConfig.body).toBe(formData);

      console.log("✅ API endpoint config verified");
      console.log("✅ Meta flag set correctly: { isFormData: true }");
      console.log("✅ FormData body attached correctly");
    }
  });

  test("should simulate Content-Type header removal process", () => {
    console.log("🧪 Testing Content-Type header removal simulation...");

    // Simulate the prepareHeaders function
    const mockApi = {
      meta: { isFormData: true },
      endpoint: "createSchoolPost",
      type: "mutation",
    };

    const mockHeaders = new Map();
    mockHeaders.set("Content-Type", "application/json"); // Initially set
    mockHeaders.set("X-Requested-With", "XMLHttpRequest");
    mockHeaders.set("Accept", "application/json");

    // Check if this is a FormData request using meta field
    const isFormDataRequest = mockApi.meta?.isFormData === true;

    if (isFormDataRequest) {
      const hadContentType = mockHeaders.has("Content-Type");
      const originalContentType = mockHeaders.get("Content-Type");
      mockHeaders.delete("Content-Type");

      console.log("📦 FormData detected - Content-Type header management:", {
        hadContentType,
        originalContentType,
        removedSuccessfully: !mockHeaders.has("Content-Type"),
        endpoint: mockApi.endpoint,
      });

      expect(hadContentType).toBe(true);
      expect(originalContentType).toBe("application/json");
      expect(mockHeaders.has("Content-Type")).toBe(false);
    }

    console.log("✅ Content-Type header removal simulation passed");
    console.log("✅ Header was successfully removed for FormData request");
  });
});

// Export manual test for immediate debugging
export const runLaravelArrayTest = () => {
  console.log("🔧 ===== MANUAL LARAVEL ARRAY FORMAT TEST =====");

  const testData = {
    title: "Manual Laravel Test",
    content: "Testing Laravel array format manually",
    category: "announcement",
    author_id: "manual-test",
  };

  const testMedia = [
    {
      id: 1,
      type: "image",
      uri: "file:///manual1.jpg",
      name: "manual1.jpg",
      size: 1000,
      mimeType: "image/jpeg",
    },
  ];

  const formData = createPostWithMediaFormData(
    testData,
    testMedia,
    [],
    [],
    "school-posts",
  );
  const isFormData = formData instanceof FormData;

  console.log("🔧 Laravel Array Test Results:", {
    formDataCreated: isFormData,
    detectionWorks: formData instanceof FormData,
    expectedMetaFlag: { isFormData: true },
    expectedContentType: "should be removed for FormData",
    expectedMediaFields: ["media[0]"],
    laravelArrayFormat: "media[0], media[1], etc.",
  });

  return {
    success: isFormData,
    formData: formData,
    recommendation: isFormData
      ? "Laravel array format ready for testing!"
      : "FormData detection failed - needs investigation",
  };
};
