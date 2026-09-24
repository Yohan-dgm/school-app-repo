import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { theme } from "../../../styles/theme";
import PostSkeleton from "../../ui/PostSkeleton";
import PostCard from "../PostCard";
import PostsEmptyState from "../PostsEmptyState";
import ClassPostCommentsSection from "../ClassPostCommentsSection";
import { usePostFeedPagination } from "../../../hooks/usePostFeedPagination";

// Import API hooks and slice actions
import {
  useLazyGetClassPostsQuery,
  useLikeClassPostMutation,
  useDeleteClassPostMutation,
} from "../../../api/activity-feed-api";
import {
  setPosts,
  clearFilters,
  toggleLike,
  revertLike,
  getUserLikeState,
} from "../../../state-store/slices/school-life/school-posts-slice";

// Import grade level utilities and user category constants
import { getGradeNameById } from "../../../constants/gradeLevels";
import { USER_CATEGORIES } from "../../../constants/userCategories";
import { transformFiltersForAPI } from "../FilterBar";

const FILTER_DEBOUNCE_MS = 400;

const ClassTabWithAPI = ({ filters, userCategory, isConnected }) => {
  const dispatch = useDispatch();

  const schoolPostsState = useSelector((state) => state.schoolPosts || {});
  const {
    posts = [],
    loading = false,
    refreshing = false,
    error = null,
  } = schoolPostsState;

  const { user: currentUser, selectedStudent } = useSelector(
    (state) => state.app,
  );

  // API hooks - using dedicated class posts API
  const [getClassPosts] = useLazyGetClassPostsQuery();
  const [likeClassPost] = useLikeClassPostMutation();
  const [deleteClassPost] = useDeleteClassPostMutation();

  const isParent = userCategory === USER_CATEGORIES.PARENT;
  const canFetchClassPosts = !isParent || !!selectedStudent?.class_id;

  // Fetch one page of class posts (tab-specific request shape/response parsing)
  const fetchClassPostsPage = useCallback(
    async (pageNum) => {
      const apiFilters = transformFiltersForAPI(filters || {});

      const apiParams = {
        page: pageNum,
        limit: 10,
        filters: {
          search: apiFilters.search,
          category: apiFilters.category,
          date_from: apiFilters.dateFrom,
          date_to: apiFilters.dateTo,
          hashtags: apiFilters.hashtags,
        },
        class_id: isParent ? selectedStudent?.class_id : null,
      };

      const response = await getClassPosts(apiParams).unwrap();

      if (response.status !== "successful") {
        throw new Error(response.message || "Failed to load posts");
      }

      const newPosts = Array.isArray(response.data)
        ? response.data
        : response.data.posts || [];

      return {
        posts: newPosts,
        hasMore: response.pagination?.has_more || false,
      };
    },
    [getClassPosts, isParent, selectedStudent?.class_id, filters],
  );

  const {
    allPostsLocal,
    setAllPostsLocal,
    isLoadingMore,
    load: loadPosts,
    loadMore: handleLoadMore,
    refresh: handleRefresh,
    reset: resetPagination,
  } = usePostFeedPagination(fetchClassPostsPage, canFetchClassPosts);

  // Clear any existing filters when component mounts
  useEffect(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  // Load class posts whenever the fetch-relevant params change
  useEffect(() => {
    resetPagination();
    loadPosts(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isParent, selectedStudent?.class_id]);

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
      resetPagination();
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

                const response = await deleteClassPost({
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
                console.error("❌ Error deleting class post:", error);
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
    [deleteClassPost, loadPosts, setAllPostsLocal],
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
        const response = await likeClassPost({
          post_id: post.id,
          action,
        }).unwrap();

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
    [schoolPostsState, dispatch, likeClassPost],
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
          extraContent={
            <View style={styles.classIndicator}>
              <Text style={styles.classText}>
                {isParent
                  ? "Class Post"
                  : `${getGradeNameById(post.class_id)} Post`}
              </Text>
            </View>
          }
          belowActions={
            <ClassPostCommentsSection
              postId={post.id}
              commentsCount={post.comments_count || 0}
            />
          }
        />
      );
    },
    [schoolPostsState, currentUser?.id, handleLike, handleDeletePost, isParent],
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
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews={Platform.OS === "android"}
        ListEmptyComponent={
          <PostsEmptyState
            icon="school"
            title="No Class Posts"
            message={
              isParent
                ? selectedStudent
                  ? `No posts available for ${selectedStudent.student_calling_name}'s class yet`
                  : "Please select a student to view class posts"
                : "No class posts have been shared yet"
            }
          />
        }
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

export default ClassTabWithAPI;
