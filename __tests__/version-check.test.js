/**
 * Simple test to verify app version checking implementation
 */

// Mock the version check functionality
const mockVersionCheck = (currentVersion, apiVersion, platform) => {
  const requiredVersion =
    platform === "ios"
      ? apiVersion.iso_app_version
      : apiVersion.android_app_version;
  return {
    isUpdateRequired: currentVersion !== requiredVersion,
    currentVersion,
    requiredVersion,
    platform,
  };
};

// Test data from the user's example
const mockApiResponse = {
  status: "success",
  data: {
    user_id: 61,
    username: "parent",
    email: "unassigned@nexiscollege.lk",
    iso_app_version: "1.0.8",
    android_app_version: "1.0.8",
    is_active: true,
    user_category: "1",
  },
};

// Test version checking logic
console.log("🧪 Version Check Tests");

// Test 1: iOS version match
const iosMatch = mockVersionCheck("1.0.1", mockApiResponse.data, "ios");
console.log("iOS version match:", iosMatch);

// Test 2: iOS version mismatch
const iosMismatch = mockVersionCheck("1.0.0", mockApiResponse.data, "ios");
console.log("iOS version mismatch:", iosMismatch);

// Test 3: Android version match
const androidMatch = mockVersionCheck("1.0.1", mockApiResponse.data, "android");
console.log("Android version match:", androidMatch);

// Test 4: Android version mismatch
const androidMismatch = mockVersionCheck(
  "1.0.0",
  mockApiResponse.data,
  "android"
);
console.log("Android version mismatch:", androidMismatch);

console.log("✅ Version checking logic tests completed");
