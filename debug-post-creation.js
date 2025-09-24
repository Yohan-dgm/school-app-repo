// Debug script to test post creation logic
const { createPostData } = require("./src/utils/postUtils.js");

console.log("🧪 Testing post creation logic...");

// Test 1: Simulate uploaded media (two-step process)
console.log("\n=== TEST 1: Two-step uploaded media ===");
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

const result1 = createPostData(postData1, uploadedMedia);
console.log("Result 1:", JSON.stringify(result1, null, 2));

// Test 2: Simulate raw selected media (single-step process)
console.log("\n=== TEST 2: Single-step raw media ===");
const rawMedia = [
  {
    type: "image",
    uri: "file://local/path/photo.jpg",
    name: "My_Photo.jpg", // User selected name
    size: 1024000,
  },
];

const postData2 = {
  title: "Test Post 2",
  content: "Testing raw media",
  category: "announcement",
  author_id: 123,
};

const result2 = createPostData(postData2, rawMedia);
console.log("Result 2:", JSON.stringify(result2, null, 2));

console.log("\n🔍 Analysis:");
console.log("- Test 1 should preserve exact backend filename");
console.log("- Test 2 should use sanitized user filename");
