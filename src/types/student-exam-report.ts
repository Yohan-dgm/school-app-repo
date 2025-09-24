// Types for Student Exam Report API Response

export interface StudentAttachment {
  id: number;
  student_id: number;
  file_name: string;
  original_file_name: string;
  mime_type: string;
}

export interface StudentInfo {
  student_id: number;
  full_name_with_title: string;
  admission_number: string;
  grade_level_name: string;
  student_attachments: StudentAttachment[];
}

export interface ExamDetails {
  exam_title: string;
  exam_type: string;
  exam_start_date: string;
  exam_end_date: string;
}

export interface ReportSummary {
  class_teacher_comment: string | null;
  class_rank: number;
  student_average: string;
  aggregate_of_mark: string;
  grade_level_class_id: number;
}

export interface SubjectDetails {
  subject_id: number;
  subject_name: string;
  subject_mark: string;
  grading: string;
  subject_overall_mark_percentage: string;
  present_type: string;
  remarks: string | null;
  subject_position: number | null;
}

export interface ExamReport {
  scheduling_examination_id: number;
  exam_details: ExamDetails;
  report_summary: ReportSummary;
  subject_details: SubjectDetails[];
}

export interface StudentExamReportData {
  student_info: StudentInfo;
  exam_reports: ExamReport[];
}

export interface StudentExamReportResponse {
  status: string;
  message: string;
  data: StudentExamReportData;
  metadata: {
    is_system_update_pending: boolean;
  };
}
