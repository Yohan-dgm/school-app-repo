import { apiServer1 } from "./api-server-1";

/**
 * ATTENDANCE API
 *
 * This file defines all API endpoints for the student attendance system.
 * Provides grade-wise and date-wise attendance data with pagination support.
 *
 * Endpoint: POST /get-educator-attendance-aggregated-list-data
 * Features: Grade filtering, search, pagination, attendance aggregation
 */

// ===== TYPESCRIPT INTERFACES =====

// Student Attendance Statistics Interfaces
export interface StudentAttendanceStatsRequest {
  grade_level_class_id: number;
  filter_type: 'month' | 'year';
  year: number;
  month?: number;
}

export interface StudentAttendanceStatsStudent {
  student_id: number;
  full_name: string;
  admission_number: string;
  grade_level_id: number;
  grade_level_name: string;
  in_time_count: number;
  out_time_count: number;
  leave_count: number;
  absent_count: number;
  total_attendance_records: number;
}

export interface StudentAttendanceStatsSummary {
  total_students: number;
  students_with_attendance: number;
  total_in_time: number;
  total_out_time: number;
  total_leave: number;
  total_absent: number;
  filter_type: string;
  filter_display: string;
}

export interface StudentAttendanceStatsResponse {
  success: boolean;
  data: {
    summary: StudentAttendanceStatsSummary;
    students: StudentAttendanceStatsStudent[];
  };
}

export interface GradeLevel {
  id: number;
  name: string;
}

// Student Attendance Details Interfaces
export interface AttendanceType {
  id: number;
  name: string;
}

export interface Student {
  id: number;
  full_name: string;
  full_name_with_title: string;
  admission_number: string;
}

export interface StudentAttendanceRecord {
  id: number;
  date: string;
  time: string | null;
  student_id: number;
  attendance_type_id: number;
  notes: string | null;
  out_time?: string | null;
  in_time?: string | null;
  attendance_type: AttendanceType;
  student: Student;
}

export interface GradeLevelClass {
  id: number;
  name: string;
  grade_level_id: number;
  grade_level: GradeLevel;
}

export interface User {
  id: number;
  full_name: string;
}

export interface AttendanceRecord {
  id: number;
  date: string;
  created_by: number;
  present_student_count: number;
  absent_student_count: number;
  grade_level_class: {
    id?: number;
    name: string;
    grade_level_id?: number;
  };
  user: User;
}

export interface AttendanceQueryParams {
  page_size: number;
  page: number;
  search_phrase: string;
  search_filter_list: string[];
  group_filter: string;
}

export interface StudentAttendanceQueryParams {
  page_size: number;
  page: number;
  search_phrase: string;
  search_filter_list: string[];
  group_filter: string;
  attendance_date: string;
  grade_level_class_name: string;
}

export interface StudentAttendanceByIdQueryParams {
  student_id: number;
  page: number;
  page_size: number;
}

// New interface for student attendance by date and class
export interface StudentAttendanceByDateAndClassParams {
  grade_level_class_id: number;
  date: string;
  page: number;
  page_size: number;
}

// Today's attendance interface
export interface TodayAttendanceQueryParams {
  student_id: number;
}

export interface TodayAttendanceResponse {
  status: "success" | "error";
  data: {
    student_id: number;
    student: {
      full_name_with_title: string;
    };
    date: string;
    attendance_status: "present" | "absent" | null;
    attendance_type_id: number;
    time: string | null;
    notes: string | null;
    attendance_type: string | null;
    attendance_reason: string | null;
  };
}

// New interfaces for student attendance by date and class
export interface AttendanceSummary {
  status: "present" | "absent" | "late" | "partial";
  in_time: string;
  out_time: string;
}

export interface StudentAttendanceDetailRecord {
  id: number;
  attendance_type_id: number;
  time: string;
  notes: string | null;
  attendance_type: {
    id: number;
    name: string;
  };
  attendance_reason: string | null;
}

export interface StudentAttendanceDetail {
  student_id: number;
  student: {
    full_name: string;
    full_name_with_title: string;
    student_calling_name?: string;
    admission_number: string;
  };
  date: string;
  attendance_summary: AttendanceSummary;
  attendance_records: StudentAttendanceDetailRecord[];
}

export interface AttendanceClassSummary {
  total_students: number;
  present_count: number;
  absent_count: number;
  partial_count: number;
  date: string;
  grade_level_class_id: number;
}

export interface AttendancePagination {
  current_page: number;
  total_pages: number;
  per_page: number;
  total: number;
  has_more_pages: boolean;
}

export interface StudentAttendanceByDateAndClassResponse {
  status: "success" | "error";
  message: string;
  data: {
    attendance_records: StudentAttendanceDetail[];
    summary: AttendanceClassSummary;
    pagination: AttendancePagination;
  };
}

export interface AttendanceResponse {
  status: string;
  message: string;
  data: {
    data: AttendanceRecord[];
    total: number;
    student_attendance_count: number;
    grade_level_class_list: GradeLevelClass[];
  };
  metadata: {
    is_system_update_pending: boolean;
  };
}

// New interface for the real API response with numbered keys
export interface AttendanceResponseWithNumberedKeys {
  status: string;
  message: string;
  data: {
    data: { [key: string]: AttendanceRecord };
    total: number;
    student_attendance_count: number;
    grade_level_class_list: GradeLevelClass[];
  };
  metadata: {
    is_system_update_pending: boolean;
  };
}

export interface StudentAttendanceResponse {
  status: string;
  message: string;
  data: {
    data: StudentAttendanceRecord[];
    total: number;
    student_attendance_count: number;
    present_student_count: number;
    absent_student_count: number;
  };
  metadata: {
    is_system_update_pending: boolean;
  };
}

// Laravel pagination response format (actual backend response)
export interface StudentAttendanceByIdResponse {
  current_page: number;
  data: StudentAttendanceRecord[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: {
    active: boolean;
    label: string;
    url: string | null;
  }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

// Legacy interface (kept for reference)
export interface StudentAttendanceByIdResponseLegacy {
  status: string;
  message: string;
  data: {
    attendance_records: StudentAttendanceRecord[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
    student_info: {
      id: number;
      full_name: string;
      admission_number: string;
    };
  };
  metadata: {
    is_system_update_pending: boolean;
  };
}

// ===== CREATE ATTENDANCE INTERFACES =====

export interface StudentAttendanceData {
  student_id: number;
  grade_level_class_id: number;
  date: string; // YYYY-MM-DD format
  attendance_type_id: number; // 1=present, 2=absent, 3=late
  in_time?: string; // HH:MM format (required for late)
  out_time?: string; // HH:MM format (required for late)
  notes?: string;
  reason?: string; // Reason for absence/late
}

// ===== UPDATE ATTENDANCE INTERFACES =====

export interface UpdateStudentAttendanceRequest {
  student_id: number;
  grade_level_class_id: number;
  date: string; // YYYY-MM-DD format
  attendance_status: "present" | "absent" | "late"; // String status instead of type_id
  in_time: string | null; // HH:MM:SS format or null
  out_time: string | null; // HH:MM:SS format or null
  notes: string; // String value (empty string or actual notes)
  reason: string; // ALWAYS string (empty string or actual reason) - never null
}

export interface UpdateAttendanceResponse {
  attendance_records: StudentAttendanceRecord[];
  total_records: number;
  status: string;
  message: string;
}

export interface CreateAttendanceRequest {
  attendance_data: StudentAttendanceData[];
}

export interface CreateAttendanceResponse {
  status: string;
  message: string;
  data: {
    created_count: number;
    updated_count: number;
    failed_count: number;
    attendance_records: StudentAttendanceRecord[];
    errors?: {
      student_id: number;
      error: string;
    }[];
  };
  metadata: {
    is_system_update_pending: boolean;
  };
}

// ===== API ENDPOINTS =====

export const attendanceApi = apiServer1.injectEndpoints({
  endpoints: (builder) => ({
    getStudentAttendanceAggregated: builder.query<
      AttendanceResponse,
      AttendanceQueryParams
    >({
      query: (params) => {
        console.log("🔗 Student Attendance Aggregated API Request:", {
          url: "api/attendance-management/student-attendance/get-student-attendance-aggregated-list-data",
          method: "POST",
          params,
          baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
        });
        return {
          url: "api/attendance-management/student-attendance/get-student-attendance-aggregated-list-data",
          method: "POST",
          body: params,
        };
      },
      transformResponse: (response: AttendanceResponseWithNumberedKeys) => {
        // Transform the numbered keys response to array format
        return transformNumberedKeysResponse(response);
      },
      providesTags: ["StudentAttendanceAggregated"],
    }),

    getAttendanceAggregated: builder.query<
      AttendanceResponse,
      AttendanceQueryParams
    >({
      // TEMPORARY MOCK - Remove when backend endpoint is ready
      queryFn: async (params) => {
        console.log("🔗 Mock Attendance API Request:", { params });

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Generate all available records first (for proper filtering and total calculation)
        const { filteredRecords, totalCount } =
          generateMockAttendanceRecords(params);

        // Calculate student attendance count from filtered records
        const totalStudentAttendance = filteredRecords.reduce(
          (sum, record) =>
            sum + record.present_student_count + record.absent_student_count,
          0,
        );

        const mockData: AttendanceResponse = {
          status: "successful",
          message: "",
          data: {
            data: filteredRecords,
            total: totalCount,
            student_attendance_count: totalStudentAttendance,
            grade_level_class_list: generateMockGradeLevelClasses(),
          },
          metadata: {
            is_system_update_pending: true,
          },
        };

        console.log("\n" + "=".repeat(80));
        console.log("🎯 STUDENT ATTENDANCE API RESPONSE - DETAILED LOG");
        console.log("=".repeat(80));

        console.log("📊 API Response Summary:", {
          status: mockData.status,
          message: mockData.message,
          recordsCount: mockData.data.data.length,
          totalRecords: mockData.data.total,
          studentAttendanceCount: mockData.data.student_attendance_count,
          gradeClassesCount: mockData.data.grade_level_class_list.length,
          currentPage: params.page,
          pageSize: params.page_size,
          groupFilter: params.group_filter,
          searchPhrase: params.search_phrase,
          totalPages: Math.ceil(mockData.data.total / params.page_size),
        });

        console.log("\n📚 Available Grade Level Classes:");
        console.table(
          mockData.data.grade_level_class_list.map((gc) => ({
            id: gc.id,
            name: gc.name,
            gradeLevel: gc.grade_level?.name || "N/A",
            gradeLevelId: gc.grade_level_id,
          })),
        );

        console.log(
          `\n📅 Attendance Records (Page ${params.page} of ${Math.ceil(mockData.data.total / params.page_size)}):`,
        );
        const recordDetails = mockData.data.data.map((record) => ({
          id: record.id,
          date: record.date,
          formattedDate: formatAttendanceDate(record.date),
          gradeClass: record.grade_level_class.name,
          presentCount: record.present_student_count,
          absentCount: record.absent_student_count,
          totalStudents:
            record.present_student_count + record.absent_student_count,
          attendanceRate:
            (
              (record.present_student_count /
                (record.present_student_count + record.absent_student_count)) *
              100
            ).toFixed(1) + "%",
          createdBy: record.user.full_name,
          createdById: record.created_by,
        }));
        console.table(recordDetails);

        console.log("\n📈 Pagination Information:");
        console.log({
          currentPage: params.page,
          pageSize: params.page_size,
          totalRecords: mockData.data.total,
          totalPages: Math.ceil(mockData.data.total / params.page_size),
          startRecord: (params.page - 1) * params.page_size + 1,
          endRecord: Math.min(
            params.page * params.page_size,
            mockData.data.total,
          ),
          hasNextPage:
            params.page < Math.ceil(mockData.data.total / params.page_size),
          hasPreviousPage: params.page > 1,
        });

        console.log("\n🔍 Filter Information:");
        console.log({
          groupFilter: params.group_filter,
          searchPhrase: params.search_phrase || "(none)",
          searchFilterList: params.search_filter_list,
          isAllGrades: params.group_filter === "All",
        });

        // Log full response for debugging
        console.log("\n📋 FULL API RESPONSE (JSON):");
        console.log(JSON.stringify(mockData, null, 2));

        console.log("=".repeat(80));
        console.log("🎯 END STUDENT ATTENDANCE API RESPONSE LOG");
        console.log("=".repeat(80) + "\n");
        return { data: mockData };
      },

      // REAL API CALL - Uncomment when backend is ready
      /*
      query: (params) => {
        console.log("🔗 Attendance API Request:", {
          url: "get-educator-attendance-aggregated-list-data",
          method: "POST",
          params,
          baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
        });
        return {
          url: "get-educator-attendance-aggregated-list-data",
          method: "POST",
          body: params,
        };
      },
      */

      providesTags: ["Attendance"],
    }),

    getStudentAttendanceList: builder.query<
      StudentAttendanceResponse,
      StudentAttendanceQueryParams
    >({
      // TEMPORARY MOCK - Remove when backend endpoint is ready
      queryFn: async (params) => {
        console.log("🔗 Mock Student Attendance API Request:", { params });

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Generate mock data for the requested page
        const studentRecords = generateMockStudentAttendanceRecords(params);

        // Calculate total class size by temporarily getting all records
        const allRecordsParams = { ...params, page: 1, page_size: 1000 };
        const allStudentRecords =
          generateMockStudentAttendanceRecords(allRecordsParams);

        const totalPresentCount = allStudentRecords.filter(
          (r) => r.attendance_type.name === "In",
        ).length;
        const totalAbsentCount = allStudentRecords.filter(
          (r) => r.attendance_type.name === "Absent",
        ).length;
        const totalOutCount = allStudentRecords.filter(
          (r) => r.attendance_type.name === "Out",
        ).length;

        const mockData: StudentAttendanceResponse = {
          status: "successful",
          message: "",
          data: {
            data: studentRecords,
            total: allStudentRecords.length, // Total students in class
            student_attendance_count: allStudentRecords.length,
            present_student_count: totalPresentCount + totalOutCount, // In + Out = Present
            absent_student_count: totalAbsentCount,
          },
          metadata: {
            is_system_update_pending: true,
          },
        };

        console.log("📊 Mock Student Attendance API Response Summary:", {
          status: mockData.status,
          studentsCount: mockData.data.data.length,
          totalStudents: mockData.data.total,
          presentCount: mockData.data.present_student_count,
          absentCount: mockData.data.absent_student_count,
          attendanceDate: params.attendance_date,
          gradeLevelClass: params.grade_level_class_name,
        });

        // Log student attendance records with dates
        console.log(
          `👥 Student Attendance Records for ${formatAttendanceDate(params.attendance_date)}:`,
        );
        const studentAttendanceDetails = mockData.data.data.map((record) => ({
          studentName: record.student.full_name,
          admissionNumber: record.student.admission_number,
          date: record.date,
          attendanceType: record.attendance_type.name,
          inTime: record.in_time,
          outTime: record.out_time,
        }));
        console.table(studentAttendanceDetails);

        // Uncomment for full response debugging:
        // console.log("📊 Full Student Response:", JSON.stringify(mockData, null, 2));
        return { data: mockData };
      },

      // REAL API CALL - Uncomment when backend is ready
      /*
      query: (params) => {
        console.log("🔗 Student Attendance API Request:", {
          url: "api/attendance-management/student-attendance/get-student-attendance-list-data",
          method: "POST",
          params,
          baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
        });
        return {
          url: "api/attendance-management/student-attendance/get-student-attendance-list-data",
          method: "POST",
          body: params,
        };
      },
      */

      providesTags: ["StudentAttendance"],
    }),

    getStudentAttendanceById: builder.query<
      StudentAttendanceByIdResponse,
      StudentAttendanceByIdQueryParams
    >({
      query: (params) => {
        console.log("🔗 Student Attendance By ID API Request:", {
          url: "api/attendance-management/student-attendance/get-student-attendance-by-id",
          method: "POST",
          params: {
            student_id: params.student_id,
            page: params.page,
            page_size: params.page_size,
          },
          baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
          fullUrl: `${process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1}/api/attendance-management/student-attendance/get-student-attendance-by-id`,
        });
        return {
          url: "api/attendance-management/student-attendance/get-student-attendance-by-id",
          method: "POST",
          body: params,
        };
      },
      providesTags: (result, error, args) => [
        { type: "StudentAttendanceById", id: args.student_id },
        "StudentAttendanceById",
      ],
    }),

    createStudentAttendance: builder.mutation<
      CreateAttendanceResponse,
      CreateAttendanceRequest
    >({
      query: (attendanceData) => {
        console.log("🔗 Batch Create Student Attendance API Request:", {
          url: "api/attendance-management/student-attendance/batch-create-student-attendance",
          method: "POST",
          data: attendanceData,
          baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
        });

        // Log the attendance data being sent
        console.log("📊 Attendance Data Summary:", {
          totalRecords: attendanceData.attendance_data.length,
          studentsWithPresent: attendanceData.attendance_data.filter(
            (a) => a.attendance_type_id === 1,
          ).length,
          studentsWithAbsent: attendanceData.attendance_data.filter(
            (a) => a.attendance_type_id === 2,
          ).length,
          studentsWithLate: attendanceData.attendance_data.filter(
            (a) => a.attendance_type_id === 3,
          ).length,
          date: attendanceData.attendance_data[0]?.date || "No date",
        });

        return {
          url: "api/attendance-management/student-attendance/batch-create-student-attendance",
          method: "POST",
          body: attendanceData,
        };
      },
      invalidatesTags: [
        "Attendance",
        "StudentAttendance",
        "StudentAttendanceAggregated",
        "StudentAttendanceById",
      ],
    }),

    getTodayStudentAttendanceById: builder.query<
      TodayAttendanceResponse,
      TodayAttendanceQueryParams
    >({
      query: (params) => {
        console.log("🔗 Today's Student Attendance API Request:", {
          url: "api/attendance-management/student-attendance/get-today-student-attendance-by-student-id",
          method: "POST",
          params: {
            student_id: params.student_id,
          },
          baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
          fullUrl: `${process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1}/api/attendance-management/student-attendance/get-today-student-attendance-by-student-id`,
        });
        return {
          url: "api/attendance-management/student-attendance/get-today-student-attendance-by-student-id",
          method: "POST",
          body: params,
        };
      },
      providesTags: (result, error, args) => [
        { type: "StudentAttendanceById", id: args.student_id },
        "StudentAttendanceById",
      ],
    }),

    getStudentAttendanceByDateAndClass: builder.query<
      StudentAttendanceByDateAndClassResponse,
      StudentAttendanceByDateAndClassParams
    >({
      query: (params) => {
        console.log("🔗 Student Attendance By Date and Class API Request:", {
          url: "api/attendance-management/student-attendance/get-student-attendance-by-date-and-class",
          method: "POST",
          params: {
            grade_level_class_id: params.grade_level_class_id,
            date: params.date,
            page: params.page,
            page_size: params.page_size,
          },
          baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
          fullUrl: `${process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1}/api/attendance-management/student-attendance/get-student-attendance-by-date-and-class`,
        });
        return {
          url: "api/attendance-management/student-attendance/get-student-attendance-by-date-and-class",
          method: "POST",
          body: params,
        };
      },
      providesTags: (result, error, args) => [
        {
          type: "StudentAttendanceByDateAndClass",
          id: `${args.grade_level_class_id}-${args.date}`,
        },
        "StudentAttendanceByDateAndClass",
      ],
    }),

    updateStudentAttendance: builder.mutation<
      UpdateAttendanceResponse,
      UpdateStudentAttendanceRequest
    >({
      query: (attendanceData) => {
        console.log("🔗 Update Student Attendance API Request:", {
          url: "api/attendance-management/student-attendance/update-student-attendance",
          method: "POST",
          data: attendanceData,
          baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
        });

        // Validate that we're not sending undefined values
        const hasUndefinedValues = Object.entries(attendanceData).some(
          ([key, value]) => value === undefined,
        );
        if (hasUndefinedValues) {
          console.error(
            "🚨 CRITICAL: Request contains undefined values!",
            attendanceData,
          );
        }

        // Check specifically for problematic fields
        if ("notes" in attendanceData && attendanceData.notes === undefined) {
          console.error("🚨 CRITICAL: notes field is undefined!");
        }
        if ("reason" in attendanceData && attendanceData.reason === undefined) {
          console.error("🚨 CRITICAL: reason field is undefined!");
        }

        // Log the attendance data being sent
        console.log("📊 Update Attendance Data:", {
          studentId: attendanceData.student_id,
          attendanceStatus: attendanceData.attendance_status,
          date: attendanceData.date,
          inTime: attendanceData.in_time,
          outTime: attendanceData.out_time,
          notes: attendanceData.notes,
          reason: attendanceData.reason,
        });

        // Log the exact request body being sent to help debug
        console.log(
          "📤 Exact Request Body:",
          JSON.stringify(attendanceData, null, 2),
        );
        console.log("📤 Request Body Keys:", Object.keys(attendanceData));
        console.log("📤 Request Body Values:", Object.values(attendanceData));

        // Final safeguard: remove any undefined values from the request
        const cleanedData = cleanRequestObject(attendanceData);
        console.log(
          "🧹 Cleaned Request Body:",
          JSON.stringify(cleanedData, null, 2),
        );

        return {
          url: "api/attendance-management/student-attendance/update-student-attendance",
          method: "POST",
          body: cleanedData,
        };
      },
      invalidatesTags: (result, error, args) => {
        if (error) return [];

        // Only invalidate specific, relevant data to minimize cache refreshes
        return [
          // Invalidate the specific student's attendance data
          { type: "StudentAttendanceById", id: args.student_id },
          // Invalidate the specific date and class combination
          {
            type: "StudentAttendanceByDateAndClass",
            id: `${args.grade_level_class_id}-${args.date}`,
          },
          // Keep general invalidation for broad views that need updates
          "StudentAttendanceAggregated",
        ];
      },
    }),

    getStudentAttendanceStats: builder.query<
      StudentAttendanceStatsResponse,
      StudentAttendanceStatsRequest
    >({
      query: (params) => {
        console.log("🔗 Student Attendance Stats API Request:", {
          url: "api/attendance-management/student-attendance/stats/student-attendance-stats",
          method: "POST",
          params,
          baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
        });
        return {
          url: "api/attendance-management/student-attendance/stats/student-attendance-stats",
          method: "POST",
          body: params,
        };
      },
      providesTags: ["StudentAttendanceStats"],
    }),
  }),
  overrideExisting: false,
});

// Mock data generator removed - now using real API calls only

function generateMockAttendanceRecords(params: AttendanceQueryParams): {
  filteredRecords: AttendanceRecord[];
  totalCount: number;
} {
  const pageSize = params.page_size || 10;
  const page = params.page || 1;

  // Generate records based on group filter
  const isAllGrades = params.group_filter === "All";
  const gradeClasses = generateMockGradeLevelClasses();

  // Generate comprehensive mock data covering last 6 months consistently
  // Use a consistent seed for reproducible mock data
  const totalRecordsAvailable = isAllGrades ? 400 : 200;
  const months = getLastNMonths(6);

  // First, generate all available records consistently
  const allRecords: AttendanceRecord[] = [];

  for (let i = 0; i < totalRecordsAvailable; i++) {
    let selectedClass: GradeLevelClass;

    if (isAllGrades) {
      // For "All" grades, cycle through all grade classes
      selectedClass = gradeClasses[i % gradeClasses.length];
    } else {
      // For specific grade filter, find the matching class
      const matchingClass = gradeClasses.find(
        (gc) => gc.name === params.group_filter,
      );
      if (!matchingClass) {
        console.warn(`No grade class found for filter: ${params.group_filter}`);
        continue;
      }
      selectedClass = matchingClass;
    }

    // Generate dates distributed across last 6 months for better chart data
    const monthIndex = isAllGrades
      ? i % months.length
      : Math.floor((i / totalRecordsAvailable) * months.length);
    const selectedMonth = months[monthIndex];
    const [year, month] = selectedMonth.month.split("-").map(Number);
    const dayOfMonth = (i % 28) + 1; // Deterministic day selection
    const recordDate = new Date(year, month - 1, dayOfMonth);

    // Generate seasonal attendance patterns
    const seasonalFactor = getSeasonalAttendanceFactor(month);
    const gradeFactor = getGradeAttendanceFactor(
      selectedClass.grade_level_id || 1,
    );

    // Generate realistic attendance numbers with seasonal and grade variations
    const totalStudentsInClass = 20 + (i % 16); // 20-35 students, deterministic
    const baseAttendanceRate = 0.85;
    const adjustedRate = Math.min(
      0.98,
      Math.max(0.65, baseAttendanceRate * seasonalFactor * gradeFactor),
    );

    const presentCount = Math.round(totalStudentsInClass * adjustedRate);
    const absentCount = totalStudentsInClass - presentCount;

    allRecords.push({
      id: 71000 + i + 1,
      date: recordDate.toISOString().split("T")[0],
      created_by: 37,
      present_student_count: presentCount,
      absent_student_count: absentCount,
      grade_level_class: {
        id: selectedClass.id,
        name: selectedClass.name,
        grade_level_id: selectedClass.grade_level_id,
      },
      user: {
        id: 37,
        full_name: "Hasandi Nethmi Wickrmasooriya",
      },
    });
  }

  // Sort by date descending for better display
  allRecords.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // Apply search phrase filter if provided
  let searchFilteredRecords = allRecords;
  if (params.search_phrase && params.search_phrase.trim()) {
    const searchTerm = params.search_phrase.toLowerCase().trim();
    searchFilteredRecords = allRecords.filter(
      (record) =>
        record.user.full_name.toLowerCase().includes(searchTerm) ||
        record.grade_level_class.name.toLowerCase().includes(searchTerm) ||
        formatAttendanceDate(record.date).toLowerCase().includes(searchTerm),
    );
  }

  // Get total count after filtering
  const totalFilteredCount = searchFilteredRecords.length;

  // Apply pagination to get the requested page
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRecords = searchFilteredRecords.slice(startIndex, endIndex);

  return {
    filteredRecords: paginatedRecords,
    totalCount: totalFilteredCount,
  };
}

// Helper function to simulate seasonal attendance patterns
function getSeasonalAttendanceFactor(month: number): number {
  // Lower attendance in winter months (Dec, Jan, Feb) due to weather/illness
  // Higher attendance in fall (Sep, Oct, Nov) and spring (Mar, Apr, May)
  const seasonalFactors: { [key: number]: number } = {
    1: 0.88, // January - Winter, post-holiday dip
    2: 0.92, // February - Late winter
    3: 0.96, // March - Spring starts
    4: 0.98, // April - Good weather
    5: 0.95, // May - End of school year fatigue
    6: 0.9, // June - Summer, some students skip
    7: 0.85, // July - Summer holidays affect
    8: 0.93, // August - Back to school enthusiasm
    9: 0.98, // September - Peak attendance
    10: 0.97, // October - Good fall weather
    11: 0.94, // November - Pre-winter
    12: 0.86, // December - Holiday season
  };

  return seasonalFactors[month] || 0.9;
}

// Helper function to simulate grade-level attendance patterns
function getGradeAttendanceFactor(gradeLevel: number): number {
  // Younger students tend to have slightly lower attendance due to illness
  // High school students may have more absences due to activities/work
  if (gradeLevel <= 3) return 0.92; // Elementary - more sick days
  if (gradeLevel <= 8) return 0.98; // Middle school - best attendance
  if (gradeLevel <= 12) return 0.94; // High school - activities, jobs
  return 0.9; // EY classes - very young, more absences
}

// Mock data generator for student attendance records
function generateMockStudentAttendanceRecords(
  params: StudentAttendanceQueryParams,
): StudentAttendanceRecord[] {
  const records: StudentAttendanceRecord[] = [];
  const pageSize = params.page_size || 10;
  const page = params.page || 1;

  // Generate class-specific student names based on grade level
  const getStudentsForClass = (className: string): string[] => {
    // Create different student sets for different classes
    const allStudents = [
      "Thanumi Sasithma Dissanayake",
      "Godakumbure Gedara Upeksha Sathsarani Bandara",
      "Dissanayaka Mudiyanselage Sehas Saswindu Bandara",
      "Liyanage Disas Damyuga Perara",
      "Mirihagalla Kankanamlage Shiyon Menosha Mirihagalla",
      "Wijesinghe Mudiyanselage Rivitha Nethdula Wijesinghe",
      "Zero Senaji",
      "Ranpati Dewage Kusal Bimsara Dissanayake",
      "Withan Kankanamlage Lagni Akelya Withana",
      "Kande Hevayalage Osindu Nethmina Jayarathna",
      "Navadya Nethmi Perera",
      "Kamal Chandra Silva",
      "Nimal Fernando",
      "Saman Kumara",
      "Dilani Rajapaksha",
      "Amara Wickramasinghe",
      "Buddhika Perera",
      "Chamari Silva",
      "Dinesh Fernando",
      "Esther Rajapakse",
      "Gamini Dias",
      "Harsha Mendis",
      "Indika Jayawardena",
      "Janaki Peiris",
      "Kasun Bandara",
      "Lasitha Gunawardena",
      "Malini Senanayake",
      "Nuwan Ratnaweera",
      "Oshadha Wijeratne",
      "Priyanka Cooray",
    ];

    // Use class name as seed to get consistent student subset for each class
    const classHash = className
      .split("")
      .reduce((hash, char) => hash + char.charCodeAt(0), 0);
    const startIndex = classHash % 10;
    const classSize = 18 + (classHash % 12); // Class sizes between 18-30

    const classStudents = [];
    for (let i = 0; i < classSize; i++) {
      classStudents.push(allStudents[(startIndex + i) % allStudents.length]);
    }
    return classStudents;
  };

  const mockStudents = getStudentsForClass(params.grade_level_class_name);

  // Attendance types
  const attendanceTypes = [
    { id: 1, name: "In" },
    { id: 2, name: "Out" },
    { id: 4, name: "Absent" },
  ];

  // Create a deterministic seed from date and class for consistent data
  const dateSeed = params.attendance_date.split("-").join("");
  const classSeed = params.grade_level_class_name
    .split("")
    .reduce((hash, char) => hash + char.charCodeAt(0), 0);
  const combinedSeed = parseInt(dateSeed) + classSeed;

  // Seeded random function for consistent results
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Generate records for current page - but show all students in class with pagination
  const totalStudents = mockStudents.length;
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalStudents);

  for (let i = startIndex; i < endIndex; i++) {
    const studentName = mockStudents[i];
    const studentSeed = combinedSeed + i;

    // Determine attendance type using seeded random (consistent per date/class/student)
    const rand = seededRandom(studentSeed);
    let attendanceType;
    let time = null;
    let inTime = null;
    let outTime = null;

    if (rand < 0.8) {
      // Present (In)
      attendanceType = attendanceTypes[0];
      time = "7:30 AM";
      inTime = "7:30 AM";
      outTime = "1:00 PM";
    } else if (rand < 0.95) {
      // Out
      attendanceType = attendanceTypes[1];
      time = "1:00 PM";
      inTime = "7:30 AM";
      outTime = "1:00 PM";
    } else {
      // Absent
      attendanceType = attendanceTypes[2];
      time = null;
      inTime = null;
      outTime = null;
    }

    // Create unique but consistent student IDs based on class and student
    const studentId = 1000 + classSeed + i;

    records.push({
      id: 23900 + studentId,
      date: params.attendance_date,
      time,
      student_id: studentId,
      attendance_type_id: attendanceType.id,
      notes: null,
      out_time: outTime,
      in_time: inTime,
      attendance_type: attendanceType,
      student: {
        id: studentId,
        full_name: studentName,
        full_name_with_title: studentName.includes("Miss")
          ? studentName
          : (seededRandom(studentSeed + 1000) > 0.5 ? "Master. " : "Miss. ") +
            studentName,
        admission_number: `NY24/${String(studentId).padStart(3, "0")}`,
      },
    });
  }

  // Filter by search phrase if provided
  let filteredRecords = records;
  if (params.search_phrase) {
    filteredRecords = records.filter((record) =>
      record.student.full_name
        .toLowerCase()
        .includes(params.search_phrase.toLowerCase()),
    );
  }

  return filteredRecords;
}

function generateMockGradeLevelClasses(): GradeLevelClass[] {
  return [
    {
      id: 1,
      name: "Grade 1 - Class 1",
      grade_level_id: 1,
      grade_level: { id: 1, name: "Grade 1" },
    },
    {
      id: 2,
      name: "Grade 2 - Class 1",
      grade_level_id: 2,
      grade_level: { id: 2, name: "Grade 2" },
    },
    {
      id: 3,
      name: "Grade 3 - Class 1",
      grade_level_id: 3,
      grade_level: { id: 3, name: "Grade 3" },
    },
    {
      id: 4,
      name: "Grade 4 - Class 1",
      grade_level_id: 4,
      grade_level: { id: 4, name: "Grade 4" },
    },
    {
      id: 5,
      name: "Grade 5 - Class 1",
      grade_level_id: 5,
      grade_level: { id: 5, name: "Grade 5" },
    },
    {
      id: 6,
      name: "Grade 6 - Class 1",
      grade_level_id: 6,
      grade_level: { id: 6, name: "Grade 6" },
    },
    {
      id: 7,
      name: "Grade 7 - Class 1",
      grade_level_id: 7,
      grade_level: { id: 7, name: "Grade 7" },
    },
    {
      id: 8,
      name: "Grade 8 - Class 1",
      grade_level_id: 8,
      grade_level: { id: 8, name: "Grade 8" },
    },
    {
      id: 9,
      name: "Grade 9 - Class 1",
      grade_level_id: 9,
      grade_level: { id: 9, name: "Grade 9" },
    },
    {
      id: 10,
      name: "Grade 10 - Class 1",
      grade_level_id: 10,
      grade_level: { id: 10, name: "Grade 10" },
    },
    {
      id: 11,
      name: "Grade 11 - Class 1",
      grade_level_id: 11,
      grade_level: { id: 11, name: "Grade 11" },
    },
    {
      id: 12,
      name: "Grade 12 - Class 1",
      grade_level_id: 12,
      grade_level: { id: 12, name: "Grade 12" },
    },
    {
      id: 13,
      name: "EY 1 - Class 1",
      grade_level_id: 13,
      grade_level: { id: 13, name: "EY 1" },
    },
    {
      id: 14,
      name: "EY 2 - Class 1",
      grade_level_id: 14,
      grade_level: { id: 14, name: "EY 2" },
    },
    {
      id: 15,
      name: "EY 3 - Class 1",
      grade_level_id: 15,
      grade_level: { id: 15, name: "EY 3" },
    },
  ];
}

// ===== DATA TRANSFORMATION UTILITIES =====

/**
 * Transforms the numbered keys API response to array format for component usage
 */
export const transformNumberedKeysResponse = (
  response: AttendanceResponseWithNumberedKeys,
): AttendanceResponse => {
  // Convert the numbered object to array
  const recordsArray = Object.values(response.data.data);

  return {
    ...response,
    data: {
      ...response.data,
      data: recordsArray,
    },
  };
};

// ===== EXPORT HOOKS =====

export const {
  useGetStudentAttendanceAggregatedQuery,
  useLazyGetStudentAttendanceAggregatedQuery,
  useGetAttendanceAggregatedQuery,
  useLazyGetAttendanceAggregatedQuery,
  useGetStudentAttendanceListQuery,
  useLazyGetStudentAttendanceListQuery,
  useGetStudentAttendanceByIdQuery,
  useLazyGetStudentAttendanceByIdQuery,
  useCreateStudentAttendanceMutation,
  useGetTodayStudentAttendanceByIdQuery,
  useLazyGetTodayStudentAttendanceByIdQuery,
  useGetStudentAttendanceByDateAndClassQuery,
  useLazyGetStudentAttendanceByDateAndClassQuery,
  useUpdateStudentAttendanceMutation,
  useGetStudentAttendanceStatsQuery,
  useLazyGetStudentAttendanceStatsQuery,
} = attendanceApi;

// ===== UTILITY FUNCTIONS =====

export const createAttendanceQueryParams = (
  page: number = 1,
  pageSize: number = 10,
  searchPhrase: string = "",
  groupFilter: string = "All",
): AttendanceQueryParams => ({
  page_size: pageSize,
  page,
  search_phrase: searchPhrase,
  search_filter_list: [],
  group_filter: groupFilter,
});

export const createStudentAttendanceQueryParams = (
  page: number = 1,
  pageSize: number = 10,
  searchPhrase: string = "",
  groupFilter: string = "All",
  attendanceDate: string,
  gradeLevelClassName: string,
): StudentAttendanceQueryParams => ({
  page_size: pageSize,
  page,
  search_phrase: searchPhrase,
  search_filter_list: [],
  group_filter: groupFilter,
  attendance_date: attendanceDate,
  grade_level_class_name: gradeLevelClassName,
});

export const createStudentAttendanceByDateAndClassParams = (
  gradeLevelClassId: number,
  date: string,
  page: number = 1,
  pageSize: number = 10,
): StudentAttendanceByDateAndClassParams => {
  // Validate required parameters
  if (!date || date.trim() === "") {
    console.warn(
      "⚠️ createStudentAttendanceByDateAndClassParams: Empty or invalid date provided:",
      date,
    );
  }

  if (!gradeLevelClassId || gradeLevelClassId <= 0) {
    console.warn(
      "⚠️ createStudentAttendanceByDateAndClassParams: Invalid gradeLevelClassId provided:",
      gradeLevelClassId,
    );
  }

  return {
    grade_level_class_id: gradeLevelClassId,
    date: date.trim(), // Ensure no whitespace issues
    page,
    page_size: pageSize,
  };
};

export const getTotalStudentsCount = (record: AttendanceRecord): number => {
  return record.present_student_count + record.absent_student_count;
};

export const getAttendancePercentage = (record: AttendanceRecord): number => {
  const total = getTotalStudentsCount(record);
  return total > 0 ? (record.present_student_count / total) * 100 : 0;
};

export const formatAttendanceDate = (dateString: string): string => {
  try {
    // Parse the date string properly to avoid timezone issues
    const [year, month, day] = dateString.split("-").map(Number);

    // Validate date components
    if (
      isNaN(year) ||
      isNaN(month) ||
      isNaN(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return dateString; // Return original string if parsing fails
    }

    const date = new Date(year, month - 1, day); // month is 0-indexed in Date constructor

    // Additional validation to ensure date is valid
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return dateString; // Return original if date is invalid (e.g., Feb 30)
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    console.error("Error formatting attendance date:", error);
    return dateString; // Fallback to original string
  }
};

// ===== CHART DATA PROCESSING UTILITIES =====

export interface DailyAttendanceData {
  date: string;
  dateLabel: string;
  year: number;
  month: number;
  day: number;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
  recordsCount: number;
}

export interface MonthlyAttendanceData {
  month: string; // Format: "2024-01"
  monthLabel: string; // Format: "Jan 2024"
  year: number;
  monthNumber: number; // 1-12
  totalPresentStudents: number; // Sum of daily present counts for the month
  totalStudentDays: number; // Sum of daily total students for the month
  averageDailyPresent: number; // Average present students per day
  attendanceRate: number; // Overall month attendance rate
  daysWithData: number; // Number of days in month that have attendance data
  totalDaysInMonth: number; // Total days in the calendar month
}

export const processAttendanceDataForChart = (
  attendanceRecords: AttendanceRecord[],
  monthsCount: number = 6,
): MonthlyAttendanceData[] => {
  if (!attendanceRecords || attendanceRecords.length === 0) {
    return [];
  }

  const months = getLastNMonths(monthsCount);
  const monthlyData: MonthlyAttendanceData[] = [];

  months.forEach(({ month, label, year }) => {
    // Filter records for this specific month and year
    const monthRecords = attendanceRecords.filter((record) => {
      // Parse date safely to avoid timezone issues
      const [recordYear, recordMonth] = record.date.split("-").map(Number);
      const recordMonthStr = `${recordYear}-${String(recordMonth).padStart(2, "0")}`;
      return recordMonthStr === month;
    });

    // Calculate monthly totals
    const totalPresent = monthRecords.reduce(
      (sum, record) => sum + record.present_student_count,
      0,
    );
    const totalAbsent = monthRecords.reduce(
      (sum, record) => sum + record.absent_student_count,
      0,
    );
    const totalStudents = totalPresent + totalAbsent;
    const attendanceRate =
      totalStudents > 0 ? (totalPresent / totalStudents) * 100 : 0;

    monthlyData.push({
      month,
      monthLabel: label,
      year,
      monthNumber: parseInt(month.split("-")[1]),
      totalPresentStudents: totalPresent,
      totalStudentDays: totalStudents,
      averageDailyPresent:
        monthRecords.length > 0 ? totalPresent / monthRecords.length : 0,
      attendanceRate: Math.round(attendanceRate * 10) / 10, // Round to 1 decimal
      daysWithData: monthRecords.length,
      totalDaysInMonth: new Date(
        year,
        parseInt(month.split("-")[1]),
        0,
      ).getDate(),
    });
  });

  return monthlyData;
};

export const processAttendanceDataForDates = (
  attendanceRecords: AttendanceRecord[],
  daysCount: number = 30,
): DailyAttendanceData[] => {
  if (!attendanceRecords || attendanceRecords.length === 0) {
    return [];
  }

  const days = getLastNDays(daysCount);
  const dailyData: DailyAttendanceData[] = [];

  days.forEach(({ date, label, year, month, day }) => {
    // Filter records for this specific date
    const dayRecords = attendanceRecords.filter((record) => {
      // Parse date safely to avoid timezone issues
      const recordDate = record.date;
      return recordDate === date;
    });

    // Calculate daily totals
    const totalPresent = dayRecords.reduce(
      (sum, record) => sum + record.present_student_count,
      0,
    );
    const totalAbsent = dayRecords.reduce(
      (sum, record) => sum + record.absent_student_count,
      0,
    );
    const totalStudents = totalPresent + totalAbsent;
    const attendanceRate =
      totalStudents > 0 ? (totalPresent / totalStudents) * 100 : 0;

    dailyData.push({
      date,
      dateLabel: label,
      year,
      month,
      day,
      totalStudents,
      presentCount: totalPresent,
      absentCount: totalAbsent,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      recordsCount: dayRecords.length,
    });
  });

  return dailyData;
};

export const processAttendanceDataForMonths = (
  attendanceRecords: AttendanceRecord[],
  monthsCount: number = 6,
): MonthlyAttendanceData[] => {
  if (!attendanceRecords || attendanceRecords.length === 0) {
    return [];
  }

  // First get all daily data for a longer period to ensure we have enough days for each month
  const daysForMonths = monthsCount * 31; // Get enough days to cover all months
  const dailyData = processAttendanceDataForDates(
    attendanceRecords,
    daysForMonths,
  );

  // Get the target months
  const targetMonths = getLastNMonths(monthsCount);
  const monthlyData: MonthlyAttendanceData[] = [];

  targetMonths.forEach(({ month, label, year }) => {
    // Filter daily data for this month
    const monthDailyData = dailyData.filter((day) => {
      return day.year === year && day.month === parseInt(month.split("-")[1]);
    });

    if (monthDailyData.length === 0) {
      // If no data for this month, still include it with zeros
      const monthDate = new Date(year, parseInt(month.split("-")[1]) - 1, 1);
      const totalDaysInMonth = new Date(
        year,
        parseInt(month.split("-")[1]),
        0,
      ).getDate();

      monthlyData.push({
        month,
        monthLabel: label + " " + year,
        year,
        monthNumber: parseInt(month.split("-")[1]),
        totalPresentStudents: 0,
        totalStudentDays: 0,
        averageDailyPresent: 0,
        attendanceRate: 0,
        daysWithData: 0,
        totalDaysInMonth,
      });
      return;
    }

    // Calculate monthly aggregates from daily data
    const totalPresentStudents = monthDailyData.reduce(
      (sum, day) => sum + day.presentCount,
      0,
    );
    const totalStudentDays = monthDailyData.reduce(
      (sum, day) => sum + day.totalStudents,
      0,
    );
    const daysWithData = monthDailyData.length;
    const averageDailyPresent =
      daysWithData > 0 ? totalPresentStudents / daysWithData : 0;
    const attendanceRate =
      totalStudentDays > 0
        ? (totalPresentStudents / totalStudentDays) * 100
        : 0;

    const monthDate = new Date(year, parseInt(month.split("-")[1]) - 1, 1);
    const totalDaysInMonth = new Date(
      year,
      parseInt(month.split("-")[1]),
      0,
    ).getDate();

    monthlyData.push({
      month,
      monthLabel: label + " " + year,
      year,
      monthNumber: parseInt(month.split("-")[1]),
      totalPresentStudents,
      totalStudentDays,
      averageDailyPresent: Math.round(averageDailyPresent * 10) / 10,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      daysWithData,
      totalDaysInMonth,
    });
  });

  return monthlyData;
};

export const getLastNMonths = (n: number = 6) => {
  const months = [];

  // Use current date to generate recent attendance data including current month
  const now = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-US", { month: "short" });
    const year = date.getFullYear();
    months.push({ month, label, year });
  }

  return months;
};

export const getLastNDays = (n: number = 30) => {
  const days = [];
  const now = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    days.push({
      date: dateStr,
      label,
      year,
      month,
      day,
      fullDate: new Date(date),
    });
  }
  return days;
};

export const calculateAttendancePercentages = (
  records: AttendanceRecord[],
): number[] => {
  return records.map((record) => {
    const total = record.present_student_count + record.absent_student_count;
    return total > 0 ? (record.present_student_count / total) * 100 : 0;
  });
};

export const getAttendanceColorByRate = (rate: number): string => {
  if (rate >= 90) return "#4CAF50"; // Green - Excellent
  if (rate >= 80) return "#FF9800"; // Orange - Good
  return "#F44336"; // Red - Needs Improvement
};

export const getAttendanceLevelByRate = (
  rate: number,
): { level: string; color: string } => {
  if (rate >= 90) return { level: "Excellent", color: "#4CAF50" };
  if (rate >= 80) return { level: "Good", color: "#FF9800" };
  if (rate >= 70) return { level: "Fair", color: "#FFC107" };
  return { level: "Needs Improvement", color: "#F44336" };
};

export const generateMonthlyAttendanceStats = (
  monthlyData: MonthlyAttendanceData[],
): {
  averageAttendance: number;
  bestMonth: MonthlyAttendanceData | null;
  worstMonth: MonthlyAttendanceData | null;
  trend: "improving" | "declining" | "stable";
} => {
  if (monthlyData.length === 0) {
    return {
      averageAttendance: 0,
      bestMonth: null,
      worstMonth: null,
      trend: "stable",
    };
  }

  // Calculate average attendance
  const totalAttendance = monthlyData.reduce(
    (sum, month) => sum + month.attendanceRate,
    0,
  );
  const averageAttendance =
    Math.round((totalAttendance / monthlyData.length) * 10) / 10;

  // Find best and worst months
  const sortedByRate = [...monthlyData].sort(
    (a, b) => b.attendanceRate - a.attendanceRate,
  );
  const bestMonth = sortedByRate[0];
  const worstMonth = sortedByRate[sortedByRate.length - 1];

  // Determine trend (compare first half vs second half)
  const midPoint = Math.floor(monthlyData.length / 2);
  const firstHalf = monthlyData.slice(0, midPoint);
  const secondHalf = monthlyData.slice(midPoint);

  const firstHalfAvg =
    firstHalf.reduce((sum, month) => sum + month.attendanceRate, 0) /
    firstHalf.length;
  const secondHalfAvg =
    secondHalf.reduce((sum, month) => sum + month.attendanceRate, 0) /
    secondHalf.length;

  let trend: "improving" | "declining" | "stable" = "stable";
  const difference = secondHalfAvg - firstHalfAvg;

  if (difference > 2) trend = "improving";
  else if (difference < -2) trend = "declining";

  return {
    averageAttendance,
    bestMonth,
    worstMonth,
    trend,
  };
};

// ===== ATTENDANCE EDIT MODAL TRANSFORMATION UTILITIES =====

/**
 * Transforms StudentAttendanceDetail to format expected by AttendanceEditModal
 */
export const transformStudentAttendanceDetailToEditFormat = (
  record: StudentAttendanceDetail,
  gradeLevelClassId: number,
): {
  id: number;
  name: string;
  full_name: string;
  student_calling_name?: string;
  admission_number: string;
  profile_image?: string;
  grade: string;
  class: string;
  attendance: "present" | "absent" | "late";
} => {
  return {
    id: record.student_id,
    name: record.student.full_name,
    full_name: record.student.full_name,
    student_calling_name: record.student.student_calling_name,
    admission_number: record.student.admission_number,
    profile_image: undefined, // Not available in StudentAttendanceDetail
    grade: `Class ${gradeLevelClassId}`, // Simple format for now
    class: `Class ${gradeLevelClassId}`,
    attendance: record.attendance_summary.status as
      | "present"
      | "absent"
      | "late",
  };
};

/**
 * Transforms attendance edit data to UpdateStudentAttendanceRequest format
 */
export const transformEditDataToUpdateRequest = (
  studentId: number,
  gradeLevelClassId: number,
  date: string,
  attendance: "present" | "absent" | "late",
  reason?: string,
  notes?: string,
  inTime?: string,
  outTime?: string,
): UpdateStudentAttendanceRequest => {
  console.log("🔧 TRANSFORM FUNCTION - Input parameters:", {
    studentId,
    gradeLevelClassId,
    date,
    attendance,
    reason: reason || "undefined",
    notes: notes || "undefined",
    inTime: inTime || "undefined",
    outTime: outTime || "undefined",
  });

  // Start with required fields only
  const updateData: UpdateStudentAttendanceRequest = {
    student_id: studentId,
    grade_level_class_id: gradeLevelClassId,
    date: date,
    attendance_status: attendance,
  };

  console.log(
    "🔧 TRANSFORM FUNCTION - Base updateData:",
    JSON.stringify(updateData, null, 2),
  );

  // Only add optional fields if they have actual values
  if (notes && notes.trim().length > 0) {
    updateData.notes = notes.trim();
    console.log("✅ Added notes to request:", notes.trim());
  } else {
    console.log("❌ Notes NOT added - value:", notes);
  }

  if (reason && reason.trim().length > 0) {
    updateData.reason = reason.trim();
    console.log("✅ Added reason to request:", reason.trim());
  } else {
    console.log("❌ Reason NOT added - value:", reason);
  }

  // Add time fields for present and late attendance (both need times)
  if (attendance === "present" || attendance === "late") {
    console.log("🕒 Processing time fields for attendance:", attendance);

    if (inTime && inTime.trim().length > 0) {
      updateData.in_time = convertToFullTimeFormat(inTime.trim());
      console.log("✅ Added in_time to request:", updateData.in_time);
    } else {
      console.log("❌ in_time NOT added - value:", inTime);
    }

    if (outTime && outTime.trim().length > 0) {
      updateData.out_time = convertToFullTimeFormat(outTime.trim());
      console.log("✅ Added out_time to request:", updateData.out_time);
    } else {
      console.log("❌ out_time NOT added - value:", outTime);
    }
  } else {
    console.log("⏭️ Skipping time fields for attendance:", attendance);
  }

  console.log(
    "🎯 TRANSFORM FUNCTION - Final updateData:",
    JSON.stringify(updateData, null, 2),
  );
  console.log("🎯 TRANSFORM FUNCTION - Object keys:", Object.keys(updateData));

  return updateData;
};

/**
 * Converts HH:MM format to HH:MM:SS format
 */
export const convertToFullTimeFormat = (time: string): string => {
  // If already in HH:MM:SS format, return as is
  if (time.length === 8 && time.split(":").length === 3) {
    return time;
  }

  // If in HH:MM format, add ":00" for seconds
  if (time.length === 5 && time.split(":").length === 2) {
    return `${time}:00`;
  }

  // If invalid format, return with ":00" appended
  return `${time}:00`;
};

/**
 * Removes undefined values from request object to prevent backend errors
 */
export const cleanRequestObject = (obj: any): any => {
  const cleaned = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  });

  console.log(
    "🧹 cleanRequestObject - Removed keys:",
    Object.keys(obj).filter((key) => !(key in cleaned)),
  );

  return cleaned;
};

// ===== ATTENDANCE CREATION UTILITY FUNCTIONS =====

/**
 * Maps attendance status to attendance_type_id
 */
export const getAttendanceTypeId = (
  status: "present" | "absent" | "late",
): number => {
  const mapping = {
    present: 1,
    absent: 2,
    late: 3,
  };
  return mapping[status];
};

/**
 * Maps attendance_type_id to status string
 */
export const getAttendanceStatus = (
  typeId: number,
): "present" | "absent" | "late" => {
  const mapping: { [key: number]: "present" | "absent" | "late" } = {
    1: "present",
    2: "absent",
    3: "late",
  };
  return mapping[typeId] || "present";
};

/**
 * Generates default times for attendance
 */
export const getDefaultAttendanceTimes = () => {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  return {
    schoolStartTime: "07:30", // Default school start time
    currentTime: currentTime,
    schoolEndTime: "13:00", // Default school end time
  };
};

/**
 * Validates time format (HH:MM)
 */
export const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Transforms frontend student data to API format
 * Uses each student's specific grade_level_class_id if available,
 * otherwise falls back to grade_level_id or the provided fallback
 */
export const transformStudentsToAttendanceData = (
  students: any[],
  date: string,
  fallbackGradeLevelClassId: number,
  attendanceStates: {
    [studentId: number]: {
      status: "present" | "absent" | "late";
      reason?: string;
      notes?: string;
      inTime?: string;
      outTime?: string;
    };
  },
): StudentAttendanceData[] => {
  const defaultTimes = getDefaultAttendanceTimes();

  return students.map((student) => {
    const attendanceState = attendanceStates[student.id] || {
      status: "present",
    };
    const attendanceTypeId = getAttendanceTypeId(attendanceState.status);

    // Use student's specific grade_level_class_id if available, otherwise use fallback
    const studentClassId =
      student.grade_level_class_id ||
      student.grade_level_id ||
      fallbackGradeLevelClassId;

    const baseData: StudentAttendanceData = {
      student_id: student.id,
      grade_level_class_id: studentClassId,
      date: date,
      attendance_type_id: attendanceTypeId,
      notes: attendanceState.notes || undefined,
      reason: attendanceState.reason || undefined,
    };

    // Add time fields for late attendance
    if (attendanceState.status === "late") {
      baseData.in_time = attendanceState.inTime || defaultTimes.schoolStartTime;
      baseData.out_time = attendanceState.outTime || defaultTimes.currentTime;
    }

    return baseData;
  });
};

/**
 * Validates attendance data before sending to API
 */
export const validateAttendanceData = (
  data: StudentAttendanceData[],
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!data || data.length === 0) {
    errors.push("No attendance data provided");
    return { isValid: false, errors };
  }

  data.forEach((record, index) => {
    // Validate required fields
    if (!record.student_id) {
      errors.push(`Record ${index + 1}: Missing student_id`);
    }

    if (!record.grade_level_class_id) {
      errors.push(`Record ${index + 1}: Missing grade_level_class_id`);
    }

    if (!record.date) {
      errors.push(`Record ${index + 1}: Missing date`);
    }

    if (!record.attendance_type_id) {
      errors.push(`Record ${index + 1}: Missing attendance_type_id`);
    }

    // Validate attendance type ID
    if (![1, 2, 3].includes(record.attendance_type_id)) {
      errors.push(
        `Record ${index + 1}: Invalid attendance_type_id (must be 1, 2, or 3)`,
      );
    }

    // Validate time fields for late attendance
    if (record.attendance_type_id === 3) {
      // Late
      if (!record.in_time) {
        errors.push(`Record ${index + 1}: Missing in_time for late attendance`);
      } else if (!isValidTimeFormat(record.in_time)) {
        errors.push(
          `Record ${index + 1}: Invalid in_time format (must be HH:MM)`,
        );
      }

      if (!record.out_time) {
        errors.push(
          `Record ${index + 1}: Missing out_time for late attendance`,
        );
      } else if (!isValidTimeFormat(record.out_time)) {
        errors.push(
          `Record ${index + 1}: Invalid out_time format (must be HH:MM)`,
        );
      }
    }

    // Validate date format
    if (record.date && !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
      errors.push(
        `Record ${index + 1}: Invalid date format (must be YYYY-MM-DD)`,
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};
