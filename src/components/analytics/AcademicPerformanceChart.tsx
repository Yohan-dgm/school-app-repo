import React from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from "lucide-react-native";
import { MAROON, STATUS_COLORS, NEUTRAL_COLORS } from "./analyticsTheme";

interface ExamReport {
  id: number;
  student_average: number | null;
  aggregate_of_mark: number | null;
  class_rank: number | null;
  class_average: number | null;
  scheduling_examination: {
    id: number;
    exam_title: string;
    term_id: number;
    term: { id: number; name: string; school_year: string } | null;
  } | null;
}

interface AcademicPerformanceChartProps {
  examReports: ExamReport[];
  selectedYear?: string;
}

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 80;
const CLASS_AVG_COLOR = NEUTRAL_COLORS.classAverage;

const AcademicPerformanceChart: React.FC<AcademicPerformanceChartProps> = ({
  examReports,
  selectedYear,
}) => {
  if (!examReports || examReports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <BarChart3 size={40} color="#D1D5DB" />
        <Text style={styles.emptyText}>
          No exam data for {selectedYear ?? "this year"}
        </Text>
      </View>
    );
  }

  const barData: any[] = [];
  examReports.forEach((report, index) => {
    const term = report.scheduling_examination?.term;
    const termName = term?.name ?? "";
    const examTitle = report.scheduling_examination?.exam_title ?? "";
    const shortLabel =
      termName.replace(/term\s*/i, "T").slice(0, 8) ||
      examTitle.slice(0, 8) ||
      `E${index + 1}`;

    const studentAvg = Number(report.student_average ?? 0);
    const classAvg = Number(report.class_average ?? 0);

    barData.push({
      value: studentAvg,
      label: shortLabel,
      frontColor: MAROON,
      gradientColor: "#C0294D",
      topLabelComponent: () => (
        <Text style={styles.barTopLabel}>{studentAvg.toFixed(0)}%</Text>
      ),
    });
    barData.push({
      value: classAvg,
      frontColor: CLASS_AVG_COLOR,
      gradientColor: "#E2E8F0",
      topLabelComponent: () => (
        <Text style={[styles.barTopLabel, { color: "#94A3B8" }]}>
          {classAvg.toFixed(0)}%
        </Text>
      ),
    });
  });

  const averages = examReports
    .map((r) => Number(r.student_average ?? 0))
    .filter((v) => v > 0);
  const trendDelta =
    averages.length >= 2 ? averages[averages.length - 1] - averages[0] : 0;
  const trendUp = trendDelta > 0;
  const trendFlat = trendDelta === 0;

  const TrendIcon = trendFlat ? Minus : trendUp ? TrendingUp : TrendingDown;
  const trendColor = trendFlat
    ? "#F59E0B"
    : trendUp
      ? STATUS_COLORS.success
      : STATUS_COLORS.danger;

  return (
    <View style={styles.container}>
      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: MAROON }]} />
          <Text style={styles.legendText}>Your Average</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: CLASS_AVG_COLOR }]}
          />
          <Text style={styles.legendText}>Class Average</Text>
        </View>
      </View>

      {/* Chart */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={barData}
          width={Math.max(CHART_WIDTH, barData.length * 30)}
          height={210}
          barWidth={24}
          spacing={6}
          groupSpacing={22}
          roundedTop
          roundedBottom
          hideRules
          xAxisThickness={1}
          yAxisThickness={0}
          xAxisColor="#F1F5F9"
          yAxisTextStyle={{ color: "#94A3B8", fontSize: 10 }}
          xAxisLabelTextStyle={{
            color: "#64748B",
            fontSize: 10,
            textAlign: "center",
          }}
          noOfSections={4}
          maxValue={100}
          isAnimated
          animationDuration={900}
          showGradient
          initialSpacing={18}
          endSpacing={18}
        />
      </ScrollView>

      {/* Trend pill */}
      <View style={[styles.trendPill, { backgroundColor: trendColor + "15" }]}>
        <TrendIcon size={15} color={trendColor} />
        <Text style={[styles.trendText, { color: trendColor }]}>
          {trendFlat
            ? "Stable trend"
            : `${trendUp ? "+" : ""}${trendDelta.toFixed(1)}% across ${selectedYear ?? "this year"}`}
        </Text>
      </View>

      {/* Per-exam summary chips */}
      <View style={styles.examSummaryRow}>
        {examReports.map((r, i) => {
          const avg = Number(r.student_average ?? 0);
          const rank = r.class_rank;
          const termName =
            r.scheduling_examination?.term?.name?.replace(/term\s*/i, "T") ??
            `E${i + 1}`;
          return (
            <View key={r.id} style={styles.examChip}>
              <Text style={styles.examChipTerm}>{termName}</Text>
              <Text style={styles.examChipAvg}>{avg.toFixed(0)}%</Text>
              {rank != null && <Text style={styles.examChipRank}>#{rank}</Text>}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },
  legendRow: {
    flexDirection: "row",
    gap: 18,
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  barTopLabel: {
    fontSize: 9,
    color: "#374151",
    fontWeight: "700",
    marginBottom: 3,
  },
  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  trendText: {
    fontSize: 13,
    fontWeight: "700",
  },
  examSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  examChip: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 2,
    alignItems: "center",
  },
  examChipTerm: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  examChipAvg: {
    fontSize: 16,
    fontWeight: "800",
    color: MAROON,
  },
  examChipRank: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7C3AED",
  },
});

export default AcademicPerformanceChart;
