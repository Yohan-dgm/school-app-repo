import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Icon from "react-native-vector-icons/MaterialIcons";
import CustomSkeleton from "../../ui/CustomSkeleton";
import { theme } from "../../../styles/theme";
import MediaViewer from "../../media/MediaViewer";
import Constants from "expo-constants";

// Import media utilities
import {
  buildActivityFeedMediaUrl,
  buildVideoThumbnailUrl,
} from "../../../utils/mediaUtils";

// Import API hooks and slice actions
import {
  useLazyGetClassPostsQuery,
  useLikeClassPostMutation,
  useDeleteClassPostMutation,
} from "../../../api/activity-feed-api";
import {
  setLoading,
  setRefreshing,
  setPosts,
  setAllPosts as setAllPostsAction,
  setError,
  setFilters,
  clearFilters,
  toggleLike,
  revertLike,
  getUserLikeState,
} from "../../../state-store/slices/school-life/school-posts-slice";

// Import filter transformation utility
import { transformFiltersForAPI } from "../FilterBar";

// Import grade level utilities and user category constants
import { getGradeNameById } from "../../../constants/gradeLevels";
import { USER_CATEGORIES } from "../../../constants/userCategories";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Get API base URL from environment
const API_BASE_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BASE_URL_API_SERVER_1 ||
  process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1 ||
  "http://192.168.1.9:9999";

// Helper function to transform media data from backend API
const transformMediaData = (mediaArray) => {
  if (!mediaArray || !Array.isArray(mediaArray)) return [];

  return mediaArray
    .map((mediaItem) => {
      // Use the new media URL builder to construct proper URLs
      const filename =
        mediaItem.filename ||
        `file.${mediaItem.type === "image" ? "jpg" : mediaItem.type === "video" ? "mp4" : "pdf"}`;
      const mediaUrl = buildActivityFeedMediaUrl(mediaItem.url, filename);

      let thumbnailUrl = null;
      if (mediaItem.thumbnail_url) {
        // Extract filename from thumbnail URL or use a default
        const thumbnailFilename =
          mediaItem.thumbnail_url.split("/").pop() || "thumbnail.jpg";
        thumbnailUrl = buildVideoThumbnailUrl(
          mediaItem.thumbnail_url,
          thumbnailFilename,
        );
      }

      switch (mediaItem.type) {
        case "image":
          return {
            type: "image",
            uri: mediaUrl,
            id: mediaItem.id,
            filename: filename,
            size: mediaItem.size || 0,
          };

        case "video":
          return {
            type: "video",
            uri: mediaUrl,
            thumbnail: thumbnailUrl || mediaUrl, // Use thumbnail or fallback to video URL
            id: mediaItem.id,
            filename: filename,
            size: mediaItem.size || 0,
          };

        case "pdf":
          return {
            type: "pdf",
            uri: mediaUrl,
            fileName: filename,
            fileSize: mediaItem.size
              ? `${(mediaItem.size / 1024 / 1024).toFixed(1)} MB`
              : "Unknown size",
            id: mediaItem.id,
          };

        default:
          console.warn("Unknown media type:", mediaItem.type);
          return null;
      }
    })
    .filter(Boolean); // Remove null values
};

const ClassTabWithAPI = ({ filters, userCategory, isConnected }) => {
  const dispatch = useDispatch();

  // Debug filters being passed to component
  useEffect(() => {
    console.log("🎯 ClassTabWithAPI - Filters received:", filters);
  }, [filters]);

  // Redux state with safe defaults
  const schoolPostsState = useSelector((state) => state.schoolPosts || {});
  const {
    posts = [],
    loading = false,
    refreshing = false,
    error = null,
    likedPosts = {},
  } = schoolPostsState;

  // Get current user and selected student from global state
  const { user: currentUser, selectedStudent } = useSelector((state) => state.app);

  // API hooks - using dedicated class posts API
  const [getClassPosts] = useLazyGetClassPostsQuery();
  const [likeClassPost] = useLikeClassPostMutation();
  const [deleteClassPost] = useDeleteClassPostMutation();

  // Local state for pagination and data
  const [allPostsLocal, setAllPostsLocal] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  // Load class posts with pagination
  const loadPosts = useCallback(
    async (pageNum = 1, isLoadMore = false) => {
      try {
        if (isLoadMore) {
          setIsLoadingMore(true);
        } else {
          dispatch(setLoading(true));
        }

        console.log(
          `🔄 Loading class posts - page ${pageNum}${isLoadMore ? " (load more)" : ""}...`,
        );

        // Check requirements based on user category
        if (userCategory === USER_CATEGORIES.PARENT) {
          // Parent users need a selected student with class_id
          if (!selectedStudent?.class_id) {
            console.log(
              "❌ Parent user: No selected student or class_id available",
            );
            dispatch(setError("Please select a student to view class posts"));
            dispatch(setLoading(false));
            setIsLoadingMore(false);
            return;
          }
        } else {
          // Non-parent users can view all class posts without selecting a student
          console.log("✅ Non-parent user: Loading all class posts");
        }

        // Prepare API parameters based on user category
        const apiParams = {
          page: pageNum,
          limit: 10, // Load 10 posts per page for optimization
          filters: {
            search: "",
            category: "",
            date_from: "",
            date_to: "",
            hashtags: [],
          },
        };

        // Add class_id only for parent users
        if (userCategory === USER_CATEGORIES.PARENT) {
          apiParams.class_id = selectedStudent.class_id;
          console.log(
            `📤 Parent user: Loading posts for class_id ${selectedStudent.class_id}`,
          );
        } else {
          // For non-parent users, don't send class_id to get all class posts
          apiParams.class_id = null;
          console.log(
            "📤 Non-parent user: Loading all class posts (no class_id filter)",
          );
        }

        // Load class posts using dedicated API with pagination
        const response = await getClassPosts(apiParams).unwrap();

        if (response.status === "successful") {
          const newPostsData = Array.isArray(response.data)
            ? response.data
            : response.data.posts || [];

          const postTypeDescription =
            userCategory === USER_CATEGORIES.PARENT
              ? `class posts for class_id ${selectedStudent?.class_id}`
              : "class posts from all classes";
          console.log(
            `✅ Successfully loaded ${newPostsData.length} ${postTypeDescription} for page ${pageNum}`,
          );

          // Handle pagination info
          const paginationInfo = response.pagination || {};
          const hasMore = paginationInfo.has_more || false;

          if (isLoadMore) {
            // Append new posts to existing posts with deduplication
            setAllPostsLocal((prevPosts) => {
              // Create a Set of existing post IDs for fast lookup
              const existingIds = new Set(prevPosts.map((post) => post.id));
              // Filter out posts that already exist
              const uniqueNewPosts = newPostsData.filter(
                (post) => !existingIds.has(post.id),
              );
              console.log(
                `🔍 Class Deduplication: ${newPostsData.length} new posts, ${uniqueNewPosts.length} unique posts added`,
              );
              return [...prevPosts, ...uniqueNewPosts];
            });
          } else {
            // Replace posts (initial load or refresh)
            setAllPostsLocal(newPostsData);
          }

          setHasMoreData(hasMore);
          setCurrentPage(pageNum);
          dispatch(setError(null));
        } else {
          dispatch(setError(response.message || "Failed to load posts"));
        }
      } catch (error) {
        console.error("Error in loadPosts (Class Tab):", {
          error: error,
          status: error?.status,
          data: error?.data,
          message: error?.message,
          page: pageNum,
          isLoadMore,
          timestamp: new Date().toISOString(),
        });

        // Enhanced 404 detection - check multiple possible locations in error object
        const is404Error =
          error?.status === 404 ||
          error?.error?.status === 404 ||
          error?.data?.status === 404 ||
          // Also check for specific Laravel/Symfony route not found messages
          (error?.data?.message &&
            error.data.message.includes("could not be found")) ||
          (error?.data?.exception &&
            error.data.exception.includes("NotFoundHttpException"));

        if (is404Error) {
          console.log(
            "📭 API endpoint not found (404/route not found) - treating as no posts available",
          );
          console.log("📭 Error structure analysis:", {
            status: error?.status,
            errorStatus: error?.error?.status,
            dataStatus: error?.data?.status,
            message: error?.data?.message,
            exception: error?.data?.exception,
          });
          // Set empty posts array and clear any previous error
          setAllPostsLocal([]);
          setHasMoreData(false);
          dispatch(setError(null)); // Clear error state so UI shows "No posts" instead
          return;
        }

        // Enhanced error handling - check nested status codes
        const getErrorStatus = () => {
          return error?.status || error?.error?.status || error?.data?.status;
        };

        const getErrorMessage = () => {
          return (
            error?.message || error?.data?.message || error?.error?.message
          );
        };

        // Handle different error types gracefully for other errors
        const statusCode = getErrorStatus();
        let errorMessage = "An unexpected error occurred";

        if (statusCode === 500) {
          errorMessage = "Server error - please try again later";
        } else if (statusCode === 401) {
          errorMessage = "Authentication required - please log in again";
        } else if (statusCode === 403) {
          errorMessage = "Access denied - insufficient permissions";
        } else if (getErrorMessage()) {
          errorMessage = getErrorMessage();
        }

        console.log("🚨 Handling non-404 error:", {
          statusCode,
          errorMessage,
          fullError: error,
        });

        dispatch(setError(errorMessage));
      } finally {
        dispatch(setLoading(false));
        setIsLoadingMore(false);
      }
    },
    [dispatch, getClassPosts, userCategory, selectedStudent?.class_id],
  );

  // Simple filtering function for additional filters (search, category, etc.)
  const filterPostsLocally = useCallback((postsToFilter, currentFilters) => {
    if (!postsToFilter || postsToFilter.length === 0) return [];

    console.log("🔍 Class Tab - Applying additional filters:", currentFilters);

    return postsToFilter.filter((post) => {
      // Search term filter
      if (
        currentFilters.searchTerm &&
        currentFilters.searchTerm.trim() &&
        currentFilters.searchTerm !== ""
      ) {
        const searchTerm = currentFilters.searchTerm.toLowerCase();
        const titleMatch = post.title?.toLowerCase().includes(searchTerm);
        const contentMatch = post.content?.toLowerCase().includes(searchTerm);
        if (!titleMatch && !contentMatch) return false;
      }

      // Category filter
      if (
        currentFilters.category &&
        currentFilters.category !== "all" &&
        currentFilters.category !== ""
      ) {
        if (
          post.category?.toLowerCase() !== currentFilters.category.toLowerCase()
        ) {
          return false;
        }
      }

      // Hashtags filter
      if (currentFilters.hashtags && currentFilters.hashtags.length > 0) {
        const postHashtags = post.hashtags || [];
        const hasMatchingHashtag = currentFilters.hashtags.some((filterTag) =>
          postHashtags.some((postTag) =>
            postTag.toLowerCase().includes(filterTag.toLowerCase()),
          ),
        );
        if (!hasMatchingHashtag) return false;
      }

      // Date range filter
      if (currentFilters.dateRange?.start || currentFilters.dateRange?.end) {
        const postDate = new Date(post.created_at);

        if (currentFilters.dateRange.start) {
          const startDate = new Date(currentFilters.dateRange.start);
          if (postDate < startDate) return false;
        }

        if (currentFilters.dateRange.end) {
          const endDate = new Date(currentFilters.dateRange.end);
          if (postDate > endDate) return false;
        }
      }

      return true;
    });
  }, []);

  // Clear any existing filters when component mounts
  useEffect(() => {
    console.log(
      "🧹 Clearing any existing filters on component mount (Class Tab)",
    );
    dispatch(clearFilters());
  }, [dispatch]);

  // Load class posts based on user category
  useEffect(() => {
    if (userCategory === USER_CATEGORIES.PARENT) {
      // Parent users need a selected student with class_id
      if (selectedStudent?.class_id) {
        console.log(
          "🔄 Class Tab - Parent: Loading posts for class_id:",
          selectedStudent.class_id,
        );
        // Reset pagination when class changes
        setCurrentPage(1);
        setHasMoreData(true);
        setAllPostsLocal([]);
        loadPosts(1, false);
      }
    } else {
      // Non-parent users load all class posts immediately
      console.log("🔄 Class Tab - Non-parent: Loading all class posts");
      setCurrentPage(1);
      setHasMoreData(true);
      setAllPostsLocal([]);
      loadPosts(1, false);
    }
  }, [userCategory, selectedStudent?.class_id, loadPosts]);

  // Debug allPostsLocal changes
  useEffect(() => {
    console.log(
      "🔄 allPostsLocal changed (Class Tab):",
      allPostsLocal?.length || 0,
    );
  }, [allPostsLocal]);

  // Frontend filtering for additional filters (search, category, etc.)
  const filteredPosts = useMemo(() => {
    console.log("🚀 useMemo filteredPosts is executing! (Class Tab)");
    if (!allPostsLocal || allPostsLocal.length === 0) {
      console.log(
        "❌ No class posts available (Class Tab):",
        allPostsLocal?.length || 0,
      );
      return [];
    }

    console.log("🔍 Filtering Debug (Class Tab):", {
      classPostsCount: allPostsLocal.length,
      filters,
      selectedStudent: selectedStudent?.student_calling_name,
      class_id: selectedStudent?.class_id,
    });

    // Apply additional filtering (search, category, hashtags, date)
    const filtered = filterPostsLocally(allPostsLocal, filters || {});
    console.log(
      "🔍 Additional filtering applied - filtered posts:",
      filtered.length,
    );
    return filtered;
  }, [allPostsLocal, filters, filterPostsLocally]);

  // Update Redux state when filtered posts change
  useEffect(() => {
    if (filteredPosts) {
      console.log(
        `🔍 Class filtering complete: ${filteredPosts.length} posts match criteria`,
      );
      dispatch(
        setPosts({
          posts: filteredPosts,
          pagination: {
            current_page: 1,
            total: filteredPosts.length,
            has_more: false,
          },
        }),
      );
    }
  }, [filteredPosts, dispatch]);

  // Handle refresh - reload first page
  const handleRefresh = useCallback(() => {
    if (userCategory === USER_CATEGORIES.PARENT) {
      // Parent users need selected student
      if (selectedStudent?.class_id) {
        setCurrentPage(1);
        setHasMoreData(true);
        setAllPostsLocal([]); // Clear current posts
        loadPosts(1, false); // Reload first page
      }
    } else {
      // Non-parent users can always refresh
      setCurrentPage(1);
      setHasMoreData(true);
      setAllPostsLocal([]); // Clear current posts
      loadPosts(1, false); // Reload first page
    }
  }, [userCategory, selectedStudent?.class_id, loadPosts]);

  // Handle load more - fetch next page
  const handleLoadMore = useCallback(() => {
    const canLoadMore =
      userCategory === USER_CATEGORIES.PARENT
        ? selectedStudent?.class_id // Parent users need selected student
        : true; // Non-parent users can always load more

    if (hasMoreData && !isLoadingMore && !loading && canLoadMore) {
      const nextPage = currentPage + 1;
      console.log(`📄 Class Tab - Loading more posts - page ${nextPage}`);
      loadPosts(nextPage, true);
    }
  }, [
    hasMoreData,
    isLoadingMore,
    loading,
    currentPage,
    userCategory,
    selectedStudent?.class_id,
    loadPosts,
  ]);

  // Handle delete post
  const handleDeletePost = useCallback(
    async (postId) => {
      Alert.alert(
        "Delete Post",
        "Are you sure you want to delete this post? This action cannot be undone.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                // Optimistic update - remove post from local state immediately
                setAllPostsLocal((prevPosts) =>
                  prevPosts.filter((post) => post.id !== postId),
                );

                const response = await deleteClassPost({
                  id: postId,
                }).unwrap();

                if (response.success) {
                  console.log("✅ Class post deleted successfully");
                } else {
                  // Revert optimistic update on failure
                  loadPosts(1, false); // Reload posts to restore state
                  Alert.alert(
                    "Error",
                    response.message || "Failed to delete post",
                  );
                }
              } catch (error) {
                console.error("❌ Error deleting class post:", error);
                // Revert optimistic update on error
                loadPosts(1, false); // Reload posts to restore state
                Alert.alert(
                  "Error",
                  error?.data?.message ||
                    "Failed to delete post. Please try again.",
                );
              }
            },
          },
        ],
      );
    },
    [deleteClassPost, loadPosts],
  );

  // Handle like/unlike
  const handleLike = useCallback(
    async (post) => {
      const isCurrentlyLiked =
        getUserLikeState(schoolPostsState, post.id) || post.is_liked_by_user;
      const action = isCurrentlyLiked ? "unlike" : "like";
      const newLikesCount = isCurrentlyLiked
        ? post.likes_count - 1
        : post.likes_count + 1;

      // Optimistic update
      dispatch(
        toggleLike({
          postId: post.id,
          isLiked: !isCurrentlyLiked,
          likesCount: newLikesCount,
        }),
      );

      try {
        const response = await likeClassPost({
          post_id: post.id,
          action,
        }).unwrap();

        if (response.status === "successful") {
          // Update with actual server response
          dispatch(
            toggleLike({
              postId: post.id,
              isLiked: response.data.is_liked_by_user,
              likesCount: response.data.likes_count,
            }),
          );
        }
      } catch (error) {
        console.error("Error liking post:", error);
        // Revert optimistic update on error using dedicated revertLike action
        dispatch(
          revertLike({
            postId: post.id,
            isLiked: isCurrentlyLiked,
            likesCount: post.likes_count,
          }),
        );

        if (__DEV__) {
          Alert.alert(
            "API Error",
            "Like functionality requires backend implementation. Please check the backend API endpoints.",
          );
        }
      }
    },
    [likedPosts, dispatch, likeClassPost],
  );

  // Render post item (same as SchoolTab but with class-specific styling)
  const renderPost = ({ item: post }) => {
    // Use user-specific like state helper function
    const isLiked =
      getUserLikeState(schoolPostsState, post.id) || post.is_liked_by_user;

    return (
      <View style={styles.postContainer}>
        {/* Class/Grade indicator */}
        <View style={styles.classIndicator}>
          <Text style={styles.classText}>
            {userCategory === USER_CATEGORIES.PARENT
              ? "Class Post"
              : `${getGradeNameById(post.class_id)} Post`}
          </Text>
        </View>

        {/* Post Header */}
        <View style={styles.postHeader}>
          {/* <Image
            source={
              post.author_image
                ? { uri: post.author_image }
                : require("../../../assets/images/sample-profile.png")
            }
            style={styles.authorImage}
          /> */}
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{post.title}</Text>
            <Text style={styles.timestamp}>
              {new Date(post.created_at).toLocaleDateString()} • {post.category}
            </Text>
          </View>

          {/* Delete Button - Visible only to post creator */}
          {currentUser?.id === post.created_by && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeletePost(post.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="delete" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Post Content */}
        <Text style={styles.postContent}>{post.content}</Text>

        {/* Media */}
        {post.media && post.media.length > 0 && (
          <MediaViewer
            media={transformMediaData(post.media)}
            style={styles.mediaContainer}
          />
        )}

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <View style={styles.hashtagContainer}>
            {post.hashtags.map((hashtag, index) => (
              <Text key={`${post.id}-hashtag-${index}`} style={styles.hashtag}>
                #{hashtag}
              </Text>
            ))}
          </View>
        )}

        {/* Post Actions */}
        <View style={styles.postActions}>
          <TouchableOpacity
            style={[styles.actionButton, isLiked && styles.likedButton]}
            onPress={() => handleLike(post)}
          >
            <Icon
              name={isLiked ? "thumb-up" : "thumb-up-off-alt"}
              size={20}
              color={isLiked ? "#3b5998" : "#666"}
            />
            <Text style={[styles.actionText, isLiked && styles.likedText]}>
              {post.likes_count}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render footer with load more button or loading indicator
  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading more posts...</Text>
        </View>
      );
    }

    if (hasMoreData && allPostsLocal.length > 0) {
      return (
        <View style={styles.loadMoreContainer}>
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={handleLoadMore}
          >
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  // Show loading skeleton on initial load
  if (loading && (!posts || posts.length === 0)) {
    return (
      <View style={styles.container}>
        <CustomSkeleton />
      </View>
    );
  }

  // Show error state only for actual errors (not 404/no posts)
  if (error && (!posts || posts.length === 0)) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadPosts(1, false)}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon
              name="school"
              size={48}
              color="#ccc"
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No Class Posts</Text>
            <Text style={styles.emptyText}>
              {userCategory === USER_CATEGORIES.PARENT
                ? selectedStudent
                  ? `No posts available for ${selectedStudent.student_calling_name}'s class yet`
                  : "Please select a student to view class posts"
                : "No class posts have been shared yet"}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  listContainer: {
    paddingVertical: 10,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginHorizontal: 20,
    lineHeight: 20,
  },
  postContainer: {
    backgroundColor: "white",
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classIndicator: {
    backgroundColor: "#e8f5e8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  classText: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "600",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  authorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  authorInfo: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
  },
  authorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  postContent: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 10,
  },
  mediaContainer: {
    marginVertical: 10,
  },
  hashtagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 5,
  },
  hashtag: {
    color: "#3b5998",
    fontSize: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  likedButton: {
    backgroundColor: "#e3f2fd",
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#666",
  },
  likedText: {
    color: "#3b5998",
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadMoreButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loadMoreText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
});

export default ClassTabWithAPI;
