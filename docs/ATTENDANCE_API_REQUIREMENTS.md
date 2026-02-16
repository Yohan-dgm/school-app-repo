# Attendance API Requirements for Backend Team

## 🚨 URGENT: Missing Backend Endpoint

The frontend student attendance feature is complete but needs the backend API endpoint to be implemented.

## Required Endpoint

**URL**: `/get-educator-attendance-aggregated-list-data`  
**Method**: `POST`  
**Content-Type**: `application/json`

### Request Headers
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
Accept: application/json
X-Requested-With: XMLHttpRequest
```

### Request Body
```json
{
  "page_size": 10,
  "page": 1,
  "search_phrase": "",
  "search_filter_list": [],
  "group_filter": "All"
}
```

### Request Parameters Description
- `page_size`: Number of records per page (integer)
- `page`: Current page number (integer)
- `search_phrase`: Search term for filtering records (string)
- `search_filter_list`: Additional filters (array)
- `group_filter`: 
  - `"All"` for all grades
  - `grade_level_class.name` for specific grade (e.g., "Grade 1 - Class 1")

## Required Response Format

### Success Response (200)
```json
{
  "status": "successful",
  "message": "",
  "data": {
    "data": [
      {
        "id": 71412,
        "date": "2025-08-01",
        "created_by": 37,
        "present_student_count": 78,
        "absent_student_count": 8,
        "grade_level_class": {
          "id": 1,
          "name": "Grade 1 - Class 1",
          "grade_level_id": 1
        },
        "user": {
          "id": 37,
          "full_name": "Hasandi Nethmi Wickrmasooriya"
        }
      }
    ],
    "total": 116,
    "student_attendance_count": 62136,
    "grade_level_class_list": [
      {
        "id": 1,
        "name": "Grade 1 - Class 1",
        "grade_level_id": 1,
        "grade_level": {
          "id": 1,
          "name": "Grade 1"
        }
      }
    ]
  },
  "metadata": {
    "is_system_update_pending": true
  }
}
```

### Response Fields Description

#### Main Data Array (`data.data[]`)
- `id`: Unique attendance record ID (integer)
- `date`: Attendance date in YYYY-MM-DD format (string)
- `created_by`: ID of user who created the record (integer)
- `present_student_count`: Number of present students (integer)
- `absent_student_count`: Number of absent students (integer)
- `grade_level_class`: Grade/class information object
- `user`: User who created the attendance record

#### Summary Data (`data`)
- `total`: Total number of attendance records matching filters (integer)
- `student_attendance_count`: Total student attendance count across all records (integer)
- `grade_level_class_list`: Array of all available grade/class options for filtering

#### Grade Level Class Structure
```json
{
  "id": 1,
  "name": "Grade 1 - Class 1",
  "grade_level_id": 1,
  "grade_level": {
    "id": 1,
    "name": "Grade 1"
  }
}
```

## Filtering Logic Required

### 1. Group Filter
- When `group_filter = "All"`: Return attendance records for all grades
- When `group_filter = "Grade 1 - Class 1"`: Return only records for that specific grade/class
- Filter should match against `grade_level_class.name`

### 2. Search Filter
- When `search_phrase` is provided: Search across:
  - Student names in attendance records
  - Educator names (`user.full_name`)
  - Grade/class names

### 3. Pagination
- Use `page` and `page_size` for pagination
- Return `total` count for pagination controls

## Error Responses

### 404 Not Found
```json
{
  "status": "error",
  "message": "Endpoint not found",
  "data": null
}
```

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Unauthorized access",
  "data": null
}
```

### 500 Server Error
```json
{
  "status": "error",
  "message": "Internal server error",
  "data": null
}
```

## Frontend Implementation Status

✅ **Complete**: Frontend UI, filtering, pagination, search  
❌ **Missing**: Backend API endpoint  

## Temporary Solution

The frontend currently uses mock data to allow development and testing to continue. Once the backend endpoint is implemented:

1. Uncomment the real API call in `src/api/attendance-api.ts`
2. Comment out the mock `queryFn`
3. Test with real data

## Files Modified for This Feature

- `src/api/attendance-api.ts` - API integration
- `src/api/api-server-1.ts` - Added "Attendance" cache tag
- `src/screens/authenticated/principal/dashboard/modals/StudentAttendanceModal.tsx` - UI component
- `src/screens/authenticated/principal/dashboard/PrincipalDashboardMain.tsx` - Modal integration

## Testing the Endpoint

Once implemented, test with these sample requests:

### Get All Attendance Records
```bash
curl -X POST "https://your-api-domain/get-educator-attendance-aggregated-list-data" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "page_size": 10,
    "page": 1,
    "search_phrase": "",
    "search_filter_list": [],
    "group_filter": "All"
  }'
```

### Get Specific Grade Attendance
```bash
curl -X POST "https://your-api-domain/get-educator-attendance-aggregated-list-data" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "page_size": 10,
    "page": 1,
    "search_phrase": "",
    "search_filter_list": [],
    "group_filter": "Grade 1 - Class 1"
  }'
```

## Priority: HIGH

This endpoint is required for the principal dashboard attendance feature to function properly.