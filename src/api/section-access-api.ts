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
  }),
});

export const { useGetMySectionAccessQuery } = sectionAccessApi;

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
