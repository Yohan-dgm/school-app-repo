import { apiServer1 } from "./api-server-1";

// Types for the pending invoice API
export interface PendingInvoice {
  invoice_type: string;
  invoice_id: number;           // standardised — always present from backend
  term_fee_invoice_id?: number; // legacy alias for Term Fee (kept for backward compat)
  serial_number: string;
  date: string;
  bill_total: string;
  term_name?: string;
  items_total?: string;
  paid_amount: number;
  balance_amount: number;
  created_at: string;
}

export interface PendingInvoiceStudent {
  id: number;
  full_name_with_title: string;
  admission_number: string;
  grade_level_class: string | null;
}

export interface PendingInvoiceStudentData {
  student: PendingInvoiceStudent;
  pending_invoices: PendingInvoice[];
  total_pending_amount: number;
  pending_invoice_count: number;
}

export interface PendingInvoiceResponse {
  status: string;
  message: string;
  data: {
    pending_invoices: PendingInvoiceStudentData[];
  };
  metadata: any;
}

export interface GetPendingInvoiceRequest {
  admission_number: string[];
}

export const pendingInvoiceApi = apiServer1.injectEndpoints({
  endpoints: (builder) => ({
    getStudentPendingInvoices: builder.query<
      PendingInvoiceResponse,
      GetPendingInvoiceRequest
    >({
      query: (params) => ({
        url: "/api/account-management/student-pending-invoice/list",
        method: "POST",
        body: params,
      }),
      providesTags: ["Payment"],
      transformResponse: (response: PendingInvoiceResponse) => {
        console.log("📋 Pending Invoice API - Data received:", {
          status: response.status,
          studentCount: response.data?.pending_invoices?.length || 0,
          message: response.message,
        });
        return response;
      },
      transformErrorResponse: (response: any) => {
        console.error(
          "❌ Pending Invoice API - Error fetching pending invoices:",
          response,
        );
        return {
          status: response.status || "FETCH_ERROR",
          data: response.data || {
            message: "Failed to fetch pending invoice data",
          },
        };
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetStudentPendingInvoicesQuery,
  useLazyGetStudentPendingInvoicesQuery,
} = pendingInvoiceApi;
