import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useGetStudentExamDataQuery } from "../../api/student-exam-api";
import { ExamDrawerProps, ExamDrawerTab } from "../../types/student-exam";
import ExamSubjectsSection from "./ExamSubjectsSection";
import ExamReportsSection from "./ExamReportsSection";
import ExamDetailsSection from "./ExamDetailsSection";

const { height: screenHeight } = Dimensions.get("window");
const DRAWER_HEIGHT = screenHeight * 0.8;

const StudentExamDrawer: React.FC<ExamDrawerProps> = ({
  visible,
  onClose,
  studentId,
}) => {
  const [activeTab, setActiveTab] = useState<ExamDrawerTab>("subjects");
  const slideAnim = useRef(new Animated.Value(DRAWER_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Fetch exam data
  const {
    data: examData,
    isLoading,
    error,
    refetch,
  } = useGetStudentExamDataQuery(
    { studentId },
    { skip: !visible || !studentId },
  );

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: DRAWER_HEIGHT,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: DRAWER_HEIGHT,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const renderTabButton = (tab: ExamDrawerTab, label: string, icon: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.activeTab]}
      onPress={() => setActiveTab(tab)}
    >
      <MaterialIcons
        name={icon as any}
        size={20}
        color={activeTab === tab ? "#007AFF" : "#666"}
      />
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading exam data...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>Failed to load exam data</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!examData?.data) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="school" size={48} color="#999" />
          <Text style={styles.emptyText}>No exam data available</Text>
        </View>
      );
    }

    switch (activeTab) {
      case "subjects":
        return <ExamSubjectsSection data={examData.data} />;
      case "overview":
        return (
          <View style={styles.overviewContainer}>
            <Text style={styles.overviewTitle}>Exam Overview</Text>
            <Text style={styles.overviewText}>
              Total Exams: {examData.data.student_exam_marks?.length || 0}
            </Text>
            <Text style={styles.overviewText}>
              Total Subjects:{" "}
              {examData.data.student_exam_subject_marks?.length || 0}
            </Text>
            <Text style={styles.overviewText}>
              Reports Available:{" "}
              {examData.data.student_exam_reports?.length || 0}
            </Text>
          </View>
        );
      case "details":
        return <ExamDetailsSection data={examData.data} />;
      case "reports":
        return <ExamReportsSection data={examData.data} />;
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Student Exam Data</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {renderTabButton("subjects", "Subjects", "subject")}
          {renderTabButton("overview", "Overview", "dashboard")}
          {renderTabButton("details", "Details", "list-alt")}
          {renderTabButton("reports", "Reports", "description")}
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderContent()}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  overlayTouchable: {
    flex: 1,
  },

  // Drawer
  drawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: DRAWER_HEIGHT,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "500",
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Center containers
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
  },

  // Overview
  overviewContainer: {
    padding: 16,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  overviewText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
});

export default StudentExamDrawer;
