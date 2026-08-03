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
    service_fee_amount: number;
    total_charged_amount: number;
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
    service_fee_amount: number;
    total_charged_amount: number;
    invoice_type: string;
    invoice_id: number;
    receipt_voucher_id: number | null;
    message: string;
  };
}

export interface GetPaymentGatewayStatusResponse {
  status: string;
  message: string;
  data: {
    is_active: boolean;
    maintenance_message: string | null;
  };
}

export interface GetPaymentReceiptRequest {
  order_reference: string;
}

export interface PaymentReceiptData {
  order_reference: string;
  receipt_number: string;
  school_name: string;
  student_name: string;
  invoice_type: string;
  invoice_id: number;
  amount: number;
  service_fee_amount: number;
  total_charged_amount: number;
  currency: string;
  payment_date: string | null;
}

export interface GetPaymentReceiptResponse {
  status: string;
  message: string;
  data: PaymentReceiptData;
}

export interface GetMyPaymentHistoryRequest {
  page?: number;
}

export interface PaymentHistoryItem {
  id: number;
  order_reference: string;
  invoice_type: string;
  invoice_id: number;
  amount: number;
  currency: string;
  service_fee_amount: number;
  total_charged_amount: number;
  admin_status: string;
  admin_notes: string | null;
  admin_approved_at: string | null;
  cybersource_reference: string | null;
  receipt_voucher_id: number | null;
  created_at: string;
}

export interface GetMyPaymentHistoryResponse {
  status: string;
  message: string;
  data: {
    payments: PaymentHistoryItem[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
      has_more: boolean;
    };
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

    getMyPaymentHistory: builder.query<
      GetMyPaymentHistoryResponse,
      GetMyPaymentHistoryRequest | void
    >({
      query: (params) => ({
        url: "/api/account-management/payment/my-history",
        method: "POST",
        body: { page: params?.page ?? 1 },
      }),
      providesTags: ["Payment"],
    }),

    getPaymentGatewayStatus: builder.query<GetPaymentGatewayStatusResponse, void>({
      query: () => ({
        url: "/api/account-management/payment/gateway-status",
        method: "POST",
      }),
    }),

    getPaymentReceipt: builder.query<GetPaymentReceiptResponse, GetPaymentReceiptRequest>({
      query: (body) => ({
        url: "/api/account-management/payment/receipt",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useInitiatePaymentSessionMutation,
  useCompletePaymentMutation,
  useGetMyPaymentHistoryQuery,
  useGetPaymentGatewayStatusQuery,
  useLazyGetPaymentReceiptQuery,
} = paymentGatewayApi;
