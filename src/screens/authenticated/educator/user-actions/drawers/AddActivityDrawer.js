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
  Platform,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { theme } from "../../../../../styles/theme";
import { USER_CATEGORIES } from "../../../../../constants/userCategories";

const AddActivityDrawer = () => {
  const dispatch = useDispatch();
  const [postContent, setPostContent] = useState("");
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [postTarget, setPostTarget] = useState("class"); // "class" or "school"
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get global state
  const { sessionData } = useSelector((state) => state.app);

  // Available tags
  const availableTags = [
    { id: "academic", label: "Academic", color: "#4CAF50" },
    { id: "sports", label: "Sports", color: "#F44336" },
    { id: "arts", label: "Arts & Crafts", color: "#9C27B0" },
    { id: "science", label: "Science", color: "#2196F3" },
    { id: "field_trip", label: "Field Trip", color: "#FF9800" },
    { id: "celebration", label: "Celebration", color: "#E91E63" },
    { id: "announcement", label: "Announcement", color: "#607D8B" },
    { id: "achievement", label: "Achievement", color: "#FFC107" },
  ];

  // Post target options
  const targetOptions = [
    {
      id: "class",
      label: "Class Timeline",
      description: "Visible to class students and parents",
    },
    {
      id: "school",
      label: "School Timeline",
      description: "Visible to entire school community",
    },
  ];

  const toggleTag = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const pickImage = async () => {
    if (Platform.OS === "ios") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please grant camera roll permissions to add images.",
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      const newMedia = result.assets.map((asset) => ({
        id: Date.now() + Math.random(),
        type: asset.type,
        uri: asset.uri,
        name: asset.fileName || `media_${Date.now()}`,
      }));
      setSelectedMedia((prev) => [...prev, ...newMedia]);
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

  const removeMedia = (mediaId) => {
    setSelectedMedia((prev) => prev.filter((item) => item.id !== mediaId));
  };

  const handleSubmitPost = async () => {
    if (!postContent.trim()) {
      Alert.alert("Error", "Please enter some content for your post");
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Implement API call to submit activity post
      // const postData = {
      //   content: postContent,
      //   media: selectedMedia,
      //   tags: selectedTags,
      //   target: postTarget,
      //   educator_id: sessionData?.user?.id,
      // };

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      Alert.alert("Success", "Activity posted successfully!");

      // Reset form
      setPostContent("");
      setSelectedMedia([]);
      setSelectedTags([]);
      setPostTarget("class");
    } catch (error) {
      Alert.alert("Error", "Failed to post activity. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTargetSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Post Target</Text>
      {targetOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.targetOption,
            postTarget === option.id && styles.selectedTargetOption,
          ]}
          onPress={() => setPostTarget(option.id)}
        >
          <View style={styles.targetOptionContent}>
            <MaterialIcons
              name={
                postTarget === option.id
                  ? "radio-button-checked"
                  : "radio-button-unchecked"
              }
              size={20}
              color={
                postTarget === option.id
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
            />
            <View style={styles.targetOptionText}>
              <Text style={styles.targetOptionLabel}>{option.label}</Text>
              <Text style={styles.targetOptionDescription}>
                {option.description}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContentInput = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Content</Text>
      <TextInput
        style={styles.contentInput}
        multiline
        numberOfLines={6}
        placeholder="Share what's happening in your classroom..."
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
                <Image source={{ uri: media.uri }} style={styles.mediaImage} />
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
  );

  const renderTagsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tags</Text>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Post Classroom Activity</Text>
        <Text style={styles.subtitle}>
          Share updates with students and parents
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTargetSelector()}
        {renderContentInput()}
        {renderMediaSection()}
        {renderTagsSection()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitPost}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Text style={styles.submitButtonText}>Posting...</Text>
          ) : (
            <>
              <MaterialIcons name="send" size={20} color="white" />
              <Text style={styles.submitButtonText}>Post Activity</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  targetOption: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedTargetOption: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + "10",
  },
  targetOptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  targetOptionText: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  targetOptionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  targetOptionDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  contentInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mediaActions: {
    flexDirection: "row",
    marginBottom: theme.spacing.md,
  },
  mediaButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mediaButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  mediaPreview: {
    flexDirection: "row",
  },
  mediaItem: {
    position: "relative",
    marginRight: theme.spacing.md,
  },
  mediaImage: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
  },
  videoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: theme.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  documentPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  documentName: {
    fontSize: 10,
    color: theme.colors.text,
    textAlign: "center",
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.card,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
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
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.textSecondary,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: theme.spacing.sm,
  },
});

export default AddActivityDrawer;
