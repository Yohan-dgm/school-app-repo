import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import {
  setLoading,
  setError,
} from "../state-store/slices/school-life/school-posts-slice";

// A 404 (or Laravel "route/model not found") response is treated as "no
// posts" rather than a hard error, so the feed shows an empty state instead
// of a scary error screen.
const isNotFoundError = (error) =>
  error?.status === 404 ||
  error?.error?.status === 404 ||
  error?.data?.status === 404 ||
  (error?.data?.message && error.data.message.includes("could not be found")) ||
  (error?.data?.exception &&
    error.data.exception.includes("NotFoundHttpException"));

const getErrorMessage = (error) => {
  const status = error?.status || error?.error?.status || error?.data?.status;
  if (status === 500) return "Server error - please try again later";
  if (status === 401) return "Authentication required - please log in again";
  if (status === 403) return "Access denied - insufficient permissions";
  return (
    error?.message ||
    error?.data?.message ||
    error?.error?.message ||
    "An unexpected error occurred"
  );
};

/**
 * Shared pagination/loading state machine for the School/Class/Student post
 * feed tabs. Each tab supplies `fetchPage(pageNum)` — its own API call (and
 * any pre-fetch validation) — that resolves to `{ posts, hasMore }`.
 *
 * @param {(pageNum: number) => Promise<{ posts: any[], hasMore: boolean }>} fetchPage
 * @param {boolean} canFetch - when false, load()/loadMore() are no-ops (e.g. a parent hasn't selected a student yet)
 */
export const usePostFeedPagination = (fetchPage, canFetch = true) => {
  const dispatch = useDispatch();
  const [allPostsLocal, setAllPostsLocal] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  const reset = useCallback(() => {
    setCurrentPage(1);
    setHasMoreData(true);
    setAllPostsLocal([]);
  }, []);

  const load = useCallback(
    async (pageNum = 1, isLoadMore = false) => {
      if (!canFetch) return;

      try {
        if (isLoadMore) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          dispatch(setLoading(true));
        }

        const { posts: newPosts, hasMore } = await fetchPage(pageNum);

        if (isLoadMore) {
          setAllPostsLocal((prevPosts) => {
            const existingIds = new Set(prevPosts.map((post) => post.id));
            return [
              ...prevPosts,
              ...newPosts.filter((post) => !existingIds.has(post.id)),
            ];
          });
        } else {
          setAllPostsLocal(newPosts);
        }

        setHasMoreData(!!hasMore);
        setCurrentPage(pageNum);
        dispatch(setError(null));
      } catch (error) {
        console.error("Error loading post feed page:", error);

        if (isNotFoundError(error)) {
          setAllPostsLocal([]);
          setHasMoreData(false);
          dispatch(setError(null));
        } else {
          dispatch(setError(getErrorMessage(error)));
        }
      } finally {
        setIsLoading(false);
        dispatch(setLoading(false));
        setIsLoadingMore(false);
      }
    },
    [fetchPage, canFetch, dispatch],
  );

  const loadMore = useCallback(() => {
    if (hasMoreData && !isLoadingMore && !isLoading && canFetch) {
      load(currentPage + 1, true);
    }
  }, [hasMoreData, isLoadingMore, isLoading, canFetch, currentPage, load]);

  const refresh = useCallback(() => {
    reset();
    load(1, false);
  }, [reset, load]);

  return {
    allPostsLocal,
    setAllPostsLocal,
    isLoadingMore,
    hasMoreData,
    load,
    loadMore,
    refresh,
    reset,
  };
};

export default usePostFeedPagination;
