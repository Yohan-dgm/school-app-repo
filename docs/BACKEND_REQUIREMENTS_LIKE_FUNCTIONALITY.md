# Backend Requirements for Like Functionality

## 🚨 URGENT: Database Issue Fix Required

**Current Error:** `SQLSTATE[23505]: Unique violation: 7 ERROR: duplicate key value violates unique constraint "activity_feed_likes_pkey"`

**Root Cause:** The auto-increment sequence for the `activity_feed_likes` table is out of sync, causing primary key conflicts.

### Immediate Fix Steps:

#### 1. **Reset Auto-increment Sequence (PostgreSQL):**

```sql
-- Check current sequence value
SELECT currval('activity_feed_likes_id_seq');

-- Check max ID in table
SELECT MAX(id) FROM activity_feed_likes;

-- Reset sequence to correct value
SELECT setval('activity_feed_likes_id_seq', (SELECT COALESCE(MAX(id), 0) FROM activity_feed_likes));
```

#### 2. **Check for Duplicate Records:**

```sql
SELECT post_id, user_id, COUNT(*)
FROM activity_feed_likes
GROUP BY post_id, user_id
HAVING COUNT(*) > 1;
```

#### 3. **Remove Duplicates (if any):**

```sql
-- Create backup first
CREATE TABLE activity_feed_likes_backup AS SELECT * FROM activity_feed_likes;

-- Remove duplicates, keeping the earliest record
DELETE FROM activity_feed_likes
WHERE id NOT IN (
    SELECT DISTINCT ON (post_id, user_id) id
    FROM activity_feed_likes
    ORDER BY post_id, user_id, created_at ASC
);
```

#### 4. **Verify Fix:**

```sql
-- Check sequence is working
INSERT INTO activity_feed_likes (post_id, user_id) VALUES (999, 999);
DELETE FROM activity_feed_likes WHERE post_id = 999 AND user_id = 999;
```

---

## 🎯 Overview

This document outlines the backend requirements for implementing like functionality in the Toyar School App. The frontend is already implemented and ready to work with these backend endpoints.

## 🔗 Required API Endpoints

### 1. Like/Unlike Post Endpoint

**URL:** `POST /api/activity-feed/post/like`

**Request Body:**

```json
{
  "post_id": 1,
  "action": "like" // or "unlike"
}
```

**Success Response:**

```json
{
  "status": "successful",
  "message": "Post liked successfully",
  "data": {
    "post_id": 1,
    "likes_count": 16,
    "is_liked_by_user": true
  }
}
```

**Error Response:**

```json
{
  "status": "error",
  "message": "Post not found or user not authorized",
  "data": null
}
```

### 2. School Posts List Endpoint (Already exists but needs like data)

**URL:** `POST /api/activity-feed-management/school-posts/list`

**Important:** Ensure each post includes:

```json
{
  "id": 1,
  "likes_count": 15,
  "is_liked_by_user": false // CRITICAL: Current user's like status
  // ... other post fields
}
```

## 🗄️ Database Schema Requirements

### 1. activity_feed_post_likes Table

```sql
-- For PostgreSQL (current database)
CREATE TABLE activity_feed_likes (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_feed_likes_post FOREIGN KEY (post_id) REFERENCES activity_feed_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_feed_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_post_user_like UNIQUE (post_id, user_id)
);

-- Fix existing sequence issue (if table already exists)
SELECT setval('activity_feed_likes_id_seq', (SELECT MAX(id) FROM activity_feed_likes));

-- For MySQL (alternative)
CREATE TABLE activity_feed_post_likes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES activity_feed_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_post_user (post_id, user_id)
);
```

### 2. Update activity_feed_posts Table

```sql
ALTER TABLE activity_feed_posts
ADD COLUMN likes_count INT DEFAULT 0;

-- Create index for performance
CREATE INDEX idx_activity_feed_posts_likes_count ON activity_feed_posts(likes_count);
```

## 🔧 Backend Implementation Logic

### Like/Unlike Endpoint Logic:

```php
public function likePost(Request $request)
{
    $postId = $request->post_id;
    $action = $request->action; // 'like' or 'unlike'
    $userId = auth()->id();

    // Validate inputs
    if (!in_array($action, ['like', 'unlike'])) {
        return response()->json([
            'status' => 'error',
            'message' => 'Invalid action. Must be "like" or "unlike"'
        ], 400);
    }

    // Check if post exists and user has access
    $post = ActivityFeedPost::find($postId);
    if (!$post) {
        return response()->json([
            'status' => 'error',
            'message' => 'Post not found'
        ], 404);
    }

    DB::beginTransaction();
    try {
        if ($action === 'like') {
            // Add like (ignore if already exists)
            ActivityFeedPostLike::firstOrCreate([
                'post_id' => $postId,
                'user_id' => $userId
            ]);
        } else {
            // Remove like
            ActivityFeedPostLike::where([
                'post_id' => $postId,
                'user_id' => $userId
            ])->delete();
        }

        // Update likes count
        $likesCount = ActivityFeedPostLike::where('post_id', $postId)->count();
        $post->update(['likes_count' => $likesCount]);

        // Check current user's like status
        $isLikedByUser = ActivityFeedPostLike::where([
            'post_id' => $postId,
            'user_id' => $userId
        ])->exists();

        DB::commit();

        return response()->json([
            'status' => 'successful',
            'message' => $action === 'like' ? 'Post liked successfully' : 'Post unliked successfully',
            'data' => [
                'post_id' => $postId,
                'likes_count' => $likesCount,
                'is_liked_by_user' => $isLikedByUser
            ]
        ]);

    } catch (Exception $e) {
        DB::rollback();
        return response()->json([
            'status' => 'error',
            'message' => 'Failed to process like action'
        ], 500);
    }
}
```

### Update Posts List Query:

When fetching posts, include user's like status:

```php
$posts = ActivityFeedPost::with(['media', 'hashtags'])
    ->leftJoin('activity_feed_post_likes', function($join) use ($userId) {
        $join->on('activity_feed_posts.id', '=', 'activity_feed_post_likes.post_id')
             ->where('activity_feed_post_likes.user_id', '=', $userId);
    })
    ->select([
        'activity_feed_posts.*',
        DB::raw('CASE WHEN activity_feed_post_likes.id IS NOT NULL THEN true ELSE false END as is_liked_by_user')
    ])
    ->paginate($pageSize);
```

## 🔒 Security & Validation

1. **Authentication:** All endpoints require valid user token
2. **Authorization:** Validate user has access to the post based on their role
3. **Rate Limiting:** Implement rate limiting to prevent spam liking
4. **Input Validation:** Validate post_id exists and action is valid
5. **SQL Injection Prevention:** Use parameterized queries
6. **CSRF Protection:** Implement CSRF tokens for state-changing operations

## 🚀 Performance Considerations

1. **Database Indexes:** Create indexes on frequently queried columns
2. **Caching:** Consider caching popular posts and their like counts
3. **Batch Operations:** Use database transactions for consistency
4. **Optimistic Locking:** Handle concurrent like/unlike operations
5. **Query Optimization:** Use efficient JOIN queries for like status

## ✅ Testing Checklist

- [ ] Like a post (should increment count and set is_liked_by_user = true)
- [ ] Unlike a post (should decrement count and set is_liked_by_user = false)
- [ ] Double like (should not increment count twice)
- [ ] Double unlike (should handle gracefully)
- [ ] Like non-existent post (should return 404)
- [ ] Like without authentication (should return 401)
- [ ] Like with invalid action (should return 400)
- [ ] Concurrent like operations (should handle race conditions)
- [ ] Database rollback on errors
- [ ] Rate limiting functionality

## 📱 Frontend Integration

The frontend is already implemented and will:

- ✅ Send POST requests to `/api/activity-feed/post/like`
- ✅ Handle optimistic UI updates
- ✅ Revert changes on API errors
- ✅ Display loading states
- ✅ Show updated like counts immediately

## 🔄 API Response Handling

The frontend expects these exact response formats:

- Success: `{ "status": "successful", "data": { "likes_count": 16, "is_liked_by_user": true } }`
- Error: `{ "status": "error", "message": "Error description" }`

**Important:** The `status` field must be exactly "successful" for the frontend to process the response correctly.
