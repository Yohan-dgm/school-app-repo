import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  AppState,
  ActivityIndicator,
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
  getUserCategoryName,
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
import { useGetChatThreadsQuery } from "../../api/chat-api";
import { useGetAppUpdateStatusQuery } from "../../api/user-management-api";
import { BaseNotification } from "../../types/notifications";
import { useRouter, usePathname } from "expo-router";
import { useSessionRefresh } from "../../hooks/useSessionRefresh";
import { useLazyGetMyStudentListQuery } from "../../api/student-header-api";

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

  const [loginUserTrigger] = useLoginUserMutation();
  const router = useRouter();
  const pathname = usePathname();

  // Session refresh hook for automatic data updates
  const { refreshSession, isLoading: sessionRefreshLoading } =
    useSessionRefresh();

  // App version checking
  const currentAppVersion = Constants.expoConfig?.version || "1.0.8";
  const currentPlatform = Platform.OS;

  // Get user category from session data
  const userCategory =
    sessionData?.user_category || sessionData?.data?.user_category;
  const isParent = userCategory === USER_CATEGORIES.PARENT;
  const userDisplayName = getUserCategoryDisplayName(userCategory);

  // Get user token and ID for API calls
  const userToken = sessionData?.token || sessionData?.data?.token;
  const userId = sessionData?.data?.id || sessionData?.id;

  // Simple notification API integration following UniversalNotificationSystem pattern
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    error: notificationsError,
  } = useGetNotificationsQuery(
    {
      page: 1,
      limit: 50,
      filters: {
        filter: "all",
        search: "",
        type_id: undefined, // Standardized: undefined instead of null for shared cache
        priority: undefined, // Standardized: undefined instead of "" for shared cache
        unread_only: false,
      },
    },
    {
      skip: !userId || !userToken,
      refetchOnMountOrArgChange: 30,
      refetchOnFocus: false,
      refetchOnReconnect: true,
    },
  );

  // Chat API integration for unread chat counts
  const { data: chatThreadsData } = useGetChatThreadsQuery(
    { page: 1 },
    {
      skip: !userId || !userToken,
      refetchOnMountOrArgChange: 30,
      refetchOnFocus: false,
      refetchOnReconnect: true,
    },
  );

  // App version checking API call
  const {
    data: versionCheckData,
    error: versionCheckError,
    refetch: refetchVersionCheck,
  } = useGetAppUpdateStatusQuery(undefined, {
    skip: !userId || !userToken,
    refetchOnMountOrArgChange: 30,
    refetchOnFocus: false,
    refetchOnReconnect: true,
  });

  // Version checking logic
  React.useEffect(() => {
    if (versionCheckData?.status === "success" && versionCheckData?.data) {
      const versionData = versionCheckData.data;
      dispatch(setAppVersionStatus(versionData));

      const requiredVersion =
        currentPlatform === "ios"
          ? versionData.iso_app_version
          : versionData.android_app_version;

      const isVersionMismatch = currentAppVersion !== requiredVersion;

      dispatch(setShowVersionUpdateOverlay(isVersionMismatch));
    } else if (!versionCheckData) {
      dispatch(setShowVersionUpdateOverlay(false));
    }
  }, [versionCheckData, currentAppVersion, currentPlatform, dispatch]);

  // Auto-refresh version check when user data is fetched
  React.useEffect(() => {
    if (userId && userToken) {
      refetchVersionCheck();
    }
  }, [userId, userToken, refetchVersionCheck]);

  // Version check API errors
  React.useEffect(() => {
    if (versionCheckError) {
      console.error("📱 Header - Version check API error:", versionCheckError);
    }
  }, [versionCheckError]);

  // Debug user name resolution
  const userName =
    sessionData?.data?.full_name ||
    sessionData?.data?.username ||
    sessionData?.full_name ||
    sessionData?.username ||
    sessionData?.data?.user?.full_name ||
    sessionData?.data?.user?.username ||
    "Loading...";

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

  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // Function to refresh student data using real login API
  const refreshStudentData = async (showAlerts = true) => {
    if (isRefreshing) return; // Prevent multiple simultaneous refreshes

    try {
      setIsRefreshing(true);

      // Get stored login credentials from AsyncStorage
      const storedCredentials = await AsyncStorage.getItem("loginCredentials");

      if (!storedCredentials) {
        // Don't clear session data if we just don't have stored credentials
        // The user might have valid session data that doesn't need refreshing

        if (showAlerts) {
          alert("Please log in again to refresh student data.");
        }
        return;
      }

      const credentials = JSON.parse(storedCredentials);

      // Call the real login API to get fresh data
      const response = await loginUserTrigger({
        username_or_email: credentials.username_or_email,
        password: credentials.password,
        pin: credentials.pin,
      }).unwrap();

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

        if (showAlerts) {
          alert(
            `Student data refreshed! Found ${response.data.student_list?.length || 0} students.`,
          );
        }
      } else {
        await AsyncStorage.removeItem("persist:root");
        dispatch(logout());

        if (showAlerts) {
          alert("Please log in again to refresh student data.");
        }
      }
    } catch (error) {
      console.error("❌ Error refreshing student data:", error);

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
      refreshStudentData(false); // Silent refresh (no alerts)
    }

    // Listen for app state changes (foreground/background)
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "active" && sessionData?.data?.student_list) {
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

  // Tap-feedback scale animation for the profile picture
  const scaleAnimation = useRef(new Animated.Value(1)).current;

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
    // Show student selector modal and load its list fresh from the
    // backend (not the login-cached sessionData.data.student_list)
    setShowStudentSelector(true);
    fetchMyStudentList();
  };

  // Simple notification processing following UniversalNotificationSystem pattern
  const notifications = React.useMemo(() => {
    if (!notificationsData?.data) return [];

    // Take first 10 notifications for header popup, following UniversalNotificationSystem pattern
    return notificationsData.data.slice(0, 10).map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      time: notification.time_ago,
      read: notification.is_read,
      icon: notification.notification_type?.icon || "notifications",
    }));
  }, [notificationsData]);

  React.useEffect(() => {
    if (notificationsError) {
      console.error("🔔 Header - Notification API error:", notificationsError);
    }
  }, [notificationsError]);

  // Real-time notifications now handled by the initialization effect above
  // No need for separate listener effects - callbacks handle everything

  // Auto-refresh session data when app comes to foreground
  React.useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === "active" && userId && userToken) {
        try {
          // Refresh session data (this will trigger payment validation via middleware)
          await refreshSession();
          // Note: Notifications will be updated automatically via RTK Query cache
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
  }, [userId, userToken, refreshSession]);

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

      // Only refresh if data is incomplete or older than 5 minutes
      if (!hasCompleteData || dataAge > fiveMinutes) {
        // Add delay to prevent race condition with login
        setTimeout(() => {
          refreshSession().catch((error) => {
            console.error(
              "❌ Header - Error refreshing session data on mount:",
              error,
            );
          });
        }, 2000); // 2 second delay
      }
    }
  }, []); // Run only once on mount

  // Periodic session refresh (every 10 minutes)
  React.useEffect(() => {
    if (!userId || !userToken) return;

    const interval = setInterval(
      async () => {
        try {
          await refreshSession();
        } catch (error) {
          console.error("❌ Header - Periodic session refresh failed:", error);
        }
      },
      10 * 60 * 1000,
    ); // 10 minutes

    return () => clearInterval(interval);
  }, [userId, userToken, refreshSession]);

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

  // Login-cached student list, used everywhere in this header except the
  // picker modal (which fetches fresh — see pickerStudents below). Depends
  // on the whole sessionData object (a stable redux reference that only
  // changes when setSessionData actually fires), not on an `|| []`
  // fallback expression, so this only recomputes when the data actually
  // changes, not on every render.
  const transformedStudents = useMemo(() => {
    const list = sessionData?.data?.student_list;
    if (!list || list.length === 0) return [];

    return list.map((student) => {
      const t = transformStudentWithProfilePicture(student, sessionData);
      return {
        ...t,
        student_id: t.id,
        user_id: sessionData?.data?.id ?? sessionData?.id,
      };
    });
  }, [sessionData]);

  // Student picker: fetched fresh from the backend every time the picker
  // opens (see handleDropdownPress) instead of using the list cached at
  // login (sessionData.data.student_list / transformedStudents above).
  const [
    fetchMyStudentList,
    {
      data: myStudentListData,
      isFetching: isPickerLoading,
      isError: isPickerError,
      error: pickerError,
    },
  ] = useLazyGetMyStudentListQuery();

  useEffect(() => {
    if (pickerError) {
      console.error("🎓 Header - get-my-student-list failed:", pickerError);
    }
  }, [pickerError]);

  const pickerStudents = useMemo(() => {
    const rawList = myStudentListData?.data?.student_list || [];
    return rawList.map((student) =>
      transformStudentWithProfilePicture(student, sessionData),
    );
  }, [myStudentListData, sessionData]);

  // Student picker search — filters by calling name, full name, or
  // admission number; case-insensitive, matches anywhere in the string.
  const filteredStudents = useMemo(() => {
    const query = studentSearchQuery.trim().toLowerCase();
    if (!query) return pickerStudents;

    return pickerStudents.filter((student) => {
      const callingName = (student.student_calling_name || "").toLowerCase();
      const fullName = (student.name || "").toLowerCase();
      const admissionNumber = (student.admissionNumber || "").toLowerCase();
      return (
        callingName.includes(query) ||
        fullName.includes(query) ||
        admissionNumber.includes(query)
      );
    });
  }, [pickerStudents, studentSearchQuery]);

  // Enhanced student selection logic for multiple students
  const currentStudent =
    selectedStudent || transformedStudents[0] || fallbackStudent;
  const hasStudents = transformedStudents.length > 0;
  const hasMultipleStudents = transformedStudents.length > 1;

  // Auto-select the first student only if nothing is selected yet (first
  // login / fresh install). Once a student is selected — whether picked
  // manually or auto-selected here — it is never silently swapped out.
  //
  // This used to also "correct" the selection if it wasn't found in
  // transformedStudents (the login-cached list), but that list is NOT what
  // the picker modal selects from (the picker uses pickerStudents, fetched
  // fresh from a separate endpoint — see handleDropdownPress). Any manual
  // pick other than transformedStudents[0] would fail that check and get
  // silently reverted on the very next render — the actual cause of the
  // selected student "changing back" with 2+ children (invisible with a
  // single child, since transformedStudents[0] IS that child).
  useEffect(() => {
    if (hasStudents && !selectedStudent) {
      dispatch(setSelectedStudent(transformedStudents[0]));
    }
  }, [hasStudents, selectedStudent, transformedStudents, dispatch]);

  // Simple unread count calculation following UniversalNotificationSystem pattern
  const allNotifications = notificationsData?.data || [];
  const unreadPushCount = allNotifications.filter(
    (notification) => !notification.is_read,
  ).length;

  const allChatThreads = chatThreadsData?.data?.threads || [];
  const unreadChatCount = allChatThreads.reduce((total, thread) => {
    return total + (thread.unread_count || 0);
  }, 0);

  const unreadCount = unreadPushCount + unreadChatCount;

  // Check if we're currently on the notifications page for active state
  const isOnNotificationsPage = pathname?.includes("/notifications");

  const handleMenuPress = () => {
    openDrawer();
  };

  const handleNotificationPress = () => {
    // Navigate to notification section based on user category
    // Using getUserCategoryName which returns folder-friendly names like 'principal', 'senior_management'
    const userCategoryName = getUserCategoryName(userCategory);

    // The folders in src/app/authenticated are named after the category name (e.g. 'parent', 'educator', 'sport_coach')
    const notificationRoute = `/authenticated/${userCategoryName}/notifications`;

    try {
      router.push(notificationRoute);
    } catch (error) {
      console.error("🔔 Header - Navigation failed:", error);
      // Fallback navigation
      router.push("/authenticated/notifications");
    }
  };

  const handleClosePaymentOverlay = () => {
    dispatch(setShowPaymentOverlay(false));
  };

  const handleStudentSelect = (student) => {
    dispatch(setSelectedStudent(student));
    setShowStudentSelector(false);
    setStudentSearchQuery("");

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
              {/* Profile picture with tap-feedback scale animation */}
              <Animated.View
                style={[
                  styles.animatedBorderContainer,
                  { transform: [{ scale: scaleAnimation }] },
                ]}
              >
                <Image
                  source={
                    currentStudent?.profileImage ||
                    require("../../assets/images/sample-profile.png")
                  }
                  style={styles.selectedStudentImage}
                />
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
          onRequestClose={() => {
            setShowStudentSelector(false);
            setStudentSearchQuery("");
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => {
              setShowStudentSelector(false);
              setStudentSearchQuery("");
            }}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {pickerStudents.length > 1
                  ? `Select Student (${pickerStudents.length} available)`
                  : "Select Student"}
              </Text>

              {pickerStudents.length > 1 && (
                <View style={styles.searchContainer}>
                  <MaterialIcons
                    name="search"
                    size={20}
                    color="#999"
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or admission number"
                    placeholderTextColor="#999"
                    value={studentSearchQuery}
                    onChangeText={setStudentSearchQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {studentSearchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setStudentSearchQuery("")}
                      style={styles.searchClearButton}
                    >
                      <MaterialIcons name="close" size={18} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {isPickerLoading ? (
                <View style={styles.noStudentsContainer}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.noStudentsText}>Loading students...</Text>
                </View>
              ) : isPickerError ? (
                <View style={styles.noStudentsContainer}>
                  <MaterialIcons name="error-outline" size={48} color="#ccc" />
                  <Text style={styles.noStudentsText}>
                    Couldn&apos;t load your students
                  </Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => fetchMyStudentList()}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : pickerStudents.length > 0 ? (
                filteredStudents.length > 0 ? (
                  <FlatList
                    data={filteredStudents}
                    renderItem={renderStudentItem}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.studentList}
                    keyboardShouldPersistTaps="handled"
                  />
                ) : (
                  <View style={styles.noStudentsContainer}>
                    <MaterialIcons name="search-off" size={48} color="#ccc" />
                    <Text style={styles.noStudentsText}>
                      No students match “{studentSearchQuery}”
                    </Text>
                  </View>
                )
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
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#ffffff",
    zIndex: 10,
  },
  notificationBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontFamily: theme.fonts.bold,
    textAlign: "center",
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
  connectionIndicator: {
    position: "absolute",
    bottom: 2,
    left: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FFFFFF",
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.text,
  },
  searchClearButton: {
    padding: 4,
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
