import { apiServer1 } from "./api-server-1";
import { UserPaymentResponse } from "../types/user-payment";

export const userPaymentApi = apiServer1.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentUserPayments: builder.query<UserPaymentResponse, void>({
      query: () => ({
        url: "/api/user-management/user-payment/current",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: {},
      }),
      providesTags: ["Payment"],
      transformResponse: (response: UserPaymentResponse) => {
        console.log("💰 User Payment API - Response received:", {
          status: response.status,
          totalPayments: response.data?.summary?.total_payments || 0,
          validPayments: response.data?.summary?.valid_payments || 0,
          hasPayments:
            !!response.data?.payments && response.data.payments.length > 0,
          payments:
            response.data?.payments?.map((payment) => ({
              id: payment.id,
              package_type: payment.package_type,
              is_active: payment.is_active,
              is_currently_valid: payment.is_currently_valid,
              status: payment.status,
              student_count: payment.student_count,
            })) || [],
          metadata: response.metadata,
          timestamp: new Date().toISOString(),
        });

        return response;
      },
      transformErrorResponse: (response: any) => {
        console.error("❌ User Payment API - Error fetching payments:", {
          status: response.status,
          data: response.data,
          timestamp: new Date().toISOString(),
        });

        return {
          status: response.status || "FETCH_ERROR",
          data: response.data || {
            message: "Failed to fetch user payment data",
          },
        };
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCurrentUserPaymentsQuery,
  useLazyGetCurrentUserPaymentsQuery,
} = userPaymentApi;
