import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface PaymentStatusOverlayProps {
  visible: boolean;
  schoolContactInfo?: string;
  onClose?: () => void;
  userId?: number;
}

const PaymentStatusOverlay: React.FC<PaymentStatusOverlayProps> = ({
  visible,
  schoolContactInfo = "Please contact your school Administration",
  onClose,
  userId,
}) => {
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
            {/* Header Section */}
            <View style={styles.headerSection}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="warning" size={80} color="#dc2626" />
                {/* <View style={styles.iconBadge}>
                  <MaterialIcons name="close" size={24} color="#ffffff" />
                </View> */}
              </View>

              <Text style={styles.title}>Subscription Expired</Text>
              <Text style={styles.subtitle}>
                Your Access has been Temporarily Suspended
              </Text>
            </View>

            {/* Main Message Card */}
            {/* <View style={styles.messageCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="info" size={24} color="#2563eb" />
                <Text style={styles.cardTitle}>What happened?</Text>
              </View>
              <Text style={styles.cardMessage}>
                Your subscription with the school has expired and needs to be renewed to continue using this application.
              </Text>
            </View> */}

            {/* Instructions Card */}
            <View style={styles.instructionsCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="school" size={24} color="#059669" />
                <Text style={styles.cardTitle}>How to renew</Text>
              </View>
              <Text style={styles.instructionText}>
                Please update your subscription with your School. They will help
                you restore access to the application.
              </Text>

              {/* Contact Information */}
              <View style={styles.contactInfo}>
                <MaterialIcons name="phone" size={20} color="#6b7280" />
                <Text style={styles.contactText}>{schoolContactInfo}</Text>
              </View>
            </View>

            {/* Additional Info Card */}
            {/* <View style={styles.additionalInfoCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="help-outline" size={24} color="#7c3aed" />
                <Text style={styles.cardTitle}>Need Help?</Text>
              </View>
              <Text style={styles.helpText}>
                If you have questions about your subscription or need
                assistance, your school administration team is ready to help you
                resolve this quickly.
              </Text>
            </View> */}

            {/* Footer */}
            <View style={styles.footer}>
              <MaterialIcons name="schedule" size={20} color="#6b7280" />
              <Text style={styles.footerText}>
                Your data is safe and will be restored once your subscription is
                renewed
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

  // Header Section
  headerSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    position: "relative",
    marginBottom: 24,
  },
  iconBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#dc2626",
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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

  // Card Styles
  messageCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
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
    borderLeftColor: "gray",
  },
  additionalInfoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#7c3aed",
  },

  // Card Headers
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

  // Card Content
  cardMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
    fontWeight: "400",
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
    fontWeight: "400",
    marginBottom: 16,
  },
  helpText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
    fontWeight: "400",
  },

  // Contact Information
  contactInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  contactText: {
    fontSize: 15,
    color: "#4b5563",
    marginLeft: 12,
    fontWeight: "500",
    flex: 1,
  },

  // Footer
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

export default PaymentStatusOverlay;
