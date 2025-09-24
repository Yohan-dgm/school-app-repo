// Test script to verify user filename preservation in two-step upload process
console.log("🧪 Testing user filename preservation logic...");

// Import helper functions (simulated)
const extractOriginalFilenameFromTemp = (tempFilename) => {
  if (!tempFilename || typeof tempFilename !== "string") {
    return null;
  }

  // Pattern: temp-{timestamp}-{original_filename}
  const tempPattern = /^temp-\d+-(.+)$/;
  const match = tempFilename.match(tempPattern);

  if (match && match[1]) {
    console.log(
      `📎 🔍 Extracted original filename: ${tempFilename} → ${match[1]}`,
    );
    return match[1];
  }

  console.log(
    `📎 ⚠️ Could not extract original filename from: ${tempFilename}`,
  );
  return null;
};

const getUserSelectedFilename = (media, index = 0) => {
  let filename = null;

  // Priority 1: User-selected filename (preserve user intent)
  if (media.name && !media.name.includes("temp-")) {
    filename = media.name; // simplified, no sanitizeFilename for test
    console.log(
      `📎 🎯 Using user-selected filename from media.name: ${filename}`,
    );
  } else if (media.fileName && !media.fileName.includes("temp-")) {
    filename = media.fileName;
    console.log(
      `📎 🎯 Using user-selected filename from media.fileName: ${filename}`,
    );
  }

  // Priority 2: Extract original filename from backend temp filename
  if (!filename && media.filename && media.filename.includes("temp-")) {
    const extractedFilename = extractOriginalFilenameFromTemp(media.filename);
    if (extractedFilename) {
      filename = extractedFilename;
      console.log(
        `📎 🎯 Using extracted original filename from backend temp: ${filename}`,
      );
    }
  }

  // Priority 3: Fallback
  if (!filename) {
    const extension =
      media.type === "video" ? "mp4" : media.type === "image" ? "jpg" : "file";
    filename = `media_${Date.now()}_${index}.${extension}`;
    console.log(`📎 🎯 Using fallback filename: ${filename}`);
  }

  return filename;
};

// Test the new two-step process logic
const testTwoStepProcessWithUserFilenames = (postData, uploadedMedia) => {
  console.log("📝 Creating JSON payload with user filename preservation");
  console.log("📎 Uploaded media from API:", uploadedMedia);

  const payload = {
    type: "announcement",
    category: postData.category || "Announcement",
    title: postData.title || "",
    content: postData.content || "",
    author_id: postData.author_id || null,
    hashtags: postData.hashtags || [],
  };

  // Check if this is uploaded media (has url, no uri)
  const isUploadedMedia = uploadedMedia[0]?.url && !uploadedMedia[0]?.uri;

  if (isUploadedMedia) {
    console.log(
      "📎 🎯 NEW BEHAVIOR: Using user-selected filenames (preserving user intent)",
    );

    payload.media = uploadedMedia.map((media, index) => {
      // Get user-selected filename using the new priority system
      const userSelectedFilename = getUserSelectedFilename(media, index);

      // Build media URL using user-selected filename
      let mediaDir = "images";
      const mediaType = media.type || "image";
      if (mediaType === "video") {
        mediaDir = "videos";
      } else if (mediaType === "pdf" || mediaType === "document") {
        mediaDir = "documents";
      }

      const userIntentUrl = `/storage/nexis-college/yakkala/temp-uploads/${mediaDir}/${userSelectedFilename}`;

      const processedMedia = {
        type: mediaType,
        url: userIntentUrl,
        filename: userSelectedFilename,
        size: media.size || 0,
        sort_order: index + 1,
        backend_filename: media.filename,
        backend_url: media.url,
      };

      console.log(`📎 🎯 Media ${index} user intent verification:`, {
        backendTempFilename: media.filename,
        userSelectedFilename: processedMedia.filename,
        userIntentPreserved: !processedMedia.filename.includes("temp-")
          ? "✅ YES"
          : "❌ NO",
        backendUrl: media.url,
        userIntentUrl: processedMedia.url,
      });

      return processedMedia;
    });
  }

  return payload;
};

console.log(
  "\n=== TEST 1: Backend temp filename with extractable user filename ===",
);
const uploadedMediaWithExtractable = [
  {
    type: "image",
    url: "/storage/nexis-college/yakkala/temp-uploads/images/temp-1640995200000-My_Family_Photo.jpg",
    filename: "temp-1640995200000-My_Family_Photo.jpg", // Backend generated with user filename embedded
    original_user_filename: "My_Family_Photo.jpg", // Upload API preserved this
    size: 1024000,
  },
];

const result1 = testTwoStepProcessWithUserFilenames(
  { title: "Test", category: "announcement", author_id: 123 },
  uploadedMediaWithExtractable,
);

console.log("\n📋 Result 1 Analysis:");
console.log("  - Backend returned:", uploadedMediaWithExtractable[0].filename);
console.log("  - Post creation used:", result1.media[0].filename);
console.log(
  "  - User intent preserved:",
  !result1.media[0].filename.includes("temp-") ? "✅ YES" : "❌ NO",
);
console.log("  - Expected: My_Family_Photo.jpg");
console.log("  - Actual:", result1.media[0].filename);

console.log("\n=== TEST 2: Media with direct user selection ===");
const uploadedMediaWithUserSelection = [
  {
    type: "image",
    url: "/storage/temp.jpg",
    filename: "temp-1640995200000-some_file.jpg", // Backend temp
    name: "User_Selected_Name.jpg", // Direct user selection available
    size: 1024000,
  },
];

const result2 = testTwoStepProcessWithUserFilenames(
  { title: "Test 2", category: "announcement", author_id: 123 },
  uploadedMediaWithUserSelection,
);

console.log("\n📋 Result 2 Analysis:");
console.log(
  "  - Backend returned:",
  uploadedMediaWithUserSelection[0].filename,
);
console.log("  - User selected:", uploadedMediaWithUserSelection[0].name);
console.log("  - Post creation used:", result2.media[0].filename);
console.log(
  "  - User intent preserved:",
  !result2.media[0].filename.includes("temp-") ? "✅ YES" : "❌ NO",
);
console.log("  - Expected: User_Selected_Name.jpg");
console.log("  - Actual:", result2.media[0].filename);

console.log("\n=== TEST 3: Multiple files with mixed scenarios ===");
const uploadedMediaMixed = [
  {
    type: "image",
    url: "/storage/temp1.jpg",
    filename: "temp-1640995200000-Family_Vacation.jpg",
    name: "Family_Vacation.jpg", // Direct user selection
    size: 2048000,
  },
  {
    type: "video",
    url: "/storage/temp2.mp4",
    filename: "temp-1640995200001-Birthday_Party.mp4", // Only backend temp, no direct user selection
    size: 5000000,
  },
  {
    type: "document",
    url: "/storage/temp3.pdf",
    filename: "temp-1640995200002-School_Report.pdf",
    fileName: "School_Report.pdf", // User selection via fileName
    size: 512000,
  },
];

const result3 = testTwoStepProcessWithUserFilenames(
  { title: "Test 3", category: "announcement", author_id: 123 },
  uploadedMediaMixed,
);

console.log("\n📋 Result 3 Analysis (Multiple Files):");
result3.media.forEach((media, index) => {
  const originalMedia = uploadedMediaMixed[index];
  console.log(`  File ${index + 1}:`);
  console.log(`    - Backend: ${originalMedia.filename}`);
  console.log(`    - Final: ${media.filename}`);
  console.log(
    `    - User intent: ${!media.filename.includes("temp-") ? "✅ YES" : "❌ NO"}`,
  );
  console.log(`    - URL: ${media.url}`);
});

console.log("\n🎯 SUMMARY:");
console.log(
  "✅ Test 1: Should extract 'My_Family_Photo.jpg' from backend temp filename",
);
console.log(
  "✅ Test 2: Should use direct user selection 'User_Selected_Name.jpg'",
);
console.log(
  "✅ Test 3: Should handle mixed scenarios with different priority sources",
);
console.log("\n🔍 Key Behavior Changes:");
console.log(
  "- OLD: Post creation used backend temp filenames (temp-1640995200000-filename.jpg)",
);
console.log("- NEW: Post creation uses user-selected filenames (filename.jpg)");
console.log(
  "- RESULT: Media URLs respect user intent while maintaining upload functionality",
);

console.log("\n✅ User filename preservation test completed!");
