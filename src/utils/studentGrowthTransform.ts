import type {
  StudentGrowthApiResponse,
  CategoryRating,
  IntelligenceCardData,
  OverallRatingData,
  CategoryMapping,
} from "../types/student-growth";

/**
 * Data Transformation Utilities for Student Growth API
 *
 * Converts backend API responses to frontend component data structures
 */

// Category mapping from backend names to frontend intelligence cards
export const CATEGORY_MAPPING: CategoryMapping = {
  "Music Intelligence": {
    id: "music",
    icon: "music-note",
    color: "#06B6D4",
    description: "Sensitivity to rhythm, pitch, and musical patterns",
  },
  "Bodily Kinesthetic Intelligence": {
    id: "bodily_kinesthetic",
    icon: "directions-run",
    color: "#10B981",
    description: "Physical movement and body coordination skills",
  },
  "Existential intelligence": {
    id: "existential",
    icon: "quiz",
    color: "#EC4899",
    description: "Understanding of existence and philosophical thinking",
  },
  "Existential Intelligence": {
    id: "existential",
    icon: "quiz",
    color: "#EC4899",
    description: "Understanding of existence and philosophical thinking",
  },
  "Spatial Intelligence": {
    id: "spatial",
    icon: "3d-rotation",
    color: "#8B5A3C",
    description: "Visual-spatial processing and artistic abilities",
  },
  "Naturalistic Intelligence": {
    id: "naturalistic",
    icon: "nature",
    color: "#059669",
    description: "Understanding of nature and environmental awareness",
  },
  "Contribution to school Community": {
    id: "school_community",
    icon: "school",
    color: "#7C3AED",
    description: "Active participation in school activities and community",
  },
  "Contribution to School Community": {
    id: "school_community",
    icon: "school",
    color: "#7C3AED",
    description: "Active participation in school activities and community",
  },
  "Contribution to Society": {
    id: "society",
    icon: "public",
    color: "#DB2777",
    description: "Social responsibility and community service",
  },
  "Life Skills Development": {
    id: "lifeskills",
    icon: "build",
    color: "#DC2626",
    description: "Development of practical life skills and independence",
  },
  // Additional mappings for other potential categories
  "Linguistic Intelligence": {
    id: "linguistic",
    icon: "record-voice-over",
    color: "#F59E0B",
    description: "Language skills and verbal communication",
  },
  "Mathematical / Logical Intelligence": {
    id: "mathematical_logical",
    icon: "calculate",
    color: "#EF4444",
    description: "Mathematical reasoning and logical thinking",
  },
  "Intrapersonal Intelligence": {
    id: "intrapersonal",
    icon: "psychology",
    color: "#8B5CF6",
    description: "Self-awareness and understanding of one's own emotions",
  },
  "Interpersonal Intelligence": {
    id: "interpersonal",
    icon: "groups",
    color: "#3B82F6",
    description: "Understanding and interacting effectively with others",
  },
  "Attendance and Punctuality": {
    id: "attendance",
    icon: "schedule",
    color: "#0891B2",
    description: "Regular attendance and punctuality to school",
  },
};

/**
 * Get level and color based on rating
 */
export const getLevelFromRating = (
  rating: number,
): { level: string; color: string } => {
  if (rating >= 4.5) return { level: "Excellent", color: "#4CAF50" };
  if (rating >= 3.5) return { level: "Good", color: "#2196F3" };
  if (rating >= 2.5) return { level: "Needs Attention", color: "#FF9800" };
  return { level: "At-Risk Level", color: "#F44336" };
};

/**
 * Transform API category to intelligence card data
 */
export const transformCategoryToCard = (
  category: CategoryRating,
  index: number,
): IntelligenceCardData | null => {
  const mapping = CATEGORY_MAPPING[category.category_name];

  if (!mapping) {
    console.warn(
      `⚠️ No mapping found for category: "${category.category_name}"`,
    );
    return null;
  }

  const level = getLevelFromRating(category.average_rating);

  return {
    id: `${mapping.id}_${category.category_id}_${index}`, // Ensure unique ID
    title: category.category_name,
    icon: mapping.icon,
    rating: category.average_rating,
    level: level.level,
    color: mapping.color,
    // description: mapping.description,
    trend: [category.average_rating], // Single point trend for now
    classAverage: category.average_rating, // Use same rating as class average
    recordCount: category.record_count,
  };
};

/**
 * Transform API response to intelligence cards data
 */
export const transformApiToIntelligenceCards = (
  apiResponse: StudentGrowthApiResponse,
): IntelligenceCardData[] => {
  if (!apiResponse.success || !apiResponse.data?.categories) {
    console.error("❌ Invalid API response structure");
    return [];
  }

  const cards: IntelligenceCardData[] = [];

  apiResponse.data.categories.forEach((category, index) => {
    const card = transformCategoryToCard(category, index);
    if (card) {
      cards.push(card);
    }
  });

  console.log(
    `📊 Transformed ${cards.length} categories to intelligence cards`,
  );
  return cards;
};

/**
 * Transform API response to overall rating data
 */
export const transformApiToOverallRating = (
  apiResponse: StudentGrowthApiResponse,
): OverallRatingData => {
  if (!apiResponse.success || !apiResponse.data?.summary) {
    console.log("📊 No API summary found, creating empty overall rating");
    return createEmptyOverallRating();
  }

  const summary = apiResponse.data.summary;
  const level = getLevelFromRating(summary.average_overall);

  return {
    id: "overall",
    title: "Overall Intelligence Rating",
    icon: "analytics",
    rating: summary.average_overall,
    level: level.level,
    color: "#6366F1",
    // description: "Comprehensive assessment across all intelligence areas",
    trend: [summary.average_overall], // Single point trend for now
    classAverage: summary.average_overall, // Use same rating as class average
    totalRecords: summary.total_records,
    filteredPeriod: summary.filtered_period,
  };
};

/**
 * Get missing categories (categories that exist in mapping but not in API response)
 */
export const getMissingCategories = (
  apiCategories: CategoryRating[],
): IntelligenceCardData[] => {
  const apiCategoryNames = apiCategories.map((cat) => cat.category_name);
  const allCategoryNames = Object.keys(CATEGORY_MAPPING);

  const missingCategories = allCategoryNames.filter(
    (name) => !apiCategoryNames.includes(name),
  );

  return missingCategories.map((categoryName, index) => {
    const mapping = CATEGORY_MAPPING[categoryName];
    return {
      id: `${mapping.id}_missing_${index}`, // Ensure unique ID for missing categories
      title: categoryName,
      icon: mapping.icon,
      rating: 0,
      level: "No Data",
      color: mapping.color,
      // description: mapping.description,
      trend: [0],
      classAverage: 0,
      recordCount: 0,
    };
  });
};

/**
 * Create empty intelligence cards with 0 ratings for all categories
 */
export const createEmptyIntelligenceCards = (): IntelligenceCardData[] => {
  const allCategoryNames = Object.keys(CATEGORY_MAPPING);

  return allCategoryNames.map((categoryName, index) => {
    const mapping = CATEGORY_MAPPING[categoryName];
    return {
      id: `${mapping.id}_empty_${index}`,
      title: categoryName,
      icon: mapping.icon,
      rating: 0,
      level: "No Data",
      color: mapping.color,
      // description: mapping.description,
      trend: [0],
      classAverage: 0,
      recordCount: 0,
    };
  });
};

/**
 * Create empty overall rating data
 */
export const createEmptyOverallRating = (): OverallRatingData => {
  return {
    id: "overall",
    title: "Overall Intelligence Rating",
    icon: "analytics",
    rating: 0,
    level: "No Data",
    color: "#6366F1",
    // description: "No assessment data available",
    trend: [0],
    classAverage: 0,
    totalRecords: 0,
    filteredPeriod: "No data",
  };
};

/**
 * Get complete intelligence cards list (API data + missing categories)
 */
export const getCompleteIntelligenceCards = (
  apiResponse: StudentGrowthApiResponse,
): IntelligenceCardData[] => {
  if (
    !apiResponse.success ||
    !apiResponse.data?.categories ||
    apiResponse.data.categories.length === 0
  ) {
    console.log("📊 No API categories found, creating empty cards");
    return createEmptyIntelligenceCards();
  }

  const apiCards = transformApiToIntelligenceCards(apiResponse);
  const missingCards = getMissingCategories(apiResponse.data.categories);

  return [...apiCards, ...missingCards];
};

/**
 * Filter result type for API parameters
 */
export interface FilterResult {
  type: "year" | "month" | "all";
  year?: number;
  month?: number;
}

/**
 * Transform filter period to API parameter object
 */
export const transformFilterToApiParam = (filter: string): FilterResult => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthId = now.getMonth() + 1; // Month ID: 1-12

  switch (filter) {
    case "current-year":
      return { type: "year", year: currentYear };
    case "current-month":
      return { type: "month", year: currentYear, month: currentMonthId }; // Send both year and month
    case "all":
      return { type: "all" }; // No additional parameters
    default:
      // Check if filter is a year (e.g., "2025", "2024", etc.)
      const yearMatch = filter.match(/^\d{4}$/);
      if (yearMatch) {
        const filterYear = parseInt(filter, 10);
        return { type: "year", year: filterYear };
      }
      // Fallback to all
      return { type: "all" };
  }
};
