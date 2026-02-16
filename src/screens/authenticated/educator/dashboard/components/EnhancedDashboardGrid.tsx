import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 10;
const CARDS_PER_ROW = 1; // Changed from 2 to 1 - one card per row
const CARD_WIDTH = width - 40; // Full width minus horizontal padding

// Pastel gradient colors for each card type (like insurance app)
const CARD_COLORS: Record<
  string,
  { gradient: [string, string]; iconColor: string }
> = {
  my_class: {
    gradient: ["#E9D5FF", "#DDD6FE"], // Purple
    iconColor: "#9333EA",
  },
  all_students: {
    gradient: ["#DBEAFE", "#BFDBFE"], // Blue
    iconColor: "#2563EB",
  },
  all_teachers: {
    gradient: ["#FCE7F3", "#FBCFE8"], // Pink
    iconColor: "#EC4899",
  },
  educator_feedback: {
    gradient: ["#FED7AA", "#FDBA74"], // Orange
    iconColor: "#EA580C",
  },
  student_attendance: {
    gradient: ["#D1FAE5", "#A7F3D0"], // Green
    iconColor: "#059669",
  },
  student_attendance_stats: {
    gradient: ["#E0E7FF", "#C7D2FE"], // Indigo
    iconColor: "#4F46E5",
  },
  student_feedback_stats: {
    gradient: ["#CCFBF1", "#99F6E4"], // Teal
    iconColor: "#0D9488",
  },
  my_feedback: {
    gradient: ["#FFE4E6", "#FECDD3"], // Rose
    iconColor: "#E11D48",
  },
  // Principal Dashboard Cards
  all_students: {
    gradient: ["#DBEAFE", "#BFDBFE"], // Blue
    iconColor: "#2563EB",
  },
  all_teachers: {
    gradient: ["#FCE7F3", "#FBCFE8"], // Pink
    iconColor: "#EC4899",
  },
  class_teachers: {
    gradient: ["#FEF3C7", "#FDE68A"], // Yellow
    iconColor: "#F59E0B",
  },
  sectional_heads: {
    gradient: ["#E0E7FF", "#C7D2FE"], // Indigo
    iconColor: "#4F46E5",
  },
  educator_feedback_stats: {
    gradient: ["#CCFBF1", "#99F6E4"], // Teal
    iconColor: "#0D9488",
  },
};

interface DashboardItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  gradient: [string, string];
  onPress: () => void;
}

interface EnhancedDashboardGridProps {
  items: DashboardItem[];
  onFullScreenPress?: (itemId: string) => void;
}

const EnhancedDashboardCard: React.FC<{
  item: DashboardItem;
  index: number;
  onFullScreenPress?: (itemId: string) => void;
}> = ({ item, index, onFullScreenPress }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  // Get color scheme for this card
  const colorScheme = CARD_COLORS[item.id] || {
    gradient: ["#F3F4F6", "#E5E7EB"],
    iconColor: "#6B7280",
  };

  React.useEffect(() => {
    // Stagger animation on mount
    opacity.value = withTiming(1, {
      duration: 500 + index * 80,
    });
  }, []);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    if (item.onPress) {
      item.onPress();
    } else if (onFullScreenPress) {
      onFullScreenPress(item.id);
    }
  };

  return (
    <Animated.View style={[styles.cardWrapper, animatedCardStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.cardTouchable}
      >
        {/* Clean white card */}
        <View style={styles.card}>
          {/* Pastel gradient icon container */}
          <LinearGradient
            colors={colorScheme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <MaterialIcons
              name={item.icon}
              size={26}
              color={colorScheme.iconColor}
            />
          </LinearGradient>

          {/* Content */}
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const EnhancedDashboardGrid: React.FC<EnhancedDashboardGridProps> = ({
  items,
  onFullScreenPress,
}) => {
  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <EnhancedDashboardCard
          key={item.id}
          item={item}
          index={index}
          onFullScreenPress={onFullScreenPress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    gap: 12,
  },
  cardWrapper: {
    width: "100%",
    marginBottom: 0,
  },
  cardTouchable: {
    width: "100%",
  },
  // Clean white card (insurance app style)
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  // Pastel gradient icon container
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  // Content
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
    lineHeight: 20,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "400",
  },
});

export default EnhancedDashboardGrid;
