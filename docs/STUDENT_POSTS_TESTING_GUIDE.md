# Student Posts API Testing Guide

## Quick Start

This guide will help you test the `student-posts/create` endpoint that was just implemented.

## Prerequisites

1. **Valid JWT Token**: You need an authentication token from the backend
2. **Node.js**: To run the test script
3. **Network Access**: Access to the backend API

## Backend URL

The API is configured to use:
```
https://school-app.toyar.lk
```

Full endpoint:
```
POST https://school-app.toyar.lk/api/activity-feed-management/student-posts/create
```

## Getting an Authentication Token

### Option 1: From the App
1. Open the React Native app
2. Log in as any user
3. Check Redux store or AsyncStorage for the token
4. Look for: `auth.token` or similar

### Option 2: From Backend API
```bash
# Login to get token
curl -X POST https://school-app.toyar.lk/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@school.com",
    "password": "your-password"
  }'
```

The response will contain a `token` field.

## Running the Test Script

### Step 1: Configure the Script

Edit the test script:
```bash
nano src/tests/student-posts-api-test.js
```

Update these values:
```javascript
const BASE_URL = 'https://school-app.toyar.lk';
const AUTH_TOKEN = 'your-actual-jwt-token-here';
```

### Step 2: Run the Tests

```bash
# From the project root
node src/tests/student-posts-api-test.js
```

### Step 3: Review Results

The script will run 6 comprehensive tests:

1. ✅ **Test 1**: Basic post creation (required fields only)
2. ✅ **Test 2**: Full post creation (all optional fields)
3. ✅ **Test 3**: Post with pre-uploaded media
4. ✅ **Test 4**: Hashtag format testing (3 variations)
5. ✅ **Test 5**: Error handling validation
6. ✅ **Test 6**: Response structure verification

## Manual Testing with cURL

### Test 1: Basic Post

```bash
curl -X POST https://school-app.toyar.lk/api/activity-feed-management/student-posts/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Great Achievement",
    "content": "Excellent work on the science project! #science #achievement",
    "student_id": 1
  }'
```

### Test 2: Post with Category and Hashtags

```bash
curl -X POST https://school-app.toyar.lk/api/activity-feed-management/student-posts/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Monthly Progress Report",
    "content": "Outstanding performance this month!",
    "student_id": 1,
    "category": "achievement",
    "class_id": 5,
    "hashtags": ["progress", "education", "excellence"]
  }'
```

### Test 3: Post with Media

```bash
curl -X POST https://school-app.toyar.lk/api/activity-feed-management/student-posts/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Science Fair Project",
    "content": "Amazing project showcase!",
    "student_id": 1,
    "media": [
      {
        "type": "image",
        "url": "api/activity-feed-management/storage/file/temp-uploads/temp-xxxxx.jpg",
        "filename": "temp-xxxxx.jpg",
        "original_filename": "project.jpg",
        "size": 1024000,
        "mime_type": "image/jpeg"
      }
    ]
  }'
```

## Testing with Postman

### Setup

1. **Create New Request**
   - Method: POST
   - URL: `https://school-app.toyar.lk/api/activity-feed-management/student-posts/create`

2. **Add Authorization**
   - Type: Bearer Token
   - Token: Your JWT token

3. **Add Headers**
   - `Content-Type: application/json`

4. **Add Body** (raw JSON)
   ```json
   {
     "title": "Test Post",
     "content": "Testing the API #test",
     "student_id": 1
   }
   ```

5. **Send Request**

### Expected Response

```json
{
  "success": true,
  "message": "Student post created successfully",
  "data": {
    "id": 456,
    "type": "post",
    "title": "Test Post",
    "content": "Testing the API #test",
    "author_id": 789,
    "student_id": 1,
    "school_id": 1,
    "class_id": null,
    "category": null,
    "likes_count": 0,
    "comments_count": 0,
    "is_active": true,
    "created_at": "2025-01-15T10:30:00.000000Z",
    "updated_at": "2025-01-15T10:30:00.000000Z",
    "author": {
      "id": 789,
      "name": "John Teacher"
    },
    "media": [],
    "hashtags": [
      {
        "id": 1,
        "hashtag": "test"
      }
    ]
  }
}
```

## Frontend Integration Testing

### Using the Hook

```typescript
import { useCreateStudentPostMutation } from '@/api/activity-feed-api';

function TestComponent() {
  const [createPost, { isLoading, error, data }] = useCreateStudentPostMutation();

  const handleTest = async () => {
    try {
      const result = await createPost({
        title: "Frontend Test",
        content: "Testing from React Native #frontend",
        student_id: 1
      }).unwrap();

      console.log('✅ Success:', result);
    } catch (err) {
      console.error('❌ Error:', err);
    }
  };

  return (
    <button onClick={handleTest} disabled={isLoading}>
      {isLoading ? 'Testing...' : 'Test API'}
    </button>
  );
}
```

## Common Issues & Solutions

### Issue 1: 401 Unauthorized

**Cause**: Invalid or expired JWT token

**Solution**:
- Get a fresh token by logging in
- Check token format (should start with `Bearer `)
- Verify token hasn't expired

### Issue 2: 422 Validation Error

**Cause**: Missing required fields

**Solution**:
- Ensure `title`, `content`, and `student_id` are provided
- Check field types match expected values

### Issue 3: 404 Not Found

**Cause**: Invalid student_id or endpoint URL

**Solution**:
- Verify student_id exists in database
- Check endpoint URL is correct

### Issue 4: CORS Error (from browser)

**Cause**: Backend CORS configuration

**Solution**:
- Use Postman or cURL for testing
- Or test from the React Native app directly

## Verification Checklist

After testing, verify:

- [ ] Post appears in database
- [ ] Author is correctly set
- [ ] Hashtags are extracted and stored
- [ ] Media files (if uploaded) are linked
- [ ] Response includes all relationships
- [ ] Cache invalidation works
- [ ] Student ID is validated
- [ ] Timestamps are set correctly

## Database Verification

Check the database to confirm data:

```sql
-- Check the created post
SELECT * FROM student_posts ORDER BY created_at DESC LIMIT 1;

-- Check hashtags
SELECT * FROM student_post_hashtags WHERE post_id = YOUR_POST_ID;

-- Check media
SELECT * FROM student_post_media WHERE post_id = YOUR_POST_ID;

-- Check with relationships
SELECT
  p.*,
  u.name as author_name,
  COUNT(DISTINCT h.id) as hashtag_count,
  COUNT(DISTINCT m.id) as media_count
FROM student_posts p
LEFT JOIN users u ON p.author_id = u.id
LEFT JOIN student_post_hashtags h ON p.id = h.post_id
LEFT JOIN student_post_media m ON p.id = m.post_id
WHERE p.id = YOUR_POST_ID
GROUP BY p.id;
```

## Performance Testing

Test with different payload sizes:

1. **Small Post**: 100 characters, no media
2. **Medium Post**: 500 characters, 2 images
3. **Large Post**: 2000 characters, 5 images + 2 videos

Monitor:
- Response time
- Memory usage
- Database query count
- Network bandwidth

## Security Testing

Verify security measures:

1. **Authentication**: Try without token (should fail with 401)
2. **Authorization**: Try with invalid student_id (should fail)
3. **Input Validation**: Try XSS payloads (should be sanitized)
4. **SQL Injection**: Try SQL in title/content (should be safe)

## Next Steps

After successful testing:

1. ✅ Verify all tests pass
2. ✅ Update projectplan.md with results
3. ✅ Document any issues found
4. ✅ Integrate into production components
5. ✅ Add error handling to UI
6. ✅ Implement loading states
7. ✅ Add user feedback messages

## Support

For issues:
1. Check test script output
2. Review API documentation
3. Check backend logs
4. Verify authentication token
5. Ensure required fields present

---

**Test Script Location**: `src/tests/student-posts-api-test.js`
**Documentation**: `STUDENT_POSTS_API_DOCUMENTATION.md`
**API Endpoint**: `src/api/activity-feed-api.ts`
