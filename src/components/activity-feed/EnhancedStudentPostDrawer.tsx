import React, { useState, useEffect, useMemo } from "react";
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
  ActivityIndicator,
  FlatList,
  Platform,
} from "react-native";
import { useSelector } from "react-redux";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../styles/theme";
import {
  useGetGradeLevelsWithClassesQuery,
  GradeLevelWithClasses,
  GradeLevelClass,
} from "../../api/grade-level-api";
import {
  useGetStudentDetailsByClassQuery,
  StudentDetails,
} from "../../api/student-details-api";
import {
  useCreateStudentPostMutation,
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
import { processMediaForUpload } from "../../utils/imageUtils";
import { useActivityFeedChunkedUpload } from "../../hooks/useChunkedUpload";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface EnhancedStudentPostDrawerProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

// Student selection step component
const StudentSelectionStep: React.FC<{
  selectedGrade: GradeLevelWithClasses | null;
  selectedClass: GradeLevelClass | null;
  selectedStudents: StudentDetails[];
  onGradeSelect: (grade: GradeLevelWithClasses | null) => void;
  onClassSelect: (classItem: GradeLevelClass | null) => void;
  onStudentSelect: (student: StudentDetails) => void;
  onSelectAll: (students: StudentDetails[]) => void;
  onNext: () => void;
}> = ({
  selectedGrade,
  selectedClass,
  selectedStudents,
  onGradeSelect,
  onClassSelect,
  onStudentSelect,
  onSelectAll,
  onNext,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: gradeLevelsData,
    isLoading: gradeLevelsLoading,
    error: gradeLevelsError,
  } = useGetGradeLevelsWithClassesQuery({
    page_size: 50,
    page: 1,
  });

  const {
    data: studentsData,
    isLoading: studentsLoading,
    error: studentsError,
  } = useGetStudentDetailsByClassQuery(
    {
      grade_level_class_id: selectedClass?.id || 0,
      page: 1,
      page_size: 100,
    },
    { skip: !selectedClass?.id }
  );

  const students = useMemo(() => {
    if (!studentsData?.data?.data) return [];
    return studentsData.data.data;
  }, [studentsData]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    return students.filter(
      (student) =>
        student.student_calling_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        student.admission_number
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  return (
    <View style={styles.selectionContainer}>
      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Grade Level Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Grade Level</Text>
          {gradeLevelsLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : gradeLevelsError ? (
            <Text style={styles.errorText}>Failed to load grades</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.gradeScroll}
            >
              {gradeLevelsData?.data?.data?.map((grade) => (
                <TouchableOpacity
                  key={grade.id}
                  style={[
                    styles.gradeChip,
                    selectedGrade?.id === grade.id && styles.selectedGradeChip,
                  ]}
                  onPress={() => {
                    if (selectedGrade?.id === grade.id) {
                      onGradeSelect(null);
                      onClassSelect(null);
                    } else {
                      onGradeSelect(grade);
                      onClassSelect(null);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.gradeChipText,
                      selectedGrade?.id === grade.id &&
                        styles.selectedGradeChipText,
                    ]}
                  >
                    {grade.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Class Selection */}
        {selectedGrade && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Class</Text>
            <View style={styles.classIconsContainer}>
              {selectedGrade.grade_level_class_list.map((classItem) => (
                <TouchableOpacity
                  key={classItem.id}
                  style={[
                    styles.classIcon,
                    selectedClass?.id === classItem.id &&
                      styles.selectedClassIcon,
                  ]}
                  onPress={() => {
                    onClassSelect(classItem);
                  }}
                >
                  <LinearGradient
                    colors={
                      selectedClass?.id === classItem.id
                        ? ["#4CAF50", "#66BB6A"]
                        : ["#E3F2FD", "#BBDEFB"]
                    }
                    style={styles.classIconGradient}
                  >
                    <Text
                      style={[
                        styles.classIconText,
                        selectedClass?.id === classItem.id &&
                          styles.selectedClassIconText,
                      ]}
                    >
                      {classItem.name
                        .split(" ")
                        .pop()
                        ?.replace(/[^0-9A-Z]/gi, "") || "C"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
            {selectedClass && (
              <Text style={styles.selectedClassLabel}>
                {selectedClass.name} • {students.length} students
              </Text>
            )}
          </View>
        )}

        {/* Student Selection */}
        {selectedClass && (
          <View style={styles.section}>
            <View style={styles.studentHeader}>
              <Text style={styles.sectionTitle}>Select Students</Text>
              <TouchableOpacity
                onPress={() => onSelectAll(students)}
                style={styles.selectAllButton}
              >
                <MaterialIcons
                  name={
                    selectedStudents.length === students.length && students.length > 0
                      ? "check-box"
                      : "check-box-outline-blank"
                  }
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={styles.selectAllText}>
                  {selectedStudents.length === students.length && students.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search students..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <MaterialIcons name="clear" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {/* Student List */}
            <View style={styles.studentList}>
              {studentsLoading ? (
                <ActivityIndicator
                  size="large"
                  color={theme.colors.primary}
                  style={{ marginTop: 20 }}
                />
              ) : filteredStudents.length === 0 ? (
                <Text style={styles.noStudentsText}>No students found</Text>
              ) : (
                filteredStudents.map((student) => (
                  <TouchableOpacity
                    key={student.id}
                    style={[
                      styles.studentItem,
                      selectedStudents.some((s) => s.id === student.id) &&
                        styles.selectedStudentItem,
                    ]}
                    onPress={() => onStudentSelect(student)}
                  >
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>
                        {student.student_calling_name}
                      </Text>
                      <Text style={styles.studentDetails}>
                        {student.admission_number} • {selectedClass.name}
                      </Text>
                    </View>
                    {selectedStudents.some((s) => s.id === student.id) && (
                      <MaterialIcons
                        name="check-circle"
                        size={20}
                        color="#4CAF50"
                      />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Button - Always Visible */}
      {selectedStudents.length > 0 && (
        <View style={styles.fixedBottomButton}>
          <TouchableOpacity style={styles.nextButton} onPress={onNext}>
            <LinearGradient
              colors={["#920734", "#A91D47"]}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {`Continue (${selectedStudents.length} Selected)`}
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Post creation form component
const PostCreationForm: React.FC<{
  selectedStudents: StudentDetails[];
  onBack: () => void;
  onSubmit: (postData: any) => void;
  isSubmitting: boolean;
  uploadStep?: string;
  uploadProgress?: { current: number; total: number };
}> = ({
  selectedStudents,
  onBack,
  onSubmit,
  isSubmitting,
  uploadStep = "",
  uploadProgress = { current: 0, total: 0 },
}) => {
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("achievement");
  const [selectedMedia, setSelectedMedia] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const categories = [
    {
      id: "achievement",
      label: "Achievement",
      color: "#FFD60A",
      icon: "emoji-events",
    },
    {
      id: "progress",
      label: "Progress",
      color: "#34C759",
      icon: "trending-up",
    },
    { id: "homework", label: "Homework", color: "#FF3B30", icon: "book" },
    { id: "project", label: "Project", color: "#007AFF", icon: "work" },
    {
      id: "behavior",
      label: "Behavior",
      color: "#5856D6",
      icon: "sentiment-very-satisfied",
    },
    {
      id: "attendance",
      label: "Attendance",
      color: "#FF9500",
      icon: "how-to-reg",
    },
  ];

  const availableTags = [
    { id: "student", label: "#Student", color: "#5856D6" },
    { id: "achievement", label: "#Achievement", color: "#FFD60A" },
    { id: "progress", label: "#Progress", color: "#34C759" },
    { id: "homework", label: "#Homework", color: "#FF3B30" },
    { id: "project", label: "#Project", color: "#007AFF" },
    { id: "behavior", label: "#Behavior", color: "#AF52DE" },
    { id: "improvement", label: "#Improvement", color: "#FF9500" },
    { id: "excellent", label: "#Excellent", color: "#FF2D92" },
  ];

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Get progress message with upload tracking
  const getProgressMessage = () => {
    switch (uploadStep) {
      case "uploading":
        if (uploadProgress.total > 0) {
          return `Uploading ${uploadProgress.current} of ${uploadProgress.total} files...`;
        }
        return "Uploading media files...";
      case "posting":
        return "Creating post...";
      default:
        return "Creating...";
    }
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
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
        exif: true,
        allowsEditing: false,
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

            if (
              Platform.OS === "android" &&
              asset.uri.startsWith("content://")
            ) {
              console.log(
                `🤖 Android detected - Converting content:// URI to file://`
              );
              try {
                // Get file info to determine size if not available
                if (!fileSize || fileSize === 0) {
                  const fileInfo = await FileSystem.getInfoAsync(asset.uri);
                  if (fileInfo.exists && fileInfo.size) {
                    fileSize = fileInfo.size;
                    console.log(
                      `📊 Android - Got file size from FileSystem: ${fileSize} bytes`
                    );
                  }
                }

                // Copy to cache directory for Android
                const fileName =
                  asset.fileName ||
                  (asset as any).name ||
                  `media_${Date.now()}_${i}.${asset.type === "video" ? "mp4" : "jpg"}`;
                const cacheUri = `${FileSystem.cacheDirectory}${fileName}`;

                console.log(`📁 Android - Copying file to cache: ${cacheUri}`);
                await FileSystem.copyAsync({
                  from: asset.uri,
                  to: cacheUri,
                });

                processableUri = cacheUri;
                console.log(
                  `✅ Android - File copied successfully to: ${processableUri}`
                );
              } catch (androidError) {
                console.error(`❌ Android file copy failed:`, androidError);
                Alert.alert(
                  "File Access Error",
                  "Unable to access the selected file. Please try selecting a different file or check app permissions."
                );
                continue; // Skip this file
              }
            }

            // Update asset with processable URI and file size
            const processableAsset = {
              ...asset,
              uri: processableUri,
              fileSize: fileSize,
              size: fileSize,
            };

            // Enhanced filename capture
            let originalUserFilename =
              processableAsset.fileName ||
              (processableAsset as any).name ||
              `media_${Date.now()}_${i}.${asset.type === "video" ? "mp4" : "jpg"}`;

            const processResult = await processMediaForUpload(
              {
                id: Date.now() + Math.random() + i,
                type: processableAsset.type || "image",
                uri: processableAsset.uri,
                name: originalUserFilename,
                fileName: originalUserFilename,
                original_user_filename: originalUserFilename,
                size: processableAsset.fileSize || processableAsset.size || 0,
                mimeType:
                  processableAsset.mimeType ||
                  (processableAsset.type === "video"
                    ? "video/mp4"
                    : "image/jpeg"),
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
            }
          } catch (error) {
            console.error(`❌ Failed to process asset ${i}:`, error);
            // Enhanced fallback
            const fallbackFilename =
              asset.fileName || (asset as any).name || `media_${Date.now()}_${i}.jpg`;

            processedMedia.push({
              id: Date.now() + Math.random() + i,
              type: asset.type || "image",
              uri: asset.uri,
              name: fallbackFilename,
              fileName: fallbackFilename,
              size: asset.fileSize || asset.size || 0,
              mimeType: asset.mimeType || "image/jpeg",
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
        const newMedia = result.assets.map((asset) => ({
          id: Date.now() + Math.random(),
          type: "document",
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
        }));
        setSelectedMedia((prev) => [...prev, ...newMedia]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const removeMedia = (mediaId: number) => {
    setSelectedMedia((prev) => prev.filter((item) => item.id !== mediaId));
  };

  const handleSubmit = () => {
    if (!postTitle.trim()) {
      Alert.alert("Error", "Please enter a title for your post");
      return;
    }

    // postContent is now optional

    onSubmit({
      title: postTitle,
      content: postContent,
      category: selectedCategory,
      media: selectedMedia,
      hashtags: selectedTags,
    });
  };

  return (
    <ScrollView
      style={styles.formContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Student Info Banner */}
      <View style={styles.studentInfoBanner}>
        <MaterialIcons name="person" size={16} color="#920734" />
        <Text style={styles.studentInfoText}>
          {selectedStudents.length === 1
            ? `Posting for: ${selectedStudents[0].student_calling_name}`
            : `Posting for: ${selectedStudents.length} Students`}
        </Text>
      </View>

      {/* Category Selection */}
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
              <MaterialIcons
                name={category.icon as any}
                size={16}
                color={
                  selectedCategory === category.id ? "white" : category.color
                }
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id &&
                    styles.selectedCategoryText,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Title Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Title</Text>
        <TextInput
          style={styles.titleInput}
          placeholder="Enter post title..."
          value={postTitle}
          onChangeText={setPostTitle}
          placeholderTextColor="#999"
        />
      </View>

      {/* Content Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content</Text>
        <TextInput
          style={styles.contentInput}
          multiline
          numberOfLines={6}
          placeholder="Share student achievements, progress, behavior updates..."
          value={postContent}
          onChangeText={setPostContent}
          textAlignVertical="top"
          placeholderTextColor="#999"
        />
      </View>

      {/* Media Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Media & Documents</Text>
        <View style={styles.mediaActions}>
          <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
            <MaterialIcons
              name="photo-library"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.mediaButtonText}>Add Photos/Videos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mediaButton} onPress={pickDocument}>
            <MaterialIcons
              name="attach-file"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.mediaButtonText}>Add Documents</Text>
          </TouchableOpacity>
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
                  <Image
                    source={{ uri: media.uri }}
                    style={styles.mediaImage}
                  />
                ) : media.type === "video" ? (
                  <View style={styles.videoPlaceholder}>
                    <MaterialIcons
                      name="play-circle-filled"
                      size={32}
                      color="white"
                    />
                  </View>
                ) : (
                  <View style={styles.documentPlaceholder}>
                    <MaterialIcons
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
                  <MaterialIcons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Hashtags Section */}
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

      {/* Form Actions */}
      <View style={styles.formActions}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={
              isSubmitting ? ["#CCCCCC", "#BBBBBB"] : ["#920734", "#A91D47"]
            }
            style={styles.submitButtonGradient}
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
                <MaterialIcons name="send" size={20} color="white" />
                <Text style={styles.submitButtonText}>Create Post</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Main component
const EnhancedStudentPostDrawer: React.FC<EnhancedStudentPostDrawerProps> = ({
  visible,
  onClose,
  onPostCreated,
}) => {
  const [currentStep, setCurrentStep] = useState<"selection" | "form">(
    "selection"
  );
  const [uploadStep, setUploadStep] = useState("");
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGrade, setSelectedGrade] =
    useState<GradeLevelWithClasses | null>(null);
  const [selectedClass, setSelectedClass] = useState<GradeLevelClass | null>(
    null
  );
  const [selectedStudents, setSelectedStudents] = useState<StudentDetails[]>([]);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  // Generate idempotency key when drawer opens
  useEffect(() => {
    if (visible && !idempotencyKey) {
      const key = generateIdempotencyKey();
      console.log("🔑 Generated idempotency key for student post:", key);
      setIdempotencyKey(key);
    } else if (!visible) {
      setIdempotencyKey("");
    }
  }, [visible, idempotencyKey]);

  const { sessionData } = useSelector((state: any) => state.app);

  const [createPost, { isLoading: isCreating }] =
    useCreateStudentPostMutation();
  
  const { uploadFile, isUploading: isMediaUploading, progress: mediaProgress } = useActivityFeedChunkedUpload();

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setCurrentStep("selection");
      setSelectedGrade(null);
      setSelectedClass(null);
      setSelectedStudents([]);
    }
  }, [visible]);

  const handleStudentSelect = (student: StudentDetails) => {
    setSelectedStudents((prev) => {
      const exists = prev.find((s) => s.id === student.id);
      if (exists) {
        return prev.filter((s) => s.id !== student.id);
      }
      return [...prev, student];
    });
  };

  const handleSelectAll = (students: StudentDetails[]) => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students);
    }
  };

  const handleNext = () => {
    if (selectedStudents.length > 0) {
      setCurrentStep("form");
    }
  };

  const handleBack = () => {
    setCurrentStep("selection");
  };

  const handleSubmit = async (postData: any) => {
    // Set submitting immediately to disable button on first click
    setIsSubmitting(true);
    setUploadStep("validating");

    if (selectedStudents.length === 0) {
      setIsSubmitting(false);
      setUploadStep("");
      Alert.alert("Error", "No students selected");
      return;
    }

    try {
      let mediaUrls: any[] = [];

      // Upload media if any
      if (postData.media && postData.media.length > 0) {
        setUploadStep("uploading");
        console.log("📎 Starting chunked upload for multiple media files");

        for (let i = 0; i < postData.media.length; i++) {
          const item = postData.media[i];
          setUploadProgress({ current: i + 1, total: postData.media.length });

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
            console.log(`📎 Uploading file ${i + 1}/${postData.media.length}: ${item.name}`);
            const result = await uploadFile(item.uri, item.name, item.mimeType);
            mediaUrls.push(result);
          } catch (uploadError: any) {
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
        
        console.log("📎 ✅ All media files uploaded successfully:", mediaUrls);
      }

      setUploadStep("posting");

      // Create post
      const result = await createPost({
        title: postData.title,
        content: postData.content,
        category: postData.category,
        student_ids: selectedStudents.map((s) => s.id),
        class_id: selectedClass?.id,
        school_id: 1,
        hashtags: postData.hashtags,
        media: mediaUrls,
        idempotency_key: idempotencyKey,
      }).unwrap();

      setIsSubmitting(false);
      setUploadStep("");

      Alert.alert(
        "Success",
        selectedStudents.length === 1
          ? `Student post created successfully for ${selectedStudents[0].student_calling_name}!`
          : `Student posts created successfully for ${selectedStudents.length} students!`,
        [
          {
            text: "OK",
            onPress: () => {
              onClose();
              if (onPostCreated) {
                onPostCreated();
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Failed to create student post:", error);
      setIsSubmitting(false);
      setUploadStep("");
      setUploadProgress({ current: 0, total: 0 });
      Alert.alert(
        "Error",
        error?.data?.message ||
          "Failed to create student post. Please try again."
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.title}>
                {currentStep === "selection"
                  ? "Select Student"
                  : "Create Student Post"}
              </Text>
              <Text style={styles.subtitle}>
                {currentStep === "selection"
                  ? "Choose a student to create a post"
                  : "Share student-specific updates"}
              </Text>
            </View>
            <View style={styles.placeholder} />
          </View>

          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            <View
              style={[
                styles.stepDot,
                currentStep === "selection" && styles.activeStepDot,
              ]}
            />
            <View style={styles.stepLine} />
            <View
              style={[
                styles.stepDot,
                currentStep === "form" && styles.activeStepDot,
              ]}
            />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {currentStep === "selection" ? (
            <StudentSelectionStep
              selectedGrade={selectedGrade}
              selectedClass={selectedClass}
              selectedStudents={selectedStudents}
              onGradeSelect={setSelectedGrade}
              onClassSelect={setSelectedClass}
              onStudentSelect={handleStudentSelect}
              onSelectAll={handleSelectAll}
              onNext={handleNext}
            />
          ) : (
            selectedStudents.length > 0 && (
              <PostCreationForm
                selectedStudents={selectedStudents}
                onBack={handleBack}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting || isCreating}
                uploadStep={uploadStep}
                uploadProgress={uploadProgress}
              />
            )
          )}
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
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E0E0E0",
  },
  activeStepDot: {
    backgroundColor: "#920734",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  selectionContainer: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 0,
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
  gradeScroll: {
    flexGrow: 0,
  },
  gradeChip: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectedGradeChip: {
    backgroundColor: "#920734",
    borderColor: "#920734",
  },
  gradeChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  selectedGradeChipText: {
    color: "#FFFFFF",
  },
  classIconsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  classIcon: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  selectedClassIcon: {
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  classIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  classIconText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1976D2",
  },
  selectedClassIconText: {
    color: "#FFFFFF",
  },
  selectedClassLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
    textAlign: "center",
  },
  studentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  selectAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  studentList: {
    marginBottom: 16,
  },
  studentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectedStudentItem: {
    borderColor: "#4CAF50",
    borderWidth: 2,
    backgroundColor: "#F1F8F4",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  studentDetails: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  noStudentsText: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 14,
    paddingVertical: 20,
  },
  errorText: {
    color: "#F44336",
    fontSize: 14,
  },
  fixedBottomButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  nextButton: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  studentInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFE5EC",
    borderRadius: 8,
    marginBottom: 16,
  },
  studentInfoText: {
    fontSize: 14,
    color: "#920734",
    fontWeight: "600",
    marginLeft: 6,
  },
  categoryScroll: {
    flexGrow: 0,
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
  formActions: {
    flexDirection: "row",
    marginTop: 16,
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  submitButton: {
    flex: 2,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    shadowOpacity: 0.05,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default EnhancedStudentPostDrawer;
