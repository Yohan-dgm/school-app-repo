/**
 * Profile Image Utilities
 * Reusable functions for handling user profile images across components
 */

import { buildUserProfileImageUrl } from "./mediaUtils";

/**
 * Get user profile image source with proper fallback logic
 * @param {Object} user - User object from Redux store
 * @returns {Object} Image source object - either {uri: string} or require() statement
 */
export const getUserProfileImageSource = (user) => {
  // Check if user has a profile_image in their data
  if (user?.profile_image && user.profile_image.id) {
    const profileImageUrl = buildUserProfileImageUrl(user.profile_image);
    if (profileImageUrl) {
      return { uri: profileImageUrl };
    }
  }

  // Fallback to default image
  return require("../assets/images/sample-profile.png");
};

/**
 * Get user profile image source with authentication headers (for components that need them)
 * @param {Object} user - User object from Redux store
 * @param {string} token - Authentication token
 * @returns {Object} Image source object with headers if needed
 */
export const getUserProfileImageSourceWithAuth = (user, token) => {
  // Check if user has a profile_image in their data
  if (user?.profile_image && user.profile_image.id) {
    const profileImageUrl = buildUserProfileImageUrl(user.profile_image);
    if (profileImageUrl) {
      return {
        uri: profileImageUrl,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      };
    }
  }

  // Fallback to default image (no headers needed for local files)
  return require("../assets/images/sample-profile.png");
};

/**
 * Check if user has an uploaded profile image
 * @param {Object} user - User object from Redux store
 * @returns {boolean} True if user has uploaded profile image, false otherwise
 */
export const hasUserProfileImage = (user) => {
  return !!(user?.profile_image && user.profile_image.id);
};

/**
 * Get profile image info for debugging
 * @param {Object} user - User object from Redux store
 * @returns {Object} Profile image debug info
 */
export const getProfileImageDebugInfo = (user) => {
  const hasImage = hasUserProfileImage(user);

  return {
    hasProfileImage: hasImage,
    profileImageId: user?.profile_image?.id || null,
    profileImageFilename: user?.profile_image?.filename || null,
    profileImagePath:
      user?.profile_image?.public_path || user?.profile_image?.full_url || null,
    generatedUrl: hasImage
      ? buildUserProfileImageUrl(user.profile_image)
      : null,
    fallbackUsed: !hasImage,
  };
};
