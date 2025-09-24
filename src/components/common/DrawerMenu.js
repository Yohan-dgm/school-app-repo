import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { logout } from "../../state-store/slices/app-slice";
import { theme } from "../../styles/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import {
  USER_CATEGORIES,
  getUserCategoryDisplayName,
} from "../../constants/userCategories";
import { getUserProfileImageSourceWithAuth } from "../../utils/profileImageUtils";

// Import section components
import ProfileSection from "../drawer/sections/profile/ProfileSection";
import PrivacyPolicySection from "../drawer/sections/privacy/PrivacyPolicySection";
import TermsConditionsSection from "../drawer/sections/terms/TermsConditionsSection";
import SettingsSection from "../drawer/sections/settings/SettingsSection";
import PaymentSection from "../drawer/sections/payment/PaymentSection";
import HelpSupportSection from "../drawer/sections/help/HelpSupportSection";
import NotificationsSection from "../drawer/sections/notifications/NotificationsSection";

const { width, height } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.8;

const DrawerMenu = ({ isVisible, onClose }) => {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const dispatch = useDispatch();
  const {
    sessionData,
    user: reduxUser,
    token,
  } = useSelector((state) => state.app);
  const slideAnim = useSharedValue(-DRAWER_WIDTH);
  const overlayOpacity = useSharedValue(0);
  const insets = useSafeAreaInsets();

  // Get user category from session data
  const userCategory =
    sessionData?.user_category || sessionData?.data?.user_category;
  const isParent = userCategory === USER_CATEGORIES.PARENT;
  const userDisplayName = getUserCategoryDisplayName(userCategory);

  // console.log(
  //   "🏠 DrawerMenu - User category:",
  //   userCategory,
  //   "Is parent:",
  //   isParent,
  // );

  // Debug user data for profile image
  // console.log("🏠 DrawerMenu - User data debug:", {
  //   authUser: user,
  //   reduxUser: reduxUser,
  //   sessionData: sessionData?.data,
  //   reduxUserProfileImage: reduxUser?.profile_image,
  //   sessionDataProfileImage: sessionData?.data?.profile_image,
  // });

  // Get user profile image - try multiple sources with auth headers
  const getDrawerProfileImage = () => {
    // Try Redux user first
    if (reduxUser?.profile_image && reduxUser.profile_image.id) {
      // console.log("🏠 DrawerMenu - Using Redux user profile image with auth");
      return getUserProfileImageSourceWithAuth(reduxUser, token);
    }

    // Try session data user
    if (sessionData?.data?.profile_image && sessionData.data.profile_image.id) {
      // console.log("🏠 DrawerMenu - Using session data profile image with auth");
      return getUserProfileImageSourceWithAuth(sessionData.data, token);
    }

    // Try auth context user (though less likely to have profile image)
    if (user?.profile_image && user.profile_image.id) {
      // console.log(
      //   "🏠 DrawerMenu - Using auth context user profile image with auth"
      // );
      return getUserProfileImageSourceWithAuth(user, token);
    }

    // console.log("🏠 DrawerMenu - No profile image found, using fallback");
    return require("../../assets/images/sample-profile.png");
  };

  // State for section overlay
  const [sectionOverlayVisible, setSectionOverlayVisible] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    if (isVisible) {
      // Slide in animation
      slideAnim.value = withTiming(0, { duration: 300 });
      overlayOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      // Slide out animation
      slideAnim.value = withTiming(-DRAWER_WIDTH, { duration: 250 });
      overlayOpacity.value = withTiming(0, { duration: 250 });
    }
  }, [isVisible]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim.value }],
  }));

  const handleLogout = async () => {
    console.log("🔹 Drawer Menu: Logout pressed");

    try {
      // Clear persisted Redux data to force fresh session on next login
      console.log("🧹 Clearing persisted Redux data...");
      await AsyncStorage.removeItem("persist:root");

      // Clear stored login credentials
      console.log("🔑 Clearing stored login credentials...");
      await AsyncStorage.removeItem("loginCredentials");

      // Clear user data and authentication state using the proper logout action
      setUser(null);
      dispatch(logout()); // This clears all Redux state including sessionData

      console.log("✅ Session data and credentials cleared successfully");
    } catch (error) {
      console.error("❌ Error clearing session data:", error);
      // Still proceed with logout even if clearing fails
      setUser(null);
      dispatch(logout());
    }

    // Close drawer first
    onClose();

    // Navigate to public index page
    setTimeout(() => {
      router.replace("/public");
    }, 300); // Small delay to allow drawer close animation
  };

  const handleSectionOpen = (section) => {
    console.log(`🔹 Drawer Menu: Opening section: ${section}`);
    setActiveSection(section);
    setSectionOverlayVisible(true);
    onClose(); // Close the drawer
  };

  const handleSectionClose = () => {
    console.log("🔹 Drawer Menu: Closing section overlay");
    setSectionOverlayVisible(false);
    setActiveSection(null);
  };

  const handleNavigateToSubSection = (subSection) => {
    console.log("Navigate to sub-section:", subSection);
    // Handle sub-section navigation here
  };

  const renderSection = () => {
    console.log("🔍 DrawerMenu - Rendering section:", activeSection);

    const commonProps = {
      onClose: handleSectionClose,
      onNavigateToSubSection: handleNavigateToSubSection,
    };

    switch (activeSection) {
      case "profile":
        console.log("📱 Rendering ProfileSection");
        return <ProfileSection {...commonProps} />;
      case "notifications":
        console.log("🔔 Rendering NotificationsSection");
        return <NotificationsSection {...commonProps} />;
      case "privacy":
        console.log("🔒 Rendering PrivacyPolicySection");
        return <PrivacyPolicySection {...commonProps} />;
      case "terms":
        console.log("📋 Rendering TermsConditionsSection");
        return <TermsConditionsSection {...commonProps} />;
      case "settings":
        console.log("⚙️ Rendering SettingsSection");
        return <SettingsSection {...commonProps} />;
      case "payment":
        console.log("💳 Rendering PaymentSection");
        return <PaymentSection {...commonProps} />;
      case "help":
        console.log("❓ Rendering HelpSupportSection");
        return <HelpSupportSection {...commonProps} />;
      default:
        console.log("🔄 Rendering default ProfileSection");
        return <ProfileSection {...commonProps} />;
    }
  };

  // Base menu items available to all users
  const baseMenuItems = [
    {
      id: "profile",
      title: "Profile",
      icon: "person",
      onPress: () => handleSectionOpen("profile"),
    },
    // {
    //   id: "notifications",
    //   title: "Notifications",
    //   icon: "notifications",
    //   onPress: () => handleSectionOpen("notifications"),
    // },
    // {
    //   id: "settings",
    //   title: "Settings",
    //   icon: "settings",
    //   onPress: () => handleSectionOpen("settings"),
    // },
    {
      id: "help",
      title: "Help & Support",
      icon: "help",
      onPress: () => handleSectionOpen("help"),
    },
    {
      id: "privacy",
      title: "Privacy Policy",
      icon: "policy",
      onPress: () => handleSectionOpen("privacy"),
    },
    {
      id: "terms",
      title: "Terms & Conditions",
      icon: "description",
      onPress: () => handleSectionOpen("terms"),
    },
    {
      id: "logout",
      title: "Logout",
      icon: "logout",
      onPress: handleLogout,
      isLogout: true,
    },
  ];

  // Parent-only menu items
  const parentOnlyItems = [
    {
      id: "payments",
      title: "Payments",
      icon: "payments",
      onPress: () => handleSectionOpen("payment"),
    },
  ];

  // Combine menu items based on user category
  const menuItems = isParent
    ? [
        ...baseMenuItems.slice(0, 2), // Profile and Notifications
        ...parentOnlyItems, // Payments (only for parents)
        ...baseMenuItems.slice(2), // Settings, Help, Privacy, Terms, Logout
      ]
    : baseMenuItems;

  return (
    <>
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="none"
        onRequestClose={onClose}
      >
        {/* Overlay */}
        <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Drawer */}
        <Animated.View style={[styles.drawer, drawerAnimatedStyle]}>
          {/* Header Section */}
          <LinearGradient
            colors={["rgb(4 46 102)", "rgb(147 42 45)"]}
            style={[styles.drawerHeader, { paddingTop: insets.top + 20 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.userInfo}>
              <Image
                source={getDrawerProfileImage()}
                style={styles.userAvatar}
              />

              <Text style={styles.userName}>
                {reduxUser?.full_name ||
                  sessionData?.data?.full_name ||
                  "Parent User"}
              </Text>
              <Text style={styles.userRole}>{userDisplayName} Account</Text>
            </View>
          </LinearGradient>

          {/* Menu Items */}
          <ScrollView style={styles.menuContainer}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, item.isLogout && styles.logoutItem]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={item.icon}
                  size={24}
                  color={item.isLogout ? "#EF4444" : theme.colors.text}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    item.isLogout && styles.logoutText,
                  ]}
                >
                  {item.title}
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={item.isLogout ? "#EF4444" : "#94A3B8"}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.appVersion}>School App v1.0.0</Text>
            <Text style={styles.footerText}>Nexis College International</Text>
          </View>
        </Animated.View>
      </Modal>

      {/* Section Overlay Modal */}
      <Modal
        visible={sectionOverlayVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleSectionClose}
      >
        <View style={styles.sectionOverlay}>
          <TouchableOpacity
            style={styles.sectionBackdrop}
            activeOpacity={1}
            onPress={handleSectionClose}
          />
          <View style={styles.sectionContainer}>{renderSection()}</View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
  },
  overlayTouchable: {
    flex: 1,
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: DRAWER_WIDTH,
    height: height,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  drawerHeader: {
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  userInfo: {
    alignItems: "center",
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: theme.spacing.sm,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  userName: {
    fontFamily: theme.fonts.bold,
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  userRole: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#E0E7FF",
  },
  menuContainer: {
    flex: 1,
    paddingTop: theme.spacing.md,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
    marginTop: theme.spacing.sm,
  },
  menuItemText: {
    flex: 1,
    fontFamily: theme.fonts.medium,
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
  logoutText: {
    color: "#EF4444",
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    alignItems: "center",
  },
  appVersion: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  footerText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#64748B",
  },
  // Section overlay styles
  sectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
    backgroundColor: "transparent",
  },
  sectionBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sectionContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    width: width,
    height: "100%",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
});

export default DrawerMenu;
