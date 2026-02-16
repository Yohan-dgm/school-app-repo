import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Modalize } from "react-native-modalize";
import { Picker } from "@react-native-picker/picker";
import EnhancedDashboardGrid from "../../educator/dashboard/components/EnhancedDashboardGrid";
import SummaryDashboard from "./components/SummaryDashboard";
import SimpleSummaryDashboard from "./components/SimpleSummaryDashboard";
import FullScreenModal from "./components/FullScreenModal";
import StudentsModalContent from "./components/StudentsModalContent";
import TeachersModalContent from "./components/TeachersModalContent";
import EducatorFeedbackModal from "./modals/EducatorFeedbackModal";
import EducatorFeedbackStatsModal from "./modals/EducatorFeedbackStatsModal";
import StudentFeedbackStatsModal from "./modals/StudentFeedbackStatsModal";
import StudentAttendanceModal from "./modals/StudentAttendanceModal";
import StudentAttendanceStatsModal from "./modals/StudentAttendanceStatsModal";
import AcademicReportsModal from "./modals/AcademicReportsModal";
import SchoolFacilitiesModal from "./modals/SchoolFacilitiesModal";
import FinancialOverviewModal from "./modals/FinancialOverviewModal";
import ParentCommunicationModal from "./modals/ParentCommunicationModal";
import EmergencyManagementModal from "./modals/EmergencyManagementModal";
import ClassTeacherModal from "./modals/ClassTeacherModal";
import SectionalHeadModal from "./modals/SectionalHeadModal";
import MyFeedbackModal from "./modals/MyFeedbackModal";
import StudentAchievementModal from "../../educator/dashboard/modals/StudentAchievementModal";
import GradeLevelClassSelectionDrawer from "../../../../components/common/drawer/GradeLevelClassSelectionDrawer";
import UniversalDrawerMenu from "../../../../components/common/drawer/UniversalDrawerMenu";
import { GradeLevelClass } from "../../../../api/grade-level-api";

export interface DashboardItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  gradient: [string, string];
  onPress: () => void;
}

interface FeedbackItem {
  id: string;
  studentName: string;
  studentTitle: string;
  admissionNumber: string;
  gradeLevel: string;
  studentPhoto: string;
  rating: number;
  category1: string;
  category2: string;
  category3: string;
  educatorName: string;
  timestamp: string;
  description: string;
  status: string;
}

const EducatorFeedbackContent = () => {
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterGrade, setFilterGrade] = useState("All");
  const [filterEducator, setFilterEducator] = useState("All");
  const [filterMainCategory, setFilterMainCategory] = useState("All");

  const [feedbackData, setFeedbackData] = useState<FeedbackItem[]>([
    {
      id: "1",
      studentName: "John Doe",
      studentTitle: "Master",
      admissionNumber: "ADM001",
      gradeLevel: "Grade 8",
      studentPhoto: "https://via.placeholder.com/100",
      rating: 4.5,
      category1: "Communication",
      category2: "Participation",
      category3: "Performance",
      educatorName: "Ms. Smith",
      timestamp: "5 Hours ago",
      description:
        "Excellent communication skills and active participation in class discussions.",
      status: "Pending Review",
    },
    {
      id: "2",
      studentName: "Jane Wilson",
      studentTitle: "Miss",
      admissionNumber: "ADM002",
      gradeLevel: "Grade 9",
      studentPhoto: "https://via.placeholder.com/100",
      rating: 3.8,
      category1: "Academic Performance",
      category2: "Behavior",
      category3: "Attendance",
      educatorName: "Mr. Johnson",
      timestamp: "16 July 2025 10:10 AM",
      description:
        "Good academic performance with room for improvement in behavior.",
      status: "Approved",
    },
    {
      id: "3",
      studentName: "Mike Brown",
      studentTitle: "Master",
      admissionNumber: "ADM003",
      gradeLevel: "Grade 7",
      studentPhoto: "https://via.placeholder.com/100",
      rating: 4.2,
      category1: "Creativity",
      category2: "Teamwork",
      category3: "Leadership",
      educatorName: "Ms. Davis",
      timestamp: "2 Days ago",
      description:
        "Shows excellent creativity and leadership skills in group projects.",
      status: "Under Review",
    },
    {
      id: "4",
      studentName: "Sarah Chen",
      studentTitle: "Miss",
      admissionNumber: "ADM004",
      gradeLevel: "Grade 10",
      studentPhoto: "https://via.placeholder.com/100",
      rating: 4.8,
      category1: "Leadership",
      category2: "Academic",
      category3: "Social Skills",
      educatorName: "Mr. Williams",
      timestamp: "1 Hour ago",
      description:
        "Outstanding leadership qualities and exceptional academic performance.",
      status: "Approved",
    },
    {
      id: "5",
      studentName: "David Kim",
      studentTitle: "Master",
      admissionNumber: "ADM005",
      gradeLevel: "Grade 6",
      studentPhoto: "https://via.placeholder.com/100",
      rating: 3.5,
      category1: "Effort",
      category2: "Improvement",
      category3: "Attitude",
      educatorName: "Ms. Garcia",
      timestamp: "3 Hours ago",
      description:
        "Showing consistent effort and positive attitude towards learning.",
      status: "Under Review",
    },
    {
      id: "6",
      studentName: "Emily Rodriguez",
      studentTitle: "Miss",
      admissionNumber: "ADM006",
      gradeLevel: "Grade 11",
      studentPhoto: "https://via.placeholder.com/100",
      rating: 4.3,
      category1: "Innovation",
      category2: "Problem Solving",
      category3: "Collaboration",
      educatorName: "Dr. Thompson",
      timestamp: "6 Hours ago",
      description:
        "Demonstrates innovative thinking and excellent problem-solving abilities.",
      status: "Pending Review",
    },
    {
      id: "7",
      studentName: "Alex Johnson",
      studentTitle: "Master",
      admissionNumber: "ADM007",
      gradeLevel: "Grade 9",
      studentPhoto: "https://via.placeholder.com/100",
      rating: 4.0,
      category1: "Sports",
      category2: "Teamwork",
      category3: "Discipline",
      educatorName: "Coach Martinez",
      timestamp: "1 Day ago",
      description:
        "Excellent sportsmanship and team player with great discipline.",
      status: "Approved",
    },
    {
      id: "8",
      studentName: "Lily Wang",
      studentTitle: "Miss",
      admissionNumber: "ADM008",
      gradeLevel: "Grade 12",
      studentPhoto: "https://via.placeholder.com/100",
      rating: 4.7,
      category1: "Research",
      category2: "Critical Thinking",
      category3: "Presentation",
      educatorName: "Prof. Anderson",
      timestamp: "4 Hours ago",
      description:
        "Outstanding research skills and exceptional critical thinking abilities.",
      status: "Under Review",
    },
    {
      id: "9",
      studentName: "Ryan Murphy",
      studentTitle: "Master",
      admissionNumber: "ADM009",
      gradeLevel: "Grade 8",
      studentPhoto: "https://via.placeholder.com/100",
      rating: 3.9,
      category1: "Music",
      category2: "Creativity",
      category3: "Practice",
      educatorName: "Ms. Foster",
      timestamp: "8 Hours ago",
      description: "Shows great musical talent and dedication to practice.",
      status: "Pending Review",
    },
    {
      id: "10",
      studentName: "Zoe Taylor",
      studentTitle: "Miss",
      admissionNumber: "ADM010",
      gradeLevel: "Grade 7",
      studentPhoto: "https://via.placeholder.com/100",
      rating: 4.4,
      category1: "Art",
      category2: "Expression",
      category3: "Technique",
      educatorName: "Mr. Clark",
      timestamp: "12 Hours ago",
      description:
        "Exceptional artistic expression and advanced technique development.",
      status: "Approved",
    },
    {
      id: "11",
      studentName: "Mason Lee",
      studentTitle: "Master",
      admissionNumber: "ADM011",
      gradeLevel: "Grade 10",
      studentPhoto: "https://via.placeholder.com/100",
      rating: 4.1,
      category1: "Science",
      category2: "Experiment",
      category3: "Analysis",
      educatorName: "Dr. Patel",
      timestamp: "15 Hours ago",
      description:
        "Strong scientific approach with excellent experimental analysis.",
      status: "Under Review",
    },
    {
      id: "12",
      studentName: "Sophia Green",
      studentTitle: "Miss",
      admissionNumber: "ADM012",
      gradeLevel: "Grade 11",
      studentPhoto: "https://via.placeholder.com/100",
      rating: 4.6,
      category1: "Writing",
      category2: "Literature",
      category3: "Discussion",
      educatorName: "Ms. Roberts",
      timestamp: "18 Hours ago",
      description:
        "Exceptional writing skills and insightful literary discussions.",
      status: "Approved",
    },
  ]);

  const [showAddEducatorModal, setShowAddEducatorModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddFeedbackModal, setShowAddFeedbackModal] = useState(false);

  const [newEducator, setNewEducator] = useState({
    name: "",
    title: "",
    photoUrl: "",
  });
  const [newCategory, setNewCategory] = useState({ name: "" });
  const [newFeedback, setNewFeedback] = useState({
    studentName: "",
    studentTitle: "",
    admissionNumber: "",
    gradeLevel: "",
    studentPhoto: "",
    rating: "0",
    category1: "",
    category2: "",
    category3: "",
    educatorName: "",
    description: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and search logic
  const filteredData = feedbackData.filter((item) => {
    const matchesSearch =
      searchText === "" ||
      item.studentName.toLowerCase().includes(searchText.toLowerCase()) ||
      item.admissionNumber.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description.toLowerCase().includes(searchText.toLowerCase());

    const matchesStatus =
      filterStatus === "All" || item.status === filterStatus;
    const matchesGrade =
      filterGrade === "All" || item.gradeLevel === filterGrade;
    const matchesEducator =
      filterEducator === "All" || item.educatorName === filterEducator;
    const matchesMainCategory =
      filterMainCategory === "All" || item.category1 === filterMainCategory;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesGrade &&
      matchesEducator &&
      matchesMainCategory
    );
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    searchText,
    filterStatus,
    filterGrade,
    filterEducator,
    filterMainCategory,
  ]);

  // Get unique values for filters
  const uniqueEducators = [
    ...new Set(feedbackData.map((item) => item.educatorName)),
  ];
  const uniqueMainCategories = [
    ...new Set(feedbackData.map((item) => item.category1)),
  ];
  const gradeOptions = [
    "Early Year 1",
    "Early Year 2",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
    "Grade 9",
    "Grade 10",
    "Grade 11",
    "Grade 12",
  ];
  const statusOptions = [
    "Counselor Review Required",
    "Revision Required",
    "Approve",
    "Cancel",
  ];

  const handleAddEducator = () => {
    if (newEducator.name.trim() && newEducator.title.trim()) {
      setNewEducator({ name: "", title: "", photoUrl: "" });
      setShowAddEducatorModal(false);
      Alert.alert("Success", "Educator added successfully");
    }
  };

  const handleAddCategory = () => {
    if (newCategory.name.trim()) {
      setNewCategory({ name: "" });
      setShowAddCategoryModal(false);
      Alert.alert("Success", "Category added successfully");
    }
  };

  const handleAddFeedback = () => {
    if (newFeedback.studentName.trim() && newFeedback.description.trim()) {
      const feedback: FeedbackItem = {
        id: Date.now().toString(),
        studentName: newFeedback.studentName,
        studentTitle: newFeedback.studentTitle,
        admissionNumber: newFeedback.admissionNumber,
        gradeLevel: newFeedback.gradeLevel,
        studentPhoto:
          newFeedback.studentPhoto || "https://via.placeholder.com/100",
        rating: parseFloat(newFeedback.rating),
        category1: newFeedback.category1,
        category2: newFeedback.category2,
        category3: newFeedback.category3,
        educatorName: newFeedback.educatorName,
        timestamp: "Just now",
        description: newFeedback.description,
        status: "Pending Review",
      };
      setFeedbackData([feedback, ...feedbackData]);
      setNewFeedback({
        studentName: "",
        studentTitle: "",
        admissionNumber: "",
        gradeLevel: "",
        studentPhoto: "",
        rating: "0",
        category1: "",
        category2: "",
        category3: "",
        educatorName: "",
        description: "",
      });
      setShowAddFeedbackModal(false);
      Alert.alert("Success", "Feedback added successfully");
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    setFeedbackData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item
      )
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this feedback?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setFeedbackData((prev) => prev.filter((item) => item.id !== id));
            Alert.alert("Success", "Feedback deleted successfully");
          },
        },
      ]
    );
  };

  return (
    <View style={educatorFeedbackStyles.container}>
      {/* Header with Action Buttons */}
      <View style={educatorFeedbackStyles.header}>
        {/* Top Buttons - Right Aligned */}
        <View style={educatorFeedbackStyles.headerTop}>
          <View style={educatorFeedbackStyles.resultsInfo}>
            <Text style={educatorFeedbackStyles.resultsCount}>
              {filteredData.length} feedback
              {filteredData.length !== 1 ? "s" : ""} found
            </Text>
          </View>
          <View style={educatorFeedbackStyles.headerButtons}>
            <TouchableOpacity
              style={educatorFeedbackStyles.headerButton}
              onPress={() => setShowAddFeedbackModal(true)}
            >
              <MaterialIcons name="add" size={18} color="#fff" />
              <Text style={educatorFeedbackStyles.headerButtonText}>
                Add Feedback
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={educatorFeedbackStyles.headerButton}
              onPress={() => setShowAddCategoryModal(true)}
            >
              <MaterialIcons name="category" size={18} color="#fff" />
              <Text style={educatorFeedbackStyles.headerButtonText}>
                Add Category
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={educatorFeedbackStyles.filterToggleButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <MaterialIcons
                name="tune"
                size={20}
                color={showFilters ? "#8B1538" : "#666"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={educatorFeedbackStyles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={educatorFeedbackStyles.searchInput}
            placeholder="Search students, admission number, or description..."
            placeholderTextColor="#666"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Status Filter Chips - Under Search */}
        <View style={educatorFeedbackStyles.statusChipsContainer}>
          <Text style={educatorFeedbackStyles.statusLabel}>Status:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={educatorFeedbackStyles.statusChipsScroll}
          >
            <TouchableOpacity
              style={[
                educatorFeedbackStyles.statusChip,
                filterStatus === "All" &&
                  educatorFeedbackStyles.statusChipActive,
              ]}
              onPress={() => setFilterStatus("All")}
            >
              <Text
                style={[
                  educatorFeedbackStyles.statusChipText,
                  filterStatus === "All" &&
                    educatorFeedbackStyles.statusChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  educatorFeedbackStyles.statusChip,
                  filterStatus === status &&
                    educatorFeedbackStyles.statusChipActive,
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Text
                  style={[
                    educatorFeedbackStyles.statusChipText,
                    filterStatus === status &&
                      educatorFeedbackStyles.statusChipTextActive,
                  ]}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Advanced Filters - Collapsible */}
        {showFilters && (
          <View style={educatorFeedbackStyles.filtersContainer}>
            <Text style={educatorFeedbackStyles.filtersTitle}>
              Advanced Filters
            </Text>

            <View style={educatorFeedbackStyles.filterRow}>
              <View style={educatorFeedbackStyles.filterItem}>
                <Text style={educatorFeedbackStyles.filterLabel}>
                  Grade Level
                </Text>
                <View style={educatorFeedbackStyles.pickerContainer}>
                  <Picker
                    selectedValue={filterGrade}
                    onValueChange={setFilterGrade}
                    style={educatorFeedbackStyles.filterPicker}
                  >
                    <Picker.Item label="All Grades" value="All" />
                    {gradeOptions.map((grade) => (
                      <Picker.Item key={grade} label={grade} value={grade} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={educatorFeedbackStyles.filterItem}>
                <Text style={educatorFeedbackStyles.filterLabel}>Educator</Text>
                <View style={educatorFeedbackStyles.pickerContainer}>
                  <Picker
                    selectedValue={filterEducator}
                    onValueChange={setFilterEducator}
                    style={educatorFeedbackStyles.filterPicker}
                  >
                    <Picker.Item label="All Educators" value="All" />
                    {uniqueEducators.map((educator) => (
                      <Picker.Item
                        key={educator}
                        label={educator}
                        value={educator}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={educatorFeedbackStyles.filterRow}>
              <View style={educatorFeedbackStyles.filterItem}>
                <Text style={educatorFeedbackStyles.filterLabel}>
                  Main Category
                </Text>
                <View style={educatorFeedbackStyles.pickerContainer}>
                  <Picker
                    selectedValue={filterMainCategory}
                    onValueChange={setFilterMainCategory}
                    style={educatorFeedbackStyles.filterPicker}
                  >
                    <Picker.Item label="All Categories" value="All" />
                    {uniqueMainCategories.map((category) => (
                      <Picker.Item
                        key={category}
                        label={category}
                        value={category}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={educatorFeedbackStyles.filterItem} />
            </View>

            {/* Clear Filters Button */}
            <TouchableOpacity
              style={educatorFeedbackStyles.clearFiltersButton}
              onPress={() => {
                setSearchText("");
                setFilterStatus("All");
                setFilterGrade("All");
                setFilterEducator("All");
                setFilterMainCategory("All");
              }}
            >
              <MaterialIcons name="clear" size={16} color="#8B1538" />
              <Text style={educatorFeedbackStyles.clearFiltersText}>
                Clear All Filters
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Feedback List */}
      <ScrollView
        style={educatorFeedbackStyles.feedbackList}
        showsVerticalScrollIndicator={false}
      >
        {paginatedData.map((item) => (
          <View key={item.id} style={educatorFeedbackStyles.feedbackItem}>
            {/* Student Info Header */}
            <View style={educatorFeedbackStyles.studentHeader}>
              <Image
                source={{ uri: item.studentPhoto }}
                style={educatorFeedbackStyles.studentPhoto}
              />
              <View style={educatorFeedbackStyles.studentInfo}>
                <Text style={educatorFeedbackStyles.studentName}>
                  {item.studentTitle} {item.studentName}
                </Text>
                <Text style={educatorFeedbackStyles.studentDetails}>
                  {item.admissionNumber} • {item.gradeLevel}
                </Text>
              </View>
              <View style={educatorFeedbackStyles.ratingContainer}>
                <MaterialIcons name="star" size={14} color="#FFD700" />
                <Text style={educatorFeedbackStyles.rating}>{item.rating}</Text>
              </View>
            </View>

            {/* Categories */}
            <View style={educatorFeedbackStyles.categoriesRow}>
              <View
                style={[
                  educatorFeedbackStyles.categoryChip,
                  educatorFeedbackStyles.mainCategory,
                ]}
              >
                <MaterialIcons name="star" size={12} color="#8B1538" />
                <Text style={educatorFeedbackStyles.mainCategoryText}>
                  {item.category1}
                </Text>
              </View>
              <View style={educatorFeedbackStyles.categoryChip}>
                <Text style={educatorFeedbackStyles.categoryText}>
                  {item.category2}
                </Text>
              </View>
              <View style={educatorFeedbackStyles.categoryChip}>
                <Text style={educatorFeedbackStyles.categoryText}>
                  {item.category3}
                </Text>
              </View>
            </View>

            {/* Feedback Content */}
            <Text style={educatorFeedbackStyles.description} numberOfLines={2}>
              {item.description}
            </Text>

            {/* Footer with Meta and Actions */}
            <View style={educatorFeedbackStyles.feedbackFooter}>
              <View style={educatorFeedbackStyles.metaInfo}>
                <Text style={educatorFeedbackStyles.educator}>
                  By {item.educatorName}
                </Text>
                <Text style={educatorFeedbackStyles.timestamp}>
                  {item.timestamp}
                </Text>
              </View>
              <View style={educatorFeedbackStyles.actionRow}>
                <Picker
                  selectedValue={item.status}
                  onValueChange={(value) => handleStatusChange(item.id, value)}
                  style={educatorFeedbackStyles.statusPicker}
                >
                  <Picker.Item label="Pending Review" value="Pending Review" />
                  <Picker.Item label="Under Review" value="Under Review" />
                  <Picker.Item label="Approved" value="Approved" />
                  <Picker.Item label="Needs Revision" value="Needs Revision" />
                  <Picker.Item
                    label="Counselor Review"
                    value="Counselor Review"
                  />
                </Picker>
                <TouchableOpacity
                  style={educatorFeedbackStyles.deleteButton}
                  onPress={() => handleDelete(item.id)}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={18}
                    color="#FF5252"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Pagination */}
      <View style={educatorFeedbackStyles.paginationContainer}>
        <View style={educatorFeedbackStyles.pagination}>
          <TouchableOpacity
            style={[
              educatorFeedbackStyles.paginationButton,
              currentPage === 1 && educatorFeedbackStyles.disabledButton,
            ]}
            onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <MaterialIcons
              name="chevron-left"
              size={20}
              color={currentPage === 1 ? "#666" : "#fff"}
            />
            <Text
              style={[
                educatorFeedbackStyles.paginationText,
                currentPage === 1 && educatorFeedbackStyles.disabledText,
              ]}
            >
              Previous
            </Text>
          </TouchableOpacity>

          <View style={educatorFeedbackStyles.pageIndicatorContainer}>
            <Text style={educatorFeedbackStyles.pageIndicator}>
              Page {currentPage} of {totalPages}
            </Text>
            <Text style={educatorFeedbackStyles.itemsIndicator}>
              {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredData.length)} of{" "}
              {filteredData.length}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              educatorFeedbackStyles.paginationButton,
              currentPage === totalPages &&
                educatorFeedbackStyles.disabledButton,
            ]}
            onPress={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
          >
            <Text
              style={[
                educatorFeedbackStyles.paginationText,
                currentPage === totalPages &&
                  educatorFeedbackStyles.disabledText,
              ]}
            >
              Next
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={currentPage === totalPages ? "#666" : "#fff"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Educator Modal */}
      <Modal visible={showAddEducatorModal} transparent animationType="fade">
        <View style={educatorFeedbackStyles.modalOverlay}>
          <View style={educatorFeedbackStyles.modalContent}>
            <View style={educatorFeedbackStyles.modalHeader}>
              <Text style={educatorFeedbackStyles.modalTitle}>
                Add Educator
              </Text>
              <TouchableOpacity onPress={() => setShowAddEducatorModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={educatorFeedbackStyles.input}
              placeholder="Name"
              placeholderTextColor="#666"
              value={newEducator.name}
              onChangeText={(text) =>
                setNewEducator({ ...newEducator, name: text })
              }
            />
            <TextInput
              style={educatorFeedbackStyles.input}
              placeholder="Title"
              placeholderTextColor="#666"
              value={newEducator.title}
              onChangeText={(text) =>
                setNewEducator({ ...newEducator, title: text })
              }
            />
            <TextInput
              style={educatorFeedbackStyles.input}
              placeholder="Photo URL"
              placeholderTextColor="#666"
              value={newEducator.photoUrl}
              onChangeText={(text) =>
                setNewEducator({ ...newEducator, photoUrl: text })
              }
            />
            <View style={educatorFeedbackStyles.modalButtons}>
              <TouchableOpacity
                style={educatorFeedbackStyles.cancelButton}
                onPress={() => setShowAddEducatorModal(false)}
              >
                <Text style={educatorFeedbackStyles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={educatorFeedbackStyles.saveButton}
                onPress={handleAddEducator}
              >
                <Text style={educatorFeedbackStyles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal visible={showAddCategoryModal} transparent animationType="fade">
        <View style={educatorFeedbackStyles.modalOverlay}>
          <View style={educatorFeedbackStyles.modalContent}>
            <View style={educatorFeedbackStyles.modalHeader}>
              <Text style={educatorFeedbackStyles.modalTitle}>
                Add Category
              </Text>
              <TouchableOpacity onPress={() => setShowAddCategoryModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={educatorFeedbackStyles.input}
              placeholder="Category Name"
              placeholderTextColor="#666"
              value={newCategory.name}
              onChangeText={(text) =>
                setNewCategory({ ...newCategory, name: text })
              }
            />
            <View style={educatorFeedbackStyles.modalButtons}>
              <TouchableOpacity
                style={educatorFeedbackStyles.cancelButton}
                onPress={() => setShowAddCategoryModal(false)}
              >
                <Text style={educatorFeedbackStyles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={educatorFeedbackStyles.saveButton}
                onPress={handleAddCategory}
              >
                <Text style={educatorFeedbackStyles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Feedback Modal */}
      <Modal visible={showAddFeedbackModal} transparent animationType="fade">
        <View style={educatorFeedbackStyles.modalOverlay}>
          <ScrollView style={educatorFeedbackStyles.modalScrollView}>
            <View style={educatorFeedbackStyles.modalContent}>
              <View style={educatorFeedbackStyles.modalHeader}>
                <Text style={educatorFeedbackStyles.modalTitle}>
                  Add Feedback
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAddFeedbackModal(false)}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={educatorFeedbackStyles.input}
                placeholder="Student Name"
                placeholderTextColor="#666"
                value={newFeedback.studentName}
                onChangeText={(text) =>
                  setNewFeedback({ ...newFeedback, studentName: text })
                }
              />
              <TextInput
                style={educatorFeedbackStyles.input}
                placeholder="Student Title (Mr/Ms/Master/Miss)"
                placeholderTextColor="#666"
                value={newFeedback.studentTitle}
                onChangeText={(text) =>
                  setNewFeedback({ ...newFeedback, studentTitle: text })
                }
              />
              <TextInput
                style={educatorFeedbackStyles.input}
                placeholder="Admission Number"
                placeholderTextColor="#666"
                value={newFeedback.admissionNumber}
                onChangeText={(text) =>
                  setNewFeedback({ ...newFeedback, admissionNumber: text })
                }
              />
              <TextInput
                style={educatorFeedbackStyles.input}
                placeholder="Grade Level"
                placeholderTextColor="#666"
                value={newFeedback.gradeLevel}
                onChangeText={(text) =>
                  setNewFeedback({ ...newFeedback, gradeLevel: text })
                }
              />
              <TextInput
                style={educatorFeedbackStyles.input}
                placeholder="Student Photo URL"
                placeholderTextColor="#666"
                value={newFeedback.studentPhoto}
                onChangeText={(text) =>
                  setNewFeedback({ ...newFeedback, studentPhoto: text })
                }
              />
              <TextInput
                style={educatorFeedbackStyles.input}
                placeholder="Rating (0-5)"
                placeholderTextColor="#666"
                value={newFeedback.rating}
                onChangeText={(text) =>
                  setNewFeedback({ ...newFeedback, rating: text })
                }
                keyboardType="numeric"
              />
              <TextInput
                style={educatorFeedbackStyles.input}
                placeholder="Category 1 (Main)"
                placeholderTextColor="#666"
                value={newFeedback.category1}
                onChangeText={(text) =>
                  setNewFeedback({ ...newFeedback, category1: text })
                }
              />
              <TextInput
                style={educatorFeedbackStyles.input}
                placeholder="Category 2"
                placeholderTextColor="#666"
                value={newFeedback.category2}
                onChangeText={(text) =>
                  setNewFeedback({ ...newFeedback, category2: text })
                }
              />
              <TextInput
                style={educatorFeedbackStyles.input}
                placeholder="Category 3"
                placeholderTextColor="#666"
                value={newFeedback.category3}
                onChangeText={(text) =>
                  setNewFeedback({ ...newFeedback, category3: text })
                }
              />
              <TextInput
                style={educatorFeedbackStyles.input}
                placeholder="Educator Name"
                placeholderTextColor="#666"
                value={newFeedback.educatorName}
                onChangeText={(text) =>
                  setNewFeedback({ ...newFeedback, educatorName: text })
                }
              />
              <TextInput
                style={[
                  educatorFeedbackStyles.input,
                  educatorFeedbackStyles.textArea,
                ]}
                placeholder="Description"
                placeholderTextColor="#666"
                value={newFeedback.description}
                onChangeText={(text) =>
                  setNewFeedback({ ...newFeedback, description: text })
                }
                multiline
                numberOfLines={4}
              />
              <View style={educatorFeedbackStyles.modalButtons}>
                <TouchableOpacity
                  style={educatorFeedbackStyles.cancelButton}
                  onPress={() => setShowAddFeedbackModal(false)}
                >
                  <Text style={educatorFeedbackStyles.cancelButtonText}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={educatorFeedbackStyles.saveButton}
                  onPress={handleAddFeedback}
                >
                  <Text style={educatorFeedbackStyles.saveButtonText}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

function PrincipalDashboardMain() {
  // Full-screen modal state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // My Class drawer states
  const [selectedClassData, setSelectedClassData] = useState<
    (GradeLevelClass & { gradeLevelName: string }) | null
  >(null);
  const [showUniversalDrawer, setShowUniversalDrawer] = useState(false);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [showClassSelectionDrawer, setShowClassSelectionDrawer] =
    useState(false);

  // Modal refs
  // Updated to use FullScreenModal pattern
  const academicReportsModalRef = useRef<Modalize>(null);
  const schoolFacilitiesModalRef = useRef<Modalize>(null);
  const financialOverviewModalRef = useRef<Modalize>(null);
  const parentCommunicationModalRef = useRef<Modalize>(null);
  const emergencyManagementModalRef = useRef<Modalize>(null);

  // Handlers
  const handleFullScreenPress = (itemId: string) => {
    setActiveModal(itemId);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  const openEducatorFeedbackModal = () => {
    setActiveModal("educator_feedback");
  };

  const openStudentAttendanceModal = () => {
    setActiveModal("student_attendance");
  };

  const openEducatorFeedbackStatsModal = () => {
    setActiveModal("educator_feedback_stats");
  };

  const openStudentFeedbackStatsModal = () => {
    setActiveModal("student_feedback_stats");
  };

  const openStudentAttendanceStatsModal = () => {
    setActiveModal("student_attendance_stats");
  };

  const openClassTeachersModal = () => {
    setActiveModal("class_teachers");
  };

  const openSectionalHeadsModal = () => {
    setActiveModal("sectional_heads");
  };

  const openMyFeedbackModal = () => {
    setActiveModal("my_feedback");
  };

  const openStudentAchievementModal = () => {
    setActiveModal("student_achievement");
  };

  const openMyClassDrawer = () => {
    console.log("🔔 Opening Grade Level Class Selection Drawer...");
    setShowClassSelectionDrawer(true);
  };

  const handleClassSelection = (
    classData: GradeLevelClass & { gradeLevelName: string }
  ) => {
    console.log(
      "✅ Class selected in GradeLevelClassSelectionDrawer...",
      classData
    );
    setSelectedClassData(classData);
  };

  const handleCloseUniversalDrawer = () => {
    setShowUniversalDrawer(false);
    setShowStudentDetails(false);
    setSelectedClassData(null);
  };

  const handleBackFromStudentDetails = () => {
    setShowStudentDetails(false);
    setShowClassSelectionDrawer(true);
  };

  const handleCloseClassSelectionDrawer = () => {
    setShowClassSelectionDrawer(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const renderModalContent = (modalId: string) => {
    // Educator feedback now uses the dedicated modal component
    if (modalId === "educator_feedback") {
      return null; // Handled by separate EducatorFeedbackModal component
    }

    // Student attendance now uses the dedicated modal component
    if (modalId === "student_attendance") {
      return null; // Handled by separate StudentAttendanceModal component
    }

    // Students modal now uses the dedicated component with real API integration
    if (modalId === "all_students") {
      return <StudentsModalContent />;
    }
    // Teachers modal now uses the dedicated component with real API integration
    if (modalId === "all_teachers") {
      return <TeachersModalContent />;
    }

    const modalConfig = {
      all_teachers: {
        title: "Teachers Dashboard",
        icon: "people",
        content:
          "Staff directory with performance metrics, scheduling tools, and communication features.",
      },
      sport_coaches: {
        title: "Sports Dashboard",
        icon: "sports-soccer",
        content:
          "Sports management system with team rosters, training schedules, and performance tracking.",
      },
      announcements: {
        title: "Communications Dashboard",
        icon: "campaign",
        content:
          "School-wide communication hub with announcements, notifications, and messaging.",
      },
    };

    const config = modalConfig[modalId as keyof typeof modalConfig];
    if (!config) return null;

    return (
      <View style={styles.fullScreenContent}>
        <View style={styles.modalIconContainer}>
          <MaterialIcons name={config.icon as any} size={48} color="#920734" />
        </View>
        <Text style={styles.fullScreenTitle}>{config.title}</Text>
        <Text style={styles.fullScreenDescription}>{config.content}</Text>

        {/* Dynamic content grid */}
        <View style={styles.featureGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <TouchableOpacity key={item} style={styles.featureCard}>
              <MaterialIcons
                name={item % 2 === 0 ? "analytics" : "dashboard"}
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.featureCardText}>Feature {item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.primaryActionButton}>
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Add New</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryActionButton}>
            <MaterialIcons name="settings" size={20} color="#920734" />
            <Text style={styles.secondaryActionButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const dashboardItems: DashboardItem[] = [
    {
      id: "my_class",
      title: "My Class",
      subtitle: "Student Details & Management",
      icon: "class",
      color: "#920734",
      gradient: ["#920734", "#b8285a"],
      onPress: openMyClassDrawer,
    },
    {
      id: "student_achievement",
      title: "Student Achievement",
      subtitle: "Record Student Achievements",
      icon: "emoji-events",
      color: "#FFD700",
      gradient: ["#FFD700", "#FFA500"],
      onPress: openStudentAchievementModal,
    },
    {
      id: "all_students",
      title: "All Students",
      subtitle: "Student Management",
      icon: "school",
      color: "#0057FF",
      gradient: ["#0057FF", "#3d7cff"],
      onPress: () => handleFullScreenPress("all_students"),
    },
    {
      id: "all_teachers",
      title: "All Teachers",
      subtitle: "Staff Directory",
      icon: "people",
      color: "#920734",
      gradient: ["#920734", "#b8285a"],
      onPress: () => handleFullScreenPress("all_teachers"),
    },
    // {
    //   id: "sport_coaches",
    //   title: "Sport Coaches",
    //   subtitle: "Sports Management",
    //   icon: "sports-soccer",
    //   color: "#0057FF",
    //   gradient: ["#0057FF", "#3d7cff"],
    //   onPress: () => sportCoachesModalRef.current?.open(),
    // },
    {
      id: "educator_feedback",
      title: "Educator Feedback",
      subtitle: "Performance Reviews",
      icon: "rate-review",
      color: "#920734",
      gradient: ["#920734", "#b8285a"],
      onPress: openEducatorFeedbackModal,
    },
    {
      id: "educator_feedback_stats",
      title: "Feedback Statistics",
      subtitle: "Educator Analytics",
      icon: "analytics",
      color: "#0057FF",
      gradient: ["#0057FF", "#3d7cff"],
      onPress: openEducatorFeedbackStatsModal,
    },
    {
      id: "student_feedback_stats",
      title: "Student Analytics",
      subtitle: "Feedback by Students",
      icon: "school",
      color: "#920734",
      gradient: ["#920734", "#b8285a"],
      onPress: openStudentFeedbackStatsModal,
    },
    {
      id: "student_attendance",
      title: "Student Attendance",
      subtitle: "Attendance Management",
      icon: "how-to-reg",
      color: "#0057FF",
      gradient: ["#0057FF", "#3d7cff"],
      onPress: openStudentAttendanceModal,
    },
    {
      id: "class_teachers",
      title: "Class Teachers",
      subtitle: "Teacher Assignments",
      icon: "people-outline",
      color: "#920734",
      gradient: ["#920734", "#b8285a"],
      onPress: openClassTeachersModal,
    },
    {
      id: "sectional_heads",
      title: "Sectional Heads",
      subtitle: "Grade Level Leaders",
      icon: "school",
      color: "#920734",
      gradient: ["#920734", "#b8285a"],
      onPress: openSectionalHeadsModal,
    },
    // {
    //   id: "student_attendance_stats",
    //   title: "Attendance Analytics",
    //   subtitle: "Student Attendance Stats",
    //   icon: "analytics",
    //   color: "#059669",
    //   gradient: ["#059669", "#10B981"],
    //   onPress: openStudentAttendanceStatsModal,
    // },
    {
      id: "my_feedback",
      title: "My Feedbacks",
      subtitle: "Feedbacks I Created",
      icon: "person",
      color: "#10B981",
      gradient: ["#10B981", "#059669"],
      onPress: openMyFeedbackModal,
    },
    // {
    //   id: "announcements",
    //   title: "Announcements",
    //   subtitle: "School Communications",
    //   icon: "campaign",
    //   color: "#0057FF",
    //   gradient: ["#0057FF", "#3d7cff"],
    //   onPress: () => announcementsModalRef.current?.open(),
    // },
    // {
    //   id: "academic_reports",
    //   title: "Academic Reports",
    //   subtitle: "Performance Analytics",
    //   icon: "assessment",
    //   color: "#920734",
    //   gradient: ["#920734", "#b8285a"],
    //   onPress: () => academicReportsModalRef.current?.open(),
    // },
    // {
    //   id: "school_facilities",
    //   title: "School Facilities",
    //   subtitle: "Infrastructure Management",
    //   icon: "business",
    //   color: "#0057FF",
    //   gradient: ["#0057FF", "#3d7cff"],
    //   onPress: () => schoolFacilitiesModalRef.current?.open(),
    // },
    // {
    //   id: "financial_overview",
    //   title: "Financial Overview",
    //   subtitle: "Budget & Expenses",
    //   icon: "account-balance",
    //   color: "#920734",
    //   gradient: ["#920734", "#b8285a"],
    //   onPress: () => financialOverviewModalRef.current?.open(),
    // },
    // {
    //   id: "parent_communications",
    //   title: "Parent Communications",
    //   subtitle: "Parent-School Hub",
    //   icon: "family-restroom",
    //   color: "#0057FF",
    //   gradient: ["#0057FF", "#3d7cff"],
    //   onPress: () => parentCommunicationModalRef.current?.open(),
    // },
    // {
    //   id: "emergency_management",
    //   title: "Emergency Management",
    //   subtitle: "Safety & Protocols",
    //   icon: "emergency",
    //   color: "#920734",
    //   gradient: ["#920734", "#b8285a"],
    //   onPress: () => emergencyManagementModalRef.current?.open(),
    // },
  ];

  return (
    <View style={styles.container}>
      {/* Content with Summary Dashboard */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#920734"
            colors={["#920734"]}
          />
        }
      >
        {/* Summary Dashboard */}
        <SimpleSummaryDashboard />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Main Dashboard Grid */}
        <View style={styles.mainGridSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <EnhancedDashboardGrid
            items={dashboardItems}
            onFullScreenPress={handleFullScreenPress}
          />
        </View>
      </ScrollView>

      {/* Modals */}
      <EducatorFeedbackModal
        visible={activeModal === "educator_feedback"}
        onClose={handleCloseModal}
      />
      <EducatorFeedbackStatsModal
        visible={activeModal === "educator_feedback_stats"}
        onClose={handleCloseModal}
      />
      <StudentFeedbackStatsModal
        visible={activeModal === "student_feedback_stats"}
        onClose={handleCloseModal}
      />
      <StudentAttendanceModal
        visible={activeModal === "student_attendance"}
        onClose={handleCloseModal}
      />
      <StudentAttendanceStatsModal
        visible={activeModal === "student_attendance_stats"}
        onClose={handleCloseModal}
      />
      <ClassTeacherModal
        visible={activeModal === "class_teachers"}
        onClose={handleCloseModal}
      />
      <SectionalHeadModal
        visible={activeModal === "sectional_heads"}
        onClose={handleCloseModal}
      />
      <MyFeedbackModal
        visible={activeModal === "my_feedback"}
        onClose={handleCloseModal}
      />
      <StudentAchievementModal
        visible={activeModal === "student_achievement"}
        onClose={handleCloseModal}
      />
      <AcademicReportsModal ref={academicReportsModalRef} />
      <SchoolFacilitiesModal ref={schoolFacilitiesModalRef} />
      <FinancialOverviewModal ref={financialOverviewModalRef} />
      <ParentCommunicationModal ref={parentCommunicationModalRef} />
      <EmergencyManagementModal ref={emergencyManagementModalRef} />
      {showClassSelectionDrawer && (
        <GradeLevelClassSelectionDrawer
          onClose={handleCloseClassSelectionDrawer}
          onSelectClass={handleClassSelection}
        />
      )}

      {showUniversalDrawer && (
        <UniversalDrawerMenu
          onClose={handleCloseUniversalDrawer}
          showStudentDetails={showStudentDetails}
          selectedClassId={selectedClassData?.id}
          selectedClassName={selectedClassData?.name}
          selectedGradeLevelName={selectedClassData?.gradeLevelName}
          onBack={handleBackFromStudentDetails}
        />
      )}

      {/* Full-Screen Modal */}
      {activeModal &&
        activeModal !== "educator_feedback" &&
        activeModal !== "educator_feedback_stats" &&
        activeModal !== "student_feedback_stats" &&
        activeModal !== "student_attendance" &&
        activeModal !== "student_attendance_stats" &&
        activeModal !== "class_teachers" &&
        activeModal !== "sectional_heads" &&
        activeModal !== "my_feedback" &&
        activeModal !== "student_achievement" && (
          <FullScreenModal
            visible={!!activeModal}
            onClose={handleCloseModal}
            title={(() => {
              const modalConfig = {
                all_students: "Students Dashboard",
                all_teachers: "Teachers Dashboard",
                sport_coaches: "Sports Dashboard",
                announcements: "Communications Dashboard",
                student_attendance: "Student Attendance Dashboard",
              };
              return (
                modalConfig[activeModal as keyof typeof modalConfig] ||
                "Dashboard"
              );
            })()}
            backgroundColor="#F8F9FA"
          >
            {renderModalContent(activeModal)}
          </FullScreenModal>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: "white",
    borderBottomWidth: 0,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    color: "#1a1a1a",
    textAlign: "center",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    marginBottom: 50,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 10,
    marginVertical: 5,
  },
  mainGridSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 1,
    marginTop: 1,
  },
  fullScreenContent: {
    flex: 1,
    padding: 30,
    backgroundColor: "#FFFFFF",
  },
  modalIconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  fullScreenTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 16,
    textAlign: "center",
  },
  fullScreenDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 40,
  },
  featureCard: {
    width: "22%",
    aspectRatio: 1,
    backgroundColor: "#920734",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureCardText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: "#920734",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#920734",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryActionButtonText: {
    color: "#920734",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

const educatorFeedbackStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultsInfo: {
    flex: 1,
  },

  headerButtons: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2c2c2c",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  headerButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  filterToggleButton: {
    padding: 8,
    backgroundColor: "#f8f8f8",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    paddingHorizontal: 8,
  },
  filterButton: {
    padding: 4,
  },
  filtersContainer: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterPicker: {
    height: 40,
  },
  clearFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#8B1538",
    gap: 6,
  },
  clearFiltersText: {
    color: "#8B1538",
    fontSize: 12,
    fontWeight: "600",
  },
  resultsHeader: {
    paddingVertical: 4,
  },
  resultsCount: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  // resultsCount: {
  //   fontSize: 13,
  //   color: "#666",
  //   fontWeight: "600",
  // },
  feedbackList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  feedbackItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  studentPhoto: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f0f0f0",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    color: "#2c2c2c",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  studentDetails: {
    color: "#666",
    fontSize: 12,
    fontWeight: "500",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  rating: {
    color: "#2c2c2c",
    fontSize: 12,
    fontWeight: "700",
  },
  categoriesRow: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 8,
    flexWrap: "wrap",
  },
  categoryChip: {
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d0d0d0",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mainCategory: {
    backgroundColor: "#fff",
    borderColor: "#8B1538",
    borderWidth: 1.5,
  },
  mainCategoryText: {
    color: "#8B1538",
    fontSize: 11,
    fontWeight: "700",
  },
  categoryText: {
    color: "#555",
    fontSize: 11,
    fontWeight: "600",
  },
  description: {
    color: "#2c2c2c",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
    fontWeight: "400",
  },
  feedbackFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaInfo: {
    flex: 1,
  },
  educator: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 3,
  },
  timestamp: {
    color: "#888",
    fontSize: 11,
    fontWeight: "400",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusPicker: {
    backgroundColor: "#f8f8f8",
    height: 34,
    width: 130,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d0d0d0",
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ff4444",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  paginationButton: {
    backgroundColor: "#8B1538",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  paginationText: {
    color: "#fff",
    fontWeight: "600",
  },
  disabledText: {
    color: "#666",
  },
  pageIndicator: {
    color: "#2c2c2c",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalScrollView: {
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#1a1a1a",
    fontSize: 20,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    color: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#000",
    fontWeight: "600",
  },
});

export default PrincipalDashboardMain;
