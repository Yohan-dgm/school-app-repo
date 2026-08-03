import { useState, useCallback } from "react";
import { Alert } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useLazyGetPaymentReceiptQuery } from "../api/payment-gateway-api";
import { generateReceiptHtml } from "../utils/receiptHtml";
import { getReceiptLogoDataUri } from "../utils/receiptLogo";

/**
 * Downloads/shares a PDF receipt for a completed payment.
 *
 * The backend (GetPaymentReceiptDataIntent) is the actual gate — it only
 * returns data for an order that belongs to the requesting user AND has
 * status = 'completed'. This hook has no client-side "is it completed" logic
 * of its own; if the order isn't really complete, the query fails and we
 * surface that instead of generating anything.
 */
export function useDownloadPaymentReceipt() {
  const [triggerGetReceipt] = useLazyGetPaymentReceiptQuery();
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadReceipt = useCallback(async (orderReference: string) => {
    if (!orderReference || isDownloading) return;
    setIsDownloading(true);
    try {
      const result = await triggerGetReceipt({ order_reference: orderReference }).unwrap();
      const receiptData = result?.data;
      if (!receiptData) {
        throw new Error("Invalid receipt response");
      }

      const logoDataUri = await getReceiptLogoDataUri();
      const html = generateReceiptHtml(receiptData, logoDataUri);
      const { uri } = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Payment Receipt",
        });
      } else {
        Alert.alert("Receipt Ready", "Your receipt was generated but sharing isn't available on this device.");
      }
    } catch (err: any) {
      console.error("❌ Receipt download failed:", err);
      const message =
        err?.data?.error === "RECEIPT_NOT_AVAILABLE"
          ? "This receipt isn't available. It may not have completed successfully."
          : "Unable to generate the receipt right now. Please try again.";
      Alert.alert("Receipt Unavailable", message);
    } finally {
      setIsDownloading(false);
    }
  }, [triggerGetReceipt, isDownloading]);

  return { downloadReceipt, isDownloading };
}
