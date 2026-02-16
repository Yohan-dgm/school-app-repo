import { apiServer1 } from "./api-server-1";

/**
 * EDUCATOR FEEDBACK API
 *
 * This file defines all API endpoints for the educator feedback system.
 * All dummy data has been removed - the backend must provide the exact
 * data structures documented below.
 *
 * IMPORTANT: If backend endpoints return errors or unexpected data,
 * the frontend will show appropriate error messages instead of fallback data.
 *
 * 🚨 BACKEND TEAM: CRITICAL FILTER IMPLEMENTATION NEEDED
 *
 * OVERVIEW: The frontend sends filter parameters to two main endpoints:
 * - api/educator-feedback-management/feedback/list (getEducatorFeedbacks)
 * - api/educator-feedback-management/feedback/list (getFeedbackList)
 *
 * REQUIRED PARAMETERS TO IMPLEMENT:
 * 1. grade_filter (integer 1-15 or empty string) - Filter by grade level
 * 2. evaluation_type_filter (integer 1-6 or null) - Filter by evaluation type with is_active=true
 * 3. search_phrase (string) - Already working ✅
 *
 * STATUS: Currently using client-side filtering as fallback for evaluation types.
 * PRIORITY: HIGH - Performance impact on large datasets without server-side filtering.
 *
 * See detailed SQL examples and requirements in the endpoint comments below ⬇️
 */

// ===== EXPECTED BACKEND DATA STRUCTURES =====

/**
 * STUDENT LIST DATA API
 * Endpoint: POST /api/student-management/student/get-student-list-data
 * Request: {} (empty body)
 *
 * Expected Response:
 * {
 *   "status": "successful",
 *   "data": {
 *     "grades": [
 *       {
 *         "id": 1,
 *         "name": "Grade 8",
 *         "student_list_count": 25,
 *         "active": true
 *       }
 *     ],
 *     "grade_level_student_count": [
 *       {
 *         "id": 1,
 *         "name": "Grade 8",
 *         "student_list_count": 25
 *       }
 *     ]
 *   }
 * }
 */

/**
 * STUDENTS BY GRADE API
 * Endpoint: POST /api/student-management/student/get-student-list-data
 * Request: { "grade_level_id": 1, "search_phrase": "", "active_only": true }
 *
 * Expected Response:
 * {
 *   "status": "successful",
 *   "data": {
 *     "data": [  // or "students"
 *       {
 *         "id": 123,
 *         "full_name": "John Doe",
 *         "admission_number": "ADM001",
 *         "grade_level_id": 1,
 *         "student_attachment_list": [
 *           {
 *             "id": 1,
 *             "file_name": "profile_123.jpg",
 *             "file_type": "image",
 *             "upload_date": "2024-01-01"
 *           }
 *         ],
 *         "active": true
 *       }
 *     ],
 *     "total_count": 25
 *   }
 * }
 */

/**
 * FEEDBACK CATEGORIES API
 * Endpoint: POST /api/educator-feedback-management/category/list
 *
 * Expected Response:
 * {
 *   "status": "successful",
 *   "data": {
 *     "categories": [
 *       {
 *         "id": 1,
 *         "name": "Academic Performance",
 *         "description": "Academic related feedback",
 *         "active": true,
 *         "questions": [
 *           {
 *             "id": 1,
 *             "text": "How is the student's homework completion?",
 *             "answer_type": "mcq",  // "mcq" | "text" | "number" | "boolean"
 *             "mcq_options": ["Excellent", "Good", "Needs Improvement"],
 *             "marks": 5,
 *             "required": true
 *           }
 *         ],
 *         "subcategories": [
 *           {
 *             "id": 1,
 *             "name": "Homework",
 *             "category_id": 1
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * }
 */

/**
 * FEEDBACK LIST API
 * Endpoint: POST /api/educator-feedback-management/feedback/list
 * Request: { "page": 1, "page_size": 10, "search_phrase": "", "grade": "", ... }
 *
 * Expected Response:
 * {
 *   "status": "successful",
 *   "data": {
 *     "feedbacks": [
 *       {
 *         "id": 456,
 *         "student": {
 *           "id": 123,
 *           "name": "John Doe",
 *           "admission_number": "ADM001",
 *           "grade": "Grade 8",
 *           "profile_image": "profile_123.jpg"
 *         },
 *         "educator": {
 *           "id": 789,
 *           "name": "Jane Smith",
 *           "subject": "Mathematics"
 *         },
 *         "main_category": "Academic Performance",
 *         "subcategories": ["Homework", "Class Participation"],
 *         "description": "Student shows improvement...",
 *         "rating": 4.2,
 *         "created_at": "2024-01-01T10:00:00Z",
 *         "updated_at": "2024-01-01T10:00:00Z"
 *       }
 *     ],
 *     "pagination": {
 *       "current_page": 1,
 *       "total_pages": 5,
 *       "total_count": 50,
 *       "page_size": 10,
 *       "has_next": true,
 *       "has_previous": false
 *     }
 *   }
 * }
 */

/**
 * SUBMIT FEEDBACK API
 * Endpoint: POST /api/educator-feedback-management/feedback/create
 * Request: {
 *   "student_id": 123,
 *   "grade": "Grade 8",
 *   "main_category": "Academic Performance",
 *   "subcategories": ["Homework"],
 *   "description": "Detailed feedback...",
 *   "rating": 4.2,
 *   "questionnaire_answers": {
 *     "1": { "answer": "Good", "marks": 3 }
 *   }
 * }
 *
 * Expected Response:
 * {
 *   "status": "successful",
 *   "data": {
 *     "feedback": {
 *       "id": 456,
 *       "student_id": 123,
 *       "educator_id": 789,
 *       "main_category": "Academic Performance",
 *       "created_at": "2024-01-01T10:00:00Z"
 *     }
 *   },
 *   "message": "Feedback submitted successfully"
 * }
 */

/**
 * CREATE CATEGORY API
 * Endpoint: POST /api/educator-feedback-management/categories/create
 * Request: {
 *   "title": "Behavioral Assessment",
 *   "questions": [
 *     {
 *       "text": "How is the student's behavior?",
 *       "answer_type": "mcq",
 *       "mcq_options": ["Excellent", "Good"],
 *       "marks": 3,
 *       "required": true
 *     }
 *   ]
 * }
 *
 * Expected Response:
 * {
 *   "status": "successful",
 *   "data": {
 *     "category": {
 *       "id": 5,
 *       "name": "Behavioral Assessment",
 *       "questions": [...],
 *       "created_at": "2024-01-01T10:00:00Z"
 *     }
 *   },
 *   "message": "Category created successfully"
 * }
 */

// Define the educator feedback API slice with RTK Query
export const educatorFeedbackApi = apiServer1
  .enhanceEndpoints({
    addTagTypes: [
      "EducatorFeedback",
      "FeedbackCategories",
      "FeedbackQuestions",
      "Grades",
      "Students",
      "EducatorFeedbackMeta",
    ],
  })
  .injectEndpoints({
    overrideExisting: true,
    endpoints: (build) => ({
      // ===== POST STUDENT LIST DATA (Grades + Students) =====
      getStudentListData: build.query({
        query: (params = {}) => {
          const requestBody = {
            page: params.page || 1,
            page_size: params.page_size || 1,
            search_phrase: params.search_phrase || "",
            search_filter_list: params.search_filter_list || [],
          };
          console.log("📤 Student List Data API Request:", requestBody);
          return {
            url: "api/student-management/student/get-student-list-data",
            method: "POST",
            body: requestBody,
          };
        },
        providesTags: [
          { type: "Grades", id: "LIST" },
          { type: "Students", id: "LIST" },
        ],
        transformResponse: (response: any, meta: any) => {
          console.log("📚 Student List Data Response:", response);

          // Handle HTML error responses
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error("❌ API returned HTML error page");
            throw new Error(
              "Server returned an error page. Please check if the API endpoint exists.",
            );
          }

          // Handle authentication errors
          if (response?.status === "authentication-required") {
            console.error("❌ Authentication required");
            throw new Error("Authentication required. Please login again.");
          }

          // Handle successful response
          if (response?.status === "successful" && response?.data) {
            // Transform grades data for frontend use
            const grades =
              response.data.grade_level_student_count?.map((grade: any) => ({
                id: grade.id,
                name: grade.name,
                students_count: grade.student_list_count,
                active: true,
              })) ||
              response.data.grades ||
              [];

            return {
              status: "successful",
              data: {
                grades: grades,
                raw_data: response.data,
              },
            };
          }

          // Handle unexpected response format
          console.error("❌ Unexpected API response format:", response);
          throw new Error("Unexpected response format from server");
        },
      }),

      // ===== POST STUDENTS BY GRADE =====
      getStudentsByGrade: build.query({
        query: ({ grade_level_id, search = "" }) => {
          const requestBody = {
            grade_level_id: grade_level_id,
            search_phrase: search,
            active_only: true,
          };

          console.log("📤 Students By Grade Request Body:", requestBody);

          return {
            url: "api/student-management/student/get-student-list-data",
            method: "POST",
            body: requestBody,
            credentials: "include",
          };
        },
        providesTags: (result, error, { grade_level_id }) => [
          { type: "Students", id: `GRADE_${grade_level_id}` },
        ],
        transformResponse: (response: any, meta: any, { grade_level_id }) => {
          console.log("👥 Students By Grade Response:", response);
          console.log("👥 Students By Grade Meta:", meta);

          // Handle HTML error responses (including redirects)
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error("❌ Students API returned HTML instead of JSON:", {
              url: meta?.request?.url,
              method: meta?.request?.method,
              status: meta?.response?.status,
              statusText: meta?.response?.statusText,
              responsePreview: response.substring(0, 200),
            });

            if (response.includes("Redirecting to")) {
              console.error(
                "❌ Authentication redirect detected for students API",
              );
              throw new Error(
                "Authentication Error: Session expired. Please log out and log in again.",
              );
            } else {
              throw new Error(
                "Server Configuration Error: Student API returned HTML. Please contact technical support.",
              );
            }
          }

          // Handle server errors
          if (meta?.response?.status >= 500) {
            console.error("❌ Students API server error:", {
              status: meta.response.status,
              statusText: meta.response.statusText,
              url: meta.request?.url,
              gradeId: grade_level_id,
            });
            throw new Error(
              "Server error occurred while loading students. Please try again later.",
            );
          }

          // Handle authentication errors
          if (
            response?.status === "authentication-required" ||
            meta?.response?.status === 401
          ) {
            console.error("❌ Authentication required for students:", {
              responseStatus: response?.status,
              httpStatus: meta?.response?.status,
              gradeId: grade_level_id,
            });
            throw new Error("Authentication required. Please login again.");
          }

          // Handle authorization errors
          if (meta?.response?.status === 403) {
            console.error("❌ Access forbidden for students:", {
              status: meta.response.status,
              url: meta.request?.url,
              gradeId: grade_level_id,
            });
            throw new Error(
              "Access denied. You don't have permission to view student data.",
            );
          }

          // Handle successful response
          if (response?.status === "successful" && response?.data) {
            try {
              const studentsArray =
                response.data.data || response.data.students || [];

              console.log(
                `📚 Processing ${studentsArray.length} students for grade ${grade_level_id}`,
              );

              const transformedStudents = studentsArray.map((student: any) => {
                // Process student profile image
                let profileImageUrl = null;
                if (student.student_attachment_list?.length > 0) {
                  const firstAttachment = student.student_attachment_list[0];
                  if (firstAttachment?.file_name) {
                    // TODO: Replace with actual backend URL
                    profileImageUrl = `${process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1}uploads/students/${firstAttachment.file_name}`;
                  }
                }

                return {
                  id: student.id,
                  name:
                    student.full_name ||
                    student.name ||
                    `Student ${student.id}`,
                  full_name: student.full_name || student.name,
                  student_calling_name:
                    student.student_calling_name ||
                    student.full_name?.split(" ")[0] ||
                    `Student ${student.id}`,
                  admission_number: student.admission_number,
                  grade_level_id: student.grade_level_id,
                  grade: `Grade ${student.grade_level_id}`,
                  profile_image: profileImageUrl,
                  profileImage:
                    profileImageUrl || "https://via.placeholder.com/50?text=👤",
                  student_attachment_list:
                    student.student_attachment_list || [],
                  active: student.active !== false,
                };
              });

              console.log(
                "✅ Students transformed successfully:",
                transformedStudents.length,
              );

              return {
                status: "successful",
                data: {
                  students: transformedStudents,
                  total_count:
                    response.data.total_count || transformedStudents.length,
                },
              };
            } catch (transformError) {
              console.error("❌ Error transforming student data:", {
                error: transformError,
                gradeId: grade_level_id,
                originalResponse: response,
              });
              throw new Error(
                "Failed to process student data. Please contact support.",
              );
            }
          }

          // Handle empty or null response
          if (!response) {
            console.error("❌ Empty response from students API:", {
              url: meta?.request?.url,
              status: meta?.response?.status,
              gradeId: grade_level_id,
            });
            throw new Error(
              "No student data received from server. Please try again.",
            );
          }

          // Handle unexpected response
          console.error("❌ Unexpected students API response:", {
            response,
            responseType: typeof response,
            responseKeys:
              response && typeof response === "object"
                ? Object.keys(response)
                : "Not an object",
            gradeId: grade_level_id,
            meta: {
              status: meta?.response?.status,
              statusText: meta?.response?.statusText,
              url: meta?.request?.url,
            },
          });
          throw new Error("Failed to load students. Please try again.");
        },
      }),

      // ===== GET ALL STUDENTS WITH PAGINATION =====
      getAllStudentsWithPagination: build.query({
        query: ({
          page = 1,
          page_size = 10,
          search_phrase = "",
          search_filter_list = [],
        }) => {
          const requestBody = {
            page_size,
            page,
            search_phrase,
            search_filter_list,
            // Try sending grade_level_id as null to indicate "all grades"
            grade_level_id: null,
            // Alternative: send a special flag to request all students
            get_all_students: true,
          };

          console.log("📤 All Students Paginated Request Body:", requestBody);

          return {
            url: "api/student-management/student/get-student-list-data",
            method: "POST",
            body: requestBody,
            credentials: "include",
          };
        },
        providesTags: (
          result,
          error,
          { page, page_size, search_phrase, search_filter_list },
        ) => [
          { type: "Students", id: `ALL_PAGE_${page}` },
          { type: "Students", id: "ALL" },
        ],
        transformResponse: (
          response: any,
          meta: any,
          { page, page_size, search_phrase, search_filter_list },
        ) => {
          console.log("👥 All Students Paginated Response:", {
            response,
            responseType: typeof response,
            responseStatus: response?.status,
            responseData: response?.data,
            page,
            totalCountFromAPI: response?.data?.total_count,
            studentsCountFromAPI:
              response?.data?.data?.length || response?.data?.students?.length,
            hasNextPage: response?.data?.next_page_url !== null,
            hasPrevPage: response?.data?.prev_page_url !== null,
          });

          // Handle HTML error responses
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error("❌ All Students API returned HTML instead of JSON");
            throw new Error(
              "Server Configuration Error: Student API returned HTML. Please contact technical support.",
            );
          }

          // Handle authentication errors
          if (
            response?.status === "authentication-required" ||
            meta?.response?.status === 401
          ) {
            console.error("❌ Authentication required for all students");
            throw new Error("Authentication required. Please login again.");
          }

          // Handle successful response - be more flexible with response structure
          if (
            (response?.status === "successful" && response?.data) ||
            (response?.data && Array.isArray(response.data)) ||
            Array.isArray(response)
          ) {
            console.log("✅ Processing all students API response");

            // Try different possible response structures
            let studentsArray = [];
            let totalCount = 0;
            let paginationInfo = {};

            if (response?.status === "successful" && response?.data) {
              // Standard paginated response
              studentsArray =
                response.data.data || response.data.students || [];
              totalCount = response.data.total_count || studentsArray.length;
              paginationInfo = {
                current_page: response.data.current_page || page,
                page_size: response.data.page_size || page_size,
                total_pages:
                  response.data.total_pages ||
                  Math.ceil(totalCount / page_size),
                has_next_page: response.data.next_page_url !== null,
                has_previous_page: response.data.prev_page_url !== null,
              };
            } else if (Array.isArray(response?.data)) {
              // Direct array response
              studentsArray = response.data;
              totalCount = studentsArray.length;
              paginationInfo = {
                current_page: page,
                page_size: page_size,
                total_pages: Math.ceil(totalCount / page_size),
                has_next_page: false,
                has_previous_page: false,
              };
            } else if (Array.isArray(response)) {
              // Direct array response (top level)
              studentsArray = response;
              totalCount = studentsArray.length;
              paginationInfo = {
                current_page: page,
                page_size: page_size,
                total_pages: Math.ceil(totalCount / page_size),
                has_next_page: false,
                has_previous_page: false,
              };
            }

            console.log(
              `📚 Found ${studentsArray.length} students in response (total: ${totalCount})`,
            );

            const transformedStudents = studentsArray.map((student: any) => {
              // Process student profile image
              let profileImageUrl = null;
              if (student.student_attachment_list?.length > 0) {
                const firstAttachment = student.student_attachment_list[0];
                if (firstAttachment?.file_name) {
                  profileImageUrl = `${process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1}uploads/students/${firstAttachment.file_name}`;
                }
              }

              return {
                id: student.id,
                full_name:
                  student.full_name || student.name || `Student ${student.id}`,
                student_calling_name:
                  student.student_calling_name ||
                  student.full_name?.split(" ")[0] ||
                  `Student ${student.id}`,
                admission_number: student.admission_number,
                grade_level_id: student.grade_level_id,
                grade_level: student.grade_level,
                school_house: student.school_house,
                profile_image: profileImageUrl,
                profileImage:
                  profileImageUrl || "https://via.placeholder.com/100?text=👤",
                student_attachment_list: student.student_attachment_list || [],
                // Enhanced student fields for expanded view
                full_name_with_title: student.full_name_with_title,
                gender: student.gender,
                date_of_birth: student.date_of_birth,
                joined_date: student.joined_date,
                student_phone: student.student_phone,
                student_email: student.student_email,
                student_address: student.student_address,
                school_studied_before: student.school_studied_before,
                blood_group: student.blood_group,
                special_health_conditions: student.special_health_conditions,
                student_admission_source_id:
                  student.student_admission_source_id,
                student_admission_source_other:
                  student.student_admission_source_other,
                admission_fee_discount_percentage:
                  student.admission_fee_discount_percentage,
                approved_admission_fee: student.approved_admission_fee,
                applicable_refundable_deposit:
                  student.applicable_refundable_deposit,
                applicable_term_payment: student.applicable_term_payment,
                applicable_year_payment: student.applicable_year_payment,
                is_sport_list: student.is_sport_list,
                active: student.active !== false,
              };
            });

            const result = {
              status: "successful",
              data: {
                students: transformedStudents,
                total_count: totalCount,
                current_page: paginationInfo.current_page,
                page_size: paginationInfo.page_size,
                total_pages: paginationInfo.total_pages,
                has_next_page: paginationInfo.has_next_page,
                has_previous_page: paginationInfo.has_previous_page,
              },
            };

            console.log("✅ Transformed all students API response:", result);
            return result;
          }

          // Handle unexpected response
          console.error("❌ Unexpected all students API response:", {
            response,
            responseType: typeof response,
            expectedFormat:
              'Expected: {status: "successful", data: {students: [...]}}',
          });

          throw new Error("Failed to load students. Please try again.");
        },
      }),

      // ===== POST STUDENTS BY GRADE WITH PAGINATION =====
      getStudentsByGradeWithPagination: build.query({
        query: ({
          grade_level_id,
          page = 1,
          page_size = 10,
          search_phrase = "",
          search_filter_list = [],
        }) => {
          // Create request body with grade_level_id as a direct parameter
          // instead of using search_filter_list for grade filtering
          const requestBody = {
            page_size,
            page,
            search_phrase,
            search_filter_list,
            grade_level_id, // Send grade_level_id directly
          };

          console.log("📤 Paginated Students Request Body:", requestBody);

          return {
            url: "api/student-management/student/get-student-list-data",
            method: "POST",
            body: requestBody,
            credentials: "include",
          };
        },
        providesTags: (result, error, { grade_level_id, page }) => [
          { type: "Students", id: `GRADE_${grade_level_id}_PAGE_${page}` },
          { type: "Students", id: `GRADE_${grade_level_id}` },
        ],
        transformResponse: (
          response: any,
          meta: any,
          { grade_level_id, page },
        ) => {
          console.log("👥 Paginated Students Response Full Details:", {
            response,
            responseType: typeof response,
            responseStatus: response?.status,
            responseData: response?.data,
            meta: {
              request: {
                url: meta?.request?.url,
                method: meta?.request?.method,
                body: meta?.request?.body,
              },
              response: {
                status: meta?.response?.status,
                statusText: meta?.response?.statusText,
              },
            },
          });

          // Handle HTML error responses (including redirects)
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error(
              "❌ Paginated Students API returned HTML instead of JSON",
            );

            if (response.includes("Redirecting to")) {
              throw new Error(
                "Authentication Error: Server is redirecting requests. Your session may have expired. Please log out and log in again.",
              );
            } else {
              throw new Error(
                "Server Configuration Error: API returned HTML page instead of JSON data.",
              );
            }
          }

          // Handle authentication errors
          if (response?.status === "authentication-required") {
            console.error("❌ Authentication required for paginated students");
            throw new Error("Authentication required. Please login again.");
          }

          // Handle successful response with exact status check
          if (response?.status === "successful" && response?.data) {
            console.log("✅ Processing successful API response");

            const studentsArray =
              response.data.data || response.data.students || [];

            console.log(
              `📚 Found ${studentsArray.length} students in response`,
            );

            const transformedStudents = studentsArray.map((student: any) => {
              return {
                id: student.id,
                name:
                  student.full_name || student.name || `Student ${student.id}`,
                full_name: student.full_name || student.name,
                student_calling_name:
                  student.student_calling_name ||
                  student.full_name?.split(" ")[0] ||
                  `Student ${student.id}`,
                admission_number: student.admission_number,
                grade_level_id: student.grade_level_id,
                grade: `Grade ${student.grade_level_id}`,
                student_attachment_list: student.student_attachment_list || [],
                active: student.active !== false,
                // Additional fields for profile pictures
                attachment: student.attachment || null,
                attachments: student.attachments || [],
              };
            });

            const result = {
              status: "successful",
              data: {
                students: transformedStudents,
                total_count:
                  response.data.total_count || transformedStudents.length,
                current_page: page,
                page_size: response.data.page_size || 10,
                total_pages: Math.ceil(
                  (response.data.total_count || transformedStudents.length) /
                    (response.data.page_size || 10),
                ),
                has_next_page: response.data.has_next_page || false,
                has_previous_page: response.data.has_previous_page || false,
              },
            };

            console.log("✅ Transformed API response:", result);
            return result;
          }

          // Handle Laravel/Database errors
          if (response && typeof response === "object" && response.exception) {
            console.error("❌ Backend Database Error:", {
              exception: response.exception,
              message: response.message,
              file: response.file,
              line: response.line,
            });

            if (response.message && response.message.includes("SQLSTATE")) {
              throw new Error(
                `Database Error: The backend database query failed. This might be due to:\n• Incorrect data format sent to server\n• Database schema mismatch\n• Server configuration issue\n\nTechnical details: ${response.message.split("(Connection:")[0]}`,
              );
            } else {
              throw new Error(
                `Backend Error: ${response.message || "Unknown server error occurred"}`,
              );
            }
          }

          // Handle different possible response formats
          if (response && typeof response === "object") {
            // Check for direct data array (different API format)
            if (Array.isArray(response)) {
              console.log("📚 API returned direct array format");
              const transformedStudents = response.map((student: any) => ({
                id: student.id,
                name:
                  student.full_name || student.name || `Student ${student.id}`,
                full_name: student.full_name || student.name,
                student_calling_name:
                  student.student_calling_name ||
                  student.full_name?.split(" ")[0] ||
                  `Student ${student.id}`,
                admission_number: student.admission_number,
                grade_level_id: student.grade_level_id,
                grade: `Grade ${student.grade_level_id}`,
                student_attachment_list: student.student_attachment_list || [],
                active: student.active !== false,
              }));

              return {
                status: "successful",
                data: {
                  students: transformedStudents,
                  total_count: transformedStudents.length,
                  current_page: page,
                  page_size: transformedStudents.length,
                  total_pages: 1,
                  has_next_page: false,
                  has_previous_page: false,
                },
              };
            }

            // Check for data property without status
            if (response.data && Array.isArray(response.data)) {
              console.log("📚 API returned data array without status");
              const transformedStudents = response.data.map((student: any) => ({
                id: student.id,
                name:
                  student.full_name || student.name || `Student ${student.id}`,
                full_name: student.full_name || student.name,
                student_calling_name:
                  student.student_calling_name ||
                  student.full_name?.split(" ")[0] ||
                  `Student ${student.id}`,
                admission_number: student.admission_number,
                grade_level_id: student.grade_level_id,
                grade: `Grade ${student.grade_level_id}`,
                student_attachment_list: student.student_attachment_list || [],
                active: student.active !== false,
              }));

              return {
                status: "successful",
                data: {
                  students: transformedStudents,
                  total_count:
                    response.total_count || transformedStudents.length,
                  current_page: page,
                  page_size: response.page_size || transformedStudents.length,
                  total_pages: response.total_pages || 1,
                  has_next_page: response.has_next_page || false,
                  has_previous_page: response.has_previous_page || false,
                },
              };
            }
          }

          // Handle unexpected response - provide detailed error
          console.error(
            "❌ Unexpected paginated students API response structure:",
            {
              responseType: typeof response,
              responseKeys:
                response && typeof response === "object"
                  ? Object.keys(response)
                  : "Not an object",
              response: response,
              expectedFormat:
                'Expected: {status: "successful", data: {students: [...]}}',
            },
          );

          throw new Error(
            `API Response Format Error: Received unexpected response structure. Expected format with status and data properties.`,
          );
        },
      }),

      // ===== POST CATEGORY LIST WITH PREDEFINED QUESTIONS AND ANSWERS =====
      getCategoryList: build.query({
        query: () => {
          const requestBody = {
            page_size: 10,
            page: 1,
            search_phrase: "",
            search_filter_list: [],
          };

          const baseUrl = process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1;
          const fullUrl = `${baseUrl}/api/educator-feedback-management/category/list`;

          console.log("🧪 DETAILED CATEGORY API REQUEST:", {
            timestamp: new Date().toISOString(),
            fullUrl: fullUrl,
            method: "POST",
            requestBody: requestBody,
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/json",
              Accept: "application/json",
              credentials: "include",
            },
          });

          return {
            url: "api/educator-feedback-management/category/list",
            method: "POST",
            body: requestBody,
            credentials: "include",
          };
        },
        providesTags: [
          { type: "FeedbackCategories", id: "LIST" },
          { type: "FeedbackQuestions", id: "LIST" },
        ],
        transformResponse: (response: any, meta: any) => {
          console.log("🧪 DETAILED CATEGORY API RESPONSE:", {
            timestamp: new Date().toISOString(),
            // Raw response details
            rawResponse: response,
            responseType: typeof response,
            responseSize: JSON.stringify(response).length,

            // Response structure analysis
            responseKeys:
              response && typeof response === "object"
                ? Object.keys(response)
                : "Not an object",
            responseStatus: response?.status,
            responseSuccess: response?.success,
            responseData: response?.data,
            responseDataType: response?.data
              ? typeof response.data
              : "No data property",
            responseDataKeys:
              response?.data && typeof response.data === "object"
                ? Object.keys(response.data)
                : "Data not an object",

            // HTTP details
            httpStatus: meta?.response?.status,
            httpStatusText: meta?.response?.statusText,
            httpHeaders: meta?.response?.headers,

            // Request details
            requestUrl: meta?.request?.url,
            requestMethod: meta?.request?.method,
            requestTimestamp: meta?.request?.timestamp,

            // Performance
            responseTime: meta?.response?.timing || "Not available",
          });

          // Also log the raw response for complete debugging
          console.log("🧪 RAW RESPONSE OBJECT:", response);

          // Response Format Validation and Analysis
          const validateAndAnalyzeResponse = (response: any) => {
            const analysis: {
              formatType: string;
              isValid: boolean;
              suggestions: string[];
              extractedData: any;
              confidence: number;
            } = {
              formatType: "unknown",
              isValid: false,
              suggestions: [],
              extractedData: null,
              confidence: 0,
            };

            // Check for standard success response format
            if (response?.status === "successful" && response?.data) {
              analysis.formatType = "standard_successful";
              analysis.isValid = true;
              analysis.extractedData = response.data;
              analysis.confidence = 1.0;
              analysis.suggestions.push(
                "Standard format detected: {status: 'successful', data: [...]}",
              );
            }
            // Check for boolean success format
            else if (response?.success === true && response?.data) {
              analysis.formatType = "boolean_success";
              analysis.isValid = true;
              analysis.extractedData = response.data;
              analysis.confidence = 0.9;
              analysis.suggestions.push(
                "Boolean success format: {success: true, data: [...]}",
              );
            }
            // Check for direct array response
            else if (Array.isArray(response)) {
              analysis.formatType = "direct_array";
              analysis.isValid = true;
              analysis.extractedData = response;
              analysis.confidence = 0.8;
              analysis.suggestions.push(
                "Direct array response detected - data is the root array",
              );
            }
            // Check for nested data structures
            else if (
              response?.data?.data &&
              Array.isArray(response.data.data)
            ) {
              analysis.formatType = "nested_data";
              analysis.isValid = true;
              analysis.extractedData = response.data.data;
              analysis.confidence = 0.7;
              analysis.suggestions.push(
                "Nested data format: {data: {data: [...]}}",
              );
            }
            // Check for categories property
            else if (
              response?.data?.categories &&
              Array.isArray(response.data.categories)
            ) {
              analysis.formatType = "categories_property";
              analysis.isValid = true;
              analysis.extractedData = response.data.categories;
              analysis.confidence = 0.7;
              analysis.suggestions.push(
                "Categories property format: {data: {categories: [...]}}",
              );
            }
            // Check for any array properties as fallback
            else if (response && typeof response === "object") {
              const arrayKeys = Object.keys(response).filter((key) =>
                Array.isArray(response[key]),
              );
              if (arrayKeys.length > 0) {
                analysis.formatType = "fallback_array_property";
                analysis.isValid = true;
                analysis.extractedData = response[arrayKeys[0]];
                analysis.confidence = 0.5;
                analysis.suggestions.push(
                  `Fallback: Using first array property '${arrayKeys[0]}'`,
                );
                analysis.suggestions.push(
                  `Available arrays: ${arrayKeys.join(", ")}`,
                );
              }
            }

            // Additional analysis for failed cases
            if (!analysis.isValid) {
              if (typeof response === "string") {
                if (response.includes("<!DOCTYPE html>")) {
                  analysis.suggestions.push(
                    "❌ HTML response - check if endpoint exists",
                  );
                } else {
                  analysis.suggestions.push(
                    "❌ String response - expected JSON object",
                  );
                }
              } else if (!response) {
                analysis.suggestions.push(
                  "❌ Null/undefined response - network or server error",
                );
              } else if (typeof response === "object") {
                analysis.suggestions.push(
                  "😕 Object response but no recognizable data structure",
                );
                analysis.suggestions.push(
                  `Available properties: ${Object.keys(response).join(", ")}`,
                );
              }
            }

            return analysis;
          };

          const responseAnalysis = validateAndAnalyzeResponse(response);
          console.log("🧪 RESPONSE FORMAT ANALYSIS:", responseAnalysis);

          // Handle HTML error responses
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error("❌ Category List API returned HTML error page:", {
              url: meta?.request?.url,
              status: meta?.response?.status,
              statusText: meta?.response?.statusText,
            });
            throw new Error(
              "Category list endpoint not found. Please check backend configuration.",
            );
          }

          // Handle network or server errors
          if (meta?.response?.status >= 500) {
            console.error("❌ Category List API server error:", {
              status: meta.response.status,
              statusText: meta.response.statusText,
              url: meta.request?.url,
            });
            throw new Error(
              "Server error occurred. Please try again later or contact support.",
            );
          }

          // Handle authentication errors
          if (
            response?.status === "authentication-required" ||
            meta?.response?.status === 401
          ) {
            console.error("❌ Authentication required for category list:", {
              responseStatus: response?.status,
              httpStatus: meta?.response?.status,
            });
            throw new Error("Authentication required. Please login again.");
          }

          // Handle authorization errors
          if (meta?.response?.status === 403) {
            console.error("❌ Access forbidden for category list:", {
              status: meta.response.status,
              url: meta.request?.url,
            });
            throw new Error(
              "Access denied. You don't have permission to view categories.",
            );
          }

          // Handle the specific backend response format: {success: true, data: [...]}
          if (response?.success === true && Array.isArray(response?.data)) {
            console.log(
              "✅ Processing backend response format: {success: true, data: [...]}",
            );

            try {
              const categoriesData = response.data;
              console.log(
                "📋 Categories data extracted:",
                categoriesData.length,
                "items",
              );

              // Transform categories to match frontend expectations
              const transformedCategories = categoriesData.map(
                (category: any) => ({
                  id: category.id,
                  name:
                    category.name ||
                    category.title ||
                    `Category ${category.id}`,
                  description: `Created by ${category.created_by?.call_name_with_title || "Unknown"}`,
                  active: category.is_active !== false,
                  created_by: category.created_by,
                  created_at: category.created_at,
                  updated_at: category.updated_at,
                  questions:
                    category.predefined_questions?.map((question: any) => {
                      // Map answer_type_id to answer_type
                      let answer_type = "mcq"; // default
                      if (question.edu_fb_answer_type_id === 1) {
                        answer_type = "mcq";
                      } else if (question.edu_fb_answer_type_id === 2) {
                        answer_type = "likert";
                      } else if (question.edu_fb_answer_type_id === 3) {
                        answer_type = "custom";
                      }

                      return {
                        id: question.id,
                        text: question.question,
                        answer_type: answer_type,
                        category_id: question.edu_fb_category_id,
                        answer_type_id: question.edu_fb_answer_type_id,
                        mcq_options:
                          question.predefined_answers?.map(
                            (answer: any) => answer.predefined_answer,
                          ) || [],
                        predefined_answers:
                          question.predefined_answers?.map((answer: any) => ({
                            id: answer.id,
                            text: answer.predefined_answer,
                            weight: answer.predefined_answer_weight,
                            marks: answer.marks,
                            question_id: answer.edu_fb_predefined_question_id,
                          })) || [],
                        marks: Math.max(
                          ...(question.predefined_answers?.map(
                            (a: any) => a.marks,
                          ) || [5]),
                        ),
                        required: true, // Default to required for predefined questions
                      };
                    }) || [],
                  subcategories: [], // No subcategories in this API response, will be handled separately
                }),
              );

              console.log(
                "✅ Transformed categories successfully:",
                transformedCategories.length,
                "categories",
              );

              return {
                status: "successful",
                data: transformedCategories,
              };
            } catch (transformError) {
              console.error("❌ Error transforming category data:", {
                error: transformError,
                originalResponse: response,
              });
              throw new Error(
                "Failed to process category data. Please contact support.",
              );
            }
          }

          // Fallback: Use response analysis for other formats
          if (responseAnalysis.isValid && responseAnalysis.extractedData) {
            console.log(
              `✅ Processing response using ${responseAnalysis.formatType} format (confidence: ${responseAnalysis.confidence})`,
            );
            console.log(
              "✅ Analysis suggestions:",
              responseAnalysis.suggestions,
            );

            try {
              const categoriesData = responseAnalysis.extractedData;
              console.log(
                "📋 Categories data extracted (fallback):",
                categoriesData.length,
                "items",
              );

              // Transform categories to match frontend expectations
              const transformedCategories = categoriesData.map(
                (category: any) => ({
                  id: category.id,
                  name:
                    category.name ||
                    category.title ||
                    `Category ${category.id}`,
                  description: `Created by ${category.created_by?.call_name_with_title || "Unknown"}`,
                  active: category.is_active !== false,
                  created_by: category.created_by,
                  created_at: category.created_at,
                  updated_at: category.updated_at,
                  questions:
                    category.predefined_questions?.map((question: any) => {
                      // Map answer_type_id to answer_type
                      let answer_type = "mcq"; // default
                      if (question.edu_fb_answer_type_id === 1) {
                        answer_type = "mcq";
                      } else if (question.edu_fb_answer_type_id === 2) {
                        answer_type = "likert";
                      } else if (question.edu_fb_answer_type_id === 3) {
                        answer_type = "custom";
                      }

                      return {
                        id: question.id,
                        text: question.question,
                        answer_type: answer_type,
                        category_id: question.edu_fb_category_id,
                        answer_type_id: question.edu_fb_answer_type_id,
                        mcq_options:
                          question.predefined_answers?.map(
                            (answer: any) => answer.predefined_answer,
                          ) || [],
                        predefined_answers:
                          question.predefined_answers?.map((answer: any) => ({
                            id: answer.id,
                            text: answer.predefined_answer,
                            weight: answer.predefined_answer_weight,
                            marks: answer.marks,
                            question_id: answer.edu_fb_predefined_question_id,
                          })) || [],
                        marks: Math.max(
                          ...(question.predefined_answers?.map(
                            (a: any) => a.marks,
                          ) || [5]),
                        ),
                        required: true, // Default to required for predefined questions
                      };
                    }) || [],
                  subcategories: [], // No subcategories in this API response, will be handled separately
                }),
              );

              console.log(
                "✅ Transformed categories successfully (fallback):",
                transformedCategories.length,
                "categories",
              );

              return {
                status: "successful",
                data: transformedCategories,
              };
            } catch (transformError) {
              console.error("❌ Error transforming category data (fallback):", {
                error: transformError,
                originalResponse: response,
              });
              throw new Error(
                "Failed to process category data. Please contact support.",
              );
            }
          }

          // Handle empty or null response
          if (!response) {
            console.error("❌ Empty response from category list API:", {
              url: meta?.request?.url,
              status: meta?.response?.status,
            });
            throw new Error("No data received from server. Please try again.");
          }

          // Try to handle other possible response formats before failing
          if (response && typeof response === "object") {
            console.log("📋 Attempting to handle alternative response format");

            // Check if response has any array properties that could be categories
            const possibleArrayKeys = Object.keys(response).filter((key) =>
              Array.isArray(response[key]),
            );

            console.log("📋 Found array properties:", possibleArrayKeys);

            if (possibleArrayKeys.length > 0) {
              // Try the first array as categories
              const firstArrayKey = possibleArrayKeys[0];
              const categoriesArray = response[firstArrayKey];

              console.log(
                `📋 Using ${firstArrayKey} as categories data:`,
                categoriesArray.length,
                "items",
              );

              try {
                const transformedCategories = categoriesArray.map(
                  (category: any, index: number) => ({
                    id: category.id || index + 1,
                    name:
                      category.name ||
                      category.title ||
                      `Category ${category.id || index + 1}`,
                    description: `Category from ${firstArrayKey}`,
                    active: true,
                    created_by: category.created_by || null,
                    created_at: category.created_at || null,
                    updated_at: category.updated_at || null,
                    questions: [], // Will be populated later if needed
                    subcategories: [],
                  }),
                );

                return {
                  status: "successful",
                  data: transformedCategories,
                };
              } catch (fallbackError) {
                console.error(
                  "❌ Fallback transformation failed:",
                  fallbackError,
                );
              }
            }
          }

          // Handle unexpected response - final fallback
          console.error("❌ All response format handlers failed:", {
            response,
            responseType: typeof response,
            responseKeys:
              response && typeof response === "object"
                ? Object.keys(response)
                : "Not an object",
            httpStatus: meta?.response?.status,
            httpStatusText: meta?.response?.statusText,
            url: meta?.request?.url,
            analysisResults: responseAnalysis,
            possibleSolutions: [
              "Check if backend API endpoint exists",
              "Verify request body format matches backend expectations",
              "Check authentication token",
              "Verify backend returns expected JSON format",
              ...responseAnalysis.suggestions,
            ],
          });
          throw new Error(
            `Failed to load category list. Response analysis: ${responseAnalysis.suggestions.join("; ")}`,
          );
        },
      }),

      // ===== SECTION-SPECIFIC CATEGORY ENDPOINTS =====
      
      // Early Years Categories API
      getCategoryEyList: build.query({
        query: () => {
          console.log("📤 Early Years Category List Request");
          return {
            url: "api/educator-feedback-management/category/ey/list",
            method: "POST",
            body: {},
            credentials: "include",
          };
        },
        providesTags: [{ type: "FeedbackCategories", id: "EY" }],
        transformResponse: (response: any) => {
          console.log("📋 EY Categories Response:", response);
          if (response?.success === true && response?.data) {
            return { status: "successful", data: response.data };
          }
          if (response?.status === "successful" && response?.data) {
            return response;
          }
          throw new Error("Failed to load Early Years categories");
        },
      }),

      // Primary Categories API  
      getCategoryPrList: build.query({
        query: () => {
          console.log("📤 Primary Category List Request");
          return {
            url: "api/educator-feedback-management/category/pr/list",
            method: "POST",
            body: {},
            credentials: "include",
          };
        },
        providesTags: [{ type: "FeedbackCategories", id: "PR" }],
        transformResponse: (response: any) => {
          console.log("📋 PR Categories Response:", response);
          if (response?.success === true && response?.data) {
            return { status: "successful", data: response.data };
          }
          if (response?.status === "successful" && response?.data) {
            return response;
          }
          throw new Error("Failed to load Primary categories");
        },
      }),

      // Secondary Categories API
      getCategoryScList: build.query({
        query: () => {
          console.log("📤 Secondary Category List Request");
          return {
            url: "api/educator-feedback-management/category/sc/list",
            method: "POST",
            body: {},
            credentials: "include",
          };
        },
        providesTags: [{ type: "FeedbackCategories", id: "SC" }],
        transformResponse: (response: any) => {
          console.log("📋 SC Categories Response:", response);
          if (response?.success === true && response?.data) {
            return { status: "successful", data: response.data };
          }
          if (response?.status === "successful" && response?.data) {
            return response;
          }
          throw new Error("Failed to load Secondary categories");
        },
      }),

      // ===== POST FEEDBACK CATEGORIES WITH QUESTIONS (Legacy) =====
      getFeedbackCategoriesWithQuestions: build.query({
        query: () => {
          console.log("📤 Feedback Categories Request");
          return {
            url: "api/educator-feedback-management/category/list",
            method: "POST",
          };
        },
        providesTags: [
          { type: "FeedbackCategories", id: "LIST" },
          { type: "FeedbackQuestions", id: "LIST" },
        ],
        transformResponse: (response: any) => {
          console.log("📋 Categories Response:", response);

          // Handle HTML error responses
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error("❌ Categories API returned HTML error page");
            throw new Error(
              "Categories endpoint not found. Please check backend configuration.",
            );
          }

          // Handle successful response with new format: {success: true, data: [...]}
          if (response?.success === true && response?.data) {
            console.log("✅ Processing categories with new success format");

            // Transform the data to match frontend expectations
            const categoriesData = Array.isArray(response.data)
              ? response.data
              : [response.data];

            const transformedCategories = categoriesData.map(
              (category: any) => ({
                id: category.id,
                name: category.name || `Category ${category.id}`,
                description: `Created by ${category.created_by?.call_name_with_title || "Unknown"}`,
                active: category.is_active !== false,
                created_by: category.created_by,
                created_at: category.created_at,
                updated_at: category.updated_at,
                questions:
                  category.predefined_questions?.map((question: any) => {
                    // Map answer_type_id to answer_type
                    let answer_type = "mcq"; // default
                    if (question.edu_fb_answer_type_id === 1) {
                      answer_type = "mcq";
                    } else if (question.edu_fb_answer_type_id === 2) {
                      answer_type = "likert";
                    } else if (question.edu_fb_answer_type_id === 3) {
                      answer_type = "custom";
                    }

                    return {
                      id: question.id,
                      text: question.question,
                      answer_type: answer_type,
                      category_id: question.edu_fb_category_id,
                      answer_type_id: question.edu_fb_answer_type_id,
                      mcq_options:
                        question.predefined_answers?.map(
                          (answer: any) => answer.predefined_answer,
                        ) || [],
                      predefined_answers:
                        question.predefined_answers?.map((answer: any) => ({
                          id: answer.id,
                          text: answer.predefined_answer,
                          weight: answer.predefined_answer_weight,
                          marks: answer.marks,
                          question_id: answer.edu_fb_predefined_question_id,
                        })) || [],
                      marks: Math.max(
                        ...(question.predefined_answers?.map(
                          (a: any) => a.marks,
                        ) || [5]),
                      ),
                      required: true,
                    };
                  }) || [],
                subcategories: [],
              }),
            );

            console.log(
              "✅ Categories transformed successfully:",
              transformedCategories.length,
            );

            return {
              status: "successful",
              data: transformedCategories,
            };
          }

          // Handle legacy successful response format
          if (response?.status === "successful" && response?.data) {
            return {
              ...response,
              data: response.data.categories || response.data,
            };
          }

          // Handle unexpected response
          console.error(
            "❌ ENHANCED ERROR: Unexpected categories API response:",
            {
              response,
              responseType: typeof response,
              responseKeys:
                response && typeof response === "object"
                  ? Object.keys(response)
                  : "Not an object",
              hasSuccess: !!response?.success,
              hasStatus: !!response?.status,
              hasData: !!response?.data,
              dataType: response?.data ? typeof response.data : null,
              isDataArray: Array.isArray(response?.data),
            },
          );
          throw new Error(
            "Failed to load feedback categories. Please try again.",
          );
        },
      }),

      // ===== POST EDUCATOR FEEDBACKS (LIST WITH FILTERS) =====
      //
      // 🚨 BACKEND TEAM: FILTER IMPLEMENTATION REQUIRED
      //
      // This endpoint sends filter parameters that need Laravel backend support:
      //
      // 1. GRADE FILTER (HIGH Priority):
      //    - Parameter: grade_filter (integer 1-15 or empty string)
      //    - Purpose: Filter feedback by grade level ID
      //    - Backend SQL: WHERE grade_level_id = :grade_filter OR :grade_filter = ''
      //    - Example: grade_filter = 11 should return only "Grade 8" feedback
      //    - Grade IDs: 1=EY1, 2=EY2, 3=EY3, 4=Grade1, ..., 15=Grade12
      //
      // 2. EVALUATION TYPE FILTER (HIGH Priority):
      //    - Parameter: evaluation_type_filter (integer 1-6 or null)
      //    - Purpose: Filter feedback that has active evaluations of specific type
      //    - Backend SQL: WHERE EXISTS (
      //        SELECT 1 FROM educator_feedback_evaluations
      //        WHERE educator_feedback_evaluations.edu_fb_id = educator_feedbacks.id
      //        AND educator_feedback_evaluations.edu_fd_evaluation_type_id = :evaluation_type_filter
      //        AND educator_feedback_evaluations.is_active = 1
      //      ) OR :evaluation_type_filter IS NULL
      //    - Evaluation Types: 1=Under Observation, 2=Accept, 3=Decline,
      //                       4=Aware Parents, 5=Assigning to Counselor, 6=Correction Required
      //
      // 3. SEARCH FILTER (Already Working ✅):
      //    - Parameter: search_phrase (string)
      //    - Already implemented and working correctly
      //
      // 📝 TESTING SCENARIOS:
      //   - grade_filter = 11, evaluation_type_filter = null → Grade 8 feedback, all evaluations
      //   - grade_filter = "", evaluation_type_filter = 2 → All grades, only "Accept" evaluations
      //   - grade_filter = 4, evaluation_type_filter = 1 → Grade 1 feedback, only "Under Observation"
      //
      // ⚠️  CURRENT WORKAROUND: Frontend does client-side filtering for evaluation types
      //     as fallback. Once backend implements these filters, we can remove client-side filtering.
      //
      // 🚀 PERFORMANCE BENEFITS OF BACKEND FILTERING:
      //    - Reduces data transfer (only filtered results sent over network)
      //    - Improves app responsiveness (no client-side processing of large datasets)
      //    - Better pagination (accurate total counts for filtered results)
      //    - Reduced memory usage on mobile devices
      //    - Proper server-side optimization with database indexes
      //
      getEducatorFeedbacks: build.query({
        query: ({ page = 1, page_size = 10, filters = {} }) => {
          const requestBody = {
            page_size,
            page,
            search_phrase: filters.search || "",
            search_filter_list: filters.search_filter_list || [],
            grade_filter: filters.grade_filter ?? null, // Send null explicitly for "All Grades"
          };

          console.log("📤 DETAILED getEducatorFeedbacks Request:", {
            endpoint: "api/educator-feedback-management/feedback/list",
            method: "POST",
            requestBody,
            backendFilterStatus: {
              grade_filter: requestBody.grade_filter
                ? `Filtering grade ${requestBody.grade_filter}`
                : "All grades",
              search_phrase: requestBody.search_phrase
                ? `Searching: "${requestBody.search_phrase}"`
                : "No search",
            },
            parametersMatch: {
              page_size:
                typeof requestBody.page_size === "number" &&
                requestBody.page_size === page_size,
              page:
                typeof requestBody.page === "number" &&
                requestBody.page === page,
              search_phrase: typeof requestBody.search_phrase === "string",
              search_filter_list: Array.isArray(requestBody.search_filter_list),
            },
            rawParams: { page, page_size, filters },
          });

          return {
            url: "api/educator-feedback-management/feedback/list",
            method: "POST",
            body: requestBody,
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          };
        },
        providesTags: (result) => {
          const feedbacks = result?.data?.feedbacks || result?.data?.data || [];
          return feedbacks.length > 0
            ? [
                ...feedbacks.map((feedback: any) => ({
                  type: "EducatorFeedback",
                  id: feedback.id,
                })),
                { type: "EducatorFeedback", id: "LIST" },
              ]
            : [{ type: "EducatorFeedback", id: "LIST" }];
        },
        transformResponse: (response: any, meta: any) => {
          console.log("📝 DETAILED Feedbacks Response:", {
            response,
            responseType: typeof response,
            hasSuccess: response?.success,
            hasData: response?.data,
            dataType: response?.data ? typeof response.data : null,
            dataKeys: response?.data ? Object.keys(response.data) : null,
            rawDataArray: response?.data?.data
              ? response.data.data.length
              : null,
            meta: {
              request: meta?.request,
              response: {
                status: meta?.response?.status,
                statusText: meta?.response?.statusText,
                headers: meta?.response?.headers,
              },
            },
          });

          // Check for network errors
          if (meta?.response?.status >= 400) {
            console.error("❌ HTTP Error in getEducatorFeedbacks:", {
              status: meta.response.status,
              statusText: meta.response.statusText,
              response: response,
            });
          }

          // Handle HTML error responses
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error("❌ Feedbacks API returned HTML error page");
            throw new Error(
              "Feedbacks endpoint not found. Please check backend configuration.",
            );
          }

          // Handle successful response with new backend format
          if (response?.success === true && response?.data) {
            console.log("✅ Processing feedback response with success format");

            const feedbackData = response.data.data || [];
            console.log(`📋 Found ${feedbackData.length} feedback items`);

            // Transform feedback data to match frontend expectations
            const transformedFeedbacks = feedbackData.map((item: any) => {
              // Include ALL evaluations (both active and inactive)
              const allEvaluations = item.evaluations || [];

              return {
                id: item.id,
                student_id: item.student_id,
                grade_level_id: item.grade_level_id,
                grade_level_class_id: item.grade_level_class_id,
                edu_fb_category_id: item.edu_fb_category_id,
                rating: item.rating,
                decline_reason: item.decline_reason,
                status: item.status,
                created_by_designation: item.created_by_designation,
                created_at: item.created_at,
                updated_at: item.updated_at,
                // Nested objects
                created_by: item.created_by,
                student: item.student,
                grade_level: item.grade_level,
                grade_level_class: item.grade_level_class,
                category: item.category,
                evaluations: allEvaluations, // Include ALL evaluations (active and inactive)
                comments: item.comments || [],
                // Transform subcategories to extract subcategory_name
                subcategories:
                  item.subcategories?.map((sub: any) => ({
                    id: sub.id,
                    name: sub.subcategory_name || sub.name,
                    category_id: sub.category_id,
                    ...sub,
                  })) || [],
              };
            });

            const finalResponse = {
              success: true,
              data: {
                data: transformedFeedbacks, // Consistent with getFeedbackList
                feedbacks: transformedFeedbacks, // Legacy support
                pagination: {
                  current_page: response.data.current_page,
                  total_pages: response.data.last_page,
                  total_count: response.data.total,
                  page_size: response.data.per_page,
                  has_next: response.data.next_page_url !== null,
                  has_previous: response.data.prev_page_url !== null,
                },
              },
              message: response.message,
            };

            console.log("🎯 FINAL TRANSFORMED RESPONSE:", {
              finalResponse,
              feedbacksCount: transformedFeedbacks.length,
              firstFeedback: transformedFeedbacks[0],
              pagination: finalResponse.data.pagination,
            });

            // Enhanced subcategories debugging for getEducatorFeedbacks
            console.log(
              "🏷️ API TRANSFORM - Subcategories Analysis (getEducatorFeedbacks):",
              {
                totalFeedbacks: transformedFeedbacks.length,
                feedbacksWithSubcategories: transformedFeedbacks.filter(
                  (f) => f.subcategories && f.subcategories.length > 0,
                ).length,
                subcategoriesBreakdown: transformedFeedbacks
                  .slice(0, 3)
                  .map((f) => ({
                    feedbackId: f.id,
                    studentName: f.student?.full_name,
                    originalSubcategories: feedbackData.find(
                      (orig: any) => orig.id === f.id,
                    )?.subcategories,
                    transformedSubcategories: f.subcategories,
                    subcategoriesCount: f.subcategories?.length || 0,
                  })),
              },
            );

            return finalResponse;
          }

          // Handle legacy successful response format
          if (response?.status === "successful" && response?.data) {
            return {
              ...response,
              data: response.data.feedbacks || response.data,
              pagination: response.data.pagination,
            };
          }

          // Handle unexpected response
          console.error("❌ Unexpected feedbacks API response:", response);
          throw new Error("Failed to load feedback list. Please try again.");
        },
      }),

      // ===== MY FEEDBACKS ENDPOINT =====
      // Get feedbacks created by the logged-in user only
      // With parent comments included
      // Filters by grade_level_id (1-15) - null shows all grades
      getMyFeedbacks: build.query({
        query: ({
          grade_level_id = null,
          page = 1,
          page_size = 10,
        }) => ({
          url: "/api/educator-feedback-management/feedback/my-list",
          method: "POST",
          body: {
            grade_level_id,
            page,
            page_size,
          },
        }),
        transformResponse: (response: any) => {
          console.log("📥 My Feedbacks API Response:", response);

          if (response?.success && response?.data) {
            return {
              success: true,
              data: response.data,
            };
          }

          throw new Error("Failed to load my feedbacks");
        },
        providesTags: ["EducatorFeedback"],
      }),

      // ===== NEW FEEDBACK LIST ENDPOINT =====
      //
      // 🚨 BACKEND TEAM: SAME FILTER REQUIREMENTS AS getEducatorFeedbacks
      //
      // This endpoint also needs the same filter implementation:
      // - grade_filter: Filter by grade level ID (1-15 or empty string for all)
      // - evaluation_type_filter: Filter by evaluation type ID (1-6 or null for all)
      // - search_phrase: Already working ✅
      //
      // See detailed requirements in getEducatorFeedbacks comments above ⬆️
      //
      getFeedbackList: build.query({
        query: ({
          page = 1,
          page_size = 10,
          search_phrase = "",
          search_filter_list = [],
          filters = {},
        }) => {
          const requestBody = {
            page_size,
            page,
            search_phrase,
            search_filter_list,
            grade_filter: filters.grade_filter || "", // 🚨 BACKEND: Implement grade filtering
            evaluation_type_filter: filters.evaluation_type_filter || null, // 🚨 BACKEND: Implement evaluation type filtering
          };

          const fullUrl = `${process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1}/api/educator-feedback-management/feedback/list`;

          console.log("📤 ENHANCED getFeedbackList Request:", {
            timestamp: new Date().toISOString(),
            endpoint: "api/educator-feedback-management/feedback/list",
            fullUrl: fullUrl,
            method: "POST",
            requestBody,
            parametersMatch: {
              page_size:
                typeof requestBody.page_size === "number" &&
                requestBody.page_size === page_size,
              page:
                typeof requestBody.page === "number" &&
                requestBody.page === page,
              search_phrase: typeof requestBody.search_phrase === "string",
              search_filter_list: Array.isArray(requestBody.search_filter_list),
            },
            rawParams: { page, page_size, search_phrase, search_filter_list },
            expectedFormat: {
              page_size: 10,
              page: 1,
              search_phrase: "",
              search_filter_list: [],
            },
            environmentVariables: {
              baseUrl: process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
              isSet: !!process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1,
            },
          });

          return {
            url: "api/educator-feedback-management/feedback/list",
            method: "POST",
            body: requestBody,
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          };
        },
        providesTags: (result) =>
          result?.data?.data
            ? [
                ...result.data.data.map((feedback: any) => ({
                  type: "EducatorFeedback",
                  id: feedback.id,
                })),
                { type: "EducatorFeedback", id: "LIST" },
              ]
            : [{ type: "EducatorFeedback", id: "LIST" }],
        transformResponse: (response: any, meta: any) => {
          console.log("📝 ENHANCED Feedback List Response:", {
            timestamp: new Date().toISOString(),
            response,
            responseType: typeof response,
            hasSuccess: response?.success,
            hasData: response?.data,
            dataType: response?.data ? typeof response.data : null,
            dataKeys: response?.data ? Object.keys(response.data) : null,
            rawDataArray: response?.data?.data
              ? response.data.data.length
              : null,
            meta: {
              request: {
                url: meta?.request?.url,
                method: meta?.request?.method,
                body: meta?.request?.body,
              },
              response: {
                status: meta?.response?.status,
                statusText: meta?.response?.statusText,
                headers: meta?.response?.headers,
                ok: meta?.response?.ok,
              },
              fetchTime: meta?.response?.timing,
            },
            networkInfo: {
              isOnline:
                typeof navigator !== "undefined" ? navigator.onLine : "unknown",
              url: meta?.request?.url,
              redirected: meta?.response?.redirected,
            },
          });

          // Log raw response for debugging
          if (response) {
            console.log(
              "📝 RAW RESPONSE DATA:",
              JSON.stringify(response, null, 2),
            );
          }

          // Handle HTML error responses
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error(
              "❌ ENHANCED ERROR: Feedback List API returned HTML error page:",
              {
                responseLength: response.length,
                responsePreview: response.substring(0, 500),
                url: meta?.request?.url,
                status: meta?.response?.status,
                statusText: meta?.response?.statusText,
              },
            );
            throw new Error(
              "Feedback list endpoint not found. Please check backend configuration.",
            );
          }

          // Handle authentication errors
          if (
            response?.status === "authentication-required" ||
            meta?.response?.status === 401
          ) {
            console.error(
              "❌ ENHANCED ERROR: Authentication required for feedback list:",
              {
                responseStatus: response?.status,
                httpStatus: meta?.response?.status,
                hasAuthHeader: meta?.request?.headers?.Authorization
                  ? "Yes"
                  : "No",
                url: meta?.request?.url,
                responseMessage: response?.message,
              },
            );
            throw new Error("Authentication required. Please login again.");
          }

          // Handle successful response with new backend format
          if (response?.success === true && response?.data) {
            console.log("✅ Processing feedback list success response");

            const feedbackData = response.data.data || [];
            console.log(`📋 Found ${feedbackData.length} feedback items`);

            // Transform feedback data to match frontend expectations
            const transformedFeedbacks = feedbackData.map((item: any) => {
              // Include ALL evaluations (both active and inactive)
              const allEvaluations = item.evaluations || [];

              return {
                id: item.id,
                student_id: item.student_id,
                grade_level_id: item.grade_level_id,
                grade_level_class_id: item.grade_level_class_id,
                edu_fb_category_id: item.edu_fb_category_id,
                rating: item.rating,
                decline_reason: item.decline_reason,
                status: item.status,
                created_by_designation: item.created_by_designation,
                created_at: item.created_at,
                updated_at: item.updated_at,
                // Nested objects
                created_by: item.created_by,
                student: item.student,
                grade_level: item.grade_level,
                grade_level_class: item.grade_level_class,
                category: item.category,
                evaluations: allEvaluations, // Include ALL evaluations (active and inactive)
                comments: item.comments || [],
                // Transform subcategories to extract subcategory_name
                subcategories:
                  item.subcategories?.map((sub: any) => ({
                    id: sub.id,
                    name: sub.subcategory_name || sub.name,
                    category_id: sub.category_id,
                    ...sub,
                  })) || [],
              };
            });

            const finalResponse = {
              success: true,
              data: {
                data: transformedFeedbacks, // This is what the management page expects
                feedbacks: transformedFeedbacks, // This is what some other components expect
                current_page: response.data.current_page,
                per_page: response.data.per_page,
                total: response.data.total,
                prev_page_url: response.data.prev_page_url,
                to: response.data.to,
              },
              message: response.message,
            };

            console.log("🎯 FINAL getFeedbackList RESPONSE:", {
              finalResponse,
              feedbacksCount: transformedFeedbacks.length,
              firstFeedback: transformedFeedbacks[0],
              dataStructure: finalResponse.data,
            });

            // Enhanced subcategories debugging for getFeedbackList
            console.log(
              "🏷️ API TRANSFORM - Subcategories Analysis (getFeedbackList):",
              {
                totalFeedbacks: transformedFeedbacks.length,
                feedbacksWithSubcategories: transformedFeedbacks.filter(
                  (f) => f.subcategories && f.subcategories.length > 0,
                ).length,
                subcategoriesBreakdown: transformedFeedbacks
                  .slice(0, 3)
                  .map((f) => ({
                    feedbackId: f.id,
                    studentName: f.student?.full_name,
                    originalSubcategories: feedbackData.find(
                      (orig: any) => orig.id === f.id,
                    )?.subcategories,
                    transformedSubcategories: f.subcategories,
                    subcategoriesCount: f.subcategories?.length || 0,
                  })),
              },
            );

            return finalResponse;
          }

          // Handle unexpected response
          console.error(
            "❌ ENHANCED ERROR: Unexpected feedback list API response:",
            {
              response,
              responseType: typeof response,
              responseKeys:
                response && typeof response === "object"
                  ? Object.keys(response)
                  : "Not an object",
              httpStatus: meta?.response?.status,
              httpStatusText: meta?.response?.statusText,
              url: meta?.request?.url,
              hasData: !!response?.data,
              hasSuccess: !!response?.success,
              hasStatus: !!response?.status,
              networkError: !meta?.response,
              possibleCauses: [
                "Backend API endpoint does not exist",
                "Backend returned unexpected format",
                "Network connectivity issue",
                "Authentication token expired",
                "CORS policy blocking request",
                "Backend server is down",
              ],
            },
          );
          throw new Error("Failed to load feedback list. Please try again.");
        },
      }),

      // ===== SUBMIT NEW EDUCATOR FEEDBACK =====
      submitEducatorFeedback: build.mutation({
        query: (feedbackData) => {
          // Transform data to match backend API format
          const requestBody = {
            student_ids: feedbackData.student_ids || (feedbackData.student_id ? [feedbackData.student_id] : []),
            grade_level_id: feedbackData.grade_level_id,
            grade_level_class_id:
              feedbackData.grade_level_class_id || feedbackData.grade_level_id, // Same as grade_level_id if not provided
            edu_fb_category_id: feedbackData.edu_fb_category_id,
            rating: feedbackData.rating || null,
            decline_reason: feedbackData.decline_reason || null,
            created_by_designation: feedbackData.created_by_designation || null,
            comments: feedbackData.comments || null,
            question_answers: feedbackData.question_answers || [],
            subcategories: feedbackData.subcategories || [],
          };

          console.log(
            "📤 Submit Feedback Request (Backend Format):",
            requestBody,
          );
          return {
            url: "api/educator-feedback-management/feedback/create",
            method: "POST",
            body: requestBody,
          };
        },
        invalidatesTags: [
          { type: "EducatorFeedback", id: "LIST" },
          { type: "Students", id: "LIST" },
        ],
        transformResponse: (response: any, meta: any) => {
          console.log("🔍 DETAILED Submit Feedback Response Analysis:", {
            response: response,
            responseType: typeof response,
            responseKeys:
              response && typeof response === "object"
                ? Object.keys(response)
                : "Not an object",
            httpStatus: meta?.response?.status,
            httpStatusText: meta?.response?.statusText,
            responseSize: JSON.stringify(response || {}).length,
            timestamp: new Date().toISOString(),
          });

          // Handle HTML error responses
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error("❌ Submit Feedback API returned HTML error page");
            throw new Error(
              "Submit feedback endpoint not found. Please check backend configuration.",
            );
          }

          // Handle HTTP errors
          if (meta?.response?.status && meta.response.status >= 400) {
            console.error("❌ HTTP Error Response:", {
              status: meta.response.status,
              statusText: meta.response.statusText,
              response: response,
            });
            throw new Error(
              `API Error ${meta.response.status}: ${meta.response.statusText || "Unknown error"}`,
            );
          }

          // Handle different successful response formats
          if (
            response?.status === "successful" ||
            response?.success === true ||
            response?.data ||
            response?.id ||
            meta?.response?.status === 200 ||
            meta?.response?.status === 201
          ) {
            console.log("✅ Feedback submission successful!");
            return response;
          }

          // Handle unexpected response - but don't throw error, return response for debugging
          console.warn("⚠️ Unexpected response format (but proceeding):", {
            response,
            expectedFormats: [
              "{status: 'successful', ...}",
              "{success: true, ...}",
              "{data: {...}}",
              "{id: ...}",
              "HTTP 200/201 status",
            ],
          });

          // Return the response anyway - let the component handle it
          return response;
        },
      }),

      // ===== UPDATE EDUCATOR FEEDBACK =====
      updateEducatorFeedback: build.mutation({
        query: ({ feedback_id, updates }) => {
          console.log("📤 Update Feedback Request:", { feedback_id, updates });
          return {
            url: "api/educator-feedback-management/feedback/update",
            method: "POST",
            body: {
              feedback_id,
              ...updates,
            },
          };
        },
        invalidatesTags: (result, error, { feedback_id }) => [
          { type: "EducatorFeedback", id: feedback_id },
          { type: "EducatorFeedback", id: "LIST" },
        ],
      }),

      // ===== DELETE EDUCATOR FEEDBACK =====
      deleteEducatorFeedback: build.mutation({
        query: (feedback_id) => {
          console.log("📤 Delete Feedback Request:", feedback_id);
          return {
            url: "api/educator-feedback-management/feedback/delete",
            method: "POST",
            body: { feedback_id },
          };
        },
        invalidatesTags: (result, error, feedback_id) => [
          { type: "EducatorFeedback", id: feedback_id },
          { type: "EducatorFeedback", id: "LIST" },
        ],
      }),

      // ===== POST FEEDBACK ANALYTICS/METADATA =====
      getFeedbackMetadata: build.query({
        query: (filters = {}) => {
          const requestBody = {
            grade: filters.grade || "",
            student_id: filters.student_id || "",
            date_from: filters.date_from || "",
            date_to: filters.date_to || "",
          };

          console.log("📤 Feedback Metadata Request:", requestBody);
          return {
            url: "api/educator-feedback-management/metadata",
            method: "POST",
            body: requestBody,
          };
        },
        providesTags: [{ type: "EducatorFeedbackMeta", id: "STATS" }],
        transformResponse: (response: any) => {
          console.log("📊 Metadata Response:", response);

          if (response?.status === "successful" && response?.data) {
            return response.data;
          }

          throw new Error(
            "Failed to load feedback metadata. Please try again.",
          );
        },
      }),

      // ===== CREATE FEEDBACK CATEGORY =====
      createFeedbackCategory: build.mutation({
        query: (categoryData) => {
          // Transform data to match backend structure
          const requestBody = {
            name: categoryData.title,
            is_active: true,
            predefined_questions: categoryData.questions.map((q: any) => {
              // Map answer type to backend ID
              let edu_fb_answer_type_id;
              switch (q.answerType) {
                case "likert":
                  edu_fb_answer_type_id = 1;
                  break;
                case "mcq":
                  edu_fb_answer_type_id = 2;
                  break;
                case "custom":
                  edu_fb_answer_type_id = 3;
                  break;
                default:
                  edu_fb_answer_type_id = 1; // Default to Likert Scale
              }

              // Transform question structure
              const question = {
                question: q.text,
                edu_fb_answer_type_id,
                is_active: true,
                predefined_answers: [],
              };

              // Add predefined answers for MCQ questions
              if (
                q.answerType === "mcq" &&
                q.mcqOptions &&
                q.mcqOptions.length > 0
              ) {
                question.predefined_answers = q.mcqOptions.map(
                  (option: any) => ({
                    predefined_answer: option.text,
                    predefined_answer_weight: option.marks,
                    marks: option.marks,
                    is_active: true,
                  }),
                );
              } else if (q.answerType === "likert") {
                // Add standard Likert scale options
                question.predefined_answers = [
                  {
                    predefined_answer: "Excellent",
                    predefined_answer_weight: 5,
                    marks: q.marks || 5,
                    is_active: true,
                  },
                  {
                    predefined_answer: "Good",
                    predefined_answer_weight: 4,
                    marks: q.marks || 4,
                    is_active: true,
                  },
                  {
                    predefined_answer: "Average",
                    predefined_answer_weight: 3,
                    marks: q.marks || 3,
                    is_active: true,
                  },
                  {
                    predefined_answer: "Below Average",
                    predefined_answer_weight: 2,
                    marks: q.marks || 2,
                    is_active: true,
                  },
                  {
                    predefined_answer: "Poor",
                    predefined_answer_weight: 1,
                    marks: q.marks || 1,
                    is_active: true,
                  },
                ];
              } else if (q.answerType === "custom") {
                // For custom answers, create a single flexible answer
                question.predefined_answers = [
                  {
                    predefined_answer: "Custom Answer",
                    predefined_answer_weight: q.marks || 5,
                    marks: q.marks || 5,
                    is_active: true,
                  },
                ];
              }

              return question;
            }),
          };

          console.log(
            "📤 Create Category Request (Backend Format):",
            JSON.stringify(requestBody, null, 2),
          );
          return {
            url: "api/educator-feedback-management/category/create",
            method: "POST",
            body: requestBody,
          };
        },
        invalidatesTags: [
          { type: "FeedbackCategories", id: "LIST" },
          { type: "FeedbackQuestions", id: "LIST" },
        ],
        transformResponse: (response: any) => {
          console.log("✅ Create Category Response:", response);

          // Handle HTML error responses
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error("❌ Create Category API returned HTML error page");
            throw new Error(
              "Create category endpoint not found. Please check backend configuration.",
            );
          }

          // Handle successful response
          if (
            response?.status === "successful" ||
            (response?.message &&
              response.message
                .toLowerCase()
                .includes("created successfully")) ||
            (response?.data && response?.message)
          ) {
            return response;
          }

          // Handle validation errors
          if (response?.status === "error" && response?.errors) {
            const errors = Object.values(response.errors).flat();
            throw new Error(errors.join(", "));
          }

          // Handle explicit error responses
          if (
            response?.status === "error" ||
            (response?.message &&
              response.message.toLowerCase().includes("error")) ||
            (response?.message &&
              response.message.toLowerCase().includes("failed"))
          ) {
            const errorMessage =
              response?.message ||
              response?.error ||
              "Failed to create category. Please try again.";
            throw new Error(errorMessage);
          }

          // Handle unexpected response
          console.error("❌ Unexpected create category response:", {
            response,
            responseType: typeof response,
            hasStatus: response?.hasOwnProperty("status"),
            hasData: response?.hasOwnProperty("data"),
            hasErrors: response?.hasOwnProperty("errors"),
            fullResponse: JSON.stringify(response, null, 2),
          });

          // If we get here, assume it's a server error
          throw new Error("Failed to create category. Please try again.");
        },
      }),

      // ===== UPDATE FEEDBACK CATEGORY =====
      updateFeedbackCategory: build.mutation({
        query: ({ category_id, updates }) => {
          console.log("📤 Update Category Request:", { category_id, updates });
          return {
            url: "api/educator-feedback-management/category/update",
            method: "POST",
            body: {
              category_id,
              title: updates.title,
              questions: updates.questions?.map((q: any) => ({
                id: q.id,
                text: q.text,
                answer_type: q.answerType,
                mcq_options: q.answerType === "mcq" ? q.mcqOptions : [],
                marks: q.marks || 1,
                required: q.required || false,
              })),
            },
          };
        },
        invalidatesTags: (result, error, { category_id }) => [
          { type: "FeedbackCategories", id: category_id },
          { type: "FeedbackCategories", id: "LIST" },
          { type: "FeedbackQuestions", id: "LIST" },
        ],
      }),

      // ===== DELETE FEEDBACK CATEGORY =====
      deleteFeedbackCategory: build.mutation({
        query: (category_id) => {
          console.log("📤 Delete Category Request:", category_id);
          return {
            url: "api/educator-feedback-management/category/delete",
            method: "POST",
            body: { category_id },
          };
        },
        invalidatesTags: (result, error, category_id) => [
          { type: "FeedbackCategories", id: category_id },
          { type: "FeedbackCategories", id: "LIST" },
          { type: "FeedbackQuestions", id: "LIST" },
        ],
      }),

      // ===== ADD EVALUATION =====
      addEvaluation: build.mutation({
        query: (evaluationData) => {
          console.log("📤 Add Evaluation Request:", evaluationData);
          console.log("📤 Evaluation Data Structure:", {
            edu_fb_id: evaluationData.edu_fb_id,
            edu_fd_evaluation_type_id: evaluationData.edu_fd_evaluation_type_id,
            reviewer_feedback: evaluationData.reviewer_feedback,
            is_parent_visible: evaluationData.is_parent_visible,
          });
          return {
            url: "api/educator-feedback-management/evaluation/create",
            method: "POST",
            body: evaluationData,
          };
        },
        invalidatesTags: (result, error, { edu_fb_id }) => [
          { type: "EducatorFeedback", id: edu_fb_id },
          { type: "EducatorFeedback", id: "LIST" },
        ],
      }),

      // ===== DELETE EVALUATION =====
      deleteEvaluation: build.mutation({
        query: (evaluation_id) => {
          console.log("📤 Delete Evaluation Request:", {
            id: evaluation_id,
            endpoint: "/api/educator-feedback-management/evaluation/delete",
          });
          return {
            url: "api/educator-feedback-management/evaluation/delete",
            method: "POST",
            body: { id: evaluation_id },
          };
        },
        transformResponse: (response: any) => {
          console.log("📥 Delete Evaluation Response:", response);

          // Handle successful deletion
          if (
            response?.status === "success" ||
            response?.message?.includes("successfully")
          ) {
            return { success: true, message: response.message };
          }

          // Handle error responses
          if (response?.status === "error") {
            throw new Error(response.message || "Failed to delete evaluation");
          }

          // Default success response
          return { success: true, message: "Evaluation deleted successfully" };
        },
        invalidatesTags: (result, error, evaluation_id) => [
          { type: "EducatorFeedback", id: "LIST" },
        ],
      }),

      // ===== DELETE FEEDBACK =====
      deleteFeedback: build.mutation({
        query: (feedback_id) => {
          console.log("📤 Delete Feedback Request - Raw ID:", feedback_id);
          console.log(
            "📤 Delete Feedback Request - ID Type:",
            typeof feedback_id,
          );
          const requestBody = { id: feedback_id };
          console.log("📤 Delete Feedback Request - Body:", requestBody);
          return {
            url: "api/educator-feedback-management/feedback/delete",
            method: "POST",
            body: requestBody,
          };
        },
        invalidatesTags: (result, error, feedback_id) => [
          { type: "EducatorFeedback", id: feedback_id },
          { type: "EducatorFeedback", id: "LIST" },
        ],
      }),

      // ===== CREATE COMMENT =====
      createComment: build.mutation({
        query: ({ edu_fb_id, comment }) => {
          console.log("📤 Create Comment Request:", { edu_fb_id, comment });
          return {
            url: "api/educator-feedback-management/comment/create",
            method: "POST",
            body: {
              edu_fb_id,
              comment,
            },
          };
        },
        transformResponse: (response: any, meta: any) => {
          console.log("📥 Create Comment Response:", response);

          // Handle successful response
          if (
            response?.status === "success" ||
            response?.message?.includes("successfully") ||
            meta?.response?.status === 200 ||
            meta?.response?.status === 201
          ) {
            return {
              success: true,
              message: response?.message || "Comment updated successfully",
            };
          }

          // Handle error responses
          if (response?.status === "error") {
            throw new Error(response.message || "Failed to update comment");
          }

          // Default success response
          return { success: true, message: "Comment updated successfully" };
        },
        invalidatesTags: (result, error, { edu_fb_id }) => [
          { type: "EducatorFeedback", id: edu_fb_id },
          { type: "EducatorFeedback", id: "LIST" },
        ],
      }),

      // ===== GET STUDENT RATINGS BY TERM =====
      getStudentRatingsByTerm: build.query({
        query: ({ student_id, year }) => {
          console.log("📤 Student Ratings by Term API Request:", {
            student_id,
            year,
          });
          return {
            url: "api/educator-feedback-management/dashboard/student-ratings-by-term",
            method: "POST",
            body: {
              student_id,
              year,
            },
          };
        },
        providesTags: (result, error, { student_id, year }) => [
          {
            type: "EducatorFeedback",
            id: `TERM_RATINGS_${student_id}_${year}`,
          },
        ],
        transformResponse: (response: any) => {
          console.log("📊 Student Ratings by Term Response:", response);

          // Handle HTML error responses
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error("❌ API returned HTML error page");
            throw new Error(
              "Server returned an error page. Please check if the API endpoint exists.",
            );
          }

          // Handle authentication errors
          if (response?.status === "authentication-required") {
            console.error(
              "🔒 Authentication required for student ratings by term",
            );
            throw new Error("Authentication required. Please log in again.");
          }

          // Handle API errors
          if (!response?.success) {
            console.error("❌ Student Ratings by Term API Error:", response);
            throw new Error(
              response?.message ||
                "Failed to fetch student ratings by term data",
            );
          }

          // Validate response structure
          if (!response?.data) {
            console.error("❌ Invalid response structure - missing data");
            throw new Error("Invalid response format from server");
          }

          return response;
        },
      }),

      // ===== GET STUDENT CATEGORY FEEDBACK LIST =====
      getStudentCategoryFeedbackList: build.query({
        query: ({ student_id, page = 1, page_size = 10 }) => {
          console.log("📤 Student Category Feedback List API Request:", {
            student_id,
            page,
            page_size,
          });
          return {
            url: "api/educator-feedback-management/student-category-feedback/list",
            method: "POST",
            body: {
              student_id,
              page,
              page_size,
            },
          };
        },
        providesTags: (result, error, { student_id, page }) => [
          {
            type: "EducatorFeedback",
            id: `STUDENT_FEEDBACK_${student_id}_${page}`,
          },
          { type: "EducatorFeedback", id: "LIST" },
        ],
        transformResponse: (response: any) => {
          console.log("📊 Student Category Feedback List Response:", response);

          // Handle HTML error responses
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error("❌ API returned HTML error page");
            throw new Error(
              "Server returned an error page. Please check if the API endpoint exists.",
            );
          }

          // Handle authentication errors
          if (response?.status === "authentication-required") {
            console.error(
              "🔒 Authentication required for student feedback list",
            );
            throw new Error("Authentication required. Please log in again.");
          }

          // Handle API errors
          if (!response?.success) {
            console.error(
              "❌ Student Category Feedback List API Error:",
              response,
            );
            throw new Error(
              response?.message || "Failed to fetch student feedback data",
            );
          }

          // Validate response structure
          if (!response?.data) {
            console.error("❌ Invalid response structure - missing data");
            throw new Error("Invalid response format from server");
          }

          // Transform Laravel pagination format to our expected format
          const transformedResponse = {
            ...response,
            data: {
              feedback_list: response.data.data || [], // Laravel puts actual data in .data.data
              pagination: {
                current_page: response.data.current_page,
                total: response.data.total,
                per_page: response.data.per_page,
                last_page: response.data.last_page,
                from: response.data.from,
                to: response.data.to,
                next_page_url: response.data.next_page_url,
                prev_page_url: response.data.prev_page_url,
              },
            },
          };

          console.log("✅ Transformed feedback response:", transformedResponse);
          return transformedResponse;
        },
        transformErrorResponse: (response: any, meta: any) => {
          console.log(
            "❌ Student Category Feedback List Error Response:",
            response,
            meta,
          );

          // Handle 401 authentication errors
          if (meta?.response?.status === 401) {
            return {
              status: 401,
              data: {
                status: "authentication-required",
                message: "Authentication required. Please log in again.",
              },
            };
          }

          // Handle 500 server errors (API endpoint issues)
          if (meta?.response?.status === 500) {
            return {
              status: 500,
              data: {
                status: "server-error",
                message:
                  "Server error occurred. This API endpoint may not be implemented yet or there's a server configuration issue.",
              },
            };
          }

          // Handle 404 not found errors
          if (meta?.response?.status === 404) {
            return {
              status: 404,
              data: {
                status: "not-found",
                message:
                  "API endpoint not found. This feature may not be available yet.",
              },
            };
          }

          return response;
        },
      }),

      // ===== GET EDUCATOR FEEDBACK STATISTICS =====
      getEducatorFeedbackStats: build.query({
        query: ({ period }: { period?: "this_week" | "this_month" | "this_year" | null }) => {
          console.log("📤 Educator Feedback Stats API Request:", { period });
          return {
            url: "api/educator-feedback-management/stats/educator-feedback-counts",
            method: "POST",
            body: period ? { period } : {},
          };
        },
        providesTags: [{ type: "EducatorFeedback", id: "STATS" }],
        transformResponse: (response: any) => {
          console.log("📊 Educator Feedback Stats Response:", response);

          // Handle HTML error responses
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error("❌ API returned HTML error page");
            throw new Error(
              "Server returned an error page. Please check if the API endpoint exists.",
            );
          }

          // Handle authentication errors
          if (response?.status === "authentication-required") {
            console.error("🔒 Authentication required for feedback stats");
            throw new Error("Authentication required. Please log in again.");
          }

          // Handle API errors
          if (!response?.success) {
            console.error("❌ Educator Feedback Stats API Error:", response);
            throw new Error(
              response?.message || "Failed to fetch educator feedback statistics",
            );
          }

          // Validate response structure
          if (!response?.data) {
            console.error("❌ Invalid response structure - missing data");
            throw new Error("Invalid response format from server");
          }

          return response;
        },
        transformErrorResponse: (response: any, meta: any) => {
          console.log("❌ Educator Feedback Stats Error Response:", response, meta);

          // Handle 401 authentication errors
          if (meta?.response?.status === 401) {
            return {
              status: 401,
              data: {
                status: "authentication-required",
                message: "Authentication required. Please log in again.",
              },
            };
          }

          // Handle 500 server errors
          if (meta?.response?.status === 500) {
            return {
              status: 500,
              data: {
                status: "server-error",
                message:
                  "Server error occurred. This API endpoint may not be implemented yet or there's a server configuration issue.",
              },
            };
          }

          // Handle 404 not found errors
          if (meta?.response?.status === 404) {
            return {
              status: 404,
              data: {
                status: "not-found",
                message:
                  "API endpoint not found. This feature may not be available yet.",
              },
            };
          }

          return response;
        },
      }),

      // ===== GET STUDENT FEEDBACK STATISTICS =====
      getStudentFeedbackStats: build.query({
        query: ({ period }: { period?: "this_week" | "this_month" | "this_year" | null }) => {
          console.log("📤 Student Feedback Stats API Request:", { period });
          return {
            url: "api/educator-feedback-management/stats/student-feedback-counts",
            method: "POST",
            body: period ? { period } : {},
          };
        },
        providesTags: [{ type: "EducatorFeedback", id: "STUDENT_STATS" }],
        transformResponse: (response: any) => {
          console.log("📊 Student Feedback Stats Response:", response);

          // Handle HTML error responses
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error("❌ API returned HTML error page");
            throw new Error(
              "Server returned an error page. Please check if the API endpoint exists.",
            );
          }

          // Handle authentication errors
          if (response?.status === "authentication-required") {
            console.error("🔒 Authentication required for student feedback stats");
            throw new Error("Authentication required. Please log in again.");
          }

          // Handle API errors
          if (!response?.success) {
            console.error("❌ Student Feedback Stats API Error:", response);
            throw new Error(
              response?.message || "Failed to fetch student feedback statistics",
            );
          }

          // Validate response structure
          if (!response?.data) {
            console.error("❌ Invalid response structure - missing data");
            throw new Error("Invalid response format from server");
          }

          return response;
        },
        transformErrorResponse: (response: any, meta: any) => {
          console.log("❌ Student Feedback Stats Error Response:", response, meta);

          // Handle 401 authentication errors
          if (meta?.response?.status === 401) {
            return {
              status: 401,
              data: {
                status: "authentication-required",
                message: "Authentication required. Please log in again.",
              },
            };
          }

          // Handle 500 server errors
          if (meta?.response?.status === 500) {
            return {
              status: 500,
              data: {
                status: "server-error",
                message:
                  "Server error occurred. This API endpoint may not be implemented yet or there's a server configuration issue.",
              },
            };
          }

          // Handle 404 not found errors
          if (meta?.response?.status === 404) {
            return {
              status: 404,
              data: {
                status: "not-found",
                message:
                  "API endpoint not found. This feature may not be available yet.",
              },
            };
          }

          return response;
        },
      }),

      // ===== PARENT COMMENT MANAGEMENT =====

      // Get parent comments for a specific educator feedback
      getParentComments: build.query({
        query: ({ edu_fb_id }: { edu_fb_id: string }) => {
          console.log("📤 Get Parent Comments API Request:", { edu_fb_id });
          return {
            url: "api/educator-feedback-management/parent-comment/list",
            method: "POST",
            body: { edu_fb_id },
          };
        },
        providesTags: (result, error, { edu_fb_id }) => [
          { type: "EducatorFeedback", id: `PARENT_COMMENTS_${edu_fb_id}` },
        ],
        transformResponse: (response: any) => {
          console.log("💬 Parent Comments Response:", response);

          // Handle no response or empty - return empty array
          if (!response) {
            return { success: true, data: [] };
          }

          // Handle array response directly
          if (Array.isArray(response)) {
            return { success: true, data: response };
          }

          // Handle object with data array
          if (response.data && Array.isArray(response.data)) {
            return response;
          }

          // Handle success with empty data
          if (response.success && !response.data) {
            return { success: true, data: [] };
          }

          // Default: return as-is or empty
          return response || { success: true, data: [] };
        },
        transformErrorResponse: (response: any, meta: any) => {
          console.log("⚠️ Parent Comments Error (treating as empty):", response, meta);

          // Treat 404 as empty comments (not an error)
          if (meta?.response?.status === 404) {
            return { status: 404, data: { success: true, data: [] } };
          }

          // Treat validation errors as empty
          if (meta?.response?.status === 422) {
            return { status: 422, data: { success: true, data: [] } };
          }

          // Return error for real issues (500, network, etc.)
          return response;
        },
      }),

      // Create a new parent comment
      createParentComment: build.mutation({
        query: ({ edu_fb_id, comment }: { edu_fb_id: string; comment: string }) => {
          console.log("📤 Create Parent Comment API Request:", { edu_fb_id, comment });
          return {
            url: "api/educator-feedback-management/parent-comment/create",
            method: "POST",
            body: { edu_fb_id, comment },
          };
        },
        invalidatesTags: (result, error, { edu_fb_id }) => [
          { type: "EducatorFeedback", id: `PARENT_COMMENTS_${edu_fb_id}` },
        ],
        transformResponse: (response: any) => {
          console.log("💬 Create Parent Comment Response:", response);
          return response;
        },
      }),

      // Update an existing parent comment
      updateParentComment: build.mutation({
        query: ({ id, comment, edu_fb_id }: { id: number; comment: string; edu_fb_id: string }) => {
          console.log("📤 Update Parent Comment API Request:", { id, comment });
          return {
            url: "api/educator-feedback-management/parent-comment/update",
            method: "POST",
            body: { id, comment },
          };
        },
        invalidatesTags: (result, error, { edu_fb_id }) => [
          { type: "EducatorFeedback", id: `PARENT_COMMENTS_${edu_fb_id}` },
        ],
        transformResponse: (response: any) => {
          console.log("💬 Update Parent Comment Response:", response);
          return response;
        },
      }),

      // Delete a parent comment (soft delete)
      deleteParentComment: build.mutation({
        query: ({ id, edu_fb_id }: { id: number; edu_fb_id: string }) => {
          console.log("📤 Delete Parent Comment API Request:", { id });
          return {
            url: "api/educator-feedback-management/parent-comment/delete",
            method: "POST",
            body: { id },
          };
        },
        invalidatesTags: (result, error, { edu_fb_id }) => [
          { type: "EducatorFeedback", id: `PARENT_COMMENTS_${edu_fb_id}` },
        ],
        transformResponse: (response: any) => {
          console.log("💬 Delete Parent Comment Response:", response);
          return response;
        },
      }),
    }),
  });

// Export generated hooks for each endpoint
export const {
  useGetStudentListDataQuery,
  useLazyGetStudentListDataQuery,
  useGetStudentsByGradeQuery,
  useLazyGetStudentsByGradeQuery,
  useGetAllStudentsWithPaginationQuery,
  useLazyGetAllStudentsWithPaginationQuery,
  useGetStudentsByGradeWithPaginationQuery,
  useLazyGetStudentsByGradeWithPaginationQuery,
  useGetCategoryListQuery,
  useLazyGetCategoryListQuery,
  // Section-specific category hooks
  useGetCategoryEyListQuery,
  useLazyGetCategoryEyListQuery,
  useGetCategoryPrListQuery,
  useLazyGetCategoryPrListQuery,
  useGetCategoryScListQuery,
  useLazyGetCategoryScListQuery,
  useGetFeedbackCategoriesWithQuestionsQuery,
  useLazyGetFeedbackCategoriesWithQuestionsQuery,
  useGetEducatorFeedbacksQuery,
  useLazyGetEducatorFeedbacksQuery,
  useGetMyFeedbacksQuery,
  useLazyGetMyFeedbacksQuery,
  useGetFeedbackListQuery,
  useLazyGetFeedbackListQuery,
  useSubmitEducatorFeedbackMutation,
  useUpdateEducatorFeedbackMutation,
  useDeleteEducatorFeedbackMutation,
  useGetFeedbackMetadataQuery,
  useLazyGetFeedbackMetadataQuery,
  useCreateFeedbackCategoryMutation,
  useUpdateFeedbackCategoryMutation,
  useDeleteFeedbackCategoryMutation,
  useAddEvaluationMutation,
  useDeleteEvaluationMutation,
  useDeleteFeedbackMutation,
  useCreateCommentMutation,
  useGetStudentRatingsByTermQuery,
  useLazyGetStudentRatingsByTermQuery,
  useGetStudentCategoryFeedbackListQuery,
  useLazyGetStudentCategoryFeedbackListQuery,
  useGetEducatorFeedbackStatsQuery,
  useLazyGetEducatorFeedbackStatsQuery,
  useGetStudentFeedbackStatsQuery,
  useLazyGetStudentFeedbackStatsQuery,
  // Parent comment hooks
  useGetParentCommentsQuery,
  useLazyGetParentCommentsQuery,
  useCreateParentCommentMutation,
  useUpdateParentCommentMutation,
  useDeleteParentCommentMutation,
} = educatorFeedbackApi;
