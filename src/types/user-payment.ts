export interface PaymentStudent {
  id: number;
  full_name: string;
  admission_number: string;
  grade_level: {
    id: number;
    name: string;
  };
  access_level: string;
  ups_start_date: string;
  ups_end_date: string;
  ups_is_active: boolean;
  ups_status: string;
  ups_is_currently_valid: boolean;
}

export interface UserPayment {
  id: number;
  package_type: string;
  package_type_display: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  amount: string;
  currency: string;
  payment_method: string;
  transaction_reference: string;
  notes: string;
  status: string;
  is_currently_valid: boolean;
  created_at: string;
  updated_at: string;
  students: PaymentStudent[];
  student_count: number;
  active_student_count: number;
}

export interface PaymentSummary {
  total_payments: number;
  active_payments: number;
  valid_payments: number;
  total_students: number;
  total_active_students: number;
}

export interface PaymentMetadata {
  user_id: number;
  request_timestamp: string;
  is_system_update_pending: boolean;
}

export interface UserPaymentData {
  payments: UserPayment[];
  summary: PaymentSummary;
}

export interface UserPaymentResponse {
  status: string;
  message: string;
  data: UserPaymentData;
  metadata: PaymentMetadata;
}
