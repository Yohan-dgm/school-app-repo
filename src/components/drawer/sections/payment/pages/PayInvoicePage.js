import React, { useState, useCallback, useRef } from "react";
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
  useGetPaymentGatewayStatusQuery,
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

// Online payment service charge — must match CYBERSOURCE_SERVICE_FEE_PERCENTAGE
// on the backend. Used only for a client-side estimate before a session exists;
// the actual amount charged always comes from the backend response
// (sessionData.total_charged_amount / paymentResult.total_charged_amount).
const SERVICE_FEE_PERCENTAGE = 3;
const getServiceFee = (amount) => Math.round(amount * SERVICE_FEE_PERCENTAGE) / 100;

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

  // ── Completion-retry state ──────────────────────────────────────────
  // Remembers the order_reference + transient_token from the last WebView
  // PAYMENT_SUCCESS message even after sessionData is cleared, so a failed
  // /payment/complete call can be safely retried with the SAME token instead
  // of starting an entirely new (and potentially duplicate) CyberSource session.
  const lastCompletionRef = useRef(null); // { transientToken, orderReference } | null
  // Prevents a duplicate WebView PAYMENT_SUCCESS message from firing
  // completePayment twice concurrently.
  const isSubmittingRef = useRef(false);

  // ── Gateway maintenance status ───────────────────────────────────────
  // Checked on entry so a payer sees "Under Maintenance" immediately rather
  // than after filling in an amount. This is a UX check only — the backend
  // enforces the same flag as the real gate inside initiate-session, so a
  // GATEWAY_UNDER_MAINTENANCE error from that call (e.g. the flag flipped
  // mid-session) also routes to the same maintenance screen via this state.
  const { data: gatewayStatusData, isLoading: isCheckingGatewayStatus } = useGetPaymentGatewayStatusQuery();
  const [forcedMaintenanceMessage, setForcedMaintenanceMessage] = useState(null);

  const isUnderMaintenance =
    forcedMaintenanceMessage !== null || gatewayStatusData?.data?.is_active === false;
  const maintenanceMessage =
    forcedMaintenanceMessage ||
    gatewayStatusData?.data?.maintenance_message ||
    "Online payments are temporarily unavailable. Please try again later.";

  // ── RTK mutations ───────────────────────────────────────────────────
  const [initiateSession, { isLoading: isInitiating }] = useInitiatePaymentSessionMutation();
  const [completePayment] = useCompletePaymentMutation();

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
 // Safely extract the primary key across all fee invoice types
  const resolvedInvoiceId = 
    invoice.invoice_id || 
    invoice.term_fee_invoice_id || 
    invoice.admission_fee_invoice_id || 
    invoice.sport_fee_invoice_id || 
    invoice.exam_bill_id || 
    invoice.material_bill_id || 
    invoice.id;

  if (!resolvedInvoiceId) {
    Alert.alert("Invoice Error", "Unable to resolve the invoice ID for payment.");
    return;
  }
    // 2. Request session from our Laravel backend
    try {
      const result = await initiateSession({
        invoice_type: invoice.invoice_type,
        invoice_id:   resolvedInvoiceId,   // standardised field from backend
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
    if (err?.data?.error === "GATEWAY_UNDER_MAINTENANCE") {
      // Flag flipped off between the entry-point status check and this call —
      // fall back to the same maintenance screen instead of a generic alert.
      setForcedMaintenanceMessage(
        err?.data?.message || "Online payments are temporarily unavailable. Please try again later."
      );
    } else if (err?.status === 504 || err?.data?.error === "GATEWAY_TIMEOUT") {
      Alert.alert(
        "Gateway Timeout",
        "The payment server took too long to respond. Your account has not been charged. Please try again."
      );
    } else {
      Alert.alert(
        "Payment Unavailable",
        err?.data?.message || "Unable to start the payment process. Please check your data."
      );
    }
  }
}, [invoice, student, getPaymentAmount, initiateSession]);

  // ── Shared completion call, used by both the WebView success handler and
  //    the "Retry" button on the failed screen (safe retry — same token). ──
  const attemptCompletePayment = useCallback(async (transientToken, orderReference) => {
    const result = await completePayment({
      transient_token: transientToken,
      order_reference: orderReference,
    }).unwrap();

    setPaymentResult(result?.data || {});
    lastCompletionRef.current = null;
    setStep("success");
  }, [completePayment]);

  // ── WebView: Payment success → call /payment/complete ──────────────
  const handlePaymentSuccess = useCallback(async (transientToken) => {
    if (!sessionData) {
      // CyberSource authorized the payment but our local session was cleared
      // (e.g. a stale/expired retry). Do NOT drop the token silently — the
      // charge may already be real. Surface it so the user can get help
      // instead of being stuck on a "processing" screen forever.
      console.error("❌ Payment success received with no active session — cannot complete.");
      setPaymentError({
        errorCode: "SESSION_LOST",
        message: "Your payment may have been processed, but we lost track of the session. Please check Payment History or contact the finance office before retrying.",
      });
      setStep("failed");
      return;
    }
    if (isSubmittingRef.current) return; // guard against a duplicate bridge message
    isSubmittingRef.current = true;

    const orderReference = sessionData.order_reference;
    lastCompletionRef.current = { transientToken, orderReference };

    try {
      await attemptCompletePayment(transientToken, orderReference);
    } catch (err) {
      console.error("❌ Payment completion failed:", err);

      // Distinguish bank decline from other errors
      const errorCode = err?.data?.error === "PAYMENT_DECLINED"
        ? "PAYMENT_DECLINED"
        : "PAYMENT_FAILED";
      const message = err?.data?.error === "PAYMENT_DECLINED"
        ? err?.data?.message || "Your payment was declined by the bank."
        : "Payment completion failed. Please try again.";

      setPaymentError({ errorCode, message });
      setStep("failed");
    } finally {
      isSubmittingRef.current = false;
    }
  }, [sessionData, attemptCompletePayment]);

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
  const handleRetry = async () => {
    const pending = lastCompletionRef.current;

    // If CyberSource already authorized a payment for this order and only the
    // /payment/complete call itself failed (e.g. network drop), retry
    // completion with the SAME transient_token/order_reference first. The
    // order is still "pending" server-side, so this is safe and idempotent —
    // starting a brand-new session instead would risk a second real charge.
    if (pending && !isSubmittingRef.current) {
      isSubmittingRef.current = true;
      try {
        await attemptCompletePayment(pending.transientToken, pending.orderReference);
        isSubmittingRef.current = false;
        return;
      } catch (err) {
        console.error("❌ Safe completion retry failed, falling back to new session:", err);
        isSubmittingRef.current = false;
        // Order may have expired or the token is no longer usable — fall
        // through to a full restart below.
      }
    }

    lastCompletionRef.current = null;
    setSessionData(null);
    setPaymentError(null);
    setStep("confirm");
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: Under Maintenance — only blocks entry (amount/confirm steps);
  // never interrupts a checkout/success/failed screen already in progress.
  // ─────────────────────────────────────────────────────────────────────
  if (isUnderMaintenance && step !== "checkout" && step !== "success" && step !== "failed") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Pay Invoice</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.maintenanceContainer}>
          <MaterialIcons name="build" size={56} color="#E65100" />
          <Text style={styles.maintenanceTitle}>Under Maintenance</Text>
          <Text style={styles.maintenanceMessage}>{maintenanceMessage}</Text>
          <TouchableOpacity style={styles.maintenanceBackBtn} onPress={onBack} activeOpacity={0.85}>
            <Text style={styles.maintenanceBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER: Checking gateway status (brief, before amount/confirm show)
  // ─────────────────────────────────────────────────────────────────────
  if (isCheckingGatewayStatus && step !== "checkout" && step !== "success" && step !== "failed") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Pay Invoice</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.maintenanceContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

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
        amount={sessionData.total_charged_amount ?? sessionData.amount ?? getPaymentAmount()}
        currency={sessionData.currency || "LKR"}
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
        serviceFeeAmount={paymentResult?.service_fee_amount}
        totalChargedAmount={paymentResult?.total_charged_amount}
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

            {/* Fee breakdown — amount, online service charge, total to pay */}
            <View style={styles.confirmCard}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Amount</Text>
                <Text style={styles.confirmValue}>{formatAmount(getPaymentAmount())}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Online Service Charge ({SERVICE_FEE_PERCENTAGE}%)</Text>
                <Text style={styles.confirmValue}>{formatAmount(getServiceFee(getPaymentAmount()))}</Text>
              </View>
              <View style={[styles.confirmRow, styles.confirmRowLast]}>
                <Text style={styles.confirmTotalLabel}>Total to Pay</Text>
                <Text style={styles.confirmHighlight}>
                  {formatAmount(getPaymentAmount() + getServiceFee(getPaymentAmount()))}
                </Text>
              </View>
            </View>

            <View style={styles.gatewayNotice}>
              <MaterialIcons name="lock" size={16} color="#1565C0" />
              <Text style={styles.gatewayNoticeText}>
                You will be redirected to the HNB secure payment gateway. Your card details are handled directly by CyberSource — we never see them. A {SERVICE_FEE_PERCENTAGE}% online service charge applies to card payments.
              </Text>
            </View>

            <View style={styles.schemeBadges}>
              {["Visa", "Mastercard", "AMEX"].map((s) => (
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
  confirmRowLast:   { borderBottomWidth: 0 },
  confirmLabel:     { fontSize: 14, color: "#888888" },
  confirmValue:     { fontSize: 14, fontWeight: "600", color: "#1A1A1A", maxWidth: "55%", textAlign: "right" },
  confirmTotalLabel:{ fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  confirmHighlight: { fontSize: 16, color: "#2E7D32", fontWeight: "700" },

  gatewayNotice: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#E3F2FD", borderRadius: 10, padding: 14, gap: 10, marginBottom: 14,
  },
  gatewayNoticeText: { flex: 1, fontSize: 13, color: "#1565C0", lineHeight: 19 },

  schemeBadges: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  schemeBadge:  { backgroundColor: "#F5F5F5", borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: "#E0E0E0" },
  schemeBadgeText: { fontSize: 12, fontWeight: "600", color: "#555555" },

  maintenanceContainer: {
    flex: 1, alignItems: "center", justifyContent: "center", padding: 32,
  },
  maintenanceTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A1A", marginTop: 16, marginBottom: 10 },
  maintenanceMessage: { fontSize: 14, color: "#666666", textAlign: "center", lineHeight: 22, marginBottom: 28 },
  maintenanceBackBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  maintenanceBackBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

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
