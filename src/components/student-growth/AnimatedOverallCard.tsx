import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { modernColors, maroonTheme } from "../../data/studentGrowthData";

interface AnimatedOverallCardProps {
  id: string;
  title: string;
  icon: string;
  rating: number;
  level: string;
  color: string;
  description: string;
  onPress?: () => void;
  filteredPeriod?: string;
  totalRecords?: number;
}

const { width } = Dimensions.get("window");

const AnimatedOverallCard: React.FC<AnimatedOverallCardProps> = ({
  id,
  title,
  icon,
  rating,
  level,
  color,
  description,
  onPress,
  filteredPeriod,
  totalRecords,
}) => {
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [opacityAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-50));
  const [glowAnim] = useState(new Animated.Value(0));

  // Entrance animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Start continuous glow animation
    let glowLoop: Animated.CompositeAnimation | null = null;
    const startGlowAnimation = () => {
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ]),
      );
      glowLoop.start();
    };

    const timer = setTimeout(startGlowAnimation, 1000);
    return () => {
      clearTimeout(timer);
      glowLoop?.stop();
    };
  }, [rating]); // Re-trigger when rating changes; cleanup also stops the previous glow loop

  // Press animations
  const handlePressIn = () => {
    console.log("🟡 Overall card - Press IN detected");
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    console.log("🟢 Overall card - Press OUT detected");
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <MaterialIcons key={i} name="star" size={20} color="#FFD700" />,
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <MaterialIcons key={i} name="star-half" size={20} color="#FFD700" />,
        );
      } else {
        stars.push(
          <MaterialIcons
            key={i}
            name="star-border"
            size={20}
            color="#E0E0E0"
          />,
        );
      }
    }
    return stars;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => {
          console.log("🔥 Overall card - MAIN PRESS detected, calling onPress");
          onPress?.();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.touchable}
      >
        <Animated.View
          style={[
            styles.glowContainer,
            {
              shadowOpacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.15, 0.4],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={[
              maroonTheme.primary,
              maroonTheme.accent,
              maroonTheme.light,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Premium Glass Overlay */}
            <View style={styles.glassOverlay} />

            {/* Sparkle Effects */}
            <View style={styles.sparkleContainer}>
              <MaterialIcons
                name="auto-awesome"
                size={16}
                color="rgba(255, 255, 255, 0.6)"
                style={styles.sparkle1}
              />
              <MaterialIcons
                name="auto-awesome"
                size={12}
                color="rgba(255, 255, 255, 0.4)"
                style={styles.sparkle2}
              />
              <MaterialIcons
                name="auto-awesome"
                size={14}
                color="rgba(255, 255, 255, 0.5)"
                style={styles.sparkle3}
              />
            </View>

            {/* Main Content */}
            <View style={styles.contentContainer}>
              {/* Header with Icon */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name={icon as any} size={20} color="white" />
                </View>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle}>
                    {filteredPeriod && `${filteredPeriod} • `}
                    {totalRecords ? `${totalRecords} records` : "Assessment"}
                  </Text>
                </View>
              </View>

              {/* Rating Section */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
                <View style={styles.starsContainer}>{renderStars()}</View>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>{level}</Text>
                </View>
              </View>

              {/* Description */}
              {/* <Text style={styles.description} numberOfLines={2}>
                {description}
              </Text> */}
            </View>

            {/* Corner Accents */}
            <View style={styles.cornerAccentTL} />
            <View style={styles.cornerAccentBR} />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: Math.min(width - 32, 260),
    marginBottom: 1,
  },
  touchable: {
    width: "100%",
  },
  glowContainer: {
    shadowColor: maroonTheme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    borderRadius: 18,
    padding: 10,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  glassOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
  },
  sparkleContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkle1: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  sparkle2: {
    position: "absolute",
    top: 32,
    left: 24,
  },
  sparkle3: {
    position: "absolute",
    bottom: 24,
    right: 32,
  },
  contentContainer: {
    position: "relative",
    zIndex: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "white",
    marginBottom: 1,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "white",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 6,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  levelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },
  cornerAccentTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 16,
    height: 16,
    borderTopLeftRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  cornerAccentBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderBottomRightRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
});

export default React.memo(AnimatedOverallCard);
