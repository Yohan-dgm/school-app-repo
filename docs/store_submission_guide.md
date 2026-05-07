# App Store & Google Play Submission Guide

This document provides a step-by-step guide to ensuring your school application is approved by Apple and Google.

## 1. Metadata Requirements

### App Store (iOS)
- **App Name**: Ensure it's unique and matches the branding.
- **Subtitle**: A short description (30 characters).
- **Description**: Detailed explanation of the app's features for the school community.
- **Keywords**: Tags to help users find your app.
- **Support URL**: A link where users can get help.
- **Privacy Policy URL**: **MANDATORY**. Must be a public link to your privacy policy.
- **Marketing URL**: Optional.

### Google Play (Android)
- **Short Description**: 80 characters.
- **Full Description**: 4000 characters.
- **Graphics**: 
  - App Icon (512x512)
  - Feature Graphic (1024x500)
  - Screenshots (at least 2 for phone, 7-inch tablet, and 10-inch tablet).

---

## 2. Reviewer Access (Demo Accounts)

Both Apple and Google need to test the app behind the login.
**You MUST provide credentials for a demo account.**

> [!IMPORTANT]
> - **Username/Email**: `demo@school.com` (Example)
> - **Password**: `demo123` (Example)
> - **Instructions**: "This is a dummy student/parent account with pre-filled data for testing purposes."

---

## 3. Critical Compliance Items

### Apple Guideline 1.2: User Generated Content (UGC)
Since the app has a "School Life" feed:
1. **Reporting**: Users must be able to report offensive posts.
2. **Blocking**: Users must be able to block abusive posters.
3. **Filtering**: Content should be monitored.

### Apple Guideline 5.1.1(v): Account Deletion
If your app allows account creation, it **MUST** allow users to initiate account deletion from within the app.
- Status: I have enabled the "Delete Account" button in the Settings.

### Permissions
Permission strings in `app.json` (iOS `infoPlist`) must explain exactly *why* the app needs the permission.
- **Bad**: "This app needs camera access."
- **Good**: "Allowing camera access enables you to take profile pictures and scan school QR codes."

---

## 4. Technical Checklist
- [ ] **Icons**: Icons are properly sized and clear of artifacts.
- [ ] **Splash Screen**: Splash screen is centered and looks professional.
- [ ] **Release Build**: Ensure you are submitting a `production` build via EAS.
- [ ] **API URL**: Ensure the production API URL is hardcoded or set via environment variables for the release build.
- [ ] **No Placeholders**: Remove any "LOREM IPSUM" or dummy data visible to the user.

---

## 5. Android Specific Requirements (Google Play)

Google Play has strict requirements for data privacy and security.

### ⚠️ Photo & Video Permissions Policy (READ_MEDIA_IMAGES / READ_MEDIA_VIDEO)

> [!CAUTION]
> These are **restricted permissions**. Apps are only allowed to use them if the app's entire core purpose is a media browser/gallery. A school app does NOT qualify.
>
> **Our fix (applied in code):**
> - `expo-image-picker` plugin is configured in `app.json` — on Android it uses the native Photo Picker (zero permissions needed).
> - `blockedPermissions` in `app.json` explicitly strips `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` from the final manifest.
> - `MediaViewer.js` only calls `MediaLibrary.requestPermissionsAsync()` on iOS. Android save-to-gallery works without permission on Android 10+.
> - All post drawer components already request `requestMediaLibraryPermissionsAsync()` only inside `if (Platform.OS === "ios")` guards.

### Push Notifications (Android 13+)
- **Permission**: The app includes `POST_NOTIFICATIONS` in `app.json`.
- **Runtime Request**: The app will ask the user for permission when it first loads. This is mandatory for Android 13 and above.

### Data Safety Form (Mandatory — Play Console)
In the Google Play Console, go to **App content → Data Safety** and fill in:

| Data Type | Collected? | Notes |
|---|---|---|
| Name | ✅ Yes | For account display |
| Email | ✅ Yes | For account management |
| **Photos & Videos** | ❌ **No** | Users pick files to upload — we do NOT retain/store them as personal data |
| Device Identifiers | ✅ Yes | For push notifications |
| Academic Data (grades, attendance) | ✅ Yes | App's core function |
| Data encrypted in transit | ✅ Yes | HTTPS only |

> [!WARNING]
> **"Photos & Videos" MUST be marked as NOT collected.** The app uses the Android Photo Picker for one-time file selection only.

### Photo Picker Policy Declaration (Mandatory — Play Console)
Go to **Publishing overview → Resolve policy issues → Photo Picker Declaration** and state:
> *"Our app uses expo-image-picker which invokes the Android native Photo Picker system UI for one-time media selection. No READ_MEDIA_IMAGES or READ_MEDIA_VIDEO permissions are declared or requested at runtime on Android. The blockedPermissions field in app.json explicitly excludes these restricted permissions from the compiled manifest."*

### App Bundle (.aab)
- Google Play no longer accepts `.apk` for new apps. You MUST use `.aab`.
- Command: `eas build --platform android --profile production`

### Tablet Support
- If you enabled tablet support, you **MUST** provide tablet screenshots (7" and 10"). Failure to do so will delay approval.

---

## 6. Build & Submission Steps

### Before Building
1. Confirm `versionCode` in `app.json` is incremented from the last rejected build.
2. Run a lint check: `npm run lint`

### Build Commands
```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

### Verify Android Manifest (Critical — Do Before Submitting)
After the Android build completes, download the AAB and verify:
```bash
# Using bundletool
java -jar bundletool.jar dump manifest --bundle=your-app.aab | grep "READ_MEDIA"
# Must return EMPTY — no results
```

### Upload & Submit
1. Upload `.ipa` to TestFlight via Transporter or EAS Submit.
2. Upload `.aab` to Google Play Console → Internal Testing first.
3. Test the internal build on a real Android device — confirm NO permission dialogs appear when picking media.
4. Complete **Data Safety** form and **Photo Picker declaration** in Play Console.
5. Promote to Production.

### Reviewer Note for Google Play (Copy-Paste This)
When submitting, paste this into the "Notes for reviewer" field:

> *"This submission resolves the READ_MEDIA_IMAGES/READ_MEDIA_VIDEO policy violation. Changes: (1) expo-image-picker plugin configured in app.json without broad media permissions — Android uses the native Photo Picker; (2) blockedPermissions in app.json explicitly removes restricted permissions from the manifest; (3) MediaLibrary.requestPermissionsAsync() is only called on iOS — Android save-to-gallery uses createAssetAsync() which works permission-free on Android 10+; (4) All media selection on Android is handled via the native Photo Picker with zero runtime permission dialogs. Data Safety form updated: Photos & Videos marked as NOT collected."*

---

## 7. iOS & Android Permission Behaviour Summary

| Feature | iOS | Android |
|---|---|---|
| Pick photo/video for post | Shows NSPhotoLibraryUsageDescription dialog (first time) | Opens native Photo Picker directly — NO dialog |
| Pick from profile photo | Shows NSPhotoLibraryUsageDescription dialog (first time) | Opens native Photo Picker directly — NO dialog |
| Take photo with camera | Shows NSCameraUsageDescription dialog (first time) | Shows CAMERA permission dialog (first time) |
| Save image to gallery | Shows photo library permission dialog (first time) | Saves directly — NO dialog (Android 10+) |
| Push notifications | Shows notification permission dialog | Shows POST_NOTIFICATIONS dialog (Android 13+) |
