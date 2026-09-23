import React from "react";
import { View, Text, TextInput, TouchableOpacity, Platform, Keyboard, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useVoiceRecorder } from "../../../hooks/useVoiceRecorder";

interface ChatInputBarProps {
  onSendMessage: (text: string) => void | Promise<void>;
  onSendAttachment: (type: "image" | "file" | "video", file: any, extraMetadata?: Record<string, any>) => void;
  initialValue?: string;
  isDisabled?: boolean;
  isAdminsOnly?: boolean;
  isAdmin?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  onTyping?: () => void;
}

const formatRecordingTime = (millis: number): string => {
  const totalSeconds = Math.max(0, Math.floor(millis / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

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
  const [recordedNote, setRecordedNote] = React.useState<{ uri: string; durationMillis: number } | null>(null);
  const [selection, setSelection] = React.useState({ start: 0, end: 0 });
  const voiceRecorder = useVoiceRecorder();

  const hasTextSelection = selection.end > selection.start;

  // Bold uses WhatsApp's own *text* markdown convention (parsed back out
  // for rendering in MessageBubble.tsx) — RN's TextInput can't render mixed
  // bold/plain text while editing, only plain strings, so this is the only
  // way to represent it here. Toggles: re-tapping already-bolded selected
  // text un-bolds it instead of double-wrapping.
  const handleToggleBold = () => {
    const { start, end } = selection;
    if (end <= start) return;

    const before = message.slice(0, start);
    const selected = message.slice(start, end);
    const after = message.slice(end);

    const alreadyBold = selected.length > 2 && selected.startsWith("*") && selected.endsWith("*");
    const replacement = alreadyBold ? selected.slice(1, -1) : `*${selected}*`;
    const newText = before + replacement + after;
    const newCursor = before.length + replacement.length;

    setMessage(newText);
    setSelection({ start: newCursor, end: newCursor });
  };

  const handleMicPress = async () => {
    Keyboard.dismiss();
    await voiceRecorder.start();
  };

  const handleStopRecording = async () => {
    const result = await voiceRecorder.stop();
    if (result) {
      setRecordedNote(result);
    }
  };

  const handleDiscardRecording = async () => {
    await voiceRecorder.discard();
    setRecordedNote(null);
  };

  const handleSendVoiceNote = () => {
    if (!recordedNote) return;
    const file = {
      uri: recordedNote.uri,
      name: `voice-note-${Date.now()}.m4a`,
      type: "audio/m4a",
    };
    onSendAttachment("file", file, { duration_ms: recordedNote.durationMillis, is_voice_note: true });
    setRecordedNote(null);
  };

  // Update input when initialValue changes (e.g., when editing starts)
  React.useEffect(() => {
    setMessage(initialValue);
  }, [initialValue]);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    // Clear optimistically for a snappy feel, but restore the typed text if
    // the send actually fails instead of just losing it — a failed network
    // request shouldn't cost the user what they wrote.
    setMessage("");
    Keyboard.dismiss();

    try {
      await onSendMessage(trimmed);
    } catch {
      setMessage(trimmed);
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
        style={{ paddingBottom: insets.bottom + 12 }}
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
        style={{ paddingBottom: insets.bottom + 12 }}
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

      {/* Input Field — this bar is now inside the full-screen chat popup
          (ChatRoomModal), not stacked above the app's floating bottom nav
          bar, so it only needs to clear the device's own safe area (home
          indicator etc.), not the old 90px nav-bar allowance. */}
      <View
        className="relative bg-white border-t border-gray-100 px-2 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
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

        {voiceRecorder.isRecording ? (
          <View className="flex-row items-center px-2 py-1">
            <View className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2" />
            <Text className="flex-1 text-gray-700 font-semibold">
              Recording... {formatRecordingTime(voiceRecorder.durationMillis)}
            </Text>
            <TouchableOpacity
              className="p-3 rounded-full bg-red-500 ml-1"
              onPress={handleStopRecording}
              activeOpacity={0.7}
            >
              <MaterialIcons name="stop" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ) : recordedNote ? (
          <View className="flex-row items-center px-1 py-1">
            <TouchableOpacity className="p-2" onPress={handleDiscardRecording} activeOpacity={0.7}>
              <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
            <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-2.5 mx-1">
              <MaterialIcons name="mic" size={18} color="#2563eb" />
              <Text className="text-gray-700 font-semibold ml-2">
                Voice note · {formatRecordingTime(recordedNote.durationMillis)}
              </Text>
            </View>
            <TouchableOpacity
              className="p-3 rounded-full ml-1 bg-green-600"
              onPress={handleSendVoiceNote}
              activeOpacity={0.7}
            >
              <MaterialIcons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {hasTextSelection && (
              <View className="flex-row px-2 pb-2">
                <TouchableOpacity
                  className="flex-row items-center bg-gray-900 rounded-full px-3 py-1.5"
                  onPress={handleToggleBold}
                  activeOpacity={0.7}
                >
                  <Text className="text-white font-extrabold text-[13px]">B</Text>
                  <Text className="text-white text-[11px] ml-1.5">Bold</Text>
                </TouchableOpacity>
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

            <View className="flex-1 bg-gray-100 rounded-3xl px-4 py-2.5 mx-1 max-h-[220px]">
              <TextInput
                placeholder={isUploading ? "Uploading file..." : "Type a message..."}
                multiline
                textAlignVertical="top"
                className="text-[15px] text-gray-900 leading-5"
                value={message}
                onChangeText={(text) => {
                  setMessage(text);
                  if (text.length > 0 && onTyping) {
                    onTyping();
                  }
                }}
                onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                placeholderTextColor="#9ca3af"
                editable={!isUploading}
              />
            </View>

            {message.trim() ? (
              <TouchableOpacity
                className={`p-3 rounded-full ml-1 ${!isUploading ? "bg-green-600" : "bg-gray-200"}`}
                onPress={handleSend}
                disabled={isUploading}
                activeOpacity={0.7}
              >
                {isUploading ? (
                  <MaterialIcons name="hourglass-empty" size={20} color="white" />
                ) : (
                  <MaterialIcons name="send" size={20} color="white" />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="p-3 rounded-full ml-1 bg-gray-200"
                onPress={handleMicPress}
                disabled={isUploading}
                activeOpacity={0.7}
              >
                <MaterialIcons name="mic" size={20} color={isUploading ? "#d1d5db" : "#374151"} />
              </TouchableOpacity>
            )}
            </View>
          </>
        )}

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
