import React from "react";
import { View, Text, Image, TouchableOpacity, Linking, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ChatMessage } from "./ChatTypes";
import { format, isSameDay } from "date-fns";
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
  onReactionPress?: (emoji: string) => void;
  currentUserId?: string | number;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isMe, 
  showSenderName, 
  canViewReceipts,
  onShowReceipts,
  onLongPress,
  onDelete,
  onReactionPress,
  currentUserId
}) => {
  const [imageLoading, setImageLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = React.useState(false);
  const timestamp = new Date(message.timestamp);

  // Format timestamp with date context for messages not sent today
  const formatMessageTime = (date: Date): string => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(date, now)) return format(date, 'HH:mm');
    if (isSameDay(date, yesterday)) return `Yesterday, ${format(date, 'HH:mm')}`;
    return format(date, 'd MMM, HH:mm');
  };

  // Splits a string into alternating plain-text and URL segments
  const parseMessageWithLinks = (text: string) => {
    const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+\.[^\s]+)/gi;
    const parts: { text: string; isLink: boolean }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = URL_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), isLink: false });
      }
      parts.push({ text: match[0], isLink: true });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isLink: false });
    }

    return parts;
  };

  const handleLinkPress = (url: string) => {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    Linking.openURL(fullUrl).catch(() =>
      console.warn("Failed to open URL:", fullUrl)
    );
  };

  const renderContent = () => {
    let displayType = message.type;
    
    // Catch legacy video messages saved as "file"
    if (displayType === "file") {
      const isVideoFile = 
        message.metadata?.mime_type?.startsWith('video/') || 
        /\.(mp4|mov|avi|wmv|mkv)$/i.test(message.attachment_url || message.metadata?.original_filename || '');
      
      if (isVideoFile) {
        displayType = "video" as any;
      }
    }

    switch (displayType) {
      case "text": {
        const parts = parseMessageWithLinks(message.content);
        const hasLinks = parts.some((p) => p.isLink);

        if (!hasLinks) {
          // Fast path — no links, plain text as before
          return (
            <Text className={`text-[15px] leading-5 ${isMe ? "text-black" : "text-gray-900"}`}>
              {message.content}
            </Text>
          );
        }

        return (
          <Text className={`text-[15px] leading-5 ${isMe ? "text-black" : "text-gray-900"}`}>
            {parts.map((part, index) =>
              part.isLink ? (
                <Text
                  key={index}
                  style={{
                    color: isMe ? "#1d4ed8" : "#2563eb",
                    textDecorationLine: "underline",
                    textDecorationColor: isMe ? "#1d4ed8" : "#2563eb",
                  }}
                  onPress={() => handleLinkPress(part.text)}
                >
                  {part.text}
                </Text>
              ) : (
                <Text key={index}>{part.text}</Text>
              )
            )}
          </Text>
        );
      }
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
      case "video":
        const videoUrl = resolveMediaUrl(message.attachment_url || message.content);
        return (
          <TouchableOpacity 
            activeOpacity={0.9} 
            className="rounded-lg overflow-hidden bg-gray-900"
            style={{ width: 220, height: 160, justifyContent: 'center', alignItems: 'center' }}
            onLongPress={() => onLongPress?.(message)}
            delayLongPress={200}
            onPress={() => setIsPreviewVisible(true)}
          >
            {/* Dark background acting as thumbnail placeholder */}
            <View className="absolute inset-0 bg-black/20" />
            
            {/* Play Button Overlay */}
            <View className="w-12 h-12 rounded-full bg-black/50 items-center justify-center">
              <MaterialIcons name="play-arrow" size={32} color="white" />
            </View>
            
            {/* Video duration or type indicator could go here */}
            <View className="absolute bottom-2 left-2 bg-black/60 px-1.5 py-0.5 rounded">
              <MaterialIcons name="videocam" size={12} color="white" />
            </View>
          </TouchableOpacity>
        );
      case "file":
        const fileUrl = resolveMediaUrl(message.attachment_url || message.content);
        return (
          <TouchableOpacity
            className={`items-center p-3 rounded-xl ${isMe ? "bg-white/10" : "bg-gray-50"}`}
            style={{ width: 160 }}
            activeOpacity={0.7}
            onPress={() => setIsPreviewVisible(true)}
            onLongPress={() => onLongPress?.(message)}
            delayLongPress={200}
          >
            {/* PDF Icon */}
            <View className={`w-14 h-14 rounded-2xl items-center justify-center mb-2 ${isMe ? "bg-white/20" : "bg-red-50"}`}>
              <MaterialIcons name="picture-as-pdf" size={32} color={isMe ? "white" : "#ef4444"} />
            </View>

            {/* Filename */}
            <Text
              className={`text-xs font-bold text-center ${isMe ? "text-black" : "text-gray-900"}`}
              numberOfLines={2}
            >
              {message.metadata?.original_filename || "File"}
            </Text>

            {/* Size + open icon row */}
            <View className="flex-row items-center mt-1">
              <Text className={`text-[9px] ${isMe ? "text-black/70" : "text-gray-500"}`}>
                {message.metadata?.size ? `${(message.metadata.size / 1024).toFixed(1)} KB · ` : ""}PDF
              </Text>
              <MaterialIcons name="open-in-new" size={10} color={isMe ? "rgba(0,0,0,0.5)" : "#9ca3af"} style={{ marginLeft: 2 }} />
            </View>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <View className={`${message.type === 'file' ? 'mb-2' : 'mb-4'} px-3 flex-row ${isMe ? "justify-end" : "justify-start"}`}>
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => onLongPress?.(message)}
        className={`max-w-[85%] rounded-2xl ${message.type === 'file' ? 'px-2 py-1.5' : 'px-3 py-2'} shadow-sm ${
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

          {/* Message Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <View className={`flex-row flex-wrap mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
              {message.reactions.map((reaction, index) => (
                <TouchableOpacity
                  key={index}
                  className={`flex-row items-center rounded-full px-2 py-0.5 mr-1 mb-1 border ${
                    reaction.user_ids.map(id => String(id)).includes(String(currentUserId)) 
                      ? "border-blue-200 bg-blue-50" 
                      : "border-gray-100 bg-gray-50"
                  }`}
                  onPress={() => {
                    if (reaction.user_ids.map(id => String(id)).includes(String(currentUserId))) {
                      onReactionPress?.(reaction.emoji);
                    }
                  }}
                  activeOpacity={reaction.user_ids.map(id => String(id)).includes(String(currentUserId)) ? 0.7 : 1}
                >
                  <Text className="text-xs">{reaction.emoji}</Text>
                  <Text className={`text-[10px] ml-1 font-bold ${
                    reaction.user_ids.map(id => String(id)).includes(String(currentUserId)) 
                      ? "text-blue-600" 
                      : "text-gray-500"
                  }`}>
                    {reaction.count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View className={`flex-row items-center justify-end mt-1 ${message.type === 'image' && (!message.reactions || message.reactions.length === 0) ? 'absolute bottom-1 right-2 bg-black/30 rounded-full px-2 py-0.5' : ''}`}>
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
              {formatMessageTime(timestamp)}
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

      {isPreviewVisible && (
        <MediaPreviewModal
          visible={isPreviewVisible}
          onClose={() => setIsPreviewVisible(false)}
          mediaUrl={
            message.type === 'image' || message.type === 'video' || (message.type === 'file' && /\.(mp4|mov|avi|wmv|mkv)$/i.test(message.attachment_url || message.metadata?.original_filename || ''))
              ? resolveMediaUrl(message.attachment_url || message.content)
              : resolveMediaUrl(message.attachment_url)
          }
          mediaType={
            message.type === 'video' || (message.type === 'file' && /\.(mp4|mov|avi|wmv|mkv)$/i.test(message.attachment_url || message.metadata?.original_filename || ''))
              ? 'video'
              : message.type as 'image' | 'file'
          }
          filename={message.metadata?.original_filename}
        />
      )}
    </View>
  );
};

export default MessageBubble;
