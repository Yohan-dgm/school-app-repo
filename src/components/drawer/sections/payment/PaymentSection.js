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
import { useGetStudentPendingInvoicesQuery } from "../../../../api/pending-invoice-api";
import {
  setStudentBillsData,
  setPendingInvoicesData,
  selectOverallTotalSummary,
  selectAllStudentsWithPaymentData,
  selectStudentBillDetailsByStudentId,
  selectPendingInvoicesData,
} from "../../../../state-store/slices/payment/paymentSlice";
import OverallTotalSummary from "../../../payment/OverallTotalSummary";
import StudentPaymentListItem from "../../../payment/StudentPaymentListItem";
import PendingInvoiceCard from "../../../payment/PendingInvoiceCard";
import MakePaymentPage from "./pages/MakePaymentPage";
import PaymentHistoryPage from "./pages/PaymentHistoryPage";
import PayInvoicePage from "./pages/PayInvoicePage";

const PaymentSection = ({ onClose, onNavigateToSubSection }) => {
  const dispatch = useDispatch();
  const [currentPage, setCurrentPage] = useState("main"); // main | make-payment | payment-history | pay-invoice
  const [selectedInvoice, setSelectedInvoice] = useState(null);   // { invoice, student }

  // Redux state
  const { sessionData } = useSelector((state) => state.app);
  const overallTotalSummary = useSelector(selectOverallTotalSummary);
  const allStudentsPaymentData = useSelector(selectAllStudentsWithPaymentData);
  const pendingInvoicesData = useSelector(selectPendingInvoicesData);

  // Students from session
  const sessionStudentList = sessionData?.data?.student_list || [];

  // Student IDs (for existing bills API)
  const studentIds = sessionStudentList.map(
    (student) => student.student_id || student.id,
  );

  // Admission numbers (for pending invoices API)
  // Try both top-level and nested shapes defensively
  const admissionNumbers = sessionStudentList
    .map((student) => student.admission_number || student.student?.admission_number)
    .filter(Boolean);

  // Debug: log what is being sent to confirm all students are included
  useEffect(() => {
    if (sessionStudentList.length > 0) {
      console.log("📋 PaymentSection — students from session:", {
        totalStudents: sessionStudentList.length,
        admissionNumbers,
        studentIds,
      });
    }
  }, [sessionData]);

  // ── API: Existing paid bills ──────────────────────────────────────────
  const {
    data: billsData,
    isLoading: isBillsLoading,
    isError: isBillsError,
    error: billsError,
    refetch: refetchBills,
  } = useGetStudentBillsDataQuery(
    { student_ids: studentIds },
    {
      skip: studentIds.length === 0,
      refetchOnMountOrArgChange: true,
    },
  );

  // ── API: Pending invoices ─────────────────────────────────────────────
  const {
    data: pendingData,
    isLoading: isPendingLoading,
    isError: isPendingError,
    error: pendingError,
    refetch: refetchPending,
  } = useGetStudentPendingInvoicesQuery(
    { admission_number: admissionNumbers },
    {
      skip: admissionNumbers.length === 0,
      refetchOnMountOrArgChange: true,
    },
  );

  // Sync bills data to Redux
  useEffect(() => {
    if (billsData?.data?.student_bills_data) {
      dispatch(setStudentBillsData(billsData.data.student_bills_data));
    }
  }, [billsData, dispatch]);

  // Sync pending invoices to Redux
  useEffect(() => {
    if (pendingData?.data?.pending_invoices) {
      dispatch(setPendingInvoicesData(pendingData.data.pending_invoices));
    }
  }, [pendingData, dispatch]);

  // Error handling
  useEffect(() => {
    if (isBillsError) console.error("Payment API Error:", billsError);
    if (isPendingError) console.error("Pending Invoice API Error:", pendingError);
    if (isBillsError || isPendingError) {
      Alert.alert(
        "Error Loading Payment Data",
        "Unable to load payment information. Please try again.",
        [
          {
            text: "Retry",
            onPress: () => {
              refetchBills();
              refetchPending();
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    }
  }, [isBillsError, isPendingError, billsError, pendingError, refetchBills, refetchPending]);

  const handleRefresh = () => {
    refetchBills();
    refetchPending();
  };

  const handleBackToMain = () => {
    setCurrentPage("main");
    setSelectedInvoice(null);
  };

  // Handle Pay Now tap from PendingInvoiceCard
  const handlePayInvoice = (invoice, student) => {
    setSelectedInvoice({ invoice, student });
    setCurrentPage("pay-invoice");
  };

  // ── Sub-pages ─────────────────────────────────────────────────────────
  if (currentPage === "pay-invoice" && selectedInvoice) {
    return (
      <PayInvoicePage
        invoice={selectedInvoice.invoice}
        student={selectedInvoice.student}
        onBack={handleBackToMain}
        onClose={onClose}
        onPaymentComplete={() => {
          handleBackToMain();
          // Refresh both lists so paid invoice disappears from pending
          handleRefresh();
        }}
      />
    );
  }

  if (currentPage === "make-payment") {
    return <MakePaymentPage onClose={onClose} onBack={handleBackToMain} />;
  }

  if (currentPage === "payment-history") {
    return <PaymentHistoryPage onClose={onClose} onBack={handleBackToMain} />;
  }

  // Loading state
  const isLoading = (isBillsLoading || isPendingLoading) && studentIds.length > 0;
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Center</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading payment data...</Text>
        </View>
      </View>
    );
  }

  const hasPending = pendingInvoicesData && pendingInvoicesData.length > 0;
  const hasBills = allStudentsPaymentData && allStudentsPaymentData.length > 0;

  // ── Main View ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Center</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleRefresh}>
          <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Section 1: Pending Invoices ────────────────────────── */}
        {hasPending ? (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, styles.pendingSectionHeader]}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.pendingIconBox}>
                  <MaterialIcons name="pending-actions" size={18} color="#E65100" />
                </View>
                <View>
                  <Text style={styles.pendingSectionTitle}>Pending Invoices</Text>
                  <Text style={styles.sectionSubtitle}>
                    {pendingInvoicesData.reduce((acc, s) => acc + s.pending_invoice_count, 0)} invoice
                    {pendingInvoicesData.reduce((acc, s) => acc + s.pending_invoice_count, 0) !== 1 ? "s" : ""} outstanding
                    across {pendingInvoicesData.length} student{pendingInvoicesData.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
            </View>

            {pendingInvoicesData.map((studentPendingData) => (
              <PendingInvoiceCard
                key={`pending-${studentPendingData.student.id}`}
                studentData={studentPendingData}
                onPayInvoice={handlePayInvoice}
              />
            ))}
          </View>
        ) : (
          // No pending invoices — green all clear banner
          <View style={styles.allClearBanner}>
            <MaterialIcons name="check-circle" size={28} color="#2E7D32" />
            <View style={styles.allClearText}>
              <Text style={styles.allClearTitle}>All Paid Up!</Text>
              <Text style={styles.allClearSub}>No outstanding invoices at this time.</Text>
            </View>
          </View>
        )}

        {/* ── Divider ────────────────────────────────────────────── */}
        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Section 2: Payment History ─────────────────────────── */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.historySectionHeader]}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.historyIconBox}>
                <MaterialIcons name="history" size={18} color="#1565C0" />
              </View>
              <View>
                <Text style={styles.historySectionTitle}>Payment History</Text>
                <Text style={styles.sectionSubtitle}>
                  Tap a student to expand their bill details
                </Text>
              </View>
            </View>
          </View>

          {hasBills ? (
            allStudentsPaymentData.map((studentPayment) => (
              <StudentPaymentListItem
                key={`student-${studentPayment.summary.studentId}`}
                summary={studentPayment.summary}
                studentInfo={studentPayment.studentInfo}
              />
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialIcons name="account-balance-wallet" size={44} color="#CCCCCC" />
              <Text style={styles.emptyStateText}>No payment history available</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F4F7" },

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.primary,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  headerBtn: { padding: 8, width: 40, alignItems: "center" },
  headerTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },

  // ── Content ──────────────────────────────────────────────
  content: { flex: 1 },
  section: { paddingBottom: 4 },
  bottomPad: { height: 24 },

  // ── Section Headers ──────────────────────────────────────
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pendingSectionHeader: {
    backgroundColor: "#FFF8F0",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE0B2",
    marginBottom: 6,
  },
  historySectionHeader: {
    backgroundColor: "#F0F4FF",
    borderBottomWidth: 1,
    borderBottomColor: "#BBDEFB",
    marginBottom: 6,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pendingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF3E0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BBDEFB",
  },
  pendingSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E65100",
    marginBottom: 2,
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1565C0",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "400",
  },

  // ── All Clear Banner ────────────────────────────────────
  allClearBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F8E9",
    borderWidth: 1,
    borderColor: "#C8E6C9",
    borderRadius: 12,
    margin: 16,
    padding: 16,
    gap: 14,
  },
  allClearText: { flex: 1 },
  allClearTitle: { fontSize: 15, fontWeight: "700", color: "#2E7D32", marginBottom: 2 },
  allClearSub: { fontSize: 13, color: "#558B2F" },

  // ── Divider ─────────────────────────────────────────────
  sectionDivider: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dividerLine: {
    height: 1,
    backgroundColor: "#E0E0E0",
  },

  // ── Loading ─────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 15,
    color: "#666666",
    marginTop: 14,
    fontFamily: theme.fonts.medium,
  },

  // ── Empty State ─────────────────────────────────────────
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 32,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginVertical: 6,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#999999",
    marginTop: 10,
  },
});

export default PaymentSection;
