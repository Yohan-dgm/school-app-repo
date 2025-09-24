import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { theme } from "../../../../styles/theme";
import { USER_CATEGORIES } from "../../../../constants/userCategories";
import { transformStudentWithProfilePicture } from "../../../../utils/studentProfileUtils";
import UniversalSchoolCalendar from "../../../../components/common/UniversalSchoolCalendar";
import { setSelectedStudent } from "../../../../state-store/slices/app-slice";

const SchoolCalendarMain = () => {
  const dispatch = useDispatch();

  // Get global state
  const { sessionData, selectedStudent } = useSelector((state) => state.app);

  // Get user category from session data
  const userCategory =
    sessionData?.user_category || sessionData?.data?.user_category;
  const isParent = userCategory === USER_CATEGORIES.PARENT;

  // Get student data from backend API response
  const backendStudentList = sessionData?.data?.student_list || [];

  // Transform backend student data to match UI requirements
  const students = backendStudentList.map((student) => {
    return transformStudentWithProfilePicture(student, sessionData);
  });

  // Auto-select first student if none selected and students are available
  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      console.log(
        `📅 SchoolCalendarMain - Auto-selecting first student: ${students[0]?.student_calling_name}`,
      );
      dispatch(setSelectedStudent(students[0]));
    }
  }, [students.length, selectedStudent, dispatch]);

  // Debug logging
  console.log(
    "📅 SchoolCalendarMain - User category:",
    userCategory,
    "Is parent:",
    isParent,
  );
  console.log("📅 SchoolCalendarMain - Students count:", students.length);
  console.log(
    "📅 SchoolCalendarMain - Selected student:",
    selectedStudent?.student_calling_name,
  );
  console.log("📅 SchoolCalendarMain - Session data structure:", {
    hasSessionData: !!sessionData,
    hasUserCategory: !!userCategory,
    hasStudentList: !!backendStudentList?.length,
    selectedStudentId: selectedStudent?.student_id,
  });

  return (
    <View style={styles.container}>
      {/* Header Section */}
      {/* <View style={styles.headerSection}>
        <Text style={styles.welcomeText}>
          School Calendar & Events
        </Text>
        {isParent && selectedStudent && (
          <Text style={styles.studentText}>
            Calendar for {selectedStudent.student_calling_name} - {selectedStudent.grade}
          </Text>
        )}
      </View> */}

      {/* Calendar Component */}
      <View style={styles.calendarContainer}>
        <UniversalSchoolCalendar
          userCategory={userCategory}
          title="School Calendar & Events"
          subtitle={
            isParent && selectedStudent
              ? `Calendar for ${selectedStudent.student_calling_name} - ${selectedStudent.grade}`
              : "Events, holidays, classes & exams"
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingBottom: 50,
  },
  headerSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  welcomeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    color: "#000000",
    marginBottom: 4,
  },
  studentText: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#666666",
  },
  calendarContainer: {
    flex: 1,
  },
});

export default SchoolCalendarMain;
