import { Awards } from "../constants/awards.js";

/**
 * BADGE UTILITIES
 *
 * This file contains utilities for matching achievement titles
 * with badge images and handling badge display logic.
 */

// Badge image mapping - maps award titles to exact PNG filenames in assets
const BADGE_IMAGE_MAPPING = {
  "Best Attendance Award": "Best Attendance Award.png",
  "Most Helpful Student": "Helping Hand.png",
  "Best Role Model": "Best Role Model.png",
  "Positive Attitude Award": "Positive Attitude Award.png",
  "Kindness Award": "Kindness Award.png",
  "Best Team Player": "Best Team Player.png",
  "Most Responsible Student": "Most Responsible Student.png",
  "Creativity Award": "Creativity Award.png",
  "Innovation Award": "Creativity Award.png", // No exact match, using Creativity Award
  "Best Leadership Award": "Best Leadership Award.png",
  "Respectful Student Award": "Best Role Model.png", // No exact match, using Best Role Model
  "Hardworking Award": "Hardworking Award.png",
  "Perseverance Award": "Perseverance Award.png",
  "Best Communicator": "Best Communicator.png",
  "Cultural Spirit Award": "Best Role Model.png", // No exact match, using Best Role Model
  "Green Ambassador Award": "Best Role Model.png", // No exact match, using Best Role Model
  "Best Dressed / Neatness Award": "Best Role Model.png", // No exact match, using Best Role Model
  "Digital Excellence Award": "Best Role Model.png", // No exact match, using Best Role Model
  "Library Star Award": "Best Role Model.png", // No exact match, using Best Role Model
  "Best Debater / Orator Award": "Best Role Model.png", // No exact match, using Best Role Model
  "Best Performer in Extracurriculars": "Best Role Model.png", // No exact match, using Best Role Model
  "Silent Achiever Award": "Best Role Model.png", // No exact match, using Best Role Model
  "Inspirational Student Award": "Best Role Model.png", // No exact match, using Best Role Model
  "Best Peer Mentor Award": "Best Role Model.png", // No exact match, using Best Role Model
  "Dedication to School Award": "Best Role Model.png", // No exact match, using Best Role Model
  "Athletic Star": "athletic star.png",
  "High Flyer in Sport": "High flyer in sport.png",
};

// Available badge images in assets (all 14 PNG files)
const AVAILABLE_BADGE_IMAGES = {
  "Best Attendance Award.png": require("../assets/Badges/Best Attendance Award.png"),
  "Best Communicator.png": require("../assets/Badges/Best Communicator.png"),
  "Best Leadership Award.png": require("../assets/Badges/Best Leadership Award.png"),
  "Best Role Model.png": require("../assets/Badges/Best Role Model.png"),
  "Best Team Player.png": require("../assets/Badges/Best Team Player.png"),
  "Creativity Award.png": require("../assets/Badges/Creativity Award.png"),
  "Hardworking Award.png": require("../assets/Badges/Hardworking Award.png"),
  "Helping Hand.png": require("../assets/Badges/Helping Hand.png"),
  "Kindness Award.png": require("../assets/Badges/Kindness Award.png"),
  "Leadership.png": require("../assets/Badges/Leadership.png"),
  "Most Responsible Student.png": require("../assets/Badges/Most Responsible Student.png"),
  "Perseverance Award.png": require("../assets/Badges/Perseverance Award.png"),
  "Positive Attitude Award.png": require("../assets/Badges/Positive Attitude Award.png"),
  "athletic star.png": require("../assets/Badges/athletic star.png"),
  "High flyer in sport.png": require("../assets/Badges/High flyer in sport.png"),
};

// Default fallback badge for unmapped achievements
const DEFAULT_BADGE_IMAGE = require("../assets/Badges/Positive Attitude Award.png");

/**
 * Find matching award in the Awards JSON by title (case-insensitive)
 * @param {string} achievementTitle - Title from API achievement
 * @returns {Object|null} - Matching award object or null if not found
 */
export const findMatchingAward = (achievementTitle) => {
  if (!achievementTitle || typeof achievementTitle !== "string") {
    return null;
  }

  const normalizedTitle = achievementTitle.toLowerCase().trim();

  return (
    Awards.special_awards.find(
      (award) => award.title.toLowerCase().trim() === normalizedTitle,
    ) || null
  );
};

/**
 * Get badge image for an achievement title
 * @param {string} achievementTitle - Title from API achievement
 * @returns {any} - React Native image source (require statement result)
 */
export const getBadgeImage = (achievementTitle) => {
  if (!achievementTitle || typeof achievementTitle !== "string") {
    return DEFAULT_BADGE_IMAGE;
  }

  // 1. First try exact direct mapping
  const mappedFilename = BADGE_IMAGE_MAPPING[achievementTitle];
  if (mappedFilename && AVAILABLE_BADGE_IMAGES[mappedFilename]) {
    return AVAILABLE_BADGE_IMAGES[mappedFilename];
  }

  // 2. Try case-insensitive exact match with PNG extension
  const exactMatch = `${achievementTitle}.png`;
  if (AVAILABLE_BADGE_IMAGES[exactMatch]) {
    return AVAILABLE_BADGE_IMAGES[exactMatch];
  }

  // 3. Try partial match - check if any available badge filename contains the achievement title
  const availableKeys = Object.keys(AVAILABLE_BADGE_IMAGES);
  const normalizedTitle = achievementTitle.toLowerCase().trim();

  const partialMatch = availableKeys.find((key) => {
    const normalizedKey = key.toLowerCase().replace(".png", "").trim();
    return (
      normalizedKey.includes(normalizedTitle) ||
      normalizedTitle.includes(normalizedKey)
    );
  });

  if (partialMatch) {
    return AVAILABLE_BADGE_IMAGES[partialMatch];
  }

  // 4. Try word-based matching for compound titles
  const titleWords = normalizedTitle.split(/\s+/);
  const wordMatch = availableKeys.find((key) => {
    const keyWords = key.toLowerCase().replace(".png", "").split(/\s+/);
    return (
      titleWords.some((word) => keyWords.includes(word)) ||
      keyWords.some((word) => titleWords.includes(word))
    );
  });

  if (wordMatch) {
    return AVAILABLE_BADGE_IMAGES[wordMatch];
  }

  // 5. Return default badge if no match found
  console.warn(
    `⚠️ No badge image found for achievement: "${achievementTitle}"`,
  );
  return DEFAULT_BADGE_IMAGE;
};

/**
 * Transform API achievement to badge format for UI display
 * @param {Object} achievement - Achievement object from API
 * @returns {Object} - Badge object formatted for UI
 */
export const transformAchievementToBadge = (achievement) => {
  const matchingAward = findMatchingAward(achievement.title);
  const badgeImage = getBadgeImage(achievement.title);

  return {
    id: achievement.id,
    apiId: achievement.id,
    name: achievement.title,
    title:
      achievement.description ||
      matchingAward?.description ||
      achievement.title,
    image: badgeImage,
    color: "#8B0000", // Default maroon color
    bgColor: "#F5E6E8", // Light maroon background
    achievementType: achievement.achievement_type,
    startDate: achievement.start_date,
    endDate: achievement.end_date,
    isActive: achievement.is_active,
    durationDays: achievement.duration_days,
    // Add metadata for debugging
    matched: !!matchingAward,
    originalTitle: achievement.title,
    matchedAward: matchingAward,
  };
};

/**
 * Filter and transform API achievements to badges
 * @param {Array} achievements - Array of achievements from API
 * @returns {Array} - Array of badge objects for UI display
 */
export const transformAchievementsToBadges = (achievements) => {
  if (!achievements || !Array.isArray(achievements)) {
    return [];
  }

  return achievements
    .filter((achievement) => achievement.is_active) // Only show active achievements
    .map(transformAchievementToBadge)
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate)); // Sort by most recent first
};

/**
 * Validate if an achievement title has a corresponding badge image
 * @param {string} achievementTitle - Title from API achievement
 * @returns {Object} - Validation result with details
 */
export const validateBadgeMapping = (achievementTitle) => {
  if (!achievementTitle || typeof achievementTitle !== "string") {
    return {
      isValid: false,
      method: "none",
      filename: null,
      fallback: true,
    };
  }

  // Check direct mapping
  const mappedFilename = BADGE_IMAGE_MAPPING[achievementTitle];
  if (mappedFilename && AVAILABLE_BADGE_IMAGES[mappedFilename]) {
    return {
      isValid: true,
      method: "direct_mapping",
      filename: mappedFilename,
      fallback: false,
    };
  }

  // Check exact match
  const exactMatch = `${achievementTitle}.png`;
  if (AVAILABLE_BADGE_IMAGES[exactMatch]) {
    return {
      isValid: true,
      method: "exact_match",
      filename: exactMatch,
      fallback: false,
    };
  }

  // Check partial match
  const availableKeys = Object.keys(AVAILABLE_BADGE_IMAGES);
  const normalizedTitle = achievementTitle.toLowerCase().trim();

  const partialMatch = availableKeys.find((key) => {
    const normalizedKey = key.toLowerCase().replace(".png", "").trim();
    return (
      normalizedKey.includes(normalizedTitle) ||
      normalizedTitle.includes(normalizedKey)
    );
  });

  if (partialMatch) {
    return {
      isValid: true,
      method: "partial_match",
      filename: partialMatch,
      fallback: false,
    };
  }

  // Check word-based match
  const titleWords = normalizedTitle.split(/\s+/);
  const wordMatch = availableKeys.find((key) => {
    const keyWords = key.toLowerCase().replace(".png", "").split(/\s+/);
    return (
      titleWords.some((word) => keyWords.includes(word)) ||
      keyWords.some((word) => titleWords.includes(word))
    );
  });

  if (wordMatch) {
    return {
      isValid: true,
      method: "word_match",
      filename: wordMatch,
      fallback: false,
    };
  }

  return {
    isValid: false,
    method: "none",
    filename: null,
    fallback: true,
  };
};

/**
 * Get comprehensive badge mapping report for all awards
 * @returns {Object} - Complete mapping report
 */
export const getBadgeMappingReport = () => {
  const report = {
    totalAwards: Awards.special_awards.length,
    totalBadgeFiles: Object.keys(AVAILABLE_BADGE_IMAGES).length,
    mappings: [],
    unmappedAwards: [],
    unusedBadgeFiles: [],
  };

  // Check each award
  Awards.special_awards.forEach((award) => {
    const validation = validateBadgeMapping(award.title);
    report.mappings.push({
      awardTitle: award.title,
      ...validation,
    });

    if (!validation.isValid || validation.fallback) {
      report.unmappedAwards.push(award.title);
    }
  });

  // Find unused badge files
  const usedFiles = new Set();
  report.mappings.forEach((mapping) => {
    if (mapping.filename) {
      usedFiles.add(mapping.filename);
    }
  });

  report.unusedBadgeFiles = Object.keys(AVAILABLE_BADGE_IMAGES).filter(
    (filename) => !usedFiles.has(filename),
  );

  return report;
};

/**
 * Get all available badges from assets folder with their titles
 * @returns {Array} - Array of badge objects with filename, title, and image
 */
export const getAllAvailableBadges = () => {
  return Object.keys(AVAILABLE_BADGE_IMAGES)
    .map((filename) => {
      // Remove .png extension and format as title
      const title = filename.replace(".png", "");

      return {
        filename,
        title,
        image: AVAILABLE_BADGE_IMAGES[filename],
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title)); // Sort alphabetically
};

/**
 * Get badge statistics for debugging
 * @param {Array} achievements - Array of achievements from API
 * @returns {Object} - Statistics object
 */
export const getBadgeStatistics = (achievements) => {
  if (!achievements || !Array.isArray(achievements)) {
    return {
      total: 0,
      active: 0,
      matched: 0,
      unmatched: 0,
    };
  }

  const badges = transformAchievementsToBadges(achievements);
  const matched = badges.filter((badge) => badge.matched);
  const unmatched = badges.filter((badge) => !badge.matched);

  return {
    total: achievements.length,
    active: badges.length,
    matched: matched.length,
    unmatched: unmatched.length,
    matchedTitles: matched.map((b) => b.originalTitle),
    unmatchedTitles: unmatched.map((b) => b.originalTitle),
    validationResults: badges.map((badge) => ({
      title: badge.originalTitle,
      validation: validateBadgeMapping(badge.originalTitle),
    })),
  };
};
