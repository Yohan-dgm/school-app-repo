import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../../../../styles/theme";
import { CanteenMealPlan } from "../../../../../api/canteen-management-api";

interface MealPlanDetailModalProps {
  mealPlan: CanteenMealPlan | null;
  onClose: () => void;
}

const MealPlanDetailModal: React.FC<MealPlanDetailModalProps> = ({
  mealPlan,
  onClose,
}) => {
  return (
    <Modal
      visible={!!mealPlan}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {mealPlan && (
          <View style={styles.card}>
            <View style={styles.imageWrap}>
              <Image
                source={
                  mealPlan.image_url ? { uri: mealPlan.image_url } : undefined
                }
                style={styles.image}
                contentFit="cover"
              />
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialIcons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              {!mealPlan.is_active && (
                <View style={styles.inactivePill}>
                  <Text style={styles.inactivePillText}>Inactive</Text>
                </View>
              )}
            </View>

            <View style={styles.body}>
              <Text style={styles.title}>{mealPlan.title}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.price}>Rs. {mealPlan.price}</Text>
                <Text style={styles.stock}>
                  {mealPlan.quantity_available > 0
                    ? `${mealPlan.quantity_available} in stock`
                    : "Out of stock"}
                </Text>
              </View>

              <Text style={styles.descriptionLabel}>What&apos;s Inside</Text>
              <Text style={styles.descriptionText}>
                {mealPlan.description?.trim() || "No description provided."}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  imageWrap: {
    width: "100%",
    height: 180,
    backgroundColor: "#F3F4F6",
  },
  image: { width: "100%", height: "100%" },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  inactivePill: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#9CA3AF",
  },
  inactivePillText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  body: {
    padding: 18,
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: "#111827",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 14,
  },
  price: {
    fontFamily: theme.fonts.bold,
    fontSize: 17,
    color: "#920734",
  },
  stock: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#6B7280",
  },
  descriptionLabel: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  descriptionText: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
});

export default MealPlanDetailModal;
