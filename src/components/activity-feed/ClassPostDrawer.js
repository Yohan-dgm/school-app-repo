import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import Icon from "react-native-vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Dropdown } from "react-native-element-dropdown";
import { theme } from "../../styles/theme";
import {
  useCreateClassPostMutation,
  useUploadMediaMutation,
} from "../../api/activity-feed-api";
import {
  createPostData,
  createMediaUploadFormData,
} from "../../utils/postUtils";
import {
  validateMediaFiles,
  convertTagsToHashtags,
} from "../../utils/postSubmissionUtils";
import { processMediaForUpload } from "../../utils/imageUtils";

const ClassPostDrawer = ({ visible, onClose, onPostCreated }) => {
  const dispatch = useDispatch();
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("announcement");
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [cachedFileUris, setCachedFileUris] = useState([]); // Track cached files for cleanup

  // API hooks
  const [createClassPost] = useCreateClassPostMutation();
  const [uploadMedia] = useUploadMediaMutation();

  // Get global state
  const { sessionData, user } = useSelector((state) => state.app);

  // Available grades for class posts (Grade 1-12 = 1-12, EY 1-3 = 13-15)
  const gradeOptions = [
    { label: "Grade 1", value: 1 },
    { label: "Grade 2", value: 2 },
    { label: "Grade 3", value: 3 },
    { label: "Grade 4", value: 4 },
    { label: "Grade 5", value: 5 },
    { label: "Grade 6", value: 6 },
    { label: "Grade 7", value: 7 },
    { label: "Grade 8", value: 8 },
    { label: "Grade 9", value: 9 },
    { label: "Grade 10", value: 10 },
    { label: "Grade 11", value: 11 },
    { label: "Grade 12", value: 12 },
    { label: "EY 1", value: 13 },
    { label: "EY 2", value: 14 },
    { label: "EY 3", value: 15 },
  ];

  // Available categories for class posts with maroon theme (aligned with backend type enum)
  const categories = [
    { id: "event", label: "Event", color: theme.colors.primary, icon: "event" },
    { id: "news", label: "News", color: theme.colors.primary, icon: "article" },
    {
      id: "announcement",
      label: "Announcement",
      color: theme.colors.primary,
      icon: "campaign",
    },
    {
      id: "achievement",
      label: "Achievement",
      color: theme.colors.primary,
      icon: "emoji-events",
    },
  ];

  // Available hashtags for class posts with maroon theme
  const availableTags = [
    { id: "class", label: "#Class", color: theme.colors.primary },
    { id: "event", label: "#Event", color: theme.colors.primary },
    { id: "news", label: "#News", color: theme.colors.primary },
    { id: "announcement", label: "#Announcement", color: theme.colors.primary },
    { id: "grade", label: "#Grade", color: theme.colors.primary },
    { id: "achievement", label: "#Achievement", color: theme.colors.primary },
    { id: "activity", label: "#Activity", color: theme.colors.primary },
    { id: "reminder", label: "#Reminder", color: theme.colors.primary },
  ];

  // Clean up cached files (Android only)
  const cleanupCachedFiles = async () => {
    if (Platform.OS === "android" && cachedFileUris.length > 0) {
      console.log(`🗑️ Cleaning up ${cachedFileUris.length} cached files...`);

      for (const uri of cachedFileUris) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(uri, { idempotent: true });
            console.log(`✅ Deleted cached file: ${uri}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to delete cached file ${uri}:`, error.message);
          // Continue with other files even if one fails
        }
      }

      // Clear the tracked URIs
      setCachedFileUris([]);
      console.log(`✅ Cache cleanup completed`);
    }
  };

  const resetForm = () => {
    setPostTitle("");
    setPostContent("");
    setSelectedCategory("announcement");
    setSelectedGrade(null);
    setSelectedMedia([]);
    setSelectedTags([]);
    setUploadStep("");
    setUploadProgress({ current: 0, total: 0 });
    // Clean up cached files when resetting
    cleanupCachedFiles();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Get progress message with upload tracking
  const getProgressMessage = () => {
    switch (uploadStep) {
      case "validating":
        return "Validating post data...";
      case "uploading":
        if (uploadProgress.total > 0) {
          return `Uploading ${uploadProgress.current} of ${uploadProgress.total} files...`;
        }
        return "Uploading media files...";
      case "posting":
        return "Creating post...";
      default:
        return "Processing...";
    }
  };

  const toggleTag = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please grant camera roll permissions to add images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        quality: 1,
        allowsMultipleSelection: true,
        exif: true, // Enable EXIF metadata to get better filename info
        allowsEditing: false, // Disable editing to preserve original metadata
      });

      if (!result.canceled) {
        console.log("📷 Processing selected assets with compression...");
        console.log(`📱 Platform: ${Platform.OS}`);

        // Process each asset with compression if needed
        const processedMedia = [];
        for (let i = 0; i < result.assets.length; i++) {
          const asset = result.assets[i];
          console.log(`📷 Processing asset ${i}:`, asset);

          try {
            // Android-specific: Copy content:// URI to file:// URI for proper access
            let processableUri = asset.uri;
            let fileSize = asset.fileSize || asset.size || 0;

            if (Platform.OS === "android" && asset.uri.startsWith("content://")) {
              console.log(`🤖 Android detected - Converting content:// URI to file://`);
              console.log(`🤖 Original content URI: ${asset.uri.substring(0, 80)}`);

              try {
                // Validate content URI is accessible before attempting copy
                let contentUriInfo = null;
                try {
                  contentUriInfo = await FileSystem.getInfoAsync(asset.uri, { size: true });
                  console.log(`📊 Android - Content URI info:`, {
                    exists: contentUriInfo.exists,
                    size: contentUriInfo.size,
                    uri: asset.uri.substring(0, 80)
                  });
                } catch (infoError) {
                  console.warn(`⚠️ Android - Could not get content URI info, will attempt copy anyway:`, infoError.message);
                }

                // Get file size with multiple fallback strategies
                if (!fileSize || fileSize === 0) {
                  if (contentUriInfo && contentUriInfo.exists && contentUriInfo.size) {
                    fileSize = contentUriInfo.size;
                    console.log(`📊 Android - Got file size from content URI: ${fileSize} bytes (${(fileSize / (1024 * 1024)).toFixed(2)}MB)`);
                  } else if (asset.fileSize) {
                    fileSize = asset.fileSize;
                    console.log(`📊 Android - Using asset.fileSize: ${fileSize} bytes`);
                  } else if (asset.size) {
                    fileSize = asset.size;
                    console.log(`📊 Android - Using asset.size: ${fileSize} bytes`);
                  } else {
                    console.warn(`⚠️ Android - File size unavailable, upload may fail validation`);
                  }
                }

                // Generate safe filename for cache
                const timestamp = Date.now();
                const randomId = Math.random().toString(36).substring(7);
                const extension = asset.type === 'video' ? 'mp4' : 'jpg';
                const safeFileName = asset.fileName || asset.name || `media_${timestamp}_${randomId}.${extension}`;
                // Remove any problematic characters from filename
                const sanitizedFileName = safeFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
                const cacheUri = `${FileSystem.cacheDirectory}${sanitizedFileName}`;

                console.log(`📁 Android - Attempting to copy file to cache...`);
                console.log(`📁 From: ${asset.uri.substring(0, 80)}`);
                console.log(`📁 To: ${cacheUri}`);

                // Attempt file copy with retry logic
                let copySuccess = false;
                let copyAttempts = 0;
                const maxCopyAttempts = 2;

                while (!copySuccess && copyAttempts < maxCopyAttempts) {
                  copyAttempts++;
                  try {
                    console.log(`🔄 Android - Copy attempt ${copyAttempts}/${maxCopyAttempts}`);

                    // Check if file already exists in cache and delete it
                    const cacheFileInfo = await FileSystem.getInfoAsync(cacheUri);
                    if (cacheFileInfo.exists) {
                      console.log(`🗑️ Android - Removing existing cache file`);
                      await FileSystem.deleteAsync(cacheUri, { idempotent: true });
                    }

                    // Copy file to cache
                    await FileSystem.copyAsync({
                      from: asset.uri,
                      to: cacheUri,
                    });

                    // Verify the copied file exists and has content
                    const verifyInfo = await FileSystem.getInfoAsync(cacheUri, { size: true });
                    if (verifyInfo.exists) {
                      const copiedSize = verifyInfo.size || 0;
                      console.log(`✅ Android - File copied successfully`);
                      console.log(`✅ Copied file size: ${copiedSize} bytes (${(copiedSize / (1024 * 1024)).toFixed(2)}MB)`);

                      // Update file size if we got it from verification
                      if (copiedSize > 0 && (!fileSize || fileSize === 0)) {
                        fileSize = copiedSize;
                        console.log(`📊 Android - Updated file size from copied file: ${fileSize} bytes`);
                      }

                      processableUri = cacheUri;
                      copySuccess = true;

                      // Track cached file for cleanup later
                      setCachedFileUris(prev => [...prev, cacheUri]);
                    } else {
                      throw new Error('Copied file does not exist after copy operation');
                    }
                  } catch (copyError) {
                    console.error(`❌ Android - Copy attempt ${copyAttempts} failed:`, copyError.message);
                    if (copyAttempts >= maxCopyAttempts) {
                      throw copyError; // Re-throw on final attempt
                    }
                    // Wait briefly before retry
                    await new Promise(resolve => setTimeout(resolve, 100));
                  }
                }

                if (!copySuccess) {
                  throw new Error('Failed to copy file after multiple attempts');
                }

                console.log(`✅ Android - File successfully prepared: ${processableUri}`);
                console.log(`✅ Final file size: ${fileSize} bytes`);
              } catch (androidError) {
                console.error(`❌ Android file preparation failed for asset ${i}:`, {
                  error: androidError.message,
                  stack: androidError.stack,
                  uri: asset.uri.substring(0, 80),
                  fileName: asset.fileName || asset.name,
                  type: asset.type
                });

                Alert.alert(
                  "File Access Error",
                  `Unable to process the selected ${asset.type || 'file'}. This may be due to:\n\n` +
                  `• File permissions\n` +
                  `• Corrupted file\n` +
                  `• Storage access restrictions\n\n` +
                  `Please try:\n` +
                  `• Selecting a different file\n` +
                  `• Checking app permissions in Settings\n` +
                  `• Restarting the app`
                );
                continue; // Skip this file and continue with others
              }
            }

            // Update asset with processable URI and file size
            const processableAsset = {
              ...asset,
              uri: processableUri,
              fileSize: fileSize,
              size: fileSize,
            };

            console.log(`📷 Processable asset ${i}:`, {
              uri: processableAsset.uri.substring(0, 60),
              fileSize: processableAsset.fileSize,
              type: processableAsset.type,
              platform: Platform.OS,
            });

            // Enhanced filename capture with multiple strategies
            let originalUserFilename = null;
            let filenameSource = "unknown";

            console.log(`📁 🔍 Asset ${i} analysis:`, {
              fileName: processableAsset.fileName,
              filename: processableAsset.filename,
              name: processableAsset.name,
              uri: processableAsset.uri.substring(0, 60),
              type: processableAsset.type,
              hasExif: !!processableAsset.exif,
              exifKeys: processableAsset.exif ? Object.keys(processableAsset.exif) : [],
            });

            // Strategy 1: Direct filename properties
            if (
              processableAsset.fileName &&
              processableAsset.fileName.trim() &&
              processableAsset.fileName !== "undefined" &&
              processableAsset.fileName !== "null"
            ) {
              originalUserFilename = processableAsset.fileName.trim();
              filenameSource = "asset.fileName";
              console.log(`📁 ✅ Using asset.fileName: ${originalUserFilename}`);
            } else if (
              processableAsset.name &&
              processableAsset.name.trim() &&
              processableAsset.name !== "undefined" &&
              processableAsset.name !== "null"
            ) {
              originalUserFilename = processableAsset.name.trim();
              filenameSource = "asset.name";
              console.log(`📁 ✅ Using asset.name: ${originalUserFilename}`);
            }

            // Strategy 2: EXIF metadata extraction
            if (!originalUserFilename && processableAsset.exif) {
              // Try to extract filename from EXIF data
              const exifFilename =
                processableAsset.exif.FileName ||
                processableAsset.exif.ImageDescription ||
                processableAsset.exif.Software;
              if (
                exifFilename &&
                typeof exifFilename === "string" &&
                exifFilename.trim()
              ) {
                originalUserFilename = exifFilename.trim();
                filenameSource = "EXIF_data";
                console.log(`📁 ✅ Using EXIF filename: ${originalUserFilename}`);
              }
            }

            // Strategy 3: Enhanced URI parsing
            if (!originalUserFilename) {
              const uriParts = processableAsset.uri?.split("/");
              const uriFilename = uriParts?.pop();

              if (uriFilename && uriFilename.length > 0) {
                // Check if URI contains meaningful filename
                const meaningfulPatterns = [
                  /^IMG_\d+\.(jpg|jpeg|png|gif)$/i, // IMG_1234.jpg
                  /^VID_\d+\.(mp4|mov|avi)$/i, // VID_1234.mp4
                  /^photo_\d+\.(jpg|jpeg|png)$/i, // photo_1234.jpg
                  /^video_\d+\.(mp4|mov)$/i, // video_1234.mp4
                  /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|mp4|mov|avi)$/i, // general pattern
                ];

                const isMeaningful =
                  meaningfulPatterns.some((pattern) =>
                    pattern.test(uriFilename)
                  ) &&
                  !uriFilename.includes("ImagePicker") &&
                  !uriFilename.includes("temp-") &&
                  !uriFilename.includes("cache") &&
                  uriFilename.length < 50; // Avoid very long system-generated names

                if (isMeaningful) {
                  originalUserFilename = uriFilename;
                  filenameSource = "meaningful_URI";
                  console.log(
                    `📁 ✅ Using meaningful URI filename: ${originalUserFilename}`
                  );
                }
              }
            }

            // Strategy 4: Smart fallback with readable timestamps
            if (!originalUserFilename) {
              const now = new Date();
              const year = now.getFullYear();
              const month = String(now.getMonth() + 1).padStart(2, "0");
              const day = String(now.getDate()).padStart(2, "0");
              const hour = String(now.getHours()).padStart(2, "0");
              const minute = String(now.getMinutes()).padStart(2, "0");
              const second = String(now.getSeconds()).padStart(2, "0");

              const extension = processableAsset.type === "video" ? "mp4" : "jpg";
              const mediaPrefix = processableAsset.type === "video" ? "Video" : "Photo";

              originalUserFilename = `${mediaPrefix}_${year}_${month}_${day}_${hour}_${minute}_${second}.${extension}`;
              filenameSource = "smart_timestamp";
              console.log(
                `📁 ✅ Generated smart filename: ${originalUserFilename}`
              );
            }

            console.log(`📁 🎯 Final filename selection for asset ${i}:`, {
              selectedFilename: originalUserFilename,
              source: filenameSource,
              isUserFriendly:
                !originalUserFilename.includes("file_") &&
                !originalUserFilename.includes("temp-"),
            });

            const processResult = await processMediaForUpload(
              {
                id: Date.now() + Math.random() + i,
                type: processableAsset.type || "image",
                uri: processableAsset.uri,
                name: originalUserFilename, // Use enhanced filename capture
                fileName: originalUserFilename, // Also set fileName for compatibility
                original_user_filename: originalUserFilename, // Explicit user intent field
                filenameSource: filenameSource, // Add filename source for debugging
                size: processableAsset.fileSize || processableAsset.size || 0,
                mimeType:
                  processableAsset.mimeType ||
                  (processableAsset.type === "video" ? "video/mp4" : "image/jpeg"),
              },
              i
            );

            if (processResult.success) {
              processedMedia.push(processResult.data);
              console.log(
                `📷 ✅ Asset ${i} processed:`,
                processResult.data.wasCompressed ? "compressed" : "original"
              );
            } else {
              // Show alert for validation errors (like video size limit)
              Alert.alert("Upload Error", processResult.error);
              console.warn(
                `❌ Asset ${i} validation failed:`,
                processResult.error
              );
              // Don't add this asset to the processed media
            }
          } catch (error) {
            console.error(`❌ Failed to process asset ${i}:`, error);
            // Enhanced fallback with better filename preservation
            let fallbackFilename = null;

            // Try to get meaningful filename even in error case
            if (processableAsset.fileName && processableAsset.fileName.trim()) {
              fallbackFilename = processableAsset.fileName.trim();
            } else if (processableAsset.name && processableAsset.name.trim()) {
              fallbackFilename = processableAsset.name.trim();
            } else {
              // Create smart readable fallback
              const now = new Date();
              const year = now.getFullYear();
              const month = String(now.getMonth() + 1).padStart(2, "0");
              const day = String(now.getDate()).padStart(2, "0");
              const hour = String(now.getHours()).padStart(2, "0");
              const minute = String(now.getMinutes()).padStart(2, "0");
              const second = String(now.getSeconds()).padStart(2, "0");

              const extension = processableAsset.type === "video" ? "mp4" : "jpg";
              const mediaPrefix = processableAsset.type === "video" ? "Video" : "Photo";

              fallbackFilename = `${mediaPrefix}_${year}_${month}_${day}_${hour}_${minute}_${second}.${extension}`;
            }

            console.log(`📁 Error fallback filename: ${fallbackFilename}`);

            processedMedia.push({
              id: Date.now() + Math.random() + i,
              type: processableAsset.type || "image",
              uri: processableAsset.uri,
              name: fallbackFilename,
              fileName: fallbackFilename, // Compatibility
              original_user_filename: fallbackFilename, // Explicit user intent
              filenameSource: "error_fallback", // Add filename source for debugging
              size: processableAsset.fileSize || processableAsset.size || 0,
              mimeType:
                processableAsset.mimeType ||
                (processableAsset.type === "video" ? "video/mp4" : "image/jpeg"),
            });
          }
        }

        console.log("📷 All assets processed:", processedMedia.length);
        setSelectedMedia((prev) => [...prev, ...processedMedia]);
      }
    } catch (error) {
      console.error("❌ Error in pickImage:", error);
      Alert.alert(
        "Error",
        "Failed to select media. Please try again or check app permissions."
      );
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled) {
        console.log("📄 Processing selected documents...");

        const processedMedia = [];
        for (let i = 0; i < result.assets.length; i++) {
          const asset = result.assets[i];
          console.log(`📄 Processing document ${i}:`, asset);

          try {
            // Document filename is usually well-preserved by DocumentPicker
            const documentFilename =
              asset.name && asset.name.trim()
                ? asset.name.trim()
                : `document_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, "")}.pdf`;

            console.log(`📄 Document filename: ${documentFilename}`);

            const processResult = await processMediaForUpload(
              {
                id: Date.now() + Math.random() + i,
                type: "document",
                uri: asset.uri,
                name: documentFilename,
                fileName: documentFilename, // Compatibility
                original_user_filename: documentFilename, // Explicit user intent
                filenameSource: "document_picker", // Add filename source for debugging
                size: asset.size || 0,
                mimeType: asset.mimeType || "application/octet-stream",
              },
              i
            );

            if (processResult.success) {
              processedMedia.push(processResult.data);
              console.log(`📄 ✅ Document ${i} processed`);
            } else {
              // Show alert for validation errors
              Alert.alert("Upload Error", processResult.error);
              console.warn(
                `❌ Document ${i} validation failed:`,
                processResult.error
              );
            }
          } catch (error) {
            console.error(`❌ Failed to process document ${i}:`, error);
            // Enhanced document fallback
            const documentFallbackName =
              asset.name && asset.name.trim()
                ? asset.name.trim()
                : `document_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, "")}.pdf`;

            console.log(`📄 Document error fallback: ${documentFallbackName}`);

            processedMedia.push({
              id: Date.now() + Math.random() + i,
              type: "document",
              uri: asset.uri,
              name: documentFallbackName,
              fileName: documentFallbackName, // Compatibility
              original_user_filename: documentFallbackName, // Explicit user intent
              filenameSource: "document_error_fallback", // Add filename source for debugging
              size: asset.size || 0,
              mimeType: asset.mimeType || "application/octet-stream",
            });
          }
        }

        console.log("📄 All documents processed:", processedMedia.length);
        setSelectedMedia((prev) => [...prev, ...processedMedia]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const removeMedia = (mediaId) => {
    setSelectedMedia((prev) => prev.filter((item) => item.id !== mediaId));
  };

  const handleSubmitPost = async () => {
    // Set submitting immediately to disable button on first click
    setIsSubmitting(true);
    setUploadStep("validating");

    // Validate required fields
    if (!postTitle.trim()) {
      setIsSubmitting(false);
      setUploadStep("");
      Alert.alert("Warning!", "Please enter a title for your class post");
      return;
    }

    if (!selectedCategory) {
      setIsSubmitting(false);
      setUploadStep("");
      Alert.alert("Warning!", "Please select a category for your post");
      return;
    }

    if (!selectedGrade) {
      setIsSubmitting(false);
      setUploadStep("");
      Alert.alert("Warning!", "Please select a grade for your class post");
      return;
    }

    try {

      console.log("🚀 Starting class post creation with two-step process");

      let uploadedMedia = [];

      // Step 1: Upload media files if any exist
      if (selectedMedia && selectedMedia.length > 0) {
        const validation = validateMediaFiles(selectedMedia);
        if (!validation.isValid) {
          setIsSubmitting(false);
          setUploadStep("");
          setUploadProgress({ current: 0, total: 0 });
          Alert.alert("Media Validation Failed", validation.error);
          return;
        }
        console.log(
          "📁 Media validation passed for",
          selectedMedia.length,
          "files"
        );

        setUploadStep("uploading");
        setUploadProgress({ current: 0, total: selectedMedia.length });

        // Create FormData with post_type field for class posts
        const formData = createMediaUploadFormData(
          selectedMedia,
          "class-posts"
        );
        console.log("📎 Uploading media files with FormData for class-posts");

        try {
          const uploadResponse = await uploadMedia(formData).unwrap();
          console.log("📎 ✅ Media upload successful:", uploadResponse);

          // Update progress to show all files uploaded
          setUploadProgress({ current: selectedMedia.length, total: selectedMedia.length });

          if (uploadResponse.success && uploadResponse.data) {
            uploadedMedia = uploadResponse.data;
            console.log("📎 Uploaded media URLs:", uploadedMedia);

            // ===== CRITICAL UPLOAD COMPLETION VALIDATION =====
            console.log("📎 🔍 ===== UPLOAD COMPLETION VALIDATION =====");
            console.log(`📎 📊 File Count Tracking:`);
            console.log(`  - Selected by user: ${selectedMedia.length} files`);
            console.log(
              `  - Returned by backend: ${uploadedMedia.length} files`,
            );

            // Validate all files uploaded successfully
            const uploadComplete = uploadedMedia.length === selectedMedia.length;
            const allHaveUrls = uploadedMedia.every(m => m.url && m.url.trim() !== '');

            console.log(
              `  - Count match: ${uploadComplete ? "✅ SUCCESS" : "❌ MISMATCH"}`,
            );
            console.log(
              `  - All have URLs: ${allHaveUrls ? "✅ SUCCESS" : "❌ INCOMPLETE"}`,
            );

            if (!uploadComplete) {
              console.error(
                "📎 ❌ CRITICAL ISSUE: File count mismatch detected!",
              );
              console.error(
                `📎 Expected: ${selectedMedia.length}, Got: ${uploadedMedia.length}`,
              );

              setIsSubmitting(false);
              setUploadStep("");
              setUploadProgress({ current: 0, total: 0 });

              Alert.alert(
                "Upload Incomplete",
                `Only ${uploadedMedia.length} of ${selectedMedia.length} files were uploaded. Please try again.`,
                [{ text: "OK", style: "default" }],
              );
              return;
            }

            if (!allHaveUrls) {
              console.error("📎 ❌ CRITICAL ISSUE: Some files missing URLs!");

              setIsSubmitting(false);
              setUploadStep("");
              setUploadProgress({ current: 0, total: 0 });

              Alert.alert(
                "Upload Incomplete",
                "Some files failed to upload completely. Please try again.",
                [{ text: "OK", style: "default" }],
              );
              return;
            }

            console.log(
              "📎 🎉 SUCCESS: All selected files were uploaded successfully with valid URLs!",
            );

            // ===== COMPREHENSIVE UPLOAD RESPONSE DEBUG =====
            console.log("📎 ===== UPLOAD RESPONSE DEBUG ANALYSIS =====");
            console.log(
              "📎 Full upload result object:",
              JSON.stringify(uploadResponse, null, 2)
            );
            console.log("📎 Upload result type:", typeof uploadResponse);
            console.log(
              "📎 Upload result keys:",
              Object.keys(uploadResponse || {})
            );
            console.log(
              "📎 Upload result.data type:",
              typeof uploadResponse?.data
            );
            console.log(
              "📎 Upload result.data isArray:",
              Array.isArray(uploadResponse?.data)
            );
            console.log(
              "📎 Upload result.data length:",
              uploadResponse?.data?.length || "N/A"
            );
            console.log("📎 Upload result.success:", uploadResponse?.success);
            console.log("📎 Upload result.message:", uploadResponse?.message);

            console.log("📎 uploadedMedia type:", typeof uploadedMedia);
            console.log(
              "📎 uploadedMedia isArray:",
              Array.isArray(uploadedMedia)
            );
            console.log(
              "📎 uploadedMedia length:",
              uploadedMedia?.length || "N/A"
            );
            console.log(
              "📎 Raw uploadedMedia:",
              JSON.stringify(uploadedMedia, null, 2)
            );

            if (Array.isArray(uploadedMedia) && uploadedMedia.length > 0) {
              console.log("📎 ===== INDIVIDUAL MEDIA ITEM ANALYSIS =====");
              uploadedMedia.forEach((media, index) => {
                console.log(`📎 Media item ${index}:`, {
                  fullObject: JSON.stringify(media, null, 2),
                  type: typeof media,
                  keys: Object.keys(media || {}),
                  hasUrl: !!media?.url,
                  urlValue: media?.url,
                  urlType: typeof media?.url,
                  urlTrimmed: media?.url?.trim?.(),
                  urlLength: media?.url?.length || 0,
                  hasFilename: !!media?.filename,
                  filenameValue: media?.filename,
                  hasName: !!media?.name,
                  nameValue: media?.name,
                  hasType: !!media?.type,
                  typeValue: media?.type,
                  allUrlFields: {
                    url: media?.url,
                    path: media?.path,
                    file_url: media?.file_url,
                    file_path: media?.file_path,
                    storage_path: media?.storage_path,
                    full_path: media?.full_path,
                    public_path: media?.public_path,
                    temp_path: media?.temp_path,
                  },
                });
              });
            }

            // Additional validation of upload response
            if (!Array.isArray(uploadedMedia) || uploadedMedia.length === 0) {
              console.error(
                "❌ VALIDATION FAILED: Upload response validation failed"
              );
              console.error(
                "  - uploadedMedia is array:",
                Array.isArray(uploadedMedia)
              );
              console.error(
                "  - uploadedMedia length:",
                uploadedMedia?.length || 0
              );
              console.error(
                "  - Full result:",
                JSON.stringify(uploadResponse, null, 2)
              );
              throw new Error("Upload response contains no media data");
            }

            // Check if all uploaded media has URLs
            console.log("📎 ===== URL VALIDATION CHECK =====");
            const missingUrls = uploadedMedia.filter(
              (media) => !media.url || media.url.trim() === ""
            );
            console.log("📎 Missing URLs check:", {
              totalItems: uploadedMedia.length,
              missingUrlsCount: missingUrls.length,
              missingUrlsItems: missingUrls.map((media, idx) => ({
                index: idx,
                hasUrl: !!media.url,
                urlValue: media.url,
                urlTrimmed: media.url?.trim?.(),
                possibleAlternativeUrls: {
                  path: media.path,
                  file_url: media.file_url,
                  file_path: media.file_path,
                  storage_path: media.storage_path,
                  full_path: media.full_path,
                  public_path: media.public_path,
                  temp_path: media.temp_path,
                },
              })),
            });

            if (missingUrls.length > 0) {
              console.error("❌ URL VALIDATION FAILED:");
              console.error("  - Missing URLs count:", missingUrls.length);
              console.error(
                "  - Items with missing URLs:",
                JSON.stringify(missingUrls, null, 2)
              );
              console.error(
                "  - This suggests the transformResponse in upload API may not be working correctly"
              );
              throw new Error(
                `${missingUrls.length} uploaded file(s) are missing URLs`
              );
            }

            console.log(
              "📎 ✅ URL validation passed - all media items have URLs"
            );

            // Debug: Log each uploaded media item's filename for consistency tracking
            uploadedMedia.forEach((media, index) => {
              console.log(
                `📎 🔍 Class Post - Upload API returned media ${index}:`,
                {
                  filename: media.filename,
                  url: media.url,
                  type: media.type,
                  size: media.size,
                  hasBackendFilename: media.filename?.includes("temp-")
                    ? "✅ YES"
                    : "❌ NO",
                  filenameSource: media.filename?.includes("temp-")
                    ? "Backend Generated"
                    : "Fallback/User",
                  consistencyNote:
                    "This filename will be preserved exactly in post creation",
                }
              );

              // Warn if no backend filename found
              if (!media.filename?.includes("temp-")) {
                console.warn(
                  `⚠️ Media ${index}: No backend temp filename found. URL consistency may be affected.`
                );
              }
            });
          } else {
            throw new Error("Media upload failed - no data received");
          }
        } catch (uploadError) {
          console.error("❌ Media upload failed:", uploadError);
          Alert.alert(
            "Upload Failed",
            "Failed to upload media files. Please try again."
          );
          return;
        }
      }

      setUploadStep("posting");

      // Step 2: Prepare post data
      const postData = {
        title: postTitle,
        category: selectedCategory,
        content: postContent,
        grade: selectedGrade,
        class_id: selectedGrade, // Use selectedGrade as class_id
        author_id:
          sessionData?.user_id || sessionData?.data?.user_id || user?.id,
        hashtags: convertTagsToHashtags(selectedTags, availableTags),
      };

      // Create JSON payload with uploaded media URLs (two-step)
      console.log(
        "📎 🔍 PRE-CREATION DEBUG - uploadedMedia structure:",
        JSON.stringify(uploadedMedia, null, 2)
      );
      console.log("📎 🔍 PRE-CREATION DEBUG - uploadedMedia analysis:");
      if (uploadedMedia && uploadedMedia.length > 0) {
        uploadedMedia.forEach((media, index) => {
          console.log(`📎 uploadedMedia[${index}]:`, {
            hasUrl: !!media.url,
            hasUri: !!media.uri,
            hasFilename: !!media.filename,
            hasName: !!media.name,
            filename: media.filename,
            url: media.url,
            type: media.type,
            expectedDetection:
              media.url && !media.uri ? "UPLOADED MEDIA" : "RAW MEDIA",
          });
        });
      }

      const jsonPayload = createPostData(postData, uploadedMedia);

      console.log(
        "📤 Submitting post with JSON payload (two-step):",
        jsonPayload
      );

      // Debug: Verify user filename preservation between upload and post creation
      console.log("📎 🎯 User Filename Preservation Verification:");
      if (jsonPayload.media && jsonPayload.media.length > 0) {
        jsonPayload.media.forEach((postMedia, index) => {
          const uploadMedia = uploadedMedia[index];
          const backendFilename = uploadMedia?.filename; // Backend temp filename
          const userFilename = postMedia.filename; // User-selected filename
          const isUserIntentPreserved = !userFilename.includes("temp-");

          console.log(`📎 🎯 Media ${index} user intent verification:`, {
            backendTempFilename: backendFilename,
            userSelectedFilename: userFilename,
            userIntentPreserved: isUserIntentPreserved ? "✅ YES" : "❌ NO",
            backendUrl: uploadMedia?.url,
            userIntentUrl: postMedia.url,
            filenameSource: uploadMedia?.original_user_filename
              ? "extracted from temp"
              : "direct user selection or fallback",
            note: isUserIntentPreserved
              ? "✅ User-selected filename preserved! URLs will use user's intended name."
              : "⚠️ Using temp filename - user intent not preserved",
          });

          if (isUserIntentPreserved) {
            console.log(
              `✅ SUCCESS: Media ${index} preserves user intent with filename: ${userFilename}`
            );
          } else {
            console.warn(
              `⚠️ Media ${index}: Could not preserve user intent, using: ${userFilename}`
            );
          }
        });
      }

      // Create the post (JSON request)
      const response = await createClassPost(jsonPayload).unwrap();
      console.log("✅ Class post created successfully:", response);

      // Clean up cached files after successful upload
      await cleanupCachedFiles();

      const selectedGradeLabel =
        gradeOptions.find((g) => g.value === selectedGrade)?.label ||
        "the selected grade";
      Alert.alert(
        "Success!",
        `Class post created successfully for ${selectedGradeLabel}!`
      );

      // Reset and close
      resetForm();
      onClose();

      // Notify parent to refresh
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error("❌ Class post creation failed:", error);

      // Clean up cached files on error too
      await cleanupCachedFiles();

      let errorMessage = "Failed to create class post. Please try again.";
      if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
      setUploadStep("");
    }
  };

  const renderGradeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select Grade</Text>
      <View style={styles.gradeDropdownContainer}>
        <Dropdown
          style={styles.gradeDropdown}
          placeholderStyle={styles.gradeDropdownPlaceholder}
          selectedTextStyle={styles.gradeDropdownSelectedText}
          inputSearchStyle={styles.gradeDropdownSearchInput}
          iconStyle={styles.gradeDropdownIcon}
          data={gradeOptions}
          search
          maxHeight={300}
          labelField="label"
          valueField="value"
          placeholder="Choose a grade..."
          searchPlaceholder="Search grades..."
          value={selectedGrade}
          onFocus={() => console.log("Grade dropdown focused")}
          onBlur={() => console.log("Grade dropdown blurred")}
          onChange={(item) => {
            setSelectedGrade(item.value);
            console.log("Selected grade:", item);
          }}
          renderRightIcon={() => (
            <Icon
              style={styles.gradeDropdownIcon}
              color={theme.colors.primary}
              name="arrow-drop-down"
              size={20}
            />
          )}
        />
        {selectedGrade && (
          <View style={styles.selectedGradeIndicator}>
            <Icon name="check-circle" size={16} color={theme.colors.primary} />
            <Text style={styles.selectedGradeText}>
              Selected:{" "}
              {gradeOptions.find((g) => g.value === selectedGrade)?.label}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderClassInfo = () => (
    <View style={styles.classInfo}>
      <Icon name="class" size={16} color={theme.colors.primary} />
      <Text style={styles.classInfoText}>
        Posting to:{" "}
        {selectedGrade
          ? gradeOptions.find((g) => g.value === selectedGrade)?.label ||
            `Grade ${selectedGrade}`
          : "Select Grade First"}
      </Text>
    </View>
  );

  const renderCategorySelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && {
                backgroundColor: category.color,
              },
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Icon
              name={category.icon}
              size={16}
              color={
                selectedCategory === category.id ? "white" : category.color
              }
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.selectedCategoryText,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTitleInput = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Title</Text>
      <TextInput
        style={styles.titleInput}
        placeholder="Enter post title..."
        value={postTitle}
        onChangeText={setPostTitle}
      />
    </View>
  );

  const renderContentInput = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Content</Text>
      <TextInput
        style={styles.contentInput}
        multiline
        numberOfLines={6}
        placeholder="Share class updates, assignments, activities..."
        value={postContent}
        onChangeText={setPostContent}
        textAlignVertical="top"
      />
    </View>
  );

  const renderMediaSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Media & Documents</Text>

      <View style={styles.mediaActions}>
        <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
          <Icon name="photo-library" size={20} color={theme.colors.primary} />
          <Text style={styles.mediaButtonText}>Add Photos/Videos</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity style={styles.mediaButton} onPress={pickDocument}>
          <Icon name="attach-file" size={20} color={theme.colors.primary} />
          <Text style={styles.mediaButtonText}>Add Documents</Text>
        </TouchableOpacity> */}
      </View>
      <Text style={styles.sectionTitlespan}>(max 10 images/max 5mb video)</Text>
      {selectedMedia.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mediaPreview}
        >
          {selectedMedia.map((media) => (
            <View key={media.id} style={styles.mediaItem}>
              {media.type === "image" ? (
                <Image source={{ uri: media.uri }} style={styles.mediaImage} />
              ) : media.type === "video" ? (
                <View style={styles.videoPlaceholder}>
                  <Icon name="play-circle-filled" size={32} color="white" />
                </View>
              ) : (
                <View style={styles.documentPlaceholder}>
                  <Icon
                    name="description"
                    size={32}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.documentName} numberOfLines={2}>
                    {media.name}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={() => removeMedia(media.id)}
              >
                <Icon name="close" size={16} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderTagsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Hashtags</Text>
      <View style={styles.tagsContainer}>
        {availableTags.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            style={[
              styles.tagChip,
              selectedTags.includes(tag.id) && {
                backgroundColor: tag.color,
              },
            ]}
            onPress={() => toggleTag(tag.id)}
          >
            <Text
              style={[
                styles.tagText,
                selectedTags.includes(tag.id) && styles.selectedTagText,
              ]}
            >
              {tag.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.title}>Create Class Post</Text>
              <Text style={styles.subtitle}>
                Share with class students and parents
              </Text>
            </View>
            <View style={styles.placeholder} />
          </View>
          {renderClassInfo()}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderGradeSelector()}
          {renderCategorySelector()}
          {renderTitleInput()}
          {renderContentInput()}
          {renderMediaSection()}
          {renderTagsSection()}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitPost}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.submitButtonText}>
                  {getProgressMessage()}
                </Text>
              </>
            ) : (
              <>
                <Icon name="send" size={20} color="white" />
                <Text style={styles.submitButtonText}>Create Post</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  closeButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  classInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(146, 7, 52, 0.1)", // Maroon background with transparency
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  classInfoText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
    marginLeft: 6,
  },
  // Grade selector styles
  gradeDropdownContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
  },
  gradeDropdown: {
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  gradeDropdownPlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  gradeDropdownSelectedText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  gradeDropdownSearchInput: {
    fontSize: 16,
    color: theme.colors.text,
    borderBottomColor: theme.colors.primary,
  },
  gradeDropdownIcon: {
    width: 20,
    height: 20,
  },
  selectedGradeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    padding: 8,
    backgroundColor: "#80000042",
    borderRadius: 8,
  },
  selectedGradeText: {
    fontSize: 14,
    color: "maroon",
    fontWeight: "600",
    marginLeft: 6,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  sectionTitlespan: {
    fontSize: 10,
    fontWeight: "600",
    color: "gray",
    marginBottom: -10,
  },
  categoryScroll: {
    flexDirection: "row",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 6,
  },
  selectedCategoryText: {
    color: "white",
    fontWeight: "600",
  },
  titleInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  contentInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 120,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  mediaActions: {
    flexDirection: "row",
    marginBottom: 16,
  },
  mediaButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  mediaButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginLeft: 8,
  },
  mediaPreview: {
    flexDirection: "row",
  },
  mediaItem: {
    position: "relative",
    marginRight: 12,
  },
  mediaImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  videoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  documentPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  documentName: {
    fontSize: 10,
    color: theme.colors.text,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 4,
  },
  removeMediaButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#F44336",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  tagText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  selectedTagText: {
    color: "white",
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginLeft: 8,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: "rgba(146, 7, 52, 0.5)", // Maroon with transparency when disabled
    borderColor: "rgba(146, 7, 52, 0.5)",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default ClassPostDrawer;
