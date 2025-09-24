import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  FlatList,
  ScrollView,
  Dimensions,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { Video } from "expo-av";
import { WebView } from "react-native-webview";
import Icon from "@expo/vector-icons/MaterialIcons";
import { useSelector } from "react-redux";
import { theme } from "../../styles/theme";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// PDF rendering methods constant
const PDF_RENDER_METHODS = {
  BASE64_INLINE: "base64_inline",
  PDFJS_VIEWER: "pdfjs_viewer",
  OBJECT_EMBED: "object_embed",
  DIRECT_URL: "direct_url",
};

const MediaViewer = ({
  media,
  onPress,
  style,
  showControls = true,
  autoPlay = false,
  customStyles = {},
}) => {
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [imageLoadError, setImageLoadError] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [pdfLoadingState, setPdfLoadingState] = useState("loading"); // "loading", "loaded", "error"
  const [currentPdfMethod, setCurrentPdfMethod] = useState(
    PDF_RENDER_METHODS.BASE64_INLINE,
  );
  const [pdfMethodIndex, setPdfMethodIndex] = useState(0);
  const [pdfBase64Data, setPdfBase64Data] = useState(null);
  const videoRef = useRef(null);

  // Get authentication token from Redux store
  const token = useSelector((state) => state.app.token);

  // Handle video load errors
  const handleVideoError = (error) => {
    console.log("❌ Video load error:", error);
    setVideoLoadError(true);
  };

  const handleVideoLoad = (status) => {
    console.log("✅ Video loaded successfully:", status);
    setVideoLoadError(false);
  };

  // PDF handling functions with multiple methods
  const convertPdfToBase64 = async (pdfUrl) => {
    try {
      console.log("📄 Converting PDF to base64:", pdfUrl);
      const response = await fetch(pdfUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.log("❌ Failed to convert PDF to base64:", error);
      throw error;
    }
  };

  const createBase64PdfHtml = (base64Data) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              margin: 0;
              padding: 0;
              background: #f5f5f5;
              height: 100vh;
              overflow: hidden;
            }
            .pdf-container {
              width: 100%;
              height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            object, iframe {
              width: 100%;
              height: 100%;
              border: none;
            }
            .error-message {
              text-align: center;
              padding: 20px;
              color: #666;
              font-family: Arial, sans-serif;
            }
          </style>
        </head>
        <body>
          <div class="pdf-container">
            <object data="data:application/pdf;base64,${base64Data}" type="application/pdf">
              <iframe src="data:application/pdf;base64,${base64Data}">
                <div class="error-message">
                  <p>PDF cannot be displayed</p>
                </div>
              </iframe>
            </object>
          </div>
        </body>
      </html>
    `;
  };

  const createPdfJsViewerHtml = (pdfUrl) => {
    const encodedUrl = encodeURIComponent(pdfUrl);
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; height: 100vh; overflow: hidden; }
            iframe { width: 100%; height: 100%; border: none; }
          </style>
        </head>
        <body>
          <iframe src="https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodedUrl}"></iframe>
        </body>
      </html>
    `;
  };

  const createObjectEmbedHtml = (pdfUrl) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              margin: 0;
              padding: 0;
              height: 100vh;
              background: #f5f5f5;
            }
            .pdf-container {
              width: 100%;
              height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            object, embed {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          <div class="pdf-container">
            <object data="${pdfUrl}" type="application/pdf">
              <embed src="${pdfUrl}" type="application/pdf">
                <p>PDF cannot be displayed. <a href="${pdfUrl}" target="_blank">Click here to view</a></p>
              </embed>
            </object>
          </div>
        </body>
      </html>
    `;
  };

  const handlePdfError = (error) => {
    console.log("❌ PDF load error:", error);
    setPdfLoadError(true);
    setPdfLoadingState("error");
  };

  const handlePdfLoad = () => {
    console.log("✅ PDF loaded successfully");
    setPdfLoadError(false);
    setPdfLoadingState("loaded");
  };

  // Automatic method switching
  const tryNextPdfMethod = async () => {
    const methods = Object.values(PDF_RENDER_METHODS);
    const nextIndex = (pdfMethodIndex + 1) % methods.length;
    const nextMethod = methods[nextIndex];

    console.log(`🔄 Trying next PDF method: ${nextMethod}`);
    setCurrentPdfMethod(nextMethod);
    setPdfMethodIndex(nextIndex);
    setPdfLoadError(false);
    setPdfLoadingState("loading");

    // Reset base64 data when switching methods
    if (nextMethod !== PDF_RENDER_METHODS.BASE64_INLINE) {
      setPdfBase64Data(null);
    }
  };

  // Initialize PDF loading with automatic method switching
  const initializePdfLoad = async (pdfUri) => {
    console.log("📄 Initializing PDF load with method:", currentPdfMethod);
    setPdfLoadingState("loading");
    setPdfLoadError(false);

    try {
      if (
        currentPdfMethod === PDF_RENDER_METHODS.BASE64_INLINE &&
        !pdfBase64Data
      ) {
        console.log("📄 Converting PDF to base64 for inline display");
        const base64Data = await convertPdfToBase64(pdfUri);
        setPdfBase64Data(base64Data);
      }
    } catch (error) {
      console.log("❌ Failed to initialize PDF load:", error);
      // Automatically try next method
      setTimeout(tryNextPdfMethod, 1000);
    }
  };

  // Reset error states when modals are closed
  useEffect(() => {
    if (!videoModalVisible) {
      setVideoLoadError(false);
    }
  }, [videoModalVisible]);

  useEffect(() => {
    if (!pdfModalVisible) {
      setPdfLoadError(false);
      setPdfLoadingState("loading");
      setCurrentPdfMethod(PDF_RENDER_METHODS.BASE64_INLINE);
      setPdfMethodIndex(0);
      setPdfBase64Data(null);
    }
  }, [pdfModalVisible]);

  // Media handlers
  const handleImagePress = (mediaData, index = 0) => {
    setSelectedMedia(mediaData);
    setCurrentImageIndex(index);
    setImageLoadError(false); // Reset error state
    setImageModalVisible(true);
    if (onPress) onPress(mediaData, "image");
  };

  const handleVideoPress = (mediaData) => {
    console.log("🎬 Opening expo-av video player for:", mediaData.uri);
    setSelectedMedia(mediaData);
    setVideoLoadError(false);
    setVideoModalVisible(true);
    if (onPress) onPress(mediaData, "video");
  };

  const handlePdfPress = (mediaData) => {
    console.log("📄 Opening PDF modal for:", mediaData.uri);
    setSelectedMedia(mediaData);
    setPdfLoadError(false);
    setPdfLoadingState("loading");
    setCurrentPdfMethod(PDF_RENDER_METHODS.BASE64_INLINE);
    setPdfMethodIndex(0);
    setPdfBase64Data(null);
    setPdfModalVisible(true);

    // Initialize PDF loading
    initializePdfLoad(mediaData.uri);

    if (onPress) onPress(mediaData, "pdf");
  };

  // Close video modal
  const closeVideoModal = () => {
    console.log("🎬 Closing video modal");
    setVideoModalVisible(false);
    setSelectedMedia(null);
    setVideoLoadError(false);
    if (videoRef.current) {
      videoRef.current.pauseAsync();
    }
  };

  // Render different media types
  const renderMediaContent = () => {
    if (!media) return null;

    // Handle array of media items
    if (Array.isArray(media)) {
      if (media.length === 0) return null;

      // If multiple items, show them in a horizontal scroll
      if (media.length > 1) {
        return (
          <View style={styles.multipleMediaContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {media.map((item, index) => (
                <View key={index} style={styles.mediaItemWrapper}>
                  {renderSingleMediaItem(item, index)}
                </View>
              ))}
            </ScrollView>
          </View>
        );
      } else {
        // Single item, render directly
        return renderSingleMediaItem(media[0], 0);
      }
    }

    // Handle single media item (legacy support)
    return renderSingleMediaItem(media, 0);
  };

  // Render a single media item
  const renderSingleMediaItem = (mediaItem, index = 0) => {
    if (!mediaItem) return null;

    switch (mediaItem.type) {
      case "image":
        return (
          <TouchableOpacity
            onPress={() => handleImagePress(mediaItem, index)}
            style={style}
          >
            <Image
              source={
                typeof mediaItem.uri === "string"
                  ? {
                      uri: mediaItem.uri,
                      headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : {},
                    }
                  : mediaItem.uri
              }
              style={[styles.postImage, customStyles.image]}
            />
          </TouchableOpacity>
        );

      case "multiple_images":
        return (
          <View
            style={[
              styles.multipleImagesContainer,
              customStyles.multipleImages,
            ]}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {mediaItem.images.map((image, imgIndex) => (
                <TouchableOpacity
                  key={imgIndex}
                  onPress={() => handleImagePress(mediaItem, imgIndex)}
                  style={styles.multipleImageWrapper}
                >
                  <Image
                    source={
                      typeof image === "string"
                        ? {
                            uri: image,
                            headers: token
                              ? { Authorization: `Bearer ${token}` }
                              : {},
                          }
                        : image
                    }
                    style={[styles.multipleImage, customStyles.multipleImage]}
                  />
                  {imgIndex === 0 && mediaItem.images.length > 1 && (
                    <View style={styles.imageCountBadge}>
                      <Text style={styles.imageCountText}>
                        +{mediaItem.images.length - 1}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case "video":
        return (
          <TouchableOpacity
            onPress={() => handleVideoPress(mediaItem)}
            style={style}
          >
            <View style={[styles.videoWrapper, customStyles.video]}>
              <Image
                source={
                  typeof mediaItem.thumbnail === "string"
                    ? {
                        uri: mediaItem.thumbnail,
                        headers: token
                          ? { Authorization: `Bearer ${token}` }
                          : {},
                      }
                    : mediaItem.thumbnail
                }
                style={styles.postImage}
              />
              <View style={styles.videoOverlay}>
                <Icon name="play-circle-filled" size={60} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
        );

      case "pdf":
        return (
          <TouchableOpacity
            onPress={() => handlePdfPress(mediaItem)}
            style={style}
          >
            <View style={[styles.pdfWrapper, customStyles.pdf]}>
              <View style={styles.pdfIcon}>
                <Icon name="picture-as-pdf" size={40} color="#FF5722" />
              </View>
              <View style={styles.pdfInfo}>
                <Text style={styles.pdfFileName}>{mediaItem.fileName}</Text>
                <Text style={styles.pdfFileSize}>{mediaItem.fileSize}</Text>
              </View>
              {/* <Icon name="download" size={24} color="#65676B" /> */}
            </View>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  // Image Modal Component
  const renderImageModal = () => (
    <Modal
      visible={imageModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setImageModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setImageModalVisible(false)}
          >
            <Icon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedMedia?.type === "multiple_images" ? (
            <FlatList
              data={selectedMedia.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={currentImageIndex}
              getItemLayout={(data, index) => ({
                length: screenWidth,
                offset: screenWidth * index,
                index,
              })}
              renderItem={({ item, index }) => (
                <View style={styles.imageContainer}>
                  <Image
                    source={
                      typeof item === "string"
                        ? {
                            uri: item,
                            headers: token
                              ? { Authorization: `Bearer ${token}` }
                              : {},
                          }
                        : item
                    }
                    style={styles.fullScreenImage}
                  />
                  <Text style={styles.imageCounter}>
                    {index + 1} / {selectedMedia.images.length}
                  </Text>
                </View>
              )}
              keyExtractor={(item, index) => index.toString()}
            />
          ) : (
            <View style={styles.imageContainer}>
              {imageLoadError ? (
                <View style={styles.errorContainer}>
                  <Icon name="broken-image" size={64} color="#666" />
                  <Text style={styles.errorText}>Unable to load image</Text>
                  <Text style={styles.errorSubText}>
                    Authentication required or file not found
                  </Text>
                </View>
              ) : (
                <Image
                  source={
                    typeof selectedMedia?.uri === "string"
                      ? {
                          uri: selectedMedia.uri,
                          headers: token
                            ? { Authorization: `Bearer ${token}` }
                            : {},
                        }
                      : selectedMedia?.uri
                  }
                  style={styles.fullScreenImage}
                  onError={() => {
                    console.log("❌ Image load error for:", selectedMedia?.uri);
                    setImageLoadError(true);
                  }}
                  onLoad={() => {
                    console.log(
                      "✅ Image loaded successfully:",
                      selectedMedia?.uri,
                    );
                    setImageLoadError(false);
                  }}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  // Video Modal Component - Native expo-av Video Player
  const renderVideoModal = () => (
    <Modal
      visible={videoModalVisible}
      transparent={false}
      animationType="slide"
      onRequestClose={closeVideoModal}
      onShow={() => {
        console.log("🎬 expo-av video player is now visible");
        console.log("🎬 Selected media for video:", selectedMedia);
      }}
    >
      <View style={styles.fullscreenVideoContainer}>
        {videoLoadError ? (
          <View style={styles.errorContainer}>
            <Icon name="error" size={64} color="#666" />
            <Text style={styles.errorText}>Unable to load video</Text>
            <Text style={styles.errorSubText}>
              Please check your internet connection or try again later
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setVideoLoadError(false);
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Video
            ref={videoRef}
            source={{
              uri: selectedMedia?.uri,
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }}
            style={styles.fullscreenVideo}
            useNativeControls
            resizeMode="contain"
            shouldPlay={false}
            isLooping={false}
            onError={handleVideoError}
            onLoad={handleVideoLoad}
            onPlaybackStatusUpdate={(status) => {
              if (status.error) {
                handleVideoError(status.error);
              }
            }}
          />
        )}

        {/* Close Button */}
        <TouchableOpacity
          style={styles.videoCloseButton}
          onPress={closeVideoModal}
          activeOpacity={0.8}
        >
          <Text style={styles.videoCloseButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  // Enhanced PDF Modal Component with Multi-Method Support
  const renderPdfModal = () => {
    const getPdfContent = () => {
      if (!selectedMedia?.uri) return null;

      switch (currentPdfMethod) {
        case PDF_RENDER_METHODS.BASE64_INLINE:
          return pdfBase64Data ? createBase64PdfHtml(pdfBase64Data) : null;
        case PDF_RENDER_METHODS.PDFJS_VIEWER:
          return createPdfJsViewerHtml(selectedMedia.uri);
        case PDF_RENDER_METHODS.OBJECT_EMBED:
          return createObjectEmbedHtml(selectedMedia.uri);
        case PDF_RENDER_METHODS.DIRECT_URL:
          return selectedMedia.uri;
        default:
          return null;
      }
    };

    const pdfContent = getPdfContent();

    return (
      <Modal
        visible={pdfModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPdfModalVisible(false)}
        onShow={() => {
          console.log("📄 PDF modal is now visible");
          console.log("📄 Current method:", currentPdfMethod);
          console.log("📄 Selected media URI:", selectedMedia?.uri);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setPdfModalVisible(false)}
            >
              <Icon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.pdfContainer}>
              {/* PDF Content */}
              <View style={styles.pdfViewerContainer}>
                {pdfLoadingState === "error" ? (
                  <View style={styles.errorContainer}>
                    <Icon name="error" size={64} color="#666" />
                    <Text style={styles.errorText}>Unable to load PDF</Text>
                    <Text style={styles.errorSubText}>
                      Please check your internet connection and try again.
                    </Text>

                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => tryNextPdfMethod()}
                    >
                      <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                  </View>
                ) : pdfLoadingState === "loading" ? (
                  <View style={styles.pdfLoadingContainer}>
                    <Icon name="picture-as-pdf" size={48} color="#FF5722" />
                    <Text style={styles.pdfLoadingText}>Loading PDF...</Text>
                  </View>
                ) : pdfContent ? (
                  <WebView
                    source={{
                      ...(currentPdfMethod === PDF_RENDER_METHODS.DIRECT_URL
                        ? {
                            uri: pdfContent,
                            headers: token
                              ? { Authorization: `Bearer ${token}` }
                              : {},
                          }
                        : { html: pdfContent }),
                    }}
                    style={styles.pdfWebView}
                    startInLoadingState={true}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    onError={(error) => {
                      console.log(
                        `❌ PDF WebView Error (${currentPdfMethod}):`,
                        error,
                      );
                      handlePdfError(error);
                      // Automatically try next method after error
                      setTimeout(tryNextPdfMethod, 2000);
                    }}
                    onLoad={() => {
                      console.log(
                        `✅ PDF loaded successfully with method: ${currentPdfMethod}`,
                      );
                      handlePdfLoad();
                    }}
                    onLoadStart={() => {
                      setPdfLoadingState("loading");
                    }}
                    onLoadEnd={() => {
                      // Check if WebView actually loaded content
                      setTimeout(() => {
                        if (pdfLoadingState === "loading") {
                          console.log(
                            "⚠️ PDF may not have loaded properly, trying next method",
                          );
                          tryNextPdfMethod();
                        }
                      }, 5000);
                    }}
                  />
                ) : (
                  <View style={styles.errorContainer}>
                    <Icon name="error" size={64} color="#666" />
                    <Text style={styles.errorText}>Unable to load PDF</Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => initializePdfLoad(selectedMedia?.uri)}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View>
      {renderMediaContent()}
      {renderImageModal()}
      {renderVideoModal()}
      {renderPdfModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  // Media Content Styles
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    resizeMode: "cover",
  },

  multipleImagesContainer: {
    marginVertical: 8,
  },

  multipleImageWrapper: {
    marginRight: 8,
    position: "relative",
  },

  multipleImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    resizeMode: "cover",
  },

  imageCountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  imageCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  videoWrapper: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },

  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },

  pdfWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },

  pdfIcon: {
    marginRight: 12,
  },

  pdfInfo: {
    flex: 1,
  },

  pdfFileName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },

  pdfFileSize: {
    fontSize: 14,
    color: "#8E8E93",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContent: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: "center",
    alignItems: "center",
  },

  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
  },

  // Image Modal
  imageContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: "center",
    alignItems: "center",
  },

  fullScreenImage: {
    width: screenWidth - 40,
    height: screenHeight - 200,
    resizeMode: "contain",
  },

  imageCounter: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: "600",
  },

  // Video Modal - Fullscreen WebView
  fullscreenVideoContainer: {
    flex: 1,
    backgroundColor: "#000000",
    position: "relative",
  },

  fullscreenVideo: {
    flex: 1,
    backgroundColor: "#000000",
  },

  // PDF Modal
  pdfContainer: {
    width: screenWidth - 40,
    height: screenHeight - 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },

  // Multiple media container styles
  multipleMediaContainer: {
    marginVertical: 8,
  },

  mediaItemWrapper: {
    marginRight: 8,
    width: 200, // Fixed width for consistent display
  },

  pdfSize: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
  },

  pdfViewerContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  pdfWebView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  pdfLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },

  pdfLoadingText: {
    fontSize: 16,
    color: "#8E8E93",
    marginTop: 12,
  },

  // Loading container styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: 20,
  },

  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#9b0737",
    marginTop: 16,
    textAlign: "center",
  },

  loadingSubText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },

  // Error container styles
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: 20,
  },

  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },

  errorSubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },

  retryButton: {
    backgroundColor: "#9b0737",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },

  retryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  // Video Controls
  videoControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },

  controlButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 25,
    padding: 10,
    marginHorizontal: 10,
  },

  // Video close button styles
  videoCloseButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 9999,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 20,
  },

  videoCloseButtonText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default MediaViewer;
