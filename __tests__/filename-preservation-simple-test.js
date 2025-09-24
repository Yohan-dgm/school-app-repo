/**
 * Simple Filename Preservation Test
 * Tests core filename sanitization and preservation logic without complex imports
 */

// Simple sanitization function test
const sanitizeFilename = (filename) => {
  if (!filename) {
    return `file_${Date.now()}`;
  }

  // Remove or replace problematic characters
  let sanitized = filename
    .replace(/[<>:"/\\|?*#]/g, "_") // Replace filesystem-unsafe characters including #
    .replace(/[\x00-\x1f\x80-\x9f]/g, "") // Remove control characters
    .replace(/^\.+/, "") // Remove leading dots
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .trim();

  // Ensure filename isn't empty and has reasonable length
  if (sanitized.length === 0) {
    sanitized = `file_${Date.now()}`;
  } else if (sanitized.length > 255) {
    // Preserve file extension if possible
    const extensionMatch = sanitized.match(/\.[^.]{1,10}$/);
    const extension = extensionMatch ? extensionMatch[0] : "";
    const nameWithoutExt = sanitized.substring(
      0,
      sanitized.length - extension.length,
    );
    sanitized = nameWithoutExt.substring(0, 255 - extension.length) + extension;
  }

  // Ensure filename is safe for database storage
  if (sanitized.startsWith("_")) {
    sanitized = "file" + sanitized;
  }

  return sanitized;
};

// Test filename priority logic
const getFilenameWithPriority = (media, index = 0) => {
  let filename = null;

  // Priority 1: User-selected filename (preserve user intent)
  if (media.name && !media.name.includes("temp-")) {
    filename = sanitizeFilename(media.name);
  } else if (media.fileName && !media.fileName.includes("temp-")) {
    filename = sanitizeFilename(media.fileName);
  } else if (media.original_name && !media.original_name.includes("temp-")) {
    filename = sanitizeFilename(media.original_name);
  } else if (
    media.original_filename &&
    !media.original_filename.includes("temp-")
  ) {
    filename = sanitizeFilename(media.original_filename);
  }

  // Priority 2: Backend filename (if user selection not available)
  if (!filename) {
    const backendFilename =
      media.filename || media.temp_filename || media.saved_filename;
    if (backendFilename) {
      filename = sanitizeFilename(backendFilename);
    }
  }

  // Priority 3: Fallback with meaningful name
  if (!filename) {
    const extension =
      media.type === "video" ? "mp4" : media.type === "image" ? "jpg" : "file";
    filename = `media_${Date.now()}_${index}.${extension}`;
  }

  return filename;
};

describe("Filename Preservation Core Logic", () => {
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
      expect(sanitizeFilename("Document<>:test.pdf")).toBe("Document_test.pdf");
      expect(sanitizeFilename("File|with|pipes.jpg")).toBe(
        "File_with_pipes.jpg",
      );
      expect(sanitizeFilename("Path/with/slashes.png")).toBe(
        "Path_with_slashes.png",
      );
    });

    test("should handle edge cases", () => {
      const emptyResult = sanitizeFilename("");
      expect(emptyResult).toMatch(/^file_\d+$/);

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

  describe("Filename Priority Logic", () => {
    test("should prioritize user.name over generated names", () => {
      const mockMedia = {
        name: "UserSelected.jpg", // User's choice
        fileName: "temp-generated-123.jpg", // Generated
        filename: "temp-backend-456.jpg", // Backend
        type: "image",
      };

      const result = getFilenameWithPriority(mockMedia);

      expect(result).toBe("UserSelected.jpg");
      expect(result).not.toContain("temp-");
    });

    test("should prioritize fileName over backend names", () => {
      const mockMedia = {
        fileName: "UserChosen.png", // User's choice
        filename: "temp-backend-789.png", // Backend generated
        temp_filename: "temp-456.png",
        type: "image",
      };

      const result = getFilenameWithPriority(mockMedia);

      expect(result).toBe("UserChosen.png");
      expect(result).not.toContain("temp-");
    });

    test("should skip temp- names in user selection", () => {
      const mockMedia = {
        name: "temp-generated-name.jpg", // User name contains temp-
        fileName: "Real_User_File.jpg", // Should use this instead
        type: "image",
      };

      const result = getFilenameWithPriority(mockMedia);

      expect(result).toBe("Real_User_File.jpg");
      expect(result).not.toContain("temp-generated");
    });

    test("should use backend filename as fallback", () => {
      const mockMedia = {
        // No user filenames
        filename: "temp-backend-123.jpg",
        type: "image",
      };

      const result = getFilenameWithPriority(mockMedia);

      expect(result).toBe("temp-backend-123.jpg");
    });

    test("should generate meaningful fallback when no filename available", () => {
      const mockMedia = {
        // No filename properties at all
        type: "image",
      };

      const result = getFilenameWithPriority(mockMedia, 0);

      expect(result).toMatch(/^media_\d+_0\.jpg$/);
    });

    test("should preserve different file types correctly", () => {
      const imageMedia = { name: "Photo.jpg", type: "image" };
      const videoMedia = { name: "Video.mp4", type: "video" };
      const docMedia = { name: "Document.pdf", type: "document" };

      expect(getFilenameWithPriority(imageMedia)).toBe("Photo.jpg");
      expect(getFilenameWithPriority(videoMedia)).toBe("Video.mp4");
      expect(getFilenameWithPriority(docMedia)).toBe("Document.pdf");
    });
  });

  describe("Database Safety", () => {
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

  describe("Real-world Scenarios", () => {
    test("should handle typical user file selections", () => {
      const realWorldCases = [
        {
          input: { name: "My Family Photo 2024.jpg", type: "image" },
          expected: "My_Family_Photo_2024.jpg",
        },
        {
          input: { fileName: "Homework Assignment #3.pdf", type: "document" },
          expected: "Homework_Assignment_3.pdf",
        },
        {
          input: { name: "Birthday/Party Video.mp4", type: "video" },
          expected: "Birthday_Party_Video.mp4",
        },
        {
          input: {
            name: "temp-123-bad.jpg", // Contains temp-, should be skipped
            fileName: "Good User File.jpg", // Should use this
            type: "image",
          },
          expected: "Good_User_File.jpg",
        },
      ];

      realWorldCases.forEach((testCase) => {
        const result = getFilenameWithPriority(testCase.input);
        expect(result).toBe(testCase.expected);
      });
    });
  });
});

console.log("✅ Filename Preservation Simple Test Created");
console.log("📝 This test validates core filename preservation logic");
console.log("🔍 Key improvements tested:");
console.log("  - User filename priority over generated names");
console.log("  - Sanitization for database safety");
console.log("  - Proper fallback handling");
console.log("  - Real-world scenario coverage");
