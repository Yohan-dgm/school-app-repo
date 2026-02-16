import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useGetEducatorFeedbackStatsQuery } from "../../../../../api/educator-feedback-api";

const { width } = Dimensions.get("window");

type PeriodType = "this_week" | "this_month" | "this_year" | null;

interface PeriodOption {
  id: PeriodType;
  label: string;
}

const periodOptions: PeriodOption[] = [
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "this_year", label: "This Year" },
  { id: null, label: "All Time" },
];

const StatsCard = ({
  title,
  value,
  icon,
  colors,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: keyof typeof MaterialIcons.glyphMap;
  colors: [string, string];
  subtitle?: string;
}) => (
  <View style={styles.statsCard}>
    <LinearGradient colors={colors} style={styles.cardGradient}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <MaterialIcons name={icon} size={20} color="white" />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <Text style={styles.cardValue}>{value}</Text>
        {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>
    </LinearGradient>
  </View>
);

const EducatorFeedbackStatsSection = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("this_month");

  const { data, isLoading, error, refetch } = useGetEducatorFeedbackStatsQuery(
    { period: selectedPeriod },
    { refetchOnMountOrArgChange: true }
  );

  // Handle error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="analytics" size={24} color="#1a1a1a" />
          <Text style={styles.sectionTitle}>Educator Feedback Statistics</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={40} color="#DC2626" />
          <Text style={styles.errorText}>Unable to load statistics</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <MaterialIcons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statsData = data?.data;
  const summary = statsData?.summary;
  const users = statsData?.users || [];

  // Get top 5 contributors
  const topContributors = users.slice(0, 5);

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <MaterialIcons name="analytics" size={24} color="#1a1a1a" />
        <Text style={styles.sectionTitle}>Educator Feedback Statistics</Text>
      </View>

      {/* Period Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterChipsContainer}
        contentContainerStyle={styles.filterChipsContent}
      >
        {periodOptions.map((option) => (
          <TouchableOpacity
            key={option.id || "all"}
            style={[
              styles.filterChip,
              selectedPeriod === option.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedPeriod(option.id)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedPeriod === option.id && styles.filterChipTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Loading State */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#920734" />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      )}

      {/* Stats Display */}
      {!isLoading && statsData && (
        <>
          {/* Period Display */}
          <View style={styles.periodDisplay}>
            <MaterialIcons name="date-range" size={16} color="#666" />
            <Text style={styles.periodText}>{summary?.filtered_period}</Text>
          </View>

          {/* Summary Cards */}
          <View style={styles.statsGrid}>
            <StatsCard
              title="Total Educators"
              value={summary?.total_users || 0}
              icon="people"
              colors={["#4F46E5", "#7C3AED"]}
              subtitle="Category 2 & 4"
            />
            <StatsCard
              title="Active"
              value={summary?.users_with_feedback || 0}
              icon="person-add"
              colors={["#059669", "#10B981"]}
              subtitle="With feedback"
            />
            <StatsCard
              title="Total Feedbacks"
              value={summary?.total_feedback_count || 0}
              icon="rate-review"
              colors={["#7C3AED", "#A855F7"]}
              subtitle="Submitted"
            />
          </View>

          {/* Top Contributors */}
          {topContributors.length > 0 && (
            <View style={styles.topContributorsSection}>
              <Text style={styles.topContributorsTitle}>Top Contributors</Text>
              <View style={styles.contributorsList}>
                {topContributors.map((user, index) => (
                  <View key={user.user_id} style={styles.contributorItem}>
                    <View style={styles.contributorRank}>
                      <Text style={styles.contributorRankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.contributorInfo}>
                      <Text style={styles.contributorName} numberOfLines={1}>
                        {user.full_name}
                      </Text>
                      <View style={styles.contributorMeta}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>
                            Category {user.user_category}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.contributorCount}>
                      <MaterialIcons name="rate-review" size={14} color="#920734" />
                      <Text style={styles.contributorCountText}>
                        {user.feedback_count}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  filterChipsContainer: {
    marginBottom: 16,
  },
  filterChipsContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  periodDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  periodText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statsCard: {
    width: (width - 56) / 3,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardGradient: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "white",
  },
  cardValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "white",
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 9,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  topContributorsSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  topContributorsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  contributorsList: {
    gap: 10,
  },
  contributorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contributorRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  contributorRankText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
  },
  contributorInfo: {
    flex: 1,
  },
  contributorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 3,
  },
  contributorMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#666",
  },
  contributorCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff5f5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#920734",
  },
  contributorCountText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#920734",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  errorContainer: {
    paddingVertical: 30,
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "600",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#920734",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});

export default EducatorFeedbackStatsSection;
