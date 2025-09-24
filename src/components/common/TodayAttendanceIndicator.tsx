import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";

interface TodayAttendanceIndicatorProps {
  attendanceStatus: "present" | "absent" | null;
  time?: string | null;
  isLoading?: boolean;
}

const TodayAttendanceIndicator: React.FC<TodayAttendanceIndicatorProps> = ({
  attendanceStatus,
  time,
  isLoading = false,
}) => {
  // Animation references
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Initialize component with fade in
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  // Pulse animation for active status
  useEffect(() => {
    if (isLoading) {
      // Continuous rotation for loading
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      rotateAnim.setValue(0);

      // Pulse animation for attendance status
      if (attendanceStatus === "present" || attendanceStatus === "absent") {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 800,
              easing: Easing.out(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.in(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          { iterations: -1 },
        ).start();
      } else {
        // Gentle breathing animation for pending/null
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          { iterations: -1 },
        ).start();
      }
    }
  }, [attendanceStatus, isLoading]);

  // Get status configuration
  const getStatusConfig = () => {
    if (isLoading) {
      return {
        color: "#6B7280",
        backgroundColor: "#F3F4F6",
        icon: "sync",
        text: "Loading...",
        textColor: "#6B7280",
      };
    }

    switch (attendanceStatus) {
      case "present":
        return {
          color: "#10B981", // Green
          backgroundColor: "#D1FAE5",
          icon: "check-circle",
          text: `Present ${time ? `at ${time}` : ""}`,
          textColor: "#059669",
        };
      case "absent":
        return {
          color: "#EF4444", // Red
          backgroundColor: "#FEE2E2",
          icon: "cancel",
          text: "Absent",
          textColor: "#DC2626",
        };
      default: // null or pending
        return {
          color: "#6B7280", // Gray
          backgroundColor: "#F3F4F6",
          icon: "schedule",
          text: "Pending",
          textColor: "#6B7280",
        };
    }
  };

  const config = getStatusConfig();

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.statusRow}>
        <Animated.View
          style={[
            styles.indicatorDot,
            {
              backgroundColor: config.backgroundColor,
              transform: [
                { scale: pulseAnim },
                isLoading ? { rotate: spin } : { rotate: "0deg" },
              ],
            },
          ]}
        >
          <MaterialIcons
            name={config.icon as any}
            size={12}
            color={config.color}
          />
        </Animated.View>

        <Text style={[styles.statusText, { color: config.textColor }]}>
          {config.text}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  indicatorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    textTransform: "capitalize",
  },
});

export default TodayAttendanceIndicator;
