import React from "react";
import { View, Text, Modal, TouchableOpacity, FlatList, Image, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useGetMessageReadReceiptsQuery } from "../../../api/chat-api";
import { format } from "date-fns";
import { ChatMessage } from "./ChatTypes";

interface MessageReceiptsModalProps {
  visible: boolean;
  onClose: () => void;
  message: ChatMessage | null;
}

const MessageReceiptsModal: React.FC<MessageReceiptsModalProps> = ({ visible, onClose, message }) => {
  const { data: receiptsData, isLoading, refetch } = useGetMessageReadReceiptsQuery(
    { message_id: message?.id || "" },
    { skip: !message?.id || !visible }
  );

  const receipts = receiptsData?.data.read_by || [];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-[32px] h-[70%] shadow-2xl overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between p-6 border-b border-gray-100">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={onClose} className="mr-4">
                <MaterialIcons name="close" size={24} color="#4b5563" />
              </TouchableOpacity>
              <View>
                <Text className="text-xl font-bold text-gray-900 border-l px-3 border-blue-500">Message Info</Text>
                <Text className="text-gray-500 text-xs px-3">Seen by participants</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => refetch()} className="p-2 bg-blue-50 rounded-full">
              <MaterialIcons name="refresh" size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="flex-1">
            {isLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="text-gray-500 mt-4 font-medium">Loading status...</Text>
              </View>
            ) : receipts.length === 0 ? (
              <View className="flex-1 items-center justify-center p-8">
                <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
                  <MaterialIcons name="done-all" size={40} color="#d1d5db" />
                </View>
                <Text className="text-lg font-bold text-gray-900">No views yet</Text>
                <Text className="text-center text-gray-500 mt-2">
                  No one has read this message yet besides the sender.
                </Text>
              </View>
            ) : (
              <FlatList
                data={receipts}
                keyExtractor={(item) => item.user_id.toString()}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                  <View className="flex-row items-center mb-6 last:mb-0">
                    <View className="relative">
                      <View className="w-12 h-12 rounded-full bg-blue-500 items-center justify-center">
                        <Text className="text-white font-bold text-lg">
                          {item.user_name.trim().split(' ').length >= 2 
                            ? (item.user_name.trim().split(' ')[0][0] + item.user_name.trim().split(' ')[1][0]).toUpperCase()
                            : (item.user_name[0] || '?').toUpperCase()
                          }
                        </Text>
                      </View>
                      <View className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white w-4 h-4 rounded-full" />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-[16px] font-bold text-gray-900">{item.user_name}</Text>
                      <View className="flex-row items-center mt-0.5">
                        <MaterialIcons name="visibility" size={12} color="#9ca3af" />
                        <Text className="text-gray-500 text-xs ml-1">
                          Seen {format(new Date(item.read_at), "MMM d, h:mm a")}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-gray-50 px-3 py-1.5 rounded-full">
                      <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Read</Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>

          {/* Message Preview (Optional) */}
          {message?.type === 'text' && (
            <View className="bg-blue-50 p-4 border-t border-blue-100">
              <Text className="text-blue-500 text-[10px] font-bold uppercase mb-1">Message Preview</Text>
              <Text className="text-gray-700 text-sm" numberOfLines={2}>{message.content}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default MessageReceiptsModal;
