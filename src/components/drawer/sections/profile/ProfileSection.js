import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../../../styles/theme";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "expo-router";
import { useAuth } from "../../../../context/AuthContext";
import { getUserProfileImageSource } from "../../../../utils/profileImageUtils";
import {
  useChangePasswordMutation,
  useUploadProfilePhotoMutation,
} from "../../../../api/user-management-api";
import { logout, setUser } from "../../../../state-store/slices/app-slice";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ProfileSection = ({ onClose }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();

  // Image upload states
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [profileImageKey, setProfileImageKey] = useState(0); // Force re-render after upload
  const [uploadProfilePhoto] = useUploadProfilePhotoMutation();

  // Get session data and user data from Redux store
  const sessionData = useSelector((state) => state.app.sessionData);
  const user = useSelector((state) => state.app.user);

  // Debug user data on every render
  console.log("🏠 ProfileSection - Component render, user data:", {
    userId: user?.id,
    hasUser: !!user,
    hasProfileImage: !!user?.profile_image,
    profileImageId: user?.profile_image?.id,
    profileImagePath:
      user?.profile_image?.public_path || user?.profile_image?.full_url,
    sessionDataUser: sessionData?.data,
  });

  // Get profile picture from user data using reusable utility (reactive to user changes)
  const profileImage = useMemo(() => {
    console.log(
      "🔄 ProfileSection - Recalculating profile image, user:",
      user?.id,
      "has profile_image:",
      !!user?.profile_image?.id,
    );

    // Try Redux user first, then sessionData if Redux user doesn't have profile image
    let targetUser = user;
    if (!user?.profile_image?.id && sessionData?.data?.profile_image?.id) {
      console.log(
        "🔄 ProfileSection - Redux user has no profile image, trying sessionData",
      );
      targetUser = sessionData.data;
    }

    const imageSource = getUserProfileImageSource(targetUser);
    console.log("🔄 ProfileSection - Generated image source:", imageSource);
    return imageSource;
  }, [
    user,
    user?.profile_image,
    sessionData?.data?.profile_image,
    profileImageKey,
  ]); // Re-calculate when user data or upload key changes

  // Extract real data from session using same pattern as profile.tsx
  const userName =
    sessionData?.data?.full_name ||
    sessionData?.full_name ||
    user?.full_name ||
    sessionData?.data?.username ||
    sessionData?.username ||
    user?.username ||
    "No data";

  const userEmail =
    sessionData?.data?.email || sessionData?.email || user?.email || "No data";

  const userPhone =
    sessionData?.data?.phone || sessionData?.phone || user?.phone || "No data";

  const userAddress =
    sessionData?.data?.address ||
    sessionData?.address ||
    user?.address ||
    "No data";

  const userGrade =
    sessionData?.data?.grade || sessionData?.grade || user?.grade || "No data";

  const userStudentId =
    sessionData?.data?.student_id ||
    sessionData?.student_id ||
    user?.student_id ||
    "No data";

  const [editedUser, setEditedUser] = useState({
    full_name: userName,
    email: userEmail,
    phone: userPhone,
    address: userAddress,
    grade: userGrade,
    student_id: userStudentId,
  });

  const handleSave = () => {
    // Here you would typically make an API call to update the user profile
    // For now, just show success message as we're not implementing actual save functionality
    setIsEditing(false);
    Alert.alert("Success", "Profile updated successfully. Please Login Again!");
  };

  const handleCancel = () => {
    setEditedUser({
      full_name: userName,
      email: userEmail,
      phone: userPhone,
      address: userAddress,
      grade: userGrade,
      student_id: userStudentId,
    });
    setIsEditing(false);
  };

  const ProfileField = ({
    label,
    value,
    field,
    editable = true,
    multiline = false,
  }) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {isEditing && editable ? (
        <TextInput
          style={[styles.fieldInput, multiline && styles.multilineInput]}
          value={value}
          onChangeText={(text) =>
            setEditedUser({ ...editedUser, [field]: text })
          }
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
        />
      ) : (
        <Text style={styles.fieldValue}>{value}</Text>
      )}
    </View>
  );

  // Password validation function
  const validatePasswordForm = () => {
    const newErrors = {};

    if (!currentPassword.trim()) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 4) {
      newErrors.newPassword = "Password must be at least 4 characters long";
    } else if (newPassword.length > 10) {
      newErrors.newPassword = "Password must not exceed 10 characters";
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (currentPassword === newPassword) {
      newErrors.newPassword =
        "New password must be different from current password";
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    try {
      const userId = user?.id || sessionData?.data?.id || sessionData?.id;

      if (!userId) {
        Alert.alert("Error", "User ID not found. Please login again.");
        return;
      }

      await changePassword({
        id: userId,
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }).unwrap();

      Alert.alert(
        "Success",
        "Password changed successfully.Please login again!",
        [
          {
            text: "OK",
            onPress: () => {
              handleClosePasswordForm();
              handleLogoutAfterPhotoUpdate();
            },
          },
        ],
      );
    } catch (error) {
      const errorMessage =
        error?.data?.message || error?.message || "Failed to change password";
      Alert.alert("Error", errorMessage);
    }
  };

  // Close password form and reset states
  const handleClosePasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrors({});
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setShowChangePasswordForm(false);
  };

  // Image validation function (only file size validation)
  const validateImage = (fileSize) => {
    // Only check file size (5MB max)
    if (fileSize > 5 * 1024 * 1024) {
      throw new Error("Image size must not exceed 5MB");
    }
    return true;
  };

  // Handle image selection from camera
  const pickImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is needed to take photos.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const fileSize = result.assets[0].fileSize || 0;

        // Validate file size only
        try {
          validateImage(fileSize);
          setSelectedImage(result.assets[0]);
        } catch (error) {
          Alert.alert("Error", error.message);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open camera");
    }
  };

  // Handle image selection from gallery
  const pickImageFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library permission is needed to select images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const fileSize = result.assets[0].fileSize || 0;

        // Validate file size only
        try {
          validateImage(fileSize);
          setSelectedImage(result.assets[0]);
        } catch (error) {
          Alert.alert("Error", error.message);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open photo library");
    }
  };

  // Show image selection options
  const showImageSelectionOptions = () => {
    Alert.alert(
      "Select Profile Photo",
      "Choose how you'd like to select your profile photo",
      [
        { text: "Camera", onPress: pickImageFromCamera },
        { text: "Photo Library", onPress: pickImageFromGallery },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  // Handle image upload
  const handleUploadImage = async () => {
    if (!selectedImage) return;

    setIsUploadingImage(true);
    try {
      // Get user ID
      const userId = user?.id || sessionData?.data?.id || sessionData?.id;

      if (!userId) {
        Alert.alert("Error", "User ID not found. Please login again.");
        return;
      }

      const formData = new FormData();

      // Add the image file
      formData.append("profile_image", {
        uri: selectedImage.uri,
        type: selectedImage.mimeType || "image/jpeg",
        name: selectedImage.fileName || `profile_${Date.now()}.jpg`,
      });

      // Add user ID to the form data
      formData.append("user_id", userId.toString());

      console.log("Uploading profile photo for user:", userId);
      console.log("Image details:", {
        uri: selectedImage.uri,
        type: selectedImage.mimeType || "image/jpeg",
        name: selectedImage.fileName || `profile_${Date.now()}.jpg`,
      });

      const uploadResponse = await uploadProfilePhoto(formData).unwrap();

      console.log(
        "🎯 ProfileSection: Photo upload successful, logging out user",
      );

      // Show success message and automatically logout
      Alert.alert("Profile photo updated successfully. Please Login Again!");
      setSelectedImage(null);
      handleLogoutAfterPhotoUpdate();
    } catch (error) {
      console.log("Upload error:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to upload image";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Cancel image selection
  const handleCancelImageSelection = () => {
    setSelectedImage(null);
  };

  // Handle logout after photo update (following same pattern as DrawerMenu)
  const handleLogoutAfterPhotoUpdate = async () => {
    console.log("🔹 Profile Section: Logout after photo update");

    try {
      // Clear persisted Redux data
      console.log("🧹 Clearing persisted Redux data...");
      await AsyncStorage.removeItem("persist:root");

      // Clear stored login credentials
      console.log("🔑 Clearing stored login credentials...");
      await AsyncStorage.removeItem("loginCredentials");

      // Clear user data and authentication state using the proper logout action
      setUser(null);
      dispatch(logout()); // This clears all Redux state including sessionData

      console.log("✅ Session data and credentials cleared successfully");
    } catch (error) {
      console.error("❌ Error clearing session data:", error);
      // Still proceed with logout even if clearing fails
      setUser(null);
      dispatch(logout());
    }

    // Close the profile section first
    onClose();

    // Navigate to public index page
    setTimeout(() => {
      router.replace("/public");
    }, 300); // Small delay to allow close animation
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        {/* <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            if (isEditing) {
              handleSave();
            } else {
              setIsEditing(true);
            }
          }}
        >
          <MaterialIcons
            name={isEditing ? "check" : "edit"}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity> */}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Image Section */}
        <View style={styles.profileImageSection}>
          <View style={styles.profileImageContainer}>
            <Image
              key={profileImageKey} // Force re-render after upload
              source={selectedImage ? { uri: selectedImage.uri } : profileImage}
              style={styles.profileImage}
            />
            <TouchableOpacity
              style={styles.changePhotoButton}
              onPress={showImageSelectionOptions}
            >
              <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{editedUser.full_name}</Text>

          {/* Image Upload Controls */}
          {selectedImage && (
            <View style={styles.imageUploadControls}>
              <TouchableOpacity
                style={styles.cancelImageButton}
                onPress={handleCancelImageSelection}
              >
                <Text style={styles.cancelImageButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.uploadImageButton,
                  isUploadingImage && styles.buttonDisabled,
                ]}
                onPress={handleUploadImage}
                disabled={isUploadingImage}
              >
                <Text style={styles.uploadImageButtonText}>
                  {isUploadingImage ? "Uploading..." : "Save Photo"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Profile Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <ProfileField
            label="Full Name"
            value={editedUser.full_name}
            field="full_name"
          />

          <ProfileField
            label="Email Address"
            value={editedUser.email}
            field="email"
          />

          {/* <ProfileField
            label="Phone Number"
            value={editedUser.phone}
            field="phone"
          />

          <ProfileField
            label="Address"
            value={editedUser.address}
            field="address"
            multiline={true}
          /> */}
        </View>

        {/* Academic Information */}
        {/* <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Academic Information</Text>

          <ProfileField
            label="Student ID"
            value={editedUser.student_id}
            field="student_id"
            editable={false}
          />

          <ProfileField
            label="Grade"
            value={editedUser.grade}
            field="grade"
            editable={false}
          />
        </View> */}

        {/* Action Buttons */}
        {/* {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )} */}

        {/* Additional Options */}
        <View style={styles.optionsSection}>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => setShowChangePasswordForm(!showChangePasswordForm)}
          >
            <MaterialIcons
              name="security"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.optionText}>Change Password</Text>
            <MaterialIcons
              name={showChangePasswordForm ? "expand-less" : "expand-more"}
              size={24}
              color="#CCCCCC"
            />
          </TouchableOpacity>

          {/* Change Password Form */}
          {showChangePasswordForm && (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.changePasswordSection}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.changePasswordForm}>
                  <Text style={styles.changePasswordTitle}>
                    Change Password
                  </Text>
                  <Text style={styles.changePasswordSubtitle}>
                    Enter your current password and choose a new secure
                    password.
                  </Text>

                  {/* Password Requirements */}
                  <View style={styles.passwordRequirements}>
                    <Text style={styles.requirementsTitle}>
                      Password Requirements:
                    </Text>
                    <Text style={styles.requirementText}>
                      • Between 4-10 characters long
                    </Text>
                    <Text style={styles.requirementText}>
                      • Different from current password
                    </Text>
                  </View>

                  {/* Current Password */}
                  <View style={styles.passwordContainer}>
                    <Text style={styles.fieldLabel}>Current Password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={[
                          styles.passwordInput,
                          passwordErrors.currentPassword && styles.inputError,
                        ]}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="Enter current password"
                        secureTextEntry={!showCurrentPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                        maxLength={10}
                      />
                      <TouchableOpacity
                        style={styles.eyeIconButton}
                        onPress={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                      >
                        <MaterialIcons
                          name={
                            showCurrentPassword
                              ? "visibility-off"
                              : "visibility"
                          }
                          size={20}
                          color="#666666"
                        />
                      </TouchableOpacity>
                    </View>
                    {passwordErrors.currentPassword && (
                      <Text style={styles.errorText}>
                        {passwordErrors.currentPassword}
                      </Text>
                    )}
                  </View>

                  {/* New Password */}
                  <View style={styles.passwordContainer}>
                    <Text style={styles.fieldLabel}>New Password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={[
                          styles.passwordInput,
                          passwordErrors.newPassword && styles.inputError,
                        ]}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Enter new password"
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                        maxLength={10}
                      />
                      <TouchableOpacity
                        style={styles.eyeIconButton}
                        onPress={() => setShowNewPassword(!showNewPassword)}
                      >
                        <MaterialIcons
                          name={
                            showNewPassword ? "visibility-off" : "visibility"
                          }
                          size={20}
                          color="#666666"
                        />
                      </TouchableOpacity>
                    </View>
                    {passwordErrors.newPassword && (
                      <Text style={styles.errorText}>
                        {passwordErrors.newPassword}
                      </Text>
                    )}
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.passwordContainer}>
                    <Text style={styles.fieldLabel}>Confirm New Password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={[
                          styles.passwordInput,
                          passwordErrors.confirmPassword && styles.inputError,
                        ]}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm new password"
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        maxLength={10}
                        onSubmitEditing={handleChangePassword}
                      />
                      <TouchableOpacity
                        style={styles.eyeIconButton}
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        <MaterialIcons
                          name={
                            showConfirmPassword
                              ? "visibility-off"
                              : "visibility"
                          }
                          size={20}
                          color="#666666"
                        />
                      </TouchableOpacity>
                    </View>
                    {passwordErrors.confirmPassword && (
                      <Text style={styles.errorText}>
                        {passwordErrors.confirmPassword}
                      </Text>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.passwordActionButtons}>
                    <TouchableOpacity
                      style={styles.cancelPasswordButton}
                      onPress={handleClosePasswordForm}
                    >
                      <Text style={styles.cancelPasswordButtonText}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.changePasswordButton,
                        isChangingPassword && styles.buttonDisabled,
                      ]}
                      onPress={handleChangePassword}
                      disabled={isChangingPassword}
                    >
                      <Text style={styles.changePasswordButtonText}>
                        {isChangingPassword ? "Changing..." : "Change Password"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.primary,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 20,
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  profileImageSection: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 30,
    marginBottom: 20,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 15,
    padding: 4,
    borderRadius: 54,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    backgroundColor: "#F5F5F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  changePhotoButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: 5,
  },
  profileRole: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: "#666666",
  },
  infoSection: {
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  fieldContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: "#666666",
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  fieldInput: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: "#666666",
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginLeft: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: "#FFFFFF",
  },
  optionsSection: {
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    marginLeft: 15,
  },
  // Change Password Form Styles
  changePasswordSection: {
    backgroundColor: "#F8F9FA",
    marginTop: 10,
    paddingBottom: 20,
  },
  changePasswordForm: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  changePasswordTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: 5,
  },
  changePasswordSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: "#666666",
    marginBottom: 20,
    lineHeight: 20,
  },
  passwordRequirements: {
    backgroundColor: "#E8F4FD",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: "#666666",
    marginBottom: 2,
  },
  passwordContainer: {
    marginBottom: 15,
  },
  passwordInputContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    paddingVertical: 12,
    paddingHorizontal: 15,
    paddingRight: 45,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  inputError: {
    borderColor: "#FF4444",
  },
  eyeIconButton: {
    position: "absolute",
    right: 12,
    padding: 5,
  },
  errorText: {
    color: "#FF4444",
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  passwordActionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelPasswordButton: {
    flex: 0.48,
    backgroundColor: "#F0F0F0",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelPasswordButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: "#666666",
  },
  changePasswordButton: {
    flex: 0.48,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  changePasswordButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Image Upload Styles
  imageUploadControls: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
    gap: 10,
  },
  cancelImageButton: {
    backgroundColor: "#F0F0F0",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  cancelImageButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: "#666666",
  },
  uploadImageButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  uploadImageButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: "#FFFFFF",
  },
});

export default ProfileSection;
