import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { BillSummary } from "../../types/payment";
import { selectStudentBillDetailsByStudentId } from "../../state-store/slices/payment/paymentSlice";
import BillDetailItem from "./BillDetailItem";
import { theme } from "../../styles/theme";

interface StudentPaymentListItemProps {
  summary: BillSummary;
  studentInfo: {
    name: string;
    admissionNumber: string;
  };
}

const StudentPaymentListItem: React.FC<StudentPaymentListItemProps> = ({
  summary,
  studentInfo,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Get detailed bill information for this student
  const billDetails = useSelector((state) =>
    selectStudentBillDetailsByStudentId(state, summary.studentId),
  );

  const formatAmount = (amount: number) => {
    return `LKR ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      // Reset category expansions when collapsing student card
      setExpandedCategories(new Set());
    }
  };

  const toggleCategoryExpanded = (categoryId: string) => {
    const newExpandedCategories = new Set(expandedCategories);
    if (newExpandedCategories.has(categoryId)) {
      newExpandedCategories.delete(categoryId);
    } else {
      newExpandedCategories.add(categoryId);
    }
    setExpandedCategories(newExpandedCategories);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.headerSection}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.studentInfo}>
          <View style={styles.avatar}>
            <MaterialIcons name="receipt" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.nameSection}>
            <Text style={styles.studentName}>{studentInfo.name}</Text>
            <Text style={styles.admissionNumber}>
              {studentInfo.admissionNumber}
            </Text>
          </View>
        </View>

        <View style={styles.paymentInfo}>
          <Text style={styles.totalAmount}>
            {summary.billsCount} bills paid
          </Text>
          {/* <Text style={styles.billCount}>{summary.billsCount} bills paid</Text> */}
        </View>

        <View style={styles.expandIcon}>
          <MaterialIcons
            name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={24}
            color="#666666"
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.statusRow}>
            <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.statusText}>All Bills</Text>
          </View>

          <View style={styles.billCategoriesContainer}>
            <Text style={styles.categoriesTitle}>Bill Categories</Text>
            {billDetails && billDetails.length > 0 ? (
              billDetails.map((category, index) => (
                <View key={category.id} style={styles.categoryContainer}>
                  <TouchableOpacity
                    style={styles.categoryRow}
                    onPress={() => toggleCategoryExpanded(category.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryInfo}>
                      <MaterialIcons
                        name={category.icon}
                        size={20}
                        color="#666666"
                      />
                      <View style={styles.categoryDetails}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <Text style={styles.categoryCount}>
                          {category.count} bill{category.count !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.categoryRightSection}>
                      {/* <Text style={styles.categoryAmount}>
                        {formatAmount(category.amount)}
                      </Text> */}
                      <MaterialIcons
                        name={
                          expandedCategories.has(category.id)
                            ? "keyboard-arrow-up"
                            : "keyboard-arrow-down"
                        }
                        size={20}
                        color="#666666"
                      />
                    </View>
                  </TouchableOpacity>

                  {expandedCategories.has(category.id) && (
                    <View style={styles.billDetailsContainer}>
                      {category.items.map((bill: any, billIndex: number) => {
                        // Generate unique key based on bill type and available ID
                        const getBillKey = () => {
                          switch (category.id) {
                            case "term_fee":
                            case "exam_bills":
                            case "sport_fee":
                              return `${category.id}-${bill.invoice_header?.id || billIndex}`;
                            default:
                              return `${category.id}-${bill.id || billIndex}`;
                          }
                        };

                        return (
                          <BillDetailItem
                            key={getBillKey()}
                            bill={bill}
                            billType={category.id}
                          />
                        );
                      })}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noBillsText}>No bill details available</Text>
            )}
          </View>
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
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F5F5F5",
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
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  nameSection: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  admissionNumber: {
    fontSize: 13,
    color: "#666666",
    fontWeight: "400",
  },
  paymentInfo: {
    alignItems: "flex-end",
    marginRight: 8,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 2,
  },
  billCount: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "500",
  },
  expandIcon: {
    padding: 4,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
    marginLeft: 6,
  },
  billCategoriesContainer: {
    marginTop: 8,
  },
  categoriesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  categoryContainer: {
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryDetails: {
    marginLeft: 10,
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "500",
  },
  categoryRightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E7D32",
    marginRight: 8,
  },
  billDetailsContainer: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#E8F5E8",
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    padding: 8,
  },
  noBillsText: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    paddingVertical: 16,
    fontStyle: "italic",
  },
});

export default StudentPaymentListItem;
