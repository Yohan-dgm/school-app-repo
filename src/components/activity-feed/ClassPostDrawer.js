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
  generateIdempotencyKey,
} from "../../utils/postSubmissionUtils";
import { useActivityFeedChunkedUpload } from "../../hooks/useChunkedUpload";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  // Generate idempotency key when drawer opens
  React.useEffect(() => {
    if (visible && !idempotencyKey) {
      const key = generateIdempotencyKey();
      console.log("🔑 Generated idempotency key for class post:", key);
      setIdempotencyKey(key);
    } else if (!visible) {
      setIdempotencyKey("");
    }
  }, [visible]);

  // API hooks
  const [createClassPost] = useCreateClassPostMutation();
  const { uploadFile, isUploading: isMediaUploading, progress: mediaProgress } = useActivityFeedChunkedUpload();

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

  const resetForm = () => {
    setPostTitle("");
    setPostContent("");
    setSelectedCategory("announcement");
    setSelectedGrade(null);
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
        : [...prev, tagId]
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
          "Please grant camera roll permissions to add images."
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
        grade: selectedGrade,
        class_id: selectedGrade, // Use selectedGrade as class_id
        author_id:
          sessionData?.user_id || sessionData?.data?.user_id || user?.id,
        hashtags: convertTagsToHashtags(selectedTags, availableTags),
        idempotency_key: idempotencyKey,
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

      const jsonPayload = createPostData(postData, []); // Pass empty array to prevent createPostData from mutating media URLs
      jsonPayload.media = uploadedMedia; // Use the exact media objects returned from the backend upload API

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

      const response = await createClassPost(jsonPayload).unwrap();
      console.log("✅ Class post created successfully:", response);

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
      <Text style={styles.sectionTitlespan}>(max 10 images/max 50mb video)</Text>

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
