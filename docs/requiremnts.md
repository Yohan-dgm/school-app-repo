School Management System Mobile App - Feature Document
Overview
This document outlines the feature set for a multi-tenant school management system mobile app built with React Native/Expo. The app will support role-based access (Parent, Educator, Student, and extensible for future roles), integrate with a Laravel backend, and include modern UI/UX features like splash screens, navigation, push notifications, and reusable UI components.
Key Features

floow this codebase architecher currently have with folder structure also mension this to floow this expo docs(https://docs.expo.dev/)

1. Splash Screen

Description: Animated loading screen with "Schoobond" title and "Powered by Toyar Pvt. Ltd." text at the bottom.
Duration: 2-second animation with a logo loading effect.
Transition: Automatically navigates to the home screen or login screen based on authentication status.

2. Authentication & Routing

Login/Logout: Multi-tenant login with email/password and role-based redirection.
Password Reset:
Forgot Password Screen: Email input to send OTP.
OTP Screen: Verify OTP sent via email (backend API required to send OTP).
Reset Password Screen: New password input after OTP validation.

Protected Routes: Using Expo Router with guards:
guard={session.user_role === "general"} for general users.
guard={session.user_type === "parent"} for parents.

Navigation:
Stack Navigator: For authentication flow (Login, Forgot Password, OTP, Reset Password).
Tabs Navigator: For authenticated home screen features (Feed, Announcements, Banners).
Drawer Navigator: For settings and profile access.
Navbar: Displayed pre-login and post-login, adapting to user role.

3. Authenticated Home Screen

Features:
Post Feed: School announcements and updates.
Announcements: Role-specific notifications.
Company Banners: Promotional content.

Navigation: Swipe right to reveal login screen if unauthenticated; otherwise, shows authenticated navbar.
Role-Based UI: Custom navbar and layout for Parent, Educator, and Student roles.

4. User Roles & Permissions

Supported Roles: Parent, Educator, Student (extensible for future roles).
Permission Check: Component-level conditional rendering (e.g., {session.user_role === "educator" && <EducatorComponent />}).
Session Data: Fetched from backend to determine role and permissions (backend API required for session data).

5. OpenRouter Integration

Description: Integrate OpenRouter for AI model interactions (e.g., chatbot for student queries).
Implementation: API calls to OpenRouter endpoints (backend API required to proxy requests).

7. Push Notifications

Description: Real-time alerts for announcements, grades, or events.
Implementation: Expo Push Notifications (backend API required to send push notifications).

8. UI/UX Design

Style: Apple Clean App aesthetic with liquid glass effect.
Components: Unique UI using T-prefixed components (e.g., TButton, TCard) with NativeWind and custom themes.
Responsiveness: Adaptive layout for different screen sizes.

9. Reusable UI Components

TButton: Customizable buttons with variants (primary, secondary, outline, icon, loading).
TDropdown: Dropdown menu with selectable options and dynamic styling.
TText: Styled text component with size, weight, and color variants.
TLabel: Labels for form fields and annotations with customizable appearance.
TAvatar: Circular avatar component for user profiles with image or initial support.
TCard: Card component for displaying content like announcements or banners.
TNewUIElement: New UI element (e.g., a liquid glass effect badge) for enhanced visual appeal.

Backend API Requirements

Authentication:
POST /api/login: Authenticate user (username/email, password) and return token/session data.
POST /api/forgot-password: Send OTP to email (requires email service integration).
POST /api/verify-otp: Validate OTP.
POST /api/reset-password: Update password with validated OTP.

Session Data:
GET /api/session: Fetch user role, permissions, and ID.

OpenRouter Proxy:
POST /api/openrouter: Proxy AI model requests.

Push Notifications:
POST /api/send-notification: Send push notifications to users.

File Structure Slices

src/app/public/layout.tsx: Unauthenticated layout with navbar.
src/app/unauthenticated/sign-in/layout.tsx: Login screen layout.
src/app/unauthenticated/forgot-password/layout.tsx: Forgot Password screen.
src/app/unauthenticated/otp/layout.tsx: OTP verification screen.
src/app/unauthenticated/reset-password/layout.tsx: Reset Password screen.
src/app/authenticated/parent/layout.tsx: Parent dashboard layout.
src/app/authenticated/educator/layout.tsx: Educator dashboard layout.
src/app/authenticated/student/layout.tsx: Student dashboard layout.
src/components/modules/SplashScreen.tsx: Animated splash screen.
src/components/modules/HomeScreen.tsx: Authenticated home screen with feed.
src/components/modules/Navbar.tsx: Role-based navbar component.
src/components/modules/SettingsScreen.tsx: Settings screen via Drawer.
src/components/ui/TButton.tsx: Reusable button component.
src/components/ui/TDropdown.tsx: Reusable dropdown component.
src/components/ui/TText.tsx: Reusable text component.
src/components/ui/TLabel.tsx: Reusable label component.
src/components/ui/TAvatar.tsx: Reusable avatar component.
src/components/ui/TCard.tsx: Reusable card component.
src/components/ui/TNewUIElement.tsx: Reusable new UI element (liquid glass badge).

Development Notes

Use Redux Toolkit for state management and RTK Query for API calls.
Implement form validation with React Hook Form and Zod.
Ensure compatibility with Laravel backend endpoints.
Leverage NativeWind for component styling and custom themes for consistency.
