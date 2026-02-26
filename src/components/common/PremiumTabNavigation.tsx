import React, { useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Icon from "react-native-vector-icons/Feather";
import { theme } from "../../styles/theme";
import { USER_CATEGORIES } from "../../constants/userCategories";

const { width: screenWidth } = Dimensions.get("window");

// Responsive sizing based on screen width
const getResponsiveValues = (screenWidth: number) => {
  if (screenWidth < 350) {
    // Small phones
    return {
      containerPadding: 16,
      tabContainerPadding: 6,
      iconSize: 18,
      fontSize: 10,
      height: 46,
      indicatorHeight: 38,
    };
  } else if (screenWidth < 400) {
    // Medium phones
    return {
      containerPadding: 20,
      tabContainerPadding: 8,
      iconSize: 20,
      fontSize: 11,
      height: 50,
      indicatorHeight: 42,
    };
  } else {
    // Large phones and tablets
    return {
      containerPadding: 24,
      tabContainerPadding: 8,
      iconSize: 22,
      fontSize: 12,
      height: 54,
      indicatorHeight: 46,
    };
  }
};

interface Tab {
  name: string;
  icon: string;
  label: string;
  component?: any;
}

interface PremiumTabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabPress: (tabName: string) => void;
  userCategory?: number;
}

const PremiumTabNavigation: React.FC<PremiumTabNavigationProps> = ({
  tabs,
  activeTab,
  onTabPress,
  userCategory = USER_CATEGORIES.PARENT,
}) => {
  // Filter tabs based on user category
  const getFilteredTabs = (): Tab[] => {
    const baseTabs = [
      { name: "School", icon: "book-open", label: "School" },
      { name: "Class", icon: "users", label: "Class" },
    ];

    // Only parents can see the Student tab
    if (userCategory === USER_CATEGORIES.PARENT) {
      baseTabs.push({ name: "Student", icon: "user", label: "Student" });
    }

    // Educators and Principals can see the "My Posts" tab
    if (
      userCategory === USER_CATEGORIES.EDUCATOR ||
      userCategory === USER_CATEGORIES.PRINCIPAL
    ) {
      baseTabs.push({ name: "MyPosts", icon: "file-text", label: "My Posts" });
    }

    return baseTabs;
  };

  const filteredTabs = getFilteredTabs();
  const activeIndex = filteredTabs.findIndex((tab) => tab.name === activeTab);
  const responsive = getResponsiveValues(screenWidth);
  const availableWidth =
    screenWidth - responsive.containerPadding - responsive.tabContainerPadding;
  const tabWidth = availableWidth / filteredTabs.length;

  // Animation values
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  // Individual tab animations
  const tabAnims = useRef(
    filteredTabs.reduce(
      (acc, tab) => {
        acc[tab.name] = {
          scale: new Animated.Value(tab.name === activeTab ? 1 : 0.9),
          opacity: new Animated.Value(tab.name === activeTab ? 1 : 0.7),
          iconRotate: new Animated.Value(tab.name === activeTab ? 1 : 0),
          iconScale: new Animated.Value(tab.name === activeTab ? 1.1 : 1),
          textOpacity: new Animated.Value(tab.name === activeTab ? 1 : 0.8),
        };
        return acc;
      },
      {} as Record<string, any>,
    ),
  ).current;

  useEffect(() => {
    // Animate indicator position with smooth spring
    const indicatorOffset = activeIndex * tabWidth + 4; // Add container padding offset
    Animated.spring(indicatorAnim, {
      toValue: indicatorOffset,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();

    // Animate background gradient
    Animated.timing(backgroundAnim, {
      toValue: activeIndex,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // Animate individual tabs
    filteredTabs.forEach((tab, index) => {
      const isActive = tab.name === activeTab;
      const animations = tabAnims[tab.name];

      if (animations) {
        // Scale animation with spring
        Animated.spring(animations.scale, {
          toValue: isActive ? 1 : 0.9,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();

        // Opacity animation
        Animated.timing(animations.opacity, {
          toValue: isActive ? 1 : 0.7,
          duration: 250,
          useNativeDriver: true,
        }).start();

        // Icon scale only - remove rotation for smoother effect
        Animated.timing(animations.iconRotate, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }).start();

        // Icon scale animation
        Animated.spring(animations.iconScale, {
          toValue: isActive ? 1.05 : 1,
          useNativeDriver: true,
          tension: 90,
          friction: 10,
        }).start();

        // Text opacity animation
        Animated.timing(animations.textOpacity, {
          toValue: isActive ? 1 : 0.8,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    });
  }, [activeTab, activeIndex, tabWidth, filteredTabs]);

  const handleTabPress = (tabName: string) => {
    // Add micro-interaction animation
    const animations = tabAnims[tabName];
    if (animations) {
      Animated.sequence([
        Animated.timing(animations.scale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(animations.scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
      ]).start();
    }

    onTabPress(tabName);
  };

  // Dynamic gradient colors based on active tab
  const getGradientColors = (): [string, string, ...string[]] => {
    const gradients: Record<string, [string, string, ...string[]]> = {
      School: ["#920734", "#B8094A"],
      Class: ["#6D051F", "#920734"],
      Student: ["#920734", "#D40A5C"],
      MyPosts: ["#B8094A", "#D40A5C"],
      Sports: ["#920734", "#B8094A"],
    };
    return (
      gradients[activeTab as keyof typeof gradients] || ["#920734", "#B8094A"]
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingHorizontal: responsive.containerPadding / 2 },
      ]}
    >
      {/* Background with blur effect */}
      <BlurView intensity={20} style={styles.blurBackground}>
        <LinearGradient
          colors={["rgba(146,7,52,0.05)", "rgba(146,7,52,0.02)"]}
          style={styles.gradientBackground}
        />
      </BlurView>

      {/* Tab Container */}
      <View
        style={[
          styles.tabContainer,
          {
            height: responsive.height,
            padding: responsive.tabContainerPadding / 2,
          },
        ]}
      >
        {/* Animated Indicator Background */}
        <Animated.View
          style={[
            styles.indicatorBackground,
            {
              width: tabWidth - 8,
              height: responsive.indicatorHeight,
              transform: [{ translateX: indicatorAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={getGradientColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.indicatorGradient}
          />
        </Animated.View>

        {/* Tab Buttons */}
        {filteredTabs.map((tab, index) => {
          const animations = tabAnims[tab.name];
          const isActive = tab.name === activeTab;

          if (!animations) return null;

          const iconRotation = animations.iconRotate.interpolate({
            inputRange: [0, 1],
            outputRange: ["0deg", "360deg"],
          });

          return (
            <Animated.View
              key={tab.name}
              style={[
                styles.tabButtonContainer,
                {
                  width: tabWidth,
                  transform: [{ scale: animations.scale }],
                  opacity: animations.opacity,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => handleTabPress(tab.name)}
                activeOpacity={0.8}
              >
                {/* Icon Container with Animation */}
                <Animated.View
                  style={[
                    styles.iconContainer,
                    {
                      transform: [
                        { scale: animations.iconScale },
                        { rotate: isActive ? iconRotation : "0deg" },
                      ],
                    },
                  ]}
                >
                  <Icon
                    name={tab.icon}
                    size={responsive.iconSize}
                    color={isActive ? "#FFFFFF" : "#666666"}
                    style={styles.tabIcon}
                  />

                  {/* Active state glow effect */}
                  {isActive && (
                    <Animated.View style={styles.iconGlow}>
                      <Icon
                        name={tab.icon}
                        size={responsive.iconSize}
                        color="rgba(255,255,255,0.3)"
                      />
                    </Animated.View>
                  )}
                </Animated.View>

                {/* Text Label with Animation */}
                <Animated.Text
                  style={[
                    styles.tabLabel,
                    {
                      opacity: animations.textOpacity,
                      color: isActive ? "#FFFFFF" : "#666666",
                      fontSize: responsive.fontSize,
                    },
                  ]}
                >
                  {tab.label}
                </Animated.Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Bottom highlight line */}
      <Animated.View
        style={[
          styles.bottomHighlight,
          {
            width: tabWidth - 16,
            transform: [{ translateX: Animated.add(indicatorAnim, 8) }],
          },
        ]}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.highlightGradient}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    paddingTop: 8,
    paddingBottom: 6,
    position: "relative",
  },
  blurBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    overflow: "hidden",
  },
  gradientBackground: {
    flex: 1,
    borderRadius: 28,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "transparent",
    borderRadius: 16,
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  indicatorBackground: {
    position: "absolute",
    borderRadius: 12,
    top: 4,
    left: 3,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  indicatorGradient: {
    flex: 1,
    borderRadius: 12,
  },
  tabButtonContainer: {
    flex: 1,
    zIndex: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: "relative",
    minHeight: 42,
  },
  iconContainer: {
    marginBottom: -2,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    width: 24,
    height: 24,
  },
  tabIcon: {
    zIndex: 2,
  },
  iconGlow: {
    position: "absolute",
    top: 2,
    left: 2,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    fontFamily: theme.fonts.bold,
    letterSpacing: 0.3,
    lineHeight: 13,
    marginTop: 1,
  },
  activeDot: {
    position: "absolute",
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  dotGradient: {
    flex: 1,
    borderRadius: 3,
  },
  bottomHighlight: {
    position: "absolute",
    left: 9,
    bottom: 0,
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  highlightGradient: {
    flex: 1,
    borderRadius: 2,
  },
});

export default PremiumTabNavigation;
