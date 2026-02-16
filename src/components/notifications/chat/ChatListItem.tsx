import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ChatGroup } from "./ChatTypes";
import { format } from "date-fns";

interface ChatListItemProps {
  chat: ChatGroup;
  onPress: (chat: ChatGroup) => void;
  onPin?: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ chat, onPress, onPin }) => {
  const lastMessage = chat.last_message;
  const timestamp = lastMessage ? new Date(lastMessage.timestamp) : null;
  const chatIdStr = chat.id.toString();

  return (
    <TouchableOpacity
      className={`flex-row px-4 py-2.5 border-b border-gray-50 items-center active:bg-gray-50 ${chat.is_pinned ? "bg-blue-50/30" : "bg-white"}`}
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
          <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
            <Text className="text-blue-600 font-bold text-sm">
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
                {format(timestamp, "HH:mm")}
              </Text>
            )}
          </View>
        </View>

        <View className="flex-row justify-between items-center">
          <View className="flex-1 mr-2">
            {lastMessage && (
              <Text className="text-gray-500 text-[13px]" numberOfLines={1}>
                {lastMessage.type === "text" ? lastMessage.content : `[${lastMessage.type.charAt(0).toUpperCase() + lastMessage.type.slice(1)}]`}
              </Text>
            )}
          </View>
          
          {chat.unread_count > 0 && (
            <View className="bg-blue-600 rounded-full min-w-[18px] h-4.5 items-center justify-center px-1">
              <Text className="text-white text-[9px] font-bold">
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
