# Notification System - Setup & Configuration Guide

## 🚀 Complete Setup Instructions

This guide provides step-by-step instructions for setting up the complete notification system including backend configuration, frontend implementation, and production deployment.

## 📋 Prerequisites

Before starting, ensure you have:

### Backend Requirements
- PHP 8.2+ with PostgreSQL extension
- Laravel 11.9+
- PostgreSQL 12+
- Redis (for queue processing)
- Composer
- Node.js 18+ (for Laravel Echo/Reverb)

### Frontend Requirements
- React Native with Expo SDK 50+
- Node.js 18+
- Expo CLI or Expo Dev Tools
- Physical device for push notification testing

### Development Tools
- Postman (for API testing)
- Git
- Code editor (VS Code recommended)

## 🏗️ Backend Setup

### 1. Laravel Configuration

#### Environment Variables (.env)
```bash
# Database Configuration
DB_CONNECTION=pgsqlt
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=school_app
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password

# Broadcasting (Laravel Reverb)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=623485
REVERB_APP_KEY=ftlvjzbndng2pip2xruw
REVERB_APP_SECRET=mjwhbjilpdsiblqexfyk
REVERB_HOST=0.0.0.0
REVERB_PORT=8080
REVERB_SCHEME=http

# Queue Configuration
QUEUE_CONNECTION=database

# Application Settings
APP_ENV=local
APP_DEBUG=true
APP_URL=http://172.16.20.183:9999

# CORS Settings
SANCTUM_STATEFUL_DOMAINS=localhost:8081,172.16.20.183:8081,172.16.20.183:9999,localhost:3000,127.0.0.1:3000
```

#### Database Migration
```bash
# Run existing migrations
php artisan migrate

# If needed, create notification tables manually
php artisan tinker
```

#### Queue Worker Setup
```bash
# Start queue worker for processing push notifications
php artisan queue:listen --tries=1

# Or use supervisor for production (see production section)
```

#### Laravel Reverb Setup
```bash
# Install Reverb if not already installed
composer require laravel/reverb

# Start Reverb server
php artisan reverb:start

# Or in background
php artisan reverb:start --debug > reverb.log 2>&1 &
```

### 2. Verify Backend Installation

#### Check Database Tables
```sql
-- Verify required tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'notifications', 
    'notification_recipients', 
    'notification_types',
    'user_push_tokens'
);
```

#### Test API Endpoints
```bash
# Test notification list endpoint
curl -X POST \
  'http://172.16.20.183:9999/api/communication-management/notifications/list' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{"page": 1}'
```

### 3. Backend Verification Checklist

- [ ] Database tables exist and accessible
- [ ] Queue worker is running
- [ ] Reverb WebSocket server is running
- [ ] API endpoints respond correctly
- [ ] CORS settings allow your frontend domain
- [ ] Authentication middleware works

## 📱 Frontend Setup

### 1. Project Initialization

#### Install Dependencies
```bash
# Core notification dependencies
npx expo install expo-notifications expo-device expo-constants

# WebSocket dependencies
npm install laravel-echo pusher-js

# Storage
npm install @react-native-async-storage/async-storage

# Date utilities (optional)
npm install date-fns

# HTTP client (if not using fetch)
npm install axios
```

#### Configure app.json
```json
{
  "expo": {
    "name": "School Management App",
    "slug": "school-management-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#ffffff",
      "iosDisplayInForeground": true,
      "androidMode": "default",
      "androidCollapsedTitle": "New notification from school"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.schoolapp",
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.schoolapp",
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "WAKE_LOCK"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "your-expo-project-id"
      }
    }
  }
}
```

#### Environment Configuration (.env)
```bash
# API Configuration
EXPO_PUBLIC_API_BASE_URL=http://172.16.20.183:9999
EXPO_PUBLIC_API_PREFIX=/api

# WebSocket Configuration
EXPO_PUBLIC_REVERB_HOST=172.16.20.183
EXPO_PUBLIC_REVERB_PORT=8080
EXPO_PUBLIC_REVERB_KEY=ftlvjzbndng2pip2xruw
EXPO_PUBLIC_REVERB_SCHEME=http

# Expo Configuration
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id

# Development Settings
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_DEBUG_NOTIFICATIONS=true
```

### 2. Core Service Implementation

#### Create Services Directory Structure
```
src/
├── services/
│   ├── ApiService.js
│   ├── PushNotificationService.js
│   ├── RealTimeService.js
│   └── NotificationService.js
├── hooks/
│   ├── useNotifications.js
│   ├── usePushTokens.js
│   └── useRealTimeUpdates.js
├── components/
│   ├── NotificationList.js
│   ├── NotificationItem.js
│   └── NotificationBadge.js
└── contexts/
    └── NotificationContext.js
```

#### Basic ApiService.js
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const API_PREFIX = process.env.EXPO_PUBLIC_API_PREFIX || '/api';

class ApiService {
  constructor() {
    this.baseURL = `${BASE_URL}${API_PREFIX}`;
  }

  async getAuthToken() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async request(endpoint, options = {}) {
    const token = await this.getAuthToken();
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export default new ApiService();
```

### 3. Frontend Verification Checklist

- [ ] Dependencies installed correctly
- [ ] app.json configured with notification settings
- [ ] Environment variables set
- [ ] Services implemented and imported
- [ ] Push notifications permission requested
- [ ] WebSocket connection established
- [ ] API calls working with authentication

## 🧪 Testing Setup

### 1. Backend Testing

#### Using Postman
1. Import the provided Postman collection: `NOTIFICATION_POSTMAN_COLLECTION.json`
2. Set environment variables:
   - `base_url`: Your backend URL
   - `auth_token`: JWT token from sign-in
3. Run the test scenarios:
   - Authentication
   - Push token registration
   - Notification CRUD operations
   - Error handling

#### Manual Database Testing
```sql
-- Check notification tables
SELECT COUNT(*) FROM notifications;
SELECT COUNT(*) FROM notification_recipients;
SELECT COUNT(*) FROM user_push_tokens;

-- Test notification creation
INSERT INTO notifications (notification_type_id, title, message, priority, target_type, target_data, created_by, is_active, created_at, updated_at)
VALUES (1, 'Test Notification', 'This is a test message', 'normal', 'user', '{"user_ids":[45]}', 45, true, NOW(), NOW());
```

### 2. Frontend Testing

#### Push Notification Testing
```javascript
// Test push notification service
import PushNotificationService from './services/PushNotificationService';

// Initialize and test
await PushNotificationService.initialize(userId);
await PushNotificationService.testPushNotification();
```

#### WebSocket Testing
```javascript
// Test real-time connection
import RealTimeService from './services/RealTimeService';

// Initialize and test
const connected = await RealTimeService.initialize(authToken, userId);
console.log('WebSocket connected:', connected);
```

### 3. Integration Testing

#### End-to-End Test Flow
1. **Backend**: Create notification via API
2. **Real-time**: Verify WebSocket event received
3. **Push**: Verify push notification sent
4. **Frontend**: Verify UI updated automatically
5. **User Action**: Test mark as read, delete, etc.

## 🔧 Troubleshooting Common Issues

### Backend Issues

#### Database Connection Problems
```bash
# Check PostgreSQL connection
php artisan tinker
DB::select('SELECT 1');
```

#### Queue Worker Not Processing Jobs
```bash
# Check failed jobs
php artisan queue:failed

# Clear failed jobs
php artisan queue:flush

# Restart queue worker
php artisan queue:restart
```

#### WebSocket Connection Issues
```bash
# Check Reverb server status
php artisan reverb:ping

# Restart Reverb server
pkill -f reverb
php artisan reverb:start
```

### Frontend Issues

#### Push Notifications Not Working
1. **Check device**: Physical device required (not simulator)
2. **Check permissions**: Verify notification permissions granted
3. **Check token**: Verify Expo push token generated correctly
4. **Check backend**: Verify token registered in database

#### WebSocket Connection Failing
1. **Check network**: Verify backend server accessible
2. **Check authentication**: Verify JWT token valid
3. **Check CORS**: Verify CORS settings allow WebSocket connections
4. **Check Reverb**: Verify Reverb server running

#### API Calls Failing
1. **Check network**: Verify backend server running
2. **Check authentication**: Verify JWT token in requests
3. **Check CORS**: Verify CORS settings for your domain
4. **Check endpoints**: Verify endpoint URLs are correct

## 🚀 Production Deployment

### Backend Production Setup

#### Environment Configuration
```bash
# Production .env settings
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

# Use secure database credentials
DB_PASSWORD=secure_production_password

# Use secure broadcasting credentials
REVERB_APP_KEY=production_reverb_key
REVERB_APP_SECRET=production_reverb_secret

# Use HTTPS for WebSocket
REVERB_SCHEME=https
```

#### Queue Worker with Supervisor
Create `/etc/supervisor/conf.d/laravel-queue.conf`:
```ini
[program:laravel-queue]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/your/app/artisan queue:work --sleep=3 --tries=3
autostart=true
autorestart=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/path/to/your/app/storage/logs/queue.log
```

#### Reverb with PM2
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
echo '{
  "apps": [{
    "name": "reverb-server",
    "script": "artisan",
    "args": "reverb:start",
    "instances": 1,
    "autorestart": true,
    "watch": false,
    "max_memory_restart": "1G",
    "env": {
      "NODE_ENV": "production"
    }
  }]
}' > ecosystem.config.js

# Start with PM2
pm2 start ecosystem.config.js
```

### Frontend Production Setup

#### Build Configuration
```bash
# Create production build
expo build:android
expo build:ios

# Or with EAS Build
eas build --platform all
```

#### Environment Variables for Production
```bash
# Production API endpoints
EXPO_PUBLIC_API_BASE_URL=https://api.your-school-domain.com
EXPO_PUBLIC_REVERB_HOST=api.your-school-domain.com
EXPO_PUBLIC_REVERB_SCHEME=https
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_DEBUG_NOTIFICATIONS=false
```

## 📊 Monitoring & Maintenance

### Backend Monitoring

#### Log Files to Monitor
- `storage/logs/laravel.log` - General application logs
- `storage/logs/queue.log` - Queue processing logs
- `reverb.log` - WebSocket server logs

#### Health Checks
```bash
# API health check endpoint
curl https://your-domain.com/api/health

# Queue status
php artisan queue:work --once --verbose

# Database connectivity
php artisan tinker --execute="DB::select('SELECT 1');"
```

### Frontend Monitoring

#### Key Metrics to Track
- Push notification delivery rates
- WebSocket connection stability
- API response times
- User engagement with notifications

#### Error Tracking
```javascript
// Add to your error tracking service
try {
  await PushNotificationService.initialize(userId);
} catch (error) {
  // Log to Sentry, Bugsnag, etc.
  console.error('Push notification initialization failed:', error);
}
```

## 🔒 Security Considerations

### Backend Security
- Use HTTPS in production
- Implement rate limiting on API endpoints
- Validate all input data
- Use secure database credentials
- Keep JWT tokens secure and implement proper expiration

### Frontend Security
- Store sensitive data securely (use Expo SecureStore)
- Implement proper error handling
- Validate all data from API responses
- Use secure HTTP headers

### Push Notification Security
- Validate push tokens before storing
- Implement proper cleanup of invalid tokens
- Use meaningful but not sensitive data in push notifications
- Implement user consent for push notifications

This comprehensive setup guide should help your team successfully implement and deploy the notification system. Remember to test thoroughly in development before deploying to production.