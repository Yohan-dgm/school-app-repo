import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BillSummary } from "../../types/payment";
import { theme } from "../../styles/theme";

interface OverallTotalSummaryProps {
  summary: BillSummary;
  studentCount: number;
}

const OverallTotalSummary: React.FC<OverallTotalSummaryProps> = ({
  summary,
  studentCount,
}) => {
  const formatAmount = (amount: number) => {
    return `LKR ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="account-balance-wallet" size={24} color="maroon" />
        <View style={styles.titleContent}>
          <Text style={styles.title}>Payment Summary</Text>
          <Text style={styles.subtitle}>
            {studentCount} student{studentCount !== 1 ? "s" : ""} • All payments
            complete
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  titleContent: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: "#666666",
    fontWeight: "400",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: "#888888",
    marginTop: 4,
    fontWeight: "500",
    textAlign: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  separator: {
    width: 1,
    height: 30,
    backgroundColor: "#E8E8E8",
    marginHorizontal: 8,
  },
});

export default OverallTotalSummary;
