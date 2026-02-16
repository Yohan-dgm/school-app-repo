import React from "react";
import { View, Text, Image, TouchableOpacity, Linking, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ChatMessage } from "./ChatTypes";
import { format } from "date-fns";
import { Swipeable } from "react-native-gesture-handler";
import { resolveMediaUrl } from "../../../utils/mediaUtils";
import MediaPreviewModal from "../../common/MediaPreviewModal";

interface MessageBubbleProps {
  message: ChatMessage;
  isMe: boolean;
  showSenderName?: boolean;
  canViewReceipts?: boolean;
  onShowReceipts?: (message: ChatMessage) => void;
  onLongPress?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isMe, 
  showSenderName, 
  canViewReceipts,
  onShowReceipts,
  onLongPress,
  onDelete 
}) => {
  const [imageLoading, setImageLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = React.useState(false);
  const timestamp = new Date(message.timestamp);

  const renderContent = () => {
    switch (message.type) {
      case "text":
        return (
          <Text className={`text-[15px] leading-5 ${isMe ? "text-black" : "text-gray-900"}`}>
            {message.content}
          </Text>
        );
      case "image":
        const imageUrl = resolveMediaUrl(message.attachment_url || message.content);
        return (
          <TouchableOpacity 
            activeOpacity={0.9} 
            className="rounded-lg overflow-hidden bg-gray-200"
            style={{ width: 220, height: 160, justifyContent: 'center', alignItems: 'center' }}
            onLongPress={() => onLongPress?.(message)}
            delayLongPress={200}
            onPress={() => setIsPreviewVisible(true)}
          >
            {imageLoading && (
              <ActivityIndicator size="small" color="#9ca3af" style={{ position: 'absolute', zIndex: 1 }} />
            )}
            
            {imageError ? (
              <View className="items-center justify-center">
                <MaterialIcons name="image-not-supported" size={40} color="#9ca3af" />
                <Text className="text-[10px] text-gray-400 mt-1">Failed to load image</Text>
              </View>
            ) : (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: 220, height: 160 }}
                resizeMode="cover"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                  console.error("Failed to load image at:", imageUrl);
                }}
              />
            )}
          </TouchableOpacity>
        );
      case "file":
        const fileUrl = resolveMediaUrl(message.attachment_url || message.content);
        return (
          <TouchableOpacity
            className={`flex-row items-center p-3 rounded-xl ${isMe ? "bg-white/20" : "bg-gray-100"}`}
            activeOpacity={0.7}
            onPress={() => setIsPreviewVisible(true)}
            onLongPress={() => onLongPress?.(message)}
            delayLongPress={200}
          >
            <View className={`w-10 h-10 rounded-lg items-center justify-center ${isMe ? "bg-white/20" : "bg-red-50"}`}>
              <MaterialIcons name="picture-as-pdf" size={24} color={isMe ? "white" : "#ef4444"} />
            </View>
            <View className="ml-3 flex-1">
              <Text className={`text-sm font-bold ${isMe ? "text-black" : "text-gray-900"}`} numberOfLines={1}>
                {message.metadata?.original_filename || "File"}
              </Text>
              <Text className={`text-[10px] ${isMe ? "text-black/70" : "text-gray-500"}`}>
                {message.metadata?.size ? `${(message.metadata.size / 1024).toFixed(1)} KB` : ""} • FILE
              </Text>
            </View>
            <MaterialIcons name="file-download" size={18} color={isMe ? "black" : "#6b7280"} />
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <View className={`mb-4 px-3 flex-row ${isMe ? "justify-end" : "justify-start"}`}>
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => onLongPress?.(message)}
        className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${
          isMe 
            ? "bg-[#E3F2FD] rounded-tr-none border border-[#BBDEFB]" // Light Blue for own messages
            : "bg-white rounded-tl-none border border-gray-100"
        }`}
      >
        <View className="flex-row items-center justify-between mb-1">
          {showSenderName && !isMe && (
            <Text className="text-[11px] font-bold text-blue-600 mr-2">
              {message.sender_name}
            </Text>
          )}
          
          {message.sender_role === 'admin' && (
            <View className="bg-blue-100 border border-blue-200 rounded px-1.5 py-0.5">
              <Text className="text-[8px] font-bold text-blue-600 uppercase">Admin</Text>
            </View>
          )}
        </View>
        
        <View className="relative">
          {renderContent()}
          
          <View className={`flex-row items-center justify-end mt-1 ${message.type === 'image' ? 'absolute bottom-1 right-2 bg-black/30 rounded-full px-2 py-0.5' : ''}`}>
            {canViewReceipts && message.read_count !== undefined && message.read_count > 0 && (
              <TouchableOpacity 
                className="flex-row items-center mr-2 bg-gray-100 rounded-full px-1.5 py-0.5"
                onPress={() => onShowReceipts?.(message)}
                activeOpacity={0.6}
              >
                <MaterialIcons name="visibility" size={10} color={isMe ? "#4b5563" : "#9ca3af"} />
                <Text className={`text-[10px] font-bold ml-0.5 ${isMe ? "text-gray-600" : "text-gray-400"}`}>
                  {message.read_count}
                </Text>
              </TouchableOpacity>
            )}
            <Text className={`text-[10px] ${isMe ? "text-gray-600" : "text-gray-400"}`}>
              {format(timestamp, "HH:mm")}
            </Text>
            {isMe && (
              <MaterialIcons 
                name="done-all" 
                size={12} 
                color={message.is_read ? "#34B7F1" : "#8696a0"} 
                className="ml-1"
              />
            )}
          </View>
        </View>
      </TouchableOpacity>

      <MediaPreviewModal
        visible={isPreviewVisible}
        onClose={() => setIsPreviewVisible(false)}
        mediaUrl={
          message.type === 'image' 
            ? resolveMediaUrl(message.attachment_url || message.content)
            : resolveMediaUrl(message.attachment_url)
        }
        mediaType={message.type as 'image' | 'file'}
        filename={message.metadata?.original_filename}
      />
    </View>
  );
};

export default MessageBubble;
