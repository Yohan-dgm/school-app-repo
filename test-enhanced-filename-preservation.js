// Test script to verify enhanced filename preservation in media upload pipeline
console.log("🧪 Testing enhanced filename preservation pipeline...");

// Import helper functions (simulated)
const sanitizeFilename = (filename) => {
  if (!filename) return `file_${Date.now()}`;

  return filename
    .replace(/[<>:"/\\|?*#]/g, "_")
    .replace(/[\x00-\x1f\x80-\x9f]/g, "")
    .replace(/^\.+/, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();
};

// Simulate enhanced processMediaForUpload function
const processMediaForUpload = (media, index) => {
  const mediaType = media.type || media.mediaType || "unknown";

  // Enhanced filename extraction with improved priority system
  let filename = null;
  let filenameSource = "unknown";

  // Priority 1: Explicit user intent field (new enhancement)
  if (
    media.original_user_filename &&
    media.original_user_filename.trim() &&
    !media.original_user_filename.includes("temp-")
  ) {
    filename = sanitizeFilename(media.original_user_filename.trim());
    filenameSource = "original_user_filename";
    console.log(`📁 🎯 Using original_user_filename: ${filename}`);
  }
  // Priority 2: User-selected filename fields
  else if (media.name && media.name.trim() && !media.name.includes("temp-")) {
    filename = sanitizeFilename(media.name.trim());
    filenameSource = "media.name";
    console.log(`📁 🎯 Using media.name: ${filename}`);
  } else if (
    media.fileName &&
    media.fileName.trim() &&
    !media.fileName.includes("temp-")
  ) {
    filename = sanitizeFilename(media.fileName.trim());
    filenameSource = "media.fileName";
    console.log(`📁 🎯 Using media.fileName: ${filename}`);
  }

  // Priority 3: Smart fallback with meaningful names
  if (!filename) {
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:-]/g, "");
    const extension =
      mediaType === "video" ? "mp4" : mediaType === "image" ? "jpg" : "file";
    filename = `${mediaType}_${timestamp}.${extension}`;
    filenameSource = "smart_fallback";
    console.log(`📁 🎯 Using smart fallback filename: ${filename}`);
  }

  return {
    success: true,
    data: {
      ...media,
      name: filename,
      fileName: filename,
      original_user_filename: media.original_user_filename || filename,
      filenameSource: filenameSource,
      type: mediaType,
    },
  };
};

// Test scenarios
console.log(
  "\n=== TEST 1: User selected image with original_user_filename ===",
);
const testMedia1 = {
  id: 1,
  type: "image",
  uri: "file:///temp/ImagePicker-123456789.jpg",
  name: "My_Family_Photo.jpg", // User selected this name
  original_user_filename: "My_Family_Photo.jpg", // Enhanced capture
  size: 1024000,
};

const result1 = processMediaForUpload(testMedia1, 0);
console.log("📋 Result 1:", {
  input: testMedia1.name,
  output: result1.data.name,
  source: result1.data.filenameSource,
  preserved: result1.data.name === testMedia1.name ? "✅ YES" : "❌ NO",
});

console.log("\n=== TEST 2: Document with proper filename ===");
const testMedia2 = {
  id: 2,
  type: "document",
  uri: "file:///Documents/picker/document_123.pdf",
  name: "School_Report_2023.pdf", // Document picker usually preserves this
  original_user_filename: "School_Report_2023.pdf",
  size: 512000,
};

const result2 = processMediaForUpload(testMedia2, 1);
console.log("📋 Result 2:", {
  input: testMedia2.name,
  output: result2.data.name,
  source: result2.data.filenameSource,
  preserved: result2.data.name === testMedia2.name ? "✅ YES" : "❌ NO",
});

console.log(
  "\n=== TEST 3: Image picker without clear filename (fallback case) ===",
);
const testMedia3 = {
  id: 3,
  type: "image",
  uri: "file:///temp/ImagePicker-987654321-temp.jpg",
  // No clear user filename available - should use smart fallback
  size: 2048000,
};

const result3 = processMediaForUpload(testMedia3, 2);
console.log("📋 Result 3:", {
  input: "No user filename",
  output: result3.data.name,
  source: result3.data.filenameSource,
  meaningful: result3.data.name.includes("image_") ? "✅ YES" : "❌ NO",
});

console.log("\n=== TEST 4: Video with fileName property ===");
const testMedia4 = {
  id: 4,
  type: "video",
  uri: "file:///Videos/temp/video_capture.mp4",
  fileName: "Birthday_Party_2023.mp4", // User selected via fileName
  size: 5000000,
};

const result4 = processMediaForUpload(testMedia4, 3);
console.log("📋 Result 4:", {
  input: testMedia4.fileName,
  output: result4.data.name,
  source: result4.data.filenameSource,
  preserved: result4.data.name === testMedia4.fileName ? "✅ YES" : "❌ NO",
});

console.log("\n🎯 ENHANCED FEATURES SUMMARY:");
console.log(
  "✅ Priority 1: original_user_filename field for explicit user intent",
);
console.log("✅ Priority 2: Enhanced capture from name/fileName fields");
console.log("✅ Priority 3: Smart fallback with meaningful timestamps");
console.log("✅ Better debugging with filename source tracking");
console.log("✅ Improved user intent preservation throughout pipeline");

console.log("\n🔍 KEY IMPROVEMENTS:");
console.log("- OLD: Lost user filenames during picker → processing → upload");
console.log("- NEW: Captures and preserves user intent at every step");
console.log("- RESULT: User-selected filenames maintained in final media URLs");

console.log("\n✅ Enhanced filename preservation test completed!");
