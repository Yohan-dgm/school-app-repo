import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ExamReport, StudentInfo } from "../../types/student-exam-report";
import { getDefaultStudentProfileImage } from "../../utils/studentProfileUtils";

interface DetailedReportCardProps {
  visible: boolean;
  onClose: () => void;
  examReport: ExamReport;
  studentInfo: StudentInfo;
  selectedStudent: any; // The transformed student data from Redux
}

const DetailedReportCard: React.FC<DetailedReportCardProps> = ({
  visible,
  onClose,
  examReport,
  studentInfo,
  selectedStudent,
}) => {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<number>>(
    new Set(),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getGradeColor = (grade: string) => {
    switch (grade.toUpperCase()) {
      case "A*":
      case "A+":
        return "#4CAF50";
      case "A":
      case "A-":
        return "#8BC34A";
      case "B":
      case "B+":
      case "B-":
        return "#FFC107";
      case "C":
      case "C+":
      case "C-":
        return "#FF9800";
      case "D":
      case "D+":
      case "D-":
        return "#FF5722";
      case "F":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  };

  const toggleSubjectExpansion = (subjectId: number) => {
    const newExpandedSubjects = new Set(expandedSubjects);
    if (newExpandedSubjects.has(subjectId)) {
      newExpandedSubjects.delete(subjectId);
    } else {
      newExpandedSubjects.add(subjectId);
    }
    setExpandedSubjects(newExpandedSubjects);
  };

  const getStudentPhoto = () => {
    // Use the same profileImage as StudentProfileMain
    return selectedStudent?.profileImage || getDefaultStudentProfileImage();
  };

  const calculateTotalMarks = () => {
    return examReport.subject_details
      .reduce((total, subject) => total + parseFloat(subject.subject_mark), 0)
      .toFixed(2);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Card</Text>
          {/* <TouchableOpacity style={styles.printButton}>
            <MaterialIcons name="print" size={24} color="#FFFFFF" />
          </TouchableOpacity> */}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Report Card Header */}
          <View style={styles.reportHeader}>
            {/* Top Logos Row */}
            <View style={styles.topLogosContainer}>
              <Image
                source={require("../../assets/nexis-college/exam/nexis-logo.webp")}
                style={styles.topSchoolLogo}
                resizeMode="contain"
              />
              <Image
                source={require("../../assets/nexis-college/exam/cambridge-logo.webp")}
                style={styles.topCambridgeLogo}
                resizeMode="contain"
              />
            </View>

            {/* Title Section */}
            <View style={styles.titleContainer}>
              <Text style={styles.reportMainTitle}>NEXIS COLLEGE</Text>
              <Text style={styles.reportSubTitle}>
                Student Evaluation Report
              </Text>
              <Text style={styles.academicYear}>Academic Year 2024/25</Text>
            </View>
          </View>

          {/* Student Information Section */}
          <View style={styles.studentSection}>
            <View style={styles.studentInfoContainer}>
              <View style={styles.studentPhotoContainer}>
                <Image
                  source={getStudentPhoto()}
                  style={styles.studentPhoto}
                  resizeMode="cover"
                  onError={() => {
                    // Fallback handled by getDefaultStudentProfileImage
                    console.log("Failed to load student photo");
                  }}
                />
              </View>

              <View style={styles.studentDetails}>
                <View style={styles.studentDetailRow}>
                  <Text style={styles.detailLabel}>Student Name:</Text>
                  <Text style={styles.detailValue}>
                    {studentInfo.full_name_with_title}
                  </Text>
                </View>

                <View style={styles.studentDetailRow}>
                  <Text style={styles.detailLabel}>Admission No:</Text>
                  <Text style={styles.detailValue}>
                    {studentInfo.admission_number}
                  </Text>
                </View>

                <View style={styles.studentDetailRow}>
                  <Text style={styles.detailLabel}>Grade:</Text>
                  <Text style={styles.detailValue}>
                    {studentInfo.grade_level_name}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.examInfoContainer}>
              <View style={styles.studentDetailRow}>
                <Text style={styles.detailLabel}>Examination:</Text>
                <Text style={styles.detailValue}>
                  {examReport.exam_details.exam_title}
                </Text>
              </View>

              <View style={styles.studentDetailRow}>
                <Text style={styles.detailLabel}>Exam Type:</Text>
                <Text style={styles.detailValue}>
                  {examReport.exam_details.exam_type}
                </Text>
              </View>

              <View style={styles.studentDetailRow}>
                <Text style={styles.detailLabel}>Period:</Text>
                <Text style={styles.detailValue}>
                  {formatDate(examReport.exam_details.exam_start_date)} -{" "}
                  {formatDate(examReport.exam_details.exam_end_date)}
                </Text>
              </View>

              <View style={styles.studentDetailRow}>
                <Text style={styles.detailLabel}>Serial No:</Text>
                <Text style={styles.detailValue}>
                  {examReport.report_summary.serial_number}
                </Text>
              </View>
            </View>
          </View>

          {/* Report Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Report Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Class Rank</Text>
                <Text style={styles.summaryValue}>
                  #{examReport.report_summary.class_rank}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Student Average</Text>
                <Text style={styles.summaryValue}>
                  {examReport.report_summary.student_average}%
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Marks</Text>
                <Text style={styles.summaryValue}>
                  {examReport.report_summary.aggregate_of_mark}
                </Text>
              </View>
            </View>
          </View>

          {/* Subject Results Table */}
          <View style={styles.subjectsSection}>
            <Text style={styles.sectionTitle}>Subject-wise Results</Text>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.subjectColumn]}>
                Subject
              </Text>
              <Text style={[styles.tableHeaderText, styles.markColumn]}>
                Marks
              </Text>
              <Text style={[styles.tableHeaderText, styles.percentageColumn]}>
                %
              </Text>
              <Text style={[styles.tableHeaderText, styles.gradeColumn]}>
                Grade
              </Text>
              <Text style={[styles.tableHeaderText, styles.positionColumn]}>
                Position
              </Text>
            </View>

            {/* Table Body */}
            {examReport.subject_details.map((subject, index) => {
              const isExpanded = expandedSubjects.has(subject.subject_id);

              // Improved remarks detection logic
              const hasRemarks = Boolean(
                subject.subject_remark &&
                  typeof subject.subject_remark === "string" &&
                  subject.subject_remark.trim().length > 0,
              );

              return (
                <View key={subject.subject_id}>
                  <TouchableOpacity
                    style={[
                      styles.tableRow,
                      index % 2 === 0 ? styles.evenRow : styles.oddRow,
                      hasRemarks && styles.clickableRow,
                    ]}
                    onPress={() =>
                      hasRemarks && toggleSubjectExpansion(subject.subject_id)
                    }
                    disabled={!hasRemarks}
                  >
                    <View
                      style={[
                        styles.tableCell,
                        styles.subjectColumn,
                        styles.subjectNameContainer,
                      ]}
                    >
                      <Text style={styles.subjectName}>
                        {subject.subject_name}
                      </Text>
                      {hasRemarks && (
                        <MaterialIcons
                          name={isExpanded ? "expand-less" : "expand-more"}
                          size={20}
                          color="#920734"
                          style={styles.expandIcon}
                        />
                      )}
                    </View>
                    <Text style={[styles.tableCell, styles.markColumn]}>
                      {subject.subject_mark}
                    </Text>
                    <Text style={[styles.tableCell, styles.percentageColumn]}>
                      {subject.subject_overall_mark_percentage}%
                    </Text>
                    <View
                      style={[
                        styles.tableCell,
                        styles.gradeColumn,
                        styles.gradeContainer,
                      ]}
                    >
                      <Text
                        style={[
                          styles.gradeText,
                          { color: getGradeColor(subject.grading) },
                        ]}
                      >
                        {subject.grading}
                      </Text>
                    </View>
                    <Text style={[styles.tableCell, styles.positionColumn]}>
                      {subject.subject_position !== null &&
                      subject.subject_position !== undefined
                        ? `${subject.subject_position}`
                        : "-"}
                    </Text>
                  </TouchableOpacity>

                  {/* Expanded Remarks Section */}
                  {isExpanded && hasRemarks && (
                    <View style={styles.remarksContainer}>
                      <View style={styles.remarksHeader}>
                        <MaterialIcons
                          name="comment"
                          size={16}
                          color="#920734"
                        />
                        <Text style={styles.remarksTitle}>Subject Remarks</Text>
                      </View>
                      <Text style={styles.remarksText}>
                        {subject.subject_remark}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Table Total */}
            <View style={styles.tableTotal}>
              <Text style={[styles.tableTotalText, styles.subjectColumn]}>
                TOTAL
              </Text>
              <Text style={[styles.tableTotalText, styles.markColumn]}>
                {calculateTotalMarks()}
              </Text>
              <Text style={[styles.tableTotalText, styles.percentageColumn]}>
                {examReport.report_summary.student_average}%
              </Text>
              <Text style={[styles.tableTotalText, styles.gradeColumn]}>-</Text>
              <Text style={[styles.tableTotalText, styles.positionColumn]}>
                -
              </Text>
            </View>
          </View>

          {/* Teacher Comment */}
          {examReport.report_summary.class_teacher_comment && (
            <View style={styles.commentSection}>
              <Text style={styles.sectionTitle}>Class Teacher's Comment</Text>
              <View style={styles.commentBox}>
                <Text style={styles.commentText}>
                  {examReport.report_summary.class_teacher_comment}
                </Text>
              </View>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            {/* <View style={styles.signatureSection}> */}
            {/* <View style={styles.signatureItem}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Class Teacher</Text>
              </View>
              <View style={styles.signatureItem}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Principal</Text>
              </View>
              <View style={styles.signatureItem}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Parent/Guardian</Text>
              </View> */}
            {/* </View> */}

            <View style={styles.footerBranding}>
              <Text style={styles.brandingText}>
                Please collect the exam report card hard copy from the school.
              </Text>
              {/* <Text style={styles.brandingSubtext}>
                Powered by Toyar Technologies
              </Text> */}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#920734",
    paddingTop: Platform.OS === "ios" ? 4 : 16,
    paddingBottom: 4,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 6,
    paddingBottom: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  printButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  reportHeader: {
    backgroundColor: "white",
    paddingVertical: 0,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#E0E0E0",
  },
  topLogosContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -25,
    marginBottom: -25,
  },
  topSchoolLogo: {
    width: 100,
    height: 100,
  },
  topCambridgeLogo: {
    width: 100,
    height: 100,
  },
  titleContainer: {
    alignItems: "center",
    paddingBottom: 6,
  },
  reportMainTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#920734",
    textAlign: "center",
    marginBottom: 4,
  },
  reportSubTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    textAlign: "center",
    marginBottom: 2,
  },
  academicYear: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  studentSection: {
    padding: 20,
    backgroundColor: "#F8F9FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  studentInfoContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  studentPhotoContainer: {
    marginRight: 20,
  },
  studentPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#920734",
  },
  photoPlaceholder: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  studentDetails: {
    flex: 1,
  },
  examInfoContainer: {
    marginTop: -4,
  },
  studentDetailRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: "#666666",
    flex: 1,
    fontWeight: "500",
  },
  summarySection: {
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#920734",
    marginBottom: 16,
    textAlign: "center",
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
    textAlign: "center",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#920734",
    textAlign: "center",
  },
  subjectsSection: {
    padding: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#920734",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  evenRow: {
    backgroundColor: "#F8F9FA",
  },
  oddRow: {
    backgroundColor: "#FFFFFF",
  },
  tableCell: {
    fontSize: 12,
    color: "#333333",
    textAlign: "center",
    paddingVertical: 4,
  },
  subjectColumn: {
    flex: 2.5,
  },
  markColumn: {
    flex: 1.2,
  },
  percentageColumn: {
    flex: 1,
  },
  gradeColumn: {
    flex: 1,
  },
  positionColumn: {
    flex: 1,
  },
  clickableRow: {
    backgroundColor: "#F8F9FA",
  },
  subjectNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subjectName: {
    textAlign: "left",
    fontWeight: "500",
    flex: 1,
  },
  expandIcon: {
    marginLeft: 4,
  },
  gradeContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  gradeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  remarksContainer: {
    backgroundColor: "#F4E5E8",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  remarksHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  remarksTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#920734",
    marginLeft: 6,
  },
  remarksText: {
    fontSize: 12,
    color: "#666666",
    lineHeight: 18,
    fontStyle: "italic",
    paddingLeft: 22,
  },
  tableTotal: {
    flexDirection: "row",
    backgroundColor: "#920734",
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 4,
    borderRadius: 8,
  },
  tableTotalText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  commentSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  commentBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#920734",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  commentText: {
    fontSize: 14,
    color: "#333333",
    lineHeight: 20,
    fontStyle: "italic",
  },
  footer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.08,
    // shadowRadius: 6,
    elevation: 3,
  },
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  signatureItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  signatureLine: {
    width: "100%",
    height: 1,
    backgroundColor: "#333333",
    marginBottom: 1,
  },
  signatureLabel: {
    fontSize: 12,
    color: "#333333",
    fontWeight: "500",
  },
  footerBranding: {
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  brandingText: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 6,
    textAlign: "center",
  },
  brandingSubtext: {
    fontSize: 10,
    color: "#999999",
  },
});

export default DetailedReportCard;
