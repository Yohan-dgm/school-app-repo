import React, { useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// import * as Animatable from "react-native-animatable";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

interface SnapBotButtonProps {
  onPress: () => void;
}

export const SnapBotButton: React.FC<SnapBotButtonProps> = ({ onPress }) => {
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    // Pulse animation
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
      false,
    );

    // Glow animation
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(glowOpacity);
    };
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Glow effect */}
      <Animated.View style={[styles.glowContainer, glowStyle, pulseStyle]} />

      {/* Main button */}
      <Animated.View style={[styles.buttonContainer, pulseStyle]}>
        <TouchableOpacity
          style={styles.button}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Image
            source={require("../../assets/snapbot.png")}
            style={styles.buttonIcon}
            resizeMode="contain"
          />

          {/* Notification dot */}
          <View style={styles.notificationDot}>
            <Animated.View style={[styles.notificationDotInner, pulseStyle]} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100, // Above the navigation bar
    right: 20,
    zIndex: 999,
  },
  glowContainer: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "transparent",
    opacity: 0.3,
    top: -10,
    left: -10,
  },
  buttonContainer: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#E0E0E0",
  },
  buttonIcon: {
    width: 80,
    height: 80,
  },
  notificationDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  notificationDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
});
