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
import { DashboardItem } from "../PrincipalDashboardMain";

// Minimal theme colors
const COLORS = {
  darkMaroon: "#920734",
  black: "#000000",
  white: "#FFFFFF",
  lightGray: "#F5F5F5",
  darkGray: "#333333",
  mediumGray: "#666666",
};

const { width } = Dimensions.get("window");
const CARD_MARGIN = 10;
const CARDS_PER_ROW = 2;
const CARD_WIDTH =
  (width - 40 - (CARDS_PER_ROW - 1) * CARD_MARGIN * 2) / CARDS_PER_ROW;

interface DashboardGridProps {
  items: DashboardItem[];
  onFullScreenPress?: (itemId: string) => void;
}

const DashboardCard: React.FC<{
  item: DashboardItem;
  index: number;
  onFullScreenPress?: (itemId: string) => void;
}> = ({ item, index, onFullScreenPress }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 500 + index * 100,
    });
  }, []);

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    console.log(`🎯 Dashboard item "${item.title}" (${item.id}) clicked`);

    // Use item's custom onPress if it exists, otherwise use onFullScreenPress
    if (item.onPress) {
      console.log(`✅ Using custom onPress for "${item.title}"`);
      item.onPress();
    } else if (onFullScreenPress) {
      console.log(`📋 Using onFullScreenPress for "${item.title}"`);
      onFullScreenPress(item.id);
    } else {
      console.log(`⚠️ No handler found for "${item.title}"`);
    }
  };

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        style={styles.cardTouchable}
      >
        <LinearGradient
          colors={[COLORS.darkMaroon, COLORS.black]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          <View style={styles.card}>
            {/* Icon Container */}
            <View style={styles.iconContainer}>
              <MaterialIcons
                name={item.icon}
                size={28}
                color={COLORS.darkMaroon}
              />
            </View>

            {/* Content */}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            </View>

            {/* Arrow Icon */}
            <View style={styles.arrowContainer}>
              <MaterialIcons
                name="arrow-forward-ios"
                size={14}
                color={COLORS.darkMaroon}
              />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const DashboardGrid: React.FC<DashboardGridProps> = ({
  items,
  onFullScreenPress,
}) => {
  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <DashboardCard
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
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 20,
  },
  cardTouchable: {
    width: "100%",
  },
  gradientBorder: {
    borderRadius: 12,
    padding: 1, // This creates the border thickness
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  card: {
    height: 126, // Reduced to account for gradient border padding
    borderRadius: 10,
    padding: 18,
    backgroundColor: COLORS.white,
    position: "relative",
    overflow: "hidden",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.black,
    marginBottom: 4,
    lineHeight: 18,
  },
  cardSubtitle: {
    fontSize: 11,
    color: COLORS.mediumGray,
    fontWeight: "400",
  },
  arrowContainer: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default DashboardGrid;
