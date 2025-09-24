// Types for Student Exam Data API Response

export interface StudentSubjectMark {
  id: number;
  student_exam_mark_id: number;
  mark_type: string;
  overall_mark: number | null;
  name: string;
  mark: string;
}

export interface ExamQuiz {
  id: number;
  exam_title: string;
  exam_type: string;
  exam_start_date: string;
  exam_end_date: string;
}

export interface ExamQuizItem {
  id: number;
  exam_quiz_id: number;
  subject_id: number;
  subject_start_date: string;
  subject_end_date: string;
  subject_start_time: string;
  subject_end_time: string;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  scheduling_examination_grade_id: number | null;
  exam_quiz: ExamQuiz;
}

export interface StudentInfo {
  id: number;
  full_name_with_title: string;
  admission_number: string;
}

export interface StudentExamMark {
  id: number;
  exam_quiz_item_id: number;
  scheduling_examination_grade_subject_id: number | null;
  student_id: number;
  subject_total_mark: string;
  subject_overall_mark_percentage: number | null;
  subject_comment: string;
  present_type: string;
  grading: string;
  is_mark_added: boolean;
  student: StudentInfo;
  student_subject_mark_list: StudentSubjectMark[];
  exam_quiz_item: ExamQuizItem;
}

export interface QuizMarkStudentExamMark {
  id: number;
  exam_quiz_item_id: number;
  student_id: number;
  subject_total_mark: string;
  subject_comment: string;
  present_type: string;
  grading: string;
  mark_added_by: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  scheduling_examination_grade_subject_id: number | null;
  subject_overall_mark_percentage: number | null;
  is_mark_added: boolean;
  student_subject_mark_list: StudentSubjectMark[];
}

export interface QuizMarkExamQuizItem {
  id: number;
  exam_quiz_id: number;
  subject_id: number;
  subject_start_date: string;
  subject_end_date: string;
  subject_start_time: string;
  subject_end_time: string;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  scheduling_examination_grade_id: number | null;
  student_exam_mark_list: QuizMarkStudentExamMark[];
}

export interface QuizMark {
  id: number;
  exam_type: string;
  exam_title: string;
  exam_start_date: string;
  exam_end_date: string;
  exam_start_time: string;
  exam_end_time: string;
  description: string | null;
  exam_quiz_item_list: QuizMarkExamQuizItem[];
}

export interface SchedulingExamination {
  id: number;
}

export interface StudentExamReportItem {
  id: number;
  student_exam_report_id: number;
  exam_quiz_item_id: number | null;
  student_exam_mark_id: number;
  subject_mark: string;
  subject_id: number;
  created_by: number | null;
  updated_by: number;
  created_at: string;
  updated_at: string;
  scheduling_examination_grade_subject_id: number;
  subject_overall_mark_percentage: string;
  grading: string;
  present_type: string;
  subject_name: string;
  subject_position: number | null;
  subject_remark: string | null;
}

export interface ExamReport {
  id: number;
  student_id: number;
  exam_quiz_id: number | null;
  scheduling_examination_id: number;
  class_teacher_comment: string | null;
  class_rank: number;
  student_average: string;
  aggregate_of_mark: string;
  grade_level_name: string;
  class_average: string;
  serial_number: string;
  exam_quiz: ExamQuiz | null;
  scheduling_examination: SchedulingExamination;
  student_exam_report_item_list: StudentExamReportItem[];
}

export interface StudentExamMarkForSubjectMarks {
  id: number;
  student_id: number;
  subject_total_mark: string;
  subject_overall_mark_percentage: number | null;
  grading: string;
}

export interface SubjectMark {
  id: number;
  student_exam_mark_id: number;
  mark_type: string;
  mark: string;
  overall_mark: number | null;
  name: string;
  student_exam_mark: StudentExamMarkForSubjectMarks;
}

export interface StudentExamData {
  student_exam_marks: StudentExamMark[];
  quiz_marks: QuizMark[];
  exam_reports: ExamReport[];
  subject_marks: SubjectMark[];
}

export interface StudentExamApiResponse {
  status: string;
  data: StudentExamData;
  message: string;
}
