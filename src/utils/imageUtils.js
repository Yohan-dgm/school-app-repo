/**
 * Image compression utilities using expo-image-manipulator
 * Handles image compression for file uploads to reduce bandwidth
 */

import * as ImageManipulator from "expo-image-manipulator";

/**
 * Compresses an image if it's larger than 1MB
 * @param {string} uri - Image URI from image picker
 * @param {number} originalSize - Original file size in bytes
 * @returns {Object} { uri, size, wasCompressed }
 */
export const compressImageIfNeeded = async (uri, originalSize) => {
  const ONE_MB = 1048576; // 1MB in bytes
  const TARGET_SIZE = 819200; // Target ~800KB to ensure under 1MB after compression

  console.log(`🖼️ Image compression check:`, {
    uri: uri.substring(0, 50) + "...",
    originalSize,
    sizeInMB: (originalSize / ONE_MB).toFixed(2),
    needsCompression: originalSize >= ONE_MB,
  });

  // Skip compression if image is under 1MB
  if (originalSize < ONE_MB) {
    console.log(
      `✅ Image is under 1MB (${originalSize} bytes), skipping compression`,
    );
    return {
      uri,
      size: originalSize,
      wasCompressed: false,
    };
  }

  try {
    console.log(`🔄 Compressing image (${originalSize} bytes)...`);

    // Start with quality 0.8
    let quality = 0.8;
    let compressedResult = null;
    let attempts = 0;
    const maxAttempts = 3;

    // Try different quality levels to get under target size
    while (attempts < maxAttempts) {
      attempts++;

      console.log(`📐 Compression attempt ${attempts} with quality ${quality}`);

      compressedResult = await ImageManipulator.manipulateAsync(
        uri,
        [], // No resize, just compress
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG, // Use JPEG for better compression
        },
      );

      // Check file size (estimated)
      const estimatedSize = originalSize * quality;
      console.log(`📊 Compression result:`, {
        attempt: attempts,
        quality,
        estimatedSize,
        resultUri: compressedResult.uri.substring(0, 50) + "...",
      });

      // If estimated size is acceptable or we've tried enough, break
      if (estimatedSize <= TARGET_SIZE || attempts >= maxAttempts) {
        break;
      }

      // Reduce quality for next attempt
      quality = Math.max(0.3, quality - 0.2);
    }

    // Get actual file size by creating a temporary file object
    let actualSize = originalSize * quality; // Estimate if we can't get actual size

    console.log(`✅ Image compression completed:`, {
      originalSize,
      estimatedSize: actualSize,
      compressionRatio: (actualSize / originalSize).toFixed(2),
      qualityUsed: quality,
      attempts,
    });

    return {
      uri: compressedResult.uri,
      size: Math.round(actualSize),
      wasCompressed: true,
    };
  } catch (error) {
    console.error(`❌ Image compression failed:`, error);
    console.log(`🔄 Falling back to original image`);

    // Fallback to original image if compression fails
    return {
      uri,
      size: originalSize,
      wasCompressed: false,
    };
  }
};

/**
 * Extracts filename from URI path (FALLBACK ONLY)
 * This should only be used when user-selected filename is not available
 * @param {string} uri - File URI from picker
 * @returns {string} Sanitized filename extracted from URI
 */
export const extractFilenameFromUri = (uri) => {
  if (!uri) {
    return `file_${Date.now()}`;
  }

  // Extract filename from URI path
  // Example: "file:///path/temp-64-1758095039-1758095039030-03e75b34.jpg"
  // Result: "temp-64-1758095039-1758095039030-03e75b34.jpg"
  let filename = uri.split("/").pop();

  // Sanitize filename for database compatibility
  if (filename) {
    // Remove any characters that might cause database issues
    filename = sanitizeFilename(filename);
  }

  console.log(`📁 Extracted filename from URI (FALLBACK):`, {
    uri: uri.substring(0, 50) + "...",
    rawFilename: uri.split("/").pop(),
    sanitizedFilename: filename,
    warning: "This is a fallback - user selection should be preferred",
  });

  return filename || `file_${Date.now()}`;
};

/**
 * Sanitizes filename for database storage and file system compatibility
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export const sanitizeFilename = (filename) => {
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

/**
 * Validates video file size (5MB limit)
 * @param {number} fileSize - File size in bytes
 * @returns {Object} { isValid, error }
 */
export const validateVideoSize = (fileSize) => {
  const FIVE_MB = 5 * 1024 * 1024; // 5MB in bytes

  if (fileSize > FIVE_MB) {
    const sizeInMB = (fileSize / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `Video file is ${sizeInMB}MB. Currently can't upload video exceeding 5MB.`,
    };
  }

  return { isValid: true };
};

/**
 * Processes media item for upload with compression and URI naming
 * @param {Object} media - Media object from picker
 * @param {number} index - Index for fallback naming
 * @returns {Object} Processed media ready for upload or error
 */
export const processMediaForUpload = async (media, index) => {
  const mediaType = media.type || media.mediaType || "unknown";
  const originalSize = media.size || media.fileSize || 0;
  const originalUri = media.uri;

  console.log(`📎 Processing media ${index}:`, {
    type: mediaType,
    originalSize,
    sizeInMB: (originalSize / (1024 * 1024)).toFixed(2),
    uri: originalUri?.substring(0, 50) + "...",
  });

  // Extract filename with priority: 1. User selection, 2. URI extraction, 3. Fallback
  let filename = null;
  let filenameSource = "unknown"; // Track how filename was determined

  // Priority 1: User-selected filename (preserve user intent)
  if (media.name && !media.name.includes("temp-")) {
    filename = sanitizeFilename(media.name);
    filenameSource = "user_name";
  } else if (media.fileName && !media.fileName.includes("temp-")) {
    filename = sanitizeFilename(media.fileName);
    filenameSource = "user_fileName";
  } else if (media.original_name && !media.original_name.includes("temp-")) {
    filename = sanitizeFilename(media.original_name);
    filenameSource = "user_original_name";
  } else if (
    media.original_filename &&
    !media.original_filename.includes("temp-")
  ) {
    filename = sanitizeFilename(media.original_filename);
    filenameSource = "user_original_filename";
  }

  // Priority 2: URI extraction (fallback)
  if (!filename) {
    filename = extractFilenameFromUri(originalUri); // Already sanitized inside function
    filenameSource = "uri_extraction";
  }

  // Priority 3: Smart readable fallback
  if (!filename) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");

    const extension =
      mediaType === "video" ? "mp4" : mediaType === "image" ? "jpg" : "file";
    const mediaPrefix =
      mediaType === "video"
        ? "Video"
        : mediaType === "image"
          ? "Photo"
          : "File";

    filename = `${mediaPrefix}_${year}_${month}_${day}_${hour}_${minute}_${second}.${extension}`;
    filenameSource = "smart_fallback";
    console.log(`📁 🎯 Generated smart readable filename: ${filename}`);
  }

  console.log(`📁 Filename resolution for media ${index}:`, {
    userSelectedNames: {
      name: media.name,
      fileName: media.fileName,
      original_name: media.original_name,
      original_filename: media.original_filename,
    },
    uriExtracted: extractFilenameFromUri(originalUri),
    finalFilename: filename,
    priorityUsed:
      media.name && !media.name.includes("temp-")
        ? "USER_SELECTION"
        : media.fileName && !media.fileName.includes("temp-")
          ? "USER_SELECTION"
          : media.original_name && !media.original_name.includes("temp-")
            ? "USER_SELECTION"
            : media.original_filename &&
                !media.original_filename.includes("temp-")
              ? "USER_SELECTION"
              : extractFilenameFromUri(originalUri) !== `file_${Date.now()}`
                ? "URI_EXTRACTION"
                : "FALLBACK",
    preservesUserIntent:
      !filename.includes("temp-") &&
      (filename === media.name ||
        filename === media.fileName ||
        filename === media.original_name ||
        filename === media.original_filename),
  });

  // Process based on media type
  if (mediaType === "image") {
    // Compress image if needed
    const {
      uri: processedUri,
      size: processedSize,
      wasCompressed,
    } = await compressImageIfNeeded(originalUri, originalSize);

    return {
      success: true,
      data: {
        ...media,
        uri: processedUri,
        size: processedSize,
        name: filename, // Enhanced preserved filename
        fileName: filename, // Compatibility field
        original_user_filename: media.original_user_filename || filename, // Explicit user intent
        originalName: media.name || media.fileName, // Keep reference to original input
        filenameSource: filenameSource, // Track how filename was determined
        wasCompressed,
        type: mediaType,
      },
    };
  } else if (mediaType === "video") {
    // Validate video size (5MB limit)
    const validation = validateVideoSize(originalSize);
    if (!validation.isValid) {
      console.warn(`❌ Video validation failed: ${validation.error}`);
      return {
        success: false,
        error: validation.error,
      };
    }

    console.log(
      `🎥 Video size OK (${(originalSize / (1024 * 1024)).toFixed(1)}MB)`,
    );
    return {
      success: true,
      data: {
        ...media,
        name: filename, // Enhanced preserved filename
        fileName: filename, // Compatibility field
        original_user_filename: media.original_user_filename || filename, // Explicit user intent
        originalName: media.name || media.fileName, // Keep reference to original input
        filenameSource: filenameSource, // Track how filename was determined
        type: mediaType,
      },
    };
  } else {
    // For documents, just use URI filename without compression or size validation
    console.log(`📄 No compression needed for ${mediaType}`);
    return {
      success: true,
      data: {
        ...media,
        name: filename, // Enhanced preserved filename
        fileName: filename, // Compatibility field
        original_user_filename: media.original_user_filename || filename, // Explicit user intent
        originalName: media.name || media.fileName, // Keep reference to original input
        filenameSource: filenameSource, // Track how filename was determined
        type: mediaType,
      },
    };
  }
};

export default {
  compressImageIfNeeded,
  extractFilenameFromUri,
  sanitizeFilename,
  validateVideoSize,
  processMediaForUpload,
};
