import { apiServer1 } from "./api-server-1";

// TypeScript interfaces for grade level and class data
export interface GradeLevelClass {
  id: number;
  name: string;
  grade_level_id: number;
}

export interface GradeLevelWithClasses {
  id: number;
  name: string;
  grade_level_class_list: GradeLevelClass[];
}

export interface GetGradeLevelsRequest {
  page_size: number;
  page: number;
}

export interface GetGradeLevelsResponse {
  status: string;
  message: string;
  data: {
    data: GradeLevelWithClasses[];
    total: number;
    grade_level_count: number;
  };
  metadata: {
    is_system_update_pending: boolean;
  };
}

// API endpoints
export const gradeLevelApi = apiServer1.injectEndpoints({
  endpoints: (build) => ({
    getGradeLevelsWithClasses: build.query<
      GetGradeLevelsResponse,
      GetGradeLevelsRequest
    >({
      query: (params) => ({
        url: "api/program-management/grade-level/get-grade-levels-with-classes",
        method: "POST",
        body: params,
      }),
      providesTags: ["GradeLevels"],
    }),
  }),
});

export const {
  useGetGradeLevelsWithClassesQuery,
  useLazyGetGradeLevelsWithClassesQuery,
} = gradeLevelApi;
