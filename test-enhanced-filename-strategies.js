// Test script to verify all enhanced filename extraction strategies
console.log("🧪 Testing enhanced filename extraction strategies...");

// Simulate the enhanced filename extraction logic
const processAssetFilename = (asset, index) => {
  let originalUserFilename = null;
  let filenameSource = "unknown";

  console.log(`📁 🔍 Asset ${index} analysis:`, {
    fileName: asset.fileName,
    filename: asset.filename,
    name: asset.name,
    uri: asset.uri,
    type: asset.type,
    hasExif: !!asset.exif,
    exifKeys: asset.exif ? Object.keys(asset.exif) : [],
  });

  // Strategy 1: Direct filename properties
  if (
    asset.fileName &&
    asset.fileName.trim() &&
    asset.fileName !== "undefined" &&
    asset.fileName !== "null"
  ) {
    originalUserFilename = asset.fileName.trim();
    filenameSource = "asset.fileName";
    console.log(`📁 ✅ Using asset.fileName: ${originalUserFilename}`);
  } else if (
    asset.filename &&
    asset.filename.trim() &&
    asset.filename !== "undefined" &&
    asset.filename !== "null"
  ) {
    originalUserFilename = asset.filename.trim();
    filenameSource = "asset.filename";
    console.log(`📁 ✅ Using asset.filename: ${originalUserFilename}`);
  } else if (
    asset.name &&
    asset.name.trim() &&
    asset.name !== "undefined" &&
    asset.name !== "null"
  ) {
    originalUserFilename = asset.name.trim();
    filenameSource = "asset.name";
    console.log(`📁 ✅ Using asset.name: ${originalUserFilename}`);
  }

  // Strategy 2: EXIF metadata extraction
  if (!originalUserFilename && asset.exif) {
    const exifFilename =
      asset.exif.FileName || asset.exif.ImageDescription || asset.exif.Software;
    if (
      exifFilename &&
      typeof exifFilename === "string" &&
      exifFilename.trim()
    ) {
      originalUserFilename = exifFilename.trim();
      filenameSource = "EXIF_data";
      console.log(`📁 ✅ Using EXIF filename: ${originalUserFilename}`);
    }
  }

  // Strategy 3: Enhanced URI parsing
  if (!originalUserFilename) {
    const uriParts = asset.uri?.split("/");
    const uriFilename = uriParts?.pop();

    if (uriFilename && uriFilename.length > 0) {
      // Check if URI contains meaningful filename
      const meaningfulPatterns = [
        /^IMG_\d+\.(jpg|jpeg|png|gif)$/i, // IMG_1234.jpg
        /^VID_\d+\.(mp4|mov|avi)$/i, // VID_1234.mp4
        /^photo_\d+\.(jpg|jpeg|png)$/i, // photo_1234.jpg
        /^video_\d+\.(mp4|mov)$/i, // video_1234.mp4
        /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|mp4|mov|avi)$/i, // general pattern
      ];

      const isMeaningful =
        meaningfulPatterns.some((pattern) => pattern.test(uriFilename)) &&
        !uriFilename.includes("ImagePicker") &&
        !uriFilename.includes("temp-") &&
        !uriFilename.includes("cache") &&
        uriFilename.length < 50; // Avoid very long system-generated names

      if (isMeaningful) {
        originalUserFilename = uriFilename;
        filenameSource = "meaningful_URI";
        console.log(
          `📁 ✅ Using meaningful URI filename: ${originalUserFilename}`,
        );
      }
    }
  }

  // Strategy 4: Smart fallback with readable timestamps
  if (!originalUserFilename) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");

    const extension = asset.type === "video" ? "mp4" : "jpg";
    const mediaPrefix = asset.type === "video" ? "Video" : "Photo";

    originalUserFilename = `${mediaPrefix}_${year}_${month}_${day}_${hour}_${minute}_${second}.${extension}`;
    filenameSource = "smart_timestamp";
    console.log(`📁 ✅ Generated smart filename: ${originalUserFilename}`);
  }

  console.log(`📁 🎯 Final filename selection for asset ${index}:`, {
    selectedFilename: originalUserFilename,
    source: filenameSource,
    isUserFriendly:
      !originalUserFilename.includes("file_") &&
      !originalUserFilename.includes("temp-"),
  });

  return {
    filename: originalUserFilename,
    source: filenameSource,
    isUserFriendly:
      !originalUserFilename.includes("file_") &&
      !originalUserFilename.includes("temp-"),
  };
};

console.log("\n=== TEST 1: Asset with valid fileName property ===");
const asset1 = {
  type: "image",
  uri: "file:///storage/cache/ImagePicker/temp123.jpg",
  fileName: "My_Beautiful_Photo.jpg", // Available from picker
  size: 1024000,
};

const result1 = processAssetFilename(asset1, 0);
console.log("📋 Result 1:", {
  expected: "My_Beautiful_Photo.jpg",
  actual: result1.filename,
  source: result1.source,
  userFriendly: result1.isUserFriendly ? "✅ YES" : "❌ NO",
  success:
    result1.filename === "My_Beautiful_Photo.jpg" ? "✅ PASS" : "❌ FAIL",
});

console.log("\n=== TEST 2: Asset with EXIF metadata ===");
const asset2 = {
  type: "image",
  uri: "file:///storage/photos/cache12345.jpg",
  fileName: null, // Not available from picker
  exif: {
    FileName: "Family_Vacation_2024.jpg",
    ImageDescription: "Beautiful sunset photo",
    Make: "Apple",
    Model: "iPhone 14 Pro",
  },
  size: 2048000,
};

const result2 = processAssetFilename(asset2, 1);
console.log("📋 Result 2:", {
  expected: "Family_Vacation_2024.jpg",
  actual: result2.filename,
  source: result2.source,
  userFriendly: result2.isUserFriendly ? "✅ YES" : "❌ NO",
  success:
    result2.filename === "Family_Vacation_2024.jpg" ? "✅ PASS" : "❌ FAIL",
});

console.log("\n=== TEST 3: Asset with meaningful URI pattern ===");
const asset3 = {
  type: "image",
  uri: "file:///storage/DCIM/Camera/IMG_20240115_143021.jpg",
  fileName: null,
  size: 1536000,
};

const result3 = processAssetFilename(asset3, 2);
console.log("📋 Result 3:", {
  expected: "IMG_20240115_143021.jpg",
  actual: result3.filename,
  source: result3.source,
  userFriendly: result3.isUserFriendly ? "✅ YES" : "❌ NO",
  success:
    result3.filename === "IMG_20240115_143021.jpg" ? "✅ PASS" : "❌ FAIL",
});

console.log("\n=== TEST 4: Asset requiring smart fallback ===");
const asset4 = {
  type: "video",
  uri: "file:///var/mobile/Containers/Data/Application/ImagePicker-ABCD1234.mp4",
  fileName: null,
  size: 5000000,
};

const result4 = processAssetFilename(asset4, 3);
const expectedPattern = /^Video_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}\.mp4$/;
console.log("📋 Result 4:", {
  expected: "Video_YYYY_MM_DD_HH_MM_SS.mp4 pattern",
  actual: result4.filename,
  source: result4.source,
  userFriendly: result4.isUserFriendly ? "✅ YES" : "❌ NO",
  matchesPattern: expectedPattern.test(result4.filename)
    ? "✅ PASS"
    : "❌ FAIL",
});

console.log("\n=== TEST 5: Document with clear filename ===");
const asset5 = {
  type: "document",
  uri: "file:///Documents/picker/School_Report_Final.pdf",
  name: "School_Report_Final.pdf", // Document picker usually preserves this
  size: 512000,
};

const result5 = processAssetFilename(asset5, 4);
console.log("📋 Result 5:", {
  expected: "School_Report_Final.pdf",
  actual: result5.filename,
  source: result5.source,
  userFriendly: result5.isUserFriendly ? "✅ YES" : "❌ NO",
  success:
    result5.filename === "School_Report_Final.pdf" ? "✅ PASS" : "❌ FAIL",
});

console.log("\n🎯 ENHANCED STRATEGIES SUMMARY:");
console.log("✅ Strategy 1: Direct filename properties (fileName, name, etc.)");
console.log("✅ Strategy 2: EXIF metadata extraction for richer data");
console.log("✅ Strategy 3: Enhanced URI parsing with meaningful patterns");
console.log(
  "✅ Strategy 4: Smart readable fallback (Photo_2024_01_15_14_30_25.jpg)",
);

console.log("\n🔍 KEY IMPROVEMENTS:");
console.log("- OLD: file_1758259329037_0 (unreadable system-generated)");
console.log("- NEW: Photo_2024_01_15_14_30_25.jpg (readable timestamp-based)");
console.log(
  "- RESULT: Even fallback names are now user-friendly and meaningful",
);

console.log("\n✅ Enhanced filename strategies test completed!");
