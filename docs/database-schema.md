# Database Schema for School App Login System

## Users Table

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    role ENUM('parent', 'educator', 'student', 'admin') NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMP NULL,
    pin_verified_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## User Sessions Table

```sql
CREATE TABLE user_sessions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    device_info TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Login Attempts Table

```sql
CREATE TABLE login_attempts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username_or_email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### 1. Login with PIN
**POST** `/api/user-management/user/sign-in`

**Request Body:**
```json
{
    "username_or_email": "john.doe@school.edu",
    "password": "securepassword123",
    "pin": "123456"
}
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "user": {
            "id": 1,
            "username": "john.doe",
            "email": "john.doe@school.edu",
            "first_name": "John",
            "last_name": "Doe",
            "role": "parent",
            "phone": "+1234567890"
        },
        "user_role": "parent",
        "permissions": ["view_student_progress", "communicate_with_teachers"],
        "expires_at": "2024-01-15T10:30:00Z"
    }
}
```

**Error Response (401):**
```json
{
    "success": false,
    "message": "Invalid credentials or PIN",
    "errors": {
        "authentication": ["The provided credentials are incorrect"]
    }
}
```

### 2. Verify PIN (Optional separate endpoint)
**POST** `/api/user-management/user/verify-pin`

**Request Body:**
```json
{
    "username_or_email": "john.doe@school.edu",
    "pin": "123456"
}
```

## Backend Implementation Notes

### 1. Password & PIN Security
- Use bcrypt or Argon2 for password hashing
- Use bcrypt for PIN hashing (even though it's numeric)
- Implement rate limiting for login attempts
- Lock accounts after 5 failed attempts for 15 minutes

### 2. JWT Token Management
- Use JWT tokens with 24-hour expiration
- Include user role and permissions in token payload
- Implement token refresh mechanism

### 3. PIN Requirements
- 4-6 digit numeric PIN
- Must be different from password
- Can be reset by admin or through secure process

### 4. Database Indexes
```sql
-- Performance indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_sessions_token ON user_sessions(token);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_login_attempts_username ON login_attempts(username_or_email);
```

### 5. Sample Data
```sql
-- Sample users (passwords and PINs should be hashed in real implementation)
INSERT INTO users (username, email, password_hash, pin_hash, role, first_name, last_name, phone) VALUES
('john.parent', 'john.parent@school.edu', '$2y$10$...', '$2y$10$...', 'parent', 'John', 'Smith', '+1234567890'),
('jane.teacher', 'jane.teacher@school.edu', '$2y$10$...', '$2y$10$...', 'educator', 'Jane', 'Doe', '+1234567891'),
('bob.student', 'bob.student@school.edu', '$2y$10$...', '$2y$10$...', 'student', 'Bob', 'Johnson', '+1234567892');
```

## Security Considerations

1. **Rate Limiting**: Implement rate limiting on login endpoints
2. **HTTPS Only**: All authentication endpoints must use HTTPS
3. **CSRF Protection**: Implement CSRF tokens for web requests
4. **Input Validation**: Validate all inputs on server side
5. **Audit Logging**: Log all authentication attempts
6. **Session Management**: Implement proper session invalidation
7. **PIN Complexity**: Consider requiring non-sequential PINs

## Frontend Integration

The frontend login system supports:
- Two-step authentication (credentials → PIN)
- Proper error handling and user feedback
- Role-based redirection after successful login
- Loading states and form validation
- Responsive design with proper styling
