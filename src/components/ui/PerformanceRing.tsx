import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { modernTheme } from "../../styles/modernTheme";

interface PerformanceRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  label?: string;
  color?: string;
  delay?: number;
  animated?: boolean;
}

export const PerformanceRing: React.FC<PerformanceRingProps> = ({
  percentage,
  size = 80,
  strokeWidth = 8,
  showLabel = true,
  label = "Performance",
  color,
  delay = 0,
  animated = true,
}) => {
  const progress = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Determine color based on performance
  const getPerformanceColor = () => {
    if (color) return color;
    if (percentage >= 85) return modernTheme.colors.gradeA;
    if (percentage >= 70) return modernTheme.colors.gradeB;
    if (percentage >= 55) return modernTheme.colors.gradeC;
    if (percentage >= 40) return modernTheme.colors.gradeD;
    return modernTheme.colors.gradeF;
  };

  const performanceColor = getPerformanceColor();

  useEffect(() => {
    if (animated) {
      // Entry animation
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(progress, {
            toValue: percentage / 100,
            duration: 1200,
            useNativeDriver: false,
          }),
        ]).start();
      }, delay);

      return () => clearTimeout(timer);
    } else {
      scale.setValue(1);
      opacity.setValue(1);
      progress.setValue(percentage / 100);
    }
  }, [percentage, delay, animated]);

  const animatedContainerStyle = {
    transform: [{ scale }],
    opacity,
  };

  // Calculate stroke dash offset based on percentage
  const strokeDashoffset = circumference * (1 - percentage / 100);

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      <View style={[styles.ring, { width: size, height: size }]}>
        <Svg width={size} height={size} style={styles.svg}>
          <Defs>
            <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={performanceColor} stopOpacity="1" />
              <Stop
                offset="100%"
                stopColor={performanceColor}
                stopOpacity="0.6"
              />
            </LinearGradient>
          </Defs>

          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={modernTheme.colors.borderLight}
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#gradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>

        {/* Center content */}
        <View style={styles.centerContent}>
          <Animated.Text style={[styles.percentage, { opacity }]}>
            {Math.round(percentage)}%
          </Animated.Text>
          {showLabel && (
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  ring: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    position: "absolute",
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  percentage: {
    fontSize: modernTheme.fontSizes.title,
    fontFamily: modernTheme.fonts.heading,
    color: modernTheme.colors.text,
    textAlign: "center",
  },
  label: {
    fontSize: modernTheme.fontSizes.small,
    fontFamily: modernTheme.fonts.caption,
    color: modernTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
    maxWidth: 60,
  },
});
