import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../../../../styles/theme";
import {
  useInitiatePaymentSessionMutation,
  useCompletePaymentMutation,
} from "../../../../../api/payment-gateway-api";
import { checkNetworkBeforePayment } from "../../../../../utils/paymentSecurity";
import SecureWebViewCheckout from "../../../../payment/SecureWebViewCheckout";
import PaymentResultScreen from "../../../../payment/PaymentResultScreen";

// ─── Constants ─────────────────────────────────────────────────────────────────

const INVOICE_TYPE_COLORS = {
  "Term Fee":      { bg: "#E3F2FD", text: "#1565C0" },
  "Admission Fee": { bg: "#F3E5F5", text: "#7B1FA2" },
  "Exam Bill":     { bg: "#FFF3E0", text: "#E65100" },
  "Sport Fee":     { bg: "#E8F5E9", text: "#2E7D32" },
  "Material Bill": { bg: "#FBE9E7", text: "#BF360C" },
};

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * PayInvoicePage — 3-step invoice payment flow connected to HNB CyberSource gateway.
 *
 * Step 1: Amount selection (full balance or partial)
 * Step 2: Confirmation summary + network preflight check
 * Step 3a: SecureWebViewCheckout (CyberSource Unified Checkout inside WebView)
 * Step 3b: PaymentResultScreen (success or failed)
 */
const PayInvoicePage = ({ invoice, student, onBack, onClose, onPaymentComplete }) => {
  // ── Step state ──────────────────────────────────────────────────────
  // "amount" | "confirm" | "checkout" | "success" | "failed"
  const [step, setStep] = useState("amount");

  // ── Amount ──────────────────────────────────────────────────────────
  const [useFullAmount, setUseFullAmount] = useState(true);
  const [customAmount, setCustomAmount] = useState("");

  // ── CyberSource session data ────────────────────────────────────────
  const [sessionData, setSessionData] = useState(null);

  // ── Payment result data ─────────────────────────────────────────────
  const [paymentResult, setPaymentResult] = useState(null);  // { success data }
  const [paymentError, setPaymentError] = useState(null);    // { errorCode, message }

  // ── RTK mutations ───────────────────────────────────────────────────
  const [initiateSession, { isLoading: isInitiating }] = useInitiatePaymentSessionMutation();
  const [completePayment, { isLoading: isCompleting }]  = useCompletePaymentMutation();

  // ── Computed values ─────────────────────────────────────────────────
  const balanceAmount = parseFloat(invoice.balance_amount) || 0;
  const billTotal     = parseFloat(invoice.bill_total) || 0;
  const paidAmount    = parseFloat(invoice.paid_amount) || 0;

  const typeStyle = INVOICE_TYPE_COLORS[invoice.invoice_type] || { bg: "#F5F5F5", text: "#616161" };

  const getPaymentAmount = () => {
    if (useFullAmount) return balanceAmount;
    return parseFloat(customAmount) || 0;
  };

  const formatAmount = (val) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "LKR 0.00";
    return `LKR ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  // ── Step: Amount → Confirm ──────────────────────────────────────────
  const handleAmountNext = () => {
    const amt = getPaymentAmount();
    if (!amt || amt < 1) {
      Alert.alert("Invalid Amount", "Please enter a valid payment amount.");
      return;
    }
    if (amt > balanceAmount + 0.01) {
      Alert.alert("Amount Too High", `Amount cannot exceed the balance of ${formatAmount(balanceAmount)}.`);
      return;
    }
    setStep("confirm");
  };

  // ── Step: Confirm → launch CyberSource session ──────────────────────
  const handleProceedToCheckout = useCallback(async () => {
    // 1. Pre-flight network check
    const network = await checkNetworkBeforePayment();
    if (!network.isConnected) {
      Alert.alert("No Connection", network.message);
      return;
    }

    // 2. Request session from our Laravel backend
    try {
      const result = await initiateSession({
        invoice_type: invoice.invoice_type,
        invoice_id:   invoice.invoice_id,   // standardised field from backend
        amount:       getPaymentAmount(),
        student_id:   student.id,
      }).unwrap();

      if (result?.data) {
        setSessionData(result.data);
        setStep("checkout");
      } else {
        throw new Error("Invalid session response");
      }
    } catch (err) {
      console.error("❌ Payment session initiation failed:", err);

      if (err?.status === 504 || err?.data?.error === "GATEWAY_TIMEOUT") {
        Alert.alert(
          "Gateway Timeout",
          "The payment server took too long to respond. Your account has not been charged. Please try again.",
        );
      } else {
        Alert.alert(
          "Payment Unavailable",
          "Unable to start the payment process. Please try again in a moment.",
        );
      }
    }
  }, [invoice, student, getPaymentAmount, initiateSession]);

  // ── WebView: Payment success → call /payment/complete ──────────────
  const handlePaymentSuccess = useCallback(async (transientToken) => {
    if (!sessionData) return;
    try {
      const result = await completePayment({
        transient_token:  transientToken,
        order_reference:  sessionData.order_reference,
      }).unwrap();

      setPaymentResult(result?.data || {});
      setStep("success");
    } catch (err) {
      console.error("❌ Payment completion failed:", err);
      setPaymentError({ errorCode: "PAYMENT_FAILED", message: "Payment completion failed." });
      setStep("failed");
    }
  }, [sessionData, completePayment]);

  // ── WebView: Payment failed ─────────────────────────────────────────
  const handlePaymentFailed = useCallback((errorCode, message) => {
    setPaymentError({ errorCode, message });
    setStep("failed");
  }, []);

  // ── WebView: Payment cancelled ──────────────────────────────────────
  const handlePaymentCancelled = useCallback(() => {
    setStep("confirm");
  }, []);

  // ── WebView: Session expired — re-fetch ─────────────────────────────
  const handleRefetchSession = useCallback(() => {
    setSessionData(null);
    setStep("confirm");
    // Auto-trigger new session after a moment
    setTimeout(() => handleProceedToCheckout(), 300);
  }, [handleProceedToCheckout]);

  // ── Result: Done (success) ──────────────────────────────────────────
  const handleDone = () => {
    if (onPaymentComplete) onPaymentComplete();
    onClose();
  };

  // ── Result: Retry (failed) ──────────────────────────────────────────
  const handleRetry = () => {
    setSessionData(null);
    setPaymentError(null);
    setStep("confirm");
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: Checkout WebView
  // ─────────────────────────────────────────────────────────────────────
  if (step === "checkout" && sessionData) {
    return (
      <SecureWebViewCheckout
        captureContext={sessionData.capture_context}
        clientLibraryUrl={sessionData.client_library_url}
        clientLibraryIntegrity={sessionData.client_library_integrity}
        orderReference={sessionData.order_reference}
        amount={getPaymentAmount()}
        currency="LKR"
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailed={handlePaymentFailed}
        onPaymentCancelled={handlePaymentCancelled}
        onRefetchSession={handleRefetchSession}
        onClose={onClose}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: Success screen
  // ─────────────────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <PaymentResultScreen
        type="success"
        amount={paymentResult?.amount}
        currency={paymentResult?.currency}
        invoiceType={paymentResult?.invoice_type}
        orderReference={paymentResult?.order_reference}
        receiptVoucherId={paymentResult?.receipt_voucher_id}
        message={paymentResult?.message}
        onDone={handleDone}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: Failed screen
  // ─────────────────────────────────────────────────────────────────────
  if (step === "failed") {
    return (
      <PaymentResultScreen
        type="failed"
        errorCode={paymentError?.errorCode}
        onDone={handleDone}
        onRetry={handleRetry}
        onCancel={handleDone}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: Amount / Confirm steps
  // ─────────────────────────────────────────────────────────────────────
  const stepTitles = ["Select Amount", "Confirm"];
  const stepIndex  = step === "amount" ? 0 : 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => (step === "amount" ? onBack() : setStep("amount"))}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Pay Invoice</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {student.full_name_with_title}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Step Progress */}
      <View style={styles.progressBar}>
        {stepTitles.map((title, i) => {
          const isActive  = stepIndex >= i;
          const isCurrent = stepIndex === i;
          return (
            <React.Fragment key={i}>
              <View style={styles.progressStep}>
                <View style={[styles.progressDot, isActive && styles.progressDotActive, isCurrent && styles.progressDotCurrent]}>
                  {stepIndex > i ? (
                    <MaterialIcons name="check" size={14} color="#FFFFFF" />
                  ) : (
                    <Text style={styles.progressDotText}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[styles.progressLabel, isActive && styles.progressLabelActive]}>{title}</Text>
              </View>
              {i < stepTitles.length - 1 && (
                <View style={[styles.progressLine, stepIndex > i && styles.progressLineActive]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Step Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Invoice Summary Card — shown on both steps */}
        <View style={styles.invoiceCard}>
          <View style={styles.invoiceCardTop}>
            <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
              <Text style={[styles.typeBadgeText, { color: typeStyle.text }]}>
                {invoice.invoice_type}
              </Text>
            </View>
            {invoice.term_name && <Text style={styles.termName}>{invoice.term_name}</Text>}
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.serialNumber}>{invoice.serial_number}</Text>
            <Text style={styles.invoiceDate}>{formatDate(invoice.date)}</Text>
          </View>
          <View style={styles.amountRow}>
            {[
              { label: "Bill Total", value: billTotal, color: "#333" },
              { label: "Paid",       value: paidAmount, color: "#2E7D32" },
              { label: "Balance",    value: balanceAmount, color: "#E65100" },
            ].map((item, i) => (
              <React.Fragment key={item.label}>
                {i > 0 && <View style={styles.amountDivider} />}
                <View style={styles.amountCol}>
                  <Text style={styles.amountLabel}>{item.label}</Text>
                  <Text style={[styles.amountValue, { color: item.color }]}>
                    {formatAmount(item.value)}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── STEP 1: Amount ──────────────────────────────────────────── */}
        {step === "amount" && (
          <>
            <Text style={styles.sectionLabel}>Payment Amount</Text>

            <TouchableOpacity
              style={[styles.amountOption, useFullAmount && styles.amountOptionActive]}
              onPress={() => { setUseFullAmount(true); setCustomAmount(""); }}
              activeOpacity={0.8}
            >
              <View style={styles.amountOptionLeft}>
                <MaterialIcons
                  name={useFullAmount ? "radio-button-checked" : "radio-button-unchecked"}
                  size={22}
                  color={useFullAmount ? "#2E7D32" : "#CCCCCC"}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.amountOptionLabel}>Pay Full Balance</Text>
                  <Text style={styles.amountOptionSub}>Clear this invoice completely</Text>
                </View>
              </View>
              <Text style={[styles.amountOptionAmount, { color: "#2E7D32" }]}>
                {formatAmount(balanceAmount)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.amountOption, !useFullAmount && styles.amountOptionActive]}
              onPress={() => setUseFullAmount(false)}
              activeOpacity={0.8}
            >
              <View style={styles.amountOptionLeft}>
                <MaterialIcons
                  name={!useFullAmount ? "radio-button-checked" : "radio-button-unchecked"}
                  size={22}
                  color={!useFullAmount ? "#2E7D32" : "#CCCCCC"}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.amountOptionLabel}>Pay Custom Amount</Text>
                  <Text style={styles.amountOptionSub}>Partial payment towards balance</Text>
                </View>
              </View>
            </TouchableOpacity>

            {!useFullAmount && (
              <View style={styles.customInputBox}>
                <Text style={styles.currencyPrefix}>LKR</Text>
                <TextInput
                  style={styles.customInput}
                  placeholder="Enter amount"
                  placeholderTextColor="#AAAAAA"
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  keyboardType="decimal-pad"
                  maxLength={10}
                  autoFocus
                />
              </View>
            )}
          </>
        )}

        {/* ── STEP 2: Confirm ─────────────────────────────────────────── */}
        {step === "confirm" && (
          <>
            <Text style={styles.sectionLabel}>Confirm Payment</Text>

            <View style={styles.confirmCard}>
              {[
                { label: "Student",       value: student.full_name_with_title },
                { label: "Invoice Type",  value: invoice.invoice_type },
                { label: "Reference",     value: invoice.serial_number },
                { label: "Payment",       value: formatAmount(getPaymentAmount()), highlight: true },
              ].map((row) => (
                <View key={row.label} style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>{row.label}</Text>
                  <Text
                    style={[styles.confirmValue, row.highlight && styles.confirmHighlight]}
                    numberOfLines={1}
                  >
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.gatewayNotice}>
              <MaterialIcons name="lock" size={16} color="#1565C0" />
              <Text style={styles.gatewayNoticeText}>
                You will be redirected to the HNB secure payment gateway. Your card details are handled directly by CyberSource — we never see them.
              </Text>
            </View>

            <View style={styles.schemeBadges}>
              {["Visa", "Mastercard", "AMEX", "UnionPay"].map((s) => (
                <View key={s} style={styles.schemeBadge}>
                  <Text style={styles.schemeBadgeText}>{s}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer action button */}
      <View style={styles.footer}>
        {step === "amount" ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleAmountNext} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Review Payment</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, styles.checkoutBtn, isInitiating && styles.btnDisabled]}
            onPress={handleProceedToCheckout}
            disabled={isInitiating}
            activeOpacity={0.85}
          >
            {isInitiating ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Connecting to gateway...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="payment" size={20} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Proceed to Secure Checkout</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },

  header: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 14, paddingHorizontal: 16, gap: 12,
  },
  headerBtn:     { padding: 6 },
  headerCenter:  { flex: 1, alignItems: "center" },
  headerTitle:   { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle:{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },

  progressBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFFFF", paddingVertical: 16, paddingHorizontal: 40,
    borderBottomWidth: 1, borderBottomColor: "#EEEEEE",
  },
  progressStep:        { alignItems: "center" },
  progressDot:         { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E0E0E0", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  progressDotActive:   { backgroundColor: "#BBDEFB" },
  progressDotCurrent:  { backgroundColor: theme.colors.primary },
  progressDotText:     { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  progressLabel:       { fontSize: 11, color: "#AAAAAA", fontWeight: "500" },
  progressLabelActive: { color: theme.colors.primary },
  progressLine:        { flex: 1, height: 2, backgroundColor: "#E0E0E0", marginHorizontal: 8, marginBottom: 20 },
  progressLineActive:  { backgroundColor: theme.colors.primary },

  content:      { flex: 1, padding: 16 },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 14, marginTop: 4 },

  invoiceCard: {
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: "#F0F0F0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  invoiceCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  typeBadge:      { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  typeBadgeText:  { fontSize: 13, fontWeight: "700" },
  termName:       { fontSize: 12, color: "#888888", fontStyle: "italic" },
  invoiceMeta:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  serialNumber:   { fontSize: 14, fontWeight: "600", color: "#333333" },
  invoiceDate:    { fontSize: 13, color: "#888888" },
  amountRow:      { flexDirection: "row", backgroundColor: "#FAFAFA", borderRadius: 8, padding: 12 },
  amountCol:      { flex: 1, alignItems: "center" },
  amountDivider:  { width: 1, backgroundColor: "#EEEEEE", marginVertical: 4 },
  amountLabel:    { fontSize: 10, color: "#999999", fontWeight: "600", textTransform: "uppercase", marginBottom: 4 },
  amountValue:    { fontSize: 12, fontWeight: "700" },

  amountOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: "#EEEEEE",
  },
  amountOptionActive: { borderColor: "#2E7D32", backgroundColor: "#F1F8E9" },
  amountOptionLeft:   { flexDirection: "row", alignItems: "center", flex: 1 },
  amountOptionLabel:  { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  amountOptionSub:    { fontSize: 12, color: "#888888", marginTop: 2 },
  amountOptionAmount: { fontSize: 15, fontWeight: "700" },
  customInputBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFFFFF", borderRadius: 10,
    borderWidth: 1.5, borderColor: "#2E7D32",
    paddingHorizontal: 16, marginBottom: 12, height: 54,
  },
  currencyPrefix: { fontSize: 16, fontWeight: "700", color: "#555555", marginRight: 10 },
  customInput:    { flex: 1, fontSize: 18, fontWeight: "600", color: "#1A1A1A" },

  confirmCard: {
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: "#F0F0F0",
  },
  confirmRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  confirmLabel:     { fontSize: 14, color: "#888888" },
  confirmValue:     { fontSize: 14, fontWeight: "600", color: "#1A1A1A", maxWidth: "55%", textAlign: "right" },
  confirmHighlight: { fontSize: 16, color: "#2E7D32", fontWeight: "700" },

  gatewayNotice: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#E3F2FD", borderRadius: 10, padding: 14, gap: 10, marginBottom: 14,
  },
  gatewayNoticeText: { flex: 1, fontSize: 13, color: "#1565C0", lineHeight: 19 },

  schemeBadges: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  schemeBadge:  { backgroundColor: "#F5F5F5", borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: "#E0E0E0" },
  schemeBadgeText: { fontSize: 12, fontWeight: "600", color: "#555555" },

  footer: { padding: 16, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#EEEEEE" },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 15, gap: 10,
  },
  checkoutBtn:  { backgroundColor: "#1B5E20" },
  btnDisabled:  { opacity: 0.7 },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});

export default PayInvoicePage;
