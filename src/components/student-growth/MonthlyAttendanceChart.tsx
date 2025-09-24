import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { MaterialIcons } from "@expo/vector-icons";
import { feedbackCardTheme } from "../../data/studentGrowthData";

const { width: screenWidth } = Dimensions.get("window");

interface AttendanceRecord {
  id: number;
  date: string;
  attendance_type_id: number;
  in_time?: string | null;
  out_time?: string | null;
  notes: string | null;
}

interface MonthlyAttendanceChartProps {
  attendanceRecords: AttendanceRecord[];
}

interface MonthlyStats {
  month: number;
  monthName: string;
  shortName: string;
  presentCount: number;
  totalCount: number;
  attendanceRate: number;
}

const MonthlyAttendanceChart: React.FC<MonthlyAttendanceChartProps> = ({
  attendanceRecords,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  // Process data to get monthly statistics for chart-kit format - only real database records
  const getChartData = () => {
    // Return empty data if no attendance records exist
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return {
        chartData: {
          labels: [],
          datasets: [{ data: [], strokeWidth: 3 }],
        },
        monthlyStats: [],
      };
    }

    const months = [
      { month: 1, shortName: "Jan" },
      { month: 2, shortName: "Feb" },
      { month: 3, shortName: "Mar" },
      { month: 4, shortName: "Apr" },
      { month: 5, shortName: "May" },
      { month: 6, shortName: "Jun" },
      { month: 7, shortName: "Jul" },
      { month: 8, shortName: "Aug" },
      { month: 9, shortName: "Sep" },
      { month: 10, shortName: "Oct" },
      { month: 11, shortName: "Nov" },
      { month: 12, shortName: "Dec" },
    ];

    const currentYear = new Date().getFullYear();
    const labels: string[] = [];
    const data: number[] = [];
    const monthlyStats: MonthlyStats[] = [];

    months.forEach(({ month, shortName }) => {
      // Filter records for this month and year - only real database records
      const monthRecords = attendanceRecords.filter((record) => {
        // Parse date string directly to avoid timezone issues
        const [year, monthStr] = record.date.split("-").map(Number);
        return monthStr === month && year === currentYear;
      });

      const presentCount = monthRecords.filter(
        (r) => r.attendance_type_id === 1,
      ).length;
      const absentCount = monthRecords.filter(
        (r) => r.attendance_type_id === 4, // Updated: 4 means absent, not 3
      ).length;
      const totalCount = presentCount + absentCount; // Only count present and absent (exclude type 2)
      const attendanceRate =
        totalCount > 0 ? (presentCount / totalCount) * 100 : 0;

      // Only include months that have actual attendance data from database
      if (totalCount > 0) {
        labels.push(shortName);
        data.push(presentCount);
      }

      monthlyStats.push({
        month,
        monthName: shortName,
        shortName,
        presentCount,
        totalCount,
        attendanceRate,
      });
    });

    return {
      chartData: {
        labels,
        datasets: [
          {
            data,
            strokeWidth: 3,
          },
        ],
      },
      monthlyStats,
    };
  };

  const { chartData, monthlyStats } = getChartData();

  // Calculate growth/decline trends
  const getTrendData = () => {
    const nonZeroMonths = monthlyStats.filter((stat) => stat.totalCount > 0);

    if (nonZeroMonths.length < 2) {
      return {
        overallTrend: "neutral" as const,
        averageAttendance: 0,
        bestMonth: null,
        worstMonth: null,
      };
    }

    const totalAttendanceRate = nonZeroMonths.reduce(
      (sum, stat) => sum + stat.attendanceRate,
      0,
    );
    const averageAttendance = totalAttendanceRate / nonZeroMonths.length;

    // Find best and worst months
    const bestMonth = nonZeroMonths.reduce((best, current) =>
      current.attendanceRate > best.attendanceRate ? current : best,
    );

    const worstMonth = nonZeroMonths.reduce((worst, current) =>
      current.attendanceRate < worst.attendanceRate ? current : worst,
    );

    // Calculate overall trend (compare first half vs second half of recorded months)
    const midPoint = Math.floor(nonZeroMonths.length / 2);
    const firstHalf = nonZeroMonths.slice(0, midPoint);
    const secondHalf = nonZeroMonths.slice(midPoint);

    const firstHalfAvg =
      firstHalf.length > 0
        ? firstHalf.reduce((sum, stat) => sum + stat.attendanceRate, 0) /
          firstHalf.length
        : 0;
    const secondHalfAvg =
      secondHalf.length > 0
        ? secondHalf.reduce((sum, stat) => sum + stat.attendanceRate, 0) /
          secondHalf.length
        : 0;

    let overallTrend: "growing" | "declining" | "neutral" = "neutral";
    const trendDifference = secondHalfAvg - firstHalfAvg;

    if (Math.abs(trendDifference) > 5) {
      overallTrend = trendDifference > 0 ? "growing" : "declining";
    }

    return {
      overallTrend,
      averageAttendance,
      bestMonth,
      worstMonth,
      trendDifference,
    };
  };

  const trendData = getTrendData();

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "growing":
        return { name: "trending-up", color: feedbackCardTheme.success };
      case "declining":
        return { name: "trending-down", color: feedbackCardTheme.error };
      default:
        return { name: "trending-flat", color: feedbackCardTheme.grayMedium };
    }
  };

  // Chart configuration for react-native-chart-kit
  const chartConfig = {
    backgroundColor: feedbackCardTheme.surface,
    backgroundGradientFrom: feedbackCardTheme.surface,
    backgroundGradientTo: feedbackCardTheme.surface,
    decimalPlaces: 0, // No decimals for attendance count
    color: (opacity = 1) => `rgba(128, 0, 0, ${opacity})`, // Maroon color with opacity
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.9})`, // Very dark labels for better visibility
    style: {
      borderRadius: 16,
      paddingRight: 25, // Extra padding for labels
      paddingBottom: 25, // Bottom padding for X-axis labels
      paddingLeft: 10, // Left padding for Y-axis labels
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: feedbackCardTheme.primary,
      fill: feedbackCardTheme.surface,
    },
    propsForBackgroundLines: {
      strokeDasharray: "", // solid lines
      stroke: feedbackCardTheme.grayLight,
      strokeWidth: 1,
    },
    fillShadowGradient: feedbackCardTheme.primary,
    fillShadowGradientFrom: feedbackCardTheme.primary,
    fillShadowGradientTo: feedbackCardTheme.surface,
    fillShadowGradientOpacity: 0.3, // Increased opacity for better visibility
    useShadowColorFromDataset: false,
    propsForHorizontalLabels: {
      fontSize: 13, // Slightly larger font
      fill: feedbackCardTheme.black,
      fontWeight: "600",
    },
    propsForVerticalLabels: {
      fontSize: 12,
      fill: feedbackCardTheme.black,
      fontWeight: "500",
    },
    formatYLabel: (value: string) => {
      // Custom Y-axis labels: show 5, 10, 15, 20, 25, 30
      const numValue = parseFloat(value);
      const yLabels = [0, 5, 10, 15, 20, 25, 30];
      const closest =
        yLabels.find((label) => Math.abs(numValue - label) < 2.5) ||
        Math.round(numValue);
      return closest.toString();
    },
  };

  // Auto-scroll to show the latest month initially
  useEffect(() => {
    if (chartData.labels.length > 0) {
      setTimeout(() => {
        if (scrollViewRef.current) {
          const chartWidth = Math.max(
            screenWidth + 50,
            chartData.labels.length * 80,
          );
          const scrollToX = Math.max(0, chartWidth - screenWidth);
          scrollViewRef.current.scrollTo({ x: scrollToX, animated: true });
        }
      }, 500); // Delay to ensure chart is rendered
    }
  }, [chartData.labels.length]);

  // Show empty state if no attendance records or no chart data
  if (
    !attendanceRecords ||
    attendanceRecords.length === 0 ||
    chartData.labels.length === 0
  ) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons
          name="bar-chart"
          size={32}
          color={feedbackCardTheme.grayMedium}
        />
        <Text style={styles.emptyText}>
          No attendance data available for chart
        </Text>
        <Text style={styles.emptySubtext}>
          Chart will appear when attendance records are added to the system
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Chart Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <MaterialIcons
            name="bar-chart"
            size={20}
            color={feedbackCardTheme.primary}
          />
          <Text style={styles.title}>Monthly Attendance Overview</Text>
        </View>

        {/* Overall Trend Indicator */}
        <View style={styles.trendIndicator}>
          <MaterialIcons
            name={getTrendIcon(trendData.overallTrend).name}
            size={16}
            color={getTrendIcon(trendData.overallTrend).color}
          />
          <Text
            style={[
              styles.trendText,
              { color: getTrendIcon(trendData.overallTrend).color },
            ]}
          >
            {trendData.overallTrend === "growing" && "Improving"}
            {trendData.overallTrend === "declining" && "Declining"}
            {trendData.overallTrend === "neutral" && "Stable"}
          </Text>
        </View>
      </View>

      {/* Line Chart with Horizontal Scroll */}
      <View style={styles.chartContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          <LineChart
            data={chartData}
            width={Math.max(screenWidth + 50, chartData.labels.length * 10)} // Wider for better spacing
            height={200} // More height for X-axis labels
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={true}
            withHorizontalLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            withDots={true}
            withShadow={true} // Enable shadow for filled area effect
            segments={5} // 6 horizontal lines for Y-axis: 0, 6, 12, 18, 24, 30
            fromZero={true} // Start from zero for proper scaling
            yAxisSuffix=""
            yAxisInterval={1}
          />
        </ScrollView>

        <View style={styles.scrollHintContainer}>
          <MaterialIcons
            name="swipe"
            size={16}
            color={feedbackCardTheme.grayMedium}
          />
          <Text style={styles.scrollHint}>
            Scroll horizontally to view all months
          </Text>
        </View>
      </View>

      {/* Summary Stats */}
      {/* <View style={styles.summaryContainer}>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {trendData.averageAttendance.toFixed(1)}%
            </Text>
            <Text style={styles.summaryLabel}>Average</Text>
          </View>

          {trendData.bestMonth && (
            <View style={styles.summaryItem}>
              <Text
                style={[
                  styles.summaryValue,
                  { color: feedbackCardTheme.success },
                ]}
              >
                {trendData.bestMonth.shortName}
              </Text>
              <Text style={styles.summaryLabel}>Best Month</Text>
            </View>
          )}

          {trendData.worstMonth &&
            trendData.bestMonth !== trendData.worstMonth && (
              <View style={styles.summaryItem}>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: feedbackCardTheme.error },
                  ]}
                >
                  {trendData.worstMonth.shortName}
                </Text>
                <Text style={styles.summaryLabel}>Needs Focus</Text>
              </View>
            )}
        </View>
      </View> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: feedbackCardTheme.surface,
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 20, // More bottom margin for better spacing
    borderRadius: 12,
    padding: 16,
    paddingBottom: 14, // Add extra bottom padding
    shadowColor: feedbackCardTheme.shadow.small,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    // backgroundColor: "red", // Internal padding for labels
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: feedbackCardTheme.black,
  },
  trendIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "500",
  },
  chartContainer: {
    marginBottom: 10, // More space between chart and summary
    paddingHorizontal: 0, // No horizontal padding for full scroll
    marginVertical: 8,
  },
  scrollView: {
    paddingBottom: 0, // Extra bottom padding for scroll view
  },
  chart: {
    marginVertical: 8,
    // marginBottom: 20, // Much more bottom margin for X-axis labels
    borderRadius: 16,
    // paddingBottom: 20,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 16,
    // paddingBottom: 30, // Extra bottom padding for X-axis labels
  },
  scrollHintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 1,
    gap: 6,
  },
  scrollHint: {
    fontSize: 12,
    color: feedbackCardTheme.grayMedium,
    fontStyle: "italic",
  },
  summaryContainer: {
    borderTopWidth: 1,
    borderTopColor: feedbackCardTheme.grayLight,
    paddingTop: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: feedbackCardTheme.black,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: feedbackCardTheme.grayMedium,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: feedbackCardTheme.surface,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 12,
    color: feedbackCardTheme.grayMedium,
    textAlign: "center",
    fontWeight: "500",
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 11,
    color: feedbackCardTheme.grayMedium,
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default MonthlyAttendanceChart;
