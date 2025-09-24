import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { StudentExamApiResponse } from "../types/student-exam";

export const studentExamApi = createApi({
  reducerPath: "studentExamApi",
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
  tagTypes: ["StudentExam"],
  endpoints: (builder) => ({
    getStudentExamData: builder.query<
      StudentExamApiResponse,
      { studentId: number }
    >({
      query: ({ studentId }) => ({
        url: `api/exam-management/student-exam-data/get-student-exam-data`,
        method: "POST",
        body: { student_id: studentId },
      }),
      providesTags: ["StudentExam"],
    }),
  }),
});

export const { useGetStudentExamDataQuery, useLazyGetStudentExamDataQuery } =
  studentExamApi;
