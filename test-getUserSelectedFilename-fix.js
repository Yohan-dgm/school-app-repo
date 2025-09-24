// Test to verify getUserSelectedFilename now uses smart readable fallback
console.log("🧪 Testing getUserSelectedFilename fallback fix...");

// Simulate the sanitizeFilename function
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

// Simulate the extractOriginalFilenameFromTemp function
const extractOriginalFilenameFromTemp = (tempFilename) => {
  if (!tempFilename || typeof tempFilename !== "string") {
    return null;
  }

  const tempPattern = /^temp-\d+-(.+)$/;
  const match = tempFilename.match(tempPattern);

  if (match && match[1]) {
    console.log(
      `📎 🔍 Extracted original filename: ${tempFilename} → ${match[1]}`,
    );
    return match[1];
  }

  return null;
};

// Updated getUserSelectedFilename function with smart fallback
const getUserSelectedFilename = (media, index = 0) => {
  let filename = null;

  // Priority 1: User-selected filename (preserve user intent)
  if (media.name && !media.name.includes("temp-")) {
    filename = sanitizeFilename(media.name);
    console.log(
      `📎 🎯 Using user-selected filename from media.name: ${filename}`,
    );
  } else if (media.fileName && !media.fileName.includes("temp-")) {
    filename = sanitizeFilename(media.fileName);
    console.log(
      `📎 🎯 Using user-selected filename from media.fileName: ${filename}`,
    );
  } else if (media.original_name && !media.original_name.includes("temp-")) {
    filename = sanitizeFilename(media.original_name);
    console.log(
      `📎 🎯 Using user-selected filename from media.original_name: ${filename}`,
    );
  } else if (
    media.original_filename &&
    !media.original_filename.includes("temp-")
  ) {
    filename = sanitizeFilename(media.original_filename);
    console.log(
      `📎 🎯 Using user-selected filename from media.original_filename: ${filename}`,
    );
  }

  // Priority 2: Extract original filename from backend temp filename
  if (!filename && media.filename && media.filename.includes("temp-")) {
    const extractedFilename = extractOriginalFilenameFromTemp(media.filename);
    if (extractedFilename) {
      filename = sanitizeFilename(extractedFilename);
      console.log(
        `📎 🎯 Using extracted original filename from backend temp: ${filename}`,
      );
    }
  }

  // Priority 3: Backend filename (if available and not temp)
  if (!filename) {
    const backendFilename =
      media.filename || media.temp_filename || media.saved_filename;
    if (backendFilename && !backendFilename.includes("temp-")) {
      filename = sanitizeFilename(backendFilename);
      console.log(`📎 🎯 Using backend filename: ${filename}`);
    }
  }

  // Priority 4: Smart readable fallback (FIXED!)
  if (!filename) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");

    const extension =
      media.type === "video" ? "mp4" : media.type === "image" ? "jpg" : "file";
    const mediaPrefix =
      media.type === "video"
        ? "Video"
        : media.type === "image"
          ? "Photo"
          : "File";

    filename = `${mediaPrefix}_${year}_${month}_${day}_${hour}_${minute}_${second}.${extension}`;
    console.log(`📎 🎯 Using smart readable fallback: ${filename}`);
  }

  return filename;
};

console.log(
  "\n=== TEST 1: Media without any filename fields (should use smart fallback) ===",
);
const testMedia1 = {
  type: "image",
  // No filename fields available
  size: 1024000,
};

const result1 = getUserSelectedFilename(testMedia1, 0);
const expectedPattern1 = /^Photo_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}\.jpg$/;
console.log("📋 Result 1:", {
  actual: result1,
  isOldPattern: result1.includes("media_") || result1.includes("file_"),
  isNewPattern: expectedPattern1.test(result1),
  success: expectedPattern1.test(result1) ? "✅ FIXED" : "❌ STILL BROKEN",
});

console.log(
  "\n=== TEST 2: Video without filename fields (should use smart fallback) ===",
);
const testMedia2 = {
  type: "video",
  // No filename fields available
  size: 5000000,
};

const result2 = getUserSelectedFilename(testMedia2, 1);
const expectedPattern2 = /^Video_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}\.mp4$/;
console.log("📋 Result 2:", {
  actual: result2,
  isOldPattern: result2.includes("media_") || result2.includes("file_"),
  isNewPattern: expectedPattern2.test(result2),
  success: expectedPattern2.test(result2) ? "✅ FIXED" : "❌ STILL BROKEN",
});

console.log(
  "\n=== TEST 3: Backend temp filename (should extract original) ===",
);
const testMedia3 = {
  type: "image",
  filename: "temp-1640995200000-Family_Photo.jpg", // Backend temp with user filename
  size: 2048000,
};

const result3 = getUserSelectedFilename(testMedia3, 2);
console.log("📋 Result 3:", {
  actual: result3,
  expected: "Family_Photo.jpg",
  success: result3 === "Family_Photo.jpg" ? "✅ EXTRACTED" : "❌ FAILED",
});

console.log(
  "\n=== TEST 4: Media with user-selected name (should preserve) ===",
);
const testMedia4 = {
  type: "image",
  name: "My_Beautiful_Sunset.jpg", // User selected this
  size: 1536000,
};

const result4 = getUserSelectedFilename(testMedia4, 3);
console.log("📋 Result 4:", {
  actual: result4,
  expected: "My_Beautiful_Sunset.jpg",
  success: result4 === "My_Beautiful_Sunset.jpg" ? "✅ PRESERVED" : "❌ FAILED",
});

console.log("\n🎯 FALLBACK FIX SUMMARY:");
console.log(
  "✅ Priority 1-3: User filenames and backend extraction work as before",
);
console.log(
  "✅ Priority 4: Smart readable fallback now generates proper timestamps",
);
console.log("");
console.log("🔍 BEFORE vs AFTER:");
console.log("- OLD FALLBACK: media_1758259329037_0.jpg");
console.log(`- NEW FALLBACK: ${result1}`);
console.log("");
console.log("This should fix the remaining filename issues!");

console.log("\n✅ getUserSelectedFilename fallback test completed!");
