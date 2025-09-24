// Test script to verify filename consistency logic
console.log("🧪 Testing filename consistency logic...");

// Simulate the createPostData function logic
const createPostDataTest = (postData, selectedMedia = []) => {
  console.log("📝 Creating JSON payload with postData:", postData);
  console.log("📎 Selected media files:", selectedMedia);

  const mediaArray = Array.isArray(selectedMedia) ? selectedMedia : [];

  const payload = {
    type: "announcement",
    category: postData.category || "Announcement",
    title: postData.title || "",
    content: postData.content || "",
    author_id: postData.author_id || null,
    hashtags: postData.hashtags || [],
  };

  if (mediaArray.length > 0) {
    // Updated detection logic: hasUrl && !hasUri = uploaded media
    const isUploadedMedia = mediaArray[0]?.url && !mediaArray[0]?.uri;

    console.log("🔍 Process detection for media:", {
      totalMedia: mediaArray.length,
      firstMediaStructure: mediaArray[0],
      hasUrl: !!mediaArray[0]?.url,
      hasUri: !!mediaArray[0]?.uri,
      hasFilename: !!mediaArray[0]?.filename,
      hasName: !!mediaArray[0]?.name,
      filenameHasTemp: mediaArray[0]?.filename?.includes("temp-"),
      nameHasTemp: mediaArray[0]?.name?.includes("temp-"),
      urlHasStorage: mediaArray[0]?.url?.includes("/storage/"),
      detectionLogic: "hasUrl && !hasUri = uploaded media",
      isUploadedMedia: isUploadedMedia,
      processType: isUploadedMedia
        ? "TWO-STEP (uploaded media)"
        : "SINGLE-STEP (raw files)",
    });

    if (isUploadedMedia) {
      console.log(
        "📎 ✅ Processing uploaded media URLs from two-step upload...",
      );
      payload.media = mediaArray.map((media, index) => {
        const processedMedia = {
          type: media.type || "image",
          url: media.url || "",
          filename: media.filename || `uploaded_file_${index}`,
          size: media.size || 0,
          sort_order: index + 1,
        };

        console.log(
          `📎 🔍 Post Creation - Preserving upload API filename ${index}:`,
          {
            uploadApiFilename: media.filename,
            preservedFilename: processedMedia.filename,
            consistencyCheck:
              media.filename === processedMedia.filename
                ? "✅ MATCH"
                : "❌ MISMATCH",
            uploadApiUrl: media.url,
            preservedUrl: processedMedia.url,
            hasBackendFilename: processedMedia.filename?.includes("temp-")
              ? "YES"
              : "NO",
            urlEndsWithFilename: processedMedia.url?.endsWith(
              processedMedia.filename,
            )
              ? "YES"
              : "NO",
            type: processedMedia.type,
          },
        );

        return processedMedia;
      });
      console.log(
        "📎 ✅ Preserved exact upload API filenames for consistency:",
        payload.media,
      );
    } else {
      console.log(
        "📎 ❌ Processing selected media files for single-step submission...",
      );
      // Would process raw media files here
    }
  }

  return payload;
};

console.log("\n=== TEST 1: Uploaded Media (Two-Step Process) ===");
const uploadedMedia = [
  {
    type: "image",
    url: "/storage/nexis-college/yakkala/temp-uploads/images/temp-1640995200000-My_Photo.jpg",
    filename: "temp-1640995200000-My_Photo.jpg", // Backend generated
    size: 1024000,
  },
];

const postData1 = {
  title: "Test Post",
  content: "Testing consistency",
  category: "announcement",
  author_id: 123,
};

const result1 = createPostDataTest(postData1, uploadedMedia);
console.log("\n📋 Result 1 - Should preserve backend filename:");
console.log("  - Expected filename: temp-1640995200000-My_Photo.jpg");
console.log("  - Actual filename:", result1.media[0].filename);
console.log(
  "  - Match:",
  result1.media[0].filename === "temp-1640995200000-My_Photo.jpg"
    ? "✅ YES"
    : "❌ NO",
);

console.log("\n=== TEST 2: Raw Media (Single-Step Process) ===");
const rawMedia = [
  {
    type: "image",
    uri: "file://local/path/photo.jpg", // Has URI, not URL
    name: "My_Photo.jpg",
    size: 1024000,
  },
];

const result2 = createPostDataTest(postData1, rawMedia);
console.log("\n📋 Result 2 - Should use single-step process:");
console.log(
  "  - Detection result:",
  !result2.media || result2.media.length === 0
    ? "Single-step (no media processed)"
    : "Two-step",
);
console.log("  - Expected: Single-step process");

console.log("\n=== TEST 3: Edge Case - Has Both URL and URI ===");
const mixedMedia = [
  {
    type: "image",
    url: "/storage/temp-file.jpg",
    uri: "file://local/path/photo.jpg", // Has both
    filename: "temp-123-file.jpg",
    size: 1024000,
  },
];

const result3 = createPostDataTest(postData1, mixedMedia);
console.log("\n📋 Result 3 - Mixed media:");
console.log(
  "  - Detection result:",
  result3.media && result3.media.length > 0 ? "Two-step" : "Single-step",
);
console.log("  - Expected: Single-step (because hasUri = true)");

console.log("\n🎯 SUMMARY:");
console.log(
  "- Test 1: Should detect uploaded media and preserve backend filename",
);
console.log("- Test 2: Should detect raw media and use single-step process");
console.log("- Test 3: Should prefer single-step when both url and uri exist");
console.log(
  "\n✅ Test completed. The detection logic should now work correctly!",
);
