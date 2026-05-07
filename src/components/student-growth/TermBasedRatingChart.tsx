import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { MaterialIcons } from "@expo/vector-icons";
import { modernColors, maroonTheme } from "../../data/studentGrowthData";
import { useGetStudentRatingsByTermQuery } from "../../api/educator-feedback-api";
import YearSelector, { getInitialSelectedYear } from "./YearSelector";
import CategorySelector, {
  CategoryOption,
  DEFAULT_CATEGORIES,
} from "./CategorySelector";

const { width } = Dimensions.get("window");

interface TermBasedRatingChartProps {
  studentId: number;
}

interface TermData {
  term_number: number;
  term_name: string;
  summary: {
    average_overall: number;
    total_records: number;
  };
  categories: {
    category_id: number;
    category_name: string;
    average_rating: number;
    record_count: number;
  }[];
}

const TermBasedRatingChart: React.FC<TermBasedRatingChartProps> = ({
  studentId,
}) => {
  const [selectedYear, setSelectedYear] = useState(() => getInitialSelectedYear());
  const [selectedCategory, setSelectedCategory] = useState("overall");

  // API call to get student ratings by term
  const {
    data: apiResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetStudentRatingsByTermQuery(
    {
      student_id: studentId,
      year: selectedYear,
    },
    {
      skip: !studentId,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    },
  );

  console.log("📊 TermBasedRatingChart - API Response:", apiResponse);
  console.log("📊 TermBasedRatingChart - Selected Category:", selectedCategory);
  console.log("📊 TermBasedRatingChart - API Loading:", isLoading);
  console.log("📊 TermBasedRatingChart - Current Query Params:", {
    student_id: studentId,
    year: selectedYear,
  });

  // Force refetch when year changes
  React.useEffect(() => {
    if (studentId && selectedYear) {
      console.log("📅 Year or student changed, triggering refetch:", {
        studentId,
        selectedYear,
      });
      refetch();
    }
  }, [selectedYear, studentId, refetch]);

  // Transform API data for chart
  const chartData = useMemo(() => {
    if (!apiResponse?.success || !apiResponse?.data?.terms) {
      return null;
    }

    const terms: TermData[] = apiResponse.data.terms;
    const labels: string[] = [];
    const dataPoints: number[] = [];

    terms.forEach((term) => {
      if (selectedCategory === "overall") {
        // Show overall average for each term
        if (term.summary.total_records > 0) {
          labels.push(`Term ${term.term_number}`);
          dataPoints.push(term.summary.average_overall);
        }
      } else {
        // Show category-specific average for each term
        const selectedCategoryData = DEFAULT_CATEGORIES.find(
          (cat) => cat.id === selectedCategory,
        );

        if (selectedCategoryData) {
          const categoryInTerm = term.categories.find((cat) =>
            cat.category_name
              .toLowerCase()
              .includes(selectedCategoryData.name.toLowerCase().split(" ")[0]),
          );

          if (categoryInTerm && categoryInTerm.record_count > 0) {
            labels.push(`Term ${term.term_number}`);
            dataPoints.push(categoryInTerm.average_rating);
          }
        }
      }
    });

    // Return null if no data points
    if (dataPoints.length === 0) {
      return null;
    }

    return {
      labels,
      datasets: [
        {
          data: dataPoints,
          color: (opacity = 1) => {
            const selectedCategoryData = DEFAULT_CATEGORIES.find(
              (cat) => cat.id === selectedCategory,
            );
            const baseColor =
              selectedCategoryData?.color || maroonTheme.primary;
            return `${baseColor}${Math.round(opacity * 255).toString(16)}`;
          },
          strokeWidth: 3,
        },
        // Hidden datasets to force Y-axis scale from 0 to 5
        {
          data: [0],
          withDots: false,
          withScrollableDot: false,
          color: () => "transparent",
          strokeWidth: 0,
        },
        {
          data: [5],
          withDots: false,
          withScrollableDot: false,
          color: () => "transparent",
          strokeWidth: 0,
        },
      ],
    };
  }, [apiResponse, selectedCategory]);

  const chartConfig = {
    backgroundColor: modernColors.surface,
    backgroundGradientFrom: modernColors.surface,
    backgroundGradientTo: modernColors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => {
      const selectedCategoryData = DEFAULT_CATEGORIES.find(
        (cat) => cat.id === selectedCategory,
      );
      const baseColor = selectedCategoryData?.color || maroonTheme.primary;
      return `${baseColor}${Math.round(opacity * 255).toString(16)}`;
    },
    labelColor: (opacity = 1) =>
      `${modernColors.text}${Math.round(opacity * 255).toString(16)}`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: modernColors.surface,
    },
    propsForBackgroundLines: {
      strokeWidth: 1,
      stroke: `${modernColors.textSecondary}20`,
    },
  };

  const handleYearChange = (year: number) => {
    console.log("📅 Year changed to:", year);
    console.log("📅 Previous year was:", selectedYear);
    console.log("📅 Student ID:", studentId);
    console.log("📅 Will trigger new API call with:", {
      student_id: studentId,
      year,
    });
    setSelectedYear(year);
  };

  const handleCategoryChange = (categoryId: string) => {
    console.log("📊 Category changed to:", categoryId);
    setSelectedCategory(categoryId);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons
        name="trending-flat"
        size={48}
        color={modernColors.textSecondary}
      />
      <Text style={styles.emptyTitle}>No Data Available</Text>
      <Text style={styles.emptySubtitle}>
        No rating data found for {selectedYear}
        {selectedCategory !== "overall" && ` in the selected category`}
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={maroonTheme.primary} />
      <Text style={styles.loadingText}>Loading term data...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <MaterialIcons
        name="error-outline"
        size={48}
        color={modernColors.error}
      />
      <Text style={styles.errorTitle}>Unable to Load Data</Text>
      <Text style={styles.errorSubtitle}>
        {error && typeof error === "object" && "message" in error
          ? (error as any).message
          : "Please try again later"}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Term Performance Analytics</Text>
      <Text style={styles.subtitle}>
        Track performance trends across academic terms
      </Text>

      {/* Loading indicator for year change */}
      {isLoading && (
        <View style={styles.yearLoadingContainer}>
          <ActivityIndicator size="small" color={maroonTheme.primary} />
          <Text style={styles.yearLoadingText}>
            Loading data for {selectedYear}...
          </Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlRow}>
          <YearSelector
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
            disabled={isLoading}
          />
        </View>

        <View style={styles.controlRow}>
          <CategorySelector
            categories={DEFAULT_CATEGORIES}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            disabled={isLoading}
          />
        </View>
      </View>

      {/* Chart Container */}
      <View style={styles.chartContainer}>
        {isLoading ? (
          renderLoadingState()
        ) : isError ? (
          renderErrorState()
        ) : chartData ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartWrapper}>
              <LineChart
                data={chartData}
                width={Math.max(width - 64, chartData.labels.length * 120)}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withDots
                withShadow={false}
                withVerticalLabels
                withHorizontalLabels
                withInnerLines
                withOuterLines={false}
                fromZero
                segments={5}
                yAxisInterval={1}
                formatYLabel={(value) => `${parseFloat(value).toFixed(1)}`}
              />
            </View>
          </ScrollView>
        ) : (
          renderEmptyState()
        )}
      </View>

      {/* Stats Summary */}
      {chartData && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {chartData.datasets[0].data.length}
            </Text>
            <Text style={styles.statLabel}>Terms with Data</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {Math.max(...chartData.datasets[0].data).toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Highest Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {(
                chartData.datasets[0].data.reduce((a, b) => a + b, 0) /
                chartData.datasets[0].data.length
              ).toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Average</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: modernColors.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: modernColors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: modernColors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  yearLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: maroonTheme.primary + "10",
    borderRadius: 20,
    marginBottom: 16,
    alignSelf: "center",
  },
  yearLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: maroonTheme.primary,
    fontWeight: "600",
  },
  controlsContainer: {
    marginBottom: 20,
  },
  controlRow: {
    marginBottom: 8,
  },
  chartContainer: {
    minHeight: 240,
    justifyContent: "center",
    alignItems: "center",
  },
  chartWrapper: {
    paddingVertical: 10,
  },
  chart: {
    borderRadius: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: modernColors.textSecondary,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: modernColors.error,
    marginTop: 12,
    marginBottom: 4,
  },
  errorSubtitle: {
    fontSize: 14,
    color: modernColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: modernColors.textSecondary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: modernColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  statCard: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: maroonTheme.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: modernColors.textSecondary,
    textAlign: "center",
  },
});

export default TermBasedRatingChart;
