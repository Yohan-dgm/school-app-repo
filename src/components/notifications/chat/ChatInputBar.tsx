import React from "react";
import { View, Text, TextInput, TouchableOpacity, Platform, Keyboard, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as ImageManipulator from "expo-image-manipulator";

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  onSendAttachment: (type: "image" | "file" | "video", file: any) => void;
  initialValue?: string;
  isDisabled?: boolean;
  isAdminsOnly?: boolean;
  isAdmin?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  onTyping?: () => void;
}

const ChatInputBar: React.FC<ChatInputBarProps> = ({ 
  onSendMessage, 
  onSendAttachment,
  initialValue = "",
  isDisabled = false,
  isAdminsOnly = false,
  isAdmin = false,
  isUploading = false,
  uploadProgress = 0,
  onTyping
}) => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = React.useState(initialValue);
  const [showAttachments, setShowAttachments] = React.useState(false);

  // Update input when initialValue changes (e.g., when editing starts)
  React.useEffect(() => {
    setMessage(initialValue);
  }, [initialValue]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
      Keyboard.dismiss();
    }
  };

  const handlePickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow both images and videos
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Handle Video
        if (asset.type === 'video') {
          // Check file size (max 50MB)
          // Note: asset.fileSize is available in newer expo-image-picker versions, 
          // otherwise we fall back to a reasonable assumption and let backend reject if needed
          if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
            Alert.alert("File Too Large", "Please select a video smaller than 50MB.");
            return;
          }

          const file = {
            uri: asset.uri,
            name: (asset.fileName || `video_${Date.now()}.mp4`).replace(/\.[^/.]+$/, "") + ".mp4",
            type: "video/mp4",
            size: asset.fileSize,
          };
          
          onSendAttachment("video", file);
          setShowAttachments(false);
          return;
        }
        
        // Handle Image
        // Performance: Compress image before upload
        console.log("🖼️ Compressing image before upload...");
        const compressed = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1200 } }], // Reasonable limit for mobile view
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        const file = {
          uri: compressed.uri,
          name: (asset.fileName || `image_${Date.now()}.jpg`).replace(/\.[^/.]+$/, "") + ".jpg",
          type: "image/jpeg",
        };
        onSendAttachment("image", file);
        setShowAttachments(false);
      }
    } catch (error) {
      console.error("Error picking media:", error);
      Alert.alert("Error", "Failed to pick media");
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const file = {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
          size: asset.size,
        };
        onSendAttachment("file", file);
        setShowAttachments(false);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const toggleAttachments = () => {
    setShowAttachments(!showAttachments);
    if (!showAttachments) Keyboard.dismiss();
  };

  if (isDisabled) {
    return (
      <View
        className="bg-gray-50 px-6 py-8 border-t border-gray-100 items-center justify-center"
        style={{ paddingBottom: insets.bottom + 90 }}
      >
        <View className="flex-row items-center bg-gray-200/50 px-4 py-2 rounded-full">
          <MaterialIcons name="lock" size={14} color="#6b7280" />
          <Text className="text-gray-500 text-xs font-bold ml-2">Chat disabled completely</Text>
        </View>
      </View>
    );
  }

  if (isAdminsOnly && !isAdmin) {
    return (
      <View
        className="bg-gray-50 px-6 py-8 border-t border-gray-100 items-center justify-center"
        style={{ paddingBottom: insets.bottom + 90 }}
      >
        <View className="flex-row items-center bg-gray-200/50 px-4 py-2 rounded-full">
          <MaterialIcons name="campaign" size={16} color="#3b82f6" />
          <Text className="text-blue-600 text-xs font-bold ml-2">Admins Only</Text>
        </View>
        <Text className="text-gray-400 text-[11px] mt-2 text-center px-4">
          Only administrators can send messages to this group.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Attachment Menu */}
      {showAttachments && (
        <View className="flex-row justify-around bg-gray-50 border-t border-gray-100 p-4">
          <TouchableOpacity 
            className="items-center"
            onPress={handlePickMedia}
          >
            <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center mb-1">
              <MaterialIcons name="image" size={24} color="white" />
            </View>
            <Text className="text-[10px] text-gray-600">Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="items-center"
            onPress={handlePickDocument}
          >
            <View className="w-12 h-12 bg-red-500 rounded-full items-center justify-center mb-1">
              <MaterialIcons name="insert-drive-file" size={24} color="white" />
            </View>
            <Text className="text-[10px] text-gray-600">Document</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Admin Indicator Banner */}
      {isAdminsOnly && isAdmin && (
        <View className="bg-blue-50 py-1.5 px-4 flex-row justify-center items-center border-t border-blue-100">
          <MaterialIcons name="info-outline" size={14} color="#3b82f6" />
          <Text className="text-blue-600 text-[10px] font-bold ml-1.5 uppercase">
            Only Admins Can Message
          </Text>
        </View>
      )}

      {/* Input Field — padding clears the floating bottom nav bar */}
      {/* NAV_BAR_HEIGHT ≈ 90: pill content (62px) + extra gap (28px), above safe area inset */}
      <View
        className="relative bg-white border-t border-gray-100 px-2 pt-3"
        style={{ paddingBottom: insets.bottom + 90 }}
      >
        {/* Upload Progress Bar */}
        {isUploading && (
          <View className="absolute top-0 left-0 right-0 h-1 bg-gray-100 overflow-hidden">
            <View 
              className="h-full bg-green-500" 
              style={{ width: `${uploadProgress * 100}%` }} 
            />
          </View>
        )}

        <View className="flex-row items-center">
          <TouchableOpacity 
            className="p-2" 
            onPress={toggleAttachments}
            activeOpacity={0.7}
            disabled={isUploading}
          >
            <MaterialIcons 
              name={showAttachments ? "close" : "add"} 
              size={28} 
              color={isUploading ? "#d1d5db" : "#6b7280"} 
            />
          </TouchableOpacity>

          <View className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 mx-1 max-h-[100px]">
            <TextInput
              placeholder={isUploading ? "Uploading file..." : "Type a message..."}
              multiline
              className="text-[15px] text-gray-900 leading-5"
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                if (text.length > 0 && onTyping) {
                  onTyping();
                }
              }}
              placeholderTextColor="#9ca3af"
              editable={!isUploading}
            />
          </View>

          <TouchableOpacity
            className={`p-3 rounded-full ml-1 ${(message.trim() && !isUploading) ? "bg-green-600" : "bg-gray-200"}`}
            onPress={handleSend}
            disabled={!message.trim() || isUploading}
            activeOpacity={0.7}
          >
            {isUploading ? (
              <MaterialIcons name="hourglass-empty" size={20} color="white" />
            ) : (
              <MaterialIcons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>

        {isUploading && (
          <View className="items-center mt-2">
            <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Uploading: {Math.round(uploadProgress * 100)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default ChatInputBar;
