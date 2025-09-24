import { apiServer1 } from "./api-server-1";

export interface CalendarEventData {
  id: number;
  created_by: {
    id: number;
    full_name: string;
  };
  title: string;
  event_category_id: number;
  start_date: string; // YYYY-MM-DD
  start_time: string; // hh:mm AM/PM
  end_date: string; // YYYY-MM-DD
  end_time: string; // hh:mm AM/PM
  description: string | null;
  visibility_type: string;
  is_approved: boolean;
  request_visibility_type: string | null;
  event_category: {
    id: number;
    name: string;
  };
}

export interface HolidayData {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  description: string | null;
}

export interface SpecialClassData {
  id: number;
  title: string;
  program_id: number;
  subject_id: number;
  special_class_date: string; // YYYY-MM-DD
  start_time: string; // h:mm AM/PM
  end_time: string; // h:mm AM/PM
  description: string | null;
  program: {
    id: number;
    name: string;
  };
  subject: {
    id: number;
    name: string;
    subject_code: string;
  };
}

export interface ExamData {
  id: number;
  exam_type: string;
  exam_title: string;
  exam_start_time: string; // h:mm AM/PM
  exam_start_date: string; // YYYY-MM-DD
  exam_end_time: string; // h:mm AM/PM
  exam_end_date: string; // YYYY-MM-DD
  term_id: number;
  scheduling_examination_status_type_id: number;
  description: string;
  term: {
    id: number;
    name: string;
    start_date: string; // YYYY-MM-DD
    end_date: string; // YYYY-MM-DD
    school_year: string;
  };
}

export interface CalendarEventResponse {
  status: string;
  message: string;
  data: {
    data: CalendarEventData[];
    total: number;
    event_count: number;
  };
  metadata: {
    is_system_update_pending: boolean;
  };
}

export interface HolidayResponse {
  status: string;
  message: string;
  data: {
    data: HolidayData[];
    total: number;
    holiday_count: number;
  };
  metadata: {
    is_system_update_pending: boolean;
  };
}

export interface SpecialClassResponse {
  status: string;
  message: string;
  data: {
    data: SpecialClassData[];
    total: number;
    special_class_count: number;
  };
  metadata: {
    is_system_update_pending: boolean;
  };
}

export interface ExamResponse {
  status: string;
  message: string;
  data: {
    data: ExamData[];
    total: number;
    scheduling_examinations_count: number;
  };
  metadata: {
    is_system_update_pending: boolean;
  };
}

export interface CalendarApiParams {
  page?: number;
  page_size?: number;
}

// Month Data API Interfaces
export interface MonthEventData {
  id: number;
  title: string;
  event_category_id: number;
  start_date: string; // YYYY-MM-DD
  start_time: string; // hh:mm AM/PM
  end_date: string; // YYYY-MM-DD
  end_time: string; // hh:mm AM/PM
  description: string | null;
  visibility_type: string;
  event_category: {
    id: number;
    name: string;
  };
}

export interface MonthHolidayData {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  description: string | null;
}

export interface MonthSpecialClassData {
  id: number;
  title: string;
  class_date: string; // YYYY-MM-DD
  class_time: string; // hh:mm AM/PM
  duration: string;
  instructor: string;
  subject: string;
  description: string | null;
}

// Actual API Response format based on logs
export interface MonthDataItem {
  date: string; // YYYY-MM-DD
  title: string;
  type: "event" | "holiday" | "special_class";
  description?: string;
  start_time?: string;
  end_time?: string;
  instructor?: string;
  duration?: string;
  subject?: string;
}

export interface MonthDataResponse {
  status: string;
  message: string;
  data: MonthDataItem[]; // Flat array of mixed events/holidays/special_classes
  metadata?: {
    is_system_update_pending?: boolean;
  };
}

// Keep original interface for backward compatibility
export interface MonthDataResponseNested {
  status: string;
  message: string;
  data: {
    events: MonthEventData[];
    holidays: MonthHolidayData[];
    special_classes: MonthSpecialClassData[];
    month: string; // YYYY-MM
    start_date: string; // YYYY-MM-DD
    end_date: string; // YYYY-MM-DD
  };
  metadata?: {
    is_system_update_pending?: boolean;
  };
}

export const calendarApi = apiServer1.injectEndpoints({
  endpoints: (builder) => ({
    getCalendarEvents: builder.query<CalendarEventResponse, CalendarApiParams>({
      query: (params = {}) => ({
        url: "/api/calendar-management/event/get-event-list-data",
        method: "POST",
        body: {
          page: params.page || 1,
          page_size: params.page_size || 1000, // Large page size to get all events for calendar
        },
      }),
      providesTags: ["Calendar"],
    }),

    getHolidays: builder.query<HolidayResponse, CalendarApiParams>({
      query: (params = {}) => ({
        url: "/api/calendar-management/holiday/get-holiday-list-data",
        method: "POST",
        body: {
          page: params.page || 1,
          page_size: params.page_size || 1000, // Large page size to get all holidays for calendar
        },
      }),
      providesTags: ["Calendar"],
    }),

    getSpecialClasses: builder.query<SpecialClassResponse, CalendarApiParams>({
      query: (params = {}) => ({
        url: "/api/calendar-management/special-class/get-special-class-list-data",
        method: "POST",
        body: {
          page: params.page || 1,
          page_size: params.page_size || 1000, // Large page size to get all special classes for calendar
        },
      }),
      providesTags: ["Calendar"],
    }),

    getExams: builder.query<ExamResponse, CalendarApiParams>({
      query: (params = {}) => ({
        url: "/api/exam-management/scheduling-examination/simple-list",
        method: "POST",
        body: {
          page: params.page || 1,
          page_size: params.page_size || 1000, // Large page size to get all exams for calendar
        },
      }),
      providesTags: ["Calendar"],
    }),

    // Month-specific data API
    getMonthData: builder.query<MonthDataResponse, { month: string }>({
      query: ({ month }) => {
        console.log("📅 Making Month Data API call:", {
          endpoint: "/api/calendar-management/calendar/get-month-data",
          method: "GET",
          month: month,
          format: "YYYY-MM",
        });
        return {
          url: "/api/calendar-management/calendar/get-month-data",
          method: "GET",
          params: { month }, // "2025-08" format
        };
      },
      transformResponse: (response: any) => {
        console.log("📅 Month Data API Response:", response);
        console.log("📅 Response data type:", typeof response.data);
        console.log("📅 Response data structure:", response.data);
        return response;
      },
      providesTags: ["MonthData"],
    }),
  }),
});

export const {
  useGetCalendarEventsQuery,
  useGetHolidaysQuery,
  useGetSpecialClassesQuery,
  useGetExamsQuery,
  useGetMonthDataQuery,
} = calendarApi;

// Unified calendar item interface for displaying all types of data in calendar
export interface UnifiedCalendarItem {
  id: string; // Prefixed with type for uniqueness (e.g., "event_1", "holiday_2")
  type: "event" | "holiday" | "special_class" | "exam";
  title: string;
  date: string; // YYYY-MM-DD - primary date for calendar display
  startDate?: string; // YYYY-MM-DD - for multi-day events
  endDate?: string; // YYYY-MM-DD - for multi-day events
  startTime?: string;
  endTime?: string;
  description?: string | null;
  category?: string;
  rawData: CalendarEventData | HolidayData | SpecialClassData | ExamData;
}

// Helper functions to transform API responses to unified format
export const transformEventToCalendarItem = (
  event: CalendarEventData,
): UnifiedCalendarItem => ({
  id: `event_${event.id}`,
  type: "event",
  title: event.title,
  date: event.start_date,
  startDate: event.start_date,
  endDate: event.end_date,
  startTime: event.start_time,
  endTime: event.end_time,
  description: event.description,
  category: event.event_category.name,
  rawData: event,
});

export const transformHolidayToCalendarItem = (
  holiday: HolidayData,
): UnifiedCalendarItem => ({
  id: `holiday_${holiday.id}`,
  type: "holiday",
  title: holiday.title,
  date: holiday.date,
  description: holiday.description,
  category: "Holiday",
  rawData: holiday,
});

export const transformSpecialClassToCalendarItem = (
  specialClass: SpecialClassData,
): UnifiedCalendarItem => ({
  id: `special_class_${specialClass.id}`,
  type: "special_class",
  title: specialClass.title,
  date: specialClass.special_class_date,
  startTime: specialClass.start_time,
  endTime: specialClass.end_time,
  description: specialClass.description,
  category: specialClass.subject.name,
  rawData: specialClass,
});

export const transformExamToCalendarItem = (
  exam: ExamData,
): UnifiedCalendarItem => ({
  id: `exam_${exam.id}`,
  type: "exam",
  title: exam.exam_title,
  date: exam.exam_start_date,
  startDate: exam.exam_start_date,
  endDate: exam.exam_end_date,
  startTime: exam.exam_start_time,
  endTime: exam.exam_end_time,
  description: exam.description,
  category: exam.exam_type,
  rawData: exam,
});
