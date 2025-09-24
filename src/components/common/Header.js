import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  AppState,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { useDrawer } from "../../context/DrawerContext";
import { useSelector, useDispatch } from "react-redux";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";
import DrawerMenu from "./DrawerMenu";
import { StudentProfileModal } from "../../screens/authenticated/parent/parent-student-profile";
import PaymentStatusOverlay from "./PaymentStatusOverlay";
import AppVersionUpdateOverlay from "./AppVersionUpdateOverlay";
import Constants from "expo-constants";
import {
  USER_CATEGORIES,
  getUserCategoryDisplayName,
} from "../../constants/userCategories";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  transformStudentWithProfilePicture,
  getLocalFallbackProfileImage,
} from "../../utils/studentProfileUtils";
import { buildUserProfileImageUrl } from "../../utils/mediaUtils";
import {
  logout,
  setSessionData,
  setSelectedStudent,
  setShowPaymentOverlay,
  setAppVersionStatus,
  setShowVersionUpdateOverlay,
} from "../../state-store/slices/app-slice";
import { useLoginUserMutation } from "../../api/auth-api";
import { useGetNotificationsQuery } from "../../api/notifications";
import { useGetAppUpdateStatusQuery } from "../../api/user-management-api";
import { BaseNotification } from "../../types/notifications";
import { useRouter, usePathname } from "expo-router";
import { useSessionRefresh } from "../../hooks/useSessionRefresh";

const { width } = Dimensions.get("window");

const Header = () => {
  const { user } = useAuth();
  const { isDrawerOpen, openDrawer, closeDrawer } = useDrawer();
  const {
    sessionData,
    selectedStudent,
    user: reduxUser,
    token,
    showPaymentOverlay,
    paymentStatus,
    appVersionStatus,
    showVersionUpdateOverlay,
  } = useSelector((state) => state.app);
  const dispatch = useDispatch();

  // Track notification error count to prevent excessive retries
  const [notificationErrorCount, setNotificationErrorCount] = React.useState(0);
  const [loginUserTrigger] = useLoginUserMutation();
  const router = useRouter();
  const pathname = usePathname();

  // Session refresh hook for automatic data updates
  const { refreshSession, isLoading: sessionRefreshLoading } =
    useSessionRefresh();

  // App version checking
  const currentAppVersion = Constants.expoConfig?.version || "1.0.0";
  const currentPlatform = Platform.OS;

  // Get user category from session data
  const userCategory =
    sessionData?.user_category || sessionData?.data?.user_category;
  const isParent = userCategory === USER_CATEGORIES.PARENT;
  const userDisplayName = getUserCategoryDisplayName(userCategory);

  // Get user token and ID for API calls
  const userToken = sessionData?.token || sessionData?.data?.token;
  const userId = sessionData?.data?.id || sessionData?.id;

  // Notification API Integration with improved error handling
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery(
    {
      page: 1,
      limit: 5, // Only fetch 5 notifications for header popup
      filters: {
        filter: "all",
        search: "",
        type_id: null,
        priority: "",
        unread_only: false,
      },
    },
    {
      skip: !userId || !userToken,
      // Add retry configuration to handle server errors
      refetchOnMountOrArgChange: 30, // Refetch if older than 30 seconds
      refetchOnFocus: false, // Don't refetch on window focus to reduce API calls
      refetchOnReconnect: true, // Refetch when network reconnects
    },
  );

  // App version checking API call
  const {
    data: versionCheckData,
    isLoading: versionCheckLoading,
    error: versionCheckError,
    refetch: refetchVersionCheck,
  } = useGetAppUpdateStatusQuery(undefined, {
    skip: !userId || !userToken,
    refetchOnMountOrArgChange: 30,
    refetchOnFocus: false,
    refetchOnReconnect: true,
  });

  // Version checking logic with detailed testing logs
  React.useEffect(() => {
    console.log("📱 TESTING - Current app info:", {
      currentAppVersion: currentAppVersion,
      platform: currentPlatform,
      expoConfig: Constants.expoConfig,
      versionFromExpo: Constants.expoConfig?.version,
      versionFromManifest: Constants.manifest?.version,
      versionFromManifest2: Constants.manifest2?.extra?.expoClient?.version,
    });

    console.log("📱 TESTING - Version check data state:", {
      hasVersionCheckData: !!versionCheckData,
      versionCheckDataStatus: versionCheckData?.status,
      hasApiData: !!versionCheckData?.data,
      versionCheckLoading: versionCheckLoading,
      versionCheckError: versionCheckError,
      currentShowOverlay: showVersionUpdateOverlay,
    });

    if (versionCheckData?.status === "success" && versionCheckData?.data) {
      const versionData = versionCheckData.data;
      dispatch(setAppVersionStatus(versionData));

      console.log("📱 TESTING - API Response Full Data:", {
        fullApiResponse: versionCheckData,
        versionData: versionData,
        iso_app_version: versionData.iso_app_version,
        android_app_version: versionData.android_app_version,
        user_id: versionData.user_id,
        username: versionData.username,
        email: versionData.email,
        is_active: versionData.is_active,
        user_category: versionData.user_category,
      });

      const requiredVersion =
        currentPlatform === "ios"
          ? versionData.iso_app_version
          : versionData.android_app_version;

      const isVersionMismatch = currentAppVersion !== requiredVersion;

      console.log("📱 TESTING - Version Comparison:", {
        currentVersion: currentAppVersion,
        requiredVersion: requiredVersion,
        platform: currentPlatform,
        isVersionMismatch: isVersionMismatch,
        comparisonDetails: {
          currentVersionType: typeof currentAppVersion,
          requiredVersionType: typeof requiredVersion,
          strictEqual: currentAppVersion === requiredVersion,
          looseEqual: currentAppVersion == requiredVersion,
          lengthComparison: `current: ${currentAppVersion?.length}, required: ${requiredVersion?.length}`,
        },
      });

      if (isVersionMismatch) {
        console.log(
          "⚠️ TESTING - Version mismatch detected, showing update overlay",
        );
        console.log("⚠️ TESTING - Overlay should be visible with:", {
          currentVersion: currentAppVersion,
          requiredVersion: requiredVersion,
          platform: currentPlatform,
        });
        dispatch(setShowVersionUpdateOverlay(true));
      } else {
        console.log("✅ TESTING - Versions match, hiding overlay");
        console.log("✅ TESTING - Same versions confirmed:", {
          currentVersion: currentAppVersion,
          requiredVersion: requiredVersion,
          platform: currentPlatform,
        });
        dispatch(setShowVersionUpdateOverlay(false));
      }
    } else if (versionCheckData) {
      console.log("📱 TESTING - API Response not successful:", {
        fullResponse: versionCheckData,
        status: versionCheckData?.status,
        hasData: !!versionCheckData?.data,
      });
    } else {
      console.log(
        "📱 TESTING - No version check data yet, ensuring overlay is hidden",
      );
      dispatch(setShowVersionUpdateOverlay(false));
    }
  }, [
    versionCheckData,
    currentAppVersion,
    currentPlatform,
    dispatch,
    showVersionUpdateOverlay,
  ]);

  // Auto-refresh version check when user data is fetched
  React.useEffect(() => {
    if (userId && userToken) {
      console.log("📱 TESTING - User logged in, triggering version check...");
      console.log("📱 TESTING - API Call Details:", {
        userId: userId,
        hasToken: !!userToken,
        tokenLength: userToken?.length,
        apiEndpoint: "api/user-management/user/get-app-update-status",
      });
      refetchVersionCheck();
    }
  }, [userId, userToken, refetchVersionCheck]);

  // Debug overlay visibility changes
  React.useEffect(() => {
    console.log("📱 TESTING - Overlay visibility changed:", {
      showVersionUpdateOverlay: showVersionUpdateOverlay,
      appVersionStatus: appVersionStatus,
      timestamp: new Date().toISOString(),
    });
  }, [showVersionUpdateOverlay, appVersionStatus]);

  // Debug version check API errors
  React.useEffect(() => {
    if (versionCheckError) {
      console.error("📱 TESTING - Version check API error:", {
        error: versionCheckError,
        status: versionCheckError?.status,
        data: versionCheckError?.data,
        message: versionCheckError?.message,
        timestamp: new Date().toISOString(),
      });
    }
  }, [versionCheckError]);

  // Debug version check loading state
  React.useEffect(() => {
    console.log("📱 TESTING - Version check loading state:", {
      isLoading: versionCheckLoading,
      hasData: !!versionCheckData,
      hasError: !!versionCheckError,
      timestamp: new Date().toISOString(),
    });
  }, [versionCheckLoading, versionCheckData, versionCheckError]);

  // Debug logging - Focus on sessionData which contains real backend data
  // console.log(
  //   "🏠 Header - Session data:",
  //   JSON.stringify(sessionData, null, 2)
  // );
  // console.log(
  //   "🏠 Header - Backend user data:",
  //   JSON.stringify(sessionData?.data, null, 2)
  // );
  // console.log(
  //   "🏠 Header - User category:",
  //   userCategory,
  //   "Is parent:",
  //   isParent
  // );
  // console.log(
  //   "🏠 Header - Student list:",
  //   JSON.stringify(sessionData?.data?.student_list, null, 2)
  // );

  // Debug user name resolution
  const userName =
    sessionData?.data?.full_name ||
    sessionData?.data?.username ||
    sessionData?.full_name ||
    sessionData?.username ||
    sessionData?.data?.user?.full_name ||
    sessionData?.data?.user?.username ||
    "Loading...";

  // console.log("🏠 Header - Resolved user name:", userName);
  // console.log("🏠 Header - Available name fields:", {
  //   "sessionData?.data?.full_name": sessionData?.data?.full_name,
  //   "sessionData?.data?.username": sessionData?.data?.username,
  //   "sessionData?.full_name": sessionData?.full_name,
  //   "sessionData?.username": sessionData?.username,
  //   "sessionData?.data?.user?.full_name": sessionData?.data?.user?.full_name,
  //   "sessionData?.data?.user?.username": sessionData?.data?.user?.username,
  // });

  // Get user profile image using the same pattern as activity feed media
  const userProfileImage =
    reduxUser?.profile_image || sessionData?.data?.profile_image || null;

  // Use the buildUserProfileImageUrl function (same pattern as activity feed media)
  const userProfileImageSource = React.useMemo(() => {
    if (userProfileImage && userProfileImage.id) {
      // Build URL using the same proven pattern as activity feed media
      const profileImageUrl = buildUserProfileImageUrl(userProfileImage);
      if (profileImageUrl) {
        // CRITICAL FIX: Add authentication headers (same as MediaViewer)
        return {
          uri: profileImageUrl,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        };
      }
    }
    // Fallback to local image (same as activity feed when media fails)
    return getLocalFallbackProfileImage();
  }, [userProfileImage, token]);

  // console.log("🖼️ Header - User profile image (ENHANCED DEBUG):", {
  //   // Auth token availability
  //   hasToken: !!token,
  //   tokenLength: token?.length || 0,

  //   // Profile image data sources
  //   reduxProfileImage: reduxUser?.profile_image,
  //   sessionProfileImage: sessionData?.data?.profile_image,
  //   resolvedProfileImage: userProfileImage,

  //   // Profile image details
  //   profileImageId: userProfileImage?.id,
  //   profileImageFilename: userProfileImage?.filename,
  //   profileImagePublicPath: userProfileImage?.public_path,
  //   profileImageFullUrl: userProfileImage?.full_url,

  //   // Final image source (same format as MediaViewer)
  //   profileImageSource: userProfileImageSource,
  //   hasProfileImage: !!userProfileImage,
  //   sourceHasHeaders: !!userProfileImageSource?.headers,
  //   sourceType: userProfileImageSource?.uri ? "remote" : "local",
  //   finalUrl: userProfileImageSource?.uri,
  //   authHeaders: userProfileImageSource?.headers,
  // });
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to refresh student data using real login API
  const refreshStudentData = async (showAlerts = true) => {
    if (isRefreshing) return; // Prevent multiple simultaneous refreshes

    try {
      setIsRefreshing(true);
      console.log("🔄 Refreshing student data...");

      // Get stored login credentials from AsyncStorage
      const storedCredentials = await AsyncStorage.getItem("loginCredentials");

      if (!storedCredentials) {
        console.log("⚠️ No stored credentials found, skipping refresh...");
        // Don't clear session data if we just don't have stored credentials
        // The user might have valid session data that doesn't need refreshing

        if (showAlerts) {
          alert("Please log in again to refresh student data.");
        }
        return;
      }

      const credentials = JSON.parse(storedCredentials);
      console.log("🔑 Using stored credentials for refresh:", {
        username_or_email: credentials.username_or_email,
        pin: credentials.pin ? "****" : "missing",
      });

      // Call the real login API to get fresh data
      const response = await loginUserTrigger({
        username_or_email: credentials.username_or_email,
        password: credentials.password,
        pin: credentials.pin,
      }).unwrap();

      console.log(
        "🔄 Fresh login response:",
        JSON.stringify(response, null, 2),
      );

      if (response?.success && response?.data) {
        // Create enhanced session data (same structure as login)
        const enhancedSessionData = {
          ...response,
          user_category: response.data.user_category,
          user_role: response.data.user_role,
          data: {
            ...response.data,
          },
        };

        dispatch(setSessionData(enhancedSessionData));
        console.log(
          "✅ Student data refreshed successfully with real API data!",
        );

        if (showAlerts) {
          alert(
            `Student data refreshed! Found ${response.data.student_list?.length || 0} students.`,
          );
        }
      } else {
        console.log(
          "⚠️ Login API returned invalid response, falling back to cache clear...",
        );
        await AsyncStorage.removeItem("persist:root");
        dispatch(logout());

        if (showAlerts) {
          alert("Please log in again to refresh student data.");
        }
      }
    } catch (error) {
      console.error("❌ Error refreshing student data:", error);
      console.log("⚠️ API refresh failed, falling back to cache clear...");

      // Fallback to clearing cache if API call fails
      try {
        await AsyncStorage.removeItem("persist:root");
        dispatch(logout());

        if (showAlerts) {
          alert("Please log in again to see updated student data.");
        }
      } catch (cacheError) {
        console.error("❌ Error clearing cache:", cacheError);

        if (showAlerts) {
          alert(
            "Error refreshing student data. Please try logging out and back in manually.",
          );
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh student data when component mounts and app comes to foreground
  useEffect(() => {
    // Refresh on component mount (when app starts)
    if (
      sessionData?.data?.student_list &&
      sessionData.data.student_list.length > 0
    ) {
      console.log("🔄 Auto-refreshing student data on component mount...");
      refreshStudentData(false); // Silent refresh (no alerts)
    }

    // Listen for app state changes (foreground/background)
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "active" && sessionData?.data?.student_list) {
        console.log(
          "🔄 App came to foreground, auto-refreshing student data...",
        );
        refreshStudentData(false); // Silent refresh (no alerts)
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    // Set up periodic refresh every 5 minutes
    const refreshInterval = setInterval(
      () => {
        if (sessionData?.data?.student_list) {
          console.log("🔄 Periodic auto-refresh of student data...");
          refreshStudentData(false); // Silent refresh (no alerts)
        }
      },
      5 * 60 * 1000,
    ); // 5 minutes

    // Cleanup subscription and interval on unmount
    return () => {
      subscription?.remove();
      clearInterval(refreshInterval);
    };
  }, [sessionData?.data?.student_list?.length]); // Re-run when student list length changes

  // Animation for profile picture border - Creative animated effects
  const borderColorAnimation = useRef(new Animated.Value(0)).current;
  const shadowOpacityAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create pulsing border animation with color transition
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(borderColorAnimation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false, // Keep false for color/shadow animations
        }),
        Animated.timing(borderColorAnimation, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false, // Keep false for color/shadow animations
        }),
      ]),
    );

    // Create shadow animation with glow effect
    const shadowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shadowOpacityAnimation, {
          toValue: 0.8,
          duration: 2500,
          useNativeDriver: false, // Keep false for shadow animations
        }),
        Animated.timing(shadowOpacityAnimation, {
          toValue: 0.2,
          duration: 2500,
          useNativeDriver: false, // Keep false for shadow animations
        }),
      ]),
    );

    // Create subtle rotation animation
    const rotateAnimationLoop = Animated.loop(
      Animated.timing(rotateAnimation, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: false, // Changed to false to avoid mixing native/JS drivers
      }),
    );

    pulseAnimation.start();
    shadowAnimation.start();
    rotateAnimationLoop.start();

    return () => {
      pulseAnimation.stop();
      shadowAnimation.stop();
      rotateAnimationLoop.stop();
    };
  }, []);

  const handleProfilePress = () => {
    // Scale animation on press with enhanced feedback
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.92,
        duration: 150,
        useNativeDriver: false, // Changed to false to avoid mixing native/JS drivers
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: false, // Changed to false to avoid mixing native/JS drivers
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false, // Changed to false to avoid mixing native/JS drivers
      }),
    ]).start();

    // Show student profile modal instead of selector
    setShowStudentProfile(true);
  };

  const handleDropdownPress = () => {
    // Show student selector modal
    setShowStudentSelector(true);
  };

  // Process notification data from API
  const notifications = React.useMemo(() => {
    if (!notificationsData?.data) return [];

    // Take first 5 notifications and transform them for header popup
    return notificationsData.data.slice(0, 5).map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      time: notification.time_ago,
      type: notification.notification_type?.slug || "general",
      read: notification.is_read,
      icon: notification.notification_type?.icon || "notifications",
      color: notification.notification_type?.color || "#7c2d3e",
      priority: notification.priority,
      // Legacy fields for compatibility
      isRead: notification.is_read,
    }));
  }, [notificationsData]);

  // Log notification data for debugging
  React.useEffect(() => {
    if (notificationsData) {
      console.log("🔔 Header - Notification data received:", {
        totalCount: notificationsData.data?.length || 0,
        hasData: !!notificationsData.data,
        firstFew: notificationsData.data?.slice(0, 2).map((n) => ({
          id: n.id,
          title: n.title,
          is_read: n.is_read,
        })),
        timestamp: new Date().toISOString(),
      });
    }
  }, [notificationsData]);

  React.useEffect(() => {
    if (notificationsError) {
      console.error("🔔 Header - Notification API error:", {
        error: notificationsError,
        status: notificationsError?.status,
        data: notificationsError?.data,
        timestamp: new Date().toISOString(),
      });

      // Track error count and adjust behavior accordingly
      setNotificationErrorCount((prev) => prev + 1);

      // If it's a 500 error, it's likely a server issue - don't retry too aggressively
      if (notificationsError?.status === 500) {
        console.warn(
          "🔔 Header - Server error (500) detected, reducing retry frequency",
        );

        // If we've had multiple 500 errors, log a more specific message
        if (notificationErrorCount >= 3) {
          console.error(
            "🔔 Header - Multiple notification API failures detected, may need server-side investigation",
          );
        }
      }
    }
  }, [notificationsError]);

  // Auto-reload notifications on login and component mount (with error handling)
  React.useEffect(() => {
    if (userId && userToken) {
      console.log("🔔 Header - User logged in, refreshing notifications...");
      try {
        refetchNotifications();
      } catch (error) {
        console.error(
          "🔔 Header - Error refreshing notifications on login:",
          error,
        );
      }
    }
  }, [userId, userToken, refetchNotifications]);

  // Auto-refresh session data and notifications when app comes to foreground
  React.useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === "active" && userId && userToken) {
        console.log(
          "🔄 Header - App came to foreground, refreshing session data and notifications...",
        );

        try {
          // Refresh session data first (this will trigger payment validation via middleware)
          await refreshSession();
          console.log("✅ Header - Session data refreshed on foreground");

          // Then refresh notifications
          refetchNotifications();
          console.log("✅ Header - Notifications refreshed on foreground");
        } catch (error) {
          console.error(
            "❌ Header - Error refreshing data on foreground:",
            error,
          );
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [userId, userToken, refreshSession, refetchNotifications]);

  // Auto-refresh session data on component mount (app startup) - with data freshness check
  React.useEffect(() => {
    if (userId && userToken && sessionData) {
      // Check if data is fresh (less than 5 minutes old)
      const now = Date.now();
      const lastUpdate = sessionData.lastUpdated || 0;
      const dataAge = now - lastUpdate;
      const fiveMinutes = 5 * 60 * 1000;

      // Check if data has critical fields (avoid overwriting complete data with incomplete)
      const hasCompleteData =
        sessionData?.data &&
        sessionData.data.id &&
        sessionData.data.full_name &&
        sessionData.data.user_category;

      console.log("🔄 Header - Mount session refresh check:", {
        hasCompleteData: hasCompleteData,
        dataAge: dataAge,
        dataAgeMinutes: Math.round(dataAge / 60000),
        shouldRefresh: !hasCompleteData || dataAge > fiveMinutes,
        lastUpdated: new Date(lastUpdate).toISOString(),
      });

      // Only refresh if data is incomplete or older than 5 minutes
      if (!hasCompleteData || dataAge > fiveMinutes) {
        console.log("🔄 Header - Data is stale or incomplete, refreshing...");

        // Add delay to prevent race condition with login
        setTimeout(() => {
          refreshSession()
            .then(() => {
              console.log(
                "✅ Header - Session data refreshed on mount (delayed)",
              );
            })
            .catch((error) => {
              console.error(
                "❌ Header - Error refreshing session data on mount:",
                error,
              );
            });
        }, 2000); // 2 second delay
      } else {
        console.log(
          "✅ Header - Session data is fresh, skipping refresh on mount",
        );
      }
    }
  }, []); // Run only once on mount

  // Periodic session refresh (every 10 minutes)
  React.useEffect(() => {
    if (!userId || !userToken) return;

    const interval = setInterval(
      async () => {
        console.log("🔄 Header - Periodic session refresh...");
        try {
          await refreshSession();
          console.log("✅ Header - Periodic session refresh completed");
        } catch (error) {
          console.error("❌ Header - Periodic session refresh failed:", error);
        }
      },
      10 * 60 * 1000,
    ); // 10 minutes

    return () => clearInterval(interval);
  }, [userId, userToken, refreshSession]);

  // Get student data from backend API response
  const backendStudentList = sessionData?.data?.student_list || [];

  // Debug: Log the current session data and student list
  // console.log(
  //   "🔍 Header - Current sessionData:",
  //   JSON.stringify(sessionData, null, 2)
  // );
  // console.log(
  //   "🔍 Header - backendStudentList length:",
  //   backendStudentList.length
  // );
  // console.log(
  //   "🔍 Header - backendStudentList:",
  //   JSON.stringify(backendStudentList, null, 2)
  // );

  // Transform backend student data to match UI requirements
  const students = backendStudentList.map((student) => {
    // Transform student data using utility function
    const transformedStudent = transformStudentWithProfilePicture(
      student,
      sessionData,
    );

    console.log(
      `🎓 Header - Using API calling name: "${transformedStudent.student_calling_name}" for student "${transformedStudent.name}"`,
    );
    console.log(`🎓 Header - Student grade_level_class data:`, {
      student_id: transformedStudent.id,
      grade: transformedStudent.grade,
      class_id: transformedStudent.class_id,
    });
    console.log(
      `🖼️ Header - Profile picture for student ${transformedStudent.id}:`,
      {
        attachments: student.attachments,
        profileImage: transformedStudent.profileImage,
      },
    );

    return transformedStudent;
  });

  // console.log(
  //   "🎓 Header - Backend student list:",
  //   JSON.stringify(backendStudentList, null, 2)
  // );
  // console.log(
  //   "🎓 Header - Transformed students:",
  //   JSON.stringify(students, null, 2)
  // );

  // Fallback student data when no students are available
  const fallbackStudent = {
    id: 0,
    name: "No Student",
    student_calling_name: "No Student",
    profileImage: require("../../assets/images/sample-profile.png"),
    studentId: "N/A",
    admissionNumber: "N/A",
    campus: "No Campus",
    grade: "No Grade",
    timeline: [],
  };

  // Transform backend student data to match global state requirements
  const transformedStudents = useMemo(() => {
    const transformed = students.map((student) => {
      const transformedStudent = {
        id: student.id,
        student_id: student.id,
        user_id: sessionData?.data?.id || sessionData?.id,
        name: student.name, // Use the already transformed name
        student_calling_name: student.student_calling_name,
        profileImage: student.profileImage, // Use the already processed profile image
        studentId: student.studentId, // Use the already transformed studentId
        admissionNumber: student.admissionNumber, // Use the already transformed admissionNumber
        campus: student.campus, // Use the already transformed campus
        grade: student.grade, // Use the already transformed grade
        class_id: student.class_id || null,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        schoolHouse: student.schoolHouse, // Use the already transformed schoolHouse
        guardianInfo: student.guardianInfo,
        timeline: student.timeline, // Use the already created timeline
      };

      console.log(`🎓 Header - Transformed student for global state:`, {
        student_calling_name: transformedStudent.student_calling_name,
        student_id: transformedStudent.student_id,
        grade: transformedStudent.grade,
        class_id: transformedStudent.class_id,
        campus: transformedStudent.campus,
      });

      return transformedStudent;
    });

    return transformed;
  }, [students, sessionData?.data?.id, sessionData?.id]);

  // Enhanced student selection logic for multiple students
  const currentStudent =
    selectedStudent || transformedStudents[0] || fallbackStudent;
  const hasStudents = transformedStudents.length > 0;
  const hasMultipleStudents = transformedStudents.length > 1;

  // Log student selection info
  console.log(`🎓 Header - Total students: ${transformedStudents.length}`);
  console.log(`🎓 Header - Has multiple students: ${hasMultipleStudents}`);
  console.log(
    `🎓 Header - Current student: ${currentStudent?.student_calling_name}`,
  );
  console.log(
    `🎓 Header - Selected student ID: ${selectedStudent?.id || "none"}`,
  );

  // Enhanced auto-select first student logic with proper dependency management
  useEffect(() => {
    // Only auto-select if we have students, no current selection, and transformed students are ready
    if (hasStudents && !selectedStudent && transformedStudents.length > 0) {
      const firstStudent = transformedStudents[0];
      console.log(
        `🎓 Header - Auto-selecting first student: ${firstStudent?.student_calling_name} (ID: ${firstStudent?.student_id})`,
      );
      console.log(`🎓 Header - Auto-selected student class info:`, {
        student_calling_name: firstStudent?.student_calling_name,
        student_id: firstStudent?.student_id,
        grade: firstStudent?.grade,
        class_id: firstStudent?.class_id,
        campus: firstStudent?.campus,
      });
      dispatch(setSelectedStudent(firstStudent));
    }
    // If we have a selected student but it's not in the current list (e.g., after data refresh)
    else if (selectedStudent && transformedStudents.length > 0) {
      const studentExists = transformedStudents.find(
        (student) => student.student_id === selectedStudent.student_id,
      );
      if (!studentExists) {
        console.log(
          `🎓 Header - Selected student no longer exists, auto-selecting first available: ${transformedStudents[0]?.student_calling_name}`,
        );
        dispatch(setSelectedStudent(transformedStudents[0]));
      }
    }
  }, [hasStudents, selectedStudent, transformedStudents, dispatch]);

  // Monitor student selection changes and log for debugging
  useEffect(() => {
    if (selectedStudent) {
      console.log(
        `🎓 Header - Student selection changed to: ${selectedStudent.student_calling_name} (ID: ${selectedStudent.student_id})`,
      );
      console.log(
        `🎓 Header - Selected student details:`,
        JSON.stringify(selectedStudent, null, 2),
      );
    } else {
      console.log(`🎓 Header - No student currently selected`);
    }
  }, [selectedStudent]);

  // Calculate unread notifications count
  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  // Check if we're currently on the notifications page for active state
  const isOnNotificationsPage = pathname?.includes("/notifications");

  const handleMenuPress = () => {
    openDrawer();
  };

  const handleNotificationPress = () => {
    console.log("🔔 Header - Notification button pressed");
    setShowNotifications(true);
  };

  const handleNotificationItemPress = (notificationId) => {
    console.log(
      `🔔 Header - Notification item ${notificationId} pressed, navigating to notifications section`,
    );

    // Close the popup modal
    setShowNotifications(false);

    // Navigate to notification section based on user category
    const notificationRoute = `/authenticated/${userCategory}/notifications`;

    try {
      router.push(notificationRoute);
      console.log(`🔔 Header - Navigation successful to: ${notificationRoute}`);

      // Trigger notification reload after a short delay to ensure navigation completes
      setTimeout(() => {
        refetchNotifications();
        console.log("🔔 Header - Notifications reloaded after navigation");
      }, 500);
    } catch (error) {
      console.error("🔔 Header - Navigation failed:", error);
      // Fallback navigation
      router.push("/authenticated/notifications");
    }
  };

  const handleMarkAsRead = (notificationId) => {
    console.log(`🔔 Header - Mark notification ${notificationId} as read`);
    // TODO: Implement mark as read API call when available
  };

  const handleMarkAllAsRead = () => {
    console.log("🔔 Header - Mark all notifications as read");
    // TODO: Implement mark all as read API call when available
  };

  const handleClosePaymentOverlay = () => {
    console.log("💰 Header - Payment overlay closed by user");
    dispatch(setShowPaymentOverlay(false));
  };

  const handleStudentSelect = (student) => {
    // console.log(
    //   `🎓 Header - Student selected: ${student.student_calling_name} (ID: ${student.id})`
    // );
    // console.log(`🎓 Header - Selected student class info:`, {
    //   student_calling_name: student?.student_calling_name,
    //   student_id: student?.student_id,
    //   grade: student?.grade,
    //   class_id: student?.class_id,
    //   campus: student?.campus,
    // });
    dispatch(setSelectedStudent(student));
    setShowStudentSelector(false);

    // Close student profile modal if it's open to refresh with new student data
    if (showStudentProfile) {
      setShowStudentProfile(false);
      // Reopen after a brief delay to show updated profile
      setTimeout(() => {
        setShowStudentProfile(true);
      }, 100);
    }
  };

  const renderStudentItem = ({ item }) => {
    const isSelected = selectedStudent?.id === item.id;

    // Debug log to check item data
    console.log(`🎓 Header - Rendering student item:`, {
      name: item.student_calling_name || item.name,
      admissionNumber: item.admissionNumber,
      grade: item.grade,
      campus: item.campus,
    });

    return (
      <TouchableOpacity
        style={[styles.studentItem, isSelected && styles.studentItemSelected]}
        onPress={() => handleStudentSelect(item)}
        activeOpacity={0.7}
      >
        <Image source={item.profileImage} style={styles.studentItemImage} />
        <View style={styles.studentItemInfo}>
          <Text style={styles.studentItemName}>
            {item.student_calling_name || item.name}
          </Text>
          <Text style={styles.studentItemId}>
            {item.admissionNumber} - {item.grade}
          </Text>
          {item.campus && (
            <Text style={styles.studentItemCampus}> {item.campus}</Text>
          )}
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <MaterialIcons
              name="check-circle"
              size={24}
              color={theme.colors.primary}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={Platform.OS === "android"}
      />

      {/* Top Section - Menu and Notification */}
      <View style={styles.topSection}>
        <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
          <MaterialIcons name="menu" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <Image
            source={
              user?.logo_url || require("../../assets/images/nexis-logo.png")
            }
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity
          onPress={handleNotificationPress}
          style={[
            styles.notificationButton,
            isOnNotificationsPage && styles.notificationButtonActive,
          ]}
        >
          <MaterialIcons
            name={
              isOnNotificationsPage ? "notifications" : "notifications-none"
            }
            size={26}
            color={isOnNotificationsPage ? "#7c2d3e" : "#333"}
          />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Refresh student data button */}
        {/* <TouchableOpacity
          onPress={() => refreshStudentData(true)} // Show alerts for manual refresh
          style={[styles.notificationButton, { marginLeft: 8 }]}
          disabled={isRefreshing}
        >
          <MaterialIcons
            name="refresh"
            size={24}
            color={isRefreshing ? "#ccc" : "#920734"}
            style={isRefreshing ? { transform: [{ rotate: "45deg" }] } : {}}
          />
        </TouchableOpacity> */}
      </View>

      {/* Bottom Section - User Profile and Student Selector */}
      <View style={styles.bottomSection}>
        {/* Left Side - User Profile */}
        <View style={styles.userSection}>
          <Image
            source={userProfileImageSource}
            style={styles.userProfileImage}
            onError={(e) => {
              // console.log("🖼️ Header - Error loading user profile image:", {
              //   error: e.nativeEvent.error,
              //   source: userProfileImageSource,
              //   profileImage: userProfileImage,
              //   url: userProfileImageSource?.uri,
              // });
            }}
            onLoad={() => {
              // console.log(
              //   "🖼️ Header - User profile image loaded successfully:",
              //   {
              //     source: userProfileImageSource,
              //     profileImage: userProfileImage,
              //     url: userProfileImageSource?.uri,
              //   }
              // );
            }}
          />
          <View style={styles.userInfoContainer}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userRole}>{userDisplayName} Account</Text>
          </View>
        </View>

        {/* Right Side - Enhanced Student Selector (Only for Parents with Students) */}
        {isParent && hasStudents && (
          <View style={styles.studentSelector}>
            {/* Animated Profile Picture */}
            <TouchableOpacity
              style={styles.profileContainer}
              onPress={handleProfilePress}
              activeOpacity={0.8}
            >
              {/* Animated border container with creative effects */}
              <Animated.View
                style={[
                  styles.animatedBorderContainer,
                  {
                    borderColor: borderColorAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        "rgba(146, 7, 52, 0.3)",
                        "rgba(146, 7, 52, 0.8)",
                      ],
                    }),
                    shadowOpacity: shadowOpacityAnimation,
                    shadowRadius: shadowOpacityAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, 12],
                    }),
                    transform: [
                      { scale: scaleAnimation },
                      {
                        rotate: rotateAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "360deg"],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: rotateAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "-360deg"], // Counter-rotate the image
                        }),
                      },
                    ],
                  }}
                >
                  <Image
                    source={
                      currentStudent?.profileImage ||
                      require("../../assets/images/sample-profile.png")
                    }
                    style={styles.selectedStudentImage}
                  />
                </Animated.View>
              </Animated.View>
            </TouchableOpacity>

            {/* Student Info */}
            <TouchableOpacity
              style={styles.selectedStudentInfo}
              onPress={handleDropdownPress}
              activeOpacity={0.7}
            >
              <View style={styles.studentNameContainer}>
                <Text style={styles.selectedStudentName}>
                  {currentStudent?.student_calling_name ||
                    currentStudent?.name ||
                    "Select Student"}
                </Text>
                {hasMultipleStudents && (
                  <View style={styles.multipleStudentsBadge}>
                    <Text style={styles.multipleStudentsText}>
                      {transformedStudents.length}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.selectedStudentId}>
                {currentStudent?.admissionNumber} {currentStudent?.grade}
                {/* {hasMultipleStudents && " • Tap to switch"} */}
              </Text>
            </TouchableOpacity>

            {/* Dropdown Arrow */}
            <TouchableOpacity
              onPress={handleDropdownPress}
              style={styles.dropdownArrow}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="keyboard-arrow-down"
                size={16}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Student Selection Modal (Only for Parents) */}
      {isParent && (
        <Modal
          visible={showStudentSelector}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowStudentSelector(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setShowStudentSelector(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {hasMultipleStudents
                  ? `Select Student (${transformedStudents.length} available)`
                  : "Select Student"}
              </Text>
              {hasStudents ? (
                <FlatList
                  data={transformedStudents}
                  renderItem={renderStudentItem}
                  keyExtractor={(item) => item.id.toString()}
                  style={styles.studentList}
                />
              ) : (
                <View style={styles.noStudentsContainer}>
                  <MaterialIcons name="school" size={48} color="#ccc" />
                  <Text style={styles.noStudentsText}>No students found</Text>
                  <Text style={styles.noStudentsSubtext}>
                    Please contact the school administration
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Notification Modal */}
      <Modal
        visible={showNotifications}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotifications(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowNotifications(false)}
        >
          <View style={styles.notificationModalContent}>
            {/* Simple Header */}
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>Notifications</Text>
              <TouchableOpacity
                onPress={() => setShowNotifications(false)}
                style={styles.closeModalButton}
              >
                <MaterialIcons name="close" size={18} color="#666" />
              </TouchableOpacity>
            </View>

            {notifications.length > 0 ? (
              <FlatList
                data={notifications}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.notificationItem,
                      !item.read && styles.unreadNotificationItem,
                    ]}
                    // onPress={() => handleNotificationItemPress(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.notificationContent}>
                      <MaterialIcons
                        name={item.icon || "notifications"}
                        size={20}
                        color={!item.read ? "#7c2d3e" : "#999999"}
                      />
                      <View style={styles.notificationTextContainer}>
                        <Text
                          style={[
                            styles.notificationItemTitle,
                            item.read && styles.readNotificationTitle,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[
                            styles.notificationMessage,
                            item.read && styles.readNotificationMessage,
                          ]}
                          numberOfLines={1}
                        >
                          {item.message}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.notificationTime,
                          item.read && styles.readNotificationTime,
                        ]}
                      >
                        {item.time}
                      </Text>
                      {!item.read && <View style={styles.unreadDot} />}
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id.toString()}
                style={styles.notificationList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.noNotificationsContainer}>
                <MaterialIcons
                  name={
                    notificationsError ? "error-outline" : "notifications-none"
                  }
                  size={32}
                  color={notificationsError ? "#f44336" : "#ccc"}
                />
                <Text style={styles.noNotificationsText}>
                  {notificationsLoading
                    ? "Loading..."
                    : notificationsError
                      ? "Unable to load notifications"
                      : "No notifications"}
                </Text>
                {notificationsError && (
                  <TouchableOpacity
                    onPress={() => {
                      console.log("🔔 Header - Manual retry requested by user");
                      setNotificationErrorCount(0); // Reset error count on manual retry
                      refetchNotifications();
                    }}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Student Profile Modal (Only for Parents with Students) */}
      {isParent && hasStudents && (
        <StudentProfileModal
          visible={showStudentProfile}
          onClose={() => setShowStudentProfile(false)}
          student={currentStudent}
        />
      )}

      {/* Drawer Menu */}
      <DrawerMenu isVisible={isDrawerOpen} onClose={closeDrawer} />

      {/* Payment Status Overlay */}
      <PaymentStatusOverlay
        visible={showPaymentOverlay}
        schoolContactInfo={paymentStatus?.schoolContact}
        onClose={handleClosePaymentOverlay}
        userId={userId}
      />

      {/* App Version Update Overlay */}
      <AppVersionUpdateOverlay
        visible={showVersionUpdateOverlay}
        currentVersion={currentAppVersion}
        requiredVersion={
          appVersionStatus
            ? currentPlatform === "ios"
              ? appVersionStatus.iso_app_version
              : appVersionStatus.android_app_version
            : "Unknown"
        }
        platform={currentPlatform}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 2,
  },
  topSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuButton: {
    padding: theme.spacing.xs,
    width: 40,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
  },
  logo: {
    width: 120,
    height: 40,
    marginRight: theme.spacing.xs,
  },
  appName: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: "#000000",
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F9FA",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationButtonActive: {
    backgroundColor: "#f3e8ea",
    borderWidth: 2,
    borderColor: "#7c2d3e",
  },
  notificationBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#7c2d3e",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  notificationBadgeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: "#FFFFFF",
  },
  bottomSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#F5F5F5",
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userProfileImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5, // Perfect circle
    marginRight: theme.spacing.sm,
    // Attractive border styling
    borderWidth: 2,
    borderColor: "#E0E0E0",
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3, // Android shadow
    // Background in case image fails to load
    backgroundColor: "#F5F5F5",
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: "#000000",
  },
  userRole: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
  },
  studentSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: 25,
    minWidth: 180,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileContainer: {
    marginRight: 2,
    position: "relative",
    left: -6,
  },
  animatedBorderContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "rgba(146, 7, 52, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  selectedStudentImage: {
    width: 46,
    height: 46,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  dropdownArrow: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
    borderRadius: 12,
    backgroundColor: "rgba(146, 7, 52, 0.1)",
  },
  selectedStudentInfo: {
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  selectedStudentName: {
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    color: "#000000",
  },
  selectedStudentId: {
    fontFamily: theme.fonts.regular,
    fontSize: 9,
    color: "#666666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: theme.spacing.lg,
    width: width * 0.8,
    maxHeight: 400,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  modalTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  studentList: {
    maxHeight: 300,
  },
  studentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 12,
    marginBottom: theme.spacing.xs,
    backgroundColor: "#F8FAFC",
  },
  studentItemImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.sm,
  },
  studentItemInfo: {
    flex: 1,
  },
  studentItemName: {
    fontFamily: theme.fonts.medium,
    fontSize: 16,
    color: theme.colors.text,
  },
  studentItemId: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#64748B",
  },
  studentItemCampus: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  studentItemSelected: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "lightgray",
  },
  selectedIndicator: {
    marginLeft: theme.spacing.sm,
  },
  studentNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  multipleStudentsBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: theme.spacing.xs,
    left: 12,
    bottom: 4,
    opacity: 0.9,
    display: "none",
  },
  multipleStudentsText: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: "#FFFFFF",
  },
  noStudentsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  noStudentsText: {
    fontFamily: theme.fonts.medium,
    fontSize: 16,
    color: "#666666",
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  noStudentsSubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#999999",
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  notificationModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: width * 0.9,
    maxHeight: 350,
    marginTop: 80,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  closeModalButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: "#333",
  },
  markAllReadText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.primary,
  },
  notificationList: {
    maxHeight: 260,
  },
  notificationItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  unreadNotificationItem: {
    backgroundColor: "#fef9fa",
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7c2d3e",
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationItemTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
  },
  notificationMessage: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666",
  },
  notificationTime: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: "#999",
    minWidth: 50,
  },
  readNotificationTitle: {
    color: "#999",
  },
  readNotificationMessage: {
    color: "#aaa",
  },
  readNotificationTime: {
    color: "#ccc",
  },
  noNotificationsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noNotificationsText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#7c2d3e",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  retryButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#fff",
    textAlign: "center",
  },
});

export default Header;
