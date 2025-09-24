/**
 * Integration test for media upload functionality
 * Tests the corrected FormData creation and API integration
 */

import {
  createPostWithMediaFormData,
  validateMediaFiles,
} from "../src/utils/postSubmissionUtils";

describe("Media Upload Integration Tests", () => {
  // Mock media data similar to what ImagePicker provides
  const mockImageData = {
    id: 1,
    type: "image",
    uri: "file:///path/to/test/image.jpg",
    name: "test-image.jpg",
    size: 1024000,
    mimeType: "image/jpeg",
  };

  const mockVideoData = {
    id: 2,
    type: "video",
    uri: "file:///path/to/test/video.mp4",
    name: "test-video.mp4",
    size: 5120000,
    mimeType: "video/mp4",
  };

  const mockPdfData = {
    id: 3,
    type: "document",
    uri: "file:///path/to/test/document.pdf",
    name: "test-document.pdf",
    size: 2048000,
    mimeType: "application/pdf",
  };

  const mockPostData = {
    title: "Test Post with Media",
    content: "This is a test post with media attachments",
    category: "announcement",
    author_id: "test-user-123",
  };

  const mockTags = ["school", "test"];
  const mockAvailableTags = [
    { id: "school", label: "#School" },
    { id: "test", label: "#Test" },
  ];

  test("should validate media files correctly", () => {
    console.log("🧪 Testing media validation...");

    const mediaFiles = [mockImageData, mockVideoData, mockPdfData];
    const validation = validateMediaFiles(mediaFiles);

    console.log("✅ Validation result:", validation);
    expect(validation.isValid).toBe(true);
  });

  test("should create FormData with indexed media format", () => {
    console.log("🧪 Testing FormData creation with indexed format...");

    const mediaFiles = [mockImageData, mockVideoData];
    const formData = createPostWithMediaFormData(
      mockPostData,
      mediaFiles,
      mockTags,
      mockAvailableTags,
      "school-posts",
    );

    console.log("📦 FormData created successfully");
    expect(formData).toBeInstanceOf(FormData);

    // Test that FormData contains the expected fields
    // Note: In testing environment, we can't directly inspect FormData contents
    // but we can verify it was created without errors
    console.log("✅ FormData validation passed");
  });

  test("should handle empty media array", () => {
    console.log("🧪 Testing FormData creation with no media...");

    const formData = createPostWithMediaFormData(
      mockPostData,
      [], // No media
      mockTags,
      mockAvailableTags,
      "school-posts",
    );

    console.log("📦 FormData created for post without media");
    expect(formData).toBeInstanceOf(FormData);
    console.log("✅ No-media FormData validation passed");
  });

  test("should reject invalid media files", () => {
    console.log("🧪 Testing invalid media rejection...");

    const invalidMedia = {
      id: 4,
      type: "invalid",
      uri: "file:///path/to/test/invalid.exe",
      name: "invalid-file.exe",
      size: 1024000,
      mimeType: "application/x-executable",
    };

    const validation = validateMediaFiles([invalidMedia]);
    console.log("❌ Invalid media validation result:", validation);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain("unsupported");
  });

  test("should reject oversized media files", () => {
    console.log("🧪 Testing oversized media rejection...");

    const oversizedMedia = {
      ...mockImageData,
      size: 60 * 1024 * 1024, // 60MB - exceeds 50MB limit
      name: "oversized-image.jpg",
    };

    const validation = validateMediaFiles([oversizedMedia]);
    console.log("❌ Oversized media validation result:", validation);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain("too large");
  });

  test("should log FormData creation details", () => {
    console.log("🧪 Testing FormData creation logging...");

    // Capture console logs
    const consoleSpy = jest.spyOn(console, "log");

    const mediaFiles = [mockImageData];
    createPostWithMediaFormData(
      mockPostData,
      mediaFiles,
      mockTags,
      mockAvailableTags,
      "school-posts",
    );

    // Verify that detailed logging occurred
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Creating FormData for direct post creation"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Processing media files for direct upload"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Added 1 media files to FormData using indexed format",
      ),
    );

    consoleSpy.mockRestore();
  });
});

// Manual test function for debugging
export const runManualMediaTest = () => {
  console.log("🔧 ===== MANUAL MEDIA UPLOAD TEST =====");

  const testMedia = [
    {
      id: Date.now(),
      type: "image",
      uri: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//gA7Q1JFQVR...", // Sample base64
      name: "test-image.jpg",
      size: 1024,
      mimeType: "image/jpeg",
    },
  ];

  const testPostData = {
    title: "Manual Test Post",
    content: "Testing media upload with corrected FormData format",
    category: "announcement",
    author_id: "manual-test-user",
  };

  console.log("🔧 Test media:", testMedia);
  console.log("🔧 Test post data:", testPostData);

  // Test validation
  const validation = validateMediaFiles(testMedia);
  console.log("🔧 Validation result:", validation);

  if (validation.isValid) {
    // Test FormData creation
    const formData = createPostWithMediaFormData(
      testPostData,
      testMedia,
      ["test"],
      [{ id: "test", label: "#Test" }],
      "school-posts",
    );
    console.log("🔧 FormData created:", formData instanceof FormData);
    console.log("🔧 Manual test completed successfully");
    return { success: true, formData };
  } else {
    console.error("🔧 Manual test failed:", validation.error);
    return { success: false, error: validation.error };
  }
};
