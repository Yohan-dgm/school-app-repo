import { apiServer1 } from "./api-server-1";

/**
 * EDUCATOR FEEDBACK - RATING MODE API
 *
 * - config:     which Add Feedback flow to use ("classic" | "rating"), set in the database
 * - categories: active categories (with no questions) for a grade section (ey | pr | sc)
 * - create:     one feedback per category per student, one random category keeps the comment
 */
export type FeedbackAddMode = "classic" | "rating";

export type RatingCategory = { id: number; name: string };

export type SubmitRatingFeedbackBody = {
  student_ids: number[];
  grade_level_id: number;
  grade_level_class_id: number;
  section: "ey" | "pr" | "sc";
  comment: string;
  ratings: { category_id: number; rating: number }[];
};

export const educatorFeedbackRatingApi = apiServer1.injectEndpoints({
  endpoints: (build) => ({
    getFeedbackMode: build.query<FeedbackAddMode, void>({
      query: () => ({
        url: "api/educator-feedback-management/rating/config",
        method: "POST",
        body: {},
      }),
      transformResponse: (response: any): FeedbackAddMode =>
        response?.data?.add_mode === "rating" ? "rating" : "classic",
    }),
    getRatingCategories: build.query<RatingCategory[], { section: string }>({
      query: ({ section }) => ({
        url: "api/educator-feedback-management/rating/categories",
        method: "POST",
        body: { section },
      }),
      transformResponse: (response: any): RatingCategory[] =>
        response?.data || [],
    }),
    getRatingFeedbackList: build.query<
      any,
      { page: number; page_size: number; grade_filter: number | null }
    >({
      query: (body) => ({
        url: "api/educator-feedback-management/rating/list",
        method: "POST",
        body,
      }),
      providesTags: [{ type: "EducatorFeedback", id: "LIST" }],
    }),
    getStudentRatingFeedbackList: build.query<
      any,
      { student_id: number; page: number; page_size: number }
    >({
      query: (body) => ({
        url: "api/educator-feedback-management/rating/student-list",
        method: "POST",
        body,
      }),
      providesTags: [{ type: "EducatorFeedback", id: "LIST" }],
    }),
    deleteRatingFeedback: build.mutation<any, { submission_id: string }>({
      query: (body) => ({
        url: "api/educator-feedback-management/rating/delete",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "EducatorFeedback", id: "LIST" }],
    }),
    addRatingEvaluation: build.mutation<
      any,
      {
        submission_id: string;
        edu_fd_evaluation_type_id: number;
        reviewer_feedback: string;
        is_parent_visible: boolean;
      }
    >({
      query: (body) => ({
        url: "api/educator-feedback-management/rating/evaluation/create",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "EducatorFeedback", id: "LIST" }],
    }),
    deleteRatingEvaluation: build.mutation<
      any,
      { submission_id: string; evaluation_id: number }
    >({
      query: (body) => ({
        url: "api/educator-feedback-management/rating/evaluation/delete",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "EducatorFeedback", id: "LIST" }],
    }),
    submitRatingFeedback: build.mutation<any, SubmitRatingFeedbackBody>({
      query: (body) => ({
        url: "api/educator-feedback-management/rating/create",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "EducatorFeedback", id: "LIST" },
        { type: "Students", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetFeedbackModeQuery,
  useGetRatingCategoriesQuery,
  useSubmitRatingFeedbackMutation,
  useGetRatingFeedbackListQuery,
  useGetStudentRatingFeedbackListQuery,
  useDeleteRatingFeedbackMutation,
  useAddRatingEvaluationMutation,
  useDeleteRatingEvaluationMutation,
} = educatorFeedbackRatingApi;
