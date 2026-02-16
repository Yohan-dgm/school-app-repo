/**
 * Student Posts API Test Script
 *
 * This script tests the student-posts/create endpoint to verify:
 * 1. Required parameters
 * 2. Optional parameters
 * 3. Media upload formats
 * 4. Response structure
 * 5. Error handling
 *
 * Usage:
 * 1. Update AUTH_TOKEN with a valid JWT token
 * 2. Update BASE_URL if needed
 * 3. Run: node src/tests/student-posts-api-test.js
 */

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1 || 'http://your-backend-url';
const AUTH_TOKEN = 'your-jwt-token-here'; // Replace with actual token

// Helper function to make API requests
async function makeRequest(endpoint, method, body, isFormData = false) {
  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();

    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

// Test 1: Basic post creation with only required fields
async function testBasicPostCreation() {
  console.log('\n=== TEST 1: Basic Post Creation (Required Fields Only) ===');

  const payload = {
    title: "Student Achievement Post",
    content: "Great work on the science project! #science #achievement",
    student_id: 1,
  };

  console.log('Request Payload:', JSON.stringify(payload, null, 2));

  const result = await makeRequest(
    '/api/activity-feed-management/student-posts/create',
    'POST',
    payload
  );

  console.log('Response Status:', result.status);
  console.log('Response Body:', JSON.stringify(result.data, null, 2));

  if (result.ok && result.data.success) {
    console.log('✅ Test PASSED: Post created successfully');
    console.log('   Post ID:', result.data.data?.id);
    console.log('   Author ID:', result.data.data?.author_id);
    console.log('   Hashtags:', result.data.data?.hashtags?.map(h => h.hashtag));
    return result.data.data?.id; // Return post ID for cleanup
  } else {
    console.log('❌ Test FAILED:', result.data.message || result.error);
    return null;
  }
}

// Test 2: Post creation with all optional fields
async function testFullPostCreation() {
  console.log('\n=== TEST 2: Full Post Creation (All Fields) ===');

  const payload = {
    title: "Monthly Progress Report",
    content: "Excellent progress this month! Keep up the good work. #progress #education #excellence",
    student_id: 1,
    school_id: 1,
    class_id: 5,
    type: "post",
    category: "achievement",
    hashtags: ["progress", "education", "excellence", "monthly"],
  };

  console.log('Request Payload:', JSON.stringify(payload, null, 2));

  const result = await makeRequest(
    '/api/activity-feed-management/student-posts/create',
    'POST',
    payload
  );

  console.log('Response Status:', result.status);
  console.log('Response Body:', JSON.stringify(result.data, null, 2));

  if (result.ok && result.data.success) {
    console.log('✅ Test PASSED: Full post created successfully');
    console.log('   Post ID:', result.data.data?.id);
    console.log('   Category:', result.data.data?.category);
    console.log('   Class ID:', result.data.data?.class_id);
    console.log('   Hashtags Count:', result.data.data?.hashtags?.length);
    return result.data.data?.id;
  } else {
    console.log('❌ Test FAILED:', result.data.message || result.error);
    return null;
  }
}

// Test 3: Post creation with pre-uploaded media (two-step process)
async function testPostWithPreUploadedMedia() {
  console.log('\n=== TEST 3: Post with Pre-uploaded Media (Two-Step) ===');

  const payload = {
    title: "Science Fair Project",
    content: "Check out my science fair project! #science #fair #STEM",
    student_id: 1,
    category: "achievement",
    media: [
      {
        type: "image",
        url: "api/activity-feed-management/storage/file/temp-uploads/temp-1234567890-photo1.jpg",
        filename: "temp-1234567890-photo1.jpg",
        original_filename: "science_project.jpg",
        size: 1024000,
        mime_type: "image/jpeg",
        width: 1920,
        height: 1080,
      },
      {
        type: "image",
        url: "api/activity-feed-management/storage/file/temp-uploads/temp-1234567891-photo2.jpg",
        filename: "temp-1234567891-photo2.jpg",
        original_filename: "project_details.jpg",
        size: 856000,
        mime_type: "image/jpeg",
        width: 1920,
        height: 1080,
      }
    ],
  };

  console.log('Request Payload:', JSON.stringify(payload, null, 2));

  const result = await makeRequest(
    '/api/activity-feed-management/student-posts/create',
    'POST',
    payload
  );

  console.log('Response Status:', result.status);
  console.log('Response Body:', JSON.stringify(result.data, null, 2));

  if (result.ok && result.data.success) {
    console.log('✅ Test PASSED: Post with media created successfully');
    console.log('   Post ID:', result.data.data?.id);
    console.log('   Media Count:', result.data.data?.media?.length);
    console.log('   Media Files:', result.data.data?.media?.map(m => m.filename));
    return result.data.data?.id;
  } else {
    console.log('❌ Test FAILED:', result.data.message || result.error);
    return null;
  }
}

// Test 4: Post creation with hashtags in different formats
async function testHashtagFormats() {
  console.log('\n=== TEST 4: Hashtag Format Testing ===');

  const tests = [
    {
      name: "Array Format",
      payload: {
        title: "Test Hashtags Array",
        content: "Testing hashtags #test",
        student_id: 1,
        hashtags: ["array", "format", "test"],
      }
    },
    {
      name: "Comma-Separated String",
      payload: {
        title: "Test Hashtags String",
        content: "Testing hashtags #test",
        student_id: 1,
        hashtags: "string,format,test",
      }
    },
    {
      name: "Content-only Hashtags",
      payload: {
        title: "Test Content Hashtags",
        content: "Testing content hashtags #content #only #extraction",
        student_id: 1,
      }
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n--- Testing: ${test.name} ---`);
    console.log('Payload:', JSON.stringify(test.payload, null, 2));

    const result = await makeRequest(
      '/api/activity-feed-management/student-posts/create',
      'POST',
      test.payload
    );

    if (result.ok && result.data.success) {
      console.log(`✅ ${test.name} PASSED`);
      console.log('   Hashtags:', result.data.data?.hashtags?.map(h => h.hashtag));
      results.push({ name: test.name, passed: true, postId: result.data.data?.id });
    } else {
      console.log(`❌ ${test.name} FAILED:`, result.data.message || result.error);
      results.push({ name: test.name, passed: false });
    }

    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n--- Hashtag Tests Summary ---');
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
  });

  return results.filter(r => r.passed).map(r => r.postId);
}

// Test 5: Error handling - missing required fields
async function testErrorHandling() {
  console.log('\n=== TEST 5: Error Handling (Missing Required Fields) ===');

  const tests = [
    {
      name: "Missing title",
      payload: { content: "Test", student_id: 1 }
    },
    {
      name: "Missing content",
      payload: { title: "Test", student_id: 1 }
    },
    {
      name: "Missing student_id",
      payload: { title: "Test", content: "Test content" }
    },
    {
      name: "Empty payload",
      payload: {}
    }
  ];

  console.log('\nThese tests should FAIL (validating error handling):');

  for (const test of tests) {
    console.log(`\n--- Testing: ${test.name} ---`);

    const result = await makeRequest(
      '/api/activity-feed-management/student-posts/create',
      'POST',
      test.payload
    );

    if (!result.ok || !result.data.success) {
      console.log(`✅ Error handling works: ${result.data.message || result.error}`);
    } else {
      console.log(`❌ Test should have failed but succeeded`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Test 6: Verify post data structure
async function testPostDataStructure() {
  console.log('\n=== TEST 6: Post Data Structure Verification ===');

  const payload = {
    title: "Structure Test Post",
    content: "Testing response structure #structure #test",
    student_id: 1,
    class_id: 5,
    category: "test",
    hashtags: ["structure", "test", "validation"],
  };

  const result = await makeRequest(
    '/api/activity-feed-management/student-posts/create',
    'POST',
    payload
  );

  if (result.ok && result.data.success) {
    console.log('✅ Post created, validating structure...');

    const post = result.data.data;
    const requiredFields = [
      'id', 'type', 'title', 'content', 'author_id',
      'school_id', 'class_id', 'student_id',
      'likes_count', 'comments_count', 'is_active',
      'created_at', 'updated_at'
    ];

    const missingFields = requiredFields.filter(field => !(field in post));

    if (missingFields.length === 0) {
      console.log('✅ All required fields present');
    } else {
      console.log('❌ Missing fields:', missingFields);
    }

    // Check relationships
    console.log('\nRelationships loaded:');
    console.log('  - Author:', post.author ? '✅' : '❌');
    console.log('  - Media:', post.media ? '✅' : '❌');
    console.log('  - Hashtags:', post.hashtags ? '✅' : '❌');

    // Display structure
    console.log('\nPost Structure:');
    console.log(JSON.stringify({
      id: post.id,
      type: post.type,
      category: post.category,
      title: post.title,
      content: post.content?.substring(0, 50) + '...',
      author: post.author ? {
        id: post.author.id,
        name: post.author.name || 'N/A'
      } : null,
      hashtags: post.hashtags?.map(h => h.hashtag),
      media_count: post.media?.length || 0,
      likes_count: post.likes_count,
      comments_count: post.comments_count,
      timestamps: {
        created_at: post.created_at,
        updated_at: post.updated_at,
      }
    }, null, 2));

    return post.id;
  } else {
    console.log('❌ Failed to create post:', result.data.message || result.error);
    return null;
  }
}

// Main test runner
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   STUDENT POSTS API COMPREHENSIVE TEST SUITE          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('\nBase URL:', BASE_URL);
  console.log('Endpoint:', '/api/activity-feed-management/student-posts/create');
  console.log('Auth Token:', AUTH_TOKEN ? '✅ Configured' : '❌ Missing');

  if (!AUTH_TOKEN || AUTH_TOKEN === 'your-jwt-token-here') {
    console.log('\n❌ ERROR: Please configure AUTH_TOKEN in the script');
    console.log('   You need a valid JWT token to run these tests.');
    return;
  }

  const createdPostIds = [];

  try {
    // Run all tests
    const id1 = await testBasicPostCreation();
    if (id1) createdPostIds.push(id1);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const id2 = await testFullPostCreation();
    if (id2) createdPostIds.push(id2);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const id3 = await testPostWithPreUploadedMedia();
    if (id3) createdPostIds.push(id3);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const ids4 = await testHashtagFormats();
    createdPostIds.push(...ids4.filter(Boolean));

    await new Promise(resolve => setTimeout(resolve, 1000));

    await testErrorHandling();

    await new Promise(resolve => setTimeout(resolve, 1000));

    const id6 = await testPostDataStructure();
    if (id6) createdPostIds.push(id6);

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   TEST SUITE COMPLETE                                  ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\nCreated ${createdPostIds.length} test posts`);

  if (createdPostIds.length > 0) {
    console.log('\nPost IDs created during testing:');
    createdPostIds.forEach(id => console.log(`  - Post ID: ${id}`));
    console.log('\n💡 TIP: You may want to delete these test posts from your database.');
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
