import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { StudentExamReportResponse } from "../types/student-exam-report";

export const studentExamReportApi = createApi({
  reducerPath: "studentExamReportApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
    prepareHeaders: (headers, { getState }) => {
      // Get token from Redux state
      const token =
        (getState() as any)?.app?.sessionData?.token ||
        (getState() as any)?.app?.sessionData?.data?.token;

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["StudentExamReport"],
  endpoints: (builder) => ({
    getStudentExamReport: builder.query<
      StudentExamReportResponse,
      { studentId: number }
    >({
      query: ({ studentId }) => ({
        url: `api/exam-management/student-exam-report/get-by-scheduling-examination-id`,
        method: "POST",
        body: { student_id: studentId },
      }),
      providesTags: ["StudentExamReport"],
    }),
  }),
});

export const {
  useGetStudentExamReportQuery,
  useLazyGetStudentExamReportQuery,
} = studentExamReportApi;
