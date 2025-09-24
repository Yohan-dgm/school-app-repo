import { apiServer1 } from "./api-server-1";

// TypeScript interfaces for student details API
export interface StudentAttachment {
  id: number;
  student_id: number;
  file_name: string;
  original_file_name: string;
  mime_type: string;
}

export interface StudentGradeLevel {
  id: number;
  name: string;
  school_fee_list: {
    id: number;
    school_fee_type: string;
    grade_level_id: number;
    amount: string;
    is_active: boolean;
  }[];
}

export interface StudentGradeLevelClass {
  id: number;
  name: string;
  grade_level_id: number;
}

export interface StudentSchoolHouse {
  id: number;
  name: string;
}

export interface StudentDetails {
  id: number;
  full_name: string;
  student_calling_name: string;
  gender: string;
  date_of_birth: string;
  admission_number: string;
  joined_date: string;
  full_name_with_title: string;
  grade_level_id: number;
  grade_level_class_id: number;
  school_house_id: number;
  student_admission_source_id: number;
  student_admission_source_other: string | null;
  admission_fee_discount_percentage: string;
  approved_admission_fee: string;
  applicable_refundable_deposit: string;
  applicable_term_payment: string;
  applicable_year_payment: string;
  is_sport_list: string | null;
  father_full_name: string;
  father_id_type: string;
  father_nic_number: string;
  father_passport_number: string | null;
  father_phone: string;
  father_whatsapp: string;
  father_email: string;
  father_occupation: string;
  father_place_of_work: string;
  father_monthly_income: string;
  mother_full_name: string;
  mother_id_type: string;
  mother_nic_number: string;
  mother_passport_number: string | null;
  mother_phone: string;
  mother_whatsapp: string;
  mother_email: string;
  mother_occupation: string;
  mother_place_of_work: string;
  mother_monthly_income: string;
  guardian_full_name: string | null;
  guardian_id_type: string | null;
  guardian_nic_number: string | null;
  guardian_passport_number: string | null;
  guardian_phone: string | null;
  guardian_whatsapp: string | null;
  guardian_email: string | null;
  guardian_occupation: string | null;
  guardian_place_of_work: string | null;
  guardian_monthly_income: string | null;
  student_phone: string | null;
  student_email: string | null;
  student_address: string;
  school_studied_before: string;
  blood_group: string;
  special_health_conditions: string;
  nationality_id: number;
  religion_id: number;
  full_address: string;
  phone: string | null;
  email: string | null;
  special_conditions: string;
  grade_level: StudentGradeLevel;
  grade_level_class: StudentGradeLevelClass;
  school_house: StudentSchoolHouse;
  student_attachment_list: StudentAttachment[];
}

export interface GetStudentDetailsByClassRequest {
  grade_level_class_id: number;
  page_size: number;
  page: number;
}

export interface GetStudentDetailsByClassResponse {
  status: string;
  message: string;
  data: {
    data: StudentDetails[];
    total: number;
    current_page: number;
    per_page: number;
    student_count: number;
  };
  metadata: {
    is_system_update_pending: boolean;
  };
}

// API endpoints
export const studentDetailsApi = apiServer1.injectEndpoints({
  endpoints: (build) => ({
    getStudentDetailsByClass: build.query<
      GetStudentDetailsByClassResponse,
      GetStudentDetailsByClassRequest
    >({
      query: (params) => ({
        url: "api/student-management/student/get-student-details-by-class",
        method: "POST",
        body: params,
      }),
      providesTags: ["Students"],
    }),
  }),
});

export const {
  useGetStudentDetailsByClassQuery,
  useLazyGetStudentDetailsByClassQuery,
} = studentDetailsApi;
