import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useSelector } from "react-redux";
import { theme } from "../../styles/theme";
import { USER_CATEGORIES } from "../../constants/userCategories";
import PremiumTabNavigation from "../common/PremiumTabNavigation";

// Import tab components
import SchoolTabWithAPI from "./tabs/SchoolTabWithAPI";
import ClassTabWithAPI from "./tabs/ClassTabWithAPI";
import StudentTabWithAPI from "./tabs/StudentTabWithAPI";
import FilterBar from "./FilterBar";

// Import drawer components
import SchoolPostDrawer from "./SchoolPostDrawer";
import ClassPostDrawer from "./ClassPostDrawer";
import EnhancedStudentPostDrawer from "./EnhancedStudentPostDrawer";
import UniversalPostCreationDrawer from "./UniversalPostCreationDrawer";

const ActivityFeed = ({ userCategory = USER_CATEGORIES.PARENT }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [activeTab, setActiveTab] = useState("School");
  const [filtersState, setFiltersState] = useState({
    searchTerm: "",
    dateRange: { start: null, end: null },
    category: "all",
    year: "all",
    hashtags: [],
  });

  // Drawer states
  const [showUniversalDrawer, setShowUniversalDrawer] = useState(false);
  const [showSchoolDrawer, setShowSchoolDrawer] = useState(false);
  const [showClassDrawer, setShowClassDrawer] = useState(false);
  const [showStudentDrawer, setShowStudentDrawer] = useState(false);

  // Get posts data from Redux for dynamic filtering
  const { posts: schoolPosts, allPosts: schoolAllPosts } = useSelector(
    (state) => state.schoolPosts,
  );
  const { posts: classPosts } = useSelector((state) => state.classPosts);
  const { posts: studentPosts } = useSelector((state) => state.studentPosts);

  // Use filters directly without memoization to test
  const filters = filtersState;

  // Debug filter changes
  useEffect(() => {
    console.log("🎯 ActivityFeed: Filters updated:", filters);
  }, [filters]);

  // Get all posts (unfiltered) for filter options
  const getAllPostsForFilters = () => {
    switch (activeTab) {
      case "School":
        return schoolAllPosts || [];
      case "Class":
        return classPosts || []; // TODO: Add allPosts for class and student tabs
      case "Student":
        return studentPosts || [];
      default:
        return [];
    }
  };

  const allPostsForFilters = getAllPostsForFilters();

  // Check internet connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
      if (!state.isConnected) {
        Alert.alert(
          "No Internet Connection",
          "Please check your internet connection and try again.",
          [{ text: "OK" }],
        );
      }
    });

    return () => unsubscribe();
  }, []);

  // Tabs are now handled by PremiumTabNavigation component
  // No need for getVisibleTabs() as it's built into the component

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    console.log("🔄 ActivityFeed: Filter change requested:", newFilters);
    setFiltersState(newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    setFiltersState({
      searchTerm: "",
      dateRange: { start: null, end: null },
      category: "all",
      year: "all",
      hashtags: [],
    });
  };

  // Handle add post - open universal drawer
  const handleAddPost = () => {
    setShowUniversalDrawer(true);
  };

  // Handle section selection from universal drawer
  const handleSectionSelect = (sectionId) => {
    switch (sectionId) {
      case "school":
        setShowSchoolDrawer(true);
        break;
      case "class":
        setShowClassDrawer(true);
        break;
      case "student":
        setShowStudentDrawer(true);
        break;
      default:
        Alert.alert("Error", "Unable to create post for this section");
    }
  };

  // Handle post creation success - refresh posts
  const handlePostCreated = () => {
    // TODO: Add logic to refresh posts for the active tab
    console.log("📝 Post created successfully for tab:", activeTab);
    // This could trigger a refetch of posts or invalidate cache
  };

  // Render the active tab content with conditional rendering to prevent key conflicts

  return (
    <View style={styles.container}>
      {/* Premium Tab Navigation */}
      <PremiumTabNavigation
        activeTab={activeTab}
        onTabPress={setActiveTab}
        userCategory={userCategory}
      />

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        postsData={allPostsForFilters}
        onAddPost={handleAddPost}
        userCategory={userCategory}
      />

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === "School" && (
          <SchoolTabWithAPI
            userCategory={userCategory}
            isConnected={isConnected}
            filters={filters}
          />
        )}
        {activeTab === "Class" && (
          <ClassTabWithAPI
            userCategory={userCategory}
            isConnected={isConnected}
            filters={filters}
          />
        )}
        {activeTab === "Student" && userCategory === USER_CATEGORIES.PARENT && (
          <StudentTabWithAPI
            userCategory={userCategory}
            isConnected={isConnected}
            filters={filters}
          />
        )}
      </View>

      {/* Universal Post Creation Drawer */}
      <UniversalPostCreationDrawer
        visible={showUniversalDrawer}
        onClose={() => setShowUniversalDrawer(false)}
        onSectionSelect={handleSectionSelect}
        activeTab={activeTab}
      />

      {/* Post Creation Drawers */}
      <SchoolPostDrawer
        visible={showSchoolDrawer}
        onClose={() => setShowSchoolDrawer(false)}
        onPostCreated={handlePostCreated}
      />

      <ClassPostDrawer
        visible={showClassDrawer}
        onClose={() => setShowClassDrawer(false)}
        onPostCreated={handlePostCreated}
      />

      <EnhancedStudentPostDrawer
        visible={showStudentDrawer}
        onClose={() => setShowStudentDrawer(false)}
        onPostCreated={handlePostCreated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabContent: {
    flex: 1,
  },
});

export default ActivityFeed;
