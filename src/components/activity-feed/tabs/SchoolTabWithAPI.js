import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  Alert,
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
  useLazyGetSchoolPostsQuery,
  useLikePostMutation,
  useDeleteSchoolPostMutation,
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

// Get API base URL from environment
const API_BASE_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BASE_URL_API_SERVER_1 ||
  process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1;

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

const SchoolTabWithAPI = ({ filters, userCategory, isConnected }) => {
  const dispatch = useDispatch();

  // Debug filters being passed to component
  useEffect(() => {
    console.log("🎯 SchoolTabWithAPI - Filters received:", filters);
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

  // API hooks
  const [getSchoolPosts] = useLazyGetSchoolPostsQuery();
  const [likePost] = useLikePostMutation();
  const [deleteSchoolPost] = useDeleteSchoolPostMutation();

  // Local state for pagination and data
  const [allPostsLocal, setAllPostsLocal] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  // Fetch posts function
  const fetchPosts = useCallback(
    async (pageNum = 1, isRefresh = false, currentFilters = {}) => {
      try {
        if (isRefresh) {
          dispatch(setRefreshing(true));
          setPage(1);
        } else if (pageNum === 1) {
          dispatch(setLoading(true));
        } else {
          setIsLoadingMore(true);
        }

        // Transform filters to API format
        const apiFilters = transformFiltersForAPI(currentFilters);

        console.log("🔍 Applying filters:", {
          original: currentFilters,
          transformed: apiFilters,
        });

        const response = await getSchoolPosts({
          page: pageNum,
          limit: 10,
          filters: {
            search: apiFilters.search,
            category: apiFilters.category,
            date_from: apiFilters.dateFrom,
            date_to: apiFilters.dateTo,
            year: apiFilters.year,
            hashtags: apiFilters.hashtags,
          },
        }).unwrap();

        if (response.status === "successful") {
          dispatch(
            setPosts({
              posts: response.data.posts,
              pagination: response.data.pagination,
              append: pageNum > 1 && !isRefresh,
            }),
          );

          if (pageNum > 1) {
            setPage(pageNum);
          }
        } else {
          dispatch(setError(response.message || "Failed to fetch posts"));
        }
      } catch (error) {
        console.error("Error fetching school posts:", error);
        dispatch(setError(error.message || "Network error occurred"));

        // Show fallback message for development
        if (__DEV__) {
          Alert.alert(
            "API Not Available",
            "Using dummy data for development. Please implement the backend API endpoints.",
            [{ text: "OK" }],
          );
        }
      } finally {
        dispatch(setLoading(false));
        dispatch(setRefreshing(false));
        setIsLoadingMore(false);
      }
    },
    [getSchoolPosts, dispatch],
  );

  // Load posts with pagination
  const loadPosts = useCallback(
    async (pageNum = 1, isLoadMore = false) => {
      try {
        if (isLoadMore) {
          setIsLoadingMore(true);
        } else {
          dispatch(setLoading(true));
        }

        console.log(
          `🔄 Loading school posts - page ${pageNum}${isLoadMore ? " (load more)" : ""}...`,
        );

        const response = await getSchoolPosts({
          page: pageNum,
          limit: 10, // Load 10 posts per page for optimization
          filters: {
            search: "",
            category: "",
            date_from: "",
            date_to: "",
            year: "",
            hashtags: [],
          },
        }).unwrap();

        if (response.status === "successful") {
          const newPostsData = Array.isArray(response.data)
            ? response.data
            : response.data.posts || [];

          console.log(
            `✅ Successfully loaded ${newPostsData.length} school posts for page ${pageNum}`,
          );

          // Debug: Log post IDs to identify potential duplicates
          const postIds = newPostsData.map((post) => post.id);
          const uniquePostIds = [...new Set(postIds)];
          if (postIds.length !== uniquePostIds.length) {
            console.warn(`⚠️ Duplicate post IDs detected in API response:`, {
              totalPosts: postIds.length,
              uniquePosts: uniquePostIds.length,
              duplicateIds: postIds.filter(
                (id, index) => postIds.indexOf(id) !== index,
              ),
            });
          } else {
            console.log(
              `🔍 All ${postIds.length} post IDs are unique:`,
              postIds,
            );
          }

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
                `🔍 Deduplication: ${newPostsData.length} new posts, ${uniqueNewPosts.length} unique posts added`,
              );
              return [...prevPosts, ...uniqueNewPosts];
            });
          } else {
            // Replace posts (initial load or refresh)
            setAllPostsLocal(newPostsData);
            setHasLoadedInitialData(true);
          }

          setHasMoreData(hasMore);
          setCurrentPage(pageNum);
          dispatch(setError(null));
        } else {
          dispatch(setError(response.message || "Failed to load posts"));
        }
      } catch (error) {
        console.error("Error in loadPosts:", {
          error: error,
          status: error?.status,
          data: error?.data,
          message: error?.message,
          page: pageNum,
          isLoadMore,
          timestamp: new Date().toISOString(),
        });

        // Handle different error types gracefully
        let errorMessage = "An unexpected error occurred";
        if (error?.status === 500) {
          errorMessage = "Server error - please try again later";
        } else if (error?.status === 401) {
          errorMessage = "Authentication required - please log in again";
        } else if (error?.status === 403) {
          errorMessage = "Access denied - insufficient permissions";
        } else if (error?.message) {
          errorMessage = error.message;
        }

        dispatch(setError(errorMessage));
      } finally {
        dispatch(setLoading(false));
        setIsLoadingMore(false);
      }
    },
    [dispatch, getSchoolPosts],
  );

  // Frontend filtering function
  const filterPostsLocally = useCallback((postsToFilter, currentFilters) => {
    if (!postsToFilter || postsToFilter.length === 0) return [];

    console.log("🔍 Frontend filtering with:", currentFilters);

    return postsToFilter.filter((post) => {
      // SCHOOL TAB SPECIFIC FILTERING:
      // Only show posts where school_id = 1 (school-wide posts)
      // AND both class_id and student_id are null
      if (!post.school_id || post.school_id !== 1) {
        console.log(
          `🏫 Filtering out post ${post.id}: school_id is not 1 (current: ${post.school_id})`,
        );
        return false;
      }

      if (post.class_id !== null && post.class_id !== undefined) {
        console.log(
          `🏫 Filtering out post ${post.id}: has class_id (${post.class_id}) - not school-wide`,
        );
        return false;
      }

      if (post.student_id !== null && post.student_id !== undefined) {
        console.log(
          `🏫 Filtering out post ${post.id}: has student_id (${post.student_id}) - not school-wide`,
        );
        return false;
      }

      // console.log(
      //   `🏫 Including school post ${post.id}: school_id=${post.school_id}, class_id=${post.class_id}, student_id=${post.student_id}`,
      // );

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

      // Category filter - only filter if category is specified and not "all"
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

      // Hashtags filter - only filter if hashtags are specified
      if (currentFilters.hashtags && currentFilters.hashtags.length > 0) {
        const postHashtags = post.hashtags || [];
        const hasMatchingHashtag = currentFilters.hashtags.some((filterTag) =>
          postHashtags.some((postTag) =>
            postTag.toLowerCase().includes(filterTag.toLowerCase()),
          ),
        );
        if (!hasMatchingHashtag) return false;
      }

      // Date range filter - only filter if dates are actually set
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

      // Year filter - only filter if year is specified and not "all"
      if (
        currentFilters.year &&
        currentFilters.year !== "all" &&
        currentFilters.year !== ""
      ) {
        const postDate = new Date(post.created_at);
        const postYear = postDate.getFullYear();
        const filterYear = parseInt(currentFilters.year);

        if (postYear !== filterYear) {
          return false;
        }
      }

      return true;
    });
  }, []);

  // Clear any existing filters when component mounts
  useEffect(() => {
    console.log("🧹 Clearing any existing filters on component mount");
    dispatch(clearFilters());
  }, [dispatch]);

  // Load initial posts (only once)
  useEffect(() => {
    if (!hasLoadedInitialData) {
      loadPosts(1, false);
    }
  }, [hasLoadedInitialData, loadPosts]);

  // Debug allPostsLocal changes
  useEffect(() => {
    console.log("🔄 allPostsLocal changed:", allPostsLocal?.length || 0);
  }, [allPostsLocal]);

  console.log("🔧 About to define filteredPosts useMemo");

  // Frontend filtering - filter allPostsLocal based on current filters
  const filteredPosts = useMemo(() => {
    console.log("🚀 useMemo filteredPosts is executing!");
    if (!allPostsLocal || allPostsLocal.length === 0) {
      console.log("❌ No allPostsLocal available:", allPostsLocal?.length || 0);
      return [];
    }

    // Check if filters are effectively empty (no real filtering needed)
    const hasActiveFilters =
      filters &&
      ((filters.searchTerm && filters.searchTerm.trim() !== "") ||
        (filters.category &&
          filters.category !== "all" &&
          filters.category !== "") ||
        (filters.year && filters.year !== "all" && filters.year !== "") ||
        (filters.hashtags && filters.hashtags.length > 0) ||
        (filters.dateRange &&
          (filters.dateRange.start || filters.dateRange.end)));

    console.log("🔍 Filtering Debug:", {
      allPostsCount: allPostsLocal.length,
      filters,
      hasActiveFilters,
    });

    // ALWAYS apply school-specific filtering, regardless of other filters
    const filtered = filterPostsLocally(allPostsLocal, filters);
    console.log(
      "🔍 School filtering complete - filtered posts:",
      filtered.length,
    );
    return filtered;
  }, [allPostsLocal, filters, filterPostsLocally]);

  // Update Redux state when filtered posts change
  useEffect(() => {
    if (hasLoadedInitialData && filteredPosts) {
      console.log(
        `🔍 Frontend filtering complete: ${filteredPosts.length} posts match filters`,
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
  }, [filteredPosts, hasLoadedInitialData, dispatch]);

  // Handle refresh - reload first page
  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    setHasMoreData(true);
    setAllPostsLocal([]); // Clear current posts
    setHasLoadedInitialData(false);
    loadPosts(1, false);
  }, [loadPosts]);

  // Handle load more - fetch next page
  const handleLoadMore = useCallback(() => {
    if (hasMoreData && !isLoadingMore && !loading) {
      const nextPage = currentPage + 1;
      console.log(`📄 Loading more posts - page ${nextPage}`);
      loadPosts(nextPage, true);
    }
  }, [hasMoreData, isLoadingMore, loading, currentPage, loadPosts]);

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

                const response = await deleteSchoolPost({
                  post_id: postId,
                }).unwrap();

                if (response.success) {
                  console.log("✅ Post deleted successfully");
                } else {
                  // Revert optimistic update on failure
                  loadPosts(1, false); // Reload posts to restore state
                  Alert.alert(
                    "Error",
                    response.message || "Failed to delete post",
                  );
                }
              } catch (error) {
                console.error("❌ Error deleting post:", error);
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
    [deleteSchoolPost, loadPosts],
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
        const response = await likePost({
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
    [likedPosts, dispatch, likePost],
  );

  // Render post item
  const renderPost = ({ item: post }) => {
    // Use user-specific like state helper function
    const isLiked =
      getUserLikeState(schoolPostsState, post.id) || post.is_liked_by_user;

    return (
      <View style={styles.postContainer}>
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

          {/* Delete Button - Hidden per user request */}
          {false && (
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

  // Show error state
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
        data={posts || []}
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
    // backgroundColor: "red",
    paddingBottom: 100,
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
});

export default SchoolTabWithAPI;
