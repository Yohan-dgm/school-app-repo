import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SCHOOL_HOUSES } from "../../../../../constants/schoolHouses";
import { useDashboardData } from "../../../../../hooks/useDashboardData";

const { width } = Dimensions.get("window");

const SimpleSummaryCard = ({
  title,
  value,
  icon,
  colors,
  accentColor,
  subtitle,
}) => (
  <View style={styles.summaryCard}>
    <LinearGradient colors={colors} style={styles.cardGradient}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <MaterialIcons name={icon} size={24} color="white" />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <Text style={styles.cardValue}>{value}</Text>
        {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>
    </LinearGradient>
  </View>
);

const SimpleHouseCard = ({ house, studentCount }) => (
  <View style={styles.houseCard}>
    <LinearGradient colors={house.colors.gradient} style={styles.houseGradient}>
      <MaterialIcons name={house.icon} size={20} color="white" />
      <Text style={styles.houseName}>{house.name}</Text>
      <Text style={styles.houseCount}>{studentCount}</Text>
      <Text style={styles.houseLabel}>Students</Text>
    </LinearGradient>
  </View>
);

const SimpleSummaryDashboard = () => {
  console.log("🚀 SimpleSummaryDashboard rendering...");
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData();
  console.log("📊 Dashboard hook result:", { dashboardData, isLoading, error });

  // Fallback data in case API fails
  const fallbackData = {
    totalStudents: 250, // Dummy data for loading state
    totalEducators: 45,
    activeClasses: 12,
    averageAttendance: 0,
    notifications: 0,
    houseStudents: {
      vulcan: 65,
      tellus: 58,
      eurus: 72,
      calypso: 55,
    },
  };

  const displayData = dashboardData || fallbackData;
  console.log("🎯 Display data being used:", displayData);

  // Show error message if API fails
  if (error) {
    console.log("❌ Error in dashboard:", error);
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#DC2626" />
          <Text style={styles.errorTitle}>Unable to Load Dashboard Data</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  console.log("🎨 About to render dashboard with style:", styles.container);

  return (
    <View style={styles.container}>
      {/* Debug indicator */}
      {/* <View style={{backgroundColor: 'green', height: 20, margin: 5}}>
        <Text style={{color: 'white', fontSize: 12, textAlign: 'center'}}>SIMPLE DASHBOARD LOADED</Text>
      </View> */}
      {/* <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard Overview</Text>
        <Text style={styles.headerSubtitle}>Principal Summary</Text>
      </View> */}

      {/* <View style={styles.summaryGrid}>
        <SimpleSummaryCard
          title="Students"
          value={isLoading ? "..." : displayData.totalStudents.toLocaleString()}
          icon="school"
          colors={["#4F46E5", "#7C3AED"]}
          accentColor="#4F46E5"
          subtitle="Total enrolled"
        />

        <SimpleSummaryCard
          title="Educators"
          value={isLoading ? "..." : displayData.totalEducators}
          icon="people"
          colors={["#059669", "#10B981"]}
          accentColor="#059669"
          subtitle="Active staff"
        />

        <SimpleSummaryCard
          title="Attendance"
          value={isLoading ? "..." : `${displayData.averageAttendance}%`}
          icon="trending-up"
          colors={["#7C3AED", "#A855F7"]}
          accentColor="#7C3AED"
          subtitle="This month"
        />

        <SimpleSummaryCard
          title="Alerts"
          value={isLoading ? "..." : displayData.notifications}
          icon="notifications"
          colors={["#EA580C", "#FB923C"]}
          accentColor="#EA580C"
          subtitle="Pending"
        />
      </View> */}

      <View style={styles.housesSection}>
        <Text style={styles.sectionTitle}>School Houses</Text>
        <View style={styles.housesGrid}>
          {SCHOOL_HOUSES.map((house) => (
            <SimpleHouseCard
              key={house.id}
              house={house}
              studentCount={displayData.houseStudents[house.id]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  summaryCard: {
    width: (width - 52) / 2,
    height: 100,
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "white",
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  housesSection: {
    paddingHorizontal: 20,
    paddingVertical: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  housesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  houseCard: {
    width: (width - 64) / 4,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  houseGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  houseName: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  houseCount: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  houseLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 9,
    fontWeight: "500",
    marginTop: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 200,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#DC2626",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default SimpleSummaryDashboard;
