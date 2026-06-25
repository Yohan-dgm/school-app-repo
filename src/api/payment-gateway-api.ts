import { apiServer1 } from "./api-server-1";

export interface InitiatePaymentSessionRequest {
  invoice_type: string;
  invoice_id: number;
  amount: number;
  student_id: number;
}

export interface InitiatePaymentSessionResponse {
  status: string;
  data: {
    capture_context: string;
    client_library_url: string;
    client_library_integrity: string;
    order_reference: string;
    amount: number;
    currency: string;
  };
}

export interface CompletePaymentRequest {
  transient_token: string;
  order_reference: string;
}

export interface CompletePaymentResponse {
  status: string;
  message: string;
  data: {
    order_reference: string;
    status: string;
    amount: number;
    currency: string;
    invoice_type: string;
    invoice_id: number;
    receipt_voucher_id: number | null;
    message: string;
  };
}

export const paymentGatewayApi = apiServer1.injectEndpoints({
  endpoints: (builder) => ({
    initiatePaymentSession: builder.mutation<
      InitiatePaymentSessionResponse,
      InitiatePaymentSessionRequest
    >({
      query: (body) => ({
        url: "/api/account-management/payment/initiate-session",
        method: "POST",
        body,
      }),
    }),

    completePayment: builder.mutation<
      CompletePaymentResponse,
      CompletePaymentRequest
    >({
      query: (body) => ({
        url: "/api/account-management/payment/complete",
        method: "POST",
        body,
      }),
      // After a successful payment, invalidate pending invoices so the list refreshes
      invalidatesTags: ["Payment"],
    }),
  }),
});

export const {
  useInitiatePaymentSessionMutation,
  useCompletePaymentMutation,
} = paymentGatewayApi;
