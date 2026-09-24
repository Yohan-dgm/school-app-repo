import React from "react";
import { Stack } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/state-store/store";
import DynamicUserLayout from "@/components/layouts/DynamicUserLayout";
import { USER_CATEGORIES } from "@/constants/userCategories";

export default function CanteenLayout() {
  const user = useSelector((state: RootState) => state.app.user);
  const userCategory = user?.user_category || USER_CATEGORIES.CANTEEN;

  return (
    <DynamicUserLayout userCategory={userCategory}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="notifications" />
      </Stack>
    </DynamicUserLayout>
  );
}
