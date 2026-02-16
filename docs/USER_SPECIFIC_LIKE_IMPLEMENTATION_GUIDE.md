# User-Specific Like State Implementation Guide

## Overview

This implementation fixes the critical issue where like states were persisting across different user logins. Now each user has their own isolated like states that are properly managed during login/logout cycles.

## Key Changes Made

### 1. Updated Post Slices Structure

All three post slices (`school-posts-slice.ts`, `class-posts-slice.ts`, `student-posts-slice.ts`) have been updated with:

- **User-specific like tracking**: `likedPosts: { [userPostKey: string]: boolean }` where key format is `"userId_postId"`
- **Current user ID storage**: `currentUserId: number | null` to track the active user
- **New action**: `setCurrentUserId` to update the current user and clear previous user's like states
- **Updated actions**: `toggleLike` and `revertLike` now use user-specific keys
- **Enhanced cleanup**: `clearData` now also clears `currentUserId`

### 2. App Slice Enhancements

- Added thunk actions: `setUserWithPostsUpdate` and `logoutWithPostsCleanup`
- These actions coordinate user management with post state updates

### 3. Middleware Implementation

Created `user-posts-middleware.ts` that:

- Intercepts user login/logout actions
- Automatically updates all post slices with current user ID on login
- Clears all post data on logout to prevent cross-user contamination

### 4. Helper Functions

Added `getUserLikeState` helper function to each post slice for easy like state retrieval.

## How to Use

### During Login Process

Replace your current user setting logic with:

```typescript
import { setUserWithPostsUpdate } from "@/state-store/slices/app-slice";

// Instead of dispatch(setUser(userData))
dispatch(setUserWithPostsUpdate(userData));
```

### During Logout Process

Replace your current logout logic with:

```typescript
import { logoutWithPostsCleanup } from "@/state-store/slices/app-slice";

// Instead of dispatch(logout())
dispatch(logoutWithPostsCleanup());
```

### Getting User-Specific Like State

In your components, use the helper functions:

```typescript
import { getUserLikeState } from "@/state-store/slices/school-life/school-posts-slice";

// In your component
const schoolPostsState = useSelector((state: RootState) => state.schoolPosts);
const isLiked = getUserLikeState(schoolPostsState, postId);
```

### Example Component Usage

```typescript
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/state-store/store';
import { getUserLikeState, toggleLike } from '@/state-store/slices/school-life/school-posts-slice';
import { useLikePostMutation } from '@/api/post-api';

const PostLikeButton = ({ post }) => {
  const dispatch = useDispatch();
  const [likePost] = useLikePostMutation();
  const schoolPostsState = useSelector((state: RootState) => state.schoolPosts);

  // Get user-specific like state
  const isLiked = getUserLikeState(schoolPostsState, post.id);

  const handleLike = async () => {
    const newLikedState = !isLiked;
    const newLikesCount = newLikedState ? post.likes_count + 1 : post.likes_count - 1;

    // Optimistic update
    dispatch(toggleLike({
      postId: post.id,
      isLiked: newLikedState,
      likesCount: newLikesCount,
    }));

    try {
      await likePost({
        post_id: post.id,
        action: newLikedState ? 'like' : 'unlike',
      }).unwrap();
    } catch (error) {
      // Revert on error
      dispatch(toggleLike({
        postId: post.id,
        isLiked: isLiked,
        likesCount: post.likes_count,
      }));
    }
  };

  return (
    <button onClick={handleLike}>
      {isLiked ? '❤️' : '🤍'} {post.likes_count}
    </button>
  );
};
```

## Files Modified

1. **src/state-store/slices/school-life/school-posts-slice.ts**
2. **src/state-store/slices/school-life/class-posts-slice.ts**
3. **src/state-store/slices/school-life/student-posts-slice.ts**
4. **src/state-store/slices/app-slice.ts**
5. **src/state-store/store.ts**

## Files Created

1. **src/state-store/middleware/user-posts-middleware.ts**
2. **USER_SPECIFIC_LIKE_IMPLEMENTATION_GUIDE.md** (this file)

## Testing the Implementation

1. **Login with User A** and like some posts
2. **Logout** and verify like states are cleared
3. **Login with User B** and verify they don't see User A's like states
4. **Like different posts** as User B
5. **Switch back to User A** and verify their original like states are restored from backend

## Visual Feedback Implementation

The like button now provides proper visual feedback:

- **Liked State (Active)**: Blue color (`#3b5998` or `#4267B2`) with filled thumb-up icon
- **Unliked State (Default)**: Gray color (`#666` or `#65676B`) with outline thumb-up icon
- **Background Effect**: Light blue background (`#e3f2fd`) when liked
- **Text Color**: Blue text for like count when active

### Updated Components

1. **SchoolTabWithAPI**: ✅ Updated to use `getUserLikeState` helper
2. **StudentTabWithAPI**: ✅ Updated to use `getUserLikeState` helper
3. **ClassTabWithAPI**: ⚠️ Currently using dummy data (not connected to Redux)
4. **ParentHomeScreen**: ✅ Already has proper color implementation

## Important Notes

- The middleware automatically handles user ID propagation to all post slices
- Like states are now stored with format `"userId_postId"` for complete isolation
- All existing like functionality remains the same from the component perspective
- The backend integration remains unchanged - only frontend state management is improved
- Redux persist will maintain user-specific like states across app restarts for the same user
- **Visual feedback is now properly implemented** with blue colors for liked state and gray for unliked state

## Troubleshooting

If you encounter issues:

1. **Check user data structure**: Ensure your login response contains `id` or `user_id` field
2. **Verify middleware is active**: Check that `userPostsMiddleware` is included in store configuration
3. **Use correct actions**: Make sure to use `setUserWithPostsUpdate` and `logoutWithPostsCleanup` instead of direct user actions
4. **Check helper functions**: Use `getUserLikeState` helper functions instead of direct state access
5. **Visual feedback not working**: Ensure components are using the updated `getUserLikeState` function instead of direct `likedPosts[postId]` access

## Color Reference

- **Liked (Blue)**: `#3b5998`, `#4267B2`
- **Unliked (Gray)**: `#666`, `#65676B`
- **Background (Liked)**: `#e3f2fd`

This implementation ensures complete isolation of like states between different users while maintaining all existing functionality and providing proper visual feedback.
