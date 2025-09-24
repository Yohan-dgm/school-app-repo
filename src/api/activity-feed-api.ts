import { apiServer1 } from "./api-server-1";
import { formatMediaStorageUrl } from "../utils/postUtils";

// Define the activity feed API slice with RTK Query
export const activityFeedApi = apiServer1
  .enhanceEndpoints({
    addTagTypes: ["ActivityFeed", "SchoolPosts", "ClassPosts", "StudentPosts"],
  })
  .injectEndpoints({
    overrideExisting: true, // Fix RTK Query endpoint override warnings
    endpoints: (build) => ({
      // ===== SCHOOL POSTS API =====
      getSchoolPosts: build.query({
        query: ({ page = 1, limit = 10, filters = {} }) => {
          console.log("🔍 API Slice - Received parameters:", {
            page,
            limit,
            filters,
          });

          // Map frontend filter names to backend expected names
          const body = {
            page,
            page_size: limit, // Backend expects 'page_size' not 'limit'
            search_phrase: filters.search || "", // Backend expects 'search_phrase' not 'search'
            search_filter_list: [], // Backend expects this parameter
            category: filters.category || "",
            date_from: filters.dateFrom || filters.date_from || "", // Support both dateFrom and date_from
            date_to: filters.dateTo || filters.date_to || "", // Support both dateTo and date_to
            hashtags: filters.hashtags || [],
          };

          console.log("📤 School Posts API Request Body:", body);

          return {
            url: "api/activity-feed-management/school-posts/list",
            method: "POST",
            body,
          };
        },
        providesTags: (result) =>
          result?.data?.posts
            ? [
                ...result.data.posts.map((post: any) => ({
                  type: "SchoolPosts",
                  id: post.id,
                })),
                { type: "SchoolPosts", id: "LIST" },
              ]
            : [{ type: "SchoolPosts", id: "LIST" }],
        transformResponse: (response: any) => {
          // console.log("🏫 School Posts API Response:", response);

          // Check if response is HTML (error page)
          if (
            typeof response === "string" &&
            response.includes("<!DOCTYPE html>")
          ) {
            console.error(
              "❌ School Posts API returned HTML instead of JSON:",
              response.substring(0, 200),
            );
            throw new Error("Server returned HTML error page instead of JSON");
          }

          // Transform the response to match expected structure
          if (response.status === "successful" && response.data) {
            return {
              ...response,
              data: response.data.posts, // Extract posts array for easier access
              pagination: response.data.pagination, // Keep pagination separate
            };
          }
          return response;
        },
      }),

      // ===== CLASS POSTS API =====
      getClassPosts: build.query({
        query: ({ class_id, page = 1, limit = 10, filters = {} }) => {
          const body = {
            class_id,
            page,
            page_size: limit, // Backend expects 'page_size' not 'limit'
            search_phrase: filters.search || "", // Backend expects 'search_phrase'
            search_filter_list: [], // Backend expects this parameter
            category: filters.category || "",
            date_from: filters.dateFrom || filters.date_from || "", // Support both dateFrom and date_from
            date_to: filters.dateTo || filters.date_to || "", // Support both dateTo and date_to
            hashtags: filters.hashtags || [],
          };

          console.log("📤 Class Posts API Request Body:", body);

          return {
            url: "api/activity-feed-management/class-posts/list",
            method: "POST",
            body,
          };
        },
        providesTags: (result, error, { class_id }) =>
          result?.data
            ? [
                ...result.data.map((post: any) => ({
                  type: "ClassPosts",
                  id: post.id,
                })),
                { type: "ClassPosts", id: `CLASS_${class_id}` },
              ]
            : [{ type: "ClassPosts", id: `CLASS_${class_id}` }],
        transformResponse: (response: any) => {
          console.log("🎓 Class Posts API Response:", response);
          // Transform the response to match expected structure
          if (response.success && response.data && response.data.posts) {
            return {
              status: "successful", // Convert to expected format
              data: response.data.posts, // Extract posts array for easier access
              pagination: response.data.pagination, // Keep pagination separate
            };
          }
          return response;
        },
      }),

      // ===== STUDENT POSTS API =====
      getStudentPosts: build.query({
        query: ({ student_id, page = 1, limit = 10, filters = {} }) => {
          const body = {
            student_id,
            page,
            page_size: limit, // Backend expects 'page_size' not 'limit'
            search_phrase: filters.search || "", // Backend expects 'search_phrase'
            search_filter_list: [], // Backend expects this parameter
            category: filters.category || "",
            date_from: filters.dateFrom || filters.date_from || "", // Support both dateFrom and date_from
            date_to: filters.dateTo || filters.date_to || "", // Support both dateTo and date_to
            hashtags: filters.hashtags || [],
          };

          console.log("📤 Student Posts API Request Body:", body);

          return {
            url: "api/activity-feed-management/student-posts/list",
            method: "POST",
            body,
          };
        },
        providesTags: (result, error, { student_id }) =>
          result?.data
            ? [
                ...result.data.map((post: any) => ({
                  type: "StudentPosts",
                  id: post.id,
                })),
                { type: "StudentPosts", id: `STUDENT_${student_id}` },
              ]
            : [{ type: "StudentPosts", id: `STUDENT_${student_id}` }],
        transformResponse: (response: any) => {
          console.log("👨‍🎓 Student Posts API Response:", response);
          // Transform the response to match expected structure
          if (response.success && response.data && response.data.posts) {
            return {
              status: "successful", // Convert to expected format
              data: response.data.posts, // Extract posts array for easier access
              pagination: response.data.pagination, // Keep pagination separate
            };
          }
          return response;
        },
      }),

      // ===== LIKE POST APIs =====
      likePost: build.mutation({
        query: ({ post_id, action }) => ({
          url: "/api/activity-feed-management/school-posts/toggle-like",
          method: "POST",
          body: {
            post_id,
            action, // 'like' or 'unlike'
          },
        }),
        invalidatesTags: (result, error, { post_id }) => [
          { type: "SchoolPosts", id: post_id },
        ],
      }),

      // ===== LIKE CLASS POST API =====
      likeClassPost: build.mutation({
        query: ({ post_id, action }) => ({
          url: "/api/activity-feed-management/class-posts/toggle-like",
          method: "POST",
          body: {
            post_id,
            action, // 'like' or 'unlike'
          },
        }),
        invalidatesTags: (result, error, { post_id }) => [
          { type: "ClassPosts", id: post_id },
        ],
      }),

      // ===== LIKE STUDENT POST API =====
      likeStudentPost: build.mutation({
        query: ({ post_id, action }) => ({
          url: "/api/activity-feed-management/student-posts/toggle-like",
          method: "POST",
          body: {
            post_id,
            action, // 'like' or 'unlike'
          },
        }),
        invalidatesTags: (result, error, { post_id }) => [
          { type: "StudentPosts", id: post_id },
        ],
      }),

      // ===== DELETE POST APIs =====
      deleteSchoolPost: build.mutation({
        query: ({ post_id }) => ({
          url: "/api/activity-feed-management/school-posts/delete",
          method: "DELETE",
          body: {
            post_id,
          },
        }),
        invalidatesTags: (result, error, { post_id }) => [
          { type: "SchoolPosts", id: post_id },
          { type: "SchoolPosts", id: "LIST" },
        ],
      }),

      deleteClassPost: build.mutation({
        query: ({ post_id }) => ({
          url: "/api/activity-feed-management/class-posts/delete",
          method: "DELETE",
          body: {
            post_id,
          },
        }),
        invalidatesTags: (result, error, { post_id }) => [
          { type: "ClassPosts", id: post_id },
        ],
      }),

      deleteStudentPost: build.mutation({
        query: ({ post_id }) => ({
          url: "/api/activity-feed-management/student-posts/delete",
          method: "DELETE",
          body: {
            post_id,
          },
        }),
        invalidatesTags: (result, error, { post_id }) => [
          { type: "StudentPosts", id: post_id },
        ],
      }),

      // ===== GET POST DETAILS API =====
      getPostDetails: build.query({
        query: (post_id) => ({
          url: `api/activity-feed/post/${post_id}`,
          method: "GET",
        }),
        providesTags: (result, error, post_id) => [
          { type: "SchoolPosts", id: post_id },
          { type: "ClassPosts", id: post_id },
          { type: "StudentPosts", id: post_id },
        ],
      }),

      // ===== CREATE POST APIs =====

      // ===== UPLOAD MEDIA API =====
      uploadMedia: build.mutation({
        query: (formData) => {
          console.log("📎 Uploading media files with FormData");
          return {
            url: "/api/activity-feed-management/media/upload",
            method: "POST",
            body: formData, // FormData with media files
          };
        },
        transformResponse: (response: any) => {
          console.log("📎 ===== MEDIA UPLOAD API RESPONSE ANALYSIS =====");
          console.log(
            "📎 Raw Response (full):",
            JSON.stringify(response, null, 2),
          );
          console.log("📎 Response type:", typeof response);
          console.log("📎 Response keys:", Object.keys(response || {}));

          // Log all possible data fields to understand structure
          if (response) {
            console.log("📎 Checking all possible data fields:");
            console.log("  - response.data:", response.data);
            console.log("  - response.files:", response.files);
            console.log("  - response.media:", response.media);
            console.log("  - response.uploaded:", response.uploaded);
            console.log("  - response.results:", response.results);
            console.log("  - response.file_paths:", response.file_paths);
            console.log("  - response.temp_files:", response.temp_files);
            console.log("  - response.saved_files:", response.saved_files);

            // Deep inspection of each possible array/object
            [
              "data",
              "files",
              "media",
              "uploaded",
              "results",
              "file_paths",
              "temp_files",
              "saved_files",
            ].forEach((field) => {
              if (response[field]) {
                console.log(
                  `📎 ===== DETAILED ${field.toUpperCase()} FIELD ANALYSIS =====`,
                );
                const fieldData = response[field];
                console.log(`📎 ${field} type:`, typeof fieldData);
                console.log(`📎 ${field} isArray:`, Array.isArray(fieldData));
                console.log(`📎 ${field} length:`, fieldData?.length || "N/A");

                if (Array.isArray(fieldData) && fieldData.length > 0) {
                  fieldData.forEach((item, index) => {
                    console.log(
                      `📎 ${field}[${index}] structure:`,
                      JSON.stringify(item, null, 2),
                    );
                    console.log(
                      `📎 ${field}[${index}] keys:`,
                      Object.keys(item || {}),
                    );

                    // Check for filename fields specifically
                    const filenameFields = [
                      "filename",
                      "name",
                      "original_name",
                      "file_name",
                      "original_filename",
                      "temp_name",
                      "saved_name",
                      "path",
                      "file_path",
                      "temp_path",
                      "url",
                    ];
                    filenameFields.forEach((fnField) => {
                      if (item && item[fnField]) {
                        console.log(
                          `📎 🎯 FILENAME FOUND in ${field}[${index}].${fnField}:`,
                          item[fnField],
                        );
                      }
                    });
                  });
                } else if (fieldData && typeof fieldData === "object") {
                  console.log(
                    `📎 ${field} object keys:`,
                    Object.keys(fieldData),
                  );
                  console.log(
                    `📎 ${field} content:`,
                    JSON.stringify(fieldData, null, 2),
                  );
                }
              }
            });
          }

          // Handle different response structures
          if (response?.success || response?.status === "successful") {
            console.log("📎 ✅ Upload API returned success response");
            const data =
              response.data ||
              response.files ||
              response.media ||
              response.uploaded ||
              response.results ||
              [];
            console.log(
              "📎 Extracted data field:",
              JSON.stringify(data, null, 2),
            );
            console.log(
              "📎 Data type:",
              typeof data,
              "Is array:",
              Array.isArray(data),
            );

            // Ensure data is always an array
            const mediaArray = Array.isArray(data) ? data : data ? [data] : [];
            console.log(
              "📎 Media array after normalization:",
              JSON.stringify(mediaArray, null, 2),
            );

            // Process media items with backend filename prioritization for consistency
            const validatedMedia = mediaArray.map((media, index) => {
              console.log(
                `📎 Processing upload API response item ${index}:`,
                JSON.stringify(media, null, 2),
              );

              // ===== HANDLE NESTED UPLOADED_FILES STRUCTURE =====
              // Check if backend returned data in nested uploaded_files format
              let actualMediaData = media;
              if (
                media.uploaded_files &&
                Array.isArray(media.uploaded_files) &&
                media.uploaded_files.length > 0
              ) {
                console.log(
                  `📎 🔍 Found nested uploaded_files structure for item ${index}`,
                );
                console.log(
                  `📎 uploaded_files[0]:`,
                  JSON.stringify(media.uploaded_files[0], null, 2),
                );

                // Extract the actual media data from uploaded_files[0]
                const uploadedFile = media.uploaded_files[0];
                actualMediaData = {
                  // Preserve wrapper fields that might be useful
                  ...media,

                  // Override with actual upload data from uploaded_files[0]
                  type: uploadedFile.type || media.type,
                  url: uploadedFile.url, // This is the real URL!
                  filename: uploadedFile.filename, // Backend temp filename
                  original_filename: uploadedFile.original_filename, // User's original filename!
                  size: uploadedFile.size || media.size,
                  mime_type: uploadedFile.mime_type,
                  width: uploadedFile.width,
                  height: uploadedFile.height,
                  duration: uploadedFile.duration,
                  storage_path: uploadedFile.storage_path,
                  is_temp: uploadedFile.is_temp,
                  uploaded_at: uploadedFile.uploaded_at,
                  file_index: uploadedFile.file_index,
                  file_id: uploadedFile.file_id,
                  thumbnail_url: uploadedFile.thumbnail_url,
                };

                console.log(
                  `📎 ✅ Extracted actual media data from uploaded_files:`,
                  JSON.stringify(actualMediaData, null, 2),
                );
              }

              // For upload API responses, ALWAYS prioritize backend-generated filenames
              // This ensures consistency between upload API and post creation API
              let extractedFilename = null;

              // Priority 1: Backend-specific temp filename fields (highest priority)
              const tempFilenameFields = [
                "temp_name",
                "saved_name",
                "temp_filename",
                "saved_filename",
                "backend_filename",
                "generated_name",
              ];
              for (const field of tempFilenameFields) {
                if (
                  actualMediaData[field] &&
                  typeof actualMediaData[field] === "string"
                ) {
                  extractedFilename = actualMediaData[field];
                  console.log(
                    `📎 🎯 Upload API - Found backend filename in ${field}: ${extractedFilename}`,
                  );
                  break;
                }
              }

              // Priority 2: Standard filename fields (only if they contain temp pattern)
              if (!extractedFilename) {
                const standardFilenameFields = [
                  "filename",
                  "name",
                  "original_name",
                  "file_name",
                  "original_filename",
                ];
                for (const field of standardFilenameFields) {
                  if (
                    actualMediaData[field] &&
                    typeof actualMediaData[field] === "string" &&
                    actualMediaData[field].includes("temp-")
                  ) {
                    extractedFilename = actualMediaData[field];
                    console.log(
                      `📎 🎯 Upload API - Found temp pattern in ${field}: ${extractedFilename}`,
                    );
                    break;
                  }
                }
              }

              // Priority 3: Extract filename from URL/path if it contains temp pattern
              if (!extractedFilename) {
                const urlFields = [
                  "url",
                  "path",
                  "file_url",
                  "file_path",
                  "storage_path",
                  "full_path",
                  "public_path",
                  "temp_path",
                ];
                for (const field of urlFields) {
                  if (
                    actualMediaData[field] &&
                    typeof actualMediaData[field] === "string"
                  ) {
                    const pathParts = actualMediaData[field].split("/");
                    const lastPart = pathParts[pathParts.length - 1];
                    if (lastPart && lastPart.includes("temp-")) {
                      extractedFilename = lastPart;
                      console.log(
                        `📎 🎯 Found temp filename in ${field} path: ${extractedFilename}`,
                      );
                      break;
                    }
                  }
                }
              }

              // Priority 4: Fallback to any available filename
              if (!extractedFilename) {
                const fallbackFields = [
                  "filename",
                  "name",
                  "original_name",
                  "file_name",
                  "original_filename",
                ];
                for (const field of fallbackFields) {
                  if (
                    actualMediaData[field] &&
                    typeof actualMediaData[field] === "string" &&
                    actualMediaData[field].trim()
                  ) {
                    extractedFilename = actualMediaData[field];
                    console.log(
                      `📎 ℹ️ Using fallback filename from ${field}: ${extractedFilename}`,
                    );
                    break;
                  }
                }
              }

              // Priority 5: Generate fallback filename
              if (!extractedFilename) {
                extractedFilename = `file_${Date.now()}_${index}`;
                console.log(
                  `📎 ⚠️ Generated fallback filename: ${extractedFilename}`,
                );
              }

              // Use the URL provided by the backend (from actualMediaData)
              const mediaType =
                actualMediaData.type ||
                actualMediaData.media_type ||
                actualMediaData.file_type ||
                "image";

              // Use the URL directly from backend response (no need to reconstruct)
              let finalUrl = actualMediaData.url || "";
              console.log(`📎 🔧 Using backend-provided URL: ${finalUrl}`);

              // Extract original user filename - prioritize original_filename from backend
              let originalUserFilename = null;

              // Priority 1: Backend-provided original_filename (best source)
              if (
                actualMediaData.original_filename &&
                typeof actualMediaData.original_filename === "string"
              ) {
                originalUserFilename = actualMediaData.original_filename;
                console.log(
                  `📎 🎯 Using backend original_filename: ${originalUserFilename}`,
                );
              }
              // Priority 2: Extract from temp pattern if available
              else if (
                extractedFilename &&
                extractedFilename.includes("temp-")
              ) {
                // Try to extract original filename from temp pattern: temp-timestamp-original_filename
                const tempPattern = /^temp-\d+-(.+)$/;
                const match = extractedFilename.match(tempPattern);
                if (match && match[1]) {
                  originalUserFilename = match[1];
                  console.log(
                    `📎 🎯 Extracted original user filename from temp pattern: ${extractedFilename} → ${originalUserFilename}`,
                  );
                }
              }

              // Build the final processed media object using actualMediaData
              const processedMedia = {
                type: mediaType,
                url: finalUrl, // Use backend-provided URL directly
                filename: extractedFilename, // Backend-generated filename for upload consistency
                original_user_filename: originalUserFilename, // Preserved user-selected filename
                backend_filename: extractedFilename, // Explicit backend filename reference
                size:
                  actualMediaData.size ||
                  actualMediaData.file_size ||
                  actualMediaData.filesize ||
                  0,
                // Include additional backend fields
                mime_type: actualMediaData.mime_type,
                width: actualMediaData.width,
                height: actualMediaData.height,
                duration: actualMediaData.duration,
                storage_path: actualMediaData.storage_path,
                is_temp: actualMediaData.is_temp,
                uploaded_at: actualMediaData.uploaded_at,
                file_index: actualMediaData.file_index,
                file_id: actualMediaData.file_id,
                thumbnail_url: actualMediaData.thumbnail_url,
                // Keep any additional fields from the wrapper
                upload_count: media.upload_count,
                error_count: media.error_count,
                temp_storage: media.temp_storage,
                post_type: media.post_type,
              };

              console.log(
                `📎 ✅ Upload API - Processed media ${index}:`,
                processedMedia,
              );
              console.log(
                `📎 ✅ Backend filename (for consistency): ${processedMedia.filename}`,
              );
              console.log(
                `📎 🎯 Original user filename (for user intent): ${processedMedia.original_user_filename || "not extracted"}`,
              );
              console.log(
                `📎 ✅ Storage URL constructed: ${processedMedia.url}`,
              );
              console.log(
                `📎 ✅ Consistency check: ${processedMedia.filename?.includes("temp-") ? "✅ Backend filename preserved" : "⚠️ Using fallback"}`,
              );

              // Validate URL and filename consistency
              const urlEndsWithFilename = processedMedia.url.endsWith(
                processedMedia.filename,
              );
              const urlContainsTempPattern =
                processedMedia.url.includes("temp-");
              const filenameContainsTempPattern =
                processedMedia.filename.includes("temp-");

              console.log(`📎 🔍 URL/Filename Validation for media ${index}:`);
              console.log(
                `  - URL ends with filename: ${urlEndsWithFilename ? "✅" : "❌"}`,
              );
              console.log(
                `  - URL contains temp pattern: ${urlContainsTempPattern ? "✅" : "❌"}`,
              );
              console.log(
                `  - Filename contains temp pattern: ${filenameContainsTempPattern ? "✅" : "❌"}`,
              );

              if (
                urlEndsWithFilename &&
                urlContainsTempPattern &&
                filenameContainsTempPattern
              ) {
                console.log(
                  `📎 ✅ PERFECT! URL and filename are properly matched with backend temp pattern`,
                );
              } else if (
                filenameContainsTempPattern &&
                !urlContainsTempPattern
              ) {
                console.log(
                  `📎 ⚠️ WARNING: Filename has temp pattern but URL doesn't - URL construction may have failed`,
                );
              } else if (!filenameContainsTempPattern) {
                console.log(
                  `📎 ⚠️ INFO: Using fallback filename - backend temp filename not found`,
                );
              } else {
                console.log(`📎 ❌ ERROR: URL/filename mismatch detected`);
              }

              return processedMedia;
            });

            console.log("📎 ===== FINAL VALIDATED MEDIA ARRAY =====");
            console.log(
              "📎 Final validated media array:",
              JSON.stringify(validatedMedia, null, 2),
            );

            // Additional debug: Log structure for post creation consistency
            console.log("📎 🔍 UPLOAD API - STRUCTURE FOR POST CREATION:");
            validatedMedia.forEach((media, index) => {
              console.log(`📎 Media ${index} structure for post creation:`, {
                hasUrl: !!media.url,
                hasUri: !!media.uri,
                hasFilename: !!media.filename,
                hasName: !!media.name,
                filename: media.filename,
                original_user_filename: media.original_user_filename,
                backend_filename: media.backend_filename,
                url: media.url,
                type: media.type,
                size: media.size,
                postCreationDetection:
                  media.url && !media.uri ? "UPLOADED MEDIA" : "RAW MEDIA",
                userFilenameAvailable: !!media.original_user_filename,
                note: "This will be passed to createPostData() - user filename preserved for user intent",
              });
            });

            // Final validation summary
            let perfectMatches = 0;
            let backendFilenames = 0;
            let correctUrls = 0;

            validatedMedia.forEach((media) => {
              const hasBackendFilename = media.filename?.includes("temp-");
              const hasCorrectUrl =
                media.url?.includes("temp-") &&
                media.url?.endsWith(media.filename);
              const isPerfectMatch = hasBackendFilename && hasCorrectUrl;

              if (hasBackendFilename) backendFilenames++;
              if (hasCorrectUrl) correctUrls++;
              if (isPerfectMatch) perfectMatches++;
            });

            console.log(`📎 ===== UPLOAD PROCESSING SUMMARY =====`);
            console.log(`📎 Total media items: ${validatedMedia.length}`);
            console.log(
              `📎 Backend filenames extracted: ${backendFilenames}/${validatedMedia.length}`,
            );
            console.log(
              `📎 Correct URLs constructed: ${correctUrls}/${validatedMedia.length}`,
            );
            console.log(
              `📎 Perfect URL+filename matches: ${perfectMatches}/${validatedMedia.length}`,
            );
            console.log(
              `📎 Success rate: ${validatedMedia.length > 0 ? ((perfectMatches / validatedMedia.length) * 100).toFixed(1) : 0}%`,
            );

            if (
              perfectMatches === validatedMedia.length &&
              validatedMedia.length > 0
            ) {
              console.log(
                `📎 🎉 EXCELLENT! All media items have perfect backend filename + URL matching!`,
              );
            } else if (perfectMatches > 0) {
              console.log(
                `📎 ⚠️ Partial success - some URLs may still have generic filenames`,
              );
            } else {
              console.log(
                `📎 ❌ No perfect matches - URL construction needs investigation`,
              );
            }

            return {
              success: true,
              data: validatedMedia,
              message: response.message || "Media uploaded successfully",
            };
          }

          // Handle error responses
          console.error("❌ Upload API Error Response:", response);
          console.log("📎 Response status/success check failed:", {
            hasSuccess: !!response?.success,
            successValue: response?.success,
            hasStatus: !!response?.status,
            statusValue: response?.status,
          });

          return {
            success: false,
            data: [],
            message: response?.message || response?.error || "Upload failed",
            error: response?.error || "Unknown upload error",
          };
        },
        transformErrorResponse: (response: any) => {
          console.error("❌ Upload API Error:", response);
          return {
            success: false,
            message: "Media upload failed. Please try again.",
            error: response.data?.message || response.error || "Network error",
          };
        },
      }),

      createSchoolPost: build.mutation({
        query: (payload) => {
          console.log(
            `🏫 Creating school post with JSON payload (two-step process)`,
          );
          console.log(
            `🏫 Payload structure:`,
            JSON.stringify(payload, null, 2),
          );

          // Always use JSON for post creation in two-step process
          return {
            url: "api/activity-feed-management/school-posts/create",
            method: "POST",
            body: payload,
            headers: {
              "Content-Type": "application/json",
            },
          };
        },
        invalidatesTags: [
          { type: "SchoolPosts", id: "LIST" },
          { type: "ActivityFeed", id: "LIST" },
        ],
        transformResponse: (response: any) => {
          console.log("🏫 School Post Creation Response:", response);
          return response;
        },
      }),

      createClassPost: build.mutation({
        query: (payload) => {
          console.log(
            `🎓 Creating class post with JSON payload (two-step process)`,
          );
          console.log(
            `🎓 Payload structure:`,
            JSON.stringify(payload, null, 2),
          );

          // Always use JSON for post creation in two-step process
          return {
            url: "api/activity-feed-management/class-posts/create",
            method: "POST",
            body: payload,
            headers: {
              "Content-Type": "application/json",
            },
          };
        },
        invalidatesTags: [
          { type: "ClassPosts", id: "LIST" },
          { type: "ActivityFeed", id: "LIST" },
        ],
        transformResponse: (response: any) => {
          console.log("🎓 Class Post Creation Response:", response);
          return response;
        },
      }),
    }),
  });

// Export generated hooks for each endpoint
export const {
  useGetSchoolPostsQuery,
  useLazyGetSchoolPostsQuery,
  useGetClassPostsQuery,
  useLazyGetClassPostsQuery,
  useGetStudentPostsQuery,
  useLazyGetStudentPostsQuery,
  useLikePostMutation,
  useLikeClassPostMutation,
  useLikeStudentPostMutation,
  useDeleteSchoolPostMutation,
  useDeleteClassPostMutation,
  useDeleteStudentPostMutation,
  useGetPostDetailsQuery,
  useLazyGetPostDetailsQuery,
  useUploadMediaMutation,
  useCreateSchoolPostMutation,
  useCreateClassPostMutation,
} = activityFeedApi;

/*
=== BACKEND DATA REQUIREMENTS ===

1. SCHOOL POSTS ENDPOINT: POST /api/activity-feed/school/posts
   Request Body:
   {
     "page": 1,
     "limit": 10,
     "search": "optional search term",
     "date_from": "2024-01-01", // optional
     "date_to": "2024-12-31",   // optional
     "category": "announcement|event|news|achievement", // optional
     "hashtags": ["tag1", "tag2"] // optional array
   }

   Response Format:
   {
     "success": true,
     "data": [
       {
         "id": 1,
         "type": "announcement|event|news|achievement",
         "category": "announcement",
         "title": "Post Title",
         "content": "Post content with hashtags #example",
         "author_name": "Principal Johnson",
         "author_image": "https://example.com/profile.jpg",
         "created_at": "2024-01-15T10:30:00Z",
         "updated_at": "2024-01-15T10:30:00Z",
         "likes_count": 24,
         "comments_count": 8,
         "is_liked_by_user": false,
         "media": [
           {
             "id": 1,
             "type": "image|video|pdf",
             "url": "https://example.com/media/file.jpg",
             "thumbnail_url": "https://example.com/media/thumb.jpg", // for videos
             "filename": "original_name.jpg",
             "size": 1024000 // in bytes
           }
         ],
         "hashtags": ["ScienceFair", "Achievement"],
         "school_id": 1,
         "class_id": null, // null for school-wide posts
         "student_id": null // null for school-wide posts
       }
     ],
     "pagination": {
       "current_page": 1,
       "per_page": 10,
       "total": 150,
       "last_page": 15,
       "has_more": true
     }
   }

2. CLASS POSTS ENDPOINT: POST /api/activity-feed/class/posts
   Request Body:
   {
     "class_id": 5,
     "page": 1,
     "limit": 10,
     "search": "optional",
     "date_from": "2024-01-01",
     "date_to": "2024-12-31",
     "category": "announcement|event|news|achievement",
     "hashtags": ["tag1", "tag2"]
   }

   Response: Same format as school posts but filtered by class_id

3. STUDENT POSTS ENDPOINT: POST /api/activity-feed/student/posts
   Request Body:
   {
     "student_id": 123,
     "page": 1,
     "limit": 10,
     "search": "optional",
     "date_from": "2024-01-01",
     "date_to": "2024-12-31",
     "category": "announcement|event|news|achievement",
     "hashtags": ["tag1", "tag2"]
   }

   Response: Same format as school posts but filtered by student_id

4. LIKE POST ENDPOINT: POST /api/activity-feed/post/like
   Request Body:
   {
     "post_id": 1,
     "action": "like|unlike"
   }

   Response:
   {
     "success": true,
     "message": "Post liked successfully",
     "data": {
       "post_id": 1,
       "likes_count": 25,
       "is_liked_by_user": true
     }
   }

5. GET POST DETAILS ENDPOINT: GET /api/activity-feed/post/{post_id}
   Response: Single post object with same format as above

=== DATABASE TABLES STRUCTURE ===

1. activity_feed_posts
   - id (primary key)
   - type (enum: announcement, event, news, achievement)
   - category (varchar)
   - title (varchar)
   - content (text)
   - author_id (foreign key to users table)
   - school_id (foreign key to schools table)
   - class_id (foreign key to classes table, nullable)
   - student_id (foreign key to students table, nullable)
   - likes_count (integer, default 0)
   - comments_count (integer, default 0)
   - is_active (boolean, default true)
   - created_at (timestamp)
   - updated_at (timestamp)

2. activity_feed_media
   - id (primary key)
   - post_id (foreign key to activity_feed_posts)
   - type (enum: image, video, pdf)
   - url (varchar)
   - thumbnail_url (varchar, nullable)
   - filename (varchar)
   - size (bigint)
   - created_at (timestamp)

3. activity_feed_hashtags
   - id (primary key)
   - post_id (foreign key to activity_feed_posts)
   - hashtag (varchar)
   - created_at (timestamp)

4. activity_feed_likes
   - id (primary key)
   - post_id (foreign key to activity_feed_posts)
   - user_id (foreign key to users table)
   - created_at (timestamp)
   - unique(post_id, user_id)

5. activity_feed_comments (for future use)
   - id (primary key)
   - post_id (foreign key to activity_feed_posts)
   - user_id (foreign key to users table)
   - content (text)
   - parent_comment_id (foreign key to self, nullable)
   - created_at (timestamp)
   - updated_at (timestamp)
*/
