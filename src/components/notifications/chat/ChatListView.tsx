import React from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, RefreshControl, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ChatGroup } from "./ChatTypes";
import ChatListItem from "./ChatListItem";
import { useToggleChatGroupPinMutation } from "../../../api/chat-api";

interface ChatListViewProps {
  onChatPress: (chat: ChatGroup) => void;
  onCreateGroup: () => void;
  onCreateAnnouncement: () => void;
  chats: ChatGroup[];
  refreshing?: boolean;
  onRefresh?: () => void;
  activeFilter?: "all" | "unread" | "read" | "chats" | "notifications";
  onFilterChange?: (filter: "all" | "unread" | "read" | "chats" | "notifications") => void;
}

const ChatListView: React.FC<ChatListViewProps> = ({ 
  onChatPress: onChatPressProp, 
  onCreateGroup, 
  onCreateAnnouncement,
  chats = [],
  refreshing = false,
  onRefresh,
  activeFilter: externalFilter,
  onFilterChange: setExternalFilter
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [internalFilter, setInternalFilter] = React.useState<"all" | "unread" | "read" | "chats" | "notifications">("all");
  
  const activeFilter = externalFilter !== undefined ? externalFilter : internalFilter;
  const setActiveFilter = setExternalFilter || setInternalFilter;
  const [togglePin] = useToggleChatGroupPinMutation();

  const handlePin = async (chatId: string | number) => {
    try {
      await togglePin({ chat_group_id: chatId }).unwrap();
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const filteredChats = chats
    .filter((chat) => {
      const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // First apply the type filter if "chats" is selected
      if (activeFilter === "chats") {
        if (chat.type === "system") return false;
      }

      if (activeFilter === "read") return matchesSearch && chat.unread_count === 0;
      if (activeFilter === "unread") return matchesSearch && chat.unread_count > 0;
      return matchesSearch;
    })
    .sort((a, b) => {
      // Sort by pinned status first (pinned might be in metadata or added locally)
      const aPinned = a.is_pinned || false;
      const bPinned = b.is_pinned || false;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      // Then by timestamp (use last message timestamp OR created_at)
      const aTime = a.last_message ? new Date(a.last_message.timestamp).getTime() : new Date(a.created_at || 0).getTime();
      const bTime = b.last_message ? new Date(b.last_message.timestamp).getTime() : new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });

  const FilterChip = ({ label, value }: { label: string, value: typeof activeFilter }) => (
    <TouchableOpacity 
      onPress={() => setActiveFilter(value)}
      className={`px-4 py-1.5 rounded-full mr-2 ${activeFilter === value ? "bg-blue-600" : "bg-gray-100"}`}
    >
      <Text className={`text-[13px] font-semibold ${activeFilter === value ? "text-white" : "text-gray-500"}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 pt-0 pb-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-gray-900">Chats</Text>
          <View className="flex-row items-center space-x-1">
            <TouchableOpacity 
              className="p-2 mr-1 bg-gray-50 rounded-full" 
              onPress={onCreateAnnouncement}
              activeOpacity={0.7}
            >
              <MaterialIcons name="campaign" size={22} color="#7c2d3e" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="p-2 bg-gray-50 rounded-full" 
              onPress={onCreateGroup}
              activeOpacity={0.7}
            >
              <MaterialIcons name="group-add" size={22} color="#2563eb" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-1 mb-4">
          <MaterialIcons name="search" size={20} color="#9ca3af" />
          <TextInput
            placeholder="Search chats..."
            className="flex-1 ml-2 text-sm text-gray-900 h-11"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Filter Chips */}
        <View className="mb-1">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            <FilterChip label="All" value="all" />
            <FilterChip label="Chats" value="chats" />
            <FilterChip label="Notifications" value="notifications" />
            <FilterChip label="Unread" value="unread" />
            <FilterChip label="Read" value="read" />
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ChatListItem 
            chat={item} 
            onPress={onChatPressProp} 
            onPin={() => handlePin(item.id)} 
          />
        )}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#2563eb"]} // Blue color to match theme
            tintColor="#2563eb"
          />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-20 px-10">
            <MaterialIcons name="chat-bubble-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-500 text-lg font-bold mt-4">No chats found</Text>
            <Text className="text-gray-400 text-center mt-2">
              Try searching for a different name or start a new conversation.
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default ChatListView;
