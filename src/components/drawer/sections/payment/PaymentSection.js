import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { theme } from "../../../../styles/theme";
import { useGetStudentBillsDataQuery } from "../../../../api/parent-payment-api";
import {
  setStudentBillsData,
  selectOverallTotalSummary,
  selectAllStudentsWithPaymentData,
  selectStudentBillDetailsByStudentId,
} from "../../../../state-store/slices/payment/paymentSlice";
import OverallTotalSummary from "../../../payment/OverallTotalSummary";
import StudentPaymentListItem from "../../../payment/StudentPaymentListItem";
import MakePaymentPage from "./pages/MakePaymentPage";
import PaymentHistoryPage from "./pages/PaymentHistoryPage";

const PaymentSection = ({ onClose, onNavigateToSubSection }) => {
  const dispatch = useDispatch();
  const [currentPage, setCurrentPage] = useState("main"); // main, make-payment, payment-history

  // Redux state
  const { sessionData } = useSelector((state) => state.app);
  const overallTotalSummary = useSelector(selectOverallTotalSummary);
  const allStudentsPaymentData = useSelector(selectAllStudentsWithPaymentData);

  // Get students directly from session data for immediate display
  const sessionStudentList = sessionData?.data?.student_list || [];
  const sessionStudents = sessionStudentList.map((student) => ({
    id: student.student_id || student.id,
    name:
      student.full_name || student.student_calling_name || "Unknown Student",
    admissionNumber: student.admission_number || "N/A",
  }));

  // Get student IDs from session data
  const studentList = sessionData?.data?.student_list || [];
  const studentIds = studentList.map(
    (student) => student.student_id || student.id,
  );

  // API call
  const {
    data: billsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetStudentBillsDataQuery(
    { student_ids: studentIds },
    {
      skip: studentIds.length === 0,
      refetchOnMountOrArgChange: true,
    },
  );

  // Update Redux store when API data arrives
  useEffect(() => {
    if (billsData?.data?.student_bills_data) {
      dispatch(setStudentBillsData(billsData.data.student_bills_data));
    }
  }, [billsData, dispatch]);

  // Handle API errors
  useEffect(() => {
    if (isError) {
      console.error("Payment API Error:", error);
      Alert.alert(
        "Error Loading Payment Data",
        "Unable to load payment information. Please try again.",
        [
          { text: "Retry", onPress: () => refetch() },
          { text: "Cancel", style: "cancel" },
        ],
      );
    }
  }, [isError, error, refetch]);

  const handleBackToMain = () => {
    setCurrentPage("main");
  };

  // Handle different page views
  if (currentPage === "make-payment") {
    return <MakePaymentPage onClose={onClose} onBack={handleBackToMain} />;
  }

  if (currentPage === "payment-history") {
    return <PaymentHistoryPage onClose={onClose} onBack={handleBackToMain} />;
  }

  // Loading state
  if (isLoading && studentIds.length > 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Center</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading payment data...</Text>
        </View>
      </View>
    );
  }

  // Main payment section view
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Center</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => refetch()}
        >
          <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overall Total Summary - Hidden as per requirements */}
        {/* <OverallTotalSummary
          summary={overallTotalSummary}
          studentCount={sessionStudents.length}
        /> */}

        {/* Students List */}
        <View style={styles.studentsSection}>
          {allStudentsPaymentData.length > 0 ? (
            allStudentsPaymentData.map((studentPayment, index) => (
              <StudentPaymentListItem
                key={`student-${studentPayment.summary.studentId}`}
                summary={studentPayment.summary}
                studentInfo={studentPayment.studentInfo}
              />
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialIcons
                name="account-balance-wallet"
                size={48}
                color="#CCCCCC"
              />
              <Text style={styles.emptyStateText}>
                No payment data available
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Payment information will appear here once loaded
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.primary,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 20,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
    marginTop: 16,
    fontFamily: theme.fonts.medium,
  },
  studentsSection: {
    paddingVertical: 8,
  },
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 40,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginVertical: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
    marginTop: 12,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999999",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

export default PaymentSection;
