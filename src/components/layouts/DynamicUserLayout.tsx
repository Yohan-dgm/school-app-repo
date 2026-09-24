import React from "react";
import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { RootState } from "../../state-store/store";
import Header from "../common/Header";
import DynamicBottomNavigation from "../navigation/DynamicBottomNavigation";
import useActiveTab from "../../hooks/useActiveTab";
import { handleNavigationPress } from "../../utils/navigationFix";
import { getNavigationConfig } from "../../config/navigationConfig";
import {
  getUserCategoryName,
  USER_CATEGORIES,
} from "../../constants/userCategories";
import { useGetCanteenOrderListDataQuery } from "../../api/canteen-management-api";
import { useGetNotificationsQuery } from "../../api/notifications";

interface DynamicUserLayoutProps {
  userCategory: number;
  children: React.ReactNode;
}

const DynamicUserLayout: React.FC<DynamicUserLayoutProps> = ({
  userCategory,
  children,
}) => {
  const currentActiveTab = useActiveTab();
  const navigationConfig = getNavigationConfig(userCategory);
  const userCategoryName = getUserCategoryName(userCategory);

  const handleTabPress = (tabId: string) => {
    handleNavigationPress(tabId, `${userCategoryName}Layout`, userCategory);
  };

  // Red dot on the Canteen role's own "Canteen" tab while there are
  // Pending orders needing action.
  const { data: pendingCanteenOrdersData } = useGetCanteenOrderListDataQuery(
    { status: "Pending", page: 1, page_size: 1 },
    { skip: userCategory !== USER_CATEGORIES.CANTEEN },
  );
  const hasPendingCanteenOrders =
    userCategory === USER_CATEGORIES.CANTEEN &&
    (pendingCanteenOrdersData?.data?.total ?? 0) > 0;

  // Red dot on the Parent role's "Notifications" and "Student Profile" tabs
  // while there's an unread discipline-record notification for any of their
  // children (same action_url convention as the per-card dot on the
  // Discipline Record card in StudentProfileMain.js).
  const { data: unreadNotificationsData } = useGetNotificationsQuery(
    { page: 1, limit: 50, filters: { unread_only: true } },
    { skip: userCategory !== USER_CATEGORIES.PARENT },
  );
  const hasUnreadDisciplineNotification =
    userCategory === USER_CATEGORIES.PARENT &&
    !!unreadNotificationsData?.data?.some((n) =>
      n.action_url?.includes("discipline-record"),
    );

  const badgedTabIds = [
    ...(hasPendingCanteenOrders ? ["canteen"] : []),
    ...(hasUnreadDisciplineNotification
      ? ["notifications", "studentProfile"]
      : []),
  ];

  return (
    <>
      <StatusBar style="dark" translucent={false} />
      <SafeAreaView style={styles.container}>
        {/* Fixed Header */}
        <Header />

        {/* Content Area - This changes based on route */}
        <View style={styles.content}>{children}</View>

        {/* Dynamic Bottom Navigation */}
        <DynamicBottomNavigation
          navigationConfig={navigationConfig}
          activeTab={currentActiveTab}
          onTabPress={handleTabPress}
          badgedTabIds={badgedTabIds}
        />
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
  },
});

export default DynamicUserLayout;
