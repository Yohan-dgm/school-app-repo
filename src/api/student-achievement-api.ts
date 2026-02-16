import { apiServer1 } from "./api-server-1";

// ============================================
// TypeScript Interfaces
// ============================================

export interface CreateStudentAchievementRequest {
  student_id: number;
  grade_level_id: number;
  grade_level_class_id: number;
  achievement_type: string;
  title: string;
  description: string;
  time_range: "1_month" | "3_month" | "1_year" | "10_year";
  start_date?: string;
  end_date?: string;
  created_by_user_id: number;
  school_id: number;
}

export interface StudentAchievement {
  id: number;
  student_id: number;
  achievement_type: string;
  title: string;
  description: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  student?: {
    id: number;
    full_name: string;
    admission_number: string;
    profile_image: string | null;
  };
}

export interface CreateStudentAchievementResponse {
  status: "successful" | "failed";
  message: string;
  data: StudentAchievement | null;
  metadata: any;
}

// ============================================
// API Endpoints
// ============================================

export const studentAchievementApi = apiServer1.injectEndpoints({
  endpoints: (build) => ({
    createStudentAchievement: build.mutation<
      CreateStudentAchievementResponse,
      CreateStudentAchievementRequest
    >({
      query: (data) => ({
        url: "api/student-management/student-achievement/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["StudentAchievement"],
    }),

    getStudentAchievementList: build.query<
      {
        status: string;
        message: string;
        data: StudentAchievement[];
        metadata: {
          current_page: number;
          total_pages: number;
          total_records: number;
          page_size: number;
        };
      },
      {
        student_id?: number;
        page?: number;
        page_size?: number;
      }
    >({
      query: (params) => ({
        url: "api/student-management/student-achievement/get-list-data",
        method: "POST",
        body: params,
      }),
      providesTags: ["StudentAchievement"],
    }),

    getCurrentStudentAchievements: build.query<
      {
        status: string;
        message: string;
        data: StudentAchievement[];
        metadata: any;
      },
      { student_id: number }
    >({
      query: (params) => ({
        url: "api/student-management/student-achievement/get-current-by-student-id",
        method: "POST",
        body: params,
      }),
      providesTags: ["StudentAchievement"],
    }),
  }),
});

// ============================================
// Exported Hooks
// ============================================

export const {
  useCreateStudentAchievementMutation,
  useGetStudentAchievementListQuery,
  useGetCurrentStudentAchievementsQuery,
} = studentAchievementApi;
