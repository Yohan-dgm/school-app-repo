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
import * as ImageManipulator from "expo-image-manipulator";
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
  generateIdempotencyKey,
} from "../../utils/postSubmissionUtils";
import { useActivityFeedChunkedUpload } from "../../hooks/useChunkedUpload";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const SchoolPostDrawer = ({ visible, onClose, onPostCreated }) => {
  const dispatch = useDispatch();
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("announcement");
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  // Generate idempotency key when drawer opens
  React.useEffect(() => {
    if (visible && !idempotencyKey) {
      const key = generateIdempotencyKey();
      console.log("🔑 Generated idempotency key for school post:", key);
      setIdempotencyKey(key);
    } else if (!visible) {
      setIdempotencyKey("");
    }
  }, [visible]);

  // API hooks
  const [createSchoolPost] = useCreateSchoolPostMutation();
  const { uploadFile, isUploading: isMediaUploading, progress: mediaProgress } = useActivityFeedChunkedUpload();

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
    setUploadProgress({ current: 0, total: 0 });
    setIsLoadingMedia(false);
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
        : [...prev, tagId],
    );
  };

  const pickImage = async () => {
    setIsLoadingMedia(true);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setIsLoadingMedia(false);
        Alert.alert(
          "Permission needed",
          "Please grant camera roll permissions to add media."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 1,
        allowsMultipleSelection: true,
      });

      if (!result.canceled) {
        const validMedia = [];
        let hasOversizedFiles = false;

        for (const asset of result.assets) {
          let processableUri = asset.uri;
          let fileSize = asset.fileSize || asset.size || 0;
          let mimeType = asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg");
          const isVideo = asset.type === "video";

          if (!isVideo) {
            try {
              console.log("🖼️ Compressing image before upload...");
              const compressed = await ImageManipulator.manipulateAsync(
                asset.uri,
                [{ resize: { width: 1200 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
              );
              processableUri = compressed.uri;
              mimeType = "image/jpeg";
              
              const fileInfo = await FileSystem.getInfoAsync(compressed.uri, { size: true });
              if (fileInfo.exists && fileInfo.size) {
                fileSize = fileInfo.size;
              }
            } catch (error) {
              console.error("Error compressing image:", error);
            }
          }

          if (fileSize > MAX_FILE_SIZE) {
            hasOversizedFiles = true;
          } else {
            validMedia.push({
              id: Date.now() + Math.random(),
              type: isVideo ? "video" : "image",
              uri: processableUri,
              name: asset.fileName || asset.name || `media_${Date.now()}.${isVideo ? "mp4" : "jpg"}`,
              size: fileSize,
              mimeType: mimeType,
            });
          }
        }

        if (hasOversizedFiles) {
          Alert.alert(
            "File Too Large",
            "One or more selected files exceed the 50MB limit and were not added. Please select smaller files."
          );
        }

        if (validMedia.length > 0) {
          setSelectedMedia((prev) => [...prev, ...validMedia]);
        }
      }
    } catch (error) {
      console.error("❌ Error in pickImage:", error);
      Alert.alert("Error", "Failed to select media. Please try again or check app permissions.");
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const pickDocument = async () => {
    setIsLoadingMedia(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled) {
        const validMedia = [];
        let hasOversizedFiles = false;

        result.assets.forEach((asset) => {
          const fileSize = asset.size || 0;
          if (fileSize > MAX_FILE_SIZE) {
            hasOversizedFiles = true;
          } else {
            validMedia.push({
              id: Date.now() + Math.random(),
              type: "document",
              uri: asset.uri,
              name: asset.name || `doc_${Date.now()}`,
              size: fileSize,
              mimeType: asset.mimeType || "application/octet-stream",
            });
          }
        });

        if (hasOversizedFiles) {
          Alert.alert(
            "File Too Large",
            "One or more selected documents exceed the 50MB limit and were not added. Please select smaller files."
          );
        }

        if (validMedia.length > 0) {
          setSelectedMedia((prev) => [...prev, ...validMedia]);
        }
      }
    } catch (error) {
      console.error("❌ Error in pickDocument:", error);
      Alert.alert("Error", "Failed to pick document");
    } finally {
      setIsLoadingMedia(false);
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
      Alert.alert("Warning!", "Please enter a title for your school post");
      return;
    }

    if (!selectedCategory) {
      setIsSubmitting(false);
      setUploadStep("");
      Alert.alert("Warning!", "Please select a category for your post");
      return;
    }

    try {

      console.log("🚀 Starting school post creation with two-step process");

      let uploadedMedia = [];

      // Step 1: Upload media files if any exist
      if (selectedMedia && selectedMedia.length > 0) {
        setUploadStep("uploading");
        console.log("📎 Starting chunked upload for multiple media files");

        for (let i = 0; i < selectedMedia.length; i++) {
          const item = selectedMedia[i];
          setUploadProgress({ current: i + 1, total: selectedMedia.length });

          // 50MB Check
          if (item.size > MAX_FILE_SIZE) {
            console.warn(`❌ File too large: ${item.name} (${item.size} bytes)`);
            setIsSubmitting(false);
            setUploadStep("");
            Alert.alert(
              "File Too Large",
              "The file you're trying to upload exceeds the 50MB limit. Please contact the IT team for assistance with larger files."
            );
            return;
          }

          try {
            console.log(`📎 Uploading file ${i + 1}/${selectedMedia.length}: ${item.name}`);
            const result = await uploadFile(item.uri, item.name, item.mimeType);
            uploadedMedia.push(result);
          } catch (uploadError) {
            console.error(`❌ Failed to upload file ${i + 1}:`, uploadError);
            setIsSubmitting(false);
            setUploadStep("");
            Alert.alert(
              "Upload Failed",
              `Failed to upload ${item.name}. ${uploadError.message || "Please try again."}`
            );
            return;
          }
        }
        
        console.log("📎 ✅ All media files uploaded successfully:", uploadedMedia);
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
        idempotency_key: idempotencyKey,
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

      const jsonPayload = createPostData(postData, []); // Pass empty array to prevent createPostData from mutating media URLs
      jsonPayload.media = uploadedMedia; // Use the exact media objects returned from the backend upload API

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
        <TouchableOpacity
          style={[
            styles.mediaButton,
            isLoadingMedia && styles.mediaButtonDisabled,
          ]}
          onPress={pickImage}
          disabled={isLoadingMedia}
        >
          <Icon name="photo-library" size={20} color={theme.colors.primary} />
          <Text style={styles.mediaButtonText}>Add Photos/Videos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mediaButton,
            isLoadingMedia && styles.mediaButtonDisabled,
          ]}
          onPress={pickDocument}
          disabled={isLoadingMedia}
        >
          <Icon name="attach-file" size={20} color={theme.colors.primary} />
          <Text style={styles.mediaButtonText}>Add Documents</Text>
        </TouchableOpacity>
      </View>

      {isLoadingMedia && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading media...</Text>
        </View>
      )}

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
  mediaButtonDisabled: {
    opacity: 0.5,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: 12,
    fontWeight: "500",
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
