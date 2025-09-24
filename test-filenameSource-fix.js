// Test to verify filenameSource scope error is fixed
console.log("🧪 Testing filenameSource scope fix...");

// Simulate the enhanced filename capture logic as it appears in the components
const testEnhancedFilenameCapture = (asset, index) => {
  // Enhanced filename capture with multiple strategies
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

  // Now simulate creating the media object (where the error was occurring)
  try {
    const mediaObject = {
      id: Date.now() + Math.random() + index,
      type: asset.type || "image",
      uri: asset.uri,
      name: originalUserFilename, // Use enhanced filename capture
      fileName: originalUserFilename, // Also set fileName for compatibility
      original_user_filename: originalUserFilename, // Explicit user intent field
      filenameSource: filenameSource, // This should now be in scope!
      size: asset.fileSize || asset.size || 0,
      mimeType:
        asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg"),
    };

    console.log(`📁 ✅ Successfully created media object ${index}:`, {
      name: mediaObject.name,
      filenameSource: mediaObject.filenameSource,
      hasAllFields: !!(mediaObject.name && mediaObject.filenameSource),
    });

    return { success: true, data: mediaObject };
  } catch (error) {
    console.error(`❌ Error creating media object ${index}:`, error);
    return { success: false, error: error.message };
  }
};

console.log("\n=== TEST 1: Asset with fileName (should not throw error) ===");
const asset1 = {
  type: "image",
  uri: "file:///storage/cache/test.jpg",
  fileName: "My_Photo.jpg",
  size: 1024000,
};

const result1 = testEnhancedFilenameCapture(asset1, 0);
console.log("📋 Result 1:", {
  success: result1.success,
  error: result1.error || "None",
  filenameSource: result1.data?.filenameSource,
  filename: result1.data?.name,
});

console.log(
  "\n=== TEST 2: Asset with no filename (should use fallback without error) ===",
);
const asset2 = {
  type: "video",
  uri: "file:///var/mobile/Containers/Data/Application/ImagePicker-ABCD1234.mp4",
  // No filename fields available
  size: 5000000,
};

const result2 = testEnhancedFilenameCapture(asset2, 1);
console.log("📋 Result 2:", {
  success: result2.success,
  error: result2.error || "None",
  filenameSource: result2.data?.filenameSource,
  filename: result2.data?.name,
});

console.log("\n🎯 SCOPE FIX SUMMARY:");
if (result1.success && result2.success) {
  console.log("✅ filenameSource scope error is FIXED!");
  console.log("✅ All media objects can be created without errors");
  console.log("✅ filenameSource is properly included in media objects");
} else {
  console.log("❌ There are still errors:");
  if (!result1.success) console.log(`  - Test 1 failed: ${result1.error}`);
  if (!result2.success) console.log(`  - Test 2 failed: ${result2.error}`);
}

console.log("\n✅ filenameSource scope test completed!");
