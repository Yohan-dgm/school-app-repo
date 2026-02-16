import { apiServer1 } from "./api-server-1";

// ===== TypeScript Interfaces =====

// Teacher (from teachers/list endpoint)
export interface Teacher {
  id: number;
  full_name: string;
}

export interface GetTeachersResponse {
  status: string;
  message: string;
  data: Teacher[];
  metadata: {
    total: number;
  };
}

// Class Teacher
export interface ClassTeacherUser {
  id: number;
  full_name: string;
}

export interface ClassTeacherGradeLevel {
  id: number;
  name: string;
}

export interface ClassTeacherClass {
  id: number;
  name: string;
  grade_level: ClassTeacherGradeLevel;
}

export interface ClassTeacher {
  id: number;
  user_id: number;
  grade_level_class_id: number;
  academic_year: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user: ClassTeacherUser;
  grade_level_class: ClassTeacherClass;
}

export interface GetClassTeachersRequest {
  user_id?: number;
  grade_level_class_id?: number;
  academic_year?: string;
  is_active?: boolean;
  current?: boolean;
}

export interface GetClassTeachersResponse {
  status: string;
  message: string;
  data: ClassTeacher[];
  metadata: {
    total: number;
  };
}

export interface CreateClassTeacherRequest {
  user_id: number;
  grade_level_class_id: number;
  academic_year: string;
  start_date: string;
  end_date?: string | null;
}

export interface UpdateClassTeacherRequest {
  id: number;
  user_id?: number;
  grade_level_class_id?: number;
  academic_year?: string;
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
}

export interface DeleteClassTeacherRequest {
  id: number;
}

export interface ClassTeacherMutationResponse {
  status: string;
  message: string;
  data: ClassTeacher;
  metadata: any;
}

// Sectional Head
export interface SectionalHeadUser {
  id: number;
  full_name: string;
}

export interface SectionalHeadGradeLevel {
  id: number;
  name: string;
}

export interface SectionalHead {
  id: number;
  user_id: number;
  grade_level_id: number;
  academic_year: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user: SectionalHeadUser;
  grade_level: SectionalHeadGradeLevel;
}

export interface GetSectionalHeadsRequest {
  user_id?: number;
  grade_level_id?: number;
  academic_year?: string;
  is_active?: boolean;
  current?: boolean;
}

export interface GetSectionalHeadsResponse {
  status: string;
  message: string;
  data: SectionalHead[];
  metadata: {
    total: number;
  };
}

export interface CreateSectionalHeadRequest {
  user_id: number;
  grade_level_id: number;
  academic_year: string;
  start_date: string;
  end_date?: string | null;
}

export interface UpdateSectionalHeadRequest {
  id: number;
  user_id?: number;
  grade_level_id?: number;
  academic_year?: string;
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
}

export interface DeleteSectionalHeadRequest {
  id: number;
}

export interface SectionalHeadMutationResponse {
  status: string;
  message: string;
  data: SectionalHead;
  metadata: any;
}

// ===== API Endpoints =====

export const academicStaffApi = apiServer1.injectEndpoints({
  endpoints: (build) => ({
    // ===== Teachers =====
    getTeachers: build.query<GetTeachersResponse, void>({
      query: () => ({
        url: "api/academic-staff-management/teachers/list",
        method: "POST",
        body: {},
      }),
      providesTags: ["AcademicStaff"],
    }),

    // ===== Class Teachers =====
    getClassTeachers: build.query<
      GetClassTeachersResponse,
      GetClassTeachersRequest
    >({
      query: (params) => ({
        url: "api/academic-staff-management/class-teacher/list",
        method: "POST",
        body: params,
      }),
      providesTags: ["ClassTeachers"],
    }),

    createClassTeacher: build.mutation<
      ClassTeacherMutationResponse,
      CreateClassTeacherRequest
    >({
      query: (body) => ({
        url: "api/academic-staff-management/class-teacher/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClassTeachers"],
    }),

    updateClassTeacher: build.mutation<
      ClassTeacherMutationResponse,
      UpdateClassTeacherRequest
    >({
      query: (body) => ({
        url: "api/academic-staff-management/class-teacher/update",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClassTeachers"],
    }),

    deleteClassTeacher: build.mutation<
      ClassTeacherMutationResponse,
      DeleteClassTeacherRequest
    >({
      query: (body) => ({
        url: "api/academic-staff-management/class-teacher/delete",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClassTeachers"],
    }),

    // ===== Sectional Heads =====
    getSectionalHeads: build.query<
      GetSectionalHeadsResponse,
      GetSectionalHeadsRequest
    >({
      query: (params) => ({
        url: "api/academic-staff-management/sectional-head/list",
        method: "POST",
        body: params,
      }),
      providesTags: ["SectionalHeads"],
    }),

    createSectionalHead: build.mutation<
      SectionalHeadMutationResponse,
      CreateSectionalHeadRequest
    >({
      query: (body) => ({
        url: "api/academic-staff-management/sectional-head/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SectionalHeads"],
    }),

    updateSectionalHead: build.mutation<
      SectionalHeadMutationResponse,
      UpdateSectionalHeadRequest
    >({
      query: (body) => ({
        url: "api/academic-staff-management/sectional-head/update",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SectionalHeads"],
    }),

    deleteSectionalHead: build.mutation<
      SectionalHeadMutationResponse,
      DeleteSectionalHeadRequest
    >({
      query: (body) => ({
        url: "api/academic-staff-management/sectional-head/delete",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SectionalHeads"],
    }),
  }),
});

// ===== Export Hooks =====
export const {
  // Teachers
  useGetTeachersQuery,
  useLazyGetTeachersQuery,

  // Class Teachers
  useGetClassTeachersQuery,
  useLazyGetClassTeachersQuery,
  useCreateClassTeacherMutation,
  useUpdateClassTeacherMutation,
  useDeleteClassTeacherMutation,

  // Sectional Heads
  useGetSectionalHeadsQuery,
  useLazyGetSectionalHeadsQuery,
  useCreateSectionalHeadMutation,
  useUpdateSectionalHeadMutation,
  useDeleteSectionalHeadMutation,
} = academicStaffApi;
