import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import { feedbackCardTheme } from "../../data/studentGrowthData";

interface FeedbackCommentModalProps {
  visible: boolean;
  onClose: () => void;
  categoryName?: string;
  comment: string;
  ratingText?: string;
  creatorName?: string;
  dateText?: string;
}

const { height: screenHeight } = Dimensions.get("window");

const FeedbackCommentModal: React.FC<FeedbackCommentModalProps> = ({
  visible,
  onClose,
  categoryName = "Feedback",
  comment,
  ratingText,
  creatorName,
  dateText,
}) => {
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.7)" barStyle="light-content" />

      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={handleClose}
        >
          <BlurView intensity={30} style={StyleSheet.absoluteFillObject} />
        </TouchableOpacity>
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.modal}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <MaterialIcons
                name="feedback"
                size={24}
                color={feedbackCardTheme.primary}
              />
              <View style={styles.headerText}>
                <Text style={styles.title} numberOfLines={1}>
                  {categoryName}
                </Text>
                {ratingText && <Text style={styles.subtitle}>{ratingText}</Text>}
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name="close"
                size={24}
                color={feedbackCardTheme.grayMedium}
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            <Text style={styles.commentLabel}>Feedback Comment</Text>
            <Text style={styles.commentText}>{comment}</Text>

            {(creatorName || dateText) && (
              <View style={styles.metaSection}>
                {creatorName && (
                  <View style={styles.metaItem}>
                    <MaterialIcons
                      name="person"
                      size={16}
                      color={feedbackCardTheme.grayMedium}
                    />
                    <Text style={styles.metaText}>{creatorName}</Text>
                  </View>
                )}
                {dateText && (
                  <View style={styles.metaItem}>
                    <MaterialIcons
                      name="event"
                      size={16}
                      color={feedbackCardTheme.grayMedium}
                    />
                    <Text style={styles.metaText}>{dateText}</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: feedbackCardTheme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: screenHeight * 0.75,
    minHeight: screenHeight * 0.4,
    shadowColor: feedbackCardTheme.shadow.large,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: feedbackCardTheme.grayMedium + "40",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: feedbackCardTheme.grayLight,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: feedbackCardTheme.black,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: feedbackCardTheme.grayMedium,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: feedbackCardTheme.grayMedium,
    marginBottom: 8,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
    color: feedbackCardTheme.grayDark,
    backgroundColor: feedbackCardTheme.grayLight,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: feedbackCardTheme.primary,
  },
  metaSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: feedbackCardTheme.grayLight,
    gap: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 13,
    color: feedbackCardTheme.grayMedium,
    fontWeight: "500",
    marginLeft: 8,
  },
});

export default FeedbackCommentModal;
