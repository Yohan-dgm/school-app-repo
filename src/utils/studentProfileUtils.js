import { ENV_CONFIG } from "../config/env";
import store from "../state-store/store";

/**
 * Utility function to strip HTML tags from text content
 * @param {string} htmlString - HTML content string
 * @returns {string} - Plain text without HTML tags
 */
export const stripHtmlTags = (htmlString) => {
  if (!htmlString || typeof htmlString !== "string") return "";

  // Remove HTML tags and decode common HTML entities
  return htmlString
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

/**
 * Format date from YYYY-MM-DD to readable format
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} - Formatted date string
 */
export const formatStudentDate = (dateString) => {
  if (!dateString) return "Not provided";

  try {
    const [year, month, day] = dateString.split("-").map(Number);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return dateString; // Return original if parsing fails
    }

    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    console.error("Error formatting student date:", error);
    return dateString;
  }
};

/**
 * Helper function to safely get value or return fallback
 * @param {any} value - Value to check
 * @param {string} fallback - Fallback text for empty values
 * @returns {string} - Value or fallback
 */
export const getValueOrFallback = (value, fallback = "Not provided") => {
  if (!value || value === "" || value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    const stripped = stripHtmlTags(value);
    return stripped || fallback;
  }

  return String(value);
};

// External server URL for student profile pictures (separate from main API)
const PROFILE_PICTURE_SERVER_URL = `${ENV_CONFIG.BASE_URL_STUDENT_IMAGES}/get-student-attachment-data`;

// Debug log the server URLs
console.log("🖼️ Profile Picture Server URLs:", {
  BASE_URL_API_SERVER: ENV_CONFIG.BASE_URL_API_SERVER,
  BASE_URL_STUDENT_IMAGES: ENV_CONFIG.BASE_URL_STUDENT_IMAGES,
  PROFILE_PICTURE_SERVER_URL,
});

// Test if the main API server is accessible
fetch(`${ENV_CONFIG.BASE_URL_API_SERVER}/api/test`)
  .then((response) => {
    console.log("🌐 Main API Server Test:", {
      url: `${ENV_CONFIG.BASE_URL_API_SERVER}/api/test`,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
    });
    return response.text();
  })
  .then((text) => {
    if (text.includes("<!DOCTYPE html>")) {
      console.warn("⚠️ Main API Server returning HTML instead of JSON");
    }
  })
  .catch((error) => {
    console.error("❌ Main API Server not accessible:", error.message);
  });

/**
 * Utility function to get student profile picture URL from student attachment
 * @param {Object} student - Student object from backend with attachment property
 * @returns {Object|null} - Image source object with URI or null if no valid attachment
 */
export const getStudentProfilePicture = (student) => {
  // console.log(`🖼️ getStudentProfilePicture - Student data:`, {
  //   student_id: student?.id,
  //   student_name: student?.full_name || student?.student_calling_name,
  //   attachment: student?.attachment,
  //   attachment_id: student?.attachment?.id,
  //   attachments: student?.attachments, // Check if it's plural
  //   attachment_keys: student?.attachment ? Object.keys(student.attachment) : [],
  //   attachments_length: student?.attachments ? student.attachments.length : 0,
  //   full_student_object: student,
  // });

  let attachmentId = null;

  // Try different possible data structures
  if (student?.attachment?.id) {
    // Single attachment object
    attachmentId = student.attachment.id;
    console.log(
      `🖼️ Found attachment ID from student.attachment.id: ${attachmentId}`,
    );
  } else if (
    student?.attachments &&
    Array.isArray(student.attachments) &&
    student.attachments.length > 0
  ) {
    // Array of attachments - use the first one or most recent
    const currentYear = new Date().getFullYear();

    // Try to find current year attachment first
    const currentYearAttachment = student.attachments.find((attachment) => {
      if (!attachment.created_at) return false;
      const attachmentYear = new Date(attachment.created_at).getFullYear();
      return attachmentYear === currentYear;
    });

    if (currentYearAttachment) {
      attachmentId = currentYearAttachment.id;
      console.log(`🖼️ Found current year attachment ID: ${attachmentId}`);
    } else {
      // Use most recent attachment
      const sortedAttachments = [...student.attachments].sort((a, b) => {
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      if (sortedAttachments[0]?.id) {
        attachmentId = sortedAttachments[0].id;
        console.log(`🖼️ Found most recent attachment ID: ${attachmentId}`);
      }
    }
  } else if (
    student?.student_attachment_list &&
    Array.isArray(student.student_attachment_list) &&
    student.student_attachment_list.length > 0
  ) {
    // Handle student_attachment_list structure from API
    console.log(
      `🖼️ Processing student_attachment_list with ${student.student_attachment_list.length} attachments`,
    );

    // Filter for image attachments only
    const imageAttachments = student.student_attachment_list.filter(
      (attachment) => {
        const fileType = attachment.file_type?.toLowerCase();
        const fileName = attachment.file_name?.toLowerCase();
        return (
          fileType === "image" ||
          fileType?.startsWith("image/") ||
          fileName?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)
        );
      },
    );

    console.log(
      `🖼️ Found ${imageAttachments.length} image attachments out of ${student.student_attachment_list.length} total`,
    );

    if (imageAttachments.length > 0) {
      // Use most recent image attachment or first one if no upload_date
      const sortedImageAttachments = [...imageAttachments].sort((a, b) => {
        if (!a.upload_date) return 1;
        if (!b.upload_date) return -1;
        return new Date(b.upload_date) - new Date(a.upload_date);
      });

      attachmentId = sortedImageAttachments[0].id;
      console.log(
        `🖼️ Selected attachment from student_attachment_list: ID ${attachmentId}, file: ${sortedImageAttachments[0].file_name}`,
      );
    } else {
      // No image attachments found, but try first attachment anyway
      attachmentId = student.student_attachment_list[0]?.id;
      console.log(
        `🖼️ No image attachments found, using first attachment: ID ${attachmentId}`,
      );
    }
  }

  // Check if we found a valid attachment ID
  if (!attachmentId) {
    // console.log(
    //   `🖼️ getStudentProfilePicture - No attachment found for student ${student?.id}`
    // );
    return null;
  }

  const profileUrl = `${PROFILE_PICTURE_SERVER_URL}?student_attachment_id=${attachmentId}`;
  // console.log(
  //   `🖼️ getStudentProfilePicture - Generated profile URL:`,
  //   profileUrl
  // );

  // Test the URL by making an authenticated fetch request
  const token = store.getState().app.token;
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  fetch(profileUrl, { headers })
    .then((response) => {
      // console.log(`🖼️ URL Test Response:`, {
      //   url: profileUrl,
      //   status: response.status,
      //   statusText: response.statusText,
      //   ok: response.ok,
      //   hasToken: !!token,
      //   headers: Object.fromEntries(response.headers.entries()),
      // });
    })
    .catch((error) => {
      console.log(`🖼️ URL Test Error:`, {
        url: profileUrl,
        error: error.message,
        hasToken: !!token,
      });
    });

  // Construct URL using your backend route pattern with authentication headers
  return {
    uri: profileUrl,
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  };
};

/**
 * Get fallback profile image for students
 * @returns {Object} - Image source object with URI for default profile image
 */
export const getDefaultStudentProfileImage = () => {
  // Use the student images server with fallback route, similar to your web example
  const fallbackUrl = `${ENV_CONFIG.BASE_URL_STUDENT_IMAGES}/profile.jpg`;
  console.log("🖼️ Using fallback URL:", fallbackUrl);

  // Get the authentication token
  const fallbackToken = store.getState().app.token;

  return {
    uri: fallbackUrl,
    headers: fallbackToken
      ? {
          Authorization: `Bearer ${fallbackToken}`,
        }
      : undefined,
  };
};

/**
 * Get local fallback profile image for students (if server fallback fails)
 * @returns {Object} - Require object for local default profile image
 */
export const getLocalFallbackProfileImage = () => {
  return require("../assets/images/sample-profile.png");
};

// Note: User profile image handling has been moved to mediaUtils.ts
// using the same proven pattern as activity feed media.
// The complex authentication header approach has been replaced
// with the simple media URL pattern for consistency.

/**
 * Transform student data with profile picture handling
 * @param {Object} student - Student object from backend
 * @param {Object} sessionData - Session data for user context
 * @returns {Object} - Transformed student object with profile picture
 */
export const transformStudentWithProfilePicture = (student, sessionData) => {
  const callingName =
    student.student_calling_name ||
    (student.full_name ? student.full_name.split(" ")[0] : "Student");

  // Get profile picture from student attachment
  const profilePictureSource = getStudentProfilePicture(student);

  return {
    id: student.id,
    student_id: student.id,
    user_id: sessionData?.data?.id || sessionData?.id,
    name: student.full_name,
    student_calling_name: callingName,
    profileImage: profilePictureSource || getDefaultStudentProfileImage(),
    studentId: student.admission_number,
    admissionNumber: student.admission_number,
    campus: student.grade_level_class?.name || "Unknown Campus",
    grade: student.grade_level?.name || "Unknown Grade",
    class_id: student.grade_level_class?.id || null,
    gender: student.gender,
    dateOfBirth: student.date_of_birth,
    schoolHouse: student.school_house?.name || "Unknown House",
    guardianInfo: student.guardian_info,

    // Additional detailed information from student_list
    fullNameWithTitle: getValueOrFallback(
      student.full_name_with_title,
      student.full_name,
    ),
    formattedDateOfBirth: formatStudentDate(student.date_of_birth),
    joinedDate: formatStudentDate(student.joined_date),
    joinedTermId: student.joined_term_id,
    bloodGroup: getValueOrFallback(student.blood_group),
    specialHealthConditions: getValueOrFallback(
      student.special_health_conditions,
    ),
    specialConditions: getValueOrFallback(student.special_conditions),
    studentAddress: getValueOrFallback(student.student_address),
    studentPhone: getValueOrFallback(student.student_phone),
    studentEmail: getValueOrFallback(student.student_email),
    fatherFullName: getValueOrFallback(student.father_full_name),
    motherFullName: getValueOrFallback(student.mother_full_name),
    guardianFullName: getValueOrFallback(student.guardian_full_name),

    // Structured data objects
    gradeLevel: student.grade_level,
    gradeLevelClass: student.grade_level_class,
    schoolHouseData: student.school_house,
    guardianInfoData: student.guardian_info,
    paymentInfo: student.payment_info,
    studentRoleList: student.student_role_list || [],
    studentAchievementList: student.student_achievement_list || [],
    studentSportList: student.student_sport_list || [],

    // Create basic timeline from available data
    timeline: [
      {
        year: new Date().getFullYear().toString(),
        grade: student.grade_level?.name || "Current Grade",
        gpa: "N/A", // Not available in backend data
        badges: [student.school_house?.name || "Student"].filter(Boolean),
        achievements: [
          `Student of ${student.grade_level?.name || "Current Grade"}`,
          `Member of ${student.school_house?.name || "School House"}`,
        ].filter(Boolean),
      },
    ],
  };
};
