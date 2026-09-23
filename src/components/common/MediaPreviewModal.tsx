import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
  Animated as RNAnimated,
} from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useSelector } from 'react-redux';
import { RootState } from '../../state-store/store';
import * as ChatMediaCacheService from '../../services/media/ChatMediaCacheService';

interface MediaPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  mediaUrl: string | null;
  mediaType: 'image' | 'file' | 'video';
  filename?: string;
}

type DownloadStatus = 'idle' | 'downloading' | 'success' | 'error';

const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  visible,
  onClose,
  mediaUrl,
  mediaType,
  filename,
}) => {
  const insets = useSafeAreaInsets();
  const token = useSelector((state: RootState) => state.app.token);

  // ── PDF rendering states ────────────────────────────────────────
  const [pdfBase64Data, setPdfBase64Data] = React.useState<string | null>(null);
  const [isPreparingPdf, setIsPreparingPdf] = React.useState(false);

  // ── Download state ──────────────────────────────────────────────
  const [downloadStatus, setDownloadStatus] = React.useState<DownloadStatus>('idle');
  const [downloadProgress, setDownloadProgress] = React.useState<number>(0);
  const bannerOpacity = useRef(new RNAnimated.Value(0)).current;

  const showBanner = () => {
    RNAnimated.sequence([
      RNAnimated.timing(bannerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      RNAnimated.delay(2000),
      RNAnimated.timing(bannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setDownloadStatus('idle'));
  };

  // ── Zoom / Pan shared values ────────────────────────────────────
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Hint opacity
  const hintOpacity = useSharedValue(1);
  useEffect(() => {
    if (visible) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      hintOpacity.value = 1;
      // Fade hint after 2.5 s
      const timer = setTimeout(() => {
        hintOpacity.value = withTiming(0, { duration: 600 });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // ── Gestures ────────────────────────────────────────────────────
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.05) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.2) {
        // Reset
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // Zoom in to 2.5×
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
      }
    });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, Gesture.Simultaneous(doubleTapGesture, panGesture));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  // ── Video Player ────────────────────────────────────────────────
  const isVideo = mediaType === 'video' || /\.(mp4|mov|avi|wmv|mkv)$/i.test(mediaUrl || '');

  // Play from the on-device cache once available so repeat opens don't
  // re-stream the same video from the server. Starts on the remote url so
  // first-ever playback isn't blocked on the cache check.
  const [effectiveVideoUri, setEffectiveVideoUri] = React.useState<string | null>(mediaUrl);

  useEffect(() => {
    setEffectiveVideoUri(mediaUrl);
    if (!isVideo || !mediaUrl) return;

    let cancelled = false;
    ChatMediaCacheService.getLocalUri(mediaUrl).then((cached) => {
      if (cancelled) return;
      if (cached) {
        setEffectiveVideoUri(cached);
        return;
      }
      ChatMediaCacheService.ensureCached(mediaUrl, token)
        .then((path) => {
          if (!cancelled && path) setEffectiveVideoUri(path);
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, [isVideo, mediaUrl, token]);

  const player = useVideoPlayer(effectiveVideoUri || '', (player) => {
    if (isVideo) {
      player.loop = true;
      // Do NOT auto-play on mount — only play when modal is explicitly opened
    }
  });

  // Play only when the modal is actually visible; pause when it closes
  useEffect(() => {
    if (!isVideo) return;
    if (visible) {
      player.play();
    } else {
      player.pause();
    }
  }, [visible, isVideo]);

  const convertPdfToBase64 = async (pdfUrl: string) => {
    try {
      // Prefer the on-device cache — avoids re-fetching + re-converting a
      // PDF that's already been viewed once.
      const cachedUri = await ChatMediaCacheService.ensureCached(pdfUrl, token).catch(() => null);
      if (cachedUri) {
        return await FileSystem.readAsStringAsync(cachedUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const response = await fetch(pdfUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
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

  const createBase64PdfHtml = (base64Data: string) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes" />
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              background-color: #f5f5f5; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
            }
            canvas { 
              max-width: 100%; 
              margin-bottom: 10px; 
              box-shadow: 0 2px 5px rgba(0,0,0,0.2); 
            }
            #pdf-container { 
              width: 100%; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              padding-top: 10px; 
              padding-bottom: 20px;
            }
            .loading {
              font-family: Arial, sans-serif;
              color: #666;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          <div id="pdf-container">
            <div class="loading">Rendering Document...</div>
          </div>
          <script>
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            try {
              var pdfData = atob('${base64Data}');
              var uint8Array = new Uint8Array(pdfData.length);
              for (var i = 0; i < pdfData.length; i++) {
                uint8Array[i] = pdfData.charCodeAt(i);
              }
              var loadingTask = pdfjsLib.getDocument({data: uint8Array});
              loadingTask.promise.then(function(pdf) {
                var container = document.getElementById('pdf-container');
                container.innerHTML = '';
                for (var pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                  pdf.getPage(pageNum).then(function(page) {
                    var scale = 1.5;
                    var viewport = page.getViewport({scale: scale});
                    var canvas = document.createElement('canvas');
                    var context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    container.appendChild(canvas);
                    var renderContext = {
                      canvasContext: context,
                      viewport: viewport
                    };
                    page.render(renderContext);
                  });
                }
              }).catch(function(reason) {
                document.getElementById('pdf-container').innerHTML = '<div class="loading">Error loading PDF: ' + reason.message + '</div>';
              });
            } catch (e) {
              document.getElementById('pdf-container').innerHTML = '<div class="loading">Error initializing PDF: ' + e.message + '</div>';
            }
          </script>
        </body>
      </html>
    `;
  };

  useEffect(() => {
    if (visible && mediaUrl && mediaUrl.toLowerCase().includes('.pdf')) {
      setIsPreparingPdf(true);
      setPdfBase64Data(null);
      convertPdfToBase64(mediaUrl)
        .then(data => {
          setPdfBase64Data(data);
          setIsPreparingPdf(false);
        })
        .catch(() => {
          setIsPreparingPdf(false);
        });
    }
  }, [visible, mediaUrl]);

  // ── Download helpers ────────────────────────────────────────────
  const handleMediaDownload = async () => {
    if (!mediaUrl) return;
    setDownloadStatus('downloading');
    setDownloadProgress(0);
    try {
      const ext = mediaUrl.split('.').pop()?.split('?')[0] || (isVideo ? 'mp4' : 'jpg');
      const localUri = `${FileSystem.cacheDirectory}download_${Date.now()}.${ext}`;
      
      const downloadResumable = FileSystem.createDownloadResumable(
        mediaUrl,
        localUri,
        {},
        (progressInfo) => {
          const progress = progressInfo.totalBytesWritten / progressInfo.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) throw new Error('Download failed');

      if (Platform.OS === 'ios') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          setDownloadStatus('error');
          showBanner();
          return;
        }
      }
      
      const asset = await MediaLibrary.createAssetAsync(result.uri);
      if (!asset) throw new Error('Failed to create gallery asset');
      
      setDownloadStatus('success');
      showBanner();
    } catch (err) {
      console.error('Media download failed:', err);
      setDownloadStatus('error');
      showBanner();
    }
  };

  const handlePdfDownload = async () => {
    if (!mediaUrl) return;
    setDownloadStatus('downloading');
    setDownloadProgress(0);
    try {
      const safeName = (filename || `document_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const filenameWithExt = safeName.endsWith('.pdf') ? safeName : safeName + '.pdf';
      const localUri = `${FileSystem.documentDirectory}${filenameWithExt}`;
      
      const headers: Record<string, string> | undefined = token ? { Authorization: `Bearer ${token}` } : undefined;
      
      const downloadResumable = FileSystem.createDownloadResumable(
        mediaUrl,
        localUri,
        { headers },
        (progressInfo) => {
          const progress = progressInfo.totalBytesWritten / progressInfo.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) throw new Error('Download failed');

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save or share PDF',
          UTI: 'com.adobe.pdf'
        });
        setDownloadStatus('success');
      } else {
        throw new Error('Sharing is not available');
      }
      showBanner();
    } catch (err) {
      console.error('PDF download failed:', err);
      setDownloadStatus('error');
      showBanner();
    }
  };

  if (!mediaUrl) return null;

  const isImage = mediaType === 'image' || /\.(jpeg|jpg|gif|png|webp|avif)$/i.test(mediaUrl);
  const isPdf = mediaUrl.toLowerCase().includes('.pdf');

  const canDownload = isImage || isVideo || isPdf;
  const handleDownload = (isImage || isVideo) ? handleMediaDownload : handlePdfDownload;

  // ── Render ──────────────────────────────────────────────────────
  const renderDownloadIcon = () => {
    if (downloadStatus === 'downloading') {
      return (
        <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size={12} color="white" />
          <Text style={{ position: 'absolute', color: 'white', fontSize: 8, fontWeight: 'bold' }}>
            {Math.round(downloadProgress * 100)}
          </Text>
        </View>
      );
    }
    if (downloadStatus === 'success') {
      return <MaterialIcons name="check-circle" size={22} color="#4ade80" />;
    }
    if (downloadStatus === 'error') {
      return <MaterialIcons name="error" size={22} color="#f87171" />;
    }
    return <MaterialIcons name="download" size={22} color="white" />;
  };

  const bannerText = downloadStatus === 'success'
    ? ((isImage || isVideo) ? '✓ Saved to gallery' : '✓ File opened')
    : '✗ Download failed';
  const bannerColor = downloadStatus === 'success' ? '#166534' : '#7f1d1d';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 bg-black/95">
          {/* Header */}
          <View
            className="flex-row items-center justify-between px-4 pb-3 border-b border-white/10"
            style={{ paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 48 : 50) }}
          >
            <View className="flex-1 mr-4">
              <Text className="text-white font-semibold text-lg" numberOfLines={1}>
                {filename || (isVideo ? 'Video Preview' : isImage ? 'Image Preview' : 'File Preview')}
              </Text>
            </View>

            <View className="flex-row items-center space-x-2">
              {/* Download button */}
              {canDownload && (
                <TouchableOpacity
                  onPress={handleDownload}
                  disabled={downloadStatus === 'downloading'}
                  className="w-10 h-10 mr-2 bg-white/10 rounded-full items-center justify-center"
                  activeOpacity={0.7}
                >
                  {renderDownloadIcon()}
                </TouchableOpacity>
              )}

              {/* Close button */}
              <TouchableOpacity
                onPress={onClose}
                className="w-10 h-10 bg-white/10 rounded-full items-center justify-center"
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Download Progress Bar Overlay */}
          {downloadStatus === 'downloading' && (
            <View style={{ width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <View style={{ height: '100%', width: `${downloadProgress * 100}%`, backgroundColor: '#4ade80' }} />
            </View>
          )}

          {/* Download status banner */}
          {(downloadStatus === 'success' || downloadStatus === 'error') && (
            <RNAnimated.View
              style={[
                styles.banner,
                { backgroundColor: bannerColor, opacity: bannerOpacity },
              ]}
            >
              <Text style={styles.bannerText}>{bannerText}</Text>
            </RNAnimated.View>
          )}

          {/* Content */}
          <View className="flex-1">
            {isImage ? (
              <View style={{ flex: 1, overflow: 'hidden' }}>
                <GestureDetector gesture={composed}>
                  <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                    <Image
                      source={{ uri: mediaUrl }}
                      style={styles.image}
                      contentFit="contain"
                      transition={200}
                    />
                  </Animated.View>
                </GestureDetector>

                {/* Pinch-to-zoom hint */}
                <Animated.View style={[styles.hint, hintStyle]} pointerEvents="none">
                  <MaterialIcons name="zoom-in" size={14} color="white" />
                  <Text style={styles.hintText}>Pinch to zoom · Double-tap</Text>
                </Animated.View>
              </View>
            ) : isVideo ? (
              <View style={{ flex: 1, backgroundColor: 'black' }}>
                <VideoView 
                  player={player} 
                  style={styles.image} 
                  allowsFullscreen 
                  allowsPictureInPicture 
                />
              </View>
            ) : isPdf ? (
              isPreparingPdf ? (
                <View className="flex-1 items-center justify-center bg-black/95">
                  <ActivityIndicator color="white" size="large" />
                  <Text className="text-white mt-4">Preparing PDF...</Text>
                </View>
              ) : pdfBase64Data ? (
                <WebView
                  source={{ html: createBase64PdfHtml(pdfBase64Data) }}
                  style={{ flex: 1, backgroundColor: 'white' }}
                  startInLoadingState={true}
                  scalesPageToFit={true}
                  originWhitelist={['*']}
                />
              ) : (
                <View className="flex-1 items-center justify-center p-6">
                  <MaterialIcons name="error" size={48} color="white" />
                  <Text className="text-white text-lg mt-2">Failed to load PDF</Text>
                </View>
              )
            ) : (
              <View className="flex-1 items-center justify-center p-6">
                <View className="w-24 h-24 bg-white/10 rounded-3xl items-center justify-center mb-6">
                  <MaterialIcons name="insert-drive-file" size={48} color="white" />
                </View>
                <Text className="text-white text-xl font-bold mb-2">Unsupported Preview</Text>
                <Text className="text-gray-400 text-center text-base">
                  This file type cannot be previewed inside the app.
                </Text>
              </View>
            )}
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  image: {
    flex: 1,
    width: '100%',
  },
  hint: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  hintText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
});

export default MediaPreviewModal;
