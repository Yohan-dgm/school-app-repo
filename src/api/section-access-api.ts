import { useSelector } from "react-redux";
import { apiServer1 } from "./api-server-1";

/**
 * SECTION ACCESS API
 *
 * Generic, reusable per-user gating: "which app sections can the current
 * user see". Backed by a single `section_access` table keyed on
 * `section_key` + `user_id`, so any new gated section just needs its own
 * key - no new backend module required.
 *
 * Endpoint: POST /api/section-access-management/section-access/get-my-section-access
 */

export interface GetMySectionAccessResponse {
  status: string;
  message: string;
  data: {
    section_keys: string[];
  };
  metadata: any;
}

export interface GrantableUser {
  id: number;
  full_name: string;
  username: string;
  user_category: number;
}

export interface GetGrantableUserListResponse {
  status: string;
  message: string;
  data: GrantableUser[];
  metadata: any;
}

export interface SectionAccessGrant {
  id: number;
  section_key: string;
  user_id: number;
  granted_by: number;
  created_at: string;
  user?: { id: number; full_name: string; username: string };
}

export interface GetSectionAccessListDataResponse {
  status: string;
  message: string;
  data: SectionAccessGrant[];
  metadata: any;
}

export interface SectionAccessMutationResponse {
  status: string;
  message: string;
  data: any;
  metadata: any;
}

export const sectionAccessApi = apiServer1.injectEndpoints({
  endpoints: (builder) => ({
    getMySectionAccess: builder.query<GetMySectionAccessResponse, void>({
      query: () => ({
        url: "api/section-access-management/section-access/get-my-section-access",
        method: "POST",
        body: {},
      }),
      providesTags: ["SectionAccess"],
    }),

    searchGrantableUsers: builder.query<
      GetGrantableUserListResponse,
      { search_phrase?: string }
    >({
      query: (params) => ({
        url: "api/section-access-management/section-access/get-grantable-user-list",
        method: "POST",
        body: params,
      }),
    }),

    getSectionAccessListData: builder.query<
      GetSectionAccessListDataResponse,
      { section_key: string }
    >({
      query: (params) => ({
        url: "api/section-access-management/section-access/get-section-access-list-data",
        method: "POST",
        body: params,
      }),
      providesTags: ["SectionAccess"],
    }),

    grantSectionAccess: builder.mutation<
      SectionAccessMutationResponse,
      { user_id: number; section_key: string }
    >({
      query: (params) => ({
        url: "api/section-access-management/section-access/grant-section-access",
        method: "POST",
        body: params,
      }),
      invalidatesTags: ["SectionAccess"],
    }),

    revokeSectionAccess: builder.mutation<
      SectionAccessMutationResponse,
      { user_id: number; section_key: string }
    >({
      query: (params) => ({
        url: "api/section-access-management/section-access/revoke-section-access",
        method: "POST",
        body: params,
      }),
      invalidatesTags: ["SectionAccess"],
    }),
  }),
});

export const {
  useGetMySectionAccessQuery,
  useSearchGrantableUsersQuery,
  useGetSectionAccessListDataQuery,
  useGrantSectionAccessMutation,
  useRevokeSectionAccessMutation,
} = sectionAccessApi;

/**
 * Convenience hook: returns whether the logged-in user has been granted
 * `sectionKey`. Skips the fetch entirely when there's no logged-in user yet.
 */
export const useHasSectionAccess = (sectionKey: string): boolean => {
  const { sessionData } = useSelector((state: any) => state.app);
  const userId = sessionData?.data?.id;

  const { data } = useGetMySectionAccessQuery(undefined, {
    skip: !userId,
  });

  return !!data?.data?.section_keys?.includes(sectionKey);
};
