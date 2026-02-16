# Student Posts API Documentation

## Overview

The Student Posts API allows authenticated users to create posts related to specific students. This endpoint is part of the Activity Feed Management module and supports rich media uploads, hashtags, and flexible post categorization.

## Endpoint Details

- **URL**: `POST /api/activity-feed-management/student-posts/create`
- **Authentication**: Required (Bearer Token via AuthGuard middleware)
- **Content-Type**: `application/json` or `multipart/form-data`
- **Handler**: `CreateStudentPostIntent` → `CreateStudentPostAction`

## Request Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `title` | string | Post title (required) |
| `content` | string | Post content/body text (required) |
| `student_id` | integer | ID of the student this post is about (required) |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `school_id` | integer | 1 | School ID associated with the post |
| `type` | string | "post" | Post type (e.g., "post", "announcement") |
| `category` | string | null | Post category (e.g., "achievement", "behavior") |
| `class_id` | integer | null | Associated class ID |
| `author_id` | integer | auth user | Post author ID (defaults to authenticated user) |
| `hashtags` | array/string | [] | Array of hashtag strings or comma-separated string |
| `media` | array | [] | Array of media objects (pre-uploaded media) |
| `media_files` | array | [] | Array of uploaded file objects (direct upload) |

## Authentication

All requests must include a valid JWT Bearer token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The `user_id` is automatically extracted from the authenticated user's token via the `AuthGuard` middleware.

## Request Examples

### Example 1: Basic Post Creation

The simplest form with only required fields:

```json
POST /api/activity-feed-management/student-posts/create
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "title": "Great Progress This Week",
  "content": "Excellent work on the math assignment! #mathematics #progress",
  "student_id": 123
}
```

### Example 2: Full Post with All Optional Fields

```json
{
  "title": "Monthly Achievement Report",
  "content": "Outstanding performance in Science Fair! The project demonstrated excellent understanding of physics principles. #science #achievement #excellence",
  "student_id": 123,
  "school_id": 1,
  "class_id": 5,
  "type": "post",
  "category": "achievement",
  "hashtags": ["science", "physics", "achievement", "monthly"]
}
```

### Example 3: Post with Pre-uploaded Media (Two-Step Process)

First upload media files using the media upload endpoint, then create the post:

```json
{
  "title": "Science Fair Project",
  "content": "Check out the amazing science project! #science #fair #STEM",
  "student_id": 123,
  "category": "achievement",
  "media": [
    {
      "type": "image",
      "url": "api/activity-feed-management/storage/file/temp-uploads/temp-1234567890-photo1.jpg",
      "filename": "temp-1234567890-photo1.jpg",
      "original_filename": "science_project.jpg",
      "size": 1024000,
      "mime_type": "image/jpeg",
      "width": 1920,
      "height": 1080
    },
    {
      "type": "video",
      "url": "api/activity-feed-management/storage/file/temp-uploads/temp-1234567891-video.mp4",
      "filename": "temp-1234567891-video.mp4",
      "original_filename": "project_demo.mp4",
      "size": 5242880,
      "mime_type": "video/mp4",
      "width": 1920,
      "height": 1080,
      "duration": 45
    }
  ]
}
```

## Media Upload Formats

The backend supports three media upload formats:

### Format 1: New Indexed Format (Recommended for React Native)

```javascript
const formData = new FormData();

// Metadata
formData.append('title', 'My Post');
formData.append('content', 'Post content');
formData.append('student_id', '123');
formData.append('media_count', '2');

// First media file
formData.append('media_0', {
  uri: 'file:///path/to/photo.jpg',
  name: 'photo.jpg',
  type: 'image/jpeg'
});
formData.append('media_0_type', 'image');
formData.append('media_0_size', '1024000');

// Second media file
formData.append('media_1', {
  uri: 'file:///path/to/video.mp4',
  name: 'video.mp4',
  type: 'video/mp4'
});
formData.append('media_1_type', 'video');
formData.append('media_1_size', '5242880');
```

### Format 2: Legacy FormData Format

```javascript
const formData = new FormData();
formData.append('title', 'My Post');
formData.append('content', 'Post content');
formData.append('student_id', '123');
formData.append('media[]', fileObject1);
formData.append('media[]', fileObject2);
```

### Format 3: Pre-uploaded Media (Two-Step Process - Recommended)

**Step 1: Upload media files**
```javascript
POST /api/activity-feed-management/media/upload
Content-Type: multipart/form-data

// Upload files and receive temporary URLs
```

**Step 2: Create post with media URLs**
```json
{
  "title": "My Post",
  "content": "Post content",
  "student_id": 123,
  "media": [
    {
      "type": "image",
      "url": "api/activity-feed-management/storage/file/temp-uploads/temp-xxxxx.jpg",
      "filename": "temp-xxxxx.jpg",
      "original_filename": "photo.jpg",
      "size": 1024000,
      "mime_type": "image/jpeg"
    }
  ]
}
```

## Hashtag Formats

The API supports multiple hashtag input formats:

### Array Format (Recommended)
```json
{
  "hashtags": ["science", "achievement", "STEM"]
}
```

### Comma-Separated String
```json
{
  "hashtags": "science,achievement,STEM"
}
```

### JSON String
```json
{
  "hashtags": "[\"science\",\"achievement\",\"STEM\"]"
}
```

### Content Extraction (Automatic)
The backend automatically extracts hashtags from the content field:

```json
{
  "content": "Great work on the project! #science #achievement #excellence"
}
```

This will automatically create hashtag entries for: `science`, `achievement`, `excellence`

**Note**: Hashtags from the `hashtags` parameter and content extraction are combined, with duplicates removed.

## Response Format

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Student post created successfully",
  "data": {
    "id": 456,
    "type": "post",
    "category": "achievement",
    "title": "Great Progress This Week",
    "content": "Excellent work on the math assignment! #mathematics #progress",
    "author_id": 789,
    "school_id": 1,
    "class_id": 5,
    "student_id": 123,
    "likes_count": 0,
    "comments_count": 0,
    "is_active": true,
    "created_by": 789,
    "updated_by": null,
    "created_at": "2025-01-15T10:30:00.000000Z",
    "updated_at": "2025-01-15T10:30:00.000000Z",
    "author": {
      "id": 789,
      "name": "John Teacher",
      "email": "john.teacher@school.com",
      "category_name": "Educator"
    },
    "media": [
      {
        "id": 1,
        "post_id": 456,
        "type": "image",
        "url": "api/activity-feed-management/storage/file/student-posts/456/image-xxxxx.jpg",
        "thumbnail_url": null,
        "filename": "image-xxxxx.jpg",
        "original_filename": "science_project.jpg",
        "size": 1024000,
        "mime_type": "image/jpeg",
        "width": 1920,
        "height": 1080,
        "duration": null,
        "sort_order": 1,
        "is_active": true,
        "created_by": 789,
        "created_at": "2025-01-15T10:30:00.000000Z",
        "updated_at": "2025-01-15T10:30:00.000000Z"
      }
    ],
    "hashtags": [
      {
        "id": 1,
        "post_id": 456,
        "hashtag": "mathematics",
        "is_active": true,
        "created_by": 789,
        "created_at": "2025-01-15T10:30:00.000000Z",
        "updated_at": "2025-01-15T10:30:00.000000Z"
      },
      {
        "id": 2,
        "post_id": 456,
        "hashtag": "progress",
        "is_active": true,
        "created_by": 789,
        "created_at": "2025-01-15T10:30:00.000000Z",
        "updated_at": "2025-01-15T10:30:00.000000Z"
      }
    ]
  }
}
```

### Error Response (4xx/5xx)

```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "title": ["The title field is required."],
    "student_id": ["The student_id field is required."]
  }
}
```

## Frontend Integration

### Using RTK Query Hook

```typescript
import { useCreateStudentPostMutation } from '@/api/activity-feed-api';

function CreateStudentPostComponent() {
  const [createPost, { isLoading, error }] = useCreateStudentPostMutation();

  const handleCreatePost = async () => {
    try {
      const result = await createPost({
        title: "Great Achievement",
        content: "Student showed excellent progress #achievement",
        student_id: 123,
        category: "achievement",
        hashtags: ["achievement", "progress"]
      }).unwrap();

      console.log('Post created:', result);
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  };

  return (
    <button onClick={handleCreatePost} disabled={isLoading}>
      {isLoading ? 'Creating...' : 'Create Post'}
    </button>
  );
}
```

### With Media Upload (Two-Step Process)

```typescript
import {
  useUploadMediaMutation,
  useCreateStudentPostMutation
} from '@/api/activity-feed-api';

function CreatePostWithMedia() {
  const [uploadMedia] = useUploadMediaMutation();
  const [createPost] = useCreateStudentPostMutation();

  const handleSubmit = async (formData) => {
    try {
      // Step 1: Upload media files
      const mediaFormData = new FormData();
      formData.photos.forEach((photo, index) => {
        mediaFormData.append(`media_${index}`, {
          uri: photo.uri,
          name: photo.fileName,
          type: photo.type
        });
      });
      mediaFormData.append('media_count', formData.photos.length);

      const uploadResult = await uploadMedia(mediaFormData).unwrap();

      // Step 2: Create post with uploaded media
      const postResult = await createPost({
        title: formData.title,
        content: formData.content,
        student_id: formData.studentId,
        category: formData.category,
        hashtags: formData.hashtags,
        media: uploadResult.data // Use uploaded media info
      }).unwrap();

      console.log('Post created with media:', postResult);
    } catch (error) {
      console.error('Error:', error);
    }
  };
}
```

## Database Schema

### student_posts Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | NO | Primary key |
| type | string | NO | Post type (default: "post") |
| category | string | YES | Post category |
| title | string | NO | Post title |
| content | text | NO | Post content |
| author_id | integer | NO | Foreign key to users |
| school_id | integer | NO | Foreign key to schools |
| class_id | integer | YES | Foreign key to classes |
| student_id | integer | NO | Foreign key to students |
| likes_count | integer | NO | Number of likes (default: 0) |
| comments_count | integer | NO | Number of comments (default: 0) |
| is_active | boolean | NO | Active status (default: true) |
| created_by | integer | NO | User who created the post |
| updated_by | integer | YES | User who last updated |
| created_at | timestamp | NO | Creation timestamp |
| updated_at | timestamp | NO | Last update timestamp |

### student_post_media Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | NO | Primary key |
| post_id | integer | NO | Foreign key to student_posts |
| type | string | NO | Media type (image/video/pdf) |
| url | string | NO | Media file URL |
| thumbnail_url | string | YES | Thumbnail URL (for videos) |
| filename | string | NO | Stored filename |
| original_filename | string | NO | Original user filename |
| size | integer | NO | File size in bytes |
| mime_type | string | YES | MIME type |
| width | integer | YES | Image/video width |
| height | integer | YES | Image/video height |
| duration | integer | YES | Video duration in seconds |
| sort_order | integer | NO | Display order |
| is_active | boolean | NO | Active status |
| created_by | integer | NO | User who uploaded |
| created_at | timestamp | NO | Upload timestamp |
| updated_at | timestamp | NO | Last update timestamp |

### student_post_hashtags Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | NO | Primary key |
| post_id | integer | NO | Foreign key to student_posts |
| hashtag | string | NO | Hashtag text (without #) |
| is_active | boolean | NO | Active status |
| created_by | integer | NO | User who created |
| created_at | timestamp | NO | Creation timestamp |
| updated_at | timestamp | NO | Last update timestamp |

## Backend Processing Flow

1. **Request Reception**: AuthGuard middleware validates JWT token
2. **User Extraction**: User ID extracted from authenticated token
3. **Default Values**: Set `school_id=1` and `type='post'` if not provided
4. **Media Processing**:
   - New indexed format: Process `media_count` and `media_N` fields
   - Legacy format: Process `media[]` array
   - Pre-uploaded: Use provided media metadata
5. **Hashtag Extraction**:
   - Parse hashtags from `hashtags` parameter
   - Extract hashtags from content using regex `/#([a-zA-Z0-9_]+)/`
   - Combine and deduplicate
6. **Database Transaction**:
   - Create post record
   - Create hashtag records
   - Upload and create media records
   - Load relationships (author, media, hashtags)
7. **Response**: Return complete post with all relationships

## Security & Permissions

- **Authentication**: Required via JWT Bearer token
- **Authorization**: User must be authenticated; author_id defaults to authenticated user
- **File Upload**: Media files validated for type, size, and content
- **Input Sanitization**: All text inputs sanitized to prevent XSS
- **SQL Injection**: Protected via parameterized queries
- **Rate Limiting**: Recommended to prevent abuse

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 201 | Post created successfully |
| 400 | Bad request (validation errors) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found (student_id or class_id doesn't exist) |
| 413 | Payload too large (file size exceeded) |
| 422 | Unprocessable entity (validation failed) |
| 500 | Internal server error |

## Best Practices

### 1. Use Two-Step Process for Media
Upload media files first, then create the post. This provides better error handling and progress tracking.

### 2. Validate Input on Frontend
Validate all required fields before sending to reduce unnecessary API calls.

### 3. Handle Loading States
Show loading indicators during upload and post creation.

### 4. Implement Retry Logic
Implement exponential backoff for failed requests.

### 5. Cache Invalidation
The API automatically invalidates relevant caches:
- `StudentPosts:STUDENT_{student_id}`
- `StudentPosts:LIST`
- `ActivityFeed:LIST`

### 6. Optimize Images
Compress images before upload to reduce bandwidth and storage.

### 7. Error Handling
Always handle errors gracefully and provide user feedback.

## Testing

A comprehensive test script is available at:
```
src/tests/student-posts-api-test.js
```

To run the tests:

1. Configure your authentication token in the script
2. Update the BASE_URL if needed
3. Run: `node src/tests/student-posts-api-test.js`

The test script includes:
- Basic post creation
- Full post with all fields
- Pre-uploaded media handling
- Hashtag format testing
- Error handling validation
- Response structure verification

## Related Endpoints

- **Upload Media**: `POST /api/activity-feed-management/media/upload`
- **Get Student Posts**: `POST /api/activity-feed-management/student-posts/list`
- **Update Student Post**: `POST /api/activity-feed-management/student-posts/update`
- **Delete Student Post**: `POST /api/activity-feed-management/student-posts/delete`
- **Toggle Like**: `POST /api/activity-feed-management/student-posts/toggle-like`

## Support

For issues or questions:
1. Check the test script output for detailed error messages
2. Review the backend logs for processing details
3. Verify authentication token is valid and not expired
4. Ensure all required fields are provided

---

**Last Updated**: January 2025
**API Version**: 1.0
**Module**: Activity Feed Management
