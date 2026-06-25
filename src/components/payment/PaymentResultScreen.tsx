import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";

interface PaymentResultScreenProps {
  type: "success" | "failed";
  // Success data
  amount?: number;
  currency?: string;
  invoiceType?: string;
  orderReference?: string;
  receiptVoucherId?: number | null;
  message?: string;
  // Failed data
  errorCode?: string;
  // Actions
  onDone: () => void;         // success → back to payment center
  onRetry?: () => void;       // failed → try again
  onCancel?: () => void;      // failed → back to payment center
}

const ERROR_DESCRIPTIONS: Record<string, string> = {
  PAYMENT_FAILED:
    "Your payment was declined. Please check your card details or try a different card.",
  MOUNT_PAYMENT_UNAVAILABLE:
    "The payment form could not load. Please check your connection and try again.",
  NETWORK_ERROR:
    "Your connection dropped during payment. No charges were made. Please try again.",
  CAPTURE_CONTEXT_EXPIRED:
    "Your payment session expired. No charges were made. Please start a new payment.",
  default:
    "Something went wrong with your payment. No charges were made. Please try again.",
};

const PaymentResultScreen: React.FC<PaymentResultScreenProps> = ({
  type,
  amount,
  currency = "LKR",
  invoiceType,
  orderReference,
  receiptVoucherId,
  message,
  errorCode,
  onDone,
  onRetry,
  onCancel,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Icon pop-in + content fade-in
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatAmount = (val: number) =>
    `${currency} ${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const errorDescription =
    errorCode
      ? ERROR_DESCRIPTIONS[errorCode] || ERROR_DESCRIPTIONS.default
      : ERROR_DESCRIPTIONS.default;

  // ── Success ───────────────────────────────────────────────────────────
  if (type === "success") {
    return (
      <View style={styles.container}>
        <View style={styles.successBg} />

        <Animated.View style={[styles.iconCircle, styles.successCircle, { transform: [{ scale: scaleAnim }] }]}>
          <MaterialIcons name="check" size={52} color="#FFFFFF" />
        </Animated.View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Payment Received!</Text>
          <Text style={styles.subtitle}>
            Your payment has been recorded and will be reviewed by the finance team.
          </Text>

          {/* Amount card */}
          {amount !== undefined && (
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Amount Paid</Text>
                <Text style={[styles.resultValue, styles.greenText]}>{formatAmount(amount)}</Text>
              </View>
              {invoiceType && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Invoice Type</Text>
                  <Text style={styles.resultValue}>{invoiceType}</Text>
                </View>
              )}
              {receiptVoucherId && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Receipt No.</Text>
                  <Text style={styles.resultValue}>RV-{receiptVoucherId}</Text>
                </View>
              )}
              {orderReference && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Reference</Text>
                  <Text style={[styles.resultValue, styles.refText]} numberOfLines={1}>
                    {orderReference.split("-")[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {message && (
            <View style={styles.infoNotice}>
              <MaterialIcons name="info-outline" size={16} color="#1565C0" />
              <Text style={styles.infoText}>{message}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Done</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ── Failed ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.failedBg} />

      <Animated.View style={[styles.iconCircle, styles.failedCircle, { transform: [{ scale: scaleAnim }] }]}>
        <MaterialIcons name="close" size={52} color="#FFFFFF" />
      </Animated.View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.subtitle}>{errorDescription}</Text>

        <View style={styles.noChargeNotice}>
          <MaterialIcons name="shield" size={16} color="#2E7D32" />
          <Text style={styles.noChargeText}>Your account has not been charged.</Text>
        </View>

        <View style={styles.failedButtons}>
          {onRetry && (
            <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85}>
              <MaterialIcons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel || onDone}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelBtnText}>Back to Payment Center</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },

  successBg: {
    position: "absolute", top: 0, left: 0, right: 0, height: "45%",
    backgroundColor: "#E8F5E9",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  failedBg: {
    position: "absolute", top: 0, left: 0, right: 0, height: "45%",
    backgroundColor: "#FBE9E7",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },

  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: "center", justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  successCircle: { backgroundColor: "#2E7D32" },
  failedCircle:  { backgroundColor: "#C62828" },

  content: { width: "100%", paddingHorizontal: 24, alignItems: "center" },
  title: { fontSize: 26, fontWeight: "800", color: "#1A1A1A", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 15, color: "#666666", textAlign: "center", lineHeight: 23, marginBottom: 24 },

  resultCard: {
    width: "100%", backgroundColor: "#FAFAFA",
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#F0F0F0",
    marginBottom: 16,
  },
  resultRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: "#F5F5F5",
  },
  resultLabel: { fontSize: 14, color: "#888888" },
  resultValue: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", maxWidth: "55%", textAlign: "right" },
  greenText: { color: "#2E7D32", fontSize: 16 },
  refText: { fontSize: 12, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", color: "#555" },

  infoNotice: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#E3F2FD", borderRadius: 10,
    padding: 14, gap: 10, marginBottom: 24, width: "100%",
  },
  infoText: { flex: 1, fontSize: 13, color: "#1565C0", lineHeight: 19 },

  noChargeNotice: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F1F8E9", borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 16,
    gap: 8, marginBottom: 28, width: "100%",
  },
  noChargeText: { fontSize: 14, color: "#2E7D32", fontWeight: "600" },

  doneBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#2E7D32", borderRadius: 12,
    paddingVertical: 16, gap: 10, width: "100%",
  },
  doneBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },

  failedButtons: { width: "100%", gap: 12 },
  retryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: theme.colors.primary, borderRadius: 12,
    paddingVertical: 16, gap: 10,
  },
  retryBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  cancelBtn: {
    alignItems: "center", paddingVertical: 16,
    borderRadius: 12, borderWidth: 1.5, borderColor: "#E0E0E0",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#666666" },
});

export default PaymentResultScreen;
