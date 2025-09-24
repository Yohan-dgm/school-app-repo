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
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import Icon from "react-native-vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { theme } from "../../styles/theme";
import {
  useCreateSchoolPostMutation,
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

const SchoolPostDrawer = ({ visible, onClose, onPostCreated }) => {
  const dispatch = useDispatch();
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("announcement");
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState("");

  // API hooks
  const [createSchoolPost] = useCreateSchoolPostMutation();
  const [uploadMedia] = useUploadMediaMutation();

  // Get global state
  const { sessionData, user } = useSelector((state) => state.app);

  // Available categories for school posts (aligned with backend type enum)
  const categories = [
    {
      id: "announcement",
      label: "Announcement",
      color: theme.colors.primary, // Deep maroon
      icon: "campaign",
    },
    {
      id: "event",
      label: "Event",
      color: theme.colors.burgundy,
      icon: "event",
    },
    { id: "news", label: "News", color: theme.colors.crimson, icon: "article" },
    {
      id: "achievement",
      label: "Achievement",
      color: theme.colors.rose,
      icon: "emoji-events",
    },
  ];

  // Available hashtags
  const availableTags = [
    { id: "school", label: "#School", color: theme.colors.primary },
    { id: "community", label: "#Community", color: theme.colors.wine },
    { id: "achievement", label: "#Achievement", color: theme.colors.rose },
    {
      id: "announcement",
      label: "#Announcement",
      color: theme.colors.burgundy,
    },
    { id: "event", label: "#Event", color: theme.colors.maroonLight },
    { id: "news", label: "#News", color: theme.colors.crimson },
    { id: "important", label: "#Important", color: theme.colors.maroonDark },
    { id: "upcoming", label: "#Upcoming", color: theme.colors.darkGray },
  ];

  const resetForm = () => {
    setPostTitle("");
    setPostContent("");
    setSelectedCategory("announcement");
    setSelectedMedia([]);
    setSelectedTags([]);
    setUploadStep("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Get progress message
  const getProgressMessage = () => {
    switch (uploadStep) {
      case "validating":
        return "Validating post data...";
      case "uploading":
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
        : [...prev, tagId],
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant camera roll permissions to add images.",
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

      // Process each asset with compression if needed
      const processedMedia = [];
      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        console.log(`📷 Processing asset ${i}:`, asset);

        try {
          // Enhanced filename capture with multiple strategies
          let originalUserFilename = null;
          let filenameSource = "unknown";

          console.log(`📁 🔍 Asset ${i} analysis:`, {
            fileName: asset.fileName,
            filename: asset.filename,
            name: asset.name,
            uri: asset.uri,
            type: asset.type,
            hasExif: !!asset.exif,
            exifKeys: asset.exif ? Object.keys(asset.exif) : [],
          });

          // Strategy 1: Direct filename properties
          if (
            asset.fileName &&
            asset.fileName.trim() &&
            asset.fileName !== "undefined" &&
            asset.fileName !== "null"
          ) {
            originalUserFilename = asset.fileName.trim();
            filenameSource = "asset.fileName";
            console.log(`📁 ✅ Using asset.fileName: ${originalUserFilename}`);
          } else if (
            asset.filename &&
            asset.filename.trim() &&
            asset.filename !== "undefined" &&
            asset.filename !== "null"
          ) {
            originalUserFilename = asset.filename.trim();
            filenameSource = "asset.filename";
            console.log(`📁 ✅ Using asset.filename: ${originalUserFilename}`);
          } else if (
            asset.name &&
            asset.name.trim() &&
            asset.name !== "undefined" &&
            asset.name !== "null"
          ) {
            originalUserFilename = asset.name.trim();
            filenameSource = "asset.name";
            console.log(`📁 ✅ Using asset.name: ${originalUserFilename}`);
          }

          // Strategy 2: EXIF metadata extraction
          if (!originalUserFilename && asset.exif) {
            // Try to extract filename from EXIF data
            const exifFilename =
              asset.exif.FileName ||
              asset.exif.ImageDescription ||
              asset.exif.Software;
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
            const uriParts = asset.uri?.split("/");
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
                  pattern.test(uriFilename),
                ) &&
                !uriFilename.includes("ImagePicker") &&
                !uriFilename.includes("temp-") &&
                !uriFilename.includes("cache") &&
                uriFilename.length < 50; // Avoid very long system-generated names

              if (isMeaningful) {
                originalUserFilename = uriFilename;
                filenameSource = "meaningful_URI";
                console.log(
                  `📁 ✅ Using meaningful URI filename: ${originalUserFilename}`,
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

            const extension = asset.type === "video" ? "mp4" : "jpg";
            const mediaPrefix = asset.type === "video" ? "Video" : "Photo";

            originalUserFilename = `${mediaPrefix}_${year}_${month}_${day}_${hour}_${minute}_${second}.${extension}`;
            filenameSource = "smart_timestamp";
            console.log(
              `📁 ✅ Generated smart filename: ${originalUserFilename}`,
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
              type: asset.type || "image",
              uri: asset.uri,
              name: originalUserFilename, // Use enhanced filename capture
              fileName: originalUserFilename, // Also set fileName for compatibility
              original_user_filename: originalUserFilename, // Explicit user intent field
              filenameSource: filenameSource, // Add filename source for debugging
              size: asset.fileSize || asset.size || 0,
              mimeType:
                asset.mimeType ||
                (asset.type === "video" ? "video/mp4" : "image/jpeg"),
            },
            i,
          );

          if (processResult.success) {
            processedMedia.push(processResult.data);
            console.log(
              `📷 ✅ Asset ${i} processed:`,
              processResult.data.wasCompressed ? "compressed" : "original",
            );
          } else {
            // Show alert for validation errors (like video size limit)
            Alert.alert("Upload Error", processResult.error);
            console.warn(
              `❌ Asset ${i} validation failed:`,
              processResult.error,
            );
            // Don't add this asset to the processed media
          }
        } catch (error) {
          console.error(`❌ Failed to process asset ${i}:`, error);
          // Enhanced fallback with better filename preservation
          let fallbackFilename = null;

          // Try to get meaningful filename even in error case
          if (asset.fileName && asset.fileName.trim()) {
            fallbackFilename = asset.fileName.trim();
          } else if (asset.filename && asset.filename.trim()) {
            fallbackFilename = asset.filename.trim();
          } else if (asset.name && asset.name.trim()) {
            fallbackFilename = asset.name.trim();
          } else {
            // Create smart readable fallback
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const day = String(now.getDate()).padStart(2, "0");
            const hour = String(now.getHours()).padStart(2, "0");
            const minute = String(now.getMinutes()).padStart(2, "0");
            const second = String(now.getSeconds()).padStart(2, "0");

            const extension = asset.type === "video" ? "mp4" : "jpg";
            const mediaPrefix = asset.type === "video" ? "Video" : "Photo";

            fallbackFilename = `${mediaPrefix}_${year}_${month}_${day}_${hour}_${minute}_${second}.${extension}`;
          }

          console.log(`📁 Error fallback filename: ${fallbackFilename}`);

          processedMedia.push({
            id: Date.now() + Math.random() + i,
            type: asset.type || "image",
            uri: asset.uri,
            name: fallbackFilename,
            fileName: fallbackFilename, // Compatibility
            original_user_filename: fallbackFilename, // Explicit user intent
            filenameSource: "error_fallback", // Add filename source for debugging
            size: asset.fileSize || asset.size || 0,
            mimeType:
              asset.mimeType ||
              (asset.type === "video" ? "video/mp4" : "image/jpeg"),
          });
        }
      }

      console.log("📷 All assets processed:", processedMedia.length);
      setSelectedMedia((prev) => [...prev, ...processedMedia]);
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
              i,
            );

            if (processResult.success) {
              processedMedia.push(processResult.data);
              console.log(`📄 ✅ Document ${i} processed`);
            } else {
              // Show alert for validation errors
              Alert.alert("Upload Error", processResult.error);
              console.warn(
                `❌ Document ${i} validation failed:`,
                processResult.error,
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
    // Validate required fields
    if (!postTitle.trim()) {
      Alert.alert("Warning!", "Please enter a title for your school post");
      return;
    }

    if (!selectedCategory) {
      Alert.alert("Warning!", "Please select a category for your post");
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadStep("validating");

      console.log("🚀 Starting school post creation with two-step process");

      let uploadedMedia = [];

      // Step 1: Upload media files if any exist
      if (selectedMedia && selectedMedia.length > 0) {
        const validation = validateMediaFiles(selectedMedia);
        if (!validation.isValid) {
          Alert.alert("Media Validation Failed", validation.error);
          return;
        }
        console.log(
          "📁 Media validation passed for",
          selectedMedia.length,
          "files",
        );

        setUploadStep("uploading");

        // Create FormData with post_type field
        const formData = createMediaUploadFormData(
          selectedMedia,
          "school-posts",
        );
        console.log("📎 Uploading media files with FormData for school-posts");

        try {
          const uploadResponse = await uploadMedia(formData).unwrap();
          console.log("📎 ✅ Media upload successful:", uploadResponse);

          if (uploadResponse.success && uploadResponse.data) {
            uploadedMedia = uploadResponse.data;
            console.log("📎 Uploaded media URLs:", uploadedMedia);

            // ===== COMPREHENSIVE UPLOAD RESPONSE DEBUG =====
            console.log("📎 ===== UPLOAD RESPONSE DEBUG ANALYSIS =====");
            console.log(
              "📎 Full upload result object:",
              JSON.stringify(uploadResponse, null, 2),
            );
            console.log("📎 Upload result type:", typeof uploadResponse);
            console.log(
              "📎 Upload result keys:",
              Object.keys(uploadResponse || {}),
            );
            console.log(
              "📎 Upload result.data type:",
              typeof uploadResponse?.data,
            );
            console.log(
              "📎 Upload result.data isArray:",
              Array.isArray(uploadResponse?.data),
            );
            console.log(
              "📎 Upload result.data length:",
              uploadResponse?.data?.length || "N/A",
            );
            console.log("📎 Upload result.success:", uploadResponse?.success);
            console.log("📎 Upload result.message:", uploadResponse?.message);

            console.log("📎 uploadedMedia type:", typeof uploadedMedia);
            console.log(
              "📎 uploadedMedia isArray:",
              Array.isArray(uploadedMedia),
            );
            console.log(
              "📎 uploadedMedia length:",
              uploadedMedia?.length || "N/A",
            );
            console.log(
              "📎 Raw uploadedMedia:",
              JSON.stringify(uploadedMedia, null, 2),
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
                "❌ VALIDATION FAILED: Upload response validation failed",
              );
              console.error(
                "  - uploadedMedia is array:",
                Array.isArray(uploadedMedia),
              );
              console.error(
                "  - uploadedMedia length:",
                uploadedMedia?.length || 0,
              );
              console.error(
                "  - Full result:",
                JSON.stringify(uploadResponse, null, 2),
              );
              throw new Error("Upload response contains no media data");
            }

            // Check if all uploaded media has URLs
            console.log("📎 ===== URL VALIDATION CHECK =====");
            const missingUrls = uploadedMedia.filter(
              (media) => !media.url || media.url.trim() === "",
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
                JSON.stringify(missingUrls, null, 2),
              );
              console.error(
                "  - This suggests the transformResponse in upload API may not be working correctly",
              );
              throw new Error(
                `${missingUrls.length} uploaded file(s) are missing URLs`,
              );
            }

            console.log(
              "📎 ✅ URL validation passed - all media items have URLs",
            );

            // Debug: Log each uploaded media item's filename for consistency tracking
            uploadedMedia.forEach((media, index) => {
              console.log(
                `📎 🔍 School Post - Upload API returned media ${index}:`,
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
                },
              );

              // Warn if no backend filename found
              if (!media.filename?.includes("temp-")) {
                console.warn(
                  `⚠️ Media ${index}: No backend temp filename found. URL consistency may be affected.`,
                );
              }
            });
          } else {
            throw new Error("Media upload failed - no data received");
          }
        } catch (uploadError) {
          console.error("❌ Media upload failed:", uploadError);

          let errorMessage = "Failed to upload media files. Please try again.";

          // Provide more specific error messages based on the error type
          if (uploadError.message) {
            if (uploadError.message.includes("missing URLs")) {
              errorMessage =
                "Some files failed to upload completely. Please remove and re-add them.";
            } else if (uploadError.message.includes("no media data")) {
              errorMessage =
                "Upload server did not return file information. Please check your connection and try again.";
            } else if (uploadError.data?.message) {
              errorMessage = uploadError.data.message;
            } else {
              errorMessage = uploadError.message;
            }
          }

          Alert.alert("Upload Failed", errorMessage);
          return;
        }
      }

      setUploadStep("posting");

      // Step 2: Prepare post data
      const postData = {
        title: postTitle,
        category: selectedCategory,
        content: postContent,
        author_id:
          sessionData?.user_id || sessionData?.data?.user_id || user?.id,
        hashtags: convertTagsToHashtags(selectedTags, availableTags),
      };

      // Validate uploaded media has required URL fields
      if (uploadedMedia && uploadedMedia.length > 0) {
        console.log("📎 🔍 Validating uploaded media before post creation...");
        const invalidMedia = uploadedMedia.filter(
          (media) => !media.url || media.url.trim() === "",
        );

        if (invalidMedia.length > 0) {
          console.error(
            "❌ Invalid media detected - missing URL fields:",
            invalidMedia,
          );
          Alert.alert(
            "Upload Error",
            `${invalidMedia.length} media file(s) failed to upload properly. Please try removing and re-adding them.`,
          );
          return;
        }
        console.log("📎 ✅ All media files have valid URLs");
      }

      // Create JSON payload with uploaded media URLs (two-step)
      console.log(
        "📎 🔍 PRE-CREATION DEBUG - uploadedMedia structure:",
        JSON.stringify(uploadedMedia, null, 2),
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
        jsonPayload,
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
              `✅ SUCCESS: Media ${index} preserves user intent with filename: ${userFilename}`,
            );
          } else {
            console.warn(
              `⚠️ Media ${index}: Could not preserve user intent, using: ${userFilename}`,
            );
          }
        });
      }

      // Create the post (JSON request)
      const response = await createSchoolPost(jsonPayload).unwrap();
      console.log("✅ School post created successfully:", response);

      Alert.alert("Success!", "Your school post has been published");

      // Reset and close
      resetForm();
      onClose();

      // Notify parent to refresh
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error("❌ School post creation failed:", error);

      let errorMessage = "Failed to create school post. Please try again.";

      // Handle specific media URL error
      if (error.data?.message) {
        if (error.data.message.includes("media.0.url field is required")) {
          errorMessage =
            "Media files were not uploaded correctly. Please remove and re-add your media files, then try again.";
        } else if (
          error.data.message.includes("media") &&
          error.data.message.includes("url")
        ) {
          errorMessage =
            "Some media files are missing required information. Please re-upload your media files.";
        } else {
          errorMessage = error.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
      setUploadStep("");
    }
  };

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
        placeholder="Share school-wide updates, announcements, achievements..."
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
              <Text style={styles.title}>Create School Post</Text>
              <Text style={styles.subtitle}>
                Share with the entire school community
              </Text>
            </View>
            <View style={styles.placeholder} />
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
              <Text style={styles.submitButtonText}>
                {getProgressMessage()}
              </Text>
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
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  contentInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    backgroundColor: theme.colors.crimson,
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
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.textSecondary,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default SchoolPostDrawer;
