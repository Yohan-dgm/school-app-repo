export interface ProfileImage {
  id: number;
  file_path: string;
  filename: string;
  file_format: string;
  file_size: number;
  file_size_formatted: string;
  mime_type: string;
  width: number;
  height: number;
  dimensions_string: string;
  full_url: string;
  public_path: string;
  created_at: string;
  updated_at: string;
}

export interface GradeLevel {
  id: number;
  name: string;
}

export interface GradeLevelClass {
  id: number;
  name: string;
}

export interface SchoolHouse {
  id: number;
  name: string;
}

export interface StudentAdmissionSource {
  id: number;
  name: string;
}

export interface RoleType {
  id: number;
  name: string;
}

export interface StudentRole {
  id: number;
  student_id: number;
  role_type_id: number;
  role_type: RoleType;
}

export interface StudentAchievement {
  id: number;
  student_id: number;
  achievement_type: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sport {
  id: number;
  name: string;
}

export interface StudentSport {
  id: number;
  student_id: number;
  sport_id: number;
  sport: Sport;
}

export interface StudentAttachment {
  id: number;
  student_id: number;
  file_name: string;
  original_file_name: string;
  mime_type: string;
  created_at: string;
}

export interface LatestTermFeeReceipt {
  id: number;
  student_id: number;
  admission_fee_settlement: string;
  refundable_deposit_settlement: string;
  term_fee_settlement: string;
}

export interface GuardianInfo {
  guardian_id: number;
  guardian_type: number;
  guardian_type_text: string;
  relationship_type: string;
  guardian_full_name: string;
  guardian_phone: string;
  guardian_email: string;
  guardian_occupation: string;
  guardian_monthly_income: string;
}

export interface PaymentInfo {
  package_type: string;
  access_level: string;
  start_date: string;
  end_date: string;
  payment_amount: string;
  payment_currency: string;
  ups_id: number;
  ups_is_active: boolean;
  payment_id: number;
}

export interface Student {
  id: number;
  admission_number: string;
  full_name: string;
  student_calling_name: string;
  full_name_with_title: string;
  gender: string;
  date_of_birth: string;
  joined_date: string;
  grade_level_id: number;
  grade_level_class_id: number;
  school_house_id: number;
  student_address: string;
  student_phone: string | null;
  student_email: string | null;
  father_full_name: string | null;
  mother_full_name: string | null;
  guardian_full_name: string | null;
  grade_level: GradeLevel;
  grade_level_class: GradeLevelClass;
  school_house: SchoolHouse;
  student_admission_source: StudentAdmissionSource;
  student_role_list: StudentRole[];
  student_achievement_list: StudentAchievement[];
  student_sport_list: StudentSport[];
  student_attachment_list: StudentAttachment[];
  latest_term_fee_receipt_voucher: LatestTermFeeReceipt;
  guardian_info: GuardianInfo;
  attachments: StudentAttachment[];
  payment_info: PaymentInfo;
  student_roles: any[];
  student_achievements: any[];
  student_sports: any[];
  latest_term_fee_receipt: any;
}

export interface UserPaymentStudent {
  id: number;
  full_name: string;
  admission_number: string;
  access_level: string;
  ups_start_date: string;
  ups_end_date: string;
  ups_is_active: boolean;
  ups_status: string;
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
  status: string;
  is_currently_valid: boolean;
  created_at: string;
  updated_at: string;
  students: UserPaymentStudent[];
}

export interface AuthUserData {
  token: string;
  id: number;
  full_name: string;
  username: string;
  email: string;
  user_category: number;
  user_type_list: any[];
  profile_image: ProfileImage;
  student_list: Student[];
  user_payments: UserPayment[];
}

export interface AuthMetadata {
  is_system_update_pending: boolean;
}

export interface AuthApiResponse {
  status: string;
  message: string;
  data: AuthUserData;
  metadata: AuthMetadata;
}

export interface LoginRequest {
  username_or_email: string;
  password: string;
  pin: string;
}
