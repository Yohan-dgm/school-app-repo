import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { MaterialIcons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import StarRating from "react-native-star-rating-widget";
import { theme } from "../../../../../styles/theme";
import AddCategoryPopup from "../../../../../components/educator-feedback/AddCategoryPopup";
import { USER_CATEGORIES } from "../../../../../constants/userCategories";
import {
  fetchEducatorFeedbacks,
  submitEducatorFeedback,
} from "../../../../../state-store/slices/educator/educatorFeedbackSlice";
import {
  useGetStudentListDataQuery,
  useGetStudentsByGradeQuery,
} from "../../../../../api/educator-feedback-api";

// Import FRONTEND_GRADES constant
const FRONTEND_GRADES = [
  { id: 1, name: "Grade 1", active: true },
  { id: 2, name: "Grade 2", active: true },
  { id: 3, name: "Grade 3", active: true },
  { id: 4, name: "Grade 4", active: true },
  { id: 5, name: "Grade 5", active: true },
  { id: 6, name: "Grade 6", active: true },
  { id: 7, name: "Grade 7", active: true },
  { id: 8, name: "Grade 8", active: true },
  { id: 9, name: "Grade 9", active: true },
  { id: 10, name: "Grade 10", active: true },
  { id: 11, name: "Grade 11", active: true },
  { id: 12, name: "Grade 12", active: true },
  { id: 13, name: "EY1", active: true },
  { id: 14, name: "EY2", active: true },
  { id: 15, name: "EY3", active: true },
];
// import { groupFeedbackByStudent } from "../../../../../data/educatorFeedbackData";

// Import fallback profile image
const defaultProfileImage = require("../../../../../assets/images/sample-profile.png");

const EducatorFeedbackDrawer = ({ modalRef }) => {
  const dispatch = useDispatch();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [showAddCategoryPopup, setShowAddCategoryPopup] = useState(false);

  // Network state management
  const [isConnected, setIsConnected] = useState(true);
  const [networkType, setNetworkType] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [submissionError, setSubmissionError] = useState(null);

  // Helper function to safely get profile image
  const getProfileImage = (student) => {
    try {
      if (student && student.profile_picture) {
        return { uri: student.profile_picture };
      }
      return defaultProfileImage;
    } catch (error) {
      console.warn("Error loading profile image:", error);
      return defaultProfileImage;
    }
  };
  const [rating, setRating] = useState(0);

  // Safe rating setter to ensure integer values
  const handleRatingChange = (newRating) => {
    const safeRating = Math.round(
      Math.max(0, Math.min(5, Number(newRating) || 0))
    );
    setRating(safeRating);
  };
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [comment, setComment] = useState("");

  // Get global state
  const { sessionData } = useSelector((state) => state.app);
  const { feedbacks, loading, error, submitting } = useSelector(
    (state) => state.educatorFeedback
  );

  // API hooks for grade and student data
  const {
    data: studentListData,
    error: studentListError,
    isLoading: studentListLoading,
  } = useGetStudentListDataQuery();

  const {
    data: studentsData,
    error: studentsError,
    isLoading: studentsLoading,
    refetch: refetchStudents,
  } = useGetStudentsByGradeQuery(
    { grade_level_id: selectedGrade?.id },
    { skip: !selectedGrade?.id }
  );

  // Console logging for API testing
  useEffect(() => {
    console.log("🎓 Grade List Data:", studentListData);
    if (studentListError) {
      console.error("❌ Grade List Error:", studentListError);
    }
  }, [studentListData, studentListError]);

  useEffect(() => {
    console.log(
      "👥 Students Data for grade",
      selectedGrade?.name,
      ":",
      studentsData
    );
    if (studentsError) {
      console.error("❌ Students Error:", studentsError);
    }
  }, [studentsData, studentsError, selectedGrade]);

  // Debug selected grade changes
  useEffect(() => {
    console.log("🎯 Selected Grade Changed:", selectedGrade);
    console.log("📊 Available static students:", classStudents.length);
    console.log(
      "📊 Students by grade:",
      classStudents.reduce((acc, student) => {
        acc[student.grade_level_id] = (acc[student.grade_level_id] || 0) + 1;
        return acc;
      }, {})
    );
  }, [selectedGrade]);

  // Student data with different grade levels for testing
  const classStudents = [
    // Grade 1 Students
    {
      id: 1,
      student_calling_name: "Sayon Thevsas",
      full_name: "Master. Dasanayalka Mudiyanselage Sayon Thevsas",
      admission_number: "NY24/036",
      grade: "Grade 1",
      grade_level_id: 1,
      profile_picture: null,
    },
    {
      id: 2,
      student_calling_name: "Ayaan Nimneth",
      full_name: "Master. Athalage Don Ayaan Nimneth",
      admission_number: "NY24/009",
      grade: "Grade 1",
      grade_level_id: 1,
      profile_picture: null,
    },
    {
      id: 3,
      student_calling_name: "Ayan Vindeew",
      full_name: "Master. Ayan Vindeew Hapugala",
      admission_number: "NY24/014",
      grade: "Grade 1",
      grade_level_id: 1,
      profile_picture: null,
    },
    // Grade 2 Students
    {
      id: 4,
      student_calling_name: "Vihani Sehansa",
      full_name: "Miss. Gamaathige Vihani Sehansa Wijerathne",
      admission_number: "NY24/002",
      grade: "Grade 2",
      grade_level_id: 2,
      profile_picture: null,
    },
    {
      id: 5,
      student_calling_name: "Upeksha Sathsarani",
      full_name: "Miss. Godakumbure Gedara Upeksha Sathsarani Bandara",
      admission_number: "NY24/313",
      grade: "Grade 2",
      grade_level_id: 2,
      profile_picture: null,
    },
    // Grade 3 Students
    {
      id: 6,
      student_calling_name: "Sehas Saswindu",
      full_name: "Master. Dissanayaka Mudiyanselage Sehas Saswindu Bandara",
      admission_number: "NY24/281",
      grade: "Grade 3",
      grade_level_id: 3,
      profile_picture: null,
    },
    {
      id: 7,
      student_calling_name: "Dihansa Randuli",
      full_name: "Miss. Mudannayake Appuhamilage Dihansa Randuli Mudannayaka",
      admission_number: "NY24/022",
      grade: "Grade 3",
      grade_level_id: 3,
      profile_picture: null,
    },
    // Grade 4 Students
    {
      id: 8,
      student_calling_name: "Yumeth Yasodha",
      full_name: "Master. Gammanchiralage Yumeth Yasodha Wijesiri",
      admission_number: "NY24/365",
      grade: "Grade 4",
      grade_level_id: 4,
      profile_picture: null,
    },
    {
      id: 9,
      student_calling_name: "Yesandu Yesath",
      full_name:
        "Master. Heenkenda Mudiyanselage Yesandu Yesath Bandara Heenkenda",
      admission_number: "NY24/020",
      grade: "Grade 4",
      grade_level_id: 4,
      profile_picture: null,
    },
    // Grade 5 Students
    {
      id: 10,
      student_calling_name: "Didula Damsara",
      full_name: "Master. Dahanayaka Ralalage Didula Damsara Rupasingha",
      admission_number: "NY24/005",
      grade: "Grade 5",
      grade_level_id: 5,
      profile_picture: null,
    },
    {
      id: 11,
      student_calling_name: "Lumini Lisanga",
      full_name: "Miss. Kanda Thalappulige Lumini Lisanga",
      admission_number: "NY24/004",
      grade: "Grade 5",
      grade_level_id: 5,
      profile_picture: null,
    },
  ];

  // Feedback categories based on Multiple Intelligence Theory
  const feedbackCategories = [
    {
      id: "mathematical_logical",
      label: "Mathematical / Logical Intelligence",
      color: "#4CAF50",
    },
    { id: "linguistic", label: "Linguistic Intelligence", color: "#2196F3" },
    {
      id: "interpersonal",
      label: "Interpersonal Intelligence",
      color: "#FF9800",
    },
    {
      id: "intrapersonal",
      label: "Intrapersonal Intelligence",
      color: "#9C27B0",
    },
    { id: "music", label: "Music Intelligence", color: "#F44336" },
    {
      id: "bodily_kinesthetic",
      label: "Bodily Kinesthetic Intelligence",
      color: "#E91E63",
    },
    {
      id: "attendance_punctuality",
      label: "Attendance and Punctuality",
      color: "#607D8B",
    },
  ];

  // Network connectivity monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
      setNetworkType(state.type);

      // Clear errors when network is restored
      if (state.isConnected && submissionError) {
        setSubmissionError(null);
      }
    });

    // Get initial network state
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? false);
      setNetworkType(state.type);
    });

    return unsubscribe;
  }, [submissionError]);

  // Fetch existing feedbacks on component mount
  useEffect(() => {
    dispatch(fetchEducatorFeedbacks({ page: 1, limit: 50 }));
  }, [dispatch]);

  // Generate mock feedbacks from the grouped data (commented out due to import issues)
  // const generateMockFeedbacks = () => {
  //   const groupedData = groupFeedbackByStudent();
  //   return groupedData
  //     .map((studentData, index) => {
  //       // Find matching student from classStudents
  //       const student = classStudents.find(
  //         (s) => s.admission_number === studentData.admissionNumber
  //       );

  //       if (!student) return null;

  //       // Calculate average score
  //       const averageScore =
  //         studentData.feedbacks.reduce((sum, f) => sum + f.score, 0) /
  //         studentData.feedbacks.length;

  //       // Get all categories
  //       const categories = studentData.feedbacks.map((f) => f.category);

  //       // Combine all descriptions
  //       const comment = studentData.feedbacks
  //         .map((f) => f.description)
  //         .join(". ");

  //       return {
  //         id: index + 1,
  //         student,
  //         rating: Math.round(averageScore),
  //         categories,
  //         comment,
  //         status: "Approved",
  //         created_by: "Ms. Sarah Johnson",
  //         approved_by: "Principal Mr. Asanka",
  //         created_at: new Date(
  //           Date.now() - index * 24 * 60 * 60 * 1000
  //         ).toISOString(),
  //         revision_instructions: null,
  //       };
  //     })
  //     .filter(Boolean);
  // };

  // Simple mock feedbacks to avoid import issues
  const mockFeedbacks = [
    {
      id: 1,
      student: classStudents[0], // Sayon Thevsas
      rating: 5,
      categories: ["mathematical_logical", "attendance_punctuality"],
      comment:
        "Demonstrates strong understanding and confidence in Mathematics. Shows excellent attendance and punctuality.",
      status: "Approved",
      created_by: "Ms. Sarah Johnson",
      approved_by: "Principal Mr. Asanka",
      created_at: "2025-01-15T10:30:00Z",
      revision_instructions: null,
    },
    {
      id: 2,
      student: classStudents[1], // Ayaan Nimneth
      rating: 5,
      categories: [
        "intrapersonal",
        "interpersonal",
        "music",
        "bodily_kinesthetic",
        "attendance_punctuality",
      ],
      comment:
        "Dress code and personal cleanliness are maintained well. Shows excellent observation and analytical skills.",
      status: "Approved",
      created_by: "Ms. Sarah Johnson",
      approved_by: "Principal Mr. Asanka",
      created_at: "2025-01-14T14:20:00Z",
      revision_instructions: null,
    },
  ];

  // Use Redux feedbacks if available, otherwise use mock data
  const existingFeedbacks = feedbacks.length > 0 ? feedbacks : mockFeedbacks;

  const toggleCategory = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Utility function for exponential backoff delay
  const getRetryDelay = (attempt) => {
    return Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
  };

  // Utility function to check if error is network-related
  const isNetworkError = (error) => {
    if (!error) return false;
    const errorMessage = error.message || error.toString().toLowerCase();
    return (
      errorMessage.includes("network") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("fetch") ||
      !isConnected
    );
  };

  // Enhanced submission with retry logic
  const attemptSubmission = async (feedbackData, attempt = 0) => {
    try {
      setSubmissionError(null);
      const result = await dispatch(
        submitEducatorFeedback(feedbackData)
      ).unwrap();

      // Reset retry count on success
      setRetryCount(0);
      setIsRetrying(false);

      return result;
    } catch (error) {
      const isNetError = isNetworkError(error);
      const maxRetries = 3;

      if (isNetError && attempt < maxRetries) {
        // Exponential backoff retry for network errors
        const delay = getRetryDelay(attempt);
        setRetryCount(attempt + 1);
        setIsRetrying(true);

        await new Promise((resolve) => setTimeout(resolve, delay));

        // Check network connectivity before retry
        const networkState = await NetInfo.fetch();
        if (networkState.isConnected) {
          return attemptSubmission(feedbackData, attempt + 1);
        } else {
          throw new Error("No network connection available");
        }
      } else {
        setIsRetrying(false);
        throw error;
      }
    }
  };

  const handleSubmitFeedback = async () => {
    // Form validation
    if (
      !selectedGrade ||
      !selectedStudent ||
      rating === 0 ||
      selectedCategories.length === 0 ||
      !comment.trim()
    ) {
      setSubmissionError(
        "Please fill in all required fields including grade level"
      );
      return;
    }

    // Check network connectivity first
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      setSubmissionError(
        "No internet connection. Please check your network and try again."
      );
      return;
    }

    try {
      const feedbackData = {
        student_id: selectedStudent.id,
        student_name: selectedStudent.student_calling_name,
        rating,
        categories: selectedCategories,
        comment: comment.trim(),
        educator_id: sessionData?.data?.id || sessionData?.id,
        educator_name: sessionData?.data?.full_name || sessionData?.full_name,
      };

      // Use enhanced submission with retry logic
      await attemptSubmission(feedbackData);

      // Success - show success message and reset form
      setSubmissionError(null);
      Alert.alert("Success", "Feedback submitted successfully");

      // Reset form
      setSelectedGrade(null);
      setSelectedStudent(null);
      setRating(0);
      setSelectedCategories([]);
      setComment("");
      setShowAddForm(false);
    } catch (error) {
      const isNetError = isNetworkError(error);

      if (isNetError) {
        setSubmissionError(
          "Network error occurred. The app will automatically retry when your connection improves."
        );
      } else {
        setSubmissionError(
          error.message || "Failed to submit feedback. Please try again."
        );
      }
    }
  };

  // Manual retry function
  const handleRetry = async () => {
    if (
      !selectedGrade ||
      !selectedStudent ||
      rating === 0 ||
      selectedCategories.length === 0 ||
      !comment.trim()
    ) {
      return;
    }

    const feedbackData = {
      student_id: selectedStudent.id,
      student_name: selectedStudent.student_calling_name,
      rating,
      categories: selectedCategories,
      comment: comment.trim(),
      educator_id: sessionData?.data?.id || sessionData?.id,
      educator_name: sessionData?.data?.full_name || sessionData?.full_name,
    };

    try {
      await attemptSubmission(feedbackData);

      setSubmissionError(null);
      Alert.alert("Success", "Feedback submitted successfully");

      // Reset form
      setSelectedGrade(null);
      setSelectedStudent(null);
      setRating(0);
      setSelectedCategories([]);
      setComment("");
      setShowAddForm(false);
    } catch (error) {
      const isNetError = isNetworkError(error);

      if (isNetError) {
        setSubmissionError(
          "Network error occurred. Please check your connection and try again."
        );
      } else {
        setSubmissionError(
          error.message || "Failed to submit feedback. Please try again."
        );
      }
    }
  };

  const handleAddCategory = (categoryData) => {
    console.log("New category added:", categoryData);
    Alert.alert(
      "Category Added",
      `Category "${categoryData.title}" with ${categoryData.questions.length} questions has been added successfully!`
    );
    // Here you would typically save the category to your backend/state
    // For now, we'll just show a success message
  };

  const renderGradeSelector = () => {
    // Use API grades if available, otherwise use FRONTEND_GRADES
    const grades =
      studentListData?.data?.grades?.length > 0
        ? studentListData.data.grades
        : FRONTEND_GRADES;

    // Check if we should disable grade selection
    const isGradeSelectionDisabled = studentsLoading;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Grade Level</Text>
        {studentListLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading grades...</Text>
          </View>
        )}
        {studentListError && (
          <Text style={styles.errorText}>
            Failed to load grades. Check console for details.
          </Text>
        )}
        {isGradeSelectionDisabled && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              Loading students for selected grade...
            </Text>
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.gradeScroll}
        >
          {grades.map((grade) => {
            const isCurrentlySelected = selectedGrade?.id === grade.id;
            const isDisabled = isGradeSelectionDisabled && !isCurrentlySelected;

            return (
              <TouchableOpacity
                key={grade.id}
                style={[
                  styles.gradeCard,
                  isCurrentlySelected && styles.selectedGradeCard,
                  isDisabled && styles.disabledGradeCard,
                  isCurrentlySelected &&
                    studentsLoading &&
                    styles.loadingGradeCard,
                ]}
                disabled={isDisabled}
                onPress={() => {
                  // Prevent action if students are currently loading for another grade
                  if (isGradeSelectionDisabled && !isCurrentlySelected) {
                    return;
                  }

                  console.log("🎯 Selected Grade:", grade);
                  setSelectedGrade(grade);
                  setSelectedStudent(null); // Reset student selection when grade changes
                  // Force refetch students for the new grade
                  if (refetchStudents) {
                    refetchStudents();
                  }
                }}
              >
                <View style={styles.gradeCardContent}>
                  {isCurrentlySelected && studentsLoading && (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                      style={styles.gradeLoadingIndicator}
                    />
                  )}
                  <Text
                    style={[
                      styles.gradeName,
                      isDisabled && styles.disabledGradeText,
                    ]}
                  >
                    {grade.name}
                  </Text>
                  <Text
                    style={[
                      styles.gradeStudentCount,
                      isDisabled && styles.disabledGradeText,
                    ]}
                  >
                    {grade.student_list_count || grade.students_count || "N/A"}{" "}
                    students
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderStudentSelector = () => {
    // Filter students by selected grade level ID
    let studentsToShow = [];

    console.log("🔍 Selected Grade:", selectedGrade);
    console.log("📊 API Students Data:", studentsData?.data?.students);
    console.log("📚 Static Students Data:", classStudents);

    if (selectedGrade) {
      // Use API data if available and not empty
      if (
        studentsData?.data?.students &&
        studentsData.data.students.length > 0
      ) {
        // Filter API students by grade_level_id matching FRONTEND_GRADES.id
        studentsToShow = studentsData.data.students.filter((student) => {
          console.log(
            `🎓 Checking student ${student.name}: grade_level_id=${student.grade_level_id} vs selectedGrade.id=${selectedGrade.id}`
          );
          return student.grade_level_id === selectedGrade.id;
        });
        console.log("✅ Filtered API Students:", studentsToShow);
      } else {
        // Fallback to static data - filter by grade_level_id
        studentsToShow = classStudents.filter((student) => {
          console.log(
            `🎓 Checking static student ${student.student_calling_name}: grade_level_id=${student.grade_level_id} vs selectedGrade.id=${selectedGrade.id}`
          );
          return student.grade_level_id === selectedGrade.id;
        });
        console.log("✅ Filtered Static Students:", studentsToShow);
      }
    }

    if (!selectedGrade) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Student</Text>
          <Text style={styles.noGradeText}>Please select a grade first</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Select Student from {selectedGrade?.name} ({studentsToShow.length}{" "}
          students)
        </Text>
        {studentsLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading students...</Text>
          </View>
        )}
        {studentsError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Failed to load students for {selectedGrade?.name}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                if (refetchStudents) {
                  refetchStudents();
                }
              }}
            >
              <MaterialIcons name="refresh" size={16} color="white" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {studentsToShow.length === 0 && !studentsLoading && !studentsError && (
          <Text style={styles.noGradeText}>
            No students found for {selectedGrade?.name}
          </Text>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.studentScroll}
        >
          {studentsToShow.map((student) => {
            // Safety check for student data
            if (!student || !student.id) {
              console.warn("Invalid student data:", student);
              return null;
            }

            return (
              <TouchableOpacity
                key={student.id}
                style={[
                  styles.studentCard,
                  selectedStudent?.id === student.id &&
                    styles.selectedStudentCard,
                ]}
                onPress={() => {
                  // Additional safety check before selection
                  if (student && student.id && !studentsLoading) {
                    setSelectedStudent(student);
                  }
                }}
              >
                <View style={styles.studentAvatar}>
                  <Image
                    source={getProfileImage(student)}
                    style={styles.avatarImage}
                    onError={() => {
                      console.warn(
                        "Failed to load profile image for student:",
                        student?.id
                      );
                    }}
                  />
                </View>
                <Text style={styles.studentName}>
                  {student.student_calling_name || student.name}
                </Text>
                <Text style={styles.studentInfo}>
                  {student.admission_number}
                </Text>
                <Text style={styles.studentInfo}>
                  {student.grade || `Grade ${student.grade_level_id || "N/A"}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderRatingSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Rating</Text>
      <View style={styles.ratingContainer}>
        <StarRating
          rating={rating}
          onChange={handleRatingChange}
          starSize={32}
          color={theme.colors.primary}
          emptyColor={theme.colors.border}
          enableHalfStar={false}
        />
        <Text style={styles.ratingText}>{rating}.0</Text>
      </View>
    </View>
  );

  const renderCategoriesSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <TouchableOpacity
          style={styles.addCategoryButton}
          onPress={() => setShowAddCategoryPopup(true)}
        >
          <MaterialIcons name="add" size={16} color={theme.colors.primary} />
          <Text style={styles.addCategoryText}>Add Category</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.categoriesContainer}>
        {feedbackCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategories.includes(category.id) && {
                backgroundColor: category.color,
              },
            ]}
            onPress={() => toggleCategory(category.id)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategories.includes(category.id) &&
                  styles.selectedCategoryText,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCommentSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Comment</Text>
      <TextInput
        style={styles.commentInput}
        multiline
        numberOfLines={4}
        placeholder="Enter your feedback comment..."
        value={comment}
        onChangeText={setComment}
        textAlignVertical="top"
      />
    </View>
  );

  const renderAddForm = () => (
    <View style={styles.addFormContainer}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>Add New Feedback</Text>
        <TouchableOpacity onPress={() => setShowAddForm(false)}>
          <MaterialIcons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {renderGradeSelector()}
        {renderStudentSelector()}
        {renderRatingSection()}
        {renderCategoriesSection()}
        {renderCommentSection()}

        {/* Network Status Indicator */}
        {!isConnected && (
          <View style={styles.networkStatusContainer}>
            <MaterialIcons name="wifi-off" size={20} color="#F44336" />
            <Text style={styles.networkStatusText}>
              No internet connection. Please check your network.
            </Text>
          </View>
        )}

        {/* Submission Error Display */}
        {submissionError && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={20} color="#F44336" />
            <Text style={styles.errorText}>{submissionError}</Text>
            {isNetworkError({ message: submissionError }) && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
                disabled={submitting || isRetrying}
              >
                <MaterialIcons name="refresh" size={16} color="white" />
                <Text style={styles.retryButtonText}>
                  {isRetrying ? "Retrying..." : "Retry"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Loading State Display */}
        {(submitting || isRetrying) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              {isRetrying
                ? `Retrying submission... (${retryCount}/3)`
                : "Submitting feedback..."}
            </Text>
            {networkType === "cellular" && (
              <Text style={styles.networkHintText}>
                Using mobile data - this may take longer
              </Text>
            )}
          </View>
        )}

        <View style={styles.formActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowAddForm(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!isConnected || submitting || isRetrying) &&
                styles.disabledSaveButton,
            ]}
            onPress={handleSubmitFeedback}
            disabled={!isConnected || submitting || isRetrying}
          >
            {submitting || isRetrying ? (
              <View style={styles.submittingContainer}>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.submittingText}>
                  {isRetrying ? "Retrying..." : "Submitting..."}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.saveButtonText,
                  !isConnected && styles.disabledSaveButtonText,
                ]}
              >
                {!isConnected ? "No Connection" : "Save"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Add Category Popup */}
      <AddCategoryPopup
        visible={showAddCategoryPopup}
        onClose={() => setShowAddCategoryPopup(false)}
        onSubmit={handleAddCategory}
      />

      {/* Header with Add Button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons
            name="rate-review"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.title}>
            Educator Feedbacks{" "}
            {selectedGrade ? selectedGrade.name : "All Grades"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(true)}
          disabled={submitting}
        >
          <MaterialIcons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Add Feedback</Text>
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading feedbacks...</Text>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>Failed to load feedbacks</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() =>
              dispatch(fetchEducatorFeedbacks({ page: 1, limit: 50 }))
            }
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {showAddForm ? (
        renderAddForm()
      ) : (
        <ScrollView
          style={styles.feedbacksList}
          showsVerticalScrollIndicator={false}
        >
          {existingFeedbacks.map((feedback) => (
            <View key={feedback.id} style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <View style={styles.studentInfo}>
                  <View style={styles.studentAvatar}>
                    <Image
                      source={getProfileImage(feedback?.student)}
                      style={styles.avatarImage}
                      onError={() => {
                        console.warn(
                          "Failed to load profile image for feedback:",
                          feedback?.id
                        );
                      }}
                    />
                  </View>
                  <View style={styles.studentDetails}>
                    <Text style={styles.studentName}>
                      {feedback?.student?.student_calling_name ||
                        "Unknown Student"}
                    </Text>
                    <Text style={styles.studentMeta}>
                      {feedback?.student?.admission_number || "N/A"} •{" "}
                      {feedback?.student?.grade || "N/A"}
                    </Text>
                  </View>
                </View>
                <View style={styles.feedbackRating}>
                  <StarRating
                    rating={Math.round(Number(feedback?.rating) || 0)}
                    onChange={() => {}} // Read-only
                    starSize={16}
                    color={theme.colors.primary}
                    emptyColor={theme.colors.border}
                    enableHalfStar={false}
                  />
                  <Text style={styles.ratingValue}>
                    {Math.round(Number(feedback?.rating) || 0)}.0
                  </Text>
                </View>
              </View>

              <View style={styles.feedbackCategories}>
                {(feedback?.categories || []).map((categoryId) => {
                  const category = feedbackCategories.find(
                    (c) => c.id === categoryId
                  );
                  return category ? (
                    <View
                      key={categoryId}
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: category.color },
                      ]}
                    >
                      <Text style={styles.categoryBadgeText}>
                        {category.label}
                      </Text>
                    </View>
                  ) : null;
                })}
              </View>

              <Text style={styles.feedbackComment}>
                {feedback?.comment || "No comment provided"}
              </Text>

              <View style={styles.feedbackMeta}>
                <Text style={styles.metaText}>
                  By {feedback?.created_by || "Unknown"}
                </Text>
                <Text style={styles.metaText}>
                  {feedback?.created_at
                    ? new Date(feedback.created_at).toLocaleDateString()
                    : "Unknown date"}
                </Text>
              </View>

              <View style={styles.feedbackStatus}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        feedback?.status === "Approved" ? "#4CAF50" : "#FF9800",
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {feedback?.status || "Pending"}
                  </Text>
                </View>
                {feedback?.status !== "Approved" &&
                  feedback?.status !== "Cancelled" && (
                    <View style={styles.feedbackActions}>
                      <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.actionButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.saveActionButton]}
                      >
                        <Text
                          style={[
                            styles.actionButtonText,
                            styles.saveActionButtonText,
                          ]}
                        >
                          Save
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
              </View>

              {feedback?.revision_instructions && (
                <View style={styles.revisionSection}>
                  <Text style={styles.revisionTitle}>
                    Revision Instructions
                  </Text>
                  <Text style={styles.revisionText}>
                    {feedback.revision_instructions}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.secondary,
    marginTop: theme.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: "#F44336",
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: theme.spacing.xs,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: theme.spacing.xs,
  },
  addFormContainer: {
    flex: 1,
    padding: theme.spacing.md,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  addCategoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  addCategoryText: {
    color: theme.colors.primary,
    fontWeight: "600",
    fontSize: 12,
    marginLeft: theme.spacing.xs,
  },
  studentScroll: {
    flexDirection: "row",
  },
  gradeScroll: {
    flexDirection: "row",
  },
  gradeCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
    alignItems: "center",
    minWidth: 120,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedGradeCard: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + "20",
  },
  disabledGradeCard: {
    opacity: 0.5,
    backgroundColor: theme.colors.border + "30",
  },
  loadingGradeCard: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + "10",
  },
  gradeCardContent: {
    alignItems: "center",
    position: "relative",
  },
  gradeLoadingIndicator: {
    position: "absolute",
    top: -8,
    right: -8,
  },
  gradeName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.xs,
  },
  gradeStudentCount: {
    fontSize: 11,
    color: theme.colors.secondary,
    textAlign: "center",
  },
  disabledGradeText: {
    opacity: 0.6,
    color: theme.colors.secondary,
  },
  noGradeText: {
    fontSize: 14,
    color: theme.colors.secondary,
    textAlign: "center",
    padding: theme.spacing.lg,
    fontStyle: "italic",
  },
  studentCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
    alignItems: "center",
    minWidth: 100,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedStudentCard: {
    borderColor: theme.colors.primary,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  studentName: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
  },
  studentInfo: {
    fontSize: 10,
    color: theme.colors.secondary,
    textAlign: "center",
  },
  studentMeta: {
    fontSize: 12,
    color: theme.colors.secondary,
  },
  studentDetails: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  selectedCategoryText: {
    color: "white",
    fontWeight: "600",
  },
  commentInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.lg,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginLeft: theme.spacing.sm,
  },
  saveButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  disabledSaveButton: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  disabledSaveButtonText: {
    color: theme.colors.secondary,
  },
  submittingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submittingText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: theme.spacing.sm,
  },
  networkStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: "#FED7D7",
  },
  networkStatusText: {
    fontSize: 14,
    color: "#D32F2F",
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  networkHintText: {
    fontSize: 12,
    color: theme.colors.secondary,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  feedbacksList: {
    flex: 1,
    padding: theme.spacing.md,
  },
  feedbackCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  feedbackRating: {
    alignItems: "center",
  },
  ratingValue: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  feedbackCategories: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: theme.spacing.md,
  },
  categoryBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: "white",
    fontWeight: "600",
  },
  feedbackComment: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  feedbackMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.secondary,
  },
  feedbackStatus: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    color: "white",
    fontWeight: "600",
  },
  feedbackActions: {
    flexDirection: "row",
  },
  actionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  saveActionButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  actionButtonText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: "600",
  },
  saveActionButtonText: {
    color: "white",
  },
  revisionSection: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: "#FF9800",
  },
  revisionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  revisionText: {
    fontSize: 12,
    color: theme.colors.secondary,
    lineHeight: 18,
  },
});

export default EducatorFeedbackDrawer;
