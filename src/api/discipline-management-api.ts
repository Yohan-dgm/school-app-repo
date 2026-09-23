import { apiServer1 } from "./api-server-1";

/**
 * DISCIPLINE MANAGEMENT API
 *
 * Read-only (from the parent/student app's perspective) access to a
 * student's Discipline Marks Matrix data: remaining marks for the current
 * (or a selected) academic year, the conduct rating band, and the list of
 * discipline records behind that total.
 *
 * Endpoint: POST /api/discipline-management/discipline-record/get-student-discipline-summary
 */

// ===== TYPESCRIPT INTERFACES =====

export interface DisciplineMisconductLevelRef {
  id: number;
  level_number: number;
  level_name: string;
}

export type DisciplineRecordStatus = "Pending" | "Approved" | "Rejected";

export interface DisciplineRecordItem {
  id: number;
  student_id: number;
  academic_year: string;
  offence: string;
  description: string | null;
  incident_date: string;
  marks_deducted: number;
  override_reason: string | null;
  disciplinary_action_taken: string | null;
  status: DisciplineRecordStatus;
  reviewed_date: string | null;
  parent_informed: boolean;
  student_response: string | null;
  grade_class_at_time: string | null;
  misconduct_level: DisciplineMisconductLevelRef;
  reported_by_user?: { id: number; call_name_with_title: string } | null;
  reviewed_by_user?: { id: number; call_name_with_title: string } | null;
}

export interface DisciplineSummaryStudent {
  id: number;
  full_name: string;
  full_name_with_title: string;
  admission_number: string;
  grade_level_class_id: number;
  grade_level_class?: { id: number; name: string } | null;
}

export interface GetStudentDisciplineSummaryParams {
  student_id: number;
  academic_year?: string;
}

export interface StudentDisciplineSummaryData {
  student: DisciplineSummaryStudent;
  academic_year: string;
  baseline_marks: number;
  remaining_marks: number;
  conduct_rating: string;
  records: DisciplineRecordItem[];
  available_academic_years: string[];
}

export interface GetStudentDisciplineSummaryResponse {
  status: string;
  message: string;
  data: StudentDisciplineSummaryData;
  metadata: any;
}

// ----- Misconduct level matrix -----

export interface MisconductLevel {
  id: number;
  level_number: number;
  level_name: string;
  nature_of_offence: string;
  indicative_deduction_min: number;
  indicative_deduction_max: number;
  examples: string | null;
  approval_tier: number;
  is_active: boolean;
}

export interface GetMisconductLevelListDataResponse {
  status: string;
  message: string;
  data: MisconductLevel[];
  metadata: any;
}

// ----- Discipline record list (educator management view) -----

export interface DisciplineRecordListItem extends DisciplineRecordItem {
  student?: {
    id: number;
    full_name: string;
    full_name_with_title: string;
    admission_number: string;
    grade_level_class_id: number;
  };
}

export interface GetDisciplineRecordListDataParams {
  grade_class_at_time?: string;
  academic_year?: string;
  status?: DisciplineRecordStatus;
  search_phrase?: string;
  page_size: number;
  page: number;
}

// Laravel's default paginate() shape
export interface DisciplineRecordListData {
  current_page: number;
  data: DisciplineRecordListItem[];
  last_page: number;
  per_page: number;
  total: number;
}

export interface GetDisciplineRecordListDataResponse {
  status: string;
  message: string;
  data: DisciplineRecordListData;
  metadata: any;
}

// ----- Create / Update / Delete / Approve / Reject -----

export interface CreateDisciplineRecordParams {
  student_id: number;
  misconduct_level_id: number;
  offence: string;
  description?: string;
  incident_date: string;
  marks_deducted: number;
  override_reason?: string;
  disciplinary_action_taken?: string;
  parent_informed?: boolean;
  student_response?: string;
}

export interface UpdateDisciplineRecordParams
  extends Omit<CreateDisciplineRecordParams, "student_id"> {
  id: number;
}

export interface DisciplineRecordIdParam {
  id: number;
}

export interface DisciplineRecordMutationResponse {
  status: string;
  message: string;
  data: DisciplineRecordItem;
  metadata: any;
}

// ===== API ENDPOINTS =====

export const disciplineManagementApi = apiServer1.injectEndpoints({
  endpoints: (builder) => ({
    getStudentDisciplineSummary: builder.query<
      GetStudentDisciplineSummaryResponse,
      GetStudentDisciplineSummaryParams
    >({
      query: (params) => ({
        url: "api/discipline-management/discipline-record/get-student-discipline-summary",
        method: "POST",
        body: params,
      }),
      providesTags: (result, error, args) => [
        { type: "DisciplineSummary", id: args.student_id },
        "DisciplineSummary",
      ],
    }),

    getMisconductLevelListData: builder.query<
      GetMisconductLevelListDataResponse,
      { include_inactive?: boolean } | void
    >({
      query: (params) => ({
        url: "api/discipline-management/misconduct-level/get-misconduct-level-list-data",
        method: "POST",
        body: params || {},
      }),
      providesTags: ["MisconductLevelList"],
    }),

    getDisciplineRecordListData: builder.query<
      GetDisciplineRecordListDataResponse,
      GetDisciplineRecordListDataParams
    >({
      query: (params) => ({
        url: "api/discipline-management/discipline-record/get-discipline-record-list-data",
        method: "POST",
        body: params,
      }),
      providesTags: ["DisciplineRecordList"],
    }),

    createDisciplineRecord: builder.mutation<
      DisciplineRecordMutationResponse,
      CreateDisciplineRecordParams
    >({
      query: (params) => ({
        url: "api/discipline-management/discipline-record/create-discipline-record",
        method: "POST",
        body: params,
      }),
      invalidatesTags: ["DisciplineRecordList", "DisciplineSummary"],
    }),

    updateDisciplineRecord: builder.mutation<
      DisciplineRecordMutationResponse,
      UpdateDisciplineRecordParams
    >({
      query: (params) => ({
        url: "api/discipline-management/discipline-record/update-discipline-record",
        method: "POST",
        body: params,
      }),
      invalidatesTags: ["DisciplineRecordList", "DisciplineSummary"],
    }),

    deleteDisciplineRecord: builder.mutation<
      DisciplineRecordMutationResponse,
      DisciplineRecordIdParam
    >({
      query: (params) => ({
        url: "api/discipline-management/discipline-record/delete-discipline-record",
        method: "POST",
        body: params,
      }),
      invalidatesTags: ["DisciplineRecordList", "DisciplineSummary"],
    }),

    approveDisciplineRecord: builder.mutation<
      DisciplineRecordMutationResponse,
      DisciplineRecordIdParam
    >({
      query: (params) => ({
        url: "api/discipline-management/discipline-record/approve-discipline-record",
        method: "POST",
        body: params,
      }),
      invalidatesTags: ["DisciplineRecordList", "DisciplineSummary"],
    }),

    rejectDisciplineRecord: builder.mutation<
      DisciplineRecordMutationResponse,
      DisciplineRecordIdParam
    >({
      query: (params) => ({
        url: "api/discipline-management/discipline-record/reject-discipline-record",
        method: "POST",
        body: params,
      }),
      invalidatesTags: ["DisciplineRecordList", "DisciplineSummary"],
    }),
  }),
});

export const {
  useGetStudentDisciplineSummaryQuery,
  useGetMisconductLevelListDataQuery,
  useGetDisciplineRecordListDataQuery,
  useCreateDisciplineRecordMutation,
  useUpdateDisciplineRecordMutation,
  useDeleteDisciplineRecordMutation,
  useApproveDisciplineRecordMutation,
  useRejectDisciplineRecordMutation,
} = disciplineManagementApi;

// ===== UI UTILITIES =====

/**
 * Color for the conduct-rating badge, banded to match the backend's
 * 6-tier scale (DisciplineMarksCalculator::conductRating on the backend).
 */
export const getConductRatingColor = (rating: string): string => {
  switch (rating) {
    case "Outstanding Conduct":
      return "#15803D";
    case "Very Good Conduct":
      return "#22C55E";
    case "Good Conduct":
      return "#84CC16";
    case "Satisfactory Conduct":
      return "#EAB308";
    case "Improvement Required":
      return "#F97316";
    case "Serious Improvement Required":
      return "#DC2626";
    default:
      return "#9CA3AF";
  }
};

export const getDisciplineStatusColor = (
  status: DisciplineRecordStatus,
): string => {
  switch (status) {
    case "Approved":
      return "#16A34A";
    case "Pending":
      return "#D97706";
    case "Rejected":
      return "#6B7280";
    default:
      return "#6B7280";
  }
};

/**
 * Color for a misconduct-level chip, banded 1 (minor, green) -> 5 (gross, red)
 * to match the school's official 5-level matrix.
 */
export const getMisconductLevelColor = (levelNumber: number): string => {
  switch (levelNumber) {
    case 1:
      return "#22C55E";
    case 2:
      return "#84CC16";
    case 3:
      return "#EAB308";
    case 4:
      return "#F97316";
    case 5:
      return "#DC2626";
    default:
      return "#9CA3AF";
  }
};

export const formatDisciplineDate = (dateString: string): string => {
  try {
    // Backend may send a plain "YYYY-MM-DD" or a full ISO datetime
    // ("YYYY-MM-DDTHH:mm:ss.uuuuuuZ") depending on how the date cast
    // serializes - always drop any time portion so only the date renders.
    const datePart = dateString.split("T")[0];
    const [year, month, day] = datePart.split("-").map(Number);
    if (!year || !month || !day) return dateString;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};
