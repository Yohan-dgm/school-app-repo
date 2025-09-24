import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  ScrollView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface AppVersionUpdateOverlayProps {
  visible: boolean;
  currentVersion: string;
  requiredVersion: string;
  platform: "ios" | "android";
}

const AppVersionUpdateOverlay: React.FC<AppVersionUpdateOverlayProps> = ({
  visible,
  currentVersion,
  requiredVersion,
  platform,
}) => {
  const platformName = platform === "ios" ? "iOS" : "Android";
  const storeInfo =
    platform === "ios"
      ? { storeName: "App Store", icon: "apple" as const }
      : { storeName: "Google Play Store", icon: "android" as const };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <LinearGradient
        colors={["#fef2f2", "#fef7f7", "#ffffff"]}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.headerSection}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="system-update" size={80} color="#dc2626" />
              </View>

              <Text style={styles.title}>App Update Required</Text>
              <Text style={styles.subtitle}>
                Please update to continue using the app
              </Text>
            </View>

            <View style={styles.versionCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="info" size={24} color="#2563eb" />
                <Text style={styles.cardTitle}>Version Information</Text>
              </View>
              <View style={styles.versionInfo}>
                <View style={styles.versionRow}>
                  <Text style={styles.versionLabel}>Current Version:</Text>
                  <Text style={styles.currentVersionText}>
                    {currentVersion}
                  </Text>
                </View>
                <View style={styles.versionRow}>
                  <Text style={styles.versionLabel}>Required Version:</Text>
                  <Text style={styles.requiredVersionText}>
                    {requiredVersion}
                  </Text>
                </View>
                <View style={styles.versionRow}>
                  <Text style={styles.versionLabel}>Platform:</Text>
                  <Text style={styles.platformText}>{platformName}</Text>
                </View>
              </View>
            </View>

            <View style={styles.instructionsCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons
                  name={storeInfo.icon}
                  size={24}
                  color="#059669"
                />
                <Text style={styles.cardTitle}>How to Update</Text>
              </View>
              <Text style={styles.instructionText}>
                Please visit the {storeInfo.storeName} to download the latest
                version of the app.
              </Text>

              <View style={styles.storeInfo}>
                <MaterialIcons name="download" size={20} color="#6b7280" />
                <Text style={styles.storeText}>
                  Update from {storeInfo.storeName}
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              <MaterialIcons name="security" size={20} color="#6b7280" />
              <Text style={styles.footerText}>
                Your data is safe. Please update to access the latest features
                and security improvements.
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  content: {
    maxWidth: width * 0.9,
    width: "100%",
    alignSelf: "center",
  },

  headerSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    position: "relative",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    fontWeight: "500",
  },

  versionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 0,
    borderLeftColor: "#2563eb",
  },
  instructionsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 0,
    borderLeftColor: "#059669",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginLeft: 12,
  },

  versionInfo: {
    gap: 12,
  },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  versionLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  currentVersionText: {
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "600",
  },
  requiredVersionText: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "600",
  },
  platformText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },

  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
    fontWeight: "400",
    marginBottom: 16,
  },

  storeInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  storeText: {
    fontSize: 15,
    color: "#4b5563",
    marginLeft: 12,
    fontWeight: "500",
    flex: 1,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 8,
    textAlign: "center",
    fontWeight: "500",
    flex: 1,
  },
});

export default AppVersionUpdateOverlay;
