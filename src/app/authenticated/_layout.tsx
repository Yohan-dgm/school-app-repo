import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../state-store/store";
import { usePaymentStatusChecker } from "../../hooks/usePaymentStatusChecker";
import PaymentStatusOverlay from "../../components/common/PaymentStatusOverlay";

export default function AuthenticatedLayout() {
  // Payment status management - only for authenticated users
  const { showPaymentOverlay, paymentStatus } = useSelector(
    (state: RootState) => state.app,
  );
  const { checkStatus } = usePaymentStatusChecker();

  // Check payment status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="parent" />
        <Stack.Screen name="educator" />
        <Stack.Screen name="student" />
        <Stack.Screen name="sport_coach" />
        <Stack.Screen name="counselor" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="management" />
        <Stack.Screen name="top_management" />
        <Stack.Screen name="principal" />
        <Stack.Screen name="security" />
        <Stack.Screen name="senior_management" />
        <Stack.Screen name="toyar_team" />
        <Stack.Screen name="canteen" />
      </Stack>

      {/* Payment Status Overlay - only shows for authenticated users with payment issues */}
      <PaymentStatusOverlay
        visible={showPaymentOverlay}
        schoolContactInfo={paymentStatus?.schoolContact}
      />
    </>
  );
}
