import { setToken, setUser } from "@/state-store/slices/app-slice";
import { apiServer1 } from "./api-server-1";
import { AuthApiResponse, LoginRequest } from "@/types/auth";

// const getCookie = (cookieName: string): string | undefined => {
//   const cookieArray = document.cookie.split(";");

//   for (const cookie of cookieArray) {
//     let cookieString = cookie;

//     while (cookieString.charAt(0) == " ") {
//       cookieString = cookieString.substring(1, cookieString.length);
//     }
//     if (cookieString.indexOf(cookieName + "=") == 0) {
//       return cookieString.substring(cookieName.length + 1, cookieString.length);
//     }
//   }

//   return undefined;
// };

// const apiServer1WithTags = apiServer1.enhanceEndpoints({
//   addTagTypes: ["Foo"],
// });
// export const authApi = apiServer1WithTags.injectEndpoints

export const authApi = apiServer1
  .enhanceEndpoints({ addTagTypes: ["SomeTag"] })
  .injectEndpoints({
    endpoints: (build) => ({
      initCsrf: build.mutation<string, void>({
        query() {
          return {
            url: "sanctum/csrf-cookie",
            credentials: "include",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          };
        },
        // transformResponse: (apiResponse, meta, arg): string => {
        //   let cookie = getCookie("XSRF-TOKEN");
        //   if (typeof cookie != "undefined") return decodeURIComponent(cookie);

        //   return "";
        // },
      }),
      loginUser: build.mutation<AuthApiResponse, LoginRequest>({
        query(data: LoginRequest) {
          return {
            url: "api/user-management/user/sign-in",
            method: "POST",
            body: data,
            credentials: "include",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          };
        },
        transformResponse: (apiResponse: AuthApiResponse) => {
          console.log(
            "🔥 Auth API - Raw response received:",
            JSON.stringify(apiResponse, null, 2),
          );

          // Return the response as-is, but log it for debugging
          // The login component will handle the data extraction
          return apiResponse;
        },
        async onQueryStarted(_, { dispatch, queryFulfilled }) {
          try {
            console.log("🚀 Auth API - onQueryStarted called");
            const { data } = await queryFulfilled;
            console.log(
              "✅ Auth API - Query fulfilled with data:",
              JSON.stringify(data, null, 2),
            );

            // Store the token from the API response
            if (data?.data?.token) {
              dispatch(setToken(data.data.token));
              console.log("🔑 Auth API - Token stored:", data.data.token);
            }

            // Store user data from the API response including profile image
            if (data?.data) {
              const userData = {
                id: data.data.id,
                full_name: data.data.full_name,
                username: data.data.username,
                email: data.data.email,
                user_type_list: data.data.user_type_list,
                user_category: data.data.user_category,
                profile_image: data.data.profile_image, // Include profile image data
              };
              dispatch(setUser(userData));
              console.log(
                "👤 Auth API - User data stored:",
                JSON.stringify(userData, null, 2),
              );

              // Log profile image details for debugging
              if (data.data.profile_image) {
                console.log("🖼️ Auth API - Profile image stored:", {
                  id: data.data.profile_image.id,
                  filename: data.data.profile_image.filename,
                  full_url: data.data.profile_image.full_url,
                  mime_type: data.data.profile_image.mime_type,
                  dimensions: data.data.profile_image.dimensions_string,
                });
              }

              // Log student list details for debugging
              if (data.data.student_list) {
                console.log("🎓 Auth API - Student list stored:", {
                  count: data.data.student_list.length,
                  students: data.data.student_list.map((student) => ({
                    id: student.id,
                    name: student.full_name,
                    calling_name: student.student_calling_name,
                    admission_number: student.admission_number,
                  })),
                });
              }
            }
          } catch (error) {
            // Silently handle auth errors - let the component show toast notifications
          }
        },
      }),

      // Verify PIN endpoint (if needed separately)
      verifyPin: build.mutation<
        any,
        { username_or_email: string; pin: string }
      >({
        query(data) {
          return {
            url: "api/user-management/user/verify-pin",
            method: "POST",
            body: data,
            credentials: "include",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          };
        },
      }),
      login: build.mutation({
        query: (credentials) => ({
          url: "login",
          method: "POST",
          body: credentials,
        }),
        async onQueryStarted(_, { queryFulfilled }) {
          try {
            console.log("started");
            const { data } = await queryFulfilled;
            console.log(data);
            // dispatch(setToken(data.accessToken)); // Store the token in Redux
          } catch (error) {
            // Silently handle auth errors - let the component show toast notifications
          }
        },
      }),

      // Refresh session data endpoint - gets latest user data including payments
      refreshSessionData: build.query<AuthApiResponse, void>({
        query() {
          return {
            url: "api/user-management/user/get-user-list-data",
            method: "POST",
            body: {
              // Request current user's data - backend should return current authenticated user
              current_user: true,
              include_payments: true,
            },
            credentials: "include",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          };
        },
        transformResponse: (apiResponse: any) => {
          console.log(
            "🔄 Session Refresh API - Raw response received:",
            JSON.stringify(apiResponse, null, 2),
          );

          // The get-user-list-data endpoint might return different format
          // Try to adapt it to match the expected AuthApiResponse format
          if (apiResponse?.data) {
            let userData = null;

            // If it returns an array of users, take the first one (current user)
            if (Array.isArray(apiResponse.data)) {
              userData = apiResponse.data[0];
            } else {
              // If it returns single user object directly
              userData = apiResponse.data;
            }

            // Validate that the user data has required fields before returning
            if (
              userData &&
              userData.id &&
              userData.full_name &&
              userData.user_category !== undefined
            ) {
              console.log("✅ Session Refresh API - Data validation passed:", {
                hasId: !!userData.id,
                hasFullName: !!userData.full_name,
                hasUserCategory: userData.user_category !== undefined,
                hasUserPayments: !!userData.user_payments,
                userPaymentsCount: userData.user_payments?.length || 0,
              });

              return {
                status: "successful",
                message: "User data refreshed successfully",
                data: userData,
              };
            } else {
              console.warn(
                "⚠️ Session Refresh API - Data validation failed, missing required fields:",
                {
                  hasData: !!userData,
                  hasId: userData?.id || false,
                  hasFullName: userData?.full_name || false,
                  hasUserCategory: userData?.user_category !== undefined,
                  providedFields: userData ? Object.keys(userData) : [],
                },
              );

              // Return null to indicate incomplete data - useSessionRefresh will handle this
              return null;
            }
          }

          console.warn("⚠️ Session Refresh API - No data in response");
          // Return the response as-is if format is already correct but warn about no data
          return apiResponse;
        },
      }),

      // Check payment status endpoint
      checkPaymentStatus: build.query<any, void>({
        query() {
          return {
            url: "api/user-management/user/payment-status",
            method: "GET",
            credentials: "include",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          };
        },
        transformResponse: (apiResponse: any) => {
          console.log(
            "💰 Payment Status API - Raw response received:",
            JSON.stringify(apiResponse, null, 2),
          );

          return apiResponse;
        },
      }),
    }),
  });

export const {
  useLoginMutation,
  useLoginUserMutation,
  useVerifyPinMutation,
  useRefreshSessionDataQuery,
  useLazyRefreshSessionDataQuery,
  useCheckPaymentStatusQuery,
  useLazyCheckPaymentStatusQuery,
} = authApi;
