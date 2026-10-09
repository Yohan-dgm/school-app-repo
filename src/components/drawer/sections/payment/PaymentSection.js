import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { theme } from "../../../../styles/theme";
import { useGetStudentBillsDataQuery } from "../../../../api/parent-payment-api";
import { useGetStudentPendingInvoicesQuery } from "../../../../api/pending-invoice-api";
import { useGetMyStudentListQuery } from "../../../../api/student-header-api";
import {
  setStudentBillsData,
  setPendingInvoicesData,
  selectPendingInvoicesData,
} from "../../../../state-store/slices/payment/paymentSlice";
import PendingInvoiceCard from "../../../payment/PendingInvoiceCard";
import GatewayPaymentHistoryList from "../../../payment/GatewayPaymentHistoryList";
import PayInvoicePage from "./pages/PayInvoicePage";

const PaymentHeader = ({ onBack, onRefresh }) => (
  <View style={styles.header}>
    <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
      <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Payment Center</Text>
    {onRefresh ? (
      <TouchableOpacity style={styles.headerBtn} onPress={onRefresh}>
        <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    ) : (
      <View style={styles.headerBtn} />
    )}
  </View>
);

const PaymentSection = ({ onClose }) => {
  const dispatch = useDispatch();
  const [currentPage, setCurrentPage] = useState("main"); // main | pay-invoice
  const [selectedInvoice, setSelectedInvoice] = useState(null); // { invoice, student }

  // Redux state
  const { sessionData } = useSelector((state) => state.app);
  const pendingInvoicesData = useSelector(selectPendingInvoicesData);

  // ── API: Fresh student list (same API the Header student picker uses) ──
  const {
    data: studentListData,
    isLoading: isListLoading,
    isFetching: isListFetching,
    isError: isListError,
    refetch: refetchList,
  } = useGetMyStudentListQuery(undefined, { refetchOnMountOrArgChange: true });

  // Student IDs (bills API) and admission numbers (pending invoices API).
  // Falls back to the login-cached list if the fresh list couldn't be loaded.
  const { studentIds, admissionNumbers } = useMemo(() => {
    const list =
      studentListData?.data?.student_list ||
      (isListError ? sessionData?.data?.student_list : null) ||
      [];
    return {
      studentIds: list.map((s) => s.student_id || s.id),
      admissionNumbers: list
        .map((s) => s.admission_number || s.student?.admission_number)
        .filter(Boolean),
    };
  }, [studentListData, isListError, sessionData]);

  // ── API: Existing paid bills ──────────────────────────────────────────
  const {
    data: billsData,
    isLoading: isBillsLoading,
    isFetching: isBillsFetching,
    isError: isBillsError,
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
    isFetching: isPendingFetching,
    isError: isPendingError,
    refetch: refetchPending,
  } = useGetStudentPendingInvoicesQuery(
    { admission_number: admissionNumbers },
    {
      skip: admissionNumbers.length === 0,
      refetchOnMountOrArgChange: true,
    },
  );

  // Sync API data to Redux
  useEffect(() => {
    if (billsData?.data?.student_bills_data) {
      dispatch(setStudentBillsData(billsData.data.student_bills_data));
    }
  }, [billsData, dispatch]);

  useEffect(() => {
    if (pendingData?.data?.pending_invoices) {
      dispatch(setPendingInvoicesData(pendingData.data.pending_invoices));
    }
  }, [pendingData, dispatch]);

  const hasError =
    isBillsError || isPendingError || (isListError && studentIds.length === 0);
  const isRefreshing = isBillsFetching || isPendingFetching || isListFetching;

  const pendingCount = useMemo(
    () =>
      (pendingInvoicesData || []).reduce(
        (acc, s) => acc + (s.pending_invoice_count || 0),
        0,
      ),
    [pendingInvoicesData],
  );

  const handleRefresh = useCallback(() => {
    refetchList();
    if (studentIds.length > 0) refetchBills();
    if (admissionNumbers.length > 0) refetchPending();
  }, [studentIds, admissionNumbers, refetchList, refetchBills, refetchPending]);

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
          // Refresh so the paid invoice disappears from pending
          handleRefresh();
        }}
      />
    );
  }

  // First-load state
  if ((isListLoading || isBillsLoading || isPendingLoading) && !hasError) {
    return (
      <View style={styles.container}>
        <PaymentHeader onBack={onClose} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading payment data...</Text>
        </View>
      </View>
    );
  }

  const hasPending = pendingInvoicesData && pendingInvoicesData.length > 0;

  // ── Main View ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <PaymentHeader onBack={onClose} onRefresh={handleRefresh} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* ── Section 1: Pending Invoices ────────────────────────── */}
        {hasError ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={26} color="#C62828" />
            <View style={styles.allClearText}>
              <Text style={styles.errorTitle}>Unable to load payment data</Text>
              <Text style={styles.errorSub}>
                Please check your connection and try again.
              </Text>
            </View>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {hasPending ? (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, styles.pendingSectionHeader]}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.pendingIconBox}>
                  <MaterialIcons
                    name="pending-actions"
                    size={18}
                    color="#E65100"
                  />
                </View>
                <View>
                  <Text style={styles.pendingSectionTitle}>
                    Pending Invoices
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    {pendingCount} invoice{pendingCount !== 1 ? "s" : ""}{" "}
                    outstanding across {pendingInvoicesData.length} student
                    {pendingInvoicesData.length !== 1 ? "s" : ""}
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
        ) : !hasError ? (
          studentIds.length === 0 ? (
            <View style={styles.allClearBanner}>
              <MaterialIcons name="info-outline" size={28} color="#607D8B" />
              <View style={styles.allClearText}>
                <Text style={styles.noStudentTitle}>No students linked</Text>
                <Text style={styles.noStudentSub}>
                  No student accounts are available for payments.
                </Text>
              </View>
            </View>
          ) : (
            // No pending invoices — green all clear banner
            <View style={styles.allClearBanner}>
              <MaterialIcons name="check-circle" size={28} color="#2E7D32" />
              <View style={styles.allClearText}>
                <Text style={styles.allClearTitle}>All Paid Up!</Text>
                <Text style={styles.allClearSub}>
                  No outstanding invoices at this time.
                </Text>
              </View>
            </View>
          )
        ) : null}

        {/* ── Divider ────────────────────────────────────────────── */}
        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Section 2: Payment History (online gateway payments) ── */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.historySectionHeader]}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.historyIconBox}>
                <MaterialIcons name="history" size={18} color="#1565C0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historySectionTitle}>Payment History</Text>
                <Text style={styles.sectionSubtitle}>
                  Your online payments — tap a row for details
                </Text>
              </View>
            </View>
          </View>

          <GatewayPaymentHistoryList />
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
  allClearTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 2,
  },
  allClearSub: { fontSize: 13, color: "#558B2F" },
  noStudentTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#455A64",
    marginBottom: 2,
  },
  noStudentSub: { fontSize: 13, color: "#78909C" },

  // ── Error Banner ────────────────────────────────────────
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    borderWidth: 1,
    borderColor: "#FFCDD2",
    borderRadius: 12,
    margin: 16,
    padding: 16,
    gap: 12,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#C62828",
    marginBottom: 2,
  },
  errorSub: { fontSize: 13, color: "#D32F2F" },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#C62828",
  },
  retryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },

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
});

export default PaymentSection;
