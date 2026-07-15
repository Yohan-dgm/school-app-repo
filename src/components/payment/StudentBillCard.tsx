import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import InvoiceItemsList from "./InvoiceItemsList";

interface StudentBillCardProps {
  type: string;
  data: any;
  onPress?: () => void;
}

const StudentBillCard: React.FC<StudentBillCardProps> = ({
  type,
  data,
  onPress,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const formatAmount = (amount: string) => {
    const numAmount = parseFloat(amount);
    return `LKR ${numAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getBillTypeInfo = () => {
    switch (type) {
      case "admission_fee":
        return {
          title: "Admission Fee",
          icon: "school",
          color: "#4CAF50",
          amount: data.admission_fee_invoice_net_amount,
          date: data.admission_fee_invoice_date,
          items: data.admission_fee_invoice_item_list,
        };
      case "term_fee":
        return {
          title: "Term Fee",
          icon: "schedule",
          color: "#FF9800",
          amount: data.term_fee_invoice_net_amount,
          date: data.term_fee_invoice_date,
          items: data.term_fee_invoice_item_list,
        };
      case "exam_bills":
        return {
          title: "Exam Bill",
          icon: "assignment",
          color: "#9C27B0",
          amount: data.exam_bill_net_amount,
          date: data.exam_bill_date,
          items: data.exam_bill_item_list,
        };
      case "sport_fee":
        return {
          title: "Sports Fee",
          icon: "sports",
          color: "#E91E63",
          amount: data.sport_fee_invoice_net_amount,
          date: data.sport_fee_invoice_date,
          items: data.sport_fee_invoice_item_list,
        };
      case "refundable_deposits":
        return {
          title: "Refundable Deposit",
          icon: "account-balance",
          color: "#00BCD4",
          amount: data.refundable_deposit_net_amount,
          date: data.refundable_deposit_date,
          items: data.refundable_deposit_item_list,
        };
      case "general_bills":
        return {
          title: "General Bill",
          icon: "receipt-long",
          color: "#795548",
          amount: data.general_bill_net_amount,
          date: data.general_bill_date,
          items: data.general_bill_item_list,
        };
      case "material_bills":
        return {
          title: "Material Bill",
          icon: "inventory",
          color: "#607D8B",
          amount: data.material_bill_net_amount,
          date: data.material_bill_date,
          items: data.material_bill_item_list,
        };
      default:
        return {
          title: "Bill",
          icon: "receipt",
          color: "#666666",
          amount: "0.00",
          date: new Date().toISOString(),
          items: [],
        };
    }
  };

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;

    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();

    setIsExpanded(!isExpanded);
  };

  const billInfo = getBillTypeInfo();
  const hasItems = billInfo.items && billInfo.items.length > 0;
  const hasDiscount =
    data.admission_fee_invoice_discount ||
    data.term_fee_invoice_discount ||
    data.exam_bill_discount ||
    data.sport_fee_invoice_discount ||
    data.refundable_deposit_discount ||
    data.general_bill_discount ||
    data.material_bill_discount;

      const hasTax =
    data.admission_fee_invoice_tax ||
    data.term_fee_invoice_tax ||
    data.exam_bill_tax ||
    data.sport_fee_invoice_tax ||
    data.refundable_deposit_tax ||
    data.general_bill_tax ||
    data.material_bill_tax;

  const has税 =
    data.admission_fee_invoice_tax ||
    data.term_fee_invoice_tax ||
    data.exam_bill_tax ||
    data.sport_fee_invoice_tax ||
    data.refundable_deposit_tax ||
    data.general_bill_tax ||
    data.material_bill_tax;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View
          style={[styles.iconContainer, { backgroundColor: billInfo.color }]}
        >
          <MaterialIcons
            name={billInfo.icon as any}
            size={24}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.billInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{billInfo.title}</Text>
            <View style={styles.paidBadge}>
              <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.paidText}>PAID</Text>
            </View>
          </View>

          <Text style={styles.billId}>Bill #{data.id}</Text>
          <Text style={styles.date}>{formatDate(billInfo.date)}</Text>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.amount}>{formatAmount(billInfo.amount)}</Text>
          <MaterialIcons
            name={isExpanded ? "expand-less" : "expand-more"}
            size={24}
            color="#666666"
          />
        </View>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.expandedContent,
          {
            maxHeight: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 500],
            }),
            opacity: animation,
          },
        ]}
      >
        {isExpanded && (
          <View style={styles.detailsContainer}>
            {(hasDiscount || hasTax) && (
              <View style={styles.breakdownSection}>
                <Text style={styles.sectionTitle}>Amount Breakdown</Text>

                {data.admission_fee_invoice_amount && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Base Amount:</Text>
                    <Text style={styles.breakdownValue}>
                      {formatAmount(data.admission_fee_invoice_amount)}
                    </Text>
                  </View>
                )}

                {data.term_fee_invoice_amount && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Base Amount:</Text>
                    <Text style={styles.breakdownValue}>
                      {formatAmount(data.term_fee_invoice_amount)}
                    </Text>
                  </View>
                )}

                {hasDiscount && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Discount:</Text>
                    <Text style={[styles.breakdownValue, { color: "#4CAF50" }]}>
                      -{formatAmount(hasDiscount)}
                    </Text>
                  </View>
                )}

                {has税 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Tax:</Text>
                    <Text style={styles.breakdownValue}>
                      +{formatAmount(has税)}
                    </Text>
                  </View>
                )}

                <View style={[styles.breakdownRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Net Amount:</Text>
                  <Text style={styles.totalValue}>
                    {formatAmount(billInfo.amount)}
                  </Text>
                </View>
              </View>
            )}

            {hasItems && (
              <InvoiceItemsList
                items={billInfo.items}
                title={`${billInfo.title} Items`}
                emptyMessage="No detailed items available"
              />
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  billInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  paidText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4CAF50",
    marginLeft: 2,
  },
  billId: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: "#999999",
  },
  amountSection: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4CAF50",
    marginBottom: 4,
  },
  expandedContent: {
    overflow: "hidden",
  },
  detailsContainer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  breakdownSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#666666",
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A1A1A",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4CAF50",
  },
});

export default StudentBillCard;
