import React from "react";
import { View, Text, TouchableOpacity, FlatList, Image, Alert, Modal, Linking, RefreshControl, ActivityIndicator, BackHandler } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { ChatGroup, ChatMessage } from "./ChatTypes";
import MessageBubble from "./MessageBubble";
import ChatInputBar from "./ChatInputBar";
import { useChunkedUpload } from "../../../hooks/useChunkedUpload";
import MessageReceiptsModal from "./MessageReceiptsModal";
import { useSelector, useDispatch } from "react-redux";
import { useGetChatMessagesQuery, useSendChatMessageMutation, useMarkChatAsReadMutation, useToggleChatGroupPinMutation, useUpdateChatMessageMutation, useDeleteChatMessageMutation, useGetChatGroupMembersQuery, useReactToMessageMutation, useSetChatFocusMutation, chatApi } from "../../../api/chat-api";
import RealTimeNotificationService from "../../../services/notifications/RealTimeNotificationService";

interface ChatViewProps {
  group: ChatGroup;
  onBack: () => void;
  onInfoPress: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ group, onBack, onInfoPress }) => {
  const user = useSelector((state: any) => state.app.user);
  const currentUserId = user?.id;
  
  const [page, setPage] = React.useState(1);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [typingUsers, setTypingUsers] = React.useState<Record<number, { name: string, lastTyped: number }>>({});
  const [onlineUserIds, setOnlineUserIds] = React.useState<Set<number>>(new Set());

  const { data: messagesData, isLoading, refetch, isFetching } = useGetChatMessagesQuery(
    { chat_group_id: group.id, page },
    { 
      skip: !group.id,
      // Removed pollingInterval: 3000 in favor of real-time Echo listeners
    }
  );
  
  const [sendMessage] = useSendChatMessageMutation();
  const [markRead] = useMarkChatAsReadMutation();
  const [togglePin] = useToggleChatGroupPinMutation();
  const [updateMessage] = useUpdateChatMessageMutation();
  const [deleteMessage] = useDeleteChatMessageMutation();
  const [reactToMessage] = useReactToMessageMutation();
  const [setFocus] = useSetChatFocusMutation();

  const dispatch = useDispatch<any>();

  const { data: membersData } = useGetChatGroupMembersQuery(
    { chat_group_id: group.id },
    { skip: !group.id || group.type !== 'group' }
  );
  
  const members = React.useMemo(() => membersData?.data.members || [], [membersData]);

  const messages = React.useMemo(() => messagesData?.data.messages || [], [messagesData]);
  const hasMore = messagesData?.data.pagination.has_more || false;
  
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

  // Typing indicator cleanup
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (now - next[Number(id)].lastTyped > 3000) {
            delete next[Number(id)];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Real-time Echo listeners
  React.useEffect(() => {
    if (!group.id) return;

    console.log(`🔌 Setting up Echo listeners for group ${group.id}`);
    
    RealTimeNotificationService.subscribeToGroup(Number(group.id), {
      onGroupDeleted: () => {
        Alert.alert("Group Deleted", "This group has been deleted by the administrator.");
        onBack();
      },
      onMessageSent: (newMessage) => {
        console.log("⚡ Real-time: New message received:", newMessage.id, newMessage.content);
        dispatch(
          chatApi.util.updateQueryData('getChatMessages', { chat_group_id: group.id, page: 1 }, (draft) => {
            // Deduplicate
            if (!draft.data.messages.find(m => m.id === newMessage.id)) {
              console.log("✅ Adding new message to list");
              draft.data.messages.unshift(newMessage);
            }
          })
        );
      },
      onMessageUpdated: (updatedMessage) => {
        console.log("⚡ Real-time: Message updated event received!", {
          id: updatedMessage.id,
          reactions: updatedMessage.reactions?.length,
          type: updatedMessage.type
        });
        
        dispatch(
          chatApi.util.updateQueryData('getChatMessages', { chat_group_id: group.id, page: 1 }, (draft) => {
            console.log("🔍 Checking cache for message ID:", updatedMessage.id, "Cache size:", draft.data.messages.length);
            const index = draft.data.messages.findIndex(m => String(m.id) === String(updatedMessage.id));
            if (index !== -1) {
              console.log("✅ Match found at index", index, ". Updating reactions.");
              draft.data.messages[index] = { 
                ...draft.data.messages[index], 
                ...updatedMessage,
                reactions: updatedMessage.reactions // Explicitly ensure reactions are copied
              };
            } else {
              console.log("⚠️ Message not found in current cache. ID search was for:", updatedMessage.id);
            }
          })
        );
      },
      onMessageDeleted: (data) => {
        console.log("⚡ Real-time: Message deleted:", data.id);
        dispatch(
          chatApi.util.updateQueryData('getChatMessages', { chat_group_id: group.id, page: 1 }, (draft) => {
            draft.data.messages = draft.data.messages.filter(m => m.id !== data.id);
          })
        );
      },
      onTyping: (data) => {
        if (data.user_id === user?.id) return;
        console.log("⚡ Real-time: Typing whisper received:", data.user_name);
        setTypingUsers(prev => ({
          ...prev,
          [data.user_id]: { name: data.user_name, lastTyped: Date.now() }
        }));
      },
      onPresenceChange: (users) => {
        console.log("👥 Real-time: Presence update:", users.length, "users online");
        setOnlineUserIds(new Set(users.map(u => u.id)));
      }
    });

    return () => {
      console.log(`🔌 Unsubscribing from Echo group ${group.id}`);
      RealTimeNotificationService.unsubscribeFromGroup(Number(group.id));
    };
  }, [group.id, dispatch]);

  // Mark as read when opening
  React.useEffect(() => {
    if (group.id) {
      markRead({ chat_group_id: group.id });
    }
  }, [group.id, messagesData]);

  // Focus tracking (Heartbeat for push notification suppression)
  React.useEffect(() => {
    if (!group.id) return;

    const sendFocus = async (focusedGroupId: number | null) => {
      try {
        await setFocus({ chat_group_id: focusedGroupId }).unwrap();
      } catch (error) {
        // Silent fail for focus, not critical enough to alert user
        console.warn("Failed to set chat focus:", error);
      }
    };

    // Initial focus on mount
    sendFocus(Number(group.id));

    // Heartbeat every 30 seconds
    const interval = setInterval(() => {
      sendFocus(Number(group.id));
    }, 30000);

    return () => {
      clearInterval(interval);
      // Clear focus on unmount
      sendFocus(null);
    };
  }, [group.id]);

  const handleToggleReaction = async (message: ChatMessage, emoji: string) => {
    // Optimistic update
    const patchResult = dispatch(
      chatApi.util.updateQueryData('getChatMessages', { chat_group_id: group.id, page: 1 }, (draft) => {
        const msgIndex = draft.data.messages.findIndex(m => m.id === message.id);
        if (msgIndex !== -1) {
          const msg = draft.data.messages[msgIndex];
          const reactions = [...(msg.reactions || [])];
          const reactionIndex = reactions.findIndex(r => r.emoji === emoji);
          
          if (reactionIndex !== -1) {
            const reaction = { ...reactions[reactionIndex] };
            const userIndex = reaction.user_ids.indexOf(currentUserId);
            
            if (userIndex !== -1) {
              // Remove our reaction
              reaction.user_ids = reaction.user_ids.filter(id => id !== currentUserId);
              reaction.count--;
              if (reaction.count <= 0) {
                reactions.splice(reactionIndex, 1);
              } else {
                reactions[reactionIndex] = reaction;
              }
            } else {
              // Add our reaction
              reaction.user_ids.push(currentUserId);
              reaction.count++;
              reactions[reactionIndex] = reaction;
            }
          } else {
            // New emoji reaction
            reactions.push({
              emoji,
              count: 1,
              user_ids: [currentUserId]
            });
          }
          
          draft.data.messages[msgIndex].reactions = reactions;
        }
      })
    );

    try {
      await reactToMessage({ message_id: message.id, emoji }).unwrap();
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
      patchResult.undo();
      Alert.alert("Error", "Failed to update reaction.");
    }
  };

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
        
        // No need to scroll to end with inverted list, new message is at index 0 (bottom)
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
    } catch (error: any) {
      console.error("❌ Failed to send attachment:", error);
      const errorMsg = error?.data?.message || error.message || "Unknown error";
      Alert.alert("Upload Failed", `The file was uploaded but we couldn't create the message: ${errorMsg}`);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !isFetching) {
      setPage(prev => prev + 1);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setPage(1);
    await refetch();
    setIsRefreshing(false);
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
          inverted={true}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetching && page > 1 ? (
            <View className="py-4">
              <ActivityIndicator color="#2563eb" />
            </View>
          ) : null}
          renderItem={({ item, index }) => {
            // In inverted FlatList, messages[index + 1] is effectively the "previous" message in chronological order
            // which appears above the current message.
            const nextChronologicalMessage = messages[index + 1];
            const showSenderName = !nextChronologicalMessage || nextChronologicalMessage.sender_id !== item.sender_id;
            
            return (
              <MessageBubble
                message={item}
                isMe={String(item.sender_id) === String(currentUserId)}
                currentUserId={currentUserId}
                showSenderName={showSenderName}
                canViewReceipts={isAdmin}
                onShowReceipts={(msg) => {
                  setSelectedMessage(msg);
                  setShowReceiptsModal(true);
                }}
                onLongPress={handleMessageLongPress}
                onReactionPress={(emoji) => handleToggleReaction(item, emoji)}
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
            
            {/* Reactions Picker */}
            <View className="flex-row justify-around py-2 border-b border-gray-50 mb-4">
              {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                <TouchableOpacity 
                  key={emoji}
                  className="p-2"
                  onPress={() => {
                    if (selectedMessage) handleToggleReaction(selectedMessage, emoji);
                    setShowActionMenu(false);
                  }}
                >
                  <Text className="text-2xl">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Media Actions - View/Download */}
            {(selectedMessage?.type === 'image' || selectedMessage?.type === 'file') && (
              <>
                <TouchableOpacity 
                  className="flex-row items-center py-4 border-b border-gray-50 active:bg-gray-50 rounded-xl px-2"
                  onPress={() => {
                    if (selectedMessage?.content) Linking.openURL(selectedMessage.content);
                    setShowActionMenu(false);
                  }}
                >
                  <MaterialIcons name="visibility" size={22} color="#4b5563" />
                  <Text className="text-gray-700 font-semibold ml-4">
                    View {selectedMessage?.type === 'image' ? 'Image' : 'Document'}
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
        {/* Typing Indicator */}
        {Object.keys(typingUsers).length > 0 && (
          <View className="px-4 py-1">
            <Text className="text-[10px] text-gray-400 italic">
              {Object.values(typingUsers).map(u => u.name).join(', ')} {Object.keys(typingUsers).length > 1 ? 'are' : 'is'} typing...
            </Text>
          </View>
        )}
        <ChatInputBar 
          onSendMessage={handleSendMessage} 
          onSendAttachment={handleSendAttachment as any}
          initialValue={editingMessage?.content}
          isDisabled={group.is_disabled && !isAdmin}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onTyping={() => {
            RealTimeNotificationService.sendTypingIndicator(Number(group.id), user?.full_name || 'Someone');
          }}
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
              {uploadProgress === 0 ? "Preparing Attachment..." : "Uploading Attachment..."}
            </Text>
            <Text className="text-gray-500 text-sm mt-1 text-center">
              Please don't close the chat
            </Text>
            
            {/* Detailed Progress Bar - Only show when we have progress */}
            {uploadProgress > 0 && (
              <>
                <View className="w-full h-2 bg-gray-100 rounded-full mt-6 overflow-hidden">
                  <View 
                    className="h-full bg-blue-600" 
                    style={{ width: `${uploadProgress * 100}%` }} 
                  />
                </View>
                
                <Text className="text-blue-600 font-bold text-xs mt-2">
                  {Math.round(uploadProgress * 100)}% COMPLETE
                </Text>
              </>
            )}
            
            {uploadProgress === 0 && (
              <Text className="text-gray-400 text-xs mt-6 italic">
                Gathering file info...
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

export default ChatView;
