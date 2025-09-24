import React from "react";
import { View, StyleSheet } from "react-native";
import { useSelector } from "react-redux";
import { USER_CATEGORIES } from "../../../../constants/userCategories";
import UniversalSchoolCalendar from "../../../../components/common/UniversalSchoolCalendar";

const SchoolCalendarMain = () => {
  // Get global state
  const { sessionData } = useSelector((state) => state.app);

  // Get user category from session data
  const userCategory =
    sessionData?.user_category || sessionData?.data?.user_category;

  console.log("📅 CanteenSchoolCalendarMain - User category:", userCategory);

  return (
    <View style={styles.container}>
      <UniversalSchoolCalendar
        userCategory={userCategory}
        title="School Calendar & Events"
        subtitle="Events, holidays, classes & exams"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
});

export default SchoolCalendarMain;
