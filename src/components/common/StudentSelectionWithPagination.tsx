import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import {
  useGetStudentsByGradeWithPaginationQuery,
  useLazyGetStudentsByGradeWithPaginationQuery,
} from "@/api/educator-feedback-api";
import {
  getStudentProfilePicture,
  getDefaultStudentProfileImage,
  getLocalFallbackProfileImage,
} from "@/utils/studentProfileUtils";
import { getGradeNameById } from "@/constants/gradeLevels";
import type { RootState } from "@/state-store/store";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = 120;
const CARD_MARGIN = 8;

interface Student {
  id: number;
  name: string;
  full_name: string;
  student_calling_name: string;
  admission_number: string;
  grade_level_id: number;
  grade: string;
  student_attachment_list: any[];
  attachment?: any;
  attachments?: any[];
  active: boolean;
}

interface StudentSelectionWithPaginationProps {
  gradeId: number | null; // Required - filter students by grade level
  onStudentSelect: (student: Student | null) => void;
  selectedStudent: Student | null;
  selectedStudents?: Student[]; // Optional - for multi-select mode
  pageSize?: number;
  enableInfiniteScroll?: boolean;
  searchPhrase?: string;
  style?: any;
  disabled?: boolean;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  showSearchResults?: boolean;
  onSelectAll?: (students: Student[]) => void; // Callback with all available students
  onDeselectAll?: () => void; // Callback to clear selection
  showSelectAllButton?: boolean; // Whether to show the Select All button
}

const StudentSelectionWithPagination: React.FC<
  StudentSelectionWithPaginationProps
> = ({
  gradeId,
  onStudentSelect,
  selectedStudent,
  selectedStudents = [],
  pageSize = 10,
  enableInfiniteScroll = true,
  searchPhrase = "",
  style,
  disabled = false,
  enableSearch = true,
  searchPlaceholder = "Search students...",
  showSearchResults = true,
  onSelectAll,
  onDeselectAll,
  showSelectAllButton = false,
}) => {
  // Redux state for authentication status
  const { token, isAuthenticated, user } = useSelector(
    (state: RootState) => state.app,
  );

  // State for frontend pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [displayedStudents, setDisplayedStudents] = useState<Student[]>([]);
  const [allLoadedStudents, setAllLoadedStudents] = useState<Student[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [useMockData, setUseMockData] = useState(false);

  // State for search functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // State for handling multiple API calls to get all students
  const [allStudentsFromAPI, setAllStudentsFromAPI] = useState<Student[]>([]);
  const [isFetchingAllStudents, setIsFetchingAllStudents] = useState(false);

  // Log authentication status for debugging
  useEffect(() => {
    console.log("🔐 StudentSelectionWithPagination - Auth Status:", {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      isAuthenticated,
      userExists: !!user,
      userRole: user?.userCategory || "Unknown",
      selectedGradeId: gradeId,
      filteringByGrade: !!gradeId,
    });
  }, [token, isAuthenticated, user, gradeId]);

  // Clear search function
  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  }, []);

  // Debounced search effect
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when search term changes
  useEffect(() => {
    if (enableSearch && debouncedSearchTerm !== searchPhrase) {
      console.log(
        `🔄 Resetting pagination due to search change: "${debouncedSearchTerm}"`,
      );
      setCurrentPage(1);
      setDisplayedStudents([]);
      setAllLoadedStudents([]);
    }
  }, [debouncedSearchTerm, searchPhrase, enableSearch]);

  // Mock data for development when server is unavailable - all grades
  const generateMockStudents = useCallback((count: number = 50): Student[] => {
    return Array.from({ length: count }, (_, index) => {
      // Distribute students across different grades (1-15)
      const gradeId = (index % 15) + 1;

      // Create mock attachment for some students (simulate real data)
      const hasAttachment = Math.random() < 0.7; // 70% of students have profile pictures
      const mockAttachmentList = hasAttachment
        ? [
            {
              id: index + 1000, // Unique attachment ID
              file_name: `student_${index + 1}_profile.jpg`,
              file_type: "image",
              upload_date: new Date(
                2024,
                Math.floor(Math.random() * 12),
                Math.floor(Math.random() * 28) + 1,
              ).toISOString(),
            },
          ]
        : [];

      const primaryAttachment =
        mockAttachmentList.length > 0 ? mockAttachmentList[0] : null;

      return {
        id: index + 1,
        name: `Student ${index + 1}`,
        full_name: `Student ${index + 1} LastName`,
        student_calling_name: `Student ${index + 1}`,
        admission_number: `ADM${String(index + 1).padStart(3, "0")}`,
        grade_level_id: gradeId,
        grade: `Grade ${gradeId}`,
        student_attachment_list: mockAttachmentList,
        active: true,
        // Map to expected formats for studentProfileUtils
        attachment: primaryAttachment,
        attachments: mockAttachmentList,
      };
    });
  }, []);

  // Use either internal search term or external searchPhrase prop
  const activeSearchTerm = enableSearch
    ? debouncedSearchTerm
    : searchPhrase || "";

  // API query for initial request to get first batch and pagination info
  const {
    data: initialStudentsData,
    isLoading: isInitialLoading,
    error: initialError,
    refetch,
  } = useGetStudentsByGradeWithPaginationQuery(
    {
      // Remove grade_level_id to get all students
      page: 1, // Get first page
      page_size: 10000, // Set very high page_size to get ALL students from backend
      search_phrase: "", // Don't search on backend - we'll filter on frontend
      search_filter_list: [], // Keep empty to avoid backend confusion
    },
    {
      skip: useMockData, // Only skip if using mock data
    },
  );

  // Lazy query for additional pages if needed
  const [fetchAdditionalPage] = useLazyGetStudentsByGradeWithPaginationQuery();

  // Function to fetch all students across multiple pages if needed
  const fetchAllStudents = useCallback(async () => {
    if (useMockData || !initialStudentsData) return;

    setIsFetchingAllStudents(true);
    let allStudents: Student[] = [];

    try {
      // Process first page data
      if (
        initialStudentsData?.data?.students &&
        Array.isArray(initialStudentsData.data.students)
      ) {
        const firstPageStudents = initialStudentsData.data.students.map(
          (student: any) => {
            // Process student_attachment_list for profile pictures
            const studentAttachmentList = student.student_attachment_list || [];

            // Map student_attachment_list to expected formats
            let primaryAttachment = null;
            let attachmentsArray = [];

            if (studentAttachmentList.length > 0) {
              // Filter for image attachments
              const imageAttachments = studentAttachmentList.filter(
                (attachment: any) => {
                  const fileType = attachment.file_type?.toLowerCase();
                  const fileName = attachment.file_name?.toLowerCase();
                  return (
                    fileType === "image" ||
                    fileType?.startsWith("image/") ||
                    fileName?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)
                  );
                },
              );

              // Set primary attachment (first image or first attachment)
              primaryAttachment =
                imageAttachments.length > 0
                  ? imageAttachments[0]
                  : studentAttachmentList[0];

              // Set attachments array (prioritize images)
              attachmentsArray =
                imageAttachments.length > 0
                  ? imageAttachments
                  : studentAttachmentList;

              console.log(
                `🖼️ Student ${student.id} processed: ${imageAttachments.length} images, primary: ${primaryAttachment?.file_name}`,
              );
            }

            return {
              id: student.id,
              name:
                student.full_name || student.name || `Student ${student.id}`,
              full_name: student.full_name || student.name,
              student_calling_name:
                student.full_name?.split(" ")[0] || `Student ${student.id}`,
              admission_number: student.admission_number,
              grade_level_id: student.grade_level_id,
              grade: `Grade ${student.grade_level_id}`,
              student_attachment_list: studentAttachmentList,
              active: student.active !== false,
              // Map to expected formats for studentProfileUtils
              attachment: primaryAttachment,
              attachments: attachmentsArray,
            };
          },
        );

        allStudents = [...firstPageStudents];

        // Check if there are more pages
        const totalCount = initialStudentsData.data.total_count || 0;
        const currentPageSize = initialStudentsData.data.page_size || 10000;
        const hasMorePages =
          initialStudentsData.data.has_next_page ||
          allStudents.length < totalCount;

        console.log(`📊 First page loaded: ${allStudents.length} students`);
        console.log(`📊 Total expected: ${totalCount} students`);
        console.log(`📊 Has more pages: ${hasMorePages}`);

        // Fetch additional pages if needed
        if (hasMorePages && allStudents.length < totalCount) {
          const totalPages = Math.ceil(
            totalCount / Math.min(currentPageSize, 1000),
          ); // Limit page size to reasonable amount
          console.log(`📊 Need to fetch ${totalPages - 1} more pages`);

          for (let page = 2; page <= totalPages; page++) {
            try {
              console.log(`📤 Fetching page ${page}...`);
              const result = await fetchAdditionalPage({
                page: page,
                page_size: 1000, // Use reasonable page size for additional pages
                search_phrase: "",
                search_filter_list: [],
              });

              if (
                result.data?.data?.students &&
                Array.isArray(result.data.data.students)
              ) {
                const pageStudents = result.data.data.students.map(
                  (student: any) => {
                    // Process student_attachment_list for profile pictures
                    const studentAttachmentList =
                      student.student_attachment_list || [];

                    // Map student_attachment_list to expected formats
                    let primaryAttachment = null;
                    let attachmentsArray = [];

                    if (studentAttachmentList.length > 0) {
                      // Filter for image attachments
                      const imageAttachments = studentAttachmentList.filter(
                        (attachment: any) => {
                          const fileType = attachment.file_type?.toLowerCase();
                          const fileName = attachment.file_name?.toLowerCase();
                          return (
                            fileType === "image" ||
                            fileType?.startsWith("image/") ||
                            fileName?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)
                          );
                        },
                      );

                      // Set primary attachment (first image or first attachment)
                      primaryAttachment =
                        imageAttachments.length > 0
                          ? imageAttachments[0]
                          : studentAttachmentList[0];

                      // Set attachments array (prioritize images)
                      attachmentsArray =
                        imageAttachments.length > 0
                          ? imageAttachments
                          : studentAttachmentList;
                    }

                    return {
                      id: student.id,
                      name:
                        student.full_name ||
                        student.name ||
                        `Student ${student.id}`,
                      full_name: student.full_name || student.name,
                      student_calling_name:
                        student.full_name?.split(" ")[0] ||
                        `Student ${student.id}`,
                      admission_number: student.admission_number,
                      grade_level_id: student.grade_level_id,
                      grade: `Grade ${student.grade_level_id}`,
                      student_attachment_list: studentAttachmentList,
                      active: student.active !== false,
                      // Map to expected formats for studentProfileUtils
                      attachment: primaryAttachment,
                      attachments: attachmentsArray,
                    };
                  },
                );

                allStudents = [...allStudents, ...pageStudents];
                console.log(
                  `✅ Page ${page} loaded: ${pageStudents.length} students (Total: ${allStudents.length})`,
                );

                // Stop if we got all students
                if (allStudents.length >= totalCount) {
                  console.log(
                    `🎯 All students fetched: ${allStudents.length}/${totalCount}`,
                  );
                  break;
                }
              }
            } catch (pageError) {
              console.error(`❌ Error fetching page ${page}:`, pageError);
              break; // Stop fetching additional pages on error
            }
          }
        }

        console.log(
          `🎉 Final result: ${allStudents.length} total students fetched from API`,
        );
        setAllStudentsFromAPI(allStudents);
      }
    } catch (error) {
      console.error("❌ Error in fetchAllStudents:", error);
      setAllStudentsFromAPI([]);
    } finally {
      setIsFetchingAllStudents(false);
    }
  }, [initialStudentsData, useMockData, fetchAdditionalPage]);

  // Trigger fetching all students when initial data is received
  useEffect(() => {
    if (initialStudentsData && !useMockData) {
      fetchAllStudents();
    }
  }, [initialStudentsData, useMockData, fetchAllStudents]);

  // Log API request details for debugging
  useEffect(() => {
    if (!useMockData && !isInitialLoading) {
      console.log("📤 Making API request to fetch ALL students with body:", {
        page: 1,
        page_size: 10000,
        search_phrase: "",
        search_filter_list: [],
        note: "Fetching all students, will filter by grade on frontend",
      });

      console.log("🔍 Frontend filtering state:", {
        selectedGradeId: gradeId,
        searchTerm,
        debouncedSearchTerm,
        activeSearchTerm,
        isSearching,
        enableSearch,
      });

      if (!token) {
        console.warn(
          "⚠️ API request will be made without authentication token!",
        );
      }
    }
  }, [
    useMockData,
    token,
    isInitialLoading,
    searchTerm,
    debouncedSearchTerm,
    isSearching,
    enableSearch,
    gradeId,
  ]);

  // Reset data when component mounts or gradeId changes
  useEffect(() => {
    console.log(
      `🔄 Resetting pagination due to grade change: ${gradeId ? `Grade ${gradeId}` : "No grade selected"}`,
    );
    setCurrentPage(1);
    setDisplayedStudents([]);
    setAllLoadedStudents([]);
    setHasNextPage(false);
  }, [gradeId]); // Reset when gradeId changes

  // Handle mock data when enabled
  useEffect(() => {
    if (useMockData) {
      console.log(
        `📄 Using mock data with grade filter: ${gradeId || "All grades"}, search: "${activeSearchTerm}"`,
      );
      let mockStudents = generateMockStudents();

      // Apply grade filter first (if gradeId is provided)
      if (gradeId) {
        mockStudents = mockStudents.filter(
          (student) => student.grade_level_id === gradeId,
        );
        console.log(
          `🎓 Filtered by grade ${gradeId}: ${mockStudents.length} students`,
        );
      }

      // Apply search filter to mock data
      if (activeSearchTerm && activeSearchTerm.trim()) {
        const searchLower = activeSearchTerm.toLowerCase().trim();
        mockStudents = mockStudents.filter((student) => {
          const name = (student.student_calling_name || "").toLowerCase();
          const fullName = (student.full_name || "").toLowerCase();
          const admissionNumber = (
            student.admission_number || ""
          ).toLowerCase();

          return (
            name.includes(searchLower) ||
            fullName.includes(searchLower) ||
            admissionNumber.includes(searchLower)
          );
        });
        console.log(
          `🔍 After search filter: ${mockStudents.length} students match "${activeSearchTerm}"`,
        );
      }

      setAllLoadedStudents(mockStudents);

      // Calculate displayed students for current page
      const startIndex = 0;
      const endIndex = currentPage * pageSize;
      const studentsToShow = mockStudents.slice(startIndex, endIndex);

      setDisplayedStudents(studentsToShow);
      setHasNextPage(endIndex < mockStudents.length);
    }
  }, [
    useMockData,
    currentPage,
    pageSize,
    generateMockStudents,
    activeSearchTerm,
    gradeId,
  ]);

  // Process all students data and implement frontend filtering and pagination
  useEffect(() => {
    if (useMockData) return; // Skip if using mock data

    try {
      // Use all students fetched from API (multiple pages if needed)
      const allStudents = allStudentsFromAPI;

      if (allStudents.length > 0) {
        console.log(
          `✅ Processing ${allStudents.length} total students from API`,
        );

        // Apply grade filter first (gradeId is required)
        let filteredStudents = allStudents;
        if (gradeId) {
          filteredStudents = allStudents.filter(
            (student) => student.grade_level_id === gradeId,
          );
          console.log(
            `🎓 Filtered by grade ${gradeId}: ${filteredStudents.length} students out of ${allStudents.length} total students`,
          );
        }

        // Apply search filter on grade-filtered students
        if (activeSearchTerm && activeSearchTerm.trim()) {
          const searchLower = activeSearchTerm.toLowerCase().trim();
          filteredStudents = filteredStudents.filter((student) => {
            const name = (student.student_calling_name || "").toLowerCase();
            const fullName = (student.full_name || "").toLowerCase();
            const admissionNumber = (
              student.admission_number || ""
            ).toLowerCase();

            return (
              name.includes(searchLower) ||
              fullName.includes(searchLower) ||
              admissionNumber.includes(searchLower)
            );
          });
          console.log(
            `🔍 After search "${activeSearchTerm}": ${filteredStudents.length} students`,
          );
        }

        setAllLoadedStudents(filteredStudents);

        // Calculate displayed students for current page (frontend pagination)
        const startIndex = 0;
        const endIndex = currentPage * pageSize;
        const studentsToShow = filteredStudents.slice(startIndex, endIndex);

        setDisplayedStudents(studentsToShow);
        setHasNextPage(endIndex < filteredStudents.length);
      } else {
        // No students available yet
        setAllLoadedStudents([]);
        setDisplayedStudents([]);
        setHasNextPage(false);
      }
    } catch (error) {
      console.error("🚨 Error processing all students data:", error);
      setAllLoadedStudents([]);
      setDisplayedStudents([]);
      setHasNextPage(false);
    }
  }, [
    allStudentsFromAPI,
    currentPage,
    pageSize,
    gradeId,
    useMockData,
    activeSearchTerm,
  ]);

  // Load next page
  const loadNextPage = useCallback(() => {
    if (hasNextPage && !isInitialLoading && !isFetchingAllStudents) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage, isInitialLoading, isFetchingAllStudents]);

  // Handle scroll to load more
  const handleScroll = useCallback(
    (event: any) => {
      if (!enableInfiniteScroll) return;

      const { contentOffset, layoutMeasurement, contentSize } =
        event.nativeEvent;
      const isCloseToRight =
        contentOffset.x + layoutMeasurement.width >= contentSize.width - 100;

      if (isCloseToRight) {
        loadNextPage();
      }
    },
    [loadNextPage, enableInfiniteScroll],
  );

  // Get profile picture for student
  const getStudentProfileImageSource = useCallback((student: Student) => {
    console.log(`🖼️ Getting profile image for student ${student.id}:`, {
      studentId: student.id,
      studentName: student.student_calling_name,
      hasStudentAttachmentList: !!student.student_attachment_list,
      attachmentListLength: student.student_attachment_list?.length || 0,
      hasAttachment: !!student.attachment,
      hasAttachments: !!student.attachments,
      attachmentsLength: student.attachments?.length || 0,
    });

    const profilePictureSource = getStudentProfilePicture(student);

    if (profilePictureSource) {
      console.log(
        `✅ Profile picture found for student ${student.id}:`,
        profilePictureSource,
      );
      return profilePictureSource;
    }

    console.log(
      `⚠️ No profile picture found for student ${student.id}, using fallback`,
    );

    // Fallback to default then local fallback
    const defaultImage = getDefaultStudentProfileImage();
    return defaultImage || getLocalFallbackProfileImage();
  }, []);

  // Handle student selection
  const handleStudentPress = useCallback(
    (student: Student) => {
      if (disabled) return;

      if (selectedStudent?.id === student.id) {
        onStudentSelect(null); // Deselect if already selected
      } else {
        onStudentSelect(student);
      }
    },
    [selectedStudent, onStudentSelect, disabled],
  );

  // Render student card
  const renderStudentCard = useCallback(
    (student: Student, index: number) => {
      // Check if selected in multi-select mode or single-select mode
      const isSelected = selectedStudents.length > 0
        ? selectedStudents.some(s => s.id === student.id)
        : selectedStudent?.id === student.id;
      const profileImageSource = getStudentProfileImageSource(student);

      return (
        <TouchableOpacity
          key={student.id}
          style={[
            styles.studentCard,
            isSelected && styles.selectedStudentCard,
            disabled && styles.disabledStudentCard,
          ]}
          onPress={() => handleStudentPress(student)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.profileImageContainer,
              isSelected && styles.selectedProfileImageContainer,
            ]}
          >
            <Image
              source={profileImageSource}
              style={styles.profileImage}
              onError={() => {
                console.log(`🖼️ Profile image error for student ${student.id}`);
              }}
              onLoad={() => {
                console.log(
                  `🖼️ Profile image loaded for student ${student.id}`,
                );
              }}
              resizeMode="cover"
            />
            {isSelected && (
              <View style={styles.selectedOverlay}>
                <MaterialIcons name="check-circle" size={24} color="#FFFFFF" />
              </View>
            )}
          </View>

          <Text
            style={[
              styles.studentName,
              isSelected && styles.selectedStudentName,
            ]}
            numberOfLines={2}
          >
            {student.student_calling_name}
          </Text>

          <Text
            style={[styles.gradeLevel, isSelected && styles.selectedGradeLevel]}
            numberOfLines={1}
          >
            {getGradeNameById(student.grade_level_id) ||
              `Grade ${student.grade_level_id || "N/A"}`}
          </Text>

          <Text
            style={[
              styles.admissionNumber,
              isSelected && styles.selectedAdmissionNumber,
            ]}
            numberOfLines={1}
          >
            {student.admission_number}
          </Text>
        </TouchableOpacity>
      );
    },
    [
      selectedStudent,
      selectedStudents,
      getStudentProfileImageSource,
      handleStudentPress,
      disabled,
    ],
  );

  // Loading state - show loading while fetching initial data or all students
  if ((isInitialLoading && currentPage === 1) || isFetchingAllStudents) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#920734" />
          <Text style={styles.loadingText}>
            {isFetchingAllStudents
              ? "Loading all students..."
              : "Loading students..."}
          </Text>
          {isFetchingAllStudents && (
            <Text style={styles.loadingSubText}>
              Fetching from multiple pages to get all student data
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Error state with specific error handling
  if (initialError && !useMockData) {
    let errorMessage = "Failed to load students";
    let errorDetails = "";
    let showRetry = true;
    let showMockDataOption = false;

    // Handle specific error types
    if (
      initialError?.data &&
      typeof initialError.data === "string" &&
      initialError.data.includes("<!DOCTYPE html>")
    ) {
      if (
        initialError.data.includes("172.20.10.3:9999") ||
        initialError.data.includes("Redirecting to")
      ) {
        errorMessage = "Authentication Required";
        errorDetails =
          "The server is redirecting requests, which usually indicates:\n• Your login session has expired\n• Authentication token is missing or invalid\n• Please log out and log in again to refresh your session";
        showRetry = false;
        showMockDataOption = true;
      } else {
        errorMessage = "Server Configuration Issue";
        errorDetails =
          "The server returned an HTML page instead of student data. Please contact technical support.";
        showMockDataOption = true;
      }
    } else if (initialError?.status === "PARSING_ERROR") {
      errorMessage = "Authentication Issue";
      errorDetails =
        "The server returned HTML instead of JSON data, which usually means your session has expired. Please log out and log in again.";
      showMockDataOption = true;
    } else if (initialError?.status === "AUTH_REDIRECT_ERROR") {
      errorMessage = "Authentication Expired";
      errorDetails =
        "Your login session has expired. Please log out and log in again to access student data.";
      showRetry = false;
      showMockDataOption = true;
    } else if (initialError?.status === "FORMAT_ERROR") {
      errorMessage = "API Format Issue";
      errorDetails =
        "The server returned data in an unexpected format. This might be a server configuration issue. Please try using demo data while we resolve this.";
      showRetry = true;
      showMockDataOption = true;
    } else if (initialError?.status === "DATABASE_ERROR") {
      errorMessage = "Database Error";
      errorDetails =
        "The backend database encountered an error while fetching students. This is likely a server-side issue that needs to be fixed by the development team.";
      showRetry = false;
      showMockDataOption = true;
    } else if (initialError?.status === "BACKEND_ERROR") {
      errorMessage = "Server Error";
      errorDetails =
        "The backend server encountered an error. Please try again later or use demo data to continue.";
      showRetry = true;
      showMockDataOption = true;
    } else if (initialError?.status === 401) {
      errorMessage = "Authentication required";
      errorDetails = "Please log in again to continue.";
      showRetry = false;
    } else if (initialError?.status === 403) {
      errorMessage = "Access denied";
      errorDetails = "You don't have permission to view students.";
      showRetry = false;
    } else if (initialError?.status === 404) {
      errorMessage = "Students not found";
      errorDetails = "No students found for this grade.";
    } else if (initialError?.status >= 500) {
      errorMessage = "Server error";
      errorDetails =
        "The server is experiencing issues. Please try again later.";
      showMockDataOption = true;
    } else if (initialError?.message) {
      errorDetails = initialError.message;
      showMockDataOption = true;
    }

    console.error("🚨 StudentSelectionWithPagination Error:", {
      error: initialError,
      gradeId,
      activeSearchTerm,
      timestamp: new Date().toISOString(),
    });

    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>{errorMessage}</Text>
          {errorDetails ? (
            <Text style={styles.errorDetails}>{errorDetails}</Text>
          ) : null}

          <View style={styles.buttonContainer}>
            {showRetry && (
              <TouchableOpacity style={styles.retryButton} onPress={refetch}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}

            {showMockDataOption && (
              <TouchableOpacity
                style={styles.mockDataButton}
                onPress={() => setUseMockData(true)}
              >
                <MaterialIcons name="preview" size={16} color="#4CAF50" />
                <Text style={styles.mockDataButtonText}>Use Demo Data</Text>
              </TouchableOpacity>
            )}
          </View>

          {!showRetry && !showMockDataOption && (
            <View style={styles.infoContainer}>
              <MaterialIcons name="info-outline" size={16} color="#2196F3" />
              <Text style={styles.infoText}>
                Contact your administrator for assistance
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Grade selection is required - show message if no grade selected
  if (!gradeId) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="school" size={48} color="#CCCCCC" />
          <Text style={styles.emptyText}>Please select a grade first</Text>
          <Text style={styles.gradeHelpText}>
            Choose a grade level to view students from that grade
          </Text>
        </View>
      </View>
    );
  }

  // No students found in selected grade
  if (
    allLoadedStudents.length === 0 &&
    !isInitialLoading &&
    !isFetchingAllStudents &&
    !isSearching
  ) {
    const gradeName = getGradeNameById(gradeId) || `Grade ${gradeId}`;
    const emptyMessage = activeSearchTerm
      ? `No students found for "${activeSearchTerm}" in ${gradeName}`
      : `No students found in ${gradeName}`;

    return (
      <View style={[styles.container, style]}>
        {/* Search Input */}
        {enableSearch && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <MaterialIcons
                name="search"
                size={20}
                color="#666666"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder={searchPlaceholder}
                placeholderTextColor="#999999"
                value={searchTerm}
                onChangeText={setSearchTerm}
                returnKeyType="search"
                autoCapitalize="words"
                autoCorrect={false}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity
                  onPress={clearSearch}
                  style={styles.clearButton}
                >
                  <MaterialIcons name="clear" size={20} color="#666666" />
                </TouchableOpacity>
              )}
              {isSearching && (
                <ActivityIndicator
                  size="small"
                  color="#920734"
                  style={styles.searchLoader}
                />
              )}
            </View>
          </View>
        )}

        <View style={styles.emptyContainer}>
          <MaterialIcons
            name={activeSearchTerm ? "search-off" : "person-outline"}
            size={48}
            color="#CCCCCC"
          />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
          {activeSearchTerm && (
            <TouchableOpacity
              onPress={clearSearch}
              style={styles.clearSearchButton}
            >
              <Text style={styles.clearSearchText}>Clear search</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Search Input */}
      {enableSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons
              name="search"
              size={20}
              color="#666666"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor="#999999"
              value={searchTerm}
              onChangeText={setSearchTerm}
              returnKeyType="search"
              autoCapitalize="words"
              autoCorrect={false}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                onPress={clearSearch}
                style={styles.clearButton}
              >
                <MaterialIcons name="clear" size={20} color="#666666" />
              </TouchableOpacity>
            )}
            {isSearching && (
              <ActivityIndicator
                size="small"
                color="#920734"
                style={styles.searchLoader}
              />
            )}
          </View>
        </View>
      )}

      {/* Select All / Deselect All Button */}
      {showSelectAllButton && allLoadedStudents.length > 0 && (
        <View style={styles.selectAllContainer}>
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={() => {
              if (selectedStudents.length === allLoadedStudents.length) {
                // All are selected, deselect all
                onDeselectAll?.();
              } else {
                // Not all selected, select all
                onSelectAll?.(allLoadedStudents);
              }
            }}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={selectedStudents.length === allLoadedStudents.length ? "check-box" : "check-box-outline-blank"}
              size={20}
              color={disabled ? "#CCCCCC" : "#920734"}
            />
            <Text style={[styles.selectAllText, disabled && styles.selectAllTextDisabled]}>
              {selectedStudents.length === allLoadedStudents.length
                ? `Deselect All (${allLoadedStudents.length})`
                : `Select All (${allLoadedStudents.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {displayedStudents.map((student, index) =>
          renderStudentCard(student, index),
        )}

        {/* Load more button (if infinite scroll is disabled) */}
        {!enableInfiniteScroll && hasNextPage && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={loadNextPage}
            disabled={isInitialLoading || isFetchingAllStudents}
          >
            <MaterialIcons name="add" size={24} color="#920734" />
            <Text style={styles.loadMoreButtonText}>Load More</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Students count indicator */}
      {showSearchResults && (
        <View style={styles.countIndicator}>
          <Text style={styles.countText}>
            {activeSearchTerm
              ? `Found ${allLoadedStudents.length} student${allLoadedStudents.length !== 1 ? "s" : ""} for "${activeSearchTerm}" in ${getGradeNameById(gradeId) || `Grade ${gradeId}`}`
              : `Showing ${displayedStudents.length} of ${allLoadedStudents.length} student${allLoadedStudents.length !== 1 ? "s" : ""} in ${getGradeNameById(gradeId) || `Grade ${gradeId}`}`}
          </Text>
          {useMockData && (
            <View style={styles.mockDataIndicator}>
              <MaterialIcons name="preview" size={14} color="#FF9800" />
              <Text style={styles.mockDataIndicatorText}>Demo Data</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  loadingContainer: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#666666",
    fontSize: 14,
  },
  loadingSubText: {
    marginTop: 4,
    color: "#999999",
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
  errorContainer: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 8,
    marginBottom: 8,
    color: "#F44336",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  errorDetails: {
    marginBottom: 16,
    color: "#666666",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  retryButton: {
    backgroundColor: "#920734",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    marginTop: 8,
    color: "#CCCCCC",
    fontSize: 14,
    textAlign: "center",
  },
  gradeHelpText: {
    marginTop: 8,
    color: "#999999",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  studentCard: {
    width: CARD_WIDTH,
    marginRight: CARD_MARGIN,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedStudentCard: {
    borderColor: "#920734",
    backgroundColor: "#FFF5F7",
  },
  disabledStudentCard: {
    opacity: 0.5,
  },
  profileImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    position: "relative",
    overflow: "hidden",
  },
  selectedProfileImageContainer: {
    borderWidth: 3,
    borderColor: "#920734",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
  },
  selectedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(146, 7, 52, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
  },
  studentName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
    textAlign: "center",
    marginBottom: 4,
  },
  selectedStudentName: {
    color: "#920734",
  },
  admissionNumber: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
  },
  selectedAdmissionNumber: {
    color: "#920734",
    fontWeight: "500",
  },
  loadingMoreContainer: {
    width: CARD_WIDTH,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginRight: CARD_MARGIN,
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 12,
    color: "#666666",
  },
  loadMoreButton: {
    width: CARD_WIDTH,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#920734",
    borderStyle: "dashed",
    marginRight: CARD_MARGIN,
  },
  loadMoreButtonText: {
    marginTop: 8,
    fontSize: 12,
    color: "#920734",
    fontWeight: "600",
  },
  countIndicator: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  countText: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    padding: 12,
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
  },
  infoText: {
    marginLeft: 8,
    color: "#1976D2",
    fontSize: 14,
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
  },
  mockDataButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  mockDataButtonText: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  mockDataIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    alignSelf: "center",
  },
  mockDataIndicatorText: {
    marginLeft: 4,
    color: "#FF9800",
    fontSize: 12,
    fontWeight: "500",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333333",
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchLoader: {
    marginLeft: 8,
  },
  gradeLevel: {
    fontSize: 11,
    color: "#666666",
    textAlign: "center",
    marginBottom: 2,
    fontWeight: "500",
  },
  selectedGradeLevel: {
    color: "#920734",
    fontWeight: "600",
  },
  clearSearchButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#920734",
    borderRadius: 8,
  },
  clearSearchText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  selectAllContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  selectAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFF5F7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#920734",
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#920734",
  },
  selectAllTextDisabled: {
    color: "#CCCCCC",
  },
});

export default StudentSelectionWithPagination;
