import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import LinearGradient from "react-native-linear-gradient";
import { modernTheme } from "../../styles/modernTheme";

const { width } = Dimensions.get("window");

interface Tab {
  id: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

interface ModernTabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabPress: (tabId: string) => void;
  style?: any;
}

export const ModernTabBar: React.FC<ModernTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
  style,
}) => {
  const indicatorPosition = useSharedValue(0);
  const tabWidth = (width - 48) / tabs.length; // 48 for padding

  useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
    indicatorPosition.value = withSpring(activeIndex * tabWidth, {
      damping: 15,
      stiffness: 100,
    });
  }, [activeTab, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value }],
  }));

  const TabButton = ({ tab, index }: { tab: Tab; index: number }) => {
    const isActive = activeTab === tab.id;
    const scale = useSharedValue(1);
    const iconScale = useSharedValue(1);

    const animatedButtonStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const animatedIconStyle = useAnimatedStyle(() => ({
      transform: [{ scale: iconScale.value }],
    }));

    const handlePressIn = () => {
      scale.value = withSpring(0.95);
      iconScale.value = withSpring(1.1);
    };

    const handlePressOut = () => {
      scale.value = withSpring(1);
      iconScale.value = withSpring(1);
    };

    const handlePress = () => {
      onTabPress(tab.id);
      // Haptic feedback would go here if available
    };

    return (
      <Animated.View style={[styles.tabButton, animatedButtonStyle]}>
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.tabTouchable}
          activeOpacity={0.8}
        >
          <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
            <MaterialIcons
              name={tab.icon}
              size={20}
              color={
                isActive
                  ? modernTheme.colors.primary
                  : modernTheme.colors.textSecondary
              }
            />
          </Animated.View>
          <Text
            style={[
              styles.tabLabel,
              {
                color: isActive
                  ? modernTheme.colors.primary
                  : modernTheme.colors.textSecondary,
                fontFamily: isActive
                  ? modernTheme.fonts.title
                  : modernTheme.fonts.body,
              },
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.tabBar}>
        {/* Animated indicator */}
        <Animated.View
          style={[styles.indicator, indicatorStyle, { width: tabWidth }]}
        >
          <LinearGradient
            colors={[
              modernTheme.colors.primary,
              modernTheme.colors.primaryLight,
            ]}
            style={styles.indicatorGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </Animated.View>

        {/* Tab buttons */}
        {tabs.map((tab, index) => (
          <TabButton key={tab.id} tab={tab} index={index} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: modernTheme.spacing.xl,
    paddingVertical: modernTheme.spacing.md,
    backgroundColor: modernTheme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: modernTheme.colors.border,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: modernTheme.colors.surface,
    borderRadius: modernTheme.borderRadius.xl,
    padding: 4,
    position: "relative",
    ...modernTheme.shadows.md,
  },
  indicator: {
    position: "absolute",
    top: 4,
    height: 40,
    borderRadius: modernTheme.borderRadius.lg,
    zIndex: 0,
  },
  indicatorGradient: {
    flex: 1,
    borderRadius: modernTheme.borderRadius.lg,
  },
  tabButton: {
    flex: 1,
    zIndex: 1,
  },
  tabTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: modernTheme.spacing.sm,
    paddingHorizontal: modernTheme.spacing.md,
    height: 40,
  },
  iconContainer: {
    marginRight: modernTheme.spacing.xs,
  },
  tabLabel: {
    fontSize: modernTheme.fontSizes.caption,
    textAlign: "center",
  },
});
