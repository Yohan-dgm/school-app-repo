import Constants from "expo-constants";

// Get API base URL from environment
const API_BASE_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BASE_URL_API_SERVER_1 ||
  process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1;

/**
 * Get MIME type based on file extension
 */
const getMimeType = (filename: string): string => {
  if (!filename) return "application/octet-stream";

  const extension = filename.toLowerCase().split(".").pop();

  switch (extension) {
    // Image types
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";

    // Video types
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "ogg":
      return "video/ogg";
    case "avi":
      return "video/avi";
    case "mov":
      return "video/quicktime";
    case "wmv":
      return "video/x-ms-wmv";

    // PDF
    case "pdf":
      return "application/pdf";

    // Default
    default:
      return "application/octet-stream";
  }
};

/**
 * Build proper media URL for activity feed media
 * Format: https://school-app.toyar.lk/get-activity-feed-media?url=/path/to/media&filename=file.ext&mime_type=type/subtype
 */
export const buildActivityFeedMediaUrl = (
  mediaPath: string,
  filename: string,
): string => {
  if (!mediaPath || !filename) {
    console.warn(
      "⚠️ buildActivityFeedMediaUrl: Missing mediaPath or filename",
      {
        mediaPath,
        filename,
      },
    );
    return "";
  }

  // Ensure base URL doesn't end with slash
  const baseUrl = API_BASE_URL?.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;

  if (!baseUrl) {
    console.error("❌ buildActivityFeedMediaUrl: No API base URL configured");
    return "";
  }

  // Clean up the media path to match expected format
  let cleanPath = mediaPath;

  // Remove /storage prefix if present
  if (cleanPath.startsWith("/storage/")) {
    cleanPath = cleanPath.replace("/storage/", "/");
  }

  // Remove filename from path if it's included (path should be directory only)
  if (cleanPath.includes(filename)) {
    cleanPath = cleanPath.replace("/" + filename, "");
  }

  // Remove any trailing slashes
  cleanPath = cleanPath.replace(/\/$/, "");

  // Get MIME type from filename
  const mimeType = getMimeType(filename);

  // Build the proper media URL with query parameters
  // Note: Do not URL encode the path in the url parameter, only filename and mime_type
  const mediaUrl = `${baseUrl}/get-activity-feed-media?url=${cleanPath}&filename=${encodeURIComponent(filename)}&mime_type=${encodeURIComponent(mimeType)}`;

  // console.log("🔗 Built media URL:", {
  //   originalPath: mediaPath,
  //   cleanedPath: cleanPath,
  //   filename,
  //   mimeType,
  //   finalUrl: mediaUrl,
  // });

  return mediaUrl;
};

/**
 * Build thumbnail URL for video media
 * Some video endpoints might have specific thumbnail endpoints
 */
export const buildVideoThumbnailUrl = (
  thumbnailPath: string,
  filename: string,
): string => {
  if (!thumbnailPath || !filename) {
    console.warn(
      "⚠️ buildVideoThumbnailUrl: Missing thumbnailPath or filename",
      {
        thumbnailPath,
        filename,
      },
    );
    return "";
  }

  // For now, use the same media endpoint for thumbnails
  // If backend has a separate thumbnail endpoint, modify this function
  return buildActivityFeedMediaUrl(thumbnailPath, filename);
};

/**
 * Build proper user profile image URL using the same pattern as activity feed media
 * Format: https://school-app.toyar.lk/get-user-profile-image?id=123&filename=file.ext&mime_type=image/jpeg
 * Or: https://school-app.toyar.lk/get-user-profile-image?url=/path/to/image&filename=file.ext&mime_type=image/jpeg
 */
export const buildUserProfileImageUrl = (profileImage: {
  id: number;
  filename: string;
  public_path?: string;
  full_url?: string;
  file_path?: string;
}): string => {
  if (!profileImage || !profileImage.id) {
    // console.warn("⚠️ buildUserProfileImageUrl: Missing profile image data", {
    //   profileImage,
    // });
    return "";
  }

  // Ensure base URL doesn't end with slash
  const baseUrl = API_BASE_URL?.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;

  if (!baseUrl) {
    console.error("❌ buildUserProfileImageUrl: No API base URL configured");
    return "";
  }

  // Get filename - use provided filename or extract from paths
  let filename = profileImage.filename;
  if (!filename) {
    // Try to extract filename from public_path or full_url
    if (profileImage.public_path) {
      filename = profileImage.public_path.split("/").pop() || "profile.jpg";
    } else if (profileImage.full_url) {
      filename = profileImage.full_url.split("/").pop() || "profile.jpg";
    } else {
      filename = `profile_${profileImage.id}.jpg`; // Default filename
    }
  }

  // Get MIME type from filename
  const mimeType = getMimeType(filename);

  // Build URL using the same pattern as activity feed media
  // Try using public_path or full_url first, fallback to ID-based approach
  let mediaUrl: string;

  if (profileImage.public_path) {
    // Remove leading slash from public_path for consistency
    const cleanPath = profileImage.public_path.startsWith("/")
      ? profileImage.public_path.substring(1)
      : profileImage.public_path;

    mediaUrl = `${baseUrl}/get-user-profile-image?url=${cleanPath}&filename=${encodeURIComponent(filename)}&mime_type=${encodeURIComponent(mimeType)}`;
  } else if (profileImage.full_url) {
    // Handle full_url - remove filename if included
    let cleanPath = profileImage.full_url;
    if (cleanPath.includes(filename)) {
      cleanPath = cleanPath.replace("/" + filename, "");
    }
    // Remove leading slash for consistency
    cleanPath = cleanPath.startsWith("/") ? cleanPath.substring(1) : cleanPath;

    mediaUrl = `${baseUrl}/get-user-profile-image?url=${cleanPath}&filename=${encodeURIComponent(filename)}&mime_type=${encodeURIComponent(mimeType)}`;
  } else {
    // Fallback to ID-based approach
    mediaUrl = `${baseUrl}/get-user-profile-image?id=${profileImage.id}&filename=${encodeURIComponent(filename)}&mime_type=${encodeURIComponent(mimeType)}`;
  }

  // console.log("🔗 Built user profile image URL:", {
  //   profileImage,
  //   filename,
  //   mimeType,
  //   finalUrl: mediaUrl,
  // });

  return mediaUrl;
};

/**
 * Validate if a URL is a proper media URL
 */
export const isValidMediaUrl = (url: string): boolean => {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    return (
      urlObj.pathname.includes("get-activity-feed-media") ||
      urlObj.pathname.includes("get-user-profile-image") ||
      urlObj.href.startsWith("http://") ||
      urlObj.href.startsWith("https://")
    );
  } catch {
    return false;
  }
};

/**
 * Build proper student attachment image URL using the same pattern as student profile pictures
 * Uses the dedicated student images server and attachment ID-based approach
 * Format: https://nexis-college-sms-staging-b.solovosystems.com/get-student-attachment-data?student_attachment_id=123
 */
export const buildStudentAttachmentImageUrl = (
  attachmentId: number,
): string => {
  if (!attachmentId) {
    console.warn("⚠️ buildStudentAttachmentImageUrl: Missing attachment ID", {
      attachmentId,
    });
    return "";
  }

  // Use the student images server (same as studentProfileUtils.js)
  const studentImagesBaseUrl =
    process.env.EXPO_PUBLIC_BASE_URL_STUDENT_IMAGES ||
    "https://nexis-college-sms-staging-b.solovosystems.com";

  if (!studentImagesBaseUrl) {
    console.error(
      "❌ buildStudentAttachmentImageUrl: No student images base URL configured",
    );
    return "";
  }

  // Build URL following the same pattern as getStudentProfilePicture()
  const mediaUrl = `${studentImagesBaseUrl}/get-student-attachment-data?student_attachment_id=${attachmentId}`;

  console.log("📷 Built student attachment URL:", {
    attachmentId,
    studentImagesBaseUrl,
    finalUrl: mediaUrl,
  });

  return mediaUrl;
};

export default {
  buildActivityFeedMediaUrl,
  buildVideoThumbnailUrl,
  buildUserProfileImageUrl,
  buildStudentAttachmentImageUrl,
  isValidMediaUrl,
  getMimeType,
};
