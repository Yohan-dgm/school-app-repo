import React from "react";
import { View, StyleSheet } from "react-native";
import CanteenManagementView from "@/screens/authenticated/educator/dashboard/modals/CanteenManagementView";

export default function CanteenHome() {
  return (
    <View style={styles.container}>
      <CanteenManagementView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
