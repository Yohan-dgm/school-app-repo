import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";
import {
  PendingInvoiceStudentData,
  PendingInvoice,
  PendingInvoiceStudent,
} from "../../api/pending-invoice-api";

// Color map for different invoice types
const INVOICE_TYPE_COLORS: { [key: string]: { bg: string; text: string; icon: string } } = {
  "Term Fee": { bg: "#E3F2FD", text: "#1565C0", icon: "event" },
  "Admission Fee": { bg: "#F3E5F5", text: "#7B1FA2", icon: "school" },
  "Exam Bill": { bg: "#FFF3E0", text: "#E65100", icon: "assignment" },
  "Sport Fee": { bg: "#E8F5E9", text: "#2E7D32", icon: "sports-soccer" },
  "Material Bill": { bg: "#FBE9E7", text: "#BF360C", icon: "library-books" },
};

const getInvoiceTypeStyle = (invoiceType: string) => {
  return (
    INVOICE_TYPE_COLORS[invoiceType] || {
      bg: "#F5F5F5",
      text: "#616161",
      icon: "receipt",
    }
  );
};

interface PendingInvoiceCardProps {
  studentData: PendingInvoiceStudentData;
  onPayInvoice: (invoice: PendingInvoice, student: PendingInvoiceStudent) => void;
}

const PendingInvoiceCard: React.FC<PendingInvoiceCardProps> = ({
  studentData,
  onPayInvoice,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatAmount = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `LKR ${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      {/* Student Header */}
      <TouchableOpacity
        style={styles.headerSection}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.studentInfo}>
          <View style={styles.avatar}>
            <MaterialIcons name="warning" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.nameSection}>
            <Text style={styles.studentName} numberOfLines={1}>
              {studentData.student.full_name_with_title}
            </Text>
            <View style={styles.studentMeta}>
              <Text style={styles.admissionNumber}>
                {studentData.student.admission_number}
              </Text>
              {studentData.student.grade_level_class && (
                <>
                  <Text style={styles.metaDivider}>•</Text>
                  <Text style={styles.gradeClass}>
                    {studentData.student.grade_level_class}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.summaryRight}>
          <Text style={styles.pendingAmount}>
            {formatAmount(studentData.total_pending_amount)}
          </Text>
          <View style={styles.pendingCountBadge}>
            <Text style={styles.pendingCountText}>
              {studentData.pending_invoice_count} pending
            </Text>
          </View>
        </View>

        <View style={styles.expandIcon}>
          <MaterialIcons
            name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={24}
            color="#666666"
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Invoice List */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {studentData.pending_invoices.map(
            (invoice: PendingInvoice, index: number) => {
              const typeStyle = getInvoiceTypeStyle(invoice.invoice_type);
              const invoiceId =
                invoice.term_fee_invoice_id || invoice.invoice_id || index;

              return (
                <View
                  key={`${invoice.invoice_type}-${invoiceId}`}
                  style={[
                    styles.invoiceRow,
                    index === studentData.pending_invoices.length - 1 &&
                      styles.invoiceRowLast,
                  ]}
                >
                  {/* Invoice Type Badge */}
                  <View style={styles.invoiceHeader}>
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: typeStyle.bg },
                      ]}
                    >
                      <MaterialIcons
                        name={typeStyle.icon as any}
                        size={14}
                        color={typeStyle.text}
                      />
                      <Text
                        style={[styles.typeBadgeText, { color: typeStyle.text }]}
                      >
                        {invoice.invoice_type}
                      </Text>
                    </View>
                    {invoice.term_name && (
                      <Text style={styles.termName}>{invoice.term_name}</Text>
                    )}
                  </View>

                  {/* Serial Number & Date */}
                  <View style={styles.invoiceMetaRow}>
                    <Text style={styles.serialNumber} numberOfLines={1}>
                      {invoice.serial_number}
                    </Text>
                    <Text style={styles.invoiceDate}>
                      {formatDate(invoice.date)}
                    </Text>
                  </View>

                  {/* Amount Details */}
                  <View style={styles.amountGrid}>
                    <View style={styles.amountItem}>
                      <Text style={styles.amountLabel}>Bill Total</Text>
                      <Text style={styles.amountValue}>
                        {formatAmount(invoice.bill_total)}
                      </Text>
                    </View>
                    <View style={styles.amountItem}>
                      <Text style={styles.amountLabel}>Paid</Text>
                      <Text style={[styles.amountValue, styles.paidAmount]}>
                        {formatAmount(invoice.paid_amount)}
                      </Text>
                    </View>
                    <View style={styles.amountItem}>
                      <Text style={styles.amountLabel}>Balance</Text>
                      <Text style={[styles.amountValue, styles.balanceAmount]}>
                        {formatAmount(invoice.balance_amount)}
                      </Text>
                    </View>
                  </View>

                  {/* Pay Now Button */}
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => onPayInvoice(invoice, studentData.student)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="payment" size={18} color="#FFFFFF" />
                    <Text style={styles.payButtonText}>Pay Now</Text>
                  </TouchableOpacity>
                </View>
              );
            },
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#FFF3E0",
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FF9800",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  nameSection: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 3,
  },
  studentMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  admissionNumber: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "400",
  },
  metaDivider: {
    fontSize: 12,
    color: "#CCCCCC",
    marginHorizontal: 6,
  },
  gradeClass: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "400",
  },
  summaryRight: {
    alignItems: "flex-end",
    marginRight: 4,
  },
  pendingAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E65100",
    marginBottom: 4,
  },
  pendingCountBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#E65100",
  },
  expandIcon: {
    padding: 4,
    marginLeft: 4,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: "#FFF3E0",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  invoiceRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  invoiceRowLast: {
    borderBottomWidth: 0,
  },
  invoiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
  },
  termName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666666",
    fontStyle: "italic",
  },
  invoiceMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  serialNumber: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333333",
    flex: 1,
    marginRight: 8,
  },
  invoiceDate: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "400",
  },
  amountGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  amountItem: {
    alignItems: "center",
    flex: 1,
  },
  amountLabel: {
    fontSize: 11,
    color: "#999999",
    fontWeight: "500",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333333",
  },
  paidAmount: {
    color: "#4CAF50",
  },
  balanceAmount: {
    color: "#E65100",
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2E7D32",
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
    gap: 8,
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});

export default PendingInvoiceCard;
