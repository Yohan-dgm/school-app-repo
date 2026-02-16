import { Platform } from "react-native";

/**
 * App Store URLs for iOS and Android platforms
 */
const APP_STORE_LINKS = {
  ios: "https://apps.apple.com/us/app/school-app-by-toyar/id6749625941", // iOS App Store link
  android:
    "https://play.google.com/store/apps/details?id=lk.toyar.schoolapp&hl=en", // Android Play Store link
};

/**
 * Gets the appropriate app store link based on the current platform
 * @returns The app store URL for the current platform
 */
export function getAppStoreLink(): string {
  const platform = Platform.OS as keyof typeof APP_STORE_LINKS;
  return APP_STORE_LINKS[platform] || APP_STORE_LINKS.android;
}

/**
 * Gets the app store link for a specific platform
 * @param platform - The platform ("ios" or "android")
 * @returns The app store URL for the specified platform
 */
export function getAppStoreLinkForPlatform(
  platform: "ios" | "android"
): string {
  return APP_STORE_LINKS[platform];
}
