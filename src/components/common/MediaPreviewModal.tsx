import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MediaPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  mediaUrl: string | null;
  mediaType: 'image' | 'file';
  filename?: string;
}

const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  visible,
  onClose,
  mediaUrl,
  mediaType,
  filename
}) => {
  if (!mediaUrl) return null;

  const isImage = mediaType === 'image' || mediaUrl.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i);
  const isPdf = mediaUrl.toLowerCase().endsWith('.pdf');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/95">
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-2 border-b border-white/10">
            <View className="flex-1 mr-4">
              <Text className="text-white font-semibold text-lg" numberOfLines={1}>
                {filename || (isImage ? 'Image Preview' : 'File Preview')}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={onClose} 
              className="p-2 bg-white/10 rounded-full"
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="flex-1">
            {isImage ? (
              <Image
                source={{ uri: mediaUrl }}
                style={styles.image}
                contentFit="contain"
                transition={200}
              />
            ) : isPdf ? (
              <WebView
                source={{ 
                  uri: Platform.OS === 'android' 
                    ? `https://docs.google.com/viewer?url=${encodeURIComponent(mediaUrl)}&embedded=true` 
                    : mediaUrl 
                }}
                style={{ flex: 1, backgroundColor: 'white' }}
                startInLoadingState={true}
                scalesPageToFit={true}
                originWhitelist={['*']}
                renderLoading={() => (
                  <View style={StyleSheet.absoluteFill} className="items-center justify-center bg-black/95">
                    <ActivityIndicator color="white" size="large" />
                  </View>
                )}
              />
            ) : (
              <View className="flex-1 items-center justify-center p-6">
                <View className="w-24 h-24 bg-white/10 rounded-3xl items-center justify-center mb-6">
                   <MaterialIcons name="insert-drive-file" size={48} color="white" />
                </View>
                <Text className="text-white text-xl font-bold mb-2">Unsupported Preview</Text>
                <Text className="text-gray-400 text-center text-base">
                  This file type cannot be previewed inside the app.
                </Text>
                <TouchableOpacity 
                  className="mt-8 px-6 py-3 bg-blue-600 rounded-xl"
                  onPress={() => {
                    // Logic for external opening could be here if needed
                  }}
                >
                  <Text className="text-white font-bold">Download File</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  image: {
    flex: 1,
    width: '100%',
  },
});

export default MediaPreviewModal;
