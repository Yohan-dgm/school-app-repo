import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";

interface ExamSummaryCardProps {
  aggregateMark: string;
  studentAverage: string;
  classRank: number;
  classAverage: string;
  gradeLevelName: string;
}

const ExamSummaryCard: React.FC<ExamSummaryCardProps> = ({
  aggregateMark,
  studentAverage,
  classRank,
  classAverage,
  gradeLevelName,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="assessment" size={24} color="#920734" />
        <Text style={styles.headerTitle}>Exam Summary</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{aggregateMark}</Text>
            <Text style={styles.statLabel}>Total Marks</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{studentAverage}%</Text>
            <Text style={styles.statLabel}>Average</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>#{classRank}</Text>
            <Text style={styles.statLabel}>Class Rank</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{classAverage}%</Text>
            <Text style={styles.statLabel}>Class Average</Text>
          </View>
        </View>

        <View style={styles.gradeInfo}>
          <Text style={styles.gradeText}>Grade Level: {gradeLevelName}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#920734",
    marginLeft: 8,
  },
  content: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginHorizontal: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#920734",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#920734",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  gradeInfo: {
    backgroundColor: "#F4E5E8",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  gradeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#920734",
  },
});

export default ExamSummaryCard;
