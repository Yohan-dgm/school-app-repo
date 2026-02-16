import { apiServer1 } from "./api-server-1";
import { AnnouncementCategory } from "../constants/announcementCategories";

// Request/Response interfaces based on CommunicationManagement_frontend.md
export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  excerpt?: string;
  category_id: number;
  priority_level: 1 | 2 | 3;
  status: "draft" | "scheduled" | "published";
  target_type: string; // Changed from enum to string to support dynamic values
  target_data?: {
    roles?: string[];
    user_ids?: number[];
    grade_level_class_ids?: number[];
    grade_level_ids?: number[];
    group_filter?: string; // Added for the new filter logic
    selected_ids?: number[] | string[]; // Generic holder for IDs
  };
  image_url?: string;
  attachment_urls?: string[];
  is_featured?: boolean;
  is_pinned?: boolean;
  scheduled_at?: string;
  expires_at?: string;
  tags?: string;
  meta_data?: Record<string, any>;
}

export interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  category_id: number;
  priority_level: number;
  status: string;
  image_url?: string;
  is_featured: boolean;
  is_pinned: boolean;
  published_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  category?: {
    id: number;
    name: string;
    color: string;
    icon: string;
  };
  view_count?: number;
  like_count?: number;
  engagement_stats?: {
    views: number;
    likes: number;
    shares: number;
  };
}

export interface GetAnnouncementsRequest {
  page?: number;
  per_page?: number;
  category_id?: number;
  priority_level?: 1 | 2 | 3;
  status?: "draft" | "scheduled" | "published" | "archived";
  is_featured?: boolean;
  is_pinned?: boolean;
  search?: string;
}

export interface AnnouncementsResponse {
  success: boolean;
  message: string;
  announcements: AnnouncementItem[];
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

// Enhanced logging utility
const apiLogger = {
  request: (endpoint: string, method: string, params?: any) => {
    console.log(`📤 [AnnouncementAPI] Request - ${method} ${endpoint}`, {
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      params,
      baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
    });
  },
  response: (endpoint: string, method: string, data: any) => {
    console.log(`📥 [AnnouncementAPI] Response - ${method} ${endpoint}`, {
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      responseType: typeof data,
      hasData: !!data,
      success: data?.success,
      message: data?.message,
    });
  },
  error: (endpoint: string, method: string, error: any) => {
    console.error(`❌ [AnnouncementAPI] Error - ${method} ${endpoint}`, {
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status: error?.status,
      statusText: error?.statusText,
      errorData: error?.data,
      errorMessage: error?.message,
    });
  },
};

export const announcementsApi = apiServer1.injectEndpoints({
  endpoints: (builder) => ({
    // POST /api/communication-management/announcements/create
    createAnnouncement: builder.mutation<
      { success: boolean; message: string; data: AnnouncementItem },
      CreateAnnouncementRequest
    >({
      query: (announcement) => {
        const endpoint = "api/communication-management/announcements/create";
        const method = "POST";
        apiLogger.request(endpoint, method, announcement);

        return {
          url: endpoint,
          method: method,
          body: announcement,
        };
      },
      invalidatesTags: ["Announcements"],
      transformResponse: (response: any) => {
        const endpoint = "api/communication-management/announcements/create";
        const method = "POST";
        apiLogger.response(endpoint, method, response);
        return response;
      },
      transformErrorResponse: (error: any) => {
        const endpoint = "api/communication-management/announcements/create";
        const method = "POST";
        apiLogger.error(endpoint, method, error);
        return error;
      },
    }),

    // POST /api/communication-management/announcements/list
    getAnnouncements: builder.query<
      AnnouncementsResponse,
      GetAnnouncementsRequest
    >({
      query: (params = {}) => {
        const requestBody = {
          page: params.page || 1,
          per_page: params.per_page || 20,
          category_id: params.category_id || null,
          priority_level: params.priority_level || null,
          status: params.status || null,
          is_featured: params.is_featured || null,
          is_pinned: params.is_pinned || null,
          search: params.search || "",
        };

        const endpoint = "api/communication-management/announcements/list";
        const method = "POST";
        apiLogger.request(endpoint, method, requestBody);

        return {
          url: endpoint,
          method: method,
          body: requestBody,
        };
      },
      providesTags: ["Announcements"],
      transformResponse: (response: any) => {
        const endpoint = "api/communication-management/announcements/list";
        const method = "POST";
        apiLogger.response(endpoint, method, response);
        return response;
      },
    }),

    // POST /api/communication-management/announcements/details
    getAnnouncementDetails: builder.query<
      { success: boolean; message: string; data: AnnouncementItem },
      { announcement_id: number }
    >({
      query: ({ announcement_id }) => {
        const requestBody = { announcement_id };
        const endpoint = "api/communication-management/announcements/details";
        const method = "POST";
        apiLogger.request(endpoint, method, requestBody);

        return {
          url: endpoint,
          method: method,
          body: requestBody,
        };
      },
      providesTags: (result, error, arg) => [
        { type: "Announcements", id: arg.announcement_id },
      ],
    }),

    // GET /api/communication-management/announcement-categories
    getAnnouncementCategories: builder.query<
      { success: boolean; message: string; data: AnnouncementCategory[] },
      void
    >({
      query: () => {
        const endpoint = "api/communication-management/announcement-categories";
        const method = "GET";
        apiLogger.request(endpoint, method);

        return {
          url: endpoint,
          method: method,
        };
      },
      providesTags: ["AnnouncementCategories"],
      transformResponse: (response: any) => {
        const endpoint = "api/communication-management/announcement-categories";
        const method = "GET";
        apiLogger.response(endpoint, method, response);
        return response;
      },
    }),
  }),
  overrideExisting: false,
});



export const {
  useCreateAnnouncementMutation,
  useGetAnnouncementsQuery,
  useGetAnnouncementDetailsQuery,
  useGetAnnouncementCategoriesQuery,
} = announcementsApi;
