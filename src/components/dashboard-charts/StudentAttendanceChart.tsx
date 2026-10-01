import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { MaterialIcons } from "@expo/vector-icons";
import {
  useGetAttendanceAggregatedQuery,
  createAttendanceQueryParams,
  processAttendanceDataForMonths,
  MonthlyAttendanceData,
} from "../../api/attendance-api";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 40;

interface StudentAttendanceChartProps {
  selectedGrade?: string;
  compact?: boolean;
}

interface ChartDataPoint {
  value: number; // Present count only
  label: string;
  date: string;
  presentCount: number;
  color?: string;
  frontColor?: string;
}

const StudentAttendanceChart: React.FC<StudentAttendanceChartProps> = ({
  selectedGrade = "All",
  compact = true,
}) => {
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [selectedDataPoint, setSelectedDataPoint] =
    useState<ChartDataPoint | null>(null);

  // Fetch attendance data using the existing API
  const attendanceQuery = useGetAttendanceAggregatedQuery(
    createAttendanceQueryParams(1, 500, "", "All"), // Use "All" to get all students' attendance data
  );

  // Aggressive data refresh on every component focus/navigation
  useFocusEffect(
    useCallback(() => {
      // Force fresh data fetch from backend on every navigation/focus
      console.log("🔄 StudentAttendanceChart focused - forcing data refresh");
      attendanceQuery.refetch();
    }, [attendanceQuery.refetch]),
  );

  // Process data for chart visualization - monthly totals of present students only
  const chartData = useMemo(() => {
    if (!attendanceQuery.data?.data?.data) {
      return [];
    }

    // Monthly view - show total present students per month
    const monthlyData = processAttendanceDataForMonths(
      attendanceQuery.data.data.data,
      6, // Show last 6 months of data
    );

    return monthlyData.map((monthStat: MonthlyAttendanceData) => ({
      value: monthStat.totalPresentStudents, // Total present students for the month
      label: monthStat.monthLabel,
      date: monthStat.month,
      presentCount: monthStat.totalPresentStudents,
      color: getMonthlyPresentColor(monthStat.totalPresentStudents),
      frontColor: getMonthlyPresentColor(monthStat.totalPresentStudents),
    }));
  }, [attendanceQuery.data]);

  // Calculate summary statistics - simplified for present count only
  const summaryStats = useMemo(() => {
    if (chartData.length === 0) return null;

    const averagePresentCount =
      chartData.reduce((sum, point) => sum + point.value, 0) / chartData.length;

    const bestMonth = chartData.reduce((best, current) =>
      current.value > best.value ? current : best,
    );

    const worstMonth = chartData.reduce((worst, current) =>
      current.value < worst.value ? current : worst,
    );

    return {
      averagePresentCount: Math.round(averagePresentCount),
      bestMonth,
      worstMonth,
    };
  }, [chartData]);

  // Handle data point press
  const handleDataPointPress = (dataPoint: ChartDataPoint) => {
    setSelectedDataPoint(dataPoint);
  };

  // Toggle chart type
  const toggleChartType = () => {
    setChartType((prev) => (prev === "line" ? "bar" : "line"));
    setSelectedDataPoint(null); // Clear selected data point when switching chart type
  };

  if (attendanceQuery.isLoading) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialIcons name="timeline" size={16} color="#920734" />
            <Text style={styles.title}>Student Attendance Trends</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#920734" />
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        </View>
      </View>
    );
  }

  if (attendanceQuery.isError || chartData.length === 0) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialIcons name="timeline" size={16} color="#920734" />
            <Text style={styles.title}>Student Attendance Trends</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="timeline" size={48} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Attendance Data</Text>
          <Text style={styles.emptyText}>
            No attendance records found for the selected period
          </Text>
          {attendanceQuery.isError && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => attendanceQuery.refetch()}
            >
              <MaterialIcons name="refresh" size={16} color="#920734" />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <MaterialIcons name="timeline" size={16} color="#920734" />
          <Text style={styles.title}>Monthly Totals - Present Students</Text>
          {summaryStats && (
            <Text style={styles.subtitle}>
              Avg: {summaryStats.averagePresentCount} total/month
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleChartType}>
          <MaterialIcons
            name={chartType === "line" ? "bar-chart" : "show-chart"}
            size={16}
            color="#920734"
          />
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      {summaryStats && !compact && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Best Month</Text>
            <Text style={styles.statValue}>{summaryStats.bestMonth.label}</Text>
            <Text style={styles.statSubvalue}>
              {summaryStats.bestMonth.value} total
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Lowest Month</Text>
            <Text style={styles.statValue}>
              {summaryStats.worstMonth.label}
            </Text>
            <Text style={styles.statSubvalue}>
              {summaryStats.worstMonth.value} total
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>
              {summaryStats.averagePresentCount}
            </Text>
            <Text style={styles.statSubvalue}>per month</Text>
          </View>
        </View>
      )}

      {/* Chart */}
      <View style={styles.chartContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chartScrollContent}
        >
          {chartType === "line" ? (
            <LineChart
              data={chartData}
              width={Math.max(CHART_WIDTH - 40, chartData.length * 60)} // Dynamic width for more months
              height={compact ? 100 : 140}
              color="#920734"
              thickness={2}
              dataPointsColor="#920734"
              dataPointsRadius={4}
              textColor="#666"
              textShiftY={-5}
              textShiftX={-8}
              textFontSize={10}
              showVerticalLines={false}
              onPress={handleDataPointPress}
              curved
              animateOnDataChange
              animationDuration={800}
              yAxisLabelSuffix=""
              maxValue={Math.max(...chartData.map((d) => d.value), 100)}
              stepValue={Math.ceil(
                Math.max(...chartData.map((d) => d.value), 100) / 5,
              )}
              noOfSections={5}
              yAxisColor="#E0E0E0"
              xAxisColor="#E0E0E0"
              backgroundColor="#FFFFFF"
              hideYAxisText={compact}
              yAxisTextStyle={{ fontSize: 9, color: "#666" }}
              xAxisLabelTextStyle={{ fontSize: 9, color: "#666" }}
            />
          ) : (
            <BarChart
              data={chartData}
              width={Math.max(CHART_WIDTH - 40, chartData.length * 60)} // Dynamic width for more months
              height={compact ? 100 : 140}
              barWidth={20}
              spacing={15}
              roundedTop
              roundedBottom
              showGradient
              yAxisThickness={1}
              xAxisThickness={1}
              yAxisColor="#E0E0E0"
              xAxisColor="#E0E0E0"
              textColor="#666"
              textShiftY={-5}
              textFontSize={10}
              onPress={handleDataPointPress}
              animateOnDataChange
              animationDuration={800}
              yAxisLabelSuffix=""
              maxValue={Math.max(...chartData.map((d) => d.value), 100)}
              stepValue={Math.ceil(
                Math.max(...chartData.map((d) => d.value), 100) / 5,
              )}
              noOfSections={5}
              hideYAxisText={compact}
              yAxisTextStyle={{ fontSize: 9, color: "#666" }}
              xAxisLabelTextStyle={{ fontSize: 9, color: "#666" }}
            />
          )}
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#4CAF50" }]} />
          <Text style={styles.legendText}>High (2000+ total)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#FF9800" }]} />
          <Text style={styles.legendText}>Medium (1500-1999)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#F44336" }]} />
          <Text style={styles.legendText}>Low (1000-1499)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#9C27B0" }]} />
          <Text style={styles.legendText}>Very Low (&lt;1000)</Text>
        </View>
      </View>

      {/* Selected Data Point Details */}
      {selectedDataPoint && !compact && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>
              {selectedDataPoint.label} Details
            </Text>
            <TouchableOpacity onPress={() => setSelectedDataPoint(null)}>
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.detailsContent}>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Total Present Students:</Text>
              <Text
                style={[
                  styles.detailsValue,
                  { color: selectedDataPoint.color },
                ]}
              >
                {selectedDataPoint.presentCount}
              </Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Month:</Text>
              <Text style={styles.detailsValue}>{selectedDataPoint.label}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// Helper function to get color based on monthly total present count
const getMonthlyPresentColor = (monthlyPresentTotal: number): string => {
  if (monthlyPresentTotal >= 2000) return "#4CAF50"; // Green - High monthly total
  if (monthlyPresentTotal >= 1500) return "#FF9800"; // Orange - Medium monthly total
  if (monthlyPresentTotal >= 1000) return "#F44336"; // Red - Low monthly total
  return "#9C27B0"; // Purple - Very low monthly total
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  compactContainer: {
    padding: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  toggleButton: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 1,
  },
  statSubvalue: {
    fontSize: 10,
    color: "#920734",
  },
  chartContainer: {
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    padding: 12,
  },
  chartScrollContent: {
    paddingHorizontal: 20,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 10,
    color: "#666",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#999",
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#920734",
    gap: 4,
  },
  retryText: {
    fontSize: 12,
    color: "#920734",
    fontWeight: "600",
  },
  detailsContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  detailsContent: {
    gap: 8,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailsLabel: {
    fontSize: 12,
    color: "#666",
  },
  detailsValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
});

export default StudentAttendanceChart;
