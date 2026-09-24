import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { theme } from "../../styles/theme";
import { NavigationConfig, NavigationTab } from "../../config/navigationConfig";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

interface DynamicBottomNavigationProps {
  navigationConfig: NavigationConfig;
  activeTab?: string;
  onTabPress: (tabId: string) => void;
  badgedTabIds?: string[];
}

const DynamicBottomNavigation: React.FC<DynamicBottomNavigationProps> = ({
  navigationConfig,
  activeTab,
  onTabPress,
  badgedTabIds,
}) => {
  const animatedValue = useSharedValue(0);
  const scaleValue = useSharedValue(1);
  const insets = useSafeAreaInsets();

  const currentActiveTab = activeTab || navigationConfig.defaultTab;

  const handleTabPress = (tabId: string) => {
    // Animate tab press with scale effect using reanimated
    animatedValue.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 150 }),
    );

    // Scale animation for pressed tab
    scaleValue.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 }),
    );

    onTabPress?.(tabId);
  };

  const renderTab = (tab: NavigationTab, index: number) => {
    const isActive = currentActiveTab === tab.id;

    // Get the appropriate icon component based on iconFamily
    let IconComponent;
    let iconProps = {
      size: 24,
      color: isActive ? "#FFFFFF" : "black",
    };

    if (tab.iconFamily === "MaterialCommunityIcons") {
      IconComponent = MaterialCommunityIcons;
      iconProps = {
        name: tab.icon as any,
        size: 24,
        color: isActive ? "#FFFFFF" : "black",
      };
    } else {
      // Default to MaterialIcons
      IconComponent = MaterialIcons;
      iconProps = {
        name: tab.icon as any,
        size: 24,
        color: isActive ? "#FFFFFF" : "black",
      };
    }

    // Create animated styles using reanimated
    const animatedTabStyle = useAnimatedStyle(() => ({
      transform: [{ scale: isActive ? 1.08 : 1 }],
      backgroundColor: isActive ? theme.colors.primary : "white",
    }));

    const showBadge = badgedTabIds?.includes(tab.id);

    return (
      <TouchableOpacity
        key={tab.id}
        style={styles.tabContainer}
        onPress={() => handleTabPress(tab.id)}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.tabItem, animatedTabStyle]}>
          <IconComponent {...iconProps} />
          {showBadge && <View style={styles.tabBadgeDot} />}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      <BlurView intensity={35} tint="dark" style={styles.navigationBar}>
        <View style={styles.navigationContent}>
          {navigationConfig.tabs.map((tab, index) => renderTab(tab, index))}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: -12,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
  },
  navigationBar: {
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
        shadowColor: "#000",
      },
    }),
  },
  navigationContent: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  tabContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "white",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBadgeDot: {
    position: "absolute",
    top: 6,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DC2626",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
});

export default DynamicBottomNavigation;
