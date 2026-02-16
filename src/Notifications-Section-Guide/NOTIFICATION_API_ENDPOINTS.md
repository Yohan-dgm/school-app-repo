# Notification System - API Endpoints Documentation

## 🔐 Authentication

All notification API endpoints require authentication using the `AuthGuard` middleware. Include the following header in all requests:

```
Authorization: Bearer {your-jwt-token}
```

**Base URL**: `http://172.16.20.183:9999/api`

## 📱 Push Token Management Endpoints

### Register Push Token

Register or update a push token for the authenticated user's device.

**Endpoint**: `POST /user-management/push-tokens/register`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:
```json
{
  "push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "device_id": "iPhone_12_Pro_Max_Simulator",
  "platform": "ios",
  "app_version": "1.0.0",
  "device_name": "John's iPhone",
  "device_model": "iPhone 14 Pro",
  "os_version": "16.0"
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Push token registered successfully",
  "data": {
    "id": 123,
    "user_id": 45,
    "device_id": "iPhone_12_Pro_Max_Simulator",
    "platform": "ios",
    "is_active": true,
    "was_updated": false,
    "created_at": "2025-01-15T10:30:00.000000Z",
    "updated_at": "2025-01-15T10:30:00.000000Z"
  }
}
```

**Response Error (422)**:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "push_token": ["The push token field is required."],
    "platform": ["The platform must be one of: ios, android."]
  }
}
```

### Delete Push Token

Remove push token(s) for the authenticated user.

**Endpoint**: `POST /user-management/push-tokens/delete`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body Options**:

1. **Delete by device ID**:
```json
{
  "device_id": "iPhone_12_Pro_Max_Simulator"
}
```

2. **Delete specific token**:
```json
{
  "push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

3. **Delete both (most specific)**:
```json
{
  "device_id": "iPhone_12_Pro_Max_Simulator",
  "push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

4. **Delete all user tokens**:
```json
{}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Push tokens for device deleted",
  "data": {
    "deleted_count": 1,
    "message": "Push tokens for device deleted"
  }
}
```

## 🔔 Notification Management Endpoints

### Get User Notifications

Retrieve notifications for the authenticated user with pagination and filtering.

**Endpoint**: `POST /communication-management/notifications/list`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:
```json
{
  "page": 1,
  "per_page": 20,
  "filter": "all",
  "priority": "high",
  "type_id": 1,
  "search": "homework",
  "unread_only": false
}
```

**Request Parameters**:
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 20, max: 100)
- `filter` (optional): Filter notifications - `"all"`, `"read"`, `"unread"`, `"delivered"`, `"pending"`
- `priority` (optional): Filter by priority - `"normal"`, `"high"`, `"urgent"`
- `type_id` (optional): Filter by notification type ID
- `search` (optional): Search in title and message
- `unread_only` (optional): Show only unread notifications (boolean)

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 123,
        "recipient_id": 456,
        "title": "Homework Assignment Due",
        "message": "Math homework is due tomorrow at 9 AM",
        "priority": "high",
        "priority_label": "High Priority",
        "priority_color": "#ff8800",
        "type": "homework",
        "type_name": "Homework",
        "action_url": "/homework/123",
        "action_text": "View Assignment",
        "image_url": null,
        "is_read": false,
        "is_delivered": true,
        "read_at": null,
        "delivered_at": "2025-01-15T10:30:00.000000Z",
        "created_at": "2025-01-15T10:30:00.000000Z",
        "time_ago": "2 hours ago"
      }
    ],
    "first_page_url": "http://example.com/api/notifications?page=1",
    "from": 1,
    "last_page": 5,
    "last_page_url": "http://example.com/api/notifications?page=5",
    "next_page_url": "http://example.com/api/notifications?page=2",
    "path": "http://example.com/api/notifications",
    "per_page": 20,
    "prev_page_url": null,
    "to": 20,
    "total": 95,
    "has_more_pages": true,
    "unread_count": 12
  }
}
```

### Mark Notification as Read

Mark a specific notification or all notifications as read.

**Endpoint**: `POST /communication-management/notifications/mark-read`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body Options**:

1. **Mark specific notification as read**:
```json
{
  "notification_id": 123
}
```

2. **Mark all notifications as read**:
```json
{
  "mark_all": true
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Notification marked as read successfully",
  "data": {
    "marked_count": 1
  }
}
```

### Get Notification Details

Get detailed information about a specific notification (auto-marks as read).

**Endpoint**: `POST /communication-management/notifications/details`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:
```json
{
  "notification_id": 123
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Notification details retrieved successfully",
  "data": {
    "id": 123,
    "recipient_id": 456,
    "title": "Homework Assignment Due",
    "message": "Math homework chapter 5 exercises 1-20 are due tomorrow at 9 AM. Please make sure to show all your work.",
    "priority": "high",
    "priority_label": "High Priority",
    "priority_color": "#ff8800",
    "type": "homework",
    "type_name": "Homework",
    "action_url": "/homework/123",
    "action_text": "View Assignment",
    "image_url": "https://example.com/images/math-homework.jpg",
    "is_read": true,
    "is_delivered": true,
    "read_at": "2025-01-15T12:30:00.000000Z",
    "delivered_at": "2025-01-15T10:30:00.000000Z",
    "created_at": "2025-01-15T10:30:00.000000Z",
    "updated_at": "2025-01-15T12:30:00.000000Z",
    "time_ago": "2 hours ago",
    "notification_type": {
      "id": 1,
      "name": "Homework",
      "slug": "homework",
      "description": "Homework and assignment notifications"
    }
  }
}
```

### Delete Notification

Remove a notification from the user's view (soft delete).

**Endpoint**: `POST /communication-management/notifications/delete`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:
```json
{
  "notification_id": 123
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Notification deleted successfully",
  "data": {
    "deleted": true
  }
}
```

### Get Notification Statistics

Get notification statistics for the authenticated user.

**Endpoint**: `POST /communication-management/notifications/stats`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**: `{}` (empty object)

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Notification statistics retrieved successfully",
  "data": {
    "total_notifications": 95,
    "unread_count": 12,
    "read_count": 83,
    "priority_breakdown": {
      "normal": 70,
      "high": 20,
      "urgent": 5
    },
    "type_breakdown": {
      "homework": 30,
      "announcement": 25,
      "grade_update": 20,
      "attendance_alert": 15,
      "event": 5
    },
    "recent_activity": {
      "today": 5,
      "this_week": 18,
      "this_month": 45
    }
  }
}
```

## 🌐 Real-time WebSocket Events

The system uses Laravel Reverb for real-time notifications via WebSockets.

### Connection Setup

```javascript
// Using Laravel Echo
const echo = new Echo({
  broadcaster: 'reverb',
  key: 'ftlvjzbndng2pip2xruw',
  wsHost: '172.16.20.183',
  wsPort: 8080,
  forceTLS: false,
  auth: {
    headers: {
      Authorization: `Bearer ${your-jwt-token}`,
      Accept: 'application/json',
    },
  },
});
```

### Private Channel Subscription

Each user receives notifications on their private channel:

```javascript
// Subscribe to user's notification channel
echo.private(`user.${userId}.notifications`)
  .listen('notification.created', (data) => {
    console.log('New notification:', data);
    // Handle new notification
  })
  .listen('notification.read', (data) => {
    console.log('Notification read:', data);
    // Update UI to show as read
  })
  .listen('notification.stats.updated', (data) => {
    console.log('Stats updated:', data);
    // Update badge counts
  });
```

### Real-time Events

#### 1. Notification Created Event

**Event**: `notification.created`

**Data Structure**:
```json
{
  "id": 123,
  "recipient_id": 456,
  "title": "New Announcement",
  "message": "School will be closed tomorrow due to weather",
  "priority": "urgent",
  "priority_label": "Urgent",
  "priority_color": "#ff4444",
  "type": "announcement",
  "type_name": "Announcement",
  "action_url": "/announcements/123",
  "action_text": "Read More",
  "image_url": null,
  "is_read": false,
  "is_delivered": true,
  "created_at": "2025-01-15T14:30:00.000000Z",
  "time_ago": "just now"
}
```

#### 2. Notification Read Event

**Event**: `notification.read`

**Data Structure**:
```json
{
  "id": 123,
  "recipient_id": 456,
  "is_read": true,
  "read_at": "2025-01-15T14:35:00.000000Z"
}
```

#### 3. Notification Stats Updated Event

**Event**: `notification.stats.updated`

**Data Structure**:
```json
{
  "user_id": 45,
  "unread_count": 11,
  "total_count": 95,
  "updated_at": "2025-01-15T14:35:00.000000Z"
}
```

## ❌ Common Error Responses

### Authentication Errors

**401 Unauthorized**:
```json
{
  "success": false,
  "message": "Unauthenticated.",
  "error": "Token missing or invalid"
}
```

### Validation Errors

**422 Unprocessable Entity**:
```json
{
  "success": false,
  "message": "The given data was invalid.",
  "errors": {
    "push_token": ["The push token field is required."],
    "platform": ["The platform field is required."]
  }
}
```

### Not Found Errors

**404 Not Found**:
```json
{
  "success": false,
  "message": "Notification not found",
  "error": "The requested notification does not exist or you don't have permission to access it"
}
```

### Server Errors

**500 Internal Server Error**:
```json
{
  "success": false,
  "message": "An error occurred while processing your request",
  "error": "Please try again later or contact support"
}
```

## 📊 Rate Limiting

API endpoints have rate limiting applied:

- **Authentication required endpoints**: 60 requests per minute
- **Push token registration**: 10 requests per minute per user
- **Notification listing**: 30 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1642248000
```

## 🧪 Testing with Curl

### Register Push Token
```bash
curl -X POST \
  'http://172.16.20.183:9999/api/user-management/push-tokens/register' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "push_token": "ExponentPushToken[test-token-123]",
    "device_id": "test-device",
    "platform": "ios",
    "app_version": "1.0.0"
  }'
```

### Get Notifications
```bash
curl -X POST \
  'http://172.16.20.183:9999/api/communication-management/notifications/list' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "page": 1,
    "per_page": 10,
    "filter": "unread"
  }'
```

### Mark as Read
```bash
curl -X POST \
  'http://172.16.20.183:9999/api/communication-management/notifications/mark-read' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "notification_id": 123
  }'
```

## 🔧 Development Tips

### 1. Error Handling

Always wrap API calls in try-catch blocks and handle different error types:

```javascript
try {
  const response = await ApiService.post('/notifications/list', params);
  if (response.success) {
    // Handle success
  } else {
    // Handle API error
    console.error('API Error:', response.message);
  }
} catch (error) {
  // Handle network or other errors
  console.error('Network Error:', error.message);
}
```

### 2. Optimistic Updates

Implement optimistic updates for better UX:

```javascript
// Mark as read optimistically
setNotifications(prev => 
  prev.map(notif => 
    notif.id === notificationId 
      ? { ...notif, is_read: true, read_at: new Date().toISOString() }
      : notif
  )
);

// Then make API call and handle errors
try {
  await markAsRead(notificationId);
} catch (error) {
  // Revert optimistic update
  setNotifications(prev => 
    prev.map(notif => 
      notif.id === notificationId 
        ? { ...notif, is_read: false, read_at: null }
        : notif
    )
  );
}
```

### 3. Pagination Handling

```javascript
const loadMore = useCallback(async () => {
  if (loading || !hasMore) return;
  
  setLoading(true);
  try {
    const response = await ApiService.post('/notifications/list', {
      page: currentPage + 1,
      per_page: 20
    });
    
    if (response.success) {
      setNotifications(prev => [...prev, ...response.data.data]);
      setCurrentPage(response.data.current_page);
      setHasMore(response.data.has_more_pages);
    }
  } catch (error) {
    console.error('Error loading more notifications:', error);
  } finally {
    setLoading(false);
  }
}, [loading, hasMore, currentPage]);
```

## 📝 API Response Standards

All API responses follow this structure:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    // Validation errors (if applicable)
  },
  "error": "Detailed error message (optional)"
}
```

This API documentation provides everything the frontend team needs to integrate notifications successfully with the Laravel backend.