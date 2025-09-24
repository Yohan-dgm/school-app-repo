import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  ActivityIndicator,
  Platform,
} from "react-native";
import IntelligenceCard from "./IntelligenceCard";
import IntelligenceGridFilter from "./IntelligenceGridFilter";
import MovingDotsBackground from "./MovingDotsBackground";
import { useGetStudentRatingsQuery } from "../../api/student-growth-api";
import {
  transformFilterToApiParam,
  getCompleteIntelligenceCards,
  transformApiToOverallRating,
  createEmptyIntelligenceCards,
  createEmptyOverallRating,
  FilterResult,
} from "../../utils/studentGrowthTransform";
import AnimatedOverallCard from "./AnimatedOverallCard";
import ChartDrawer from "./ChartDrawer";
import { modernColors, maroonTheme } from "../../data/studentGrowthData";

interface IntelligenceGridViewProps {
  onCardSelect?: (intelligence: any) => void;
  studentId?: number;
}

const { width } = Dimensions.get("window");

const IntelligenceGridView: React.FC<IntelligenceGridViewProps> = ({
  onCardSelect,
  studentId,
}) => {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [chartDrawerVisible, setChartDrawerVisible] = useState(false);

  // Transform filter to API parameters
  const filterResult: FilterResult = transformFilterToApiParam(selectedFilter);

  // API query for student ratings
  const {
    data: apiResponse,
    isLoading,
    isError,
    error,
  } = useGetStudentRatingsQuery(
    {
      student_id: studentId!,
      ...(filterResult.year && { year: filterResult.year }),
      ...(filterResult.month && { month: filterResult.month }),
      // For 'all' type, no additional parameters are added
    },
    {
      skip: !studentId, // Skip query if no studentId provided
      refetchOnMountOrArgChange: true,
    },
  );

  // Get intelligence cards - API-first approach, no dummy data
  const intelligenceCards = React.useMemo(() => {
    if (!studentId) {
      console.log("📊 No student selected, returning empty cards");
      return [];
    }

    let cards = [];
    if (apiResponse?.success) {
      console.log("📊 Using API data for intelligence cards");
      cards = getCompleteIntelligenceCards(apiResponse);
    } else if (isError) {
      console.log("📊 API error, creating empty cards with 0 ratings");
      cards = createEmptyIntelligenceCards();
    } else if (!isLoading) {
      console.log(
        "📊 No API data available, creating empty cards with 0 ratings",
      );
      cards = createEmptyIntelligenceCards();
    } else {
      return []; // Loading state
    }

    // Filter out cards that have "No Data" level to hide cards with missing data
    const filteredCards = cards.filter((card) => card.level !== "No Data");

    console.log(
      `📊 Filtered out ${cards.length - filteredCards.length} cards with 'No Data' level`,
    );
    console.log(`📊 Displaying ${filteredCards.length} cards with actual data`);

    return filteredCards;
  }, [apiResponse, studentId, isError, isLoading]);

  // Get overall rating data - API-first approach, no dummy data
  const overallRating = React.useMemo(() => {
    if (!studentId) {
      console.log("📊 No student selected, returning empty overall rating");
      return createEmptyOverallRating();
    }

    if (apiResponse?.success) {
      console.log("📊 Using API data for overall rating");
      return transformApiToOverallRating(apiResponse);
    } else if (isError) {
      console.log("📊 API error, creating empty overall rating with 0 rating");
      return createEmptyOverallRating();
    } else if (!isLoading) {
      console.log(
        "📊 No API data available, creating empty overall rating with 0 rating",
      );
      return createEmptyOverallRating();
    }

    return createEmptyOverallRating(); // Default fallback
  }, [apiResponse, studentId, isError, isLoading]);

  const handleCardPress = useCallback(
    (intelligence: any) => {
      // Check if this is the overall card
      if (intelligence.id === "overall") {
        console.log("🎯 Opening chart drawer with data:");
        console.log("🎯 overallRating:", overallRating);
        console.log("🎯 intelligenceCards:", intelligenceCards);
        console.log("🎯 selectedFilter:", selectedFilter);
        console.log("🚪 Setting chartDrawerVisible to true");
        setChartDrawerVisible(true);
      } else {
        onCardSelect?.(intelligence);
      }
    },
    [onCardSelect, overallRating, intelligenceCards, selectedFilter],
  );

  const handleChartDrawerClose = useCallback(() => {
    console.log("🚪 Closing chart drawer");
    setChartDrawerVisible(false);
  }, []);

  const handleFilterChange = useCallback(
    (filterId: string, actualValue?: string) => {
      setSelectedFilter(filterId);
      console.log(
        "📊 Intelligence Grid Filter changed to:",
        filterId,
        "| Backend value:",
        actualValue,
      );
    },
    [],
  );

  // Split cards into rows of 3 with center alignment for last row
  const getCardRows = () => {
    const rows = [];
    for (let i = 0; i < intelligenceCards.length; i += 3) {
      const row = intelligenceCards.slice(i, i + 3);
      const isLastRow = i + 3 >= intelligenceCards.length;
      const isIncompleteRow = row.length < 3;

      rows.push({
        cards: row,
        isLastRow,
        isIncompleteRow,
        shouldCenter: isLastRow && isIncompleteRow,
      });
    }
    return rows;
  };

  const cardRows = getCardRows();

  // Loading state
  if (isLoading && studentId) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={[styles.sectionTitle, { color: maroonTheme.primary }]}>
            Intelligence Assessment
          </Text>
          <Text style={styles.sectionSubtitle}>
            Loading student intelligence data...
          </Text>
        </View>
        <IntelligenceGridFilter
          onFilterChange={handleFilterChange}
          selectedFilter={selectedFilter}
        />
        <View style={[styles.gridContainer, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={maroonTheme.primary} />
          <Text style={styles.loadingText}>Fetching latest ratings...</Text>
        </View>
      </View>
    );
  }

  // No special error state - let the main render handle it with empty cards

  return (
    <View style={styles.container}>
      {/* Section Header */}
      {/* <View style={styles.headerContainer}>
        <Text style={[styles.sectionTitle, { color: maroonTheme.primary }]}>
          Intelligence Assessment
        </Text>
        <Text style={styles.sectionSubtitle}>
          Detailed view of all 13 intelligence areas
        </Text>
      </View> */}

      {/* Filter Section */}
      <IntelligenceGridFilter
        onFilterChange={handleFilterChange}
        selectedFilter={selectedFilter}
      />

      {/* Overall Rating Card - Top Section */}
      <View style={styles.overallCardContainer}>
        <AnimatedOverallCard
          id={overallRating.id}
          title={overallRating.title}
          icon={overallRating.icon}
          rating={overallRating.rating}
          level={overallRating.level}
          color={overallRating.color}
          description={overallRating.description}
          onPress={() => handleCardPress(overallRating)}
          filteredPeriod={overallRating.filteredPeriod}
          totalRecords={overallRating.totalRecords}
        />
      </View>

      {/* Cards Grid with Enhanced Animated Background */}
      <View style={styles.gridContainer}>
        <MovingDotsBackground numberOfDots={12} animationDuration={4000} />
        {cardRows.map((rowData, rowIndex) => (
          <View
            key={rowIndex}
            style={[styles.cardRow, rowData.shouldCenter && styles.centeredRow]}
          >
            {rowData.cards.map((intelligence, cardIndex) => (
              <View key={intelligence.id} style={styles.cardWrapper}>
                <IntelligenceCard
                  id={intelligence.id}
                  title={intelligence.title}
                  icon={intelligence.icon}
                  rating={intelligence.rating}
                  level={intelligence.level}
                  color={intelligence.color}
                  description={intelligence.description}
                  cardIndex={rowIndex * 3 + cardIndex}
                  onPress={() => handleCardPress(intelligence)}
                />
              </View>
            ))}
            {/* Fill empty spaces in last row only if not centering */}
            {!rowData.shouldCenter &&
              rowData.cards.length < 3 &&
              Array.from({ length: 3 - rowData.cards.length }).map(
                (_, emptyIndex) => (
                  <View
                    key={`empty-${emptyIndex}`}
                    style={[styles.emptyCard, { width: (width - 80) / 3 }]}
                  />
                ),
              )}
          </View>
        ))}
      </View>

      {/* Chart Drawer */}
      <ChartDrawer
        visible={chartDrawerVisible}
        overallData={overallRating}
        categoriesData={intelligenceCards}
        currentFilter={selectedFilter}
        onClose={handleChartDrawerClose}
        onFilterChange={handleFilterChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 2,
    marginVertical: 8,
  },
  headerContainer: {
    marginBottom: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: modernColors.text,
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: 0.5,
    textShadowColor: "rgba(128, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: modernColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
    opacity: 0.8,
  },
  overallCardContainer: {
    marginHorizontal: 12,
    marginBottom: 10,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: maroonTheme.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  gridContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    position: "relative",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 4,
    width: "100%",
    zIndex: 1,
  },
  centeredRow: {
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 20,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: (width - 40) / 3,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  emptyCard: {
    height: 130,
    opacity: 0,
    flex: 1,
    maxWidth: (width - 80) / 3,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: modernColors.textSecondary,
    textAlign: "center",
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    color: modernColors.error,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default React.memo(IntelligenceGridView);
