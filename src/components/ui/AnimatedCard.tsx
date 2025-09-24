import React, { useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Animated,
} from "react-native";
// import { BlurView } from '@react-native-community/blur';
import LinearGradient from "react-native-linear-gradient";
import { modernTheme } from "../../styles/modernTheme";

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: "glass" | "solid" | "gradient";
  elevation?: "sm" | "md" | "lg" | "xl";
  delay?: number;
  style?: ViewStyle;
  disabled?: boolean;
  glowColor?: string;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  onPress,
  variant = "solid",
  elevation = "md",
  delay = 0,
  style,
  disabled = false,
  glowColor = modernTheme.colors.primary,
}) => {
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Entry animation with delay
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
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const animatedStyle = {
    transform: [{ scale }, { translateY }],
    opacity,
  };

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 0.98,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const CardContent = () => (
    <View style={[styles.cardContent, style]}>{children}</View>
  );

  const renderCard = () => {
    switch (variant) {
      case "glass":
        return (
          <View
            style={[
              styles.card,
              styles.glassCard,
              modernTheme.shadows[elevation],
            ]}
          >
            <CardContent />
          </View>
        );

      case "gradient":
        return (
          <LinearGradient
            colors={modernTheme.gradients.card}
            style={[styles.card, modernTheme.shadows[elevation]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <CardContent />
          </LinearGradient>
        );

      default:
        return (
          <View
            style={[
              styles.card,
              styles.solidCard,
              modernTheme.shadows[elevation],
            ]}
          >
            <CardContent />
          </View>
        );
    }
  };

  if (onPress && !disabled) {
    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          activeOpacity={0.9}
          style={styles.touchable}
        >
          {renderCard()}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return <Animated.View style={animatedStyle}>{renderCard()}</Animated.View>;
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: modernTheme.borderRadius.xl,
  },
  card: {
    borderRadius: modernTheme.borderRadius.xl,
    overflow: "hidden",
    minHeight: modernTheme.layout.cardMinHeight,
  },
  solidCard: {
    backgroundColor: modernTheme.colors.surface,
    borderWidth: 1,
    borderColor: modernTheme.colors.border,
  },
  glassCard: {
    backgroundColor: modernTheme.colors.glass,
    borderWidth: 1,
    borderColor: modernTheme.colors.borderLight,
  },
  cardContent: {
    padding: modernTheme.spacing.lg,
  },
});
