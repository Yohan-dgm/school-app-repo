import type { PaymentReceiptData } from "../api/payment-gateway-api";
import { theme } from "../styles/theme";

const MAROON = theme.colors.primary; // "#920734" — app's own deep maroon
const DARK_BLUE = "#0B2447"; // deep navy, pairs with maroon for the receipt header

const formatAmount = (val: number, currency: string) =>
  `${currency} ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateTime = (iso: string | null) => {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
};

/**
 * Builds a self-contained HTML receipt for expo-print's printToFileAsync().
 * Includes a single small, unobtrusive "NEXIS COLLEGE" watermark behind the
 * content — not a repeating tile, just a light diagonal mark.
 *
 * @param logoDataUri base64 data URI for the school logo (see receiptLogo.ts).
 *   Optional — the header still renders correctly without it.
 */
export function generateReceiptHtml(
  data: PaymentReceiptData,
  logoDataUri?: string | null,
): string {
  const {
    receipt_number,
    school_name,
    student_name,
    invoice_type,
    invoice_id,
    amount,
    service_fee_amount,
    total_charged_amount,
    currency,
    payment_date,
    order_reference,
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      position: relative;
    }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 40px;
      font-weight: 700;
      color: ${MAROON};
      opacity: 0.06;
      white-space: nowrap;
      z-index: 0;
    }
    .content { position: relative; z-index: 1; padding: 0 40px 40px; }
    .header {
      background: #ffffff ;
      color: ${MAROON};
      text-align: center;
      padding: 32px 40px 24px;
      margin: 0 -40px 28px;
      border-bottom: 4px solid ${DARK_BLUE};
    }
    .logo { height: 56px; margin-bottom: 10px; }
    .school-name { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .receipt-title { font-size: 13px; color: rgba(11,36,71,0.7); margin-top: 4px; letter-spacing: 1.5px; text-transform: uppercase; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    td { padding: 10px 4px; border-bottom: 1px solid #eee; font-size: 14px; }
    td.label { color: #666; width: 55%; }
    td.value { text-align: right; font-weight: 600; }
    .total-row td { border-top: 2px solid ${DARK_BLUE}; border-bottom: none; font-size: 16px; font-weight: 700; color: ${MAROON}; padding-top: 14px; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; }
  </style>
</head>
<body>
  <div class="watermark">${school_name.toUpperCase()}</div>
  <div class="header">
    ${logoDataUri ? `<img class="logo" src="${logoDataUri}" />` : ""}
    <div class="school-name">${school_name}</div>
    <div class="receipt-title">Payment Receipt</div>
  </div>
  <div class="content">
    <div class="meta-row">
      <span>Receipt No: ${receipt_number}</span>
      <span>Date: ${formatDateTime(payment_date)}</span>
    </div>

    <table>
      <tr><td class="label">Student</td><td class="value">${student_name}</td></tr>
      <tr><td class="label">Invoice Type</td><td class="value">${invoice_type}</td></tr>
      <tr><td class="label">Invoice Reference</td><td class="value">#${invoice_id}</td></tr>
      <tr><td class="label">Payment Reference</td><td class="value">${order_reference.split("-")[0].toUpperCase()}</td></tr>
      <tr><td class="label">Amount</td><td class="value">${formatAmount(amount, currency)}</td></tr>
      <tr><td class="label">Online Service Charge</td><td class="value">${formatAmount(service_fee_amount, currency)}</td></tr>
      <tr class="total-row"><td>Total Paid</td><td class="value">${formatAmount(total_charged_amount, currency)}</td></tr>
    </table>

    <div class="footer">This is a computer-generated receipt for an online payment made via HNB CyberSource.</div>
  </div>
</body>
</html>
  `.trim();
}
