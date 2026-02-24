import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ChatGroup } from "./ChatTypes";
import { useUpdateChatGroupMutation } from "../../../api/chat-api";
import { Alert } from "react-native";

interface EditGroupModalProps {
  visible: boolean;
  chat: ChatGroup;
  onClose: () => void;
  onUpdate: (data: Partial<ChatGroup>) => void;
}

const EditGroupModal: React.FC<EditGroupModalProps> = ({ visible, chat, onClose, onUpdate }) => {
  const [name, setName] = useState(chat.name);
  const [description, setDescription] = useState(chat.description || "");
  const [is_disabled, setIsDisabled] = useState(chat.is_disabled || false);
  const [only_admins_can_message, setOnlyAdminsCanMessage] = useState(
    chat.only_admins_can_message !== undefined ? chat.only_admins_can_message : true
  );
  const [updateGroup, { isLoading }] = useUpdateChatGroupMutation();

  const handleToggleDisabled = (value: boolean) => {
    if (value) {
      Alert.alert(
        "Admins Only Messaging",
        "Are you sure you want to restrict messaging? Only admins will be able to send messages.",
        [
          { text: "Cancel", style: "cancel", onPress: () => setIsDisabled(false) },
          { text: "Disable", style: "destructive", onPress: () => setIsDisabled(true) },
        ]
      );
    } else {
      setIsDisabled(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateGroup({
        chat_group_id: chat.id,
        name,
        is_disabled,
        only_admins_can_message,
      }).unwrap();
      
      onUpdate({
        name,
        description,
        is_disabled,
        only_admins_can_message,
      });
      onClose();
    } catch (error) {
      console.error("Failed to update group:", error);
      Alert.alert("Error", "Failed to update group settings.");
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 bg-black/40 justify-center px-4">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View className="bg-white rounded-[32px] overflow-hidden shadow-2xl">
            {/* Header */}
            <View className="px-6 py-5 border-b border-gray-50 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900">Edit Group</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-[500px] p-6">
              {/* Basic Details */}
              <View className="space-y-4">
                <View>
                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Group Name</Text>
                  <TextInput
                    className="bg-gray-50 rounded-2xl px-4 py-3.5 text-gray-900 border border-gray-100"
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter group name"
                  />
                </View>

                <View className="mt-4">
                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Description</Text>
                  <TextInput
                    className="bg-gray-50 rounded-2xl px-4 py-3.5 text-gray-900 border border-gray-100 h-24"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    placeholder="Describe the group purpose"
                  />
                </View>
              </View>

              {/* Group Settings */}
              <View className="mt-8 space-y-4">
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Permissions</Text>
                
                <View className="flex-row items-center justify-between py-2 border-b border-gray-50 pb-4 mb-4">
                  <View className="flex-1 mr-4">
                    <Text className="text-gray-900 font-semibold">Only Admins Can Message</Text>
                    <Text className="text-gray-400 text-[11px] mt-1">If enabled, regular members cannot send messages to this group.</Text>
                  </View>
                  <Switch
                    value={only_admins_can_message}
                    onValueChange={setOnlyAdminsCanMessage}
                    trackColor={{ false: "#e5e7eb", true: "#bfdbfe" }}
                    thumbColor={only_admins_can_message ? "#3b82f6" : "#f3f4f6"}
                  />
                </View>

                <View className="flex-row items-center justify-between py-2 border-b border-gray-50 pb-4">
                  <View className="flex-1 mr-4">
                    <Text className="text-red-600 font-semibold">Disable Group Chat completely</Text>
                    <Text className="text-gray-400 text-[11px] mt-1">Nobody (even admins) can send messages. Read-only strictly.</Text>
                  </View>
                  <Switch
                    value={is_disabled}
                    onValueChange={handleToggleDisabled}
                    trackColor={{ false: "#e5e7eb", true: "#fee2e2" }}
                    thumbColor={is_disabled ? "#ef4444" : "#f3f4f6"}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Actions */}
            <View className="p-6 bg-gray-50 flex-row space-x-3">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 h-12 rounded-xl items-center justify-center bg-white border border-gray-200"
              >
                <Text className="text-gray-600 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isLoading}
                className={`flex-[2] h-12 rounded-xl items-center justify-center ${isLoading ? "bg-blue-300" : "bg-blue-600 shadow-md"}`}
              >
                <Text className="text-white font-bold">
                  {isLoading ? "Saving..." : "Save Changes"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default EditGroupModal;
