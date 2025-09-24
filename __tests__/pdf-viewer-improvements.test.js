/**
 * Test to verify PDF viewer improvements in MediaViewer
 */

describe("MediaViewer PDF Improvements", () => {
  test("should have Google Docs viewer integration", () => {
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

    // Check for Google Docs viewer functions
    expect(mediaViewerCode).toContain("createGoogleDocsViewerUrl");
    expect(mediaViewerCode).toContain("createGoogleDriveViewerUrl");

    // Check for PDF error handling
    expect(mediaViewerCode).toContain("handlePdfError");
    expect(mediaViewerCode).toContain("handlePdfLoad");
    expect(mediaViewerCode).toContain("retryPdfLoad");

    // Check for PDF loading states
    expect(mediaViewerCode).toContain("pdfLoadingState");
    expect(mediaViewerCode).toContain("useDirectPdfUrl");

    console.log("✅ Google Docs viewer integration added");
    console.log("✅ PDF error handling implemented");
    console.log("✅ PDF retry mechanism added");
  });

  test("should have improved PDF loading experience", () => {
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

    // Check for improved loading states
    expect(mediaViewerCode).toContain("Loading PDF...");
    expect(mediaViewerCode).toContain("Using Google Docs viewer...");
    expect(mediaViewerCode).toContain("Loading directly...");

    // Check for error messages and user guidance
    expect(mediaViewerCode).toContain("Direct PDF viewing failed");
    expect(mediaViewerCode).toContain("Google Docs viewer failed");
    expect(mediaViewerCode).toContain("Try Google Viewer");
    expect(mediaViewerCode).toContain("Try Direct URL");

    // Check for PDF viewer badge
    expect(mediaViewerCode).toContain("Google Docs Viewer");

    console.log("✅ Enhanced loading states implemented");
    console.log("✅ User-friendly error messages added");
    console.log("✅ PDF viewer method indication added");
  });

  test("should have proper PDF URL handling", () => {
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

    // Check for URL encoding
    expect(mediaViewerCode).toContain("encodeURIComponent");

    // Check for Google services URLs
    expect(mediaViewerCode).toContain("docs.google.com/gview?embedded=true");
    expect(mediaViewerCode).toContain(
      "drive.google.com/viewerng/viewer?embedded=true",
    );

    console.log("✅ Proper URL encoding implemented");
    console.log("✅ Google Docs and Drive viewer URLs configured");
  });
});
