import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { useSelector } from "react-redux";
import Icon from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../styles/theme";

const UniversalPostCreationDrawer = ({
  visible,
  onClose,
  onSectionSelect,
  activeTab,
}) => {
  const { selectedStudent } = useSelector((state) => state.app);

  // Create all possible sections
  const allSections = [
    {
      id: "school",
      title: "Create School Post",
      subtitle: "Share with the entire school community",
      icon: "school",
      color: "#007AFF",
      gradient: ["#007AFF", "#0056CC"],
      available: true,
    },
    {
      id: "class",
      title: selectedStudent?.class_name
        ? `Create Class Post for ${selectedStudent.class_name}`
        : "Create Class Post",
      subtitle: selectedStudent?.class_name
        ? "Share with class students and parents"
        : "Share with class students and parents",
      icon: "class",
      color: "#34C759",
      gradient: ["#34C759", "#28A745"],
      available: true, // Always available for non-parent users
    },
    {
      id: "student",
      title: selectedStudent?.first_name
        ? `Create Student Post for ${selectedStudent.first_name}`
        : "Create Student Post",
      subtitle: "Share individual student updates and achievements",
      icon: "person",
      color: "#FF9500",
      gradient: ["#FF9500", "#CC7700"],
      available: false, // Disabled for now
    },
  ];

  // Always show School, Class, and Student post options regardless of active tab
  const sections = allSections.filter((section) => {
    return (
      section.id === "school" ||
      section.id === "class" ||
      section.id === "student"
    );
  });

  const handleSectionPress = (sectionId) => {
    const section = sections.find((s) => s.id === sectionId);
    if (section?.available) {
      onSectionSelect(sectionId);
      onClose();
    }
  };

  const renderSection = (section) => (
    <TouchableOpacity
      key={section.id}
      style={[
        styles.sectionCard,
        !section.available && styles.sectionCardDisabled,
      ]}
      onPress={() => handleSectionPress(section.id)}
      activeOpacity={section.available ? 0.8 : 1}
      disabled={!section.available}
    >
      <LinearGradient
        colors={section.available ? section.gradient : ["#F2F2F7", "#E8E8ED"]}
        style={styles.sectionGradient}
      >
        <View style={styles.sectionContent}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIconContainer,
                {
                  backgroundColor: section.available
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(0,0,0,0.1)",
                },
              ]}
            >
              <Icon
                name={section.icon}
                size={28}
                color={section.available ? "white" : "#8E8E93"}
              />
            </View>
            <View style={styles.sectionTextContainer}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: section.available ? "white" : "#8E8E93" },
                ]}
              >
                {section.title}
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color: section.available
                      ? "rgba(255,255,255,0.9)"
                      : "#C7C7CC",
                  },
                ]}
              >
                {section.subtitle}
              </Text>
            </View>
          </View>

          {section.available && (
            <View style={styles.sectionAction}>
              <Icon name="arrow-forward-ios" size={16} color="white" />
            </View>
          )}

          {!section.available && (
            <View style={styles.sectionLock}>
              <Icon name="lock" size={16} color="#8E8E93" />
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.title}>Create New Post</Text>
                <Text style={styles.subtitle}>
                  Choose where to share your content
                </Text>
              </View>
              <View style={styles.placeholder} />
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {sections.map(renderSection)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    minHeight: "60%",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
  },
  closeButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  sectionCardDisabled: {
    opacity: 0.6,
  },
  sectionGradient: {
    flex: 1,
  },
  sectionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    minHeight: 80,
  },
  sectionHeader: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  sectionTextContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionAction: {
    padding: 8,
  },
  sectionLock: {
    padding: 8,
  },
});

export default UniversalPostCreationDrawer;
