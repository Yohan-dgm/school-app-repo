import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { modernColors, maroonTheme } from "../../data/studentGrowthData";

interface IntelligenceCardProps {
  id: string;
  title: string;
  icon: string;
  rating: number;
  level: string;
  color: string;
  description: string;
  onPress?: () => void;
  cardIndex: number;
  useMaroonTheme?: boolean;
}

const IntelligenceCard: React.FC<IntelligenceCardProps> = ({
  id,
  title,
  icon,
  rating,
  level,
  color,
  description,
  onPress,
  cardIndex,
  useMaroonTheme = false,
}) => {
  // Entrance and floating animations
  const [scaleAnim] = useState(new Animated.Value(1));
  const [rotateXAnim] = useState(new Animated.Value(0));
  const [floatAnim] = useState(new Animated.Value(0));

  // Separate press interaction animations
  const [pressScaleAnim] = useState(new Animated.Value(1));
  const [pressRotateXAnim] = useState(new Animated.Value(0));
  const [pressRotateYAnim] = useState(new Animated.Value(0));

  // 3D entrance animation
  useEffect(() => {
    const delay = cardIndex * 100; // Staggered animation

    // Entry animation sequence
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(rotateXAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Floating animation
    let floatLoop: Animated.CompositeAnimation | null = null;
    const startFloating = () => {
      floatLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 3000 + cardIndex * 200,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 3000 + cardIndex * 200,
            useNativeDriver: true,
          }),
        ]),
      );
      floatLoop.start();
    };

    const floatTimeout = setTimeout(startFloating, delay + 800);
    return () => {
      clearTimeout(floatTimeout);
      floatLoop?.stop();
    };
  }, [cardIndex]);

  // Enhanced press animations with 3D effects - using separate press values
  const handlePressIn = () => {
    Animated.parallel([
      Animated.timing(pressScaleAnim, {
        toValue: 1.08,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pressRotateXAnim, {
        toValue: 5,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pressRotateYAnim, {
        toValue: 3,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(pressScaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(pressRotateXAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pressRotateYAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Generate star rating display
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <MaterialIcons key={i} name="star" size={14} color={color} />,
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <MaterialIcons key={i} name="star-half" size={14} color={color} />,
        );
      } else {
        stars.push(
          <MaterialIcons
            key={i}
            name="star-border"
            size={14}
            color="#E0E0E0"
          />,
        );
      }
    }
    return (
      <View style={styles.starsContainer}>
        <View style={styles.starsRow}>{stars}</View>
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  // Create enhanced gradient colors with more depth
  const gradientColors = [
    color + "35",
    color + "15",
    "#FFFFFF",
    "rgba(255, 255, 255, 0.95)",
  ];

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          transform: [
            {
              translateY: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -4],
              }),
            },
            // Combine entrance and press scale
            {
              scale: Animated.multiply(scaleAnim, pressScaleAnim),
            },
            // Combine entrance and press rotations
            {
              rotateX: Animated.add(
                rotateXAnim,
                pressRotateXAnim.interpolate({
                  inputRange: [0, 10],
                  outputRange: [0, 10],
                }),
              ).interpolate({
                inputRange: [0, 10],
                outputRange: ["0deg", "10deg"],
              }),
            },
            {
              rotateY: pressRotateYAnim.interpolate({
                inputRange: [0, 10],
                outputRange: ["0deg", "10deg"],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.touchableCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={styles.glowContainer}>
          <LinearGradient
            colors={gradientColors}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Enhanced glassmorphism overlay with multiple layers */}
            <View style={styles.glassOverlay} />
            <View style={styles.deepBlurOverlay} />

            {/* Icon Container */}
            <View
              style={[styles.iconContainer, { backgroundColor: color + "15" }]}
            >
              <MaterialIcons name={icon as any} size={24} color={color} />
            </View>

            {/* Intelligence Title */}
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            {/* Star Rating Display */}
            <View style={styles.ratingContainer}>{renderStars()}</View>

            {/* Level Indicator */}
            <View
              style={[styles.levelIndicator, { backgroundColor: color + "20" }]}
            >
              <Text style={[styles.levelText, { color: color }]}>{level}</Text>
            </View>

            {/* Premium accent border */}
            <View style={[styles.accentBorder, { backgroundColor: color }]} />
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    marginBottom: 10,
    marginHorizontal: 3,
  },
  touchableCard: {
    width: "100%",
    height: "100%",
  },
  glowContainer: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 12,
  },
  card: {
    height: 130,
    borderRadius: 18,
    padding: 12,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  glassOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(20px)",
  },
  deepBlurOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(30px)",
  },
  depthLayer: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    zIndex: -1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: modernColors.text,
    marginBottom: 6,
    lineHeight: 14,
    textAlign: "left",
  },
  ratingContainer: {
    marginBottom: 6,
  },
  starsContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 1,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: "700",
    color: modernColors.text,
    minWidth: 24,
    textAlign: "center",
  },
  levelIndicator: {
    paddingHorizontal: 6,
    // paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "center",
  },
  levelText: {
    fontSize: 7.5,
    paddingBottom: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  accentBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 4,
    height: "100%",
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
});

export default React.memo(IntelligenceCard);
