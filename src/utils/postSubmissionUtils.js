/**
 * Utility functions for post submission with proper JSON structure
 * Maintains backend compatibility while fixing media upload issues
 */

import {
  mapCategoryToType,
  prepareHashtags,
  createPostData as createPostDataFromUtils,
  processMediaForUpload,
} from "./postUtils.js";
import { sanitizeFilename } from "./imageUtils.js";

/**
 * Creates JSON payload for school post submission following backend API requirements
 * Uses two-step process: upload media first, then create post with metadata
 * @param {Object} postData - Post data (title, content, category, etc.)
 * @param {Array} uploadedMediaData - Array of uploaded media metadata from upload API
 * @param {Array} selectedTags - Array of selected tag IDs
 * @param {Array} availableTags - Array of available tag objects
 * @returns {Object} JSON object ready for API submission
 */
export const createSchoolPostPayload = (
  postData,
  uploadedMediaData = [],
  selectedTags = [],
  availableTags = [],
) => {
  console.log("🏫 Creating school post JSON payload with data:", postData);
  console.log("📎 Uploaded media metadata:", uploadedMediaData?.length || 0);

  // Prepare hashtags as array of strings
  const hashtags = prepareHashtags(selectedTags, availableTags);

  // Create JSON payload matching backend API requirements exactly
  const jsonPayload = {
    category: postData.category || "announcement",
    title: postData.title || "",
    content: postData.content || "",
    author_id: postData.author_id || 0,
    hashtags: hashtags, // Array of strings
    media: uploadedMediaData.map((media, index) => ({
      type: media.type || "image",
      url: media.url || "",
      filename: media.filename || media.name || `file_${index}`,
      size: media.size || 0,
      sort_order: index,
    })),
  };

  console.log("📦 Created JSON payload:", JSON.stringify(jsonPayload, null, 2));
  return jsonPayload;
};

/**
 * Creates JSON payload for class post submission following backend API requirements
 * Uses two-step process: upload media first, then create post with metadata
 * @param {Object} postData - Post data (title, content, category, grade, class_id, etc.)
 * @param {Array} uploadedMediaData - Array of uploaded media metadata from upload API
 * @param {Array} selectedTags - Array of selected tag IDs
 * @param {Array} availableTags - Array of available tag objects
 * @returns {Object} JSON object ready for API submission
 */
export const createClassPostPayload = (
  postData,
  uploadedMediaData = [],
  selectedTags = [],
  availableTags = [],
) => {
  console.log("🎓 Creating class post JSON payload with data:", postData);
  console.log("📎 Uploaded media metadata:", uploadedMediaData?.length || 0);

  // Prepare hashtags as array of strings
  const hashtags = prepareHashtags(selectedTags, availableTags);

  // Create JSON payload matching backend API requirements exactly
  const jsonPayload = {
    category: postData.category || "announcement",
    title: postData.title || "",
    content: postData.content || "",
    author_id: postData.author_id || 0,
    hashtags: hashtags, // Array of strings
    media: uploadedMediaData.map((media, index) => ({
      type: media.type || "image",
      url: media.url || "",
      filename: media.filename || media.name || `file_${index}`,
      size: media.size || 0,
      sort_order: index,
    })),
    // Class-specific fields
    class_id: postData.class_id || null,
    grade: postData.grade || null,
  };

  console.log(
    "📦 Created class JSON payload:",
    JSON.stringify(jsonPayload, null, 2),
  );
  return jsonPayload;
};

/**
 * Validates post data before FormData creation
 * @param {Object} postData - Post data to validate
 * @param {boolean} requireGrade - Whether grade is required (for class posts)
 * @returns {Object} Validation result with isValid and error message
 */
export const validatePostForSubmission = (postData, requireGrade = false) => {
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
 * Creates FormData for direct post creation with media (recommended approach)
 * @param {Object} postData - Post data (title, content, category, etc.)
 * @param {Array} selectedMedia - Array of media files from picker
 * @param {Array} selectedTags - Array of selected tag IDs
 * @param {Array} availableTags - Array of available tag objects
 * @param {string} postType - Post type: "school-posts" or "class-posts"
 * @returns {FormData} FormData object for direct post creation with media
 */
export const createPostWithMediaFormData = (
  postData,
  selectedMedia = [],
  selectedTags = [],
  availableTags = [],
  postType = "school-posts",
) => {
  console.log("📎 Creating FormData for direct post creation with media");
  console.log("📎 Post data:", postData);
  console.log("📎 Selected media:", selectedMedia?.length || 0);
  console.log("📎 Post type:", postType);

  const formData = new FormData();

  // Add post data fields
  formData.append("title", postData.title || "");
  formData.append("content", postData.content || "");
  formData.append("type", mapCategoryToType(postData.category));
  formData.append("category", postData.category || "");
  formData.append("author_id", postData.author_id || "");

  // Add class-specific fields
  if (postData.class_id) {
    formData.append("class_id", postData.class_id);
  }
  if (postData.grade) {
    formData.append("grade", postData.grade);
  }

  // Add hashtags
  const hashtags = prepareHashtags(selectedTags, availableTags);
  hashtags.forEach((hashtag) => {
    formData.append("hashtags[]", hashtag);
  });

  // Add media files if any (using simple pattern like working profile photo)
  if (selectedMedia && selectedMedia.length > 0) {
    console.log(
      "📎 Processing media files using working profile photo pattern...",
    );

    selectedMedia.forEach((media, index) => {
      // Preserve user-selected filename with priority system
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

      // Priority 2: Backend filename
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

      console.log(`📁 Adding media ${index}:`, {
        userSelectedNames: {
          name: media.name,
          fileName: media.fileName,
          original_name: media.original_name,
          original_filename: media.original_filename,
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
        type: media.type,
        uri: media.uri ? "present" : "missing",
        size: media.size,
      });

      // Create file object exactly like working profile photo upload
      const fileObject = {
        uri: media.uri,
        type: media.mimeType || media.type || "image/jpeg",
        name: filename, // Use preserved user-selected filename
      };

      // Use simple field naming like profile photo (not arrays)
      formData.append(`media_${index}`, fileObject);
    });

    console.log(
      `📦 Added ${selectedMedia.length} media files using simple field pattern (media_0, media_1, etc.)`,
    );
  } else {
    console.log("📝 No media files to add");
  }

  // Simplified debugging like profile photo
  console.log("🔍 FormData created (following profile photo pattern):");
  console.log("  - FormData instance:", formData instanceof FormData);
  console.log(
    "  - Media fields:",
    selectedMedia.map((_, index) => `media_${index}`),
  );
  console.log("  - Total files:", selectedMedia.length);

  return formData;
};

/**
 * Legacy function - creates FormData for standalone media upload
 * @deprecated Use createPostWithMediaFormData instead for direct upload approach
 */
export const createMediaFormData = (
  selectedMedia,
  postType = "school-posts",
) => {
  console.log("⚠️ WARNING: Using deprecated standalone upload approach");
  console.log(
    "📎 Creating FormData for media upload:",
    selectedMedia?.length || 0,
  );
  console.log("📎 Post type:", postType);

  if (
    !selectedMedia ||
    !Array.isArray(selectedMedia) ||
    selectedMedia.length === 0
  ) {
    console.log("⚠️ No media files to upload");
    return new FormData();
  }

  const processedMedia = processMediaForUpload(selectedMedia);
  const formData = createMediaUploadFormData(processedMedia);

  // Add required post_type field
  formData.append("post_type", postType);
  console.log(
    "📎 FormData created with",
    processedMedia.length,
    "files and post_type:",
    postType,
  );

  return formData;
};

/**
 * Validates media files according to backend requirements
 * @param {Array} selectedMedia - Array of media files from picker
 * @returns {Object} Validation result with isValid and error message
 */
export const validateMediaFiles = (selectedMedia) => {
  if (!selectedMedia || !Array.isArray(selectedMedia)) {
    return { isValid: true }; // No media is valid
  }

  console.log("🔍 Validating media files:", selectedMedia.length);

  // Backend limits: max 10 files
  if (selectedMedia.length > 10) {
    return {
      isValid: false,
      error: `Too many files selected. Maximum allowed is 10 files, but you selected ${selectedMedia.length} files.`,
    };
  }

  // Allowed file types from backend: jpg,jpeg,png,webp,mp4,mov,avi,pdf
  const allowedTypes = [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "mp4",
    "mov",
    "avi",
    "pdf",
  ];
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "application/pdf",
  ];

  // Max file size: 50MB (backend: 51200KB = 50MB)
  const maxFileSize = 50 * 1024 * 1024; // 50MB in bytes

  for (let i = 0; i < selectedMedia.length; i++) {
    const media = selectedMedia[i];
    console.log(`🔍 Validating media ${i}:`, {
      name: media.name,
      fileName: media.fileName,
      size: media.size,
      fileSize: media.fileSize,
      type: media.type,
      mimeType: media.mimeType,
      uri: media.uri ? "present" : "missing",
    });

    const fileName = media.name || media.fileName || `file_${i}`;
    const fileSize = media.size || media.fileSize || 0;
    const mimeType = media.mimeType || media.type || "";

    // Check file extension (more lenient - allow files without extensions for images/videos)
    const fileExtension = fileName.includes(".")
      ? fileName.split(".").pop()?.toLowerCase()
      : "";

    // For files without extensions, validate by type/mimeType
    if (!fileExtension && !mimeType) {
      console.warn(
        `⚠️ File "${fileName}" has no extension or MIME type, skipping extension validation`,
      );
    } else if (fileExtension && !allowedTypes.includes(fileExtension)) {
      // Check if it's a common alternative extension
      const commonExtensions = {
        jpg: ["jpeg", "jpe"],
        jpeg: ["jpg", "jpe"],
        mov: ["qt"],
        mp4: ["m4v"],
        pdf: ["PDF"],
      };

      const isValidAlternative = Object.values(commonExtensions).some(
        (alternatives) => alternatives.includes(fileExtension),
      );

      if (!isValidAlternative) {
        return {
          isValid: false,
          error: `File "${fileName}" has an unsupported format (${fileExtension}). Allowed formats: JPG, PNG, WEBP, MP4, MOV, AVI, PDF.`,
        };
      }
    }

    // Check MIME type if available (more lenient)
    if (mimeType) {
      const normalizedMimeType = mimeType.toLowerCase();
      const isValidMimeType = allowedMimeTypes.some(
        (allowed) =>
          normalizedMimeType.includes(allowed) ||
          allowed.includes(normalizedMimeType),
      );

      if (!isValidMimeType) {
        // Check for common MIME type variations
        const isImageType = normalizedMimeType.startsWith("image/");
        const isVideoType = normalizedMimeType.startsWith("video/");
        const isPdfType = normalizedMimeType.includes("pdf");

        if (!isImageType && !isVideoType && !isPdfType) {
          return {
            isValid: false,
            error: `File "${fileName}" has an unsupported type (${mimeType}). Please select valid image, video, or PDF files.`,
          };
        }
      }
    }

    // Check file size (only if size is available and > 0)
    if (fileSize > 0 && fileSize > maxFileSize) {
      const fileSizeMB = Math.round(fileSize / (1024 * 1024));
      return {
        isValid: false,
        error: `File "${fileName}" is too large (${fileSizeMB}MB). Maximum file size is 50MB.`,
      };
    }

    // Check if file has URI (required for upload)
    if (!media.uri) {
      return {
        isValid: false,
        error: `File "${fileName}" is missing file data. Please try selecting the file again.`,
      };
    }

    console.log(`✅ Media ${i} validated successfully:`, fileName);
  }

  console.log("✅ All media files validated successfully");
  return { isValid: true };
};

/**
 * Determines MIME type based on media type and filename
 * @param {string} mediaType - Media type (image, video, document)
 * @param {string} filename - Original filename
 * @returns {string} MIME type
 */
const getMediaMimeType = (mediaType, filename) => {
  const extension = filename?.split(".").pop()?.toLowerCase();

  switch (mediaType) {
    case "image":
      switch (extension) {
        case "png":
          return "image/png";
        case "jpg":
        case "jpeg":
          return "image/jpeg";
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
        case "qt":
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
        default:
          return "application/octet-stream";
      }
    default:
      return "application/octet-stream";
  }
};

/**
 * Creates FormData for media file upload only (matching backup implementation)
 * @param {Array} mediaFiles - Array of raw media files from picker
 * @returns {FormData} FormData object for file upload
 */
export const createMediaUploadFormData = (mediaFiles) => {
  // Validate input
  if (!Array.isArray(mediaFiles)) {
    console.error(
      "❌ createMediaUploadFormData: mediaFiles is not an array:",
      mediaFiles,
    );
    return new FormData();
  }

  console.log("📎 Creating FormData for media upload:", mediaFiles.length);

  const formData = new FormData();

  mediaFiles.forEach((media, index) => {
    // Determine proper MIME type based on file extension and media type
    let mimeType = media.mimeType || media.type;

    // Preserve user-selected filename with priority system
    let fileName = null;

    // Priority 1: User-selected filename (preserve user intent)
    if (media.name && !media.name.includes("temp-")) {
      fileName = sanitizeFilename(media.name);
    } else if (media.fileName && !media.fileName.includes("temp-")) {
      fileName = sanitizeFilename(media.fileName);
    } else if (media.original_name && !media.original_name.includes("temp-")) {
      fileName = sanitizeFilename(media.original_name);
    } else if (
      media.original_filename &&
      !media.original_filename.includes("temp-")
    ) {
      fileName = sanitizeFilename(media.original_filename);
    }

    // Priority 2: Backend filename
    if (!fileName) {
      const backendFilename =
        media.filename || media.temp_filename || media.saved_filename;
      if (backendFilename) {
        fileName = sanitizeFilename(backendFilename);
      }
    }

    // Priority 3: Fallback
    if (!fileName) {
      const fallbackFilename = media.fileName || media.name;
      if (fallbackFilename) {
        fileName = sanitizeFilename(fallbackFilename);
      }
    }

    // Fix file extension and MIME type for videos
    if (media.mediaType === "video" || media.type === "video") {
      if (!mimeType || mimeType === "image/jpeg") {
        // Detect video MIME type from filename
        mimeType = getMediaMimeType("video", fileName);
      }

      // Ensure video files have proper extensions
      if (!fileName?.includes(".")) {
        const extension = mimeType.includes("quicktime") ? "mov" : "mp4";
        fileName = `video_${Date.now()}_${index}.${extension}`;
      }
    } else if (media.mediaType === "image" || media.type === "image") {
      mimeType = mimeType || "image/jpeg";
      if (!fileName?.includes(".")) {
        fileName = `image_${Date.now()}_${index}.jpg`;
      }
    } else if (media.mediaType === "document") {
      mimeType = mimeType || "application/octet-stream";
    }

    // Create file object with proper MIME type
    const fileObject = {
      uri: media.uri,
      type: mimeType,
      name: fileName,
    };

    console.log(`📁 Adding file ${index + 1}:`, {
      finalFileName: fileObject.name,
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
                : media.filename || media.temp_filename || media.saved_filename
                  ? "BACKEND"
                  : "FALLBACK",
      userSelectedNames: {
        name: media.name,
        fileName: media.fileName,
        original_name: media.original_name,
        original_filename: media.original_filename,
      },
      type: fileObject.type,
      uri: fileObject.uri.substring(0, 50) + "...",
      originalSize: media.fileSize || media.size || 0,
    });

    // Append each file with indexed field name (matching backup)
    formData.append(`file_${index}`, fileObject);
  });

  return formData;
};

/**
 * Converts tag IDs to hashtag strings
 * @param {Array} selectedTags - Array of selected tag IDs
 * @param {Array} availableTags - Array of available tag objects
 * @returns {Array} Array of hashtag strings
 */
export const convertTagsToHashtags = (selectedTags, availableTags) => {
  if (!Array.isArray(selectedTags) || !Array.isArray(availableTags)) {
    return [];
  }

  return selectedTags
    .map((tagId) => {
      const tag = availableTags.find((t) => t.id === tagId);
      return tag ? tag.label.replace("#", "") : null;
    })
    .filter(Boolean);
};

// Re-export as named export
export const createPostData = createPostDataFromUtils;

// Re-export the URL formatting utility from postUtils
export { formatMediaStorageUrl } from "./postUtils.js";

/**
 * Generates a unique idempotency key for post creation
 * @returns {string} Unique key
 */
export const generateIdempotencyKey = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`;
};

export default {
  createSchoolPostPayload,
  createClassPostPayload,
  createPostWithMediaFormData,
  createMediaFormData,
  createPostData: createPostDataFromUtils, // Two-step process
  createMediaUploadFormData, // Two-step process
  convertTagsToHashtags, // Two-step process
  validatePostForSubmission,
  validateMediaFiles,
  generateIdempotencyKey,
};
