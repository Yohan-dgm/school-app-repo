import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import FullScreenModal from "../components/FullScreenModal";
import { useGetEducatorFeedbackStatsQuery } from "../../../../../api/educator-feedback-api";

const { width } = Dimensions.get("window");

type PeriodType = "this_week" | "this_month" | "this_year" | null;

interface PeriodOption {
  id: PeriodType;
  label: string;
}

interface EducatorFeedbackStatsModalProps {
  visible: boolean;
  onClose: () => void;
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

const EducatorFeedbackStatsModal: React.FC<EducatorFeedbackStatsModalProps> = ({
  visible,
  onClose,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("this_month");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error, refetch } = useGetEducatorFeedbackStatsQuery(
    { period: selectedPeriod },
    { skip: !visible, refetchOnMountOrArgChange: true }
  );

  const statsData = data?.data;
  const summary = statsData?.summary;
  const users = statsData?.users || [];

  // Filter users based on search query
  const filteredUsers = users.filter((user) =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <FullScreenModal
      visible={visible}
      onClose={onClose}
      title="Educator Feedback Statistics"
      backgroundColor="#f8f9fa"
    >
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Period Filter Chips */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Select Period:</Text>
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
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#920734" />
            <Text style={styles.loadingText}>Loading statistics...</Text>
          </View>
        )}

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color="#DC2626" />
            <Text style={styles.errorText}>Unable to load statistics</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetch}>
              <MaterialIcons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Display */}
        {!isLoading && !error && statsData && (
          <>
            {/* Period Display */}
            <View style={styles.periodDisplay}>
              <MaterialIcons name="date-range" size={18} color="#666" />
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
                title="Total Feedbacks"
                value={summary?.total_feedback_count || 0}
                icon="rate-review"
                colors={["#7C3AED", "#A855F7"]}
                subtitle="Submitted"
              />
            </View>

            {/* Search Bar */}
            <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search contributors..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <MaterialIcons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* All Contributors List */}
            <View style={styles.contributorsSection}>
              <View style={styles.contributorsHeader}>
                <Text style={styles.contributorsTitle}>
                  All Contributors ({filteredUsers.length})
                </Text>
                {searchQuery && (
                  <Text style={styles.searchResultText}>
                    Found {filteredUsers.length} of {users.length}
                  </Text>
                )}
              </View>

              {filteredUsers.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="search-off" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>
                    {searchQuery
                      ? "No contributors found matching your search"
                      : "No contributors available"}
                  </Text>
                </View>
              ) : (
                <View style={styles.contributorsList}>
                  {filteredUsers.map((user, index) => (
                    <View key={user.user_id} style={styles.contributorItem}>
                      <View style={styles.contributorRank}>
                        <Text style={styles.contributorRankText}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={styles.contributorInfo}>
                        <Text
                          style={styles.contributorName}
                          numberOfLines={1}
                        >
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
                        <MaterialIcons
                          name="rate-review"
                          size={14}
                          color="#920734"
                        />
                        <Text style={styles.contributorCountText}>
                          {user.feedback_count}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </FullScreenModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 10,
  },
  filterChipsContainer: {
    marginBottom: 0,
  },
  filterChipsContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  periodDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  periodText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    height: 110,
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
    padding: 12,
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
    fontSize: 22,
    fontWeight: "900",
    color: "white",
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 9,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  searchSection: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1a1a1a",
  },
  contributorsSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  contributorsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  contributorsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  searchResultText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  contributorsList: {
    gap: 12,
  },
  contributorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  contributorRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  contributorRankText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
  },
  contributorInfo: {
    flex: 1,
  },
  contributorName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  contributorMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
  },
  contributorCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff5f5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#920734",
  },
  contributorCountText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#920734",
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  errorContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    fontWeight: "600",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#920734",
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
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});

export default EducatorFeedbackStatsModal;
