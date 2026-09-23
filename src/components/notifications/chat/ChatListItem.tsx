import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ChatGroup, ChatMessage } from "./ChatTypes";
import { format, isSameDay, subDays, isAfter } from "date-fns";
import { getAvatarColor } from "./chatAvatarColors";

interface ChatListItemProps {
  chat: ChatGroup;
  onPress: (chat: ChatGroup) => void;
  onPin?: () => void;
}

// Today -> time, yesterday -> "Yesterday", this week -> day name, else -> short date.
const formatListTimestamp = (date: Date): string => {
  const now = new Date();
  if (isSameDay(date, now)) return format(date, "HH:mm");
  if (isSameDay(date, subDays(now, 1))) return "Yesterday";
  if (isAfter(date, subDays(now, 6))) return format(date, "EEE");
  return format(date, "d/M/yy");
};

// Non-text last-message preview, icon + label (mirrors the video/audio
// reclassification already used in MessageBubble.tsx — video/audio aren't
// distinct DB types, they're "file" + a mime_type/extension check).
const getMediaPreview = (message: ChatMessage): { icon: string; label: string } | null => {
  if (message.type === "image") return { icon: "photo-camera", label: "Photo" };
  if (message.type === "file") {
    const mimeType = message.metadata?.mime_type || "";
    const filename = message.metadata?.original_filename || message.attachment_url || "";
    if (mimeType.startsWith("video/") || /\.(mp4|mov|avi|wmv|mkv)$/i.test(filename)) {
      return { icon: "videocam", label: "Video" };
    }
    if (mimeType.startsWith("audio/") || /\.(m4a|mp3|aac|wav|ogg)$/i.test(filename)) {
      return { icon: "mic", label: "Voice message" };
    }
    return { icon: "insert-drive-file", label: "Document" };
  }
  return null;
};

const ChatListItem: React.FC<ChatListItemProps> = ({ chat, onPress, onPin }) => {
  const lastMessage = chat.last_message;
  const timestamp = lastMessage ? new Date(lastMessage.timestamp) : null;
  const chatIdStr = chat.id.toString();
  const mediaPreview = lastMessage ? getMediaPreview(lastMessage) : null;
  const avatarColor = getAvatarColor(chat.name);

  return (
    <TouchableOpacity
      className="flex-row px-4 py-2.5 border-b border-gray-50 items-center active:bg-gray-50 bg-white"
      onPress={() => onPress(chat)}
      onLongPress={() => onPin?.()}
      delayLongPress={500}
      activeOpacity={0.6}
    >
      {/* Avatar */}
      <View className="relative">
        {chat.type === "system" ? (
          <View
            className={`w-12 h-12 rounded-full items-center justify-center ${
              chatIdStr.startsWith('notification-') ? "bg-blue-50" : "bg-amber-50"
            }`}
          >
            <MaterialIcons
              name={chatIdStr.startsWith('notification-') ? "alarm" : "notifications"}
              size={26}
              color={chatIdStr.startsWith('notification-') ? "#3b82f6" : "#f59e0b"}
            />
          </View>
        ) : (
          <View
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: avatarColor.bg }}
          >
            <Text className="font-bold text-sm" style={{ color: avatarColor.text }}>
              {chat.name.trim().split(' ').length >= 2
                ? (chat.name.trim().split(' ')[0][0] + chat.name.trim().split(' ')[1][0]).toUpperCase()
                : (chat.name[0] || '?').toUpperCase()
              }
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View className="flex-1 ml-3 justify-center">
        <View className="flex-row justify-between items-center mb-0.5">
          <Text className="text-gray-900 font-semibold text-[15px] flex-1 mr-2" numberOfLines={1}>
            {chat.name}
          </Text>
          <View className="flex-row items-center">
            {chat.is_pinned && (
              <MaterialIcons name="push-pin" size={12} color="#6b7280" style={{ marginRight: 4, transform: [{ rotate: '45deg' }] }} />
            )}
            {timestamp && (
              <Text className={`text-[11px] ${chat.unread_count > 0 ? "text-blue-600 font-bold" : "text-gray-400"}`}>
                {formatListTimestamp(timestamp)}
              </Text>
            )}
          </View>
        </View>

        <View className="flex-row justify-between items-center">
          <View className="flex-1 mr-2 flex-row items-center">
            {lastMessage && (
              mediaPreview ? (
                <>
                  <MaterialIcons name={mediaPreview.icon as any} size={13} color="#9ca3af" style={{ marginRight: 4 }} />
                  <Text className="text-gray-500 text-[13px]" numberOfLines={1}>
                    {mediaPreview.label}
                  </Text>
                </>
              ) : (
                <Text className="text-gray-500 text-[13px]" numberOfLines={1}>
                  {lastMessage.content}
                </Text>
              )
            )}
          </View>

          {chat.unread_count > 0 && (
            <View className="bg-blue-600 rounded-full min-w-[20px] h-5 items-center justify-center px-1.5">
              <Text className="text-white text-[11px] font-bold">
                {chat.unread_count > 99 ? "99+" : chat.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ChatListItem;
