import React from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import {
  CalendarCheck,
  CalendarX,
  AlertTriangle,
  CheckCircle2,
  Percent,
} from "lucide-react-native";
import { STATUS_COLORS } from "./analyticsTheme";

interface AttendanceSummaryItem {
  term: string;
  present: number;
  absent: number;
}

interface AttendanceAnalyticsChartProps {
  attendanceSummary: AttendanceSummaryItem[];
  selectedYear?: string;
}

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 112;
const PRESENT_COLOR = STATUS_COLORS.success;
const ABSENT_COLOR = STATUS_COLORS.danger;

const AttendanceAnalyticsChart: React.FC<AttendanceAnalyticsChartProps> = ({
  attendanceSummary,
}) => {
  if (!attendanceSummary || attendanceSummary.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <CalendarCheck size={40} color="#CBD5E1" />
        <Text style={styles.emptyText}>No attendance data available</Text>
      </View>
    );
  }

  const totalPresent = attendanceSummary.reduce(
    (s, item) => s + item.present,
    0,
  );
  const totalAbsent = attendanceSummary.reduce((s, item) => s + item.absent, 0);
  const totalDays = totalPresent + totalAbsent;
  const attendanceRate = totalDays > 0 ? (totalPresent / totalDays) * 100 : 100;
  const rateDisplay = attendanceRate.toFixed(1);
  const isLow = attendanceRate < 80;
  const isMid = attendanceRate >= 80 && attendanceRate < 90;

  const rateColor = isLow ? ABSENT_COLOR : isMid ? "#D97706" : PRESENT_COLOR;

  // Build grouped bar data
  const barData: any[] = [];
  attendanceSummary.forEach((item) => {
    const shortTerm = item.term.replace(/term\s*/i, "T").slice(0, 8);
    barData.push({
      value: item.present,
      label: shortTerm,
      frontColor: PRESENT_COLOR,
      gradientColor: "#34D399",
      topLabelComponent: () => (
        <Text style={[styles.barLabel, { color: PRESENT_COLOR }]}>
          {item.present}
        </Text>
      ),
    });
    barData.push({
      value: item.absent,
      frontColor: ABSENT_COLOR,
      gradientColor: "#FCA5A5",
      topLabelComponent: () => (
        <Text style={[styles.barLabel, { color: ABSENT_COLOR }]}>
          {item.absent}
        </Text>
      ),
    });
  });

  const maxVal = Math.max(
    ...attendanceSummary.map((i) => Math.max(i.present, i.absent)),
    10,
  );

  return (
    <View style={styles.container}>
      {/* Rate Hero */}
      <View style={[styles.rateHero, { borderColor: rateColor + "30" }]}>
        <View
          style={[styles.rateCircle, { backgroundColor: rateColor + "15" }]}
        >
          <Percent size={20} color={rateColor} />
        </View>
        <View style={styles.rateInfo}>
          <Text style={[styles.rateValue, { color: rateColor }]}>
            {rateDisplay}%
          </Text>
          <Text style={styles.rateLabel}>Attendance Rate</Text>
        </View>
        {isLow ? (
          <View
            style={[styles.rateStatusBadge, { backgroundColor: "#FEE2E2" }]}
          >
            <AlertTriangle size={12} color={ABSENT_COLOR} />
            <Text style={[styles.rateStatusText, { color: ABSENT_COLOR }]}>
              Low
            </Text>
          </View>
        ) : isMid ? (
          <View
            style={[styles.rateStatusBadge, { backgroundColor: "#FEF3C7" }]}
          >
            <AlertTriangle size={12} color="#D97706" />
            <Text style={[styles.rateStatusText, { color: "#D97706" }]}>
              Fair
            </Text>
          </View>
        ) : (
          <View
            style={[styles.rateStatusBadge, { backgroundColor: "#D1FAE5" }]}
          >
            <CheckCircle2 size={12} color={PRESENT_COLOR} />
            <Text style={[styles.rateStatusText, { color: PRESENT_COLOR }]}>
              Great
            </Text>
          </View>
        )}
      </View>

      {/* Attendance progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${attendanceRate}%` as any,
                backgroundColor: rateColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: rateColor }]}>
          {totalPresent} present / {totalDays} days
        </Text>
      </View>

      {/* Summary pills */}
      <View style={styles.pillsRow}>
        <View
          style={[styles.summaryPill, { borderColor: PRESENT_COLOR + "40" }]}
        >
          <CalendarCheck size={18} color={PRESENT_COLOR} strokeWidth={1.8} />
          <Text style={[styles.pillValue, { color: PRESENT_COLOR }]}>
            {totalPresent}
          </Text>
          <Text style={styles.pillLabel}>Days Present</Text>
        </View>
        <View
          style={[styles.summaryPill, { borderColor: ABSENT_COLOR + "40" }]}
        >
          <CalendarX size={18} color={ABSENT_COLOR} strokeWidth={1.8} />
          <Text style={[styles.pillValue, { color: ABSENT_COLOR }]}>
            {totalAbsent}
          </Text>
          <Text style={styles.pillLabel}>Days Absent</Text>
        </View>
      </View>

      {/* Warning */}
      {isLow && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={15} color="#92400E" />
          <Text style={styles.warningText}>
            Attendance below 80% significantly impacts academic performance.
          </Text>
        </View>
      )}

      {/* Chart */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={barData}
          width={Math.max(CHART_WIDTH, barData.length * 28)}
          height={200}
          barWidth={24}
          spacing={8}
          groupSpacing={22}
          roundedTop
          roundedBottom
          hideRules
          xAxisThickness={1}
          yAxisThickness={0}
          xAxisColor="#F1F5F9"
          yAxisTextStyle={{ color: "#94A3B8", fontSize: 10 }}
          xAxisLabelTextStyle={{ color: "#64748B", fontSize: 10 }}
          noOfSections={4}
          maxValue={Math.ceil(maxVal / 10) * 10 + 10}
          isAnimated
          animationDuration={900}
          showGradient
          initialSpacing={16}
          endSpacing={16}
        />
      </ScrollView>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: PRESENT_COLOR }]}
          />
          <Text style={styles.legendText}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: ABSENT_COLOR }]} />
          <Text style={styles.legendText}>Absent</Text>
        </View>
      </View>

      {/* Per-term breakdown */}
      <View style={styles.termBreakdown}>
        {attendanceSummary.map((item, idx) => {
          const total = item.present + item.absent;
          const rate = total > 0 ? (item.present / total) * 100 : 100;
          const barColor =
            rate < 80 ? ABSENT_COLOR : rate < 90 ? "#D97706" : PRESENT_COLOR;
          return (
            <View
              key={item.term}
              style={[
                styles.termBreakdownRow,
                idx < attendanceSummary.length - 1 &&
                  styles.termBreakdownBorder,
              ]}
            >
              <Text style={styles.termBreakdownLabel}>{item.term}</Text>
              <View style={styles.termBreakdownBarWrap}>
                <View style={styles.termBreakdownBarBg}>
                  <View
                    style={[
                      styles.termBreakdownBarFill,
                      {
                        width: `${rate}%` as any,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.termBreakdownRate, { color: barColor }]}>
                  {rate.toFixed(0)}%
                </Text>
              </View>
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
  },
  rateHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  rateCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  rateInfo: {
    flex: 1,
  },
  rateValue: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  rateLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
    marginTop: 2,
  },
  rateStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  rateStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressSection: {
    gap: 6,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  pillsRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryPill: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
  },
  pillValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  pillLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    fontWeight: "500",
    lineHeight: 18,
  },
  barLabel: {
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 3,
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
  termBreakdown: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  termBreakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  termBreakdownBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  termBreakdownLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    width: 72,
  },
  termBreakdownBarWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  termBreakdownBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  termBreakdownBarFill: {
    height: 6,
    borderRadius: 3,
  },
  termBreakdownRate: {
    fontSize: 12,
    fontWeight: "700",
    width: 36,
    textAlign: "right",
  },
});

export default AttendanceAnalyticsChart;
