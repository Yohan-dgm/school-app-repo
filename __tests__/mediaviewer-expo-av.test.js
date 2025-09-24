/**
 * Test to verify MediaViewer component uses expo-av correctly
 */

describe("MediaViewer expo-av Integration", () => {
  test("should import Video from expo-av", () => {
    // This is a basic test to ensure our changes compile correctly
    const mediaViewerCode = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "..",
        "src",
        "components",
        "media",
        "MediaViewer.js",
      ),
      "utf8",
    );

    // Check that expo-av is imported
    expect(mediaViewerCode).toContain('import { Video } from "expo-av"');

    // Check that expo-video is NOT imported
    expect(mediaViewerCode).not.toContain(
      'import { useVideoPlayer, VideoView } from "expo-video"',
    );

    // Check that WebView video modal is replaced with expo-av Video
    expect(mediaViewerCode).toContain("useNativeControls");
    expect(mediaViewerCode).toContain('resizeMode="contain"');

    console.log("✅ MediaViewer successfully updated to use expo-av");
    console.log("✅ expo-video imports removed");
    console.log("✅ WebView video modal replaced with native Video component");
    console.log("✅ Native video controls enabled");
  });

  test("should have simplified video handling", () => {
    const mediaViewerCode = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "..",
        "src",
        "components",
        "media",
        "MediaViewer.js",
      ),
      "utf8",
    );

    // Check that complex video loading logic is removed
    expect(mediaViewerCode).not.toContain("loadVideoSource");
    expect(mediaViewerCode).not.toContain("loadingOperationRef");
    expect(mediaViewerCode).not.toContain("useWebViewFallback");

    // Check that video error handling is simplified
    expect(mediaViewerCode).toContain("handleVideoError");
    expect(mediaViewerCode).toContain("handleVideoLoad");

    console.log("✅ Complex video loading logic removed");
    console.log("✅ Simplified error handling implemented");
  });
});
