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
import { BarChart, PieChart } from "react-native-gifted-charts";
import { MaterialIcons } from "@expo/vector-icons";
import {
  useGetFeedbackListQuery,
  useGetCategoryListQuery,
} from "../../api/educator-feedback-api";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 40;

interface EducatorFeedbackChartProps {
  selectedGrade?: string;
  compact?: boolean;
}

interface CategoryRating {
  category: string;
  averageRating: number;
  count: number;
  color: string;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

const EducatorFeedbackChart: React.FC<EducatorFeedbackChartProps> = ({
  selectedGrade = "All",
  compact = true,
}) => {
  const [viewType, setViewType] = useState<"ratings" | "status">("ratings");

  // Fetch feedback data - Increased page_size to get all records
  const feedbackQuery = useGetFeedbackListQuery({
    page: 1,
    page_size: 1000, // Increased to get all categories
    search_phrase: "",
    search_filter_list: [],
    filters: selectedGrade !== "All" ? { grade_filter: selectedGrade } : {},
  });

  // Fetch categories for additional context
  const categoriesQuery = useGetCategoryListQuery();

  // Aggressive data refresh on every component focus/navigation
  useFocusEffect(
    useCallback(() => {
      // Force fresh data fetch from backend on every navigation/focus
      console.log("🔄 EducatorFeedbackChart focused - forcing data refresh");
      feedbackQuery.refetch();
      categoriesQuery.refetch();
    }, [feedbackQuery.refetch, categoriesQuery.refetch]),
  );

  // Additional refresh trigger for scroll-based refresh
  React.useEffect(() => {
    // This effect will run whenever the component re-renders due to parent refresh
    const shouldRefresh = Date.now();
    console.log(
      "🔄 EducatorFeedbackChart re-rendered - triggering refresh:",
      shouldRefresh,
    );

    // Small delay to avoid rapid successive calls
    const refreshTimeout = setTimeout(() => {
      feedbackQuery.refetch();
      categoriesQuery.refetch();
    }, 100);

    return () => clearTimeout(refreshTimeout);
  }, []); // Empty dependency array means this runs on every render

  // Process data for category ratings - Enhanced to get ALL categories
  const categoryRatingsData = useMemo(() => {
    if (!feedbackQuery.data?.data?.data) return [];

    const feedbackData = feedbackQuery.data.data.data;
    const categoryMap = new Map<
      string,
      { totalRating: number; count: number }
    >();

    // First, populate with all available categories from the categories API
    if (categoriesQuery.data?.data) {
      const allCategories = categoriesQuery.data.data;
      allCategories.forEach((category: any) => {
        const categoryName =
          category.name || category.category_name || "Unknown";
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, { totalRating: 0, count: 0 });
        }
      });
    }

    // Then aggregate ratings by category from feedback data
    feedbackData.forEach((feedback: any) => {
      // Try different possible field names for category
      const categoryName =
        feedback.category?.name ||
        feedback.main_category ||
        feedback.category_name ||
        feedback.feedback_category?.name ||
        feedback.educator_feedback_category?.name ||
        "Uncategorized";

      // Ensure we have a valid rating (1-5 scale)
      const rating = feedback.rating || feedback.score || 0;

      if (categoryName && rating > 0) {
        if (categoryMap.has(categoryName)) {
          const existing = categoryMap.get(categoryName)!;
          categoryMap.set(categoryName, {
            totalRating: existing.totalRating + rating,
            count: existing.count + 1,
          });
        } else {
          categoryMap.set(categoryName, {
            totalRating: rating,
            count: 1,
          });
        }
      }
    });

    // Convert to chart data - Extended color palette for all categories
    const colors = [
      "#920734", // Primary red
      "#0057FF", // Blue
      "#4CAF50", // Green
      "#FF9800", // Orange
      "#9C27B0", // Purple
      "#FF5722", // Deep orange
      "#2196F3", // Light blue
      "#E91E63", // Pink
      "#795548", // Brown
      "#607D8B", // Blue grey
      "#FFC107", // Amber
      "#009688", // Teal
      "#673AB7", // Deep purple
      "#3F51B5", // Indigo
      "#00BCD4", // Cyan
      "#8BC34A", // Light green
      "#CDDC39", // Lime
      "#FFEB3B", // Yellow
      "#FF9800", // Orange
      "#F44336", // Red
    ];
    let colorIndex = 0;

    const categoryRatings: CategoryRating[] = Array.from(categoryMap.entries())
      .filter(([category, data]) => data.count > 0) // Only show categories with actual feedback
      .map(([category, data]) => ({
        category,
        averageRating: Math.round((data.totalRating / data.count) * 100) / 100, // Round to 2 decimals for cleaner display
        count: data.count,
        color: colors[colorIndex++ % colors.length],
      }))
      .sort((a, b) => b.averageRating - a.averageRating); // Show ALL categories with feedback, sorted by rating

    return categoryRatings;
  }, [feedbackQuery.data, categoriesQuery.data]);

  // Process data for status distribution
  const statusDistributionData = useMemo(() => {
    if (!feedbackQuery.data?.data?.data) return [];

    const feedbackData = feedbackQuery.data.data.data;
    const statusMap = new Map<string, number>();
    const totalCount = feedbackData.length;

    // Count statuses
    feedbackData.forEach((feedback: any) => {
      // Check evaluations for status
      let status = "Pending Review";

      if (feedback.evaluations && feedback.evaluations.length > 0) {
        const activeEval = feedback.evaluations.find(
          (evaluation: any) => evaluation.is_active,
        );
        if (activeEval) {
          const evaluationType =
            activeEval.educator_feedback_evaluation_type?.name;
          if (evaluationType === "Accept") status = "Approved";
          else if (evaluationType === "Under Observation")
            status = "Under Review";
          else if (evaluationType === "Decline") status = "Declined";
          else if (evaluationType === "Correction Required")
            status = "Needs Revision";
          else if (evaluationType === "Assigning to Counselor")
            status = "Counselor Review";
        }
      }

      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    // Convert to chart data
    const statusColors: { [key: string]: string } = {
      Approved: "#4CAF50",
      "Under Review": "#FF9800",
      "Pending Review": "#2196F3",
      Declined: "#F44336",
      "Needs Revision": "#FF5722",
      "Counselor Review": "#9C27B0",
    };

    const statusDistribution: StatusDistribution[] = Array.from(
      statusMap.entries(),
    )
      .map(([status, count]) => ({
        status,
        count,
        percentage: (count / totalCount) * 100,
        color: statusColors[status] || "#666",
      }))
      .sort((a, b) => b.count - a.count);

    return statusDistribution;
  }, [feedbackQuery.data]);

  // Convert data for chart components
  const barChartData = useMemo(() => {
    return categoryRatingsData.map((item, index) => ({
      value: item.averageRating, // This will show 1-5 rating scale
      label:
        item.category.length > 10
          ? item.category.substring(0, 10) + "..."
          : item.category,
      frontColor: item.color,
      spacing: index === categoryRatingsData.length - 1 ? 0 : 2,
    }));
  }, [categoryRatingsData]);

  const pieChartData = useMemo(() => {
    return statusDistributionData.map((item) => ({
      value: item.count,
      color: item.color,
      text: `${item.percentage.toFixed(1)}%`,
      label: item.status,
    }));
  }, [statusDistributionData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!feedbackQuery.data?.data?.data) return null;

    const feedbackData = feedbackQuery.data.data.data;
    const totalFeedbacks = feedbackData.length;

    const totalRating = feedbackData.reduce(
      (sum: number, feedback: any) => sum + (feedback.rating || 0),
      0,
    );
    const averageRating = totalFeedbacks > 0 ? totalRating / totalFeedbacks : 0;

    const approvedCount =
      statusDistributionData.find((s) => s.status === "Approved")?.count || 0;
    const pendingCount =
      statusDistributionData.find((s) => s.status === "Pending Review")
        ?.count || 0;

    return {
      totalFeedbacks,
      averageRating: Math.round(averageRating * 10) / 10,
      approvedCount,
      pendingCount,
    };
  }, [feedbackQuery.data, statusDistributionData]);

  const toggleViewType = () => {
    setViewType((prev) => (prev === "ratings" ? "status" : "ratings"));
  };

  if (feedbackQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialIcons name="rate-review" size={16} color="#920734" />
            <Text style={styles.title}>Educator Feedback Analysis</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#920734" />
          <Text style={styles.loadingText}>Loading feedback data...</Text>
        </View>
      </View>
    );
  }

  if (
    feedbackQuery.isError ||
    (!categoryRatingsData.length && !statusDistributionData.length)
  ) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialIcons name="rate-review" size={16} color="#920734" />
            <Text style={styles.title}>Educator Feedback Analysis</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="rate-review" size={48} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Feedback Data</Text>
          <Text style={styles.emptyText}>
            No feedback records found for the selected period
          </Text>
          {feedbackQuery.isError && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => feedbackQuery.refetch()}
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
          <MaterialIcons name="rate-review" size={16} color="#920734" />
          <Text style={styles.title}>Educator Feedback Analysis</Text>
          {summaryStats && (
            <Text style={styles.subtitle}>
              Avg: {summaryStats.averageRating}/5.0
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleViewType}>
          <MaterialIcons
            name={viewType === "ratings" ? "pie-chart" : "bar-chart"}
            size={16}
            color="#920734"
          />
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      {summaryStats && !compact && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{summaryStats.totalFeedbacks}</Text>
            <Text style={styles.statSubvalue}>feedbacks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Approved</Text>
            <Text style={styles.statValue}>{summaryStats.approvedCount}</Text>
            <Text style={styles.statSubvalue}>items</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>{summaryStats.pendingCount}</Text>
            <Text style={styles.statSubvalue}>items</Text>
          </View>
        </View>
      )}

      {/* Chart */}
      <View style={styles.chartContainer}>
        {viewType === "ratings" ? (
          <View style={styles.barChartWrapper}>
            <Text style={styles.chartSubtitle}>
              Average Ratings by Category
            </Text>
            {barChartData.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chartScrollContent}
              >
                <BarChart
                  data={barChartData}
                  width={Math.max(CHART_WIDTH - 60, barChartData.length * 80)} // Increased spacing for better visibility
                  height={compact ? 100 : 160}
                  barWidth={22}
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
                  textFontSize={9}
                  animateOnDataChange
                  animationDuration={800}
                  yAxisLabelSuffix=""
                  maxValue={5}
                  stepValue={1}
                  noOfSections={5}
                  hideYAxisText={compact}
                  yAxisTextStyle={{ fontSize: 9, color: "#666" }}
                  xAxisLabelTextStyle={{ fontSize: 8, color: "#666" }}
                />
              </ScrollView>
            ) : (
              <Text style={styles.noDataText}>No rating data available</Text>
            )}
          </View>
        ) : (
          <View style={styles.pieChartWrapper}>
            <Text style={styles.chartSubtitle}>
              Feedback Status Distribution
            </Text>
            {pieChartData.length > 0 ? (
              <PieChart
                data={pieChartData}
                radius={compact ? 50 : 70}
                innerRadius={compact ? 20 : 30}
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={styles.centerLabelText}>Total</Text>
                    <Text style={styles.centerLabelValue}>
                      {summaryStats?.totalFeedbacks || 0}
                    </Text>
                  </View>
                )}
                strokeColor="#fff"
                strokeWidth={2}
              />
            ) : (
              <Text style={styles.noDataText}>No status data available</Text>
            )}
          </View>
        )}
      </View>

      {/* Legend - Show all categories */}
      <View style={styles.legend}>
        {viewType === "ratings"
          ? categoryRatingsData.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: item.color }]}
                />
                <Text style={styles.legendText}>
                  {item.category} ({item.averageRating.toFixed(1)})
                </Text>
              </View>
            ))
          : statusDistributionData.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: item.color }]}
                />
                <Text style={styles.legendText}>
                  {item.status} ({item.count})
                </Text>
              </View>
            ))}
      </View>
    </View>
  );
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
  chartSubtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  barChartWrapper: {
    alignItems: "center",
  },
  pieChartWrapper: {
    alignItems: "center",
  },
  chartScrollContent: {
    paddingHorizontal: 20,
  },
  centerLabel: {
    alignItems: "center",
  },
  centerLabelText: {
    fontSize: 10,
    color: "#666",
  },
  centerLabelValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a1a",
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
    flex: 1,
    minWidth: 80,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 9,
    color: "#666",
    flexShrink: 1,
  },
  noDataText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    padding: 20,
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
});

export default EducatorFeedbackChart;
