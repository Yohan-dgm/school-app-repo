import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import {
  useGetStudentAttachmentsByStudentIdQuery,
  transformAttachmentsToTimeline,
} from "../../../../api/student-management-api";
import { buildStudentAttachmentImageUrl } from "../../../../utils/mediaUtils";
import { useSelector } from "react-redux";

const { width, height } = Dimensions.get("window");

interface TimelineItem {
  id: number;
  attachmentId: number;
  year: string;
  date: string;
  title: string;
  description: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  createdBy: number;
  createdAt: string;
  isImage: boolean;
}

interface Student {
  id: number;
  name: string;
  studentId: string;
  grade: string;
  campus: string;
  schoolHouse: string;
  profileImage: any;
}

interface StudentProfileModalProps {
  visible: boolean;
  onClose: () => void;
  student: Student;
}

const getHouseInfo = (houseName: string) => {
  if (!houseName || houseName === "Unknown House") {
    return { isValid: false, color: "#999999" };
  }

  const lowerHouseName = houseName.toLowerCase();

  if (lowerHouseName.includes("vulcan")) {
    return { isValid: true, color: "#FF8C00" };
  } else if (lowerHouseName.includes("tellus")) {
    return { isValid: true, color: "#FFD700" };
  } else if (lowerHouseName.includes("eurus")) {
    return { isValid: true, color: "#87CEEB" };
  } else if (lowerHouseName.includes("calypso")) {
    return { isValid: true, color: "#32CD32" };
  }

  return { isValid: false, color: "#999999" };
};

const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  visible,
  onClose,
  student,
}) => {
  const modalScale = useSharedValue(0.9);
  const modalOpacity = useSharedValue(0);
  const headerY = useSharedValue(-100);
  const contentY = useSharedValue(50);

  // Get token from Redux state (same pattern as Header.js)
  const { token } = useSelector((state: any) => state.app);

  // Photo preview modal state
  const [photoPreviewVisible, setPhotoPreviewVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<TimelineItem | null>(null);

  // Fetch student attachments
  const {
    data: attachmentsResponse,
    isLoading: isAttachmentsLoading,
    error: attachmentsError,
  } = useGetStudentAttachmentsByStudentIdQuery(
    { student_id: student.id },
    { skip: !visible || !student.id },
  );

  // Transform attachments to timeline format
  const timelineItems = attachmentsResponse?.data?.attachments
    ? transformAttachmentsToTimeline(attachmentsResponse.data.attachments)
    : [];

  // Debug logging
  console.log("🔍 StudentProfileModal Debug:", {
    studentId: student.id,
    isLoading: isAttachmentsLoading,
    hasError: !!attachmentsError,
    hasToken: !!token,
    tokenLength: token?.length || 0,
    attachmentsCount: attachmentsResponse?.data?.attachments?.length || 0,
    timelineCount: timelineItems.length,
    firstTimelineItem: timelineItems[0],
    studentImagesBaseUrl: process.env.EXPO_PUBLIC_BASE_URL_STUDENT_IMAGES,
  });

  useEffect(() => {
    if (visible) {
      modalScale.value = withSpring(1, { damping: 15, stiffness: 100 });
      modalOpacity.value = withTiming(1, { duration: 300 });
      headerY.value = withSpring(0, { damping: 12, stiffness: 80 });
      contentY.value = withDelay(
        150,
        withSpring(0, { damping: 12, stiffness: 80 }),
      );
    } else {
      modalScale.value = withTiming(0.9, { duration: 200 });
      modalOpacity.value = withTiming(0, { duration: 200 });
      headerY.value = withTiming(-100, { duration: 200 });
      contentY.value = withTiming(50, { duration: 200 });
    }
  }, [visible]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: modalOpacity.value,
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerY.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentY.value }],
  }));

  const handleClose = () => {
    modalScale.value = withTiming(0.9, { duration: 200 });
    modalOpacity.value = withTiming(0, { duration: 200 });
    headerY.value = withTiming(-100, { duration: 200 });
    contentY.value = withTiming(50, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  };

  const handlePhotoPress = (item: TimelineItem) => {
    if (item.isImage) {
      setSelectedPhoto(item);
      setPhotoPreviewVisible(true);
    }
  };

  const handlePhotoPreviewClose = () => {
    setPhotoPreviewVisible(false);
    setSelectedPhoto(null);
  };

  const TimelineCard: React.FC<{ item: TimelineItem; index: number }> = ({
    item,
    index,
  }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const cardScale = useSharedValue(0.8);
    const cardOpacity = useSharedValue(0);
    const cardY = useSharedValue(30);

    // Reset image states when item changes
    useEffect(() => {
      setImageError(false);
      setImageLoading(false); // Start as false, will be set to true on onLoadStart
    }, [item.id]);

    useEffect(() => {
      if (visible) {
        const delay = index * 100 + 300;
        cardScale.value = withDelay(
          delay,
          withSpring(1, { damping: 15, stiffness: 100 }),
        );
        cardOpacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
        cardY.value = withDelay(
          delay,
          withSpring(0, { damping: 12, stiffness: 80 }),
        );
      }
    }, [visible, index]);

    const cardAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: cardScale.value }, { translateY: cardY.value }],
      opacity: cardOpacity.value,
    }));

    const handleCardPress = () => {
      cardScale.value = withSpring(
        0.95,
        { damping: 15, stiffness: 150 },
        () => {
          cardScale.value = withSpring(1, { damping: 15, stiffness: 150 });
        },
      );
    };

    return (
      <Animated.View style={[styles.timelineItem, cardAnimatedStyle]}>
        <View style={styles.timelineLeft}>
          <LinearGradient
            colors={["#920734", "#B91C4C", "#E91E63"]}
            style={styles.yearBadge}
          >
            <Text style={styles.yearText}>{item.year}</Text>
          </LinearGradient>
          {index < timelineItems.length - 1 && (
            <View style={styles.timelineLine} />
          )}
        </View>

        <Pressable onPress={handleCardPress} style={styles.timelineContent}>
          <LinearGradient
            colors={["#FFFFFF", "#F8F9FA"]}
            style={styles.timelineCard}
          >
            <View style={styles.timelineHeader}>
              <TouchableOpacity
                style={styles.profilePhotoContainer}
                onPress={() => handlePhotoPress(item)}
                activeOpacity={0.8}
              >
                {item.isImage && !imageError ? (
                  <View style={styles.imageContainer}>
                    <Image
                      source={{
                        uri: buildStudentAttachmentImageUrl(item.attachmentId),
                        headers: token
                          ? { Authorization: `Bearer ${token}` }
                          : {},
                      }}
                      style={styles.timelineAvatar}
                      onError={(error) => {
                        console.log(
                          "📷 Image load error:",
                          error.nativeEvent.error,
                        );
                        console.log(
                          "📷 Failed URL:",
                          buildStudentAttachmentImageUrl(item.attachmentId),
                        );
                        console.log("📷 Token available:", !!token);
                        console.log(
                          "📷 Attachment ID used:",
                          item.attachmentId,
                        );
                        console.log("📷 File name:", item.fileName);
                        console.log(
                          "📷 Original file name:",
                          item.originalFileName,
                        );
                        setImageError(true);
                        setImageLoading(false);
                      }}
                      onLoad={() => {
                        console.log(
                          "📷 Image loaded successfully:",
                          buildStudentAttachmentImageUrl(item.attachmentId),
                        );
                        setImageLoading(false);
                      }}
                      onLoadStart={() => {
                        setImageLoading(true);
                      }}
                    />
                    {/* {imageLoading && (
                      <View style={styles.imageLoadingOverlay}>
                        <ActivityIndicator size="small" color="#920734" />
                      </View>
                    )} */}
                    {/* Photo preview indicator */}
                    <View style={styles.photoPreviewIndicator}>
                      <MaterialIcons name="zoom-in" size={16} color="#FFFFFF" />
                    </View>
                  </View>
                ) : (
                  <View style={[styles.timelineAvatar, styles.fileIcon]}>
                    <MaterialIcons
                      name={item.isImage ? "broken-image" : "insert-drive-file"}
                      size={24}
                      color="#920734"
                    />
                  </View>
                )}
                {/* <View style={styles.yearOverlay}>
                  <Text style={styles.yearOverlayText}>{item.year}</Text>
                </View> */}
              </TouchableOpacity>
              <View style={styles.timelineInfo}>
                <Text style={styles.timelineTitle}>{item.title}</Text>
                <Text style={styles.timelineDate}>{item.date}</Text>
              </View>
            </View>

            {/* <View style={styles.fileInfoContainer}> */}
            {/* <View style={styles.fileInfo}>
                <MaterialIcons name="attachment" size={16} color="#666" />
                <Text style={styles.fileName}>{item.originalFileName}</Text>
              </View> */}
            {/* </View> */}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  };

  if (!student) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      transparent={true}
    >
      <Animated.View style={[styles.container, modalAnimatedStyle]}>
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <LinearGradient
            colors={["#920734", "#B91C4C"]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <TouchableOpacity onPress={handleClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Student Profile</Text>
            <View style={styles.headerSpacer} />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            <View style={styles.profileCard}>
              <LinearGradient
                colors={["#FFFFFF", "#F8F9FA"]}
                style={styles.profileCardGradient}
              >
                <View style={styles.profileImageWrapper}>
                  <Image
                    source={student.profileImage}
                    style={styles.profileImage}
                  />
                  <LinearGradient
                    colors={["#4CAF50", "#45A049"]}
                    style={styles.verifiedBadge}
                  >
                    <MaterialIcons name="verified" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </View>

                <View style={styles.profileInfo}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentDetails}>
                    {student.studentId} • {student.grade}
                  </Text>
                  <Text style={styles.campusName}>{student.campus}</Text>

                  {(() => {
                    const houseInfo = getHouseInfo(student.schoolHouse);

                    if (!houseInfo.isValid) {
                      return (
                        <View
                          style={[
                            styles.houseCircle,
                            { backgroundColor: houseInfo.color },
                          ]}
                        />
                      );
                    }

                    return (
                      <LinearGradient
                        colors={[houseInfo.color, houseInfo.color + "DD"]}
                        style={styles.houseChip}
                      >
                        <Text style={styles.houseText}>
                          {student.schoolHouse}
                        </Text>
                      </LinearGradient>
                    );
                  })()}
                </View>
              </LinearGradient>
            </View>

            <View style={styles.timelineSection}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={["#920734", "#B91C4C"]}
                  style={styles.timelineIconBg}
                >
                  <Ionicons name="school" size={18} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Academic Journey</Text>
                <View style={styles.timelineStats}>
                  <Text style={styles.timelineStatsText}>
                    {isAttachmentsLoading
                      ? "Loading..."
                      : `${timelineItems.length} Photos`}
                  </Text>
                </View>
              </View>

              <View style={styles.timelineContainer}>
                {isAttachmentsLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#920734" />
                    <Text style={styles.loadingText}>Loading timeline...</Text>
                  </View>
                ) : attachmentsError ? (
                  <View style={styles.errorContainer}>
                    <MaterialIcons name="error" size={48} color="#999" />
                    <Text style={styles.errorText}>
                      Unable to load timeline
                    </Text>
                    <Text style={styles.errorSubText}>
                      Please try again later
                    </Text>
                  </View>
                ) : timelineItems.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <MaterialIcons
                      name="photo-library"
                      size={48}
                      color="#999"
                    />
                    <Text style={styles.emptyText}>No photos available</Text>
                    <Text style={styles.emptySubText}>
                      Timeline will appear when photos are added
                    </Text>
                  </View>
                ) : (
                  timelineItems.map((item, index) => (
                    <TimelineCard key={item.id} item={item} index={index} />
                  ))
                )}
              </View>
            </View>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </Animated.View>
      </Animated.View>

      {/* Photo Preview Modal */}
      <Modal
        visible={photoPreviewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handlePhotoPreviewClose}
      >
        <View style={styles.photoPreviewOverlay}>
          <TouchableOpacity
            style={styles.photoPreviewCloseArea}
            onPress={handlePhotoPreviewClose}
            activeOpacity={1}
          >
            <View style={styles.photoPreviewContainer}>
              <View style={styles.photoPreviewHeader}>
                <Text style={styles.photoPreviewTitle}>
                  {selectedPhoto?.title}
                </Text>
                <TouchableOpacity
                  onPress={handlePhotoPreviewClose}
                  style={styles.photoPreviewCloseButton}
                >
                  <MaterialIcons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {selectedPhoto && (
                <View style={styles.photoPreviewImageContainer}>
                  <Image
                    source={{
                      uri: buildStudentAttachmentImageUrl(
                        selectedPhoto.attachmentId,
                      ),
                      headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : {},
                    }}
                    style={styles.photoPreviewImage}
                    resizeMode="contain"
                  />
                </View>
              )}

              <View style={styles.photoPreviewFooter}>
                <Text style={styles.photoPreviewDate}>
                  {selectedPhoto?.date}
                </Text>
                <Text style={styles.photoPreviewDescription}>
                  {selectedPhoto?.description}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  header: {
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    paddingTop: 50,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textAlign: "center",
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 16,
  },
  profileCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  profileCardGradient: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  profileImageWrapper: {
    position: "relative",
    marginRight: 15,
  },
  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
    alignItems: "flex-start",
  },
  studentName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  studentDetails: {
    fontSize: 15,
    color: "#666",
    marginBottom: 4,
  },
  campusName: {
    fontSize: 14,
    color: "#920734",
    fontWeight: "600",
    marginBottom: 12,
  },
  houseChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  houseText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  houseCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  timelineSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginLeft: 12,
    flex: 1,
  },
  timelineIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineStats: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timelineStatsText: {
    fontSize: 12,
    color: "#1976D2",
    fontWeight: "600",
  },
  timelineContainer: {
    paddingTop: 20,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 24,
  },
  timelineLeft: {
    alignItems: "center",
    marginRight: 20,
    zIndex: 1,
  },
  yearBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#920734",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  yearText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  timelineLine: {
    width: 3,
    flex: 1,
    backgroundColor: "#E0E0E0",
    marginTop: 15,
    borderRadius: 1.5,
  },
  timelineContent: {
    flex: 1,
  },
  timelineCard: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
  },
  profilePhotoContainer: {
    position: "relative",
    marginRight: 14,
  },
  timelineAvatar: {
    width: 70,
    height: 70,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  yearOverlay: {
    position: "absolute",
    bottom: -5,
    right: -5,
    backgroundColor: "#920734",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  yearOverlayText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  timelineInfo: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 14,
    color: "#920734",
    fontWeight: "600",
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  fileIcon: {
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  fileInfoContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  fileName: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#920734",
    marginTop: 12,
    fontWeight: "600",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
    fontWeight: "600",
  },
  errorSubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
    fontWeight: "600",
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
  imageContainer: {
    position: "relative",
  },
  imageLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
  },
  photoPreviewIndicator: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  photoPreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoPreviewCloseArea: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  photoPreviewContainer: {
    width: "100%",
    maxWidth: width - 40,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 16,
    overflow: "hidden",
  },
  photoPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  photoPreviewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  photoPreviewCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  photoPreviewImageContainer: {
    width: "100%",
    height: height * 0.6,
    backgroundColor: "#000",
  },
  photoPreviewImage: {
    width: "100%",
    height: "100%",
  },
  photoPreviewFooter: {
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  photoPreviewDate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  photoPreviewDescription: {
    fontSize: 14,
    color: "#CCCCCC",
  },
  bottomSpacing: {
    height: 40,
  },
});

export default StudentProfileModal;
