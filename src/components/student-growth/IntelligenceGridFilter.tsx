import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { modernColors, maroonTheme } from "../../data/studentGrowthData";

interface FilterOption {
  id: string;
  label: string;
  active: boolean;
  actualValue?: string; // For backend - stores actual year value
}

interface IntelligenceGridFilterProps {
  onFilterChange?: (filterId: string, actualValue?: string) => void;
  selectedFilter?: string;
}

// Academic year utility functions
const getCurrentAcademicYear = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-based (0 = January, 8 = September)

  if (currentMonth >= 8) {
    // September or later (month 8+)
    return `${currentYear}/${String(currentYear + 1).slice(-2)}`;
  } else {
    // Before September
    return `${currentYear - 1}/${String(currentYear).slice(-2)}`;
  }
};

const getCurrentYear = () => {
  return new Date().getFullYear();
};

const getYearOptions = (): FilterOption[] => {
  const now = new Date();
  const currentYear = getCurrentYear();
  const currentAcademicYear = getCurrentAcademicYear();
  const currentMonth = now.toLocaleDateString("en-US", { month: "short" });

  const options: FilterOption[] = [
    {
      id: "all",
      label: "All",
      active: false,
      actualValue: "all",
    },
    // Add current academic year
    {
      id: currentYear.toString(),
      label: currentAcademicYear,
      active: false,
      actualValue: currentYear.toString(),
    },
    // Add current month
    {
      id: "current-month",
      label: `${currentMonth} ${currentYear}`,
      active: false,
      actualValue: "current-month",
    },
  ];

  return options;
};

// Dynamic filter generation based on current date
const getCurrentFilters = (): FilterOption[] => {
  return getYearOptions();
};

const IntelligenceGridFilter: React.FC<IntelligenceGridFilterProps> = ({
  onFilterChange,
  selectedFilter: externalSelectedFilter,
}) => {
  const [internalSelectedFilter, setInternalSelectedFilter] = useState("all"); // Default to "All"
  const [scaleAnim] = useState(new Animated.Value(1));
  const selectedFilter = externalSelectedFilter || internalSelectedFilter;

  // Get dynamic filters
  const intelligenceGridFilters = getCurrentFilters();

  const handleFilterPress = (filterId: string) => {
    // Add spring animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    setInternalSelectedFilter(filterId);

    // Find the filter option to get the actualValue for backend
    const selectedOption = intelligenceGridFilters.find(
      (filter) => filter.id === filterId,
    );
    onFilterChange?.(filterId, selectedOption?.actualValue);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.buttonContainer}>
        {intelligenceGridFilters.map((filter) => {
          const isSelected = selectedFilter === filter.id;

          if (isSelected) {
            return (
              <LinearGradient
                key={filter.id}
                colors={[maroonTheme.primary, maroonTheme.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.selectedButtonGradient}
              >
                <TouchableOpacity
                  style={styles.selectedButton}
                  onPress={() => handleFilterPress(filter.id)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.selectedButtonText}>{filter.label}</Text>
                </TouchableOpacity>
              </LinearGradient>
            );
          }

          return (
            <TouchableOpacity
              key={filter.id}
              style={styles.unselectedButton}
              onPress={() => handleFilterPress(filter.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.unselectedButtonText}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 12,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 25,
    padding: 3,
    shadowColor: maroonTheme.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(128, 0, 0, 0.1)",
    minWidth: 280,
    maxWidth: 320, // Adjusted for 3 options: All, Academic Year, Current Month
  },
  selectedButtonGradient: {
    borderRadius: 22,
    marginHorizontal: 1,
    minWidth: 80, // Increased to accommodate academic year format
  },
  selectedButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  selectedButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  unselectedButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    marginHorizontal: 1,
    minWidth: 80, // Increased to accommodate academic year format
  },
  unselectedButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: modernColors.textSecondary,
    letterSpacing: 0.2,
  },
});

export default React.memo(IntelligenceGridFilter);
