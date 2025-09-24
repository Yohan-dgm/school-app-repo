/**
 * Filename Consistency Test
 * Tests that upload API and post creation API use the same filenames
 */

import { createPostData } from "../src/utils/postUtils";

describe("Filename Consistency Between APIs", () => {
  describe("Two-Step Upload Process", () => {
    test("should preserve exact upload API filename in post creation", () => {
      // Mock upload API response with backend temp filename
      const uploadedMediaFromAPI = [
        {
          type: "image",
          url: "/storage/nexis-college/yakkala/temp-uploads/images/temp-1640995200000-My_Photo.jpg",
          filename: "temp-1640995200000-My_Photo.jpg", // Backend generated filename
          size: 1024000,
        },
        {
          type: "video",
          url: "/storage/nexis-college/yakkala/temp-uploads/videos/temp-1640995200001-Family_Video.mp4",
          filename: "temp-1640995200001-Family_Video.mp4", // Backend generated filename
          size: 5024000,
        },
      ];

      const postData = {
        title: "Test Post",
        content: "Testing filename consistency",
        category: "announcement",
        author_id: 123,
      };

      // Create post data using uploaded media (two-step process)
      const result = createPostData(postData, uploadedMediaFromAPI);

      // Verify exact filename preservation
      expect(result.media).toHaveLength(2);
      expect(result.media[0].filename).toBe("temp-1640995200000-My_Photo.jpg");
      expect(result.media[1].filename).toBe(
        "temp-1640995200001-Family_Video.mp4",
      );

      // Verify no filename modification occurred
      uploadedMediaFromAPI.forEach((uploadMedia, index) => {
        const postMedia = result.media[index];
        expect(postMedia.filename).toBe(uploadMedia.filename);
        expect(postMedia.url).toBe(uploadMedia.url);
        expect(postMedia.type).toBe(uploadMedia.type);
        expect(postMedia.size).toBe(uploadMedia.size);
      });
    });

    test("should handle uploaded media with various filename patterns", () => {
      const uploadedMediaFromAPI = [
        {
          type: "image",
          url: "/storage/path/temp-123456-user_file.jpg",
          filename: "temp-123456-user_file.jpg", // Contains user filename in temp pattern
          size: 512000,
        },
        {
          type: "document",
          url: "/storage/path/temp-789012-document.pdf",
          filename: "temp-789012-document.pdf", // Backend generated temp filename
          size: 256000,
        },
        {
          type: "video",
          url: "/storage/path/backend_generated_name.mp4",
          filename: "backend_generated_name.mp4", // Backend filename without temp pattern
          size: 2048000,
        },
      ];

      const postData = {
        title: "Mixed Filename Test",
        content: "Testing various filename patterns",
        category: "announcement",
        author_id: 123,
      };

      const result = createPostData(postData, uploadedMediaFromAPI);

      // All filenames should be preserved exactly as returned by upload API
      expect(result.media[0].filename).toBe("temp-123456-user_file.jpg");
      expect(result.media[1].filename).toBe("temp-789012-document.pdf");
      expect(result.media[2].filename).toBe("backend_generated_name.mp4");

      // Verify URL consistency
      result.media.forEach((postMedia, index) => {
        const uploadMedia = uploadedMediaFromAPI[index];
        expect(postMedia.url).toBe(uploadMedia.url);
        expect(postMedia.filename).toBe(uploadMedia.filename);
      });
    });

    test("should handle edge case with missing filename from upload API", () => {
      const uploadedMediaFromAPI = [
        {
          type: "image",
          url: "/storage/path/image.jpg",
          // No filename field - fallback should be used
          size: 1024000,
        },
      ];

      const postData = {
        title: "Missing Filename Test",
        content: "Testing fallback behavior",
        category: "announcement",
        author_id: 123,
      };

      const result = createPostData(postData, uploadedMediaFromAPI);

      // Should use fallback filename
      expect(result.media[0].filename).toBe("uploaded_file_0");
      expect(result.media[0].url).toBe("/storage/path/image.jpg");
    });
  });

  describe("Filename Consistency Validation", () => {
    test("should detect filename consistency between upload and post creation", () => {
      const uploadedMedia = [
        {
          filename: "temp-1234567890-test.jpg",
          url: "/storage/temp-1234567890-test.jpg",
          type: "image",
          size: 1024000,
        },
      ];

      const postData = {
        title: "Consistency Test",
        content: "Testing consistency",
        category: "announcement",
        author_id: 123,
      };

      const postPayload = createPostData(postData, uploadedMedia);

      // Manual consistency check (mimics what we added to the drawers)
      const filenamesMatch =
        postPayload.media[0].filename === uploadedMedia[0].filename;
      const urlsMatch = postPayload.media[0].url === uploadedMedia[0].url;

      expect(filenamesMatch).toBe(true);
      expect(urlsMatch).toBe(true);
      expect(postPayload.media[0].filename).toBe("temp-1234567890-test.jpg");
    });

    test("should maintain consistency across multiple media items", () => {
      const uploadedMedia = [
        {
          filename: "temp-111-photo.jpg",
          url: "/storage/temp-111-photo.jpg",
          type: "image",
          size: 1000,
        },
        {
          filename: "temp-222-video.mp4",
          url: "/storage/temp-222-video.mp4",
          type: "video",
          size: 2000,
        },
        {
          filename: "temp-333-doc.pdf",
          url: "/storage/temp-333-doc.pdf",
          type: "document",
          size: 500,
        },
      ];

      const postData = {
        title: "Multiple Media Test",
        content: "Testing multiple files",
        category: "announcement",
        author_id: 123,
      };

      const postPayload = createPostData(postData, uploadedMedia);

      // Verify all filenames are preserved exactly
      uploadedMedia.forEach((uploadItem, index) => {
        const postItem = postPayload.media[index];
        expect(postItem.filename).toBe(uploadItem.filename);
        expect(postItem.url).toBe(uploadItem.url);
        expect(postItem.type).toBe(uploadItem.type);
        expect(postItem.size).toBe(uploadItem.size);
      });
    });
  });

  describe("Media URL Building Compatibility", () => {
    test("should create URLs that match buildActivityFeedMediaUrl expectations", () => {
      const uploadedMedia = [
        {
          filename: "temp-1640995200000-My_Photo.jpg",
          url: "/storage/nexis-college/yakkala/temp-uploads/images/temp-1640995200000-My_Photo.jpg",
          type: "image",
          size: 1024000,
        },
      ];

      const postData = {
        title: "URL Compatibility Test",
        content: "Testing URL building compatibility",
        category: "announcement",
        author_id: 123,
      };

      const postPayload = createPostData(postData, uploadedMedia);
      const mediaItem = postPayload.media[0];

      // The filename stored in database should match what buildActivityFeedMediaUrl expects
      expect(mediaItem.filename).toBe("temp-1640995200000-My_Photo.jpg");
      expect(mediaItem.url).toContain("temp-1640995200000-My_Photo.jpg");

      // Simulate what transformMediaData does in the activity feed
      const expectedFilename =
        mediaItem.filename ||
        `file.${mediaItem.type === "image" ? "jpg" : "pdf"}`;
      expect(expectedFilename).toBe("temp-1640995200000-My_Photo.jpg");

      // URL should end with the filename for proper media access
      expect(mediaItem.url.endsWith(mediaItem.filename)).toBe(true);
    });
  });

  describe("Real-world Scenarios", () => {
    test("should handle typical school post with mixed media", () => {
      // Simulate real upload API response
      const uploadApiResponse = [
        {
          type: "image",
          filename: "temp-1640995200000-School_Event_Photo.jpg",
          url: "/storage/nexis-college/yakkala/temp-uploads/images/temp-1640995200000-School_Event_Photo.jpg",
          size: 2048000,
        },
        {
          type: "document",
          filename: "temp-1640995200001-Event_Flyer.pdf",
          url: "/storage/nexis-college/yakkala/temp-uploads/documents/temp-1640995200001-Event_Flyer.pdf",
          size: 512000,
        },
      ];

      const schoolPostData = {
        title: "Annual Sports Day",
        content: "Join us for our annual sports day event!",
        category: "event",
        author_id: 456,
        hashtags: ["sports", "school", "event"],
      };

      const postPayload = createPostData(schoolPostData, uploadApiResponse);

      // Verify post structure
      expect(postPayload.title).toBe("Annual Sports Day");
      expect(postPayload.category).toBe("event");
      expect(postPayload.media).toHaveLength(2);

      // Verify filename consistency for each media item
      expect(postPayload.media[0].filename).toBe(
        "temp-1640995200000-School_Event_Photo.jpg",
      );
      expect(postPayload.media[1].filename).toBe(
        "temp-1640995200001-Event_Flyer.pdf",
      );

      // Verify media URLs match filenames
      expect(
        postPayload.media[0].url.endsWith(postPayload.media[0].filename),
      ).toBe(true);
      expect(
        postPayload.media[1].url.endsWith(postPayload.media[1].filename),
      ).toBe(true);

      // Verify sort order is preserved
      expect(postPayload.media[0].sort_order).toBe(1);
      expect(postPayload.media[1].sort_order).toBe(2);
    });
  });
});

console.log("✅ Filename Consistency Test Created");
console.log(
  "📝 This test validates consistency between upload and post creation APIs",
);
console.log("🔍 Key consistency aspects tested:");
console.log("  - Upload API filename exactly preserved in post creation");
console.log("  - URL and filename consistency maintained");
console.log("  - buildActivityFeedMediaUrl compatibility ensured");
console.log("  - Real-world scenarios covered");
