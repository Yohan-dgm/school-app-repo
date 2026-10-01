import React from "react";
import { View, Text, Modal, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useGetPollVotersQuery } from "../../../api/chat-api";
import { getAvatarColor } from "./chatAvatarColors";

interface PollVotersModalProps {
  visible: boolean;
  chatMessageId: string | number | null;
  onClose: () => void;
}

// Admin-only view of who voted for what — the frontend only shows this
// entry point to admins, but the backend independently re-checks admin
// status on every request regardless (see GetPollVotersAction.php).
const PollVotersModal: React.FC<PollVotersModalProps> = ({ visible, chatMessageId, onClose }) => {
  const { data, isLoading } = useGetPollVotersQuery(
    { chat_message_id: chatMessageId || "" },
    { skip: !chatMessageId || !visible }
  );

  const options = data?.data.options || [];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-[32px] h-[70%] shadow-2xl overflow-hidden">
          <View className="flex-row items-center justify-between p-6 border-b border-gray-100">
            <View>
              <Text className="text-xl font-bold text-gray-900">Poll Votes</Text>
              <Text className="text-gray-500 text-xs mt-0.5">Only visible to group admins</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2">
              <MaterialIcons name="close" size={24} color="#4b5563" />
            </TouchableOpacity>
          </View>

          <View className="flex-1">
            {isLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(item) => String(item.option_id)}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                  <View className="mb-6">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="font-bold text-gray-900 flex-1 mr-2">{item.option_text}</Text>
                      <Text className="text-gray-400 text-xs font-bold">
                        {item.voters.length} {item.voters.length === 1 ? "vote" : "votes"}
                      </Text>
                    </View>

                    {item.voters.length === 0 ? (
                      <Text className="text-gray-400 text-sm">No votes yet</Text>
                    ) : (
                      item.voters.map((voter) => {
                        const color = getAvatarColor(voter.name);
                        return (
                          <View key={String(voter.user_id)} className="flex-row items-center mb-2.5">
                            <View
                              className="w-9 h-9 rounded-full items-center justify-center mr-3"
                              style={{ backgroundColor: color.bg }}
                            >
                              <Text className="font-bold text-xs" style={{ color: color.text }}>
                                {voter.name.trim().split(" ").length >= 2
                                  ? (voter.name.trim().split(" ")[0][0] + voter.name.trim().split(" ")[1][0]).toUpperCase()
                                  : (voter.name[0] || "?").toUpperCase()}
                              </Text>
                            </View>
                            <Text className="text-gray-800 text-sm">{voter.name}</Text>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
                ListEmptyComponent={
                  <View className="items-center py-10">
                    <Text className="text-gray-400">No options to show</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PollVotersModal;
