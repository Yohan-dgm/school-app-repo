import { apiServer1 } from "./api-server-1";

/**
 * STUDENT HEADER API
 *
 * Fetches fresh single-student data (for the authenticated header) by the
 * currently selected student id. Separate from student-management-api.ts's
 * school-wide student directory — this only ever returns a student already
 * linked to the logged-in guardian (enforced server-side).
 */

export interface StudentHeaderData {
  id: number;
  admission_number: string;
  full_name: string;
  full_name_with_title: string;
  student_calling_name: string;
  gender: string;
  date_of_birth: string;
  grade_level_id: number | null;
  grade_level_class_id: number | null;
  school_house_id: number | null;
  grade_level: { id: number; name: string } | null;
  grade_level_class: {
    id: number;
    name: string;
    grade_level_id: number;
  } | null;
  school_house: { id: number; name: string } | null;
  guardian_info: Record<string, any> | null;
  attachments: {
    id: number;
    file_name: string;
    original_file_name: string;
    mime_type: string;
    created_at: string;
  }[];
  student_attachment_list?: Record<string, any>[];
  [key: string]: any;
}

export interface GetStudentHeaderDataResponse {
  status: string;
  data: StudentHeaderData;
}

export interface GetStudentHeaderDataRequest {
  student_id: number;
}

/**
 * Raw student shape returned in `student_list` — same fields SignInIntent
 * already embeds in the login response, so `transformStudentWithProfilePicture()`
 * consumes it unmodified regardless of whether the data came from login or
 * this fresh fetch.
 */
export interface MyStudentListItem {
  id: number;
  admission_number: string;
  full_name: string;
  student_calling_name: string;
  [key: string]: any;
}

export interface GetMyStudentListResponse {
  status: string;
  data: {
    student_list: MyStudentListItem[];
    user_payments: any[];
  };
}

export const studentHeaderApi = apiServer1.injectEndpoints({
  endpoints: (builder) => ({
    getStudentHeaderData: builder.query<
      GetStudentHeaderDataResponse,
      GetStudentHeaderDataRequest
    >({
      query: (params) => ({
        url: "api/student-management/student/get-student-header-data",
        method: "POST",
        body: params,
      }),
    }),

    // Fresh "my children" list for the header's student picker — fetched
    // on demand when the picker opens, not read from the login response.
    getMyStudentList: builder.query<GetMyStudentListResponse, void>({
      query: () => ({
        url: "api/user-management/user/get-my-student-list",
        method: "POST",
        body: {},
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetStudentHeaderDataQuery,
  useLazyGetStudentHeaderDataQuery,
  useGetMyStudentListQuery,
  useLazyGetMyStudentListQuery,
} = studentHeaderApi;
