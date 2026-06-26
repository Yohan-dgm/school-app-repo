import React, { useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";
import {
  generateSecureCheckoutHtml,
  is3DSAllowedUrl,
} from "../../utils/paymentSecurity";

interface SecureWebViewCheckoutProps {
  captureContext: string;
  clientLibraryUrl: string;
  clientLibraryIntegrity: string;
  orderReference: string;
  amount: number;
  currency: string;
  onPaymentSuccess: (transientToken: string) => void;
  onPaymentFailed: (errorCode: string, message?: string) => void;
  onPaymentCancelled: () => void;
  onClose: () => void;
  onRefetchSession: () => void;
}

type WebViewState = "loading" | "ready" | "processing" | "error_mount" | "error_network";

const ERROR_LABELS: Record<string, string> = {
  MOUNT_PAYMENT_UNAVAILABLE: "The payment form could not be loaded. Please try again.",
  NETWORK_ERROR: "Connection lost during payment. Your account was not charged.",
  PAYMENT_FAILED: "Payment was declined. Please try a different card.",
  default: "An unexpected error occurred. Please try again.",
};

const SecureWebViewCheckout: React.FC<SecureWebViewCheckoutProps> = ({
  captureContext,
  clientLibraryUrl,
  clientLibraryIntegrity,
  orderReference,
  amount,
  currency,
  onPaymentSuccess,
  onPaymentFailed,
  onPaymentCancelled,
  onClose,
  onRefetchSession,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [webViewState, setWebViewState] = useState<WebViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [is3DSActive, setIs3DSActive] = useState(false);

  // Generate a random message token per session — used to authenticate postMessage from WebView
  const messageToken = useMemo(
    () => Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join(""),
    [],
  );

  // Generate HTML once — memoised implicitly by closure
  const injectedHtml = generateSecureCheckoutHtml(
    captureContext,
    clientLibraryUrl,
    clientLibraryIntegrity,
    messageToken,
  );

  const formatAmount = (val: number) =>
    `${currency} ${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // ── Message bridge ────────────────────────────────────────────────────
  const handleMessage = useCallback(
    (event: any) => {
      let payload: any;
      try {
        payload = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      console.log("🔐 SecureWebViewCheckout —", payload.type);

      // Verify message token — drop unverified messages
      if (payload._token !== messageToken) {
        console.warn("🚫 SecureWebViewCheckout — invalid message token, dropping");
        return;
      }

      switch (payload.type) {
        case "SDK_MOUNTED":
          setWebViewState("ready");
          break;

        case "PAYMENT_SUCCESS":
          setWebViewState("processing");
          onPaymentSuccess(payload.transientToken);
          break;

        case "PAYMENT_FAILED":
          setIs3DSActive(false);
          onPaymentFailed(payload.code || "PAYMENT_FAILED", payload.message);
          break;

        case "PAYMENT_CANCELLED":
          setIs3DSActive(false);
          onPaymentCancelled();
          break;

        case "CAPTURE_CONTEXT_EXPIRED":
          Alert.alert(
            "Session Refreshed",
            "Your payment session was refreshed for security. Please complete your payment.",
            [{ text: "OK", onPress: onRefetchSession }],
          );
          break;

        case "MOUNT_PAYMENT_UNAVAILABLE":
          console.error("❌ SDK Mount Failed:", payload.message);
          setErrorMessage(payload.message || ERROR_LABELS.MOUNT_PAYMENT_UNAVAILABLE);
          setWebViewState("error_mount");
          break;

        case "NETWORK_ERROR":
          setErrorMessage(ERROR_LABELS.NETWORK_ERROR);
          setWebViewState("error_network");
          break;

        default:
          break;
      }
    },
    [onPaymentSuccess, onPaymentFailed, onPaymentCancelled, onRefetchSession],
  );

  // ── Navigation whitelist (3DS + CyberSource only) ─────────────────────
  const handleShouldStartLoadWithRequest = useCallback((request: any) => {
    const url: string = request.url || "";

    // Allow initial blank / data URIs
    if (url === "about:blank" || url.startsWith("data:")) return true;

    if (is3DSAllowedUrl(url)) {
      // Mark 3DS flow active if external bank redirect
      if (!url.includes("cybersource.com") && url.startsWith("https://")) {
        setIs3DSActive(true);
      }
      return true;
    }

    console.warn("🚫 SecureWebViewCheckout — blocked:", url);
    return false;
  }, []);

  const handleRetry = () => {
    setWebViewState("loading");
    setErrorMessage("");
    setIs3DSActive(false);
    webViewRef.current?.reload();
  };

  // ── Error state ───────────────────────────────────────────────────────
  if (webViewState === "error_mount" || webViewState === "error_network") {
    return (
      <View style={styles.fullScreen}>
        <View style={styles.errorContainer}>
          <MaterialIcons
            name={webViewState === "error_network" ? "wifi-off" : "error-outline"}
            size={52}
            color="#E65100"
          />
          <Text style={styles.errorTitle}>
            {webViewState === "error_network" ? "Connection Lost" : "Failed to Load"}
          </Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <View style={styles.errorButtons}>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.85}>
              <MaterialIcons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── Processing overlay (waiting for /payment/complete) ────────────────
  if (webViewState === "processing") {
    return (
      <View style={styles.fullScreen}>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.processingText}>Processing your payment...</Text>
          <Text style={styles.processingSubText}>Please do not close this screen.</Text>
        </View>
      </View>
    );
  }

  // ── Main: Header + WebView ────────────────────────────────────────────
  return (
    <View style={styles.fullScreen}>
      {/* Secure header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
          <MaterialIcons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.secureRow}>
            <MaterialIcons name="lock" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.secureLabel}>Secure Payment</Text>
          </View>
          <Text style={styles.headerAmount}>{formatAmount(amount)}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* 3DS active banner */}
      {is3DSActive && (
        <View style={styles.threeDsBanner}>
          <MaterialIcons name="verified-user" size={16} color="#1565C0" />
          <Text style={styles.threeDsText}>
            3D Secure verification in progress — do not navigate away
          </Text>
        </View>
      )}

      {/* WebView — always rendered; loading spinner layered on top */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: injectedHtml, baseUrl: "https://secureacceptance.cybersource.com" }}
          // Security
          mixedContentMode="never"
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={false}
          mediaPlaybackRequiresUserAction={true}
          // Hardware layer enables FLAG_SECURE equivalent on Android
          androidLayerType="hardware"
          // Navigation whitelist — 3DS bank pages + CyberSource only
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          // Message bridge
          onMessage={handleMessage}
          onError={() => {
            setErrorMessage(ERROR_LABELS.MOUNT_PAYMENT_UNAVAILABLE);
            setWebViewState("error_mount");
          }}
          onHttpError={(event) => {
            // Only treat 5xx as fatal — 3DS redirects may return 3xx
            if (event.nativeEvent.statusCode >= 500) {
              setErrorMessage(ERROR_LABELS.MOUNT_PAYMENT_UNAVAILABLE);
              setWebViewState("error_mount");
            }
          }}
          style={styles.webView}
          applicationNameForUserAgent="UnifiedCheckout/1.0"
        />

        {/* Spinner overlay — shown until SDK_MOUNTED fires */}
        {webViewState === "loading" && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading secure payment form...</Text>
          </View>
        )}
      </View>

      {/* Footer badge */}
      <View style={styles.footer}>
        <MaterialIcons name="lock" size={12} color="#888" />
        <Text style={styles.footerText}>
          Secured by HNB · Powered by CyberSource · 3D Secure
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: "#FFFFFF" },

  // ── Header ────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerBtn: { width: 40, alignItems: "center", paddingVertical: 6 },
  headerSpacer: { width: 40 },
  headerCenter: { flex: 1, alignItems: "center" },
  secureRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  secureLabel: { fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: "500" },
  headerAmount: { fontSize: 22, fontWeight: "700", color: "#FFFFFF" },

  // ── 3DS Banner ────────────────────────────────────────────────────────
  threeDsBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#BBDEFB",
  },
  threeDsText: { flex: 1, fontSize: 12, color: "#1565C0", fontWeight: "500" },

  // ── WebView + loading overlay ─────────────────────────────────────────
  webViewContainer: { flex: 1 },
  webView: { flex: 1 },

  // Absolute overlay on top of WebView — removed when SDK_MOUNTED fires
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  loadingText: { fontSize: 15, color: "#666", marginTop: 14 },

  // ── Footer ────────────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#F9F9F9",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    gap: 5,
  },
  footerText: { fontSize: 11, color: "#999999" },

  // ── Error state ───────────────────────────────────────────────────────
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errorTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A1A", marginTop: 16, marginBottom: 10 },
  errorMessage: { fontSize: 14, color: "#666666", textAlign: "center", lineHeight: 22, marginBottom: 28 },
  errorButtons: { gap: 12, width: "100%" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  retryBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#666666" },

  // ── Processing state ──────────────────────────────────────────────────
  processingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  processingText: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginTop: 20 },
  processingSubText: { fontSize: 14, color: "#888888", marginTop: 8 },
});

export default SecureWebViewCheckout;
