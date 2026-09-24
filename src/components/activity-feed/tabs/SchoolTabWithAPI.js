import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import PostSkeleton from "../../ui/PostSkeleton";
import { theme } from "../../../styles/theme";
import PostCard from "../PostCard";
import PostsEmptyState from "../PostsEmptyState";
import { usePostFeedPagination } from "../../../hooks/usePostFeedPagination";

// Import API hooks and slice actions
import {
  useLazyGetSchoolPostsQuery,
  useLikePostMutation,
  useDeleteSchoolPostMutation,
} from "../../../api/activity-feed-api";
import {
  setPosts,
  clearFilters,
  toggleLike,
  revertLike,
  getUserLikeState,
} from "../../../state-store/slices/school-life/school-posts-slice";

// Import filter transformation utility
import { transformFiltersForAPI } from "../FilterBar";

const FILTER_DEBOUNCE_MS = 400;

const SchoolTabWithAPI = ({ filters, userCategory, isConnected }) => {
  const dispatch = useDispatch();

  // Get current user from global state
  const { user: currentUser } = useSelector((state) => state.app);
  const schoolPostsState = useSelector((state) => state.schoolPosts || {});
  const {
    posts = [],
    loading = false,
    refreshing = false,
    error = null,
  } = schoolPostsState;

  // API hooks
  const [getSchoolPosts] = useLazyGetSchoolPostsQuery();
  const [likePost] = useLikePostMutation();
  const [deleteSchoolPost] = useDeleteSchoolPostMutation();

  // Fetch one page of school posts (tab-specific request shape/response parsing)
  const fetchSchoolPostsPage = useCallback(
    async (pageNum) => {
      const apiFilters = transformFiltersForAPI(filters || {});

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

      if (response.status !== "successful") {
        throw new Error(response.message || "Failed to load posts");
      }

      const newPosts = Array.isArray(response.data)
        ? response.data
        : response.data.posts || [];

      // Data-integrity check: warn (don't spam) if the backend ever returns duplicate ids
      const postIds = newPosts.map((post) => post.id);
      const uniquePostIds = new Set(postIds);
      if (postIds.length !== uniquePostIds.size) {
        console.warn("⚠️ Duplicate post IDs detected in API response:", {
          totalPosts: postIds.length,
          uniquePosts: uniquePostIds.size,
        });
      }

      return {
        posts: newPosts,
        hasMore: response.pagination?.has_more || false,
      };
    },
    [getSchoolPosts, filters],
  );

  const {
    allPostsLocal,
    setAllPostsLocal,
    isLoadingMore,
    load: loadPosts,
    loadMore: handleLoadMore,
    refresh: handleRefresh,
  } = usePostFeedPagination(fetchSchoolPostsPage);

  // Clear any existing filters when component mounts
  useEffect(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  // Load initial posts once on mount
  useEffect(() => {
    loadPosts(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch from the backend (search/category/date/hashtag filtering all
  // happen server-side now) whenever the user's filters change, debounced so
  // typing in the search box doesn't fire a request per keystroke.
  const isFirstFiltersRun = useRef(true);
  useEffect(() => {
    if (isFirstFiltersRun.current) {
      isFirstFiltersRun.current = false;
      return;
    }

    const timer = setTimeout(() => {
      loadPosts(1, false);
    }, FILTER_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Keep Redux in sync with the (already backend-filtered) posts
  useEffect(() => {
    dispatch(
      setPosts({
        posts: allPostsLocal,
        pagination: {
          current_page: 1,
          total: allPostsLocal.length,
          has_more: false,
        },
      }),
    );
  }, [allPostsLocal, dispatch]);

  // Handle delete post
  const handleDeletePost = useCallback(
    (postId) => {
      Alert.alert(
        "Delete Post",
        "Are you sure you want to delete this post? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                setAllPostsLocal((prevPosts) =>
                  prevPosts.filter((post) => post.id !== postId),
                );

                const response = await deleteSchoolPost({
                  id: postId,
                }).unwrap();

                if (!response.success) {
                  loadPosts(1, false);
                  Alert.alert(
                    "Error",
                    response.message || "Failed to delete post",
                  );
                }
              } catch (error) {
                console.error("❌ Error deleting post:", error);
                loadPosts(1, false);
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
    [deleteSchoolPost, loadPosts, setAllPostsLocal],
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

      dispatch(
        toggleLike({
          postId: post.id,
          isLiked: !isCurrentlyLiked,
          likesCount: newLikesCount,
        }),
      );

      try {
        const response = await likePost({ post_id: post.id, action }).unwrap();

        if (response.status === "successful") {
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
        dispatch(
          revertLike({
            postId: post.id,
            isLiked: isCurrentlyLiked,
            likesCount: post.likes_count,
          }),
        );
      }
    },
    [schoolPostsState, dispatch, likePost],
  );

  const renderPost = useCallback(
    ({ item: post }) => {
      const isLiked =
        getUserLikeState(schoolPostsState, post.id) || post.is_liked_by_user;

      return (
        <PostCard
          post={post}
          currentUserId={currentUser?.id}
          isLiked={isLiked}
          onLike={handleLike}
          onDelete={handleDeletePost}
        />
      );
    },
    [schoolPostsState, currentUser?.id, handleLike, handleDeletePost],
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading more posts...</Text>
      </View>
    );
  };

  // Show loading skeleton on initial load
  if (loading && (!posts || posts.length === 0)) {
    return (
      <View style={styles.container}>
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
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
        ListEmptyComponent={
          <PostsEmptyState
            icon="domain"
            title="No School Posts"
            message="No school-wide posts have been shared yet"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews={Platform.OS === "android"}
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
  loadingFooter: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
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
