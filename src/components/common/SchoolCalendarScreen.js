import React, { useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { USER_CATEGORIES } from "../../constants/userCategories";
import { transformStudentWithProfilePicture } from "../../utils/studentProfileUtils";
import { setSelectedStudent } from "../../state-store/slices/app-slice";
import UniversalSchoolCalendar from "./UniversalSchoolCalendar";

// One School Calendar screen shared by every user category
const SchoolCalendarScreen = () => {
  const dispatch = useDispatch();
  const sessionData = useSelector((state) => state.app.sessionData);
  const selectedStudent = useSelector((state) => state.app.selectedStudent);

  const userCategory =
    sessionData?.user_category || sessionData?.data?.user_category;
  const isParent = userCategory === USER_CATEGORIES.PARENT;

  // Parent only: students from the session, auto-select the first one
  const students = useMemo(
    () =>
      isParent
        ? (sessionData?.data?.student_list || []).map((student) =>
            transformStudentWithProfilePicture(student, sessionData),
          )
        : [],
    [isParent, sessionData],
  );

  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      dispatch(setSelectedStudent(students[0]));
    }
  }, [students, selectedStudent, dispatch]);

  let subtitle = "Events, holidays, classes & exams";
  if (isParent && selectedStudent) {
    subtitle = `Calendar for ${selectedStudent.student_calling_name} - ${selectedStudent.grade}`;
  } else if (userCategory === USER_CATEGORIES.STUDENT) {
    subtitle = "Academic schedule and important dates";
  }

  return (
    <View style={[styles.container, isParent && styles.parentPadding]}>
      <UniversalSchoolCalendar
        userCategory={userCategory}
        title="School Calendar & Events"
        subtitle={subtitle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  parentPadding: {
    paddingBottom: 50,
  },
});

export default SchoolCalendarScreen;
