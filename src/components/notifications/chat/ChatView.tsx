import React from "react";
import { View, Text, TouchableOpacity, FlatList, Image, Alert, Modal, Linking, RefreshControl, ActivityIndicator, BackHandler } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { ChatGroup, ChatMessage } from "./ChatTypes";
import MessageBubble from "./MessageBubble";
import ChatInputBar from "./ChatInputBar";
import { useChunkedUpload } from "../../../hooks/useChunkedUpload";
import MessageReceiptsModal from "./MessageReceiptsModal";
import { useSelector } from "react-redux";
import { useGetChatMessagesQuery, useSendChatMessageMutation, useMarkChatAsReadMutation, useToggleChatGroupPinMutation, useUpdateChatMessageMutation, useDeleteChatMessageMutation, useGetChatGroupMembersQuery } from "../../../api/chat-api";

interface ChatViewProps {
  group: ChatGroup;
  onBack: () => void;
  onInfoPress: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ group, onBack, onInfoPress }) => {
  const user = useSelector((state: any) => state.app.user);
  const currentUserId = user?.id;
  
  const { data: messagesData, isLoading, refetch } = useGetChatMessagesQuery(
    { chat_group_id: group.id },
    { 
      skip: !group.id,
      pollingInterval: 3000, // Poll every 3 seconds while in chat for real-time feel
    }
  );
  
  const [sendMessage] = useSendChatMessageMutation();
  const [markRead] = useMarkChatAsReadMutation();
  const [togglePin] = useToggleChatGroupPinMutation();
  const [updateMessage] = useUpdateChatMessageMutation();
  const [deleteMessage] = useDeleteChatMessageMutation();

  const { data: membersData } = useGetChatGroupMembersQuery(
    { chat_group_id: group.id },
    { skip: !group.id || group.type !== 'group' }
  );
  
  const members = React.useMemo(() => membersData?.data.members || [], [membersData]);

  const messages = React.useMemo(() => messagesData?.data.messages || [], [messagesData]);
  
  const [selectedMessage, setSelectedMessage] = React.useState<ChatMessage | null>(null);
  const [showActionMenu, setShowActionMenu] = React.useState(false);
  const [editingMessage, setEditingMessage] = React.useState<ChatMessage | null>(null);
  const [showReceiptsModal, setShowReceiptsModal] = React.useState(false);
  
  const isAdmin = React.useMemo(() => {
    return group.current_user_role === 'admin' || user?.role === 'admin';
  }, [group.current_user_role, user?.role]);

  const { uploadFile, isUploading, progress: uploadProgress } = useChunkedUpload();
  
  const flatListRef = React.useRef<FlatList>(null);
  const navigation = useNavigation();

  // Navigation Blocker: Prevent user from leaving while uploading
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isUploading) {
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Alert the user
      Alert.alert(
        'Upload in Progress',
        'Please wait for the upload to complete before leaving the chat. Leaving now will cancel the upload.',
        [
          { text: 'Wait', style: 'cancel', onPress: () => {} },
          {
            text: 'Leave Anyway',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, isUploading]);

  // Hardware Back Button (Android)
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isUploading) {
        Alert.alert(
          'Upload in Progress',
          'Please wait for the upload to complete.'
        );
        return true; // Stop propagation
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isUploading]);

  // Mark as read when opening
  React.useEffect(() => {
    if (group.id) {
      markRead({ chat_group_id: group.id });
    }
  }, [group.id, messagesData]);

  const handleSendMessage = async (text: string) => {
    try {
      if (editingMessage) {
        await updateMessage({
          message_id: editingMessage.id,
          content: text,
        }).unwrap();
        setEditingMessage(null);
      } else {
        await sendMessage({
          chat_group_id: group.id,
          type: "text",
          content: text,
        }).unwrap();
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error("Failed to send/update message:", error);
      Alert.alert("Error", "Failed to process message. Please try again.");
    }
  };

  const handleSendAttachment = async (type: "image" | "file", file?: any) => {
    if (!file) return;

    try {
      console.log(`📤 Starting chunked upload for ${type}:`, file.name);
      // Use chunked upload for all attachments
      const mediaData = await uploadFile(file.uri, file.name, file.type);
      
      console.log("✅ Upload successful, sending message with media:", mediaData);
      
      const response = await sendMessage({
        chat_group_id: group.id,
        type: type === "image" ? "image" : "file",
        attachment_url: mediaData.url,
        metadata: {
          original_filename: mediaData.original_filename,
          size: mediaData.size,
          mime_type: mediaData.mime_type,
          width: mediaData.width,
          height: mediaData.height,
        }
      }).unwrap();

      console.log("✅ Message sent successfully:", response);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error("❌ Failed to send attachment:", error);
      const errorMsg = error?.data?.message || error.message || "Unknown error";
      Alert.alert("Upload Failed", `The file was uploaded but we couldn't create the message: ${errorMsg}`);
    }
  };

  const sendSampleImage = async () => {
    try {
      Alert.alert(
        "Debug",
        "Sending a test message with a sample image to verify display...",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Send",
            onPress: async () => {
              await sendMessage({
                chat_group_id: group.id,
                type: "image",
                content: "Sample Image Test",
                attachment_url: "https://picsum.photos/800/600",
                metadata: {
                  original_filename: "sample.jpg",
                  size: 1024,
                  mime_type: "image/jpeg",
                }
              }).unwrap();
            }
          }
        ]
      );
    } catch (error) {
      console.error("Failed to send sample image:", error);
    }
  };

  const handleMessageLongPress = (message: ChatMessage) => {
    setSelectedMessage(message);
    setShowActionMenu(true);
  };

  const handleDeleteMessage = async (forEveryone: boolean, messageToDelete?: ChatMessage) => {
    const msg = messageToDelete || selectedMessage;
    if (!msg) return;

    try {
      await deleteMessage({ message_id: msg.id }).unwrap();
      setShowActionMenu(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error("Failed to delete message:", error);
      Alert.alert("Error", "Failed to delete message. Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity 
          onPress={() => {
            if (isUploading) {
              Alert.alert('Upload in Progress', 'Please wait for the upload to complete.');
            } else {
              onBack();
            }
          }} 
          className="p-1"
        >
          <MaterialIcons name="arrow-back-ios" size={24} color={isUploading ? "#d1d5db" : "black"} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="flex-row items-center flex-1 ml-4"
          onPress={onInfoPress}
        >
          <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
            <Text className="text-blue-600 font-bold text-sm">
              {group.name.trim().split(' ').length >= 2 
                ? (group.name.trim().split(' ')[0][0] + group.name.trim().split(' ')[1][0]).toUpperCase()
                : (group.name[0] || '?').toUpperCase()
              }
            </Text>
          </View>
          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
                {group.name}
              </Text>
              {group.is_pinned && (
                <View className="ml-2 bg-gray-100 p-1 rounded-full">
                  <MaterialIcons name="push-pin" size={12} color="#6b7280" style={{ transform: [{ rotate: '45deg' }] }} />
                </View>
              )}
            </View>
            {group.type === 'group' && (
              <Text className="text-xs text-gray-500">
                {members.length || group.members_count || 0} members
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          className="p-2" 
          activeOpacity={0.7}
          onPress={async () => {
            try {
              await togglePin({ chat_group_id: group.id }).unwrap();
            } catch (error) {
              console.error("Failed to toggle pin:", error);
            }
          }}
        >
          <MaterialIcons 
            name="push-pin" 
            size={22} 
            color={group.is_pinned ? "#3b82f6" : "#6b7280"} 
            style={group.is_pinned ? { transform: [{ rotate: '45deg' }] } : {}}
          />
        </TouchableOpacity>

        <TouchableOpacity 
          className="p-2" 
          activeOpacity={0.7}
          onPress={onInfoPress}
        >
          <MaterialIcons name="info-outline" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Message List */}
      <View className="flex-1 bg-[#EEF2F6]">
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
          renderItem={({ item, index }) => {
            const prevMessage = messages[index - 1];
            const showSenderName = !prevMessage || prevMessage.sender_id !== item.sender_id;
            
            return (
              <MessageBubble
                message={item}
                isMe={String(item.sender_id) === String(currentUserId)}
                showSenderName={showSenderName}
                canViewReceipts={isAdmin}
                onShowReceipts={(msg) => {
                  setSelectedMessage(msg);
                  setShowReceiptsModal(true);
                }}
                onLongPress={handleMessageLongPress}
                onDelete={(msg) => {
                  Alert.alert(
                    "Delete Message",
                    "Delete this message?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => handleDeleteMessage(false, msg) }
                    ]
                  );
                }}
              />
            );
          }}
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      </View>

      {/* Action Menu Bottom Sheet Mock */}
      <Modal visible={showActionMenu} transparent animationType="fade">
        <TouchableOpacity 
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowActionMenu(false)}
        >
          <View className="bg-white rounded-t-[32px] p-6 pb-12 shadow-2xl">
            <View className="w-12 h-1.5 bg-gray-200 rounded-full self-center mb-6" />
            
            {/* Media Actions - View/Download */}
            {(selectedMessage?.type === 'image' || selectedMessage?.type === 'file') && (
              <>
                <TouchableOpacity 
                  className="flex-row items-center py-4 border-b border-gray-50 active:bg-gray-50 rounded-xl px-2"
                  onPress={() => {
                    if (selectedMessage.content) Linking.openURL(selectedMessage.content);
                    setShowActionMenu(false);
                  }}
                >
                  <MaterialIcons name="visibility" size={22} color="#4b5563" />
                  <Text className="text-gray-700 font-semibold ml-4">
                    View {selectedMessage.type === 'image' ? 'Image' : 'Document'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  className="flex-row items-center py-4 border-b border-gray-50 active:bg-gray-50 rounded-xl px-2"
                  onPress={() => {
                    Alert.alert("Downloading", "The file is being saved to your device...");
                    setShowActionMenu(false);
                  }}
                >
                  <MaterialIcons name="file-download" size={22} color="#4b5563" />
                  <Text className="text-gray-700 font-semibold ml-4">Download File</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Copy Action - Available to everyone with text */}
            {selectedMessage?.type === 'text' && (
              <TouchableOpacity 
                className="flex-row items-center py-4 border-b border-gray-50 active:bg-gray-50 rounded-xl px-2"
                onPress={() => {
                  // In real app use Clipboard.setString(selectedMessage.content);
                  Alert.alert("Copied", "Message copied to clipboard");
                  setShowActionMenu(false);
                }}
              >
                <MaterialIcons name="content-copy" size={22} color="#4b5563" />
                <Text className="text-gray-700 font-semibold ml-4">Copy Text</Text>
              </TouchableOpacity>
            )}

            {/* View Seen List - Admin Only */}
            {isAdmin && (
              <TouchableOpacity 
                className="flex-row items-center py-4 border-b border-gray-50 active:bg-blue-50 rounded-xl px-2"
                onPress={() => {
                  setShowReceiptsModal(true);
                  setShowActionMenu(false);
                }}
              >
                <MaterialIcons name="done-all" size={22} color="#3b82f6" />
                <Text className="text-blue-600 font-semibold ml-4">View Seen List</Text>
              </TouchableOpacity>
            )}

            {/* Edit Action - Only for Owner */}
            {selectedMessage?.sender_id === currentUserId && selectedMessage?.type === 'text' && (
              <TouchableOpacity 
                className="flex-row items-center py-4 border-b border-gray-50 active:bg-gray-50 rounded-xl px-2"
                onPress={() => {
                  setEditingMessage(selectedMessage);
                  setShowActionMenu(false);
                }}
              >
                <MaterialIcons name="edit" size={22} color="#2563eb" />
                <Text className="text-blue-600 font-semibold ml-4">Edit Message</Text>
              </TouchableOpacity>
            )}

            {/* Delete Action - Only for Owner */}
            {selectedMessage?.sender_id === currentUserId && (
              <TouchableOpacity 
                className="flex-row items-center py-4 active:bg-red-50 rounded-xl px-2"
                onPress={() => {
                  Alert.alert(
                    "Delete Message",
                    "Do you want to delete this message?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete for me", onPress: () => handleDeleteMessage(false) },
                      { text: "Delete for everyone", style: "destructive", onPress: () => handleDeleteMessage(true) }
                    ]
                  );
                }}
              >
                <MaterialIcons name="delete-outline" size={22} color="#ef4444" />
                <Text className="text-red-500 font-semibold ml-4">Delete Message</Text>
              </TouchableOpacity>
            )}

            {/* Close Button */}
            <TouchableOpacity 
              onPress={() => setShowActionMenu(false)}
              className="mt-4 py-4 bg-gray-100 rounded-2xl items-center"
            >
              <Text className="text-gray-600 font-bold text-base">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Input Bar */}
      <View>
        {editingMessage && (
          <View className="bg-blue-50 px-4 py-2 flex-row items-center border-t border-blue-100">
            <MaterialIcons name="edit" size={16} color="#2563eb" />
            <Text className="text-blue-600 text-[12px] font-bold ml-2 flex-1">Editing message</Text>
            <TouchableOpacity onPress={() => setEditingMessage(null)}>
              <MaterialIcons name="close" size={18} color="#2563eb" />
            </TouchableOpacity>
          </View>
        )}
        <ChatInputBar 
          onSendMessage={handleSendMessage} 
          onSendAttachment={handleSendAttachment as any}
          initialValue={editingMessage?.content}
          isDisabled={group.is_disabled && !isAdmin}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      </View>
      <MessageReceiptsModal 
        visible={showReceiptsModal} 
        onClose={() => setShowReceiptsModal(false)} 
        message={selectedMessage}
      />

      {/* Full Screen Upload Progress Overlay */}
      {isUploading && (
        <View className="absolute inset-0 bg-black/40 items-center justify-center z-50">
          <View className="bg-white p-6 rounded-3xl w-[80%] items-center shadow-xl">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-gray-900 font-bold text-lg mt-4 text-center">
              Uploading Attachment
            </Text>
            <Text className="text-gray-500 text-sm mt-1 text-center">
              Please don't close the chat
            </Text>
            
            {/* Detailed Progress Bar */}
            <View className="w-full h-2 bg-gray-100 rounded-full mt-6 overflow-hidden">
              <View 
                className="h-full bg-blue-600" 
                style={{ width: `${uploadProgress * 100}%` }} 
              />
            </View>
            
            <Text className="text-blue-600 font-bold text-xs mt-2">
              {Math.round(uploadProgress * 100)}% COMPLETE
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default ChatView;
