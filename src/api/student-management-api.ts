import { apiServer1 } from "./api-server-1";

/**
 * STUDENT MANAGEMENT API
 *
 * This file defines API endpoints for student management operations
 * including fetching detailed student information by ID.
 */

// ===== TYPESCRIPT INTERFACES =====

export interface GradeLevel {
  id: number;
  name: string;
  description: string | null;
}

export interface GradeLevelClass {
  id: number;
  name: string;
  description: string | null;
}

export interface SchoolHouse {
  id: number;
  name: string;
  description: string | null;
}

export interface CreatedInfo {
  created_by: number;
  updated_by: number;
  created_at: string | null;
  updated_at: string;
}

export interface DetailedStudentData {
  id: number;
  admission_number: string;
  full_name: string;
  full_name_with_title: string;
  student_calling_name: string;
  gender: string;
  date_of_birth: string;
  blood_group: string | null;
  phone: string | null;
  email: string | null;
  student_phone: string | null;
  student_email: string | null;
  full_address: string;
  student_address: string;
  joined_date: string;
  school_studied_before: string;
  special_conditions: string;
  special_health_conditions: string;
  has_dropped_out: boolean;
  is_school_leaver: boolean;
  is_sport_list: any | null;
  grade_level: GradeLevel | null;
  grade_level_class: GradeLevelClass | null;
  school_house: SchoolHouse | null;
  father: any | null;
  mother: any | null;
  guardian: any | null;
  financial_info: any | null;
  created_info: CreatedInfo;
}

export interface StudentByIdResponse {
  status: "success" | "error";
  data: DetailedStudentData;
}

export interface StudentByIdRequest {
  student_id: number;
}

// ===== STUDENT ACHIEVEMENT INTERFACES =====

export interface StudentInfo {
  full_name: string;
  full_name_with_title: string;
  admission_number: string;
}

export interface StudentAchievement {
  id: number;
  achievement_type: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  duration_days: number;
  created_at: string;
  updated_at: string;
}

export interface StudentAchievementData {
  student_id: number;
  student_info: StudentInfo;
  current_achievements: StudentAchievement[];
  total_achievements: number;
  current_date: string;
}

export interface StudentAchievementResponse {
  status: "success" | "error";
  data: StudentAchievementData;
}

export interface StudentAchievementRequest {
  student_id: number;
}

// ===== STUDENT ATTACHMENT INTERFACES =====

export interface StudentAttachmentCreatedInfo {
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface StudentAttachment {
  id: number;
  student_id: number;
  file_name: string;
  original_file_name: string;
  mime_type: string;
  created_info: StudentAttachmentCreatedInfo;
}

export interface StudentAttachmentData {
  attachments: StudentAttachment[];
}

export interface StudentAttachmentResponse {
  status: "success" | "error";
  data: StudentAttachmentData;
}

export interface StudentAttachmentRequest {
  student_id: number;
}

// ===== API ENDPOINTS =====

export const studentManagementApi = apiServer1.injectEndpoints({
  endpoints: (builder) => ({
    getStudentById: builder.query<StudentByIdResponse, StudentByIdRequest>({
      query: (params) => {
        console.log("🔗 Get Student By ID API Request:", {
          url: "api/student-management/student/get-student-by-id",
          method: "POST",
          params: {
            student_id: params.student_id,
          },
          baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
          fullUrl: `${process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1}/api/student-management/student/get-student-by-id`,
        });
        return {
          url: "api/student-management/student/get-student-by-id",
          method: "POST",
          body: params,
        };
      },
      providesTags: (result, error, arg) => [
        { type: "StudentDetail", id: arg.student_id },
      ],
    }),

    getStudentAchievementById: builder.query<
      StudentAchievementResponse,
      StudentAchievementRequest
    >({
      query: (params) => {
        console.log("🔗 Get Student Achievement API Request:", {
          url: "api/student-management/student-achievement/get-current-by-student-id",
          method: "POST",
          params: {
            student_id: params.student_id,
          },
          baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
          fullUrl: `${process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1}/api/student-management/student-achievement/get-current-by-student-id`,
        });
        return {
          url: "api/student-management/student-achievement/get-current-by-student-id",
          method: "POST",
          body: params,
        };
      },
      providesTags: (result, error, arg) => [
        { type: "StudentAchievement", id: arg.student_id },
      ],
    }),

    getStudentAttachmentsByStudentId: builder.query<
      StudentAttachmentResponse,
      StudentAttachmentRequest
    >({
      query: (params) => {
        console.log("🔗 Get Student Attachments API Request:", {
          url: "api/student-management/student-attachment/get-list-by-student-id",
          method: "POST",
          params: {
            student_id: params.student_id,
          },
          baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
          fullUrl: `${process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1}/api/student-management/student-attachment/get-list-by-student-id`,
        });
        return {
          url: "api/student-management/student-attachment/get-list-by-student-id",
          method: "POST",
          body: params,
        };
      },
      providesTags: (result, error, arg) => [
        { type: "StudentAttachment", id: arg.student_id },
      ],
    }),
  }),
  overrideExisting: false,
});

// ===== EXPORT HOOKS =====

export const {
  useGetStudentByIdQuery,
  useLazyGetStudentByIdQuery,
  useGetStudentAchievementByIdQuery,
  useLazyGetStudentAchievementByIdQuery,
  useGetStudentAttachmentsByStudentIdQuery,
  useLazyGetStudentAttachmentsByStudentIdQuery,
} = studentManagementApi;

// ===== UTILITY FUNCTIONS =====

/**
 * Format detailed student data for UI display
 * @param {DetailedStudentData} studentData - Raw student data from API
 * @returns {Object} - Formatted student data for UI
 */
export const formatDetailedStudentData = (studentData: DetailedStudentData) => {
  // Utility function to strip HTML tags
  const stripHtmlTags = (htmlString: string | null): string => {
    if (!htmlString || typeof htmlString !== "string") return "";

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

  // Format date from YYYY-MM-DD to readable format
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Not provided";

    try {
      const [year, month, day] = dateString.split("-").map(Number);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return dateString;
      }

      const date = new Date(year, month - 1, day);

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  // Get value or fallback
  const getValueOrFallback = (
    value: any,
    fallback = "Not provided",
  ): string => {
    if (!value || value === "" || value === null || value === undefined) {
      return fallback;
    }

    if (typeof value === "string") {
      const stripped = stripHtmlTags(value);
      return stripped || fallback;
    }

    return String(value);
  };

  return {
    // Basic Information
    id: studentData.id,
    admissionNumber: studentData.admission_number,
    fullName: studentData.full_name,
    fullNameWithTitle: studentData.full_name_with_title,
    studentCallingName: studentData.student_calling_name,
    gender: studentData.gender,

    // Formatted Fields
    formattedDateOfBirth: formatDate(studentData.date_of_birth),
    formattedJoinedDate: formatDate(studentData.joined_date),

    // Contact Information
    studentPhone: getValueOrFallback(studentData.student_phone),
    studentEmail: getValueOrFallback(studentData.student_email),
    studentAddress: getValueOrFallback(studentData.student_address),

    // Medical & Special Information
    bloodGroup: getValueOrFallback(studentData.blood_group),
    specialHealthConditions: getValueOrFallback(
      studentData.special_health_conditions,
    ),
    specialConditions: getValueOrFallback(studentData.special_conditions),

    // Academic Information
    schoolStudiedBefore: getValueOrFallback(studentData.school_studied_before),
    gradeLevel: studentData.grade_level?.name || "Not provided",
    gradeLevelClass: studentData.grade_level_class?.name || "Not provided",
    schoolHouse: studentData.school_house?.name || "Not provided",

    // Family Information (will be null in this case based on the API response)
    fatherFullName: getValueOrFallback(studentData.father?.full_name),
    motherFullName: getValueOrFallback(studentData.mother?.full_name),
    guardianFullName: getValueOrFallback(studentData.guardian?.full_name),

    // Raw data for reference
    rawData: studentData,
  };
};

/**
 * Transform student attachment data for timeline display
 * @param {StudentAttachment[]} attachments - Raw attachment data from API
 * @returns {Object[]} - Formatted timeline items for UI
 */
export const transformAttachmentsToTimeline = (
  attachments: StudentAttachment[],
) => {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  // Sort attachments by creation date (newest first)
  const sortedAttachments = [...attachments].sort(
    (a, b) =>
      new Date(b.created_info.created_at).getTime() -
      new Date(a.created_info.created_at).getTime(),
  );

  return sortedAttachments.map((attachment, index) => {
    const createdDate = new Date(attachment.created_info.created_at);
    const year = createdDate.getFullYear().toString();
    const formattedDate = createdDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return {
      id: attachment.id,
      attachmentId: attachment.id, // Use attachment ID for URL building (same as student profile pictures)
      year,
      date: formattedDate,
      title: `Memory ${sortedAttachments.length - index}`,
      // description: `Photo uploaded on ${formattedDate}`,
      fileName: attachment.file_name,
      originalFileName: attachment.original_file_name,
      mimeType: attachment.mime_type,
      createdBy: attachment.created_info.created_by,
      createdAt: attachment.created_info.created_at,
      isImage: attachment.mime_type.startsWith("image/"),
    };
  });
};

/**
 * Get image URL for student attachments
 * @param {string} fileName - File name from attachment data
 * @returns {string} - Full URL to the image
 */
export const getAttachmentImageUrl = (fileName: string): string => {
  return `${process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1}/storage/student-attachments/${fileName}`;
};
