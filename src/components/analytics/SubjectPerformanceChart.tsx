import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Medal,
} from "lucide-react-native";
import {
  SUBJECT_COLORS,
  NEUTRAL_COLORS,
  getPerformanceColor,
} from "./analyticsTheme";

interface SubjectTermMark {
  term: string;
  mark: number | null;
  class_avg: number | null;
  student_avg: number | null;
  subject_avg: number | null;
}

interface SubjectWisePerformance {
  name: string;
  marks: SubjectTermMark[];
  rank: number | null;
  status: "Up" | "Down" | "Stable";
}

interface SubjectPerformanceChartProps {
  subjects: SubjectWisePerformance[];
  termList: string[];
  filteredTerms: string[];
}

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 112;

const SubjectPerformanceChart: React.FC<SubjectPerformanceChartProps> = ({
  subjects,
  filteredTerms,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Re-scope chart data to only filteredTerms and filter out subjects with no marks
  const yearSubjects = useMemo(() => {
    return subjects
      .map((subj) => ({
        ...subj,
        marks: subj.marks.filter((m) => filteredTerms.includes(m.term)),
      }))
      .filter((subj) => subj.marks.some((m) => m.mark != null));
  }, [subjects, filteredTerms]);

  // Per-subject, per-term marks for the selected academic year — powers the
  // "All Subjects" table at the bottom of this tab.
  const termColumns = useMemo(
    () =>
      filteredTerms.map((term) => ({
        term,
        label: term
          .replace(/^\d{4}\s*-\s*/i, "")
          .replace(/term\s*/i, "T")
          .slice(0, 6),
      })),
    [filteredTerms],
  );

  const subjectYearStats = useMemo(() => {
    return yearSubjects.map((subj, index) => {
      const termMarks = termColumns.map(({ term }) => {
        const found = subj.marks.find((m) => m.term === term);
        return {
          term,
          mark: found?.mark != null ? Number(found.mark) : null,
        };
      });
      return {
        name: subj.name,
        color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
        termMarks,
      };
    });
  }, [yearSubjects, termColumns]);

  if (!yearSubjects || yearSubjects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <BookOpen size={40} color={NEUTRAL_COLORS.classAverage} />
        <Text style={styles.emptyText}>
          No subject marks recorded for selected terms.
        </Text>
      </View>
    );
  }

  const safeIndex = Math.min(selectedIndex, yearSubjects.length - 1);
  const selected = yearSubjects[safeIndex];
  const subjectColor = SUBJECT_COLORS[safeIndex % SUBJECT_COLORS.length];

  const lineData = selected.marks
    .filter((m) => m.mark != null)
    .map((m, i) => ({
      value: Number(m.mark ?? 0),
      label:
        m.term
          .replace(/^\d{4}\s*-\s*/i, "")
          .replace(/term\s*/i, "T")
          .slice(0, 6) ?? `T${i + 1}`,
    }));

  const classAvgData = selected.marks
    .filter((m) => m.mark != null)
    .map((m) => ({
      value: Number(m.subject_avg ?? 0),
    }));

  const validMarks = selected.marks
    .map((m) => Number(m.mark ?? 0))
    .filter((v) => v > 0);
  const avgMark =
    validMarks.length > 0
      ? validMarks.reduce((a, b) => a + b, 0) / validMarks.length
      : 0;
  const minMark = validMarks.length > 0 ? Math.min(...validMarks) : 0;
  const maxMark = validMarks.length > 0 ? Math.max(...validMarks) : 0;

  const statusColor =
    selected.status === "Up"
      ? "#059669"
      : selected.status === "Down"
        ? "#DC2626"
        : "#D97706";

  const StatusIcon =
    selected.status === "Up"
      ? TrendingUp
      : selected.status === "Down"
        ? TrendingDown
        : Minus;

  return (
    <View style={styles.container}>
      {/* Subject Selector Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {yearSubjects.map((subj, index) => {
          const isActive = index === safeIndex;
          const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
          return (
            <TouchableOpacity
              key={subj.name}
              style={[
                styles.pill,
                isActive && { backgroundColor: color, borderColor: color },
              ]}
              onPress={() => setSelectedIndex(index)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.pillDot,
                  {
                    backgroundColor: isActive ? "rgba(255,255,255,0.6)" : color,
                  },
                ]}
              />
              <Text
                style={[styles.pillText, isActive && styles.pillTextActive]}
                numberOfLines={1}
              >
                {subj.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Stat Strip */}
      <View style={styles.statStrip}>
        <View style={styles.statStripItem}>
          <Text style={styles.statStripLabel}>Average</Text>
          <Text style={[styles.statStripValue, { color: subjectColor }]}>
            {avgMark.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.statStripDivider} />
        <View style={styles.statStripItem}>
          <Text style={styles.statStripLabel}>Highest</Text>
          <Text style={[styles.statStripValue, { color: "#059669" }]}>
            {maxMark.toFixed(0)}%
          </Text>
        </View>
        <View style={styles.statStripDivider} />
        <View style={styles.statStripItem}>
          <Text style={styles.statStripLabel}>Lowest</Text>
          <Text style={[styles.statStripValue, { color: "#DC2626" }]}>
            {minMark.toFixed(0)}%
          </Text>
        </View>
        <View style={styles.statStripDivider} />
        <View style={styles.statStripItem}>
          <Text style={styles.statStripLabel}>Trend</Text>
          <View style={styles.statStripTrend}>
            <StatusIcon size={14} color={statusColor} />
            <Text style={[styles.statStripTrendText, { color: statusColor }]}>
              {selected.status}
            </Text>
          </View>
        </View>
        {selected.rank != null && (
          <>
            <View style={styles.statStripDivider} />
            <View style={styles.statStripItem}>
              <Text style={styles.statStripLabel}>Rank</Text>
              <View style={styles.rankRow}>
                <Medal size={12} color="#7C3AED" />
                <Text style={[styles.statStripValue, { color: "#7C3AED" }]}>
                  #{selected.rank}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Line Chart */}
      {lineData.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={lineData}
            data2={classAvgData}
            width={Math.max(CHART_WIDTH, lineData.length * 80)}
            height={200}
            spacing={80}
            color={subjectColor}
            color2={NEUTRAL_COLORS.classAverage}
            thickness={3}
            thickness2={2}
            dataPointsColor={subjectColor}
            dataPointsColor2={NEUTRAL_COLORS.classAverage}
            dataPointsRadius={7}
            dataPointsRadius2={5}
            hideRules
            xAxisThickness={1}
            yAxisThickness={0}
            xAxisColor="#F1F5F9"
            curved
            isAnimated
            animationDuration={1000}
            areaChart
            startFillColor={subjectColor + "30"}
            endFillColor={subjectColor + "05"}
            startOpacity={0.9}
            endOpacity={0.1}
            yAxisTextStyle={{ color: "#94A3B8", fontSize: 10 }}
            xAxisLabelTextStyle={{ color: "#64748B", fontSize: 10 }}
            maxValue={100}
            noOfSections={4}
            initialSpacing={24}
            endSpacing={24}
            dataPointLabelComponent={() => null}
          />
        </ScrollView>
      ) : (
        <View style={styles.noChartData}>
          <Text style={styles.noChartDataText}>
            No marks recorded for selected terms
          </Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendLine, { backgroundColor: subjectColor }]}
          />
          <Text style={styles.legendText}>Your Mark</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendLine,
              { backgroundColor: NEUTRAL_COLORS.classAverage },
            ]}
          />
          <Text style={styles.legendText}>Class Avg</Text>
        </View>
      </View>

      {/* All Subjects — term-wise marks table for the selected academic year */}
      <View style={styles.marksListCard}>
        <Text style={styles.marksListTitle}>
          All Subjects · {subjectYearStats.length}
        </Text>

        {/* Column headers */}
        <View style={styles.tableHeaderRow}>
          <View style={styles.tableNameCol} />
          {termColumns.map((col) => (
            <Text key={col.term} style={styles.tableHeaderCell}>
              {col.label}
            </Text>
          ))}
        </View>

        {subjectYearStats.map((stat, idx) => {
          const isActive = idx === safeIndex;
          const isLast = idx === subjectYearStats.length - 1;
          return (
            <TouchableOpacity
              key={stat.name}
              style={[
                styles.tableRow,
                !isLast && styles.marksListRowBorder,
                isActive && styles.marksListRowActive,
              ]}
              onPress={() => setSelectedIndex(idx)}
              activeOpacity={0.7}
            >
              <View style={styles.tableNameCol}>
                <View
                  style={[styles.marksListDot, { backgroundColor: stat.color }]}
                />
                <Text style={styles.tableNameText} numberOfLines={1}>
                  {stat.name}
                </Text>
              </View>
              {stat.termMarks.map((tm) => (
                <Text
                  key={tm.term}
                  style={[
                    styles.tableCell,
                    {
                      color:
                        tm.mark != null
                          ? getPerformanceColor(tm.mark)
                          : "#CBD5E1",
                    },
                  ]}
                >
                  {tm.mark != null ? `${tm.mark.toFixed(0)}%` : "—"}
                </Text>
              ))}
            </TouchableOpacity>
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
  pillRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 4,
    paddingBottom: 2,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    maxWidth: 110,
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  statStrip: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statStripItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statStripLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statStripValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  statStripDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E2E8F0",
  },
  statStripTrend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statStripTrendText: {
    fontSize: 12,
    fontWeight: "700",
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  legendRow: {
    flexDirection: "row",
    gap: 18,
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendLine: {
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  noChartData: {
    paddingVertical: 32,
    alignItems: "center",
  },
  noChartDataText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  marksListCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  marksListTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  marksListRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  marksListRowActive: {
    backgroundColor: "rgba(146,7,52,0.06)",
  },
  marksListDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    marginHorizontal: -14,
    paddingHorizontal: 14,
  },
  tableNameCol: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 6,
  },
  tableNameText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
});

export default SubjectPerformanceChart;
