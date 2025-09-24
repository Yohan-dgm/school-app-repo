import { apiServer1 } from "./api-server-1";
export const userManagementApi = apiServer1
  .enhanceEndpoints({})
  .injectEndpoints({
    endpoints: (build) => ({
      getUserListData: build.query({
        query: (payload) => ({
          url: "api/user-management/user/get-user-list-data",
          method: "POST",
          data: payload,
          // headers: {
          //   Accept: "application/json",
          //   "Content-Type": "application/json; charset=UTF-8",
          // },
          prepareHeaders: async (headers: any, api: any) => {
            headers.set("Content-Type", "application/json; charset=UTF-8");
            headers.set("Accept", "application/json");
            return headers;
          },
        }),
      }),
      changePassword: build.mutation({
        query: (payload: {
          id: number;
          current_password: string;
          new_password: string;
          confirm_password: string;
        }) => ({
          url: "api/user-management/user-profile/change-password",
          method: "POST",
          body: payload,
        }),
      }),
      uploadProfilePhoto: build.mutation({
        query: (formData: FormData) => ({
          url: "api/user-management/user-profile/upload-profile-photo",
          method: "POST",
          body: formData,
          // Global prepareHeaders in api-server-1.ts will handle FormData detection
        }),
      }),
      getAppUpdateStatus: build.query({
        query: () => ({
          url: "api/user-management/user/get-app-update-status",
          method: "POST",
          body: {},
        }),
        providesTags: ["UserManagement"],
      }),
    }),
  });

export const {
  useChangePasswordMutation,
  useUploadProfilePhotoMutation,
  useGetAppUpdateStatusQuery,
} = userManagementApi;
