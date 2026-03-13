# App Build & Publish Guide (with Push Notifications)

This document provides step-by-step instructions on how to properly build the React Native Expo project for Android and iOS specifically ensuring that **Push Notifications** work correctly. It also covers the procedure to publish the application to the Apple App Store.

Normal local builds or development bounds might not process push notifications properly without correct setups in Expo Application Services (EAS). Follow these instructions closely.

---

## 1. Prerequisites

1.  **EAS CLI**: Ensure you have the Expo Application Services CLI installed.
    ```bash
    npm install -g eas-cli
    ```
2.  **Expo Account**: You need to be logged into your Expo account.
    ```bash
    eas login
    ```
3.  **Developer Accounts**:
    *   **Android**: A Google Play Developer account (for production release).
    *   **iOS**: An Apple Developer account (required for *both* push notifications and App Store publishing).

---

## 2. Push Notifications Configuration

For push notifications to work in a standalone build (APK or iOS IPA), the app must be registered with Firebase Cloud Messaging (Android) and Apple Push Notification service (iOS), and Expo must hold the correct credentials to send notifications on your behalf.

### A. Android Push Notification Setup (FCM)
1. Go to your **Firebase Console**, select your project, and navigate to **Project settings -> Cloud Messaging**.
2. Find the **Server key** (or generate a Service Account JSON).
3. Upload this Server Key to Expo:
   ```bash
   eas credentials
   ```
   * Select Android -> Select your existing build profile -> Select **Push Notifications: Google Cloud Messaging Server Key**.
   * When prompted, submit your Server Key from Firebase.
4. Ensure your `app.json` has the correct `googleServicesFile` linked under `android`. (Make sure `google-services.json` is at the root of your project).

### B. iOS Push Notification Setup (APNs)
1. You must have an Apple Developer account. Push notifications do *not* work on iOS simulators; they require a physical device and a verified provisioning profile.
2. In your terminal, run:
   ```bash
   eas credentials
   ```
   * Select iOS -> Select your profile -> Select **Push Notifications: Apple Push Notifications service (APNs) Key**.
   * EAS will prompt to automatically generate and assign an APNs key for you using your Apple Developer account credentials. Let EAS manage this (recommended).

---

## 3. Configuring `eas.json` for Builds

Your `eas.json` file controls how the APK/AAB or IPA are constructed. To build an APK for testing (which allows push notifications to work) instead of an AAB, you need a specific profile.

Make sure your `eas.json` looks something like this:

```json
{
  "cli": {
    "version": ">= 3.5.2"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 4. Building the Apps

### A. Building an Android APK (For Testing Push Notifications)
The standard Play Store build (`app-bundle` / AAB) cannot be directly installed on your phone. To test push notifications on a physical Android device, build an APK:

```bash
eas build --platform android --profile preview
```
* **Why `preview` profile?**: As configured above, the `preview` profile sets `"buildType": "apk"`.
* **Result**: Once finished, EAS will provide a link to download the `.apk` file. Install this on your Android device and push notifications will work.

### B. Building an Android AAB (For Play Store Production)
When you are ready to upload to the Google Play Store:

```bash
eas build --platform android --profile production
```
* **Result**: Generates an `.aab` file which you will upload to the Google Play Console.

### C. Building for iOS (TestFlight / App Store)
To test push notifications on iOS, you **must** use a TestFlight build or an ad-hoc build. A simulator build will *not* register push tokens. 

```bash
eas build --platform ios --profile production
```
* EAS will ask you to log into your Apple Developer account if you haven't already.
* It will automatically manage your Distribution Certificates and Provisioning Profiles. Ensure it says "Yes" when it asks to set up Push Notifications capabilities.
* **Result**: Generates an `.ipa` file.

---

## 5. Publishing to the Apple App Store

Once your iOS build (`.ipa`) is complete, you need to submit it to Apple's App Store Connect. You can do this directly from the command line using EAS Submit.

### Step 1: Submit the Build via EAS
Run the following command to submit your successfully built iOS app directly to App Store Connect:

```bash
eas submit -p ios --latest
```
* EAS will retrieve the latest successful iOS build from your Expo dashboard.
* You will be prompted to log in to your Apple ID. Provide your App-Specific Password if prompted (generate this at appleid.apple.com).
* EAS will upload the `.ipa` to App Store Connect.

### Step 2: App Store Connect Processing
1. Log in to [App Store Connect](https://appstoreconnect.apple.com/).
2. Go to **My Apps** and select your app.
3. Click on the **TestFlight** tab. You will see your build there. It usually takes Apple 10-30 minutes to process the build.
4. Once processed, you can add internal testers to test the app (and verify push notifications work gracefully on iOS).

### Step 3: Preparing the App Store Listing
Before you can publish to the live App Store, you must fill out the required metadata:
1. Go to the **App Store** tab in App Store Connect.
2. Select your version (e.g., `1.0.0 Prepare for Submission`).
3. Fill in the following mandatory details:
   * **Screenshots**: Provide screenshots for 6.5-inch (iPhone 13/14/15 Pro Max) and 5.5-inch screens.
   * **Promotional Text & Description**.
   * **Keywords & Support URL**.
   * **App Privacy**: Fill out the Privacy Questionnaire. Specifically mention if you collect User Data (for chat, notifications, profiles).
4. **Select the Build**: Scroll down to the "Build" section and select the build you just uploaded via EAS.

### Step 4: Submit for Review
1. Once all information is filled out, click **Add for Review** at the top right.
2. Answer the Export Compliance questions (typically "No" if you aren't using advanced custom encryption).
3. Click **Submit to App Review**.
4. The status will change to *Waiting for Review*. Apple's review process usually takes 24 to 48 hours. Once approved, its status will change to *Ready for Sale*.
