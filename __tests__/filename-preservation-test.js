/**
 * Filename Preservation Test
 * Tests that user-selected filenames are preserved throughout the media processing pipeline
 */

import {
  sanitizeFilename,
  extractFilenameFromUri,
} from "../src/utils/imageUtils";
import { createPostData } from "../src/utils/postUtils";
import { createPostWithMediaFormData } from "../src/utils/postSubmissionUtils";

describe("Filename Preservation System", () => {
  describe("sanitizeFilename", () => {
    test("should preserve user-friendly filenames", () => {
      expect(sanitizeFilename("My Vacation Photo.jpg")).toBe(
        "My_Vacation_Photo.jpg",
      );
      expect(sanitizeFilename("Family_Portrait_2024.png")).toBe(
        "Family_Portrait_2024.png",
      );
      expect(sanitizeFilename("Homework Assignment.pdf")).toBe(
        "Homework_Assignment.pdf",
      );
    });

    test("should handle problematic characters", () => {
      expect(sanitizeFilename("Document<>:test.pdf")).toBe(
        "Document___test.pdf",
      );
      expect(sanitizeFilename("File|with|pipes.jpg")).toBe(
        "File_with_pipes.jpg",
      );
      expect(sanitizeFilename("Path/with/slashes.png")).toBe(
        "Path_with_slashes.png",
      );
    });

    test("should handle edge cases", () => {
      expect(sanitizeFilename("")).toBe("file_" + Date.now());
      expect(sanitizeFilename("...hidden")).toBe("hidden");
      expect(sanitizeFilename("_underscore")).toBe("file_underscore");
    });

    test("should handle long filenames", () => {
      const longName = "A".repeat(300) + ".jpg";
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized.endsWith(".jpg")).toBe(true);
    });
  });

  describe("User-Selected Filename Priority", () => {
    test("should prioritize user.name over generated names", () => {
      const mockMedia = {
        name: "UserSelected.jpg", // User's choice
        fileName: "temp-generated-123.jpg", // Generated
        uri: "file:///temp/temp-456.jpg",
        type: "image",
        size: 1024000,
      };

      const postData = {
        title: "Test Post",
        content: "Testing filename preservation",
        category: "announcement",
        author_id: 123,
      };

      const result = createPostData(postData, [mockMedia]);

      expect(result.media[0].filename).toBe("UserSelected.jpg");
      expect(result.media[0].filename).not.toContain("temp-");
    });

    test("should prioritize fileName over backend names", () => {
      const mockMedia = {
        fileName: "UserChosen.png", // User's choice
        filename: "temp-backend-789.png", // Backend generated
        temp_filename: "temp-456.png",
        uri: "file:///temp/temp-123.png",
        type: "image",
        size: 2048000,
      };

      const postData = {
        title: "Test Post",
        content: "Testing filename preservation",
        category: "announcement",
        author_id: 123,
      };

      const result = createPostData(postData, [mockMedia]);

      expect(result.media[0].filename).toBe("UserChosen.png");
      expect(result.media[0].filename).not.toContain("temp-");
    });

    test("should preserve original user intent across different file types", () => {
      const mockMediaFiles = [
        {
          name: "My_Photo.jpg",
          type: "image",
          uri: "file:///temp/temp-img-123.jpg",
          size: 1024000,
        },
        {
          name: "Family_Video.mp4",
          type: "video",
          uri: "file:///temp/temp-vid-456.mp4",
          size: 5024000,
        },
        {
          name: "Project_Document.pdf",
          type: "document",
          uri: "file:///temp/temp-doc-789.pdf",
          size: 512000,
        },
      ];

      const postData = {
        title: "Multi-Media Post",
        content: "Testing various file types",
        category: "announcement",
        author_id: 123,
      };

      const result = createPostData(postData, mockMediaFiles);

      expect(result.media[0].filename).toBe("My_Photo.jpg");
      expect(result.media[1].filename).toBe("Family_Video.mp4");
      expect(result.media[2].filename).toBe("Project_Document.pdf");

      // Ensure no temp- filenames made it through
      result.media.forEach((media) => {
        expect(media.filename).not.toContain("temp-");
      });
    });
  });

  describe("FormData Filename Preservation", () => {
    test("should preserve user filenames in FormData creation", () => {
      const mockMediaFiles = [
        {
          name: "School_Event.jpg",
          type: "image",
          uri: "file:///temp/temp-123.jpg",
          size: 1024000,
          mimeType: "image/jpeg",
        },
        {
          fileName: "Student_Work.pdf", // Alternative property
          type: "document",
          uri: "file:///temp/temp-456.pdf",
          size: 512000,
          mimeType: "application/pdf",
        },
      ];

      const postData = {
        title: "School Post",
        content: "Testing FormData filename preservation",
        category: "announcement",
        author_id: 123,
      };

      // Capture console logs to verify filename usage
      const originalLog = console.log;
      const logs = [];
      console.log = (...args) => {
        logs.push(args.join(" "));
        originalLog(...args);
      };

      const formData = createPostWithMediaFormData(
        postData,
        mockMediaFiles,
        [],
        [],
        "school-posts",
      );

      // Restore console.log
      console.log = originalLog;

      expect(formData).toBeInstanceOf(FormData);

      // Check logs for preserved filenames
      const filenameLog = logs.find(
        (log) =>
          log.includes("School_Event.jpg") || log.includes("Student_Work.pdf"),
      );
      expect(filenameLog).toBeDefined();

      // Verify no temp- filenames in logs
      const noTempFilenames = logs.every(
        (log) => !log.includes("temp-123") && !log.includes("temp-456"),
      );
      expect(noTempFilenames).toBe(true);
    });
  });

  describe("Edge Cases and Fallbacks", () => {
    test("should handle missing user filenames gracefully", () => {
      const mockMedia = {
        // No name or fileName provided
        filename: "temp-backend-123.jpg",
        uri: "file:///temp/temp-456.jpg",
        type: "image",
        size: 1024000,
      };

      const postData = {
        title: "Test Post",
        content: "Testing fallback behavior",
        category: "announcement",
        author_id: 123,
      };

      const result = createPostData(postData, [mockMedia]);

      // Should use backend filename as fallback
      expect(result.media[0].filename).toBe("temp-backend-123.jpg");
    });

    test("should generate meaningful fallback when no filename available", () => {
      const mockMedia = {
        // No filename properties at all
        uri: "file:///temp/someuri",
        type: "image",
        size: 1024000,
      };

      const postData = {
        title: "Test Post",
        content: "Testing ultimate fallback",
        category: "announcement",
        author_id: 123,
      };

      const result = createPostData(postData, [mockMedia]);

      // Should generate a meaningful filename
      expect(result.media[0].filename).toMatch(/^media_\d+_0\.(jpg|mp4|file)$/);
    });

    test("should handle temp- filenames in user selection", () => {
      const mockMedia = {
        name: "temp-generated-name.jpg", // User name contains temp-
        fileName: "Real_User_File.jpg", // Should use this instead
        uri: "file:///temp/temp-456.jpg",
        type: "image",
        size: 1024000,
      };

      const postData = {
        title: "Test Post",
        content: "Testing temp- filtering",
        category: "announcement",
        author_id: 123,
      };

      const result = createPostData(postData, [mockMedia]);

      // Should skip temp- name and use fileName
      expect(result.media[0].filename).toBe("Real_User_File.jpg");
      expect(result.media[0].filename).not.toContain("temp-generated");
    });
  });

  describe("extractFilenameFromUri (Fallback Only)", () => {
    test("should extract and sanitize URI filenames as fallback", () => {
      const uri = "file:///path/to/temp-64-1758095039-file.jpg";
      const result = extractFilenameFromUri(uri);

      expect(result).toBe("temp-64-1758095039-file.jpg");
    });

    test("should handle problematic URI filenames", () => {
      const uri = "file:///path/to/File With Spaces<>.jpg";
      const result = extractFilenameFromUri(uri);

      expect(result).toBe("File_With_Spaces__.jpg");
    });

    test("should provide fallback for invalid URIs", () => {
      const result = extractFilenameFromUri("");
      expect(result).toMatch(/^file_\d+$/);
    });
  });

  describe("Database Compatibility", () => {
    test("should produce database-safe filenames", () => {
      const problematicFilenames = [
        "File with spaces.jpg",
        "Document<with>brackets.pdf",
        "Path/with/slashes.png",
        "File|with|pipes.mp4",
        'Quote"file".jpg',
      ];

      problematicFilenames.forEach((filename) => {
        const sanitized = sanitizeFilename(filename);

        // Should not contain problematic characters
        expect(sanitized).not.toMatch(/[<>:"/\\|?*]/);
        expect(sanitized).not.toMatch(/[\x00-\x1f\x80-\x9f]/);

        // Should be reasonable length
        expect(sanitized.length).toBeLessThanOrEqual(255);
        expect(sanitized.length).toBeGreaterThan(0);

        // Should preserve file extension if present
        if (filename.includes(".")) {
          const originalExt = filename.split(".").pop();
          expect(sanitized.endsWith(originalExt)).toBe(true);
        }
      });
    });
  });
});

// Export manual test for debugging
export const runFilenamePreservationTest = () => {
  console.log("🔧 ===== MANUAL FILENAME PRESERVATION TEST =====");

  const testCases = [
    {
      name: "User Photo Selection",
      media: {
        name: "My_Summer_Vacation.jpg",
        fileName: "temp-generated-123.jpg",
        uri: "file:///temp/temp-456.jpg",
        type: "image",
        size: 1024000,
      },
      expectedFilename: "My_Summer_Vacation.jpg",
    },
    {
      name: "Document Upload",
      media: {
        fileName: "Homework_Assignment.pdf",
        filename: "temp-backend-789.pdf",
        uri: "file:///temp/temp-abc.pdf",
        type: "document",
        size: 512000,
      },
      expectedFilename: "Homework_Assignment.pdf",
    },
    {
      name: "Video with Spaces",
      media: {
        name: "Family Reunion Video.mp4",
        uri: "file:///temp/temp-video-123.mp4",
        type: "video",
        size: 5024000,
      },
      expectedFilename: "Family_Reunion_Video.mp4",
    },
  ];

  const results = testCases.map((testCase) => {
    const postData = {
      title: `Test ${testCase.name}`,
      content: "Testing filename preservation",
      category: "announcement",
      author_id: 123,
    };

    const result = createPostData(postData, [testCase.media]);
    const actualFilename = result.media[0].filename;
    const success = actualFilename === testCase.expectedFilename;

    console.log(`🧪 ${testCase.name}:`, {
      expected: testCase.expectedFilename,
      actual: actualFilename,
      success: success ? "✅ PASS" : "❌ FAIL",
      preservesUserIntent: !actualFilename.includes("temp-"),
    });

    return { ...testCase, actualFilename, success };
  });

  const passCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  console.log("🔧 Filename Preservation Test Summary:", {
    passed: passCount,
    total: totalCount,
    successRate: `${((passCount / totalCount) * 100).toFixed(1)}%`,
    allTestsPassed: passCount === totalCount,
    userIntentPreserved: results.every(
      (r) => !r.actualFilename.includes("temp-"),
    ),
  });

  return {
    success: passCount === totalCount,
    results,
    summary: `${passCount}/${totalCount} tests passed`,
  };
};
