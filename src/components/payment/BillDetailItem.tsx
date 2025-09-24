import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface BillDetailItemProps {
  bill: any;
  billType: string;
}

const BillDetailItem: React.FC<BillDetailItemProps> = ({ bill, billType }) => {
  const formatAmount = (amount: string | number) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return `LKR ${numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getBillTitle = () => {
    switch (billType) {
      case "admission_fee":
        return `Admission Fee Invoice #${bill.id}`;
      case "term_fee":
        return `Term Fee Invoice  `;
      case "exam_bills":
        return `Exam Bill  `;
      case "sport_fee":
        return `Sport Fee Invoice  `;
      case "refundable_deposits":
        return `Refundable Deposit #${bill.id}`;
      case "general_bills":
        return `General Bill #${bill.id}`;
      case "material_bills":
        return `Material Bill #${bill.id}`;
      default:
        return `Bill #${bill.id}`;
    }
  };

  const getSerialNumber = () => {
    switch (billType) {
      case "term_fee":
        return bill.invoice_header?.serial_number;
      case "exam_bills":
        return bill.invoice_header?.serial_number;
      case "sport_fee":
        return bill.invoice_header?.serial_number;
      default:
        return null;
    }
  };

  const getBillDate = () => {
    switch (billType) {
      case "admission_fee":
        return bill.admission_fee_invoice_date;
      case "term_fee":
        return bill.invoice_header?.date;
      case "exam_bills":
        return bill.invoice_header?.date;
      case "sport_fee":
        return bill.invoice_header?.date;
      case "refundable_deposits":
        return bill.refundable_deposit_date;
      case "general_bills":
        return bill.general_bill_date;
      case "material_bills":
        return bill.material_bill_date;
      default:
        return bill.created_at;
    }
  };

  const getNetAmount = () => {
    switch (billType) {
      case "admission_fee":
        return bill.admission_fee_invoice_net_amount;
      case "term_fee":
        return bill.invoice_header?.amount_breakdown?.bill_total || "0";
      case "exam_bills":
        return bill.invoice_header?.amount_breakdown?.total || "0";
      case "sport_fee":
        return bill.invoice_header?.amount_breakdown?.bill_total || "0";
      case "refundable_deposits":
        return bill.refundable_deposit_net_amount;
      case "general_bills":
        return bill.general_bill_net_amount;
      case "material_bills":
        return bill.material_bill_net_amount;
      default:
        return bill.amount || bill.net_amount || "0";
    }
  };

  const getGrossAmount = () => {
    switch (billType) {
      case "admission_fee":
        return bill.admission_fee_invoice_amount;
      case "term_fee":
        return (
          bill.invoice_header?.amount_breakdown?.items_total || getNetAmount()
        );
      case "exam_bills":
        return (
          bill.invoice_header?.amount_breakdown?.exam_subjects_total ||
          getNetAmount()
        );
      case "sport_fee":
        return (
          bill.invoice_header?.amount_breakdown?.items_total || getNetAmount()
        );
      case "refundable_deposits":
        return bill.refundable_deposit_amount;
      case "general_bills":
        return bill.general_bill_amount;
      case "material_bills":
        return bill.material_bill_amount;
      default:
        return getNetAmount();
    }
  };

  const getDiscount = () => {
    switch (billType) {
      case "admission_fee":
        return bill.admission_fee_invoice_discount;
      case "term_fee":
        return bill.invoice_header?.amount_breakdown?.discount_total || "0";
      case "exam_bills":
        return bill.invoice_header?.amount_breakdown?.discount || "0";
      case "sport_fee":
        return bill.invoice_header?.amount_breakdown?.discount_total || "0";
      case "refundable_deposits":
        return bill.refundable_deposit_discount;
      case "general_bills":
        return bill.general_bill_discount;
      case "material_bills":
        return bill.material_bill_discount;
      default:
        return "0";
    }
  };

  const getTax = () => {
    switch (billType) {
      case "admission_fee":
        return bill.admission_fee_invoice_tax;
      case "term_fee":
        return bill.invoice_header?.tax || "0";
      case "exam_bills":
        return bill.invoice_header?.tax || "0";
      case "sport_fee":
        return bill.invoice_header?.tax || "0";
      case "refundable_deposits":
        return bill.refundable_deposit_tax;
      case "general_bills":
        return bill.general_bill_tax;
      case "material_bills":
        return bill.material_bill_tax;
      default:
        return "0";
    }
  };

  const netAmount = getNetAmount();
  const grossAmount = getGrossAmount();
  const discount = getDiscount();
  const tax = getTax();
  const billDate = getBillDate();

  // Get additional details for different bill types
  const getAdditionalDetails = () => {
    switch (billType) {
      case "term_fee":
        return {
          termInfo: bill.invoice_header?.term_info,
          lineItems: bill.line_items,
          status: bill.invoice_header?.status,
        };
      case "exam_bills":
        return {
          lineItems: bill.line_items,
          billParty: bill.invoice_header?.bill_party,
        };
      case "sport_fee":
        return {
          termInfo: bill.invoice_header?.term_info,
          lineItems: bill.line_items,
          status: bill.invoice_header?.status,
        };
      default:
        return null;
    }
  };

  const additionalDetails = getAdditionalDetails();
  const serialNumber = getSerialNumber();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <MaterialIcons name="receipt" size={16} color="#666666" />
          <Text style={styles.billTitle}>{getBillTitle()}</Text>
        </View>
        {/* <View style={styles.statusBadge}>
          <MaterialIcons name="check-circle" size={12} color="#4CAF50" />
          <Text style={styles.statusText}>PAID</Text>
        </View> */}
      </View>

      {/* Serial Number Display */}
      {serialNumber && (
        <View style={styles.serialNumberRow}>
          <MaterialIcons name="tag" size={14} color="#888888" />
          <Text style={styles.serialNumberText}>Serial: {serialNumber}</Text>
        </View>
      )}

      {/* Additional Details for Term Fees and Sport Fees */}
      {additionalDetails?.termInfo && (
        <View style={styles.termInfoSection}>
          <Text style={styles.termName}>{additionalDetails.termInfo.name}</Text>
          <Text style={styles.termPeriod}>
            {additionalDetails.termInfo.period}
          </Text>
        </View>
      )}

      {/* Exam Subjects for Exam Bills */}
      {billType === "exam_bills" && additionalDetails?.lineItems && (
        <View style={styles.subjectsSection}>
          {additionalDetails.lineItems.map((item: any, index: number) => (
            <View key={index} style={styles.subjectCategory}>
              <Text style={styles.categoryTitle}>
                {item.subject_category?.name}
              </Text>
              <View style={styles.subjectsList}>
                {item.subjects?.map((subject: any, subIndex: number) => (
                  <Text key={subIndex} style={styles.subjectName}>
                    • {subject.name}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Sport Fee Details */}
      {billType === "sport_fee" && additionalDetails?.lineItems && (
        <View style={styles.lineItemsSection}>
          {additionalDetails.lineItems.map((item: any, index: number) => (
            <View key={index} style={styles.lineItem}>
              <Text style={styles.lineItemDescription}>{item.description}</Text>
              {item.quantity && item.unit_price && (
                <Text style={styles.lineItemDetails}>
                  {item.quantity} units ×{" "}
                  {formatAmount(parseFloat(item.unit_price))}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.dateRow}>
        <MaterialIcons name="event" size={14} color="#888888" />
        <Text style={styles.dateText}>
          {billDate ? formatDate(billDate) : "Date not available"}
        </Text>
      </View>

      <View style={styles.amountSection}>
        <View style={styles.netAmountRow}>
          <Text style={styles.netAmountLabel}>Invoice Total</Text>
          <Text style={styles.netAmount}>{formatAmount(netAmount)}</Text>
        </View>

        {parseFloat(grossAmount || "0") !== parseFloat(netAmount || "0") && (
          <View style={styles.breakdownSection}>
            {/* <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Gross Amount</Text>
              <Text style={styles.breakdownValue}>
                {formatAmount(grossAmount)}
              </Text>
            </View> */}
            {parseFloat(discount || "0") > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Discount</Text>
                <Text style={[styles.breakdownValue, styles.discountValue]}>
                  -{formatAmount(discount)}
                </Text>
              </View>
            )}
            {parseFloat(tax || "0") > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Tax</Text>
                <Text style={styles.breakdownValue}>+{formatAmount(tax)}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FAFAFA",
    // borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: "white",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  titleSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  billTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    marginLeft: 6,
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#4CAF50",
    marginLeft: 3,
  },
  serialNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: -2,
  },
  serialNumberText: {
    fontSize: 11,
    color: "#666666",
    marginLeft: 8,
    fontWeight: "500",
    fontFamily: "monospace",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: "#666666",
    marginLeft: 6,
    fontWeight: "500",
  },
  amountSection: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 8,
  },
  netAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  netAmountLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  netAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E7D32",
  },
  breakdownSection: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  breakdownLabel: {
    fontSize: 11,
    color: "#888888",
    fontWeight: "500",
  },
  breakdownValue: {
    fontSize: 11,
    color: "#666666",
    fontWeight: "500",
  },
  discountValue: {
    color: "#FF6B6B",
  },
  termInfoSection: {
    backgroundColor: "#F8F9FA",
    padding: 8,
    // borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },
  termName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  termPeriod: {
    fontSize: 11,
    color: "#666666",
    fontWeight: "500",
  },
  subjectsSection: {
    backgroundColor: "#F8F9FA",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#2196F3",
  },
  subjectCategory: {
    marginBottom: 6,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subjectsList: {
    paddingLeft: 8,
  },
  subjectName: {
    fontSize: 11,
    color: "#666666",
    marginBottom: 2,
    fontWeight: "500",
  },
  lineItemsSection: {
    backgroundColor: "#F8F9FA",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#FF9800",
  },
  lineItem: {
    marginBottom: 6,
  },
  lineItemDescription: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  lineItemDetails: {
    fontSize: 11,
    color: "#666666",
    fontWeight: "500",
  },
});

export default BillDetailItem;
