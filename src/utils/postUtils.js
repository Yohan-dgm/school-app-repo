/**
 * Utility functions for post creation and media handling
 */

import { sanitizeFilename } from "./imageUtils.js";

/**
 * Extracts original user filename from backend temp filename pattern
 * Backend pattern: temp-{timestamp}-{original_user_filename}
 * @param {string} tempFilename - Backend temp filename (e.g., "temp-1640995200000-My_Photo.jpg")
 * @returns {string|null} Original user filename (e.g., "My_Photo.jpg") or null if not extractable
 */
export const extractOriginalFilenameFromTemp = (tempFilename) => {
  if (!tempFilename || typeof tempFilename !== "string") {
    return null;
  }

  // Pattern: temp-{timestamp}-{original_filename}
  const tempPattern = /^temp-\d+-(.+)$/;
  const match = tempFilename.match(tempPattern);

  if (match && match[1]) {
    console.log(
      `📎 🔍 Extracted original filename: ${tempFilename} → ${match[1]}`,
    );
    return match[1];
  }

  // Alternative patterns that might be used
  const alternativePatterns = [
    /^temp_\d+_(.+)$/, // temp_timestamp_filename
    /^\d+-(.+)$/, // timestamp-filename
    /^backend-(.+)$/, // backend-filename
  ];

  for (const pattern of alternativePatterns) {
    const altMatch = tempFilename.match(pattern);
    if (altMatch && altMatch[1]) {
      console.log(
        `📎 🔍 Extracted original filename (alt pattern): ${tempFilename} → ${altMatch[1]}`,
      );
      return altMatch[1];
    }
  }

  console.log(
    `📎 ⚠️ Could not extract original filename from: ${tempFilename}`,
  );
  return null;
};

/**
 * Applies filename priority system to get user-selected filename (preserving user intent)
 * Same priority logic as postSubmissionUtils.js
 * @param {Object} media - Media object with various filename fields
 * @param {number} index - Media index for fallback naming
 * @returns {string} Final filename following priority system
 */
export const getUserSelectedFilename = (media, index = 0) => {
  let filename = null;

  // Priority 1: User-selected filename (preserve user intent)
  if (media.name && !media.name.includes("temp-")) {
    filename = sanitizeFilename(media.name);
    console.log(
      `📎 🎯 Using user-selected filename from media.name: ${filename}`,
    );
  } else if (media.fileName && !media.fileName.includes("temp-")) {
    filename = sanitizeFilename(media.fileName);
    console.log(
      `📎 🎯 Using user-selected filename from media.fileName: ${filename}`,
    );
  } else if (media.original_name && !media.original_name.includes("temp-")) {
    filename = sanitizeFilename(media.original_name);
    console.log(
      `📎 🎯 Using user-selected filename from media.original_name: ${filename}`,
    );
  } else if (
    media.original_filename &&
    !media.original_filename.includes("temp-")
  ) {
    filename = sanitizeFilename(media.original_filename);
    console.log(
      `📎 🎯 Using user-selected filename from media.original_filename: ${filename}`,
    );
  }

  // Priority 2: Extract original filename from backend temp filename
  if (!filename && media.filename && media.filename.includes("temp-")) {
    const extractedFilename = extractOriginalFilenameFromTemp(media.filename);
    if (extractedFilename) {
      filename = sanitizeFilename(extractedFilename);
      console.log(
        `📎 🎯 Using extracted original filename from backend temp: ${filename}`,
      );
    }
  }

  // Priority 3: Backend filename (if available and not temp)
  if (!filename) {
    const backendFilename =
      media.filename || media.temp_filename || media.saved_filename;
    if (backendFilename && !backendFilename.includes("temp-")) {
      filename = sanitizeFilename(backendFilename);
      console.log(`📎 🎯 Using backend filename: ${filename}`);
    }
  }

  // Priority 4: Smart readable fallback
  if (!filename) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");

    const extension =
      media.type === "video" ? "mp4" : media.type === "image" ? "jpg" : "file";
    const mediaPrefix =
      media.type === "video"
        ? "Video"
        : media.type === "image"
          ? "Photo"
          : "File";

    filename = `${mediaPrefix}_${year}_${month}_${day}_${hour}_${minute}_${second}.${extension}`;
    console.log(`📎 🎯 Using smart readable fallback: ${filename}`);
  }

  return filename;
};

/**
 * Formats media URL to ensure proper storage path structure
 * @param {string} url - Raw URL from backend response
 * @param {string} mediaType - Type of media (image, video, document)
 * @param {string} filename - Original filename
 * @returns {string} Properly formatted storage URL
 */
export const formatMediaStorageUrl = (
  url,
  mediaType = "image",
  filename = "",
) => {
  if (!url) {
    console.warn("⚠️ No URL provided for media formatting");
    return "";
  }

  console.log("🔗 Formatting media URL:", {
    original: url,
    mediaType,
    filename,
  });

  // If URL already has the proper storage format, return as is
  if (url.includes("/storage/") && url.includes("temp-uploads")) {
    console.log("✅ URL already properly formatted:", url);
    return url;
  }

  // If URL is just a filename or relative path, construct the full storage path
  if (!url.startsWith("/storage/")) {
    // Determine the media subdirectory based on type
    let mediaDir = "images"; // default
    if (mediaType === "video") {
      mediaDir = "videos";
    } else if (mediaType === "document" || mediaType === "pdf") {
      mediaDir = "documents";
    }

    // Extract filename from URL if it's a path
    const actualFilename = url.includes("/") ? url.split("/").pop() : url;

    // Construct the full storage path
    const formattedUrl = `/storage/nexis-college/yakkala/temp-uploads/${mediaDir}/${actualFilename}`;
    console.log("🔗 Constructed storage URL:", formattedUrl);
    return formattedUrl;
  }

  // If URL starts with /storage/ but doesn't have temp-uploads, fix the path
  if (url.startsWith("/storage/") && !url.includes("temp-uploads")) {
    const filename = url.split("/").pop();
    let mediaDir = "images";
    if (mediaType === "video") {
      mediaDir = "videos";
    } else if (mediaType === "document" || mediaType === "pdf") {
      mediaDir = "documents";
    }

    const formattedUrl = `/storage/nexis-college/yakkala/temp-uploads/${mediaDir}/${filename}`;
    console.log("🔗 Fixed storage path:", formattedUrl);
    return formattedUrl;
  }

  console.log("🔗 Using original URL:", url);
  return url;
};

/**
 * Maps frontend category to backend type enum
 * Backend type enum only accepts: announcement, event, news, achievement
 * @param {string} category - Frontend category
 * @returns {string} Valid backend type enum value
 */
export const mapCategoryToType = (category) => {
  const mapping = {
    announcement: "announcement",
    event: "event",
    news: "news",
    achievement: "achievement",
    sports: "achievement", // Map sports to achievement
    academic: "announcement", // Map academic to announcement
    other: "announcement", // Map other to announcement (for class posts)
  };
  return mapping[category] || "announcement"; // Default fallback
};

/**
 * Creates JSON payload for post creation with selected media files
 * @param {Object} postData - Post data (title, content, etc.)
 * @param {Array} selectedMedia - Array of selected media files from picker
 * @returns {Object} JSON object ready for API submission
 */
export const createPostData = (postData, selectedMedia = []) => {
  console.log("📝 Creating JSON payload with postData:", postData);
  console.log("📎 Selected media files:", selectedMedia);

  // Ensure selectedMedia is an array
  const mediaArray = Array.isArray(selectedMedia) ? selectedMedia : [];

  // Create the JSON payload structure expected by backend
  // Backend expects:
  // - type: lowercase enum (announcement, event, news, achievement)
  // - category: capitalized display name (Announcement, Event, News, Achievement)
  const categoryMapping = {
    announcement: "Announcement",
    event: "Event",
    news: "News",
    achievement: "Achievement",
    sports: "Achievement", // Map sports to Achievement display
    academic: "Announcement", // Map academic to Announcement display
    other: "Announcement", // Map other to Announcement display
  };

  const payload = {
    type: "announcement", // Always send as "announcement" for backend (default type)
    category: categoryMapping[postData.category] || "Announcement", // capitalized display name
    title: postData.title || "",
    content: postData.content || "",
    author_id: postData.author_id || null,
    hashtags: postData.hashtags || [],
  };

  // Add media array for backend compatibility
  // Backend expects: media: [{type, url, filename, size, sort_order}]
  if (mediaArray.length > 0) {
    // Check if this is uploaded media (has backend filename/url) or raw selected files
    // Uploaded media will have URL field (instead of uri) and likely backend filename
    const isUploadedMedia = mediaArray[0]?.url && !mediaArray[0]?.uri;

    // Debug: Log process detection details
    console.log("🔍 Process detection for media:", {
      totalMedia: mediaArray.length,
      firstMediaStructure: mediaArray[0],
      hasUrl: !!mediaArray[0]?.url,
      hasUri: !!mediaArray[0]?.uri,
      hasFilename: !!mediaArray[0]?.filename,
      hasName: !!mediaArray[0]?.name,
      filenameHasTemp: mediaArray[0]?.filename?.includes("temp-"),
      nameHasTemp: mediaArray[0]?.name?.includes("temp-"),
      urlHasStorage: mediaArray[0]?.url?.includes("/storage/"),
      detectionLogic: "hasUrl && !hasUri = uploaded media",
      isUploadedMedia: isUploadedMedia,
      processType: isUploadedMedia
        ? "TWO-STEP (uploaded media)"
        : "SINGLE-STEP (raw files)",
    });

    if (isUploadedMedia) {
      console.log("📎 Processing uploaded media URLs from two-step upload...");
      console.log(
        "📎 🎯 NEW BEHAVIOR: Using user-selected filenames (preserving user intent) instead of backend temp filenames",
      );

      // Media already uploaded, now create filename in format: temp-user_id-filename
      payload.media = mediaArray.map((media, index) => {
        // Get user-selected filename using the new priority system
        const originalUserFilename = getUserSelectedFilename(media, index);

        // Extract user ID from postData
        const userId = postData.author_id;

        // Create new filename format: temp-user_id-filename
        const newFilename = `temp-${userId}-${originalUserFilename}`;

        console.log(
          `📎 🎯 Creating filename in new format for media ${index}:`,
          {
            originalUserFilename,
            userId,
            newFilename,
            format: "temp-user_id-filename",
          },
        );

        // Build media URL using new filename format
        let mediaDir = "images"; // default for images
        const mediaType = media.type || "image";
        if (mediaType === "video") {
          mediaDir = "videos";
        } else if (mediaType === "pdf" || mediaType === "document") {
          mediaDir = "documents";
        }

        // Create storage URL with new filename format
        const newFormatUrl = `/storage/nexis-college/yakkala/temp-uploads/${mediaDir}/${newFilename}`;

        const processedMedia = {
          type: mediaType,
          url: newFormatUrl, // URL with new filename format
          filename: newFilename, // New filename format: temp-user_id-filename
          size: media.size || 0,
          sort_order: index + 1,
          // Keep reference to backend data and original filenames for debugging
          backend_filename: media.filename, // Original backend temp filename
          backend_url: media.url, // Original backend URL
          original_user_filename: originalUserFilename, // User's original filename
          user_id: userId, // User ID used in filename
        };

        // Debug: Log new filename format creation tracking
        console.log(
          `📎 🎯 Post Creation - Using new filename format ${index}:`,
          {
            backendTempFilename: media.filename,
            extractedUserFilename: media.original_user_filename,
            originalUserFilename: originalUserFilename,
            userId: userId,
            newFilename: processedMedia.filename,
            newFormatUrl: processedMedia.url,
            backendUrl: media.url,
            filenameFormat: "temp-user_id-filename",
            filenameSource: media.original_user_filename
              ? "extracted from backend"
              : media.name || media.fileName
                ? "direct user selection"
                : "fallback",
            formatCorrect: processedMedia.filename.startsWith(`temp-${userId}-`)
              ? "✅ YES"
              : "❌ NO",
            type: processedMedia.type,
          },
        );

        return processedMedia;
      });
      console.log(
        "📎 🎯 ✅ Using new filename format (temp-user_id-filename) for post creation:",
        payload.media,
      );
    } else {
      console.log(
        "📎 Processing selected media files for single-step submission...",
      );

      payload.media = mediaArray.map((media, index) => {
        // Get media type from file picker
        let mediaType = media.type || media.mediaType || "image";

        // Convert document type to pdf for backend if it's a PDF file
        if (mediaType === "document") {
          // Check if it's actually a PDF by filename or MIME type
          const filename = media.name || media.fileName || "";
          const mimeType = media.mimeType || "";
          const isPdf =
            filename.toLowerCase().includes(".pdf") ||
            mimeType.toLowerCase().includes("pdf");
          mediaType = isPdf ? "pdf" : "document";
        }

        // Get filename from file picker - prioritize user-selected names
        // Priority order: user selection (name/fileName) > backend filename > fallback
        let filename = null;

        // Priority 1: User-selected filename (preserve user intent)
        if (media.name && !media.name.includes("temp-")) {
          filename = sanitizeFilename(media.name);
        } else if (media.fileName && !media.fileName.includes("temp-")) {
          filename = sanitizeFilename(media.fileName);
        } else if (
          media.original_name &&
          !media.original_name.includes("temp-")
        ) {
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
            media.type === "video"
              ? "mp4"
              : media.type === "image"
                ? "jpg"
                : "file";
          filename = `media_${Date.now()}_${index}.${extension}`;
        }

        // Debug: Log filename resolution with priority information
        console.log(`📁 Filename resolution for media ${index}:`, {
          userSelectedNames: {
            "media.name": media.name,
            "media.fileName": media.fileName,
            "media.original_name": media.original_name,
            "media.original_filename": media.original_filename,
          },
          backendNames: {
            "media.filename": media.filename,
            "media.temp_filename": media.temp_filename,
            "media.saved_filename": media.saved_filename,
          },
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
                    : media.filename ||
                        media.temp_filename ||
                        media.saved_filename
                      ? "BACKEND"
                      : "FALLBACK",
          type: media.type || media.mediaType,
        });

        // Generate proper storage URL path with media type directory
        let mediaDir = "images"; // default for images
        if (mediaType === "video") {
          mediaDir = "videos";
        } else if (mediaType === "pdf" || mediaType === "document") {
          mediaDir = "documents";
        }

        // Create storage URL with proper format: /storage/nexis-college/yakkala/temp-uploads/images/filename.jpg
        const storageUrl = `/storage/nexis-college/yakkala/temp-uploads/${mediaDir}/${filename}`;

        // Get file size from picker (in bytes)
        const fileSize = media.size || media.fileSize || 0;

        console.log(
          `📎 Media ${index} processing for single-step submission:`,
          {
            original_type: media.type || media.mediaType,
            mapped_type: mediaType,
            filename: filename,
            storage_url: storageUrl,
            file_size: fileSize,
          },
        );

        // Create media object for array
        const mediaObject = {
          type: mediaType, // "image", "video", "pdf"
          url: storageUrl, // Expected storage URL (backend will handle actual storage)
          filename: filename,
          size: fileSize,
          sort_order: index + 1,
        };

        console.log(
          `📎 ✅ Created media object for index ${index}:`,
          mediaObject,
        );

        return mediaObject;
      });

      console.log(`📎 ✅ Total media files processed: ${mediaArray.length}`);
      console.log(
        `📎 ✅ Media array created for single-step submission:`,
        payload.media,
      );
    }

    console.log(`📎 ✅ Final media array:`, payload.media);
  } else {
    // Ensure empty array when no media
    payload.media = [];
  }

  // Add class_id for class posts
  if (postData.class_id) {
    payload.class_id = postData.class_id;
  }

  // Add grade for class posts
  if (postData.grade) {
    payload.grade = postData.grade;
  }

  console.log("🔍 ===== FINAL PAYLOAD VALIDATION =====");
  console.log("🔍 Final JSON payload:", JSON.stringify(payload, null, 2));

  // Validate payload structure matches backend requirements
  console.log("🔍 Payload validation:");
  console.log(
    `  - type: "${payload.type}" (should be: announcement|event|news|achievement)`,
  );
  console.log(
    `  - category: "${payload.category}" (should be: Announcement|Event|News|Achievement)`,
  );
  console.log(
    `  - title: "${payload.title}" (length: ${payload.title?.length || 0})`,
  );
  console.log(
    `  - content: "${payload.content?.substring(0, 50)}..." (length: ${payload.content?.length || 0})`,
  );
  console.log(`  - author_id: ${payload.author_id}`);
  console.log(
    `  - hashtags: [${payload.hashtags?.join(", ")}] (count: ${payload.hashtags?.length || 0})`,
  );
  console.log(
    `  - media: ${payload.media?.length || 0} items (array structure)`,
  );

  // Validate media array structure
  if (payload.media && payload.media.length > 0) {
    console.log("🔍 ===== MEDIA ARRAY VALIDATION =====");
    let allMediaValid = true;
    let backendFilenameCount = 0;

    payload.media.forEach((media, index) => {
      const isValidType = ["image", "video", "pdf", "document"].includes(
        media.type,
      );
      const hasFilename = !!media.filename && media.filename.length > 0;
      const hasValidSortOrder =
        typeof media.sort_order === "number" && media.sort_order >= 1;
      const hasBackendFilename = media.filename?.includes("temp-");

      if (hasBackendFilename) {
        backendFilenameCount++;
      }

      console.log(`🔍 Media Array ${index} validation:`);
      console.log(`  - type: "${media.type}" ${isValidType ? "✅" : "❌"}`);
      console.log(`  - url: "${media.url || "not required"}" (info only)`);
      console.log(
        `  - filename: "${media.filename}" ${hasFilename ? "✅" : "❌"}`,
      );
      console.log(
        `  - backend filename: ${hasBackendFilename ? "✅ YES" : "❌ NO"}`,
      );
      console.log(`  - size: ${media.size} bytes`);
      console.log(
        `  - sort_order: ${media.sort_order} ${hasValidSortOrder ? "✅" : "❌"}`,
      );

      // More detailed validation with specific error messages
      let hasValidationErrors = false;
      const validationErrors = [];

      if (!isValidType) {
        validationErrors.push(
          `Invalid type: "${media.type}" (expected: image, video, pdf, document)`,
        );
        hasValidationErrors = true;
      }
      // URL validation removed - not required for media upload
      if (!hasFilename) {
        validationErrors.push(`Missing filename: "${media.filename}"`);
        hasValidationErrors = true;
      }
      if (!hasValidSortOrder) {
        validationErrors.push(
          `Invalid sort_order: ${media.sort_order} (expected: number >= 1)`,
        );
        hasValidationErrors = true;
      }

      if (hasValidationErrors) {
        console.error(
          `❌ Media Array ${index} validation failed:`,
          validationErrors,
        );
        console.error(`❌ Debug info for Media ${index}:`, media);
        allMediaValid = false;
      } else {
        console.log(`✅ Media Array ${index} validation passed`);
      }

      // URL format validation removed - not required for media upload
    });

    // Report on backend filename extraction success
    console.log(`📎 ===== BACKEND FILENAME EXTRACTION SUMMARY =====`);
    console.log(`📎 Total media items: ${payload.media.length}`);
    console.log(`📎 Items with backend filenames: ${backendFilenameCount}`);
    console.log(
      `📎 Backend filename extraction rate: ${((backendFilenameCount / payload.media.length) * 100).toFixed(1)}%`,
    );

    if (backendFilenameCount === payload.media.length) {
      console.log(`📎 ✅ All media items have backend filenames - PERFECT!`);
    } else if (backendFilenameCount > 0) {
      console.log(
        `📎 ⚠️ Partial backend filename extraction - some files may have generic names`,
      );
    } else {
      console.log(
        `📎 ❌ No backend filenames extracted - all files will have generic names`,
      );
    }

    if (allMediaValid) {
      console.log("✅ All media array items validated successfully");
      console.log(`✅ Backend will receive media array as expected`);
    } else {
      console.error(
        "❌ Some media array items failed validation - this may cause database save issues",
      );
    }
  }

  console.log("🔍 ===== PAYLOAD READY FOR BACKEND =====");
  return payload;
};

/**
 * Creates FormData for media file upload only
 * @param {Array} mediaFiles - Array of raw media files from picker
 * @param {string} postType - Type of post ("school-posts" or "class-posts")
 * @returns {FormData} FormData object for file upload
 */
export const createMediaUploadFormData = (
  mediaFiles,
  postType = "school-posts",
) => {
  // Validate input
  if (!Array.isArray(mediaFiles)) {
    console.error(
      "❌ createMediaUploadFormData: mediaFiles is not an array:",
      mediaFiles,
    );
    return new FormData();
  }

  console.log("📎 Creating FormData for media upload:", mediaFiles.length);
  console.log("📎 Raw media files:", mediaFiles);
  console.log("📎 Post type:", postType);

  const formData = new FormData();

  // Add post_type field as required by backend
  formData.append("post_type", postType);
  console.log("📎 Added post_type to FormData:", postType);

  mediaFiles.forEach((media, index) => {
    // Determine proper MIME type and filename from URI
    let mimeType = media.mimeType || media.type;

    // Enhanced filename extraction with explicit user intent priority
    let fileName = null;
    let filenameSource = "unknown";

    // Priority 1: Explicit user intent field (enhanced from picker)
    if (
      media.original_user_filename &&
      media.original_user_filename.trim() &&
      !media.original_user_filename.includes("temp-")
    ) {
      fileName = sanitizeFilename(media.original_user_filename.trim());
      filenameSource = "original_user_filename";
      console.log(`📎 Using original_user_filename: ${fileName}`);
    }
    // Priority 2: User-selected filename fields
    else if (media.name && media.name.trim() && !media.name.includes("temp-")) {
      fileName = sanitizeFilename(media.name.trim());
      filenameSource = "media.name";
      console.log(`📎 Using media.name: ${fileName}`);
    } else if (
      media.fileName &&
      media.fileName.trim() &&
      !media.fileName.includes("temp-")
    ) {
      fileName = sanitizeFilename(media.fileName.trim());
      filenameSource = "media.fileName";
      console.log(`📎 Using media.fileName: ${fileName}`);
    } else if (
      media.original_name &&
      media.original_name.trim() &&
      !media.original_name.includes("temp-")
    ) {
      fileName = sanitizeFilename(media.original_name.trim());
      filenameSource = "media.original_name";
      console.log(`📎 Using media.original_name: ${fileName}`);
    }

    // Priority 3: Smart URI extraction (avoid system-generated names)
    if (!fileName && media.uri) {
      const uriFilename = media.uri.split("/").pop() || `file_${index}`;
      // Only use URI filename if it seems meaningful
      if (
        uriFilename &&
        !uriFilename.includes("ImagePicker") &&
        !uriFilename.includes("temp-") &&
        uriFilename.length > 8
      ) {
        fileName = sanitizeFilename(uriFilename);
        filenameSource = "meaningful_uri";
        console.log(`📎 Using meaningful URI filename: ${fileName}`);
      }
    }

    // Priority 4: Smart readable fallback with timestamp
    if (!fileName) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hour = String(now.getHours()).padStart(2, "0");
      const minute = String(now.getMinutes()).padStart(2, "0");
      const second = String(now.getSeconds()).padStart(2, "0");

      const extension =
        media.type === "video"
          ? "mp4"
          : media.type === "image"
            ? "jpg"
            : "file";
      const mediaPrefix =
        media.type === "video"
          ? "Video"
          : media.type === "image"
            ? "Photo"
            : "File";

      fileName = `${mediaPrefix}_${year}_${month}_${day}_${hour}_${minute}_${second}.${extension}`;
      filenameSource = "smart_readable_fallback";
      console.log(`📎 Using smart readable fallback: ${fileName}`);
    }

    console.log(`📁 Enhanced FormData processing for file ${index}:`, {
      inputData: {
        original_user_filename: media.original_user_filename,
        name: media.name,
        fileName: media.fileName,
        original_name: media.original_name,
        type: media.type,
        mediaType: media.mediaType,
        mimeType: mimeType,
        uri: media.uri ? "present" : "missing",
      },
      processing: {
        finalFileName: fileName,
        filenameSource: filenameSource,
        userIntentPreserved:
          filenameSource.includes("user") || filenameSource.includes("name")
            ? "✅ YES"
            : "⚠️ GENERATED",
      },
      validation: {
        hasUserData: !!(
          media.original_user_filename ||
          media.name ||
          media.fileName
        ),
        isMeaningful: fileName.length > 5 && !fileName.startsWith("file_"),
        preservesIntent:
          !fileName.includes("temp-") && !fileName.includes("ImagePicker"),
      },
    });

    // Handle different media types and fix MIME types
    if (media.type === "video" || media.mediaType === "video") {
      // Video handling
      if (!mimeType || mimeType === "image/jpeg") {
        const extension = fileName.split(".").pop()?.toLowerCase();
        mimeType = getMediaMimeType("video", fileName);
        console.log(`🎥 Fixed video MIME type: ${extension} -> ${mimeType}`);
      }

      // Ensure proper file extension
      if (!fileName.includes(".")) {
        const extension = mimeType.includes("quicktime") ? "mov" : "mp4";
        fileName = `video_${Date.now()}_${index}.${extension}`;
        console.log(`🎥 Added video extension: ${fileName}`);
      }
    } else if (media.type === "image" || media.mediaType === "image") {
      // Image handling
      if (!mimeType) {
        mimeType = "image/jpeg";
        console.log(`🖼️ Default image MIME type: ${mimeType}`);
      }

      if (!fileName.includes(".")) {
        const extension = mimeType.includes("png") ? "png" : "jpg";
        fileName = `image_${Date.now()}_${index}.${extension}`;
        console.log(`🖼️ Added image extension: ${fileName}`);
      }
    } else if (media.type === "document" || media.mediaType === "document") {
      // Document handling
      if (!mimeType) {
        const extension = fileName.split(".").pop()?.toLowerCase();
        mimeType = getMediaMimeType("document", fileName);
        console.log(
          `📄 Detected document MIME type: ${extension} -> ${mimeType}`,
        );
      }
    }

    // Create enhanced file object with user intent preservation
    const fileObject = {
      uri: media.uri,
      type: mimeType,
      name: fileName,
      // Add metadata for backend processing
      original_user_filename: media.original_user_filename || fileName,
      filename_source: filenameSource,
    };

    console.log(`📁 Final enhanced file object ${index}:`, {
      name: fileObject.name,
      original_user_filename: fileObject.original_user_filename,
      filename_source: fileObject.filename_source,
      type: fileObject.type,
      uri: fileObject.uri?.substring(0, 50) + "...",
      size: media.size || media.fileSize || "unknown",
      userIntentPreserved:
        fileObject.name === fileObject.original_user_filename
          ? "✅ YES"
          : "⚠️ MODIFIED",
    });

    // Append each file with indexed field name (backend expects file_0, file_1, etc.)
    formData.append(`file_${index}`, fileObject);
  });

  console.log(
    `📦 FormData created with post_type: ${postType} and ${mediaFiles.length} files`,
  );
  return formData;
};

/**
 * Determines MIME type based on media type and filename
 * @param {string} mediaType - Media type (image, video, document)
 * @param {string} filename - Original filename
 * @returns {string} MIME type
 */
export const getMediaMimeType = (mediaType, filename) => {
  const extension = filename?.split(".").pop()?.toLowerCase();

  switch (mediaType) {
    case "image":
      switch (extension) {
        case "png":
          return "image/png";
        case "gif":
          return "image/gif";
        case "webp":
          return "image/webp";
        default:
          return "image/jpeg";
      }
    case "video":
      switch (extension) {
        case "mp4":
          return "video/mp4";
        case "mov":
          return "video/quicktime";
        case "avi":
          return "video/x-msvideo";
        default:
          return "video/mp4";
      }
    case "document":
      switch (extension) {
        case "pdf":
          return "application/pdf";
        case "doc":
          return "application/msword";
        case "docx":
          return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        case "txt":
          return "text/plain";
        default:
          return "application/octet-stream";
      }
    default:
      return "application/octet-stream";
  }
};

/**
 * Prepares hashtags array from selected tag IDs
 * @param {Array} selectedTagIds - Array of selected hashtag IDs
 * @param {Array} availableTags - Array of available tag objects
 * @returns {Array} Array of hashtag strings without # symbol
 */
export const prepareHashtags = (selectedTagIds, availableTags) => {
  if (!Array.isArray(selectedTagIds) || !Array.isArray(availableTags)) {
    return [];
  }

  return selectedTagIds
    .map((tagId) => {
      const tag = availableTags.find((t) => t.id === tagId);
      return tag ? tag.label.replace("#", "") : null;
    })
    .filter(Boolean);
};

/**
 * Validates post data before submission
 * @param {Object} postData - Post data to validate
 * @param {boolean} requireGrade - Whether grade is required (for class posts)
 * @returns {Object} Validation result with isValid and error message
 */
export const validatePostData = (postData, requireGrade = false) => {
  if (!postData.title?.trim()) {
    return { isValid: false, error: "Please enter a title for your post" };
  }

  if (!postData.content?.trim()) {
    return { isValid: false, error: "Please enter some content for your post" };
  }

  if (!postData.category) {
    return { isValid: false, error: "Please select a category for your post" };
  }

  if (requireGrade && !postData.grade) {
    return {
      isValid: false,
      error: "Please select a grade for your class post",
    };
  }

  if (!postData.author_id) {
    return { isValid: false, error: "User authentication required" };
  }

  return { isValid: true };
};

/**
 * Process media files for upload
 * @param {Array} selectedMedia - Media files from picker
 * @returns {Array} Processed media files ready for upload
 */
export const processMediaForUpload = (selectedMedia) => {
  if (!Array.isArray(selectedMedia)) {
    return [];
  }

  return selectedMedia.map((media) => ({
    uri: media.uri,
    name: media.name || media.fileName || `file_${Date.now()}`,
    type: getMediaMimeType(media.type, media.name || media.fileName),
    size: media.size || 0,
    mediaType: media.type,
  }));
};

export default {
  createPostData,
  createMediaUploadFormData,
  getMediaMimeType,
  prepareHashtags,
  validatePostData,
  processMediaForUpload,
  mapCategoryToType,
};
