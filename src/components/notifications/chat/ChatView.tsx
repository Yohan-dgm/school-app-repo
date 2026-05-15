import React from "react";
import { View, Text, TouchableOpacity, FlatList, Image, Alert, Modal, Linking, RefreshControl, ActivityIndicator, BackHandler, AppState, AppStateStatus, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { resolveMediaUrl } from "../../../utils/mediaUtils";
import MediaPreviewModal from "../../common/MediaPreviewModal";
import { format, isSameDay } from "date-fns";

interface ChatViewProps {
  group: ChatGroup;
  onBack: () => void;
  onInfoPress: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ group, onBack, onInfoPress }) => {
  const insets = useSafeAreaInsets();
  const user = useSelector((state: any) => state.app.user);
  const currentUserId = user?.id;

  // Measured height of the custom header — used as KAV offset on iOS
  const [headerHeight, setHeaderHeight] = React.useState(0);
  
  const [page, setPage] = React.useState(1);
  const pageRef = React.useRef(1);
  const [isPreviewVisible, setIsPreviewVisible] = React.useState(false);
  const token = useSelector((state: any) => state.app.token);
  
  // Keep ref in sync with state
  React.useEffect(() => {
    pageRef.current = page;
  }, [page]);

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
  
  // Local state for the current group to handle real-time setting updates (like is_disabled)
  const [currentGroup, setCurrentGroup] = React.useState<ChatGroup>(group);

  // Sync with prop when it changes
  React.useEffect(() => {
    setCurrentGroup(group);
  }, [group]);

  const { data: membersData } = useGetChatGroupMembersQuery(
    { chat_group_id: currentGroup.id },
    { skip: !currentGroup.id || currentGroup.type !== 'group' }
  );
  
  const members = React.useMemo(() => membersData?.data.members || [], [membersData]);
  const totalMembersCount = membersData?.data?.pagination?.total || group.members_count || members.length || 0;

  const messages = React.useMemo(() => messagesData?.data.messages || [], [messagesData]);
  const hasMore = messagesData?.data.pagination.has_more || false;
  
  const [selectedMessage, setSelectedMessage] = React.useState<ChatMessage | null>(null);
  const [showActionMenu, setShowActionMenu] = React.useState(false);
  const [editingMessage, setEditingMessage] = React.useState<ChatMessage | null>(null);
  const [showReceiptsModal, setShowReceiptsModal] = React.useState(false);

  const isAdmin = React.useMemo(() => {
    return currentGroup.current_user_role === 'admin' || user?.role === 'admin';
  }, [currentGroup.current_user_role, user?.role]);

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

  // Polling fallback removed in favor of robust WebSocket architecture
  // (Prevents aggressive background API spam)

  const handleRefreshMessages = React.useCallback(() => {
    if (group.id) {
       dispatch(chatApi.endpoints.getChatMessages.initiate({ chat_group_id: Number(group.id), page: 1 }, { forceRefetch: true }));
    }
  }, [group.id, dispatch]);

  // Helper to handle new messages from any real-time source (Presence or User channel)
  const handleNewMessage = React.useCallback((msg: ChatMessage) => {
    const groupId = Number(group.id);
    const msgGroupId = Number(msg.chat_group_id);

    // Ensure the message belongs to THIS group
    if (msgGroupId !== groupId) {
      console.log(`ℹ️ [ChatView] Message for different group (${msgGroupId}), ignoring.`);
      return;
    }

    console.log("⚡ [ChatView] Processing new message:", msg.id);

    // Update the cache for the current page (usually page 1)
    // We use pageRef.current to avoid the callback closure being stuck on an old page value
    dispatch(
      chatApi.util.updateQueryData('getChatMessages', { chat_group_id: groupId, page: pageRef.current }, (draft) => {
        // Deduplicate: Don't add if it already exists (prevents doubles from multiple channels)
        const exists = draft.data.messages.some(m => String(m.id) === String(msg.id));
        if (!exists) {
          console.log("✅ [ChatView] New message inserted into list:", msg.id);
          draft.data.messages.unshift(msg);
        } else {
          console.log("ℹ️ [ChatView] Message already in list, skipping:", msg.id);
        }
      })
    );

    // Also update page 1 cache if we are currently on a different page, 
    // to ensure when user scrolls back to top they see it
    if (pageRef.current !== 1) {
      dispatch(
        chatApi.util.updateQueryData('getChatMessages', { chat_group_id: groupId, page: 1 }, (draft) => {
          const exists = draft.data.messages.some(m => String(m.id) === String(msg.id));
          if (!exists) {
            draft.data.messages.unshift(msg);
          }
        })
      );
    }

    // Force network fetch to guarantee correctness
    handleRefreshMessages();
  }, [group.id, dispatch, handleRefreshMessages]);

  // Real-time Echo listeners
  React.useEffect(() => {
    if (!currentGroup.id) return;

    console.log(`🔌 [ChatView] Setting up Echo listeners for group ${currentGroup.id}`);
    
    RealTimeNotificationService.subscribeToGroup(Number(currentGroup.id), {
      onGroupUpdated: (updatedGroup) => {
        console.log("⚡ Real-time: Group updated:", updatedGroup.id, "Settings:", updatedGroup.is_disabled);
        dispatch(
          chatApi.util.updateQueryData('getChatThreads', { page: 1 }, (draft) => {
            const index = draft.data.threads.findIndex(t => String(t.id) === String(updatedGroup.id));
            if (index !== -1) {
              draft.data.threads[index] = { ...draft.data.threads[index], ...updatedGroup };
            }
          })
        );
        
        if (String(currentGroup.id) === String(updatedGroup.id)) {
           setCurrentGroup(prev => ({ ...prev, ...updatedGroup }));
        }
      },
      onGroupDeleted: () => {
        Alert.alert("Group Deleted", "This group has been deleted by the administrator.");
        onBack();
      },
      onMessageSent: (newMessage) => {
        console.log("⚡ [ChatView] Presence Channel message received");
        handleNewMessage(newMessage);
      },
      onMessageUpdated: (updatedMessage) => {
        console.log("⚡ Real-time: Message updated event received!", {
          id: updatedMessage.id,
          reactions: updatedMessage.reactions?.length,
          type: updatedMessage.type
        });
        
        const groupId = Number(group.id);
        dispatch(
          chatApi.util.updateQueryData('getChatMessages', { chat_group_id: groupId, page: pageRef.current }, (draft) => {
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
        
        // Also update page 1 if we're not on it
        if (pageRef.current !== 1) {
          dispatch(
            chatApi.util.updateQueryData('getChatMessages', { chat_group_id: groupId, page: 1 }, (draft) => {
              const index = draft.data.messages.findIndex(m => String(m.id) === String(updatedMessage.id));
              if (index !== -1) {
                draft.data.messages[index] = { ...draft.data.messages[index], ...updatedMessage };
              }
            })
          );
        }

        // Trigger refetch for guaranteed correctness
        handleRefreshMessages();
      },
      onMessageDeleted: (data) => {
        const groupId = Number(group.id);
        console.log("⚡ Real-time: Message deleted:", data.id);
        dispatch(
          chatApi.util.updateQueryData('getChatMessages', { chat_group_id: groupId, page: pageRef.current }, (draft) => {
            draft.data.messages = draft.data.messages.filter(m => String(m.id) !== String(data.id));
          })
        );
        // Also update page 1 if we're not on it
        if (pageRef.current !== 1) {
          dispatch(
            chatApi.util.updateQueryData('getChatMessages', { chat_group_id: groupId, page: 1 }, (draft) => {
              draft.data.messages = draft.data.messages.filter(m => String(m.id) !== String(data.id));
            })
          );
        }

        handleRefreshMessages();
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
      },
      onMessageRead: (data) => {
        console.log("⚡ Real-time: Messages read by:", data.user_id, "IDs:", data.message_ids);
        if (data.user_id === user?.id) return; // Ignore own read receipts (already updated locally)

        const groupId = Number(group.id);
        dispatch(
          chatApi.util.updateQueryData('getChatMessages', { chat_group_id: groupId, page: pageRef.current }, (draft) => {
            data.message_ids.forEach(id => {
              const index = draft.data.messages.findIndex(m => String(m.id) === String(id));
              if (index !== -1) {
                // Increment read count or update specific read status
                draft.data.messages[index].read_count = (draft.data.messages[index].read_count || 0) + 1;
              }
            });
          })
        );
      }
    });

    return () => {
      console.log(`🔌 Unsubscribing from Echo group ${group.id}`);
      RealTimeNotificationService.unsubscribeFromGroup(Number(group.id));
    };
  }, [group.id, dispatch, handleNewMessage, handleRefreshMessages]);

  // ROBUST FALLBACK: Listen to the User Channel too
  // This channel is working reliably even when presence channels fail.
  React.useEffect(() => {
    console.log("📡 [ChatView] Registering User Channel fallback listener");
    
    const removeListener = RealTimeNotificationService.addChatMessageListener((data) => {
      if (data.event === 'sent') {
        console.log("⚡ [ChatView] Global User Channel fallback message received");
        handleNewMessage(data.message as ChatMessage);
      } else if (data.event === 'updated') {
        const groupId = Number(group.id);
        const updatedMessage = data.message;
        dispatch(
          chatApi.util.updateQueryData('getChatMessages', { chat_group_id: groupId, page: pageRef.current }, (draft) => {
            const index = draft.data.messages.findIndex(m => String(m.id) === String(updatedMessage.id));
            if (index !== -1) {
              draft.data.messages[index] = { 
                ...draft.data.messages[index], 
                ...updatedMessage,
                reactions: updatedMessage.reactions 
              };
            }
          })
        );
        if (pageRef.current !== 1) {
          dispatch(
            chatApi.util.updateQueryData('getChatMessages', { chat_group_id: groupId, page: 1 }, (draft) => {
              const index = draft.data.messages.findIndex(m => String(m.id) === String(updatedMessage.id));
              if (index !== -1) {
                draft.data.messages[index] = { 
                  ...draft.data.messages[index], 
                  ...updatedMessage,
                  reactions: updatedMessage.reactions 
                };
              }
            })
          );
        }
        handleRefreshMessages();
      } else if (data.event === 'deleted') {
        const groupId = Number(group.id);
        dispatch(
          chatApi.util.updateQueryData('getChatMessages', { chat_group_id: groupId, page: pageRef.current }, (draft) => {
            draft.data.messages = draft.data.messages.filter(m => String(m.id) !== String(data.message.id));
          })
        );
        // Also update page 1
        if (pageRef.current !== 1) {
          dispatch(
            chatApi.util.updateQueryData('getChatMessages', { chat_group_id: groupId, page: 1 }, (draft) => {
              draft.data.messages = draft.data.messages.filter(m => String(m.id) !== String(data.message.id));
            })
          );
        }
      }
    });

    return () => {
      console.log("📡 [ChatView] Removing User Channel fallback listener");
      removeListener();
    };
  }, [handleNewMessage]);

  // Mark as read when opening the chat room
  React.useEffect(() => {
    if (group.id) {
      markRead({ chat_group_id: group.id });
    }
  }, [group.id]);

  // Robust connection state & foreground recovery
  React.useEffect(() => {
    console.log("📡 [ChatView] Setting up connection resilience hooks");
    
    // 1. WebSocket Reconnection recovery
    const removeConnectionListener = RealTimeNotificationService.addConnectionStateListener((isConnected) => {
      // If we go from disconnected to connected, refetch to catch up on missed messages
      if (isConnected) {
        console.log("🔄 [ChatView] WebSocket connected/reconnected - refetching messages");
        refetch();
      }
    });

    // 2. App State Foreground recovery
    const appStateSubscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        console.log("📱 [ChatView] App returned to active foreground - refetching messages");
        refetch();
      }
    });

    return () => {
      console.log("📡 [ChatView] Tearing down connection resilience hooks");
      removeConnectionListener();
      appStateSubscription.remove();
    };
  }, [refetch]);

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
      chatApi.util.updateQueryData('getChatMessages', { chat_group_id: currentGroup.id, page: 1 }, (draft) => {
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

        // Pessimistic cache update so sender sees the update instantly
        const patchCache = (pageToPatch: number) => {
          dispatch(
            chatApi.util.updateQueryData('getChatMessages', { chat_group_id: Number(currentGroup.id), page: pageToPatch }, (draft) => {
              const index = draft.data.messages.findIndex(m => String(m.id) === String(editingMessage.id));
              if (index !== -1) {
                draft.data.messages[index] = {
                  ...draft.data.messages[index],
                  content: text,
                };
              }
            })
          );
        };
        patchCache(pageRef.current);
        if (pageRef.current !== 1) {
          patchCache(1);
        }

        setEditingMessage(null);
      } else {
        const response = await sendMessage({
          chat_group_id: currentGroup.id,
          type: "text",
          content: text,
        }).unwrap();
        
        // Pessimistic cache update so sender sees the new message instantly without reload jumping
        if (response?.data?.message) {
          handleNewMessage(response.data.message);
        }
      }
    } catch (error) {
      console.error("Failed to send/update message:", error);
      Alert.alert("Error", "Failed to process message. Please try again.");
    }
  };

  const handleSendAttachment = async (type: "image" | "file" | "video", file?: any) => {
    if (!file) return;

    try {
      console.log(`📤 Starting chunked upload for ${type}:`, file.name);
      // Use chunked upload for all attachments
      const mediaData = await uploadFile(file.uri, file.name, file.type);
      
      console.log("✅ Upload successful, sending message with media:", mediaData);
      
      const response = await sendMessage({
        chat_group_id: currentGroup.id,
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

      // Pessimistic cache update for attachments
      if (response?.data?.message) {
        handleNewMessage(response.data.message);
      }

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
      
      // Pessimistic cache update so sender sees the deletion instantly
      const patchCache = (pageToPatch: number) => {
        dispatch(
          chatApi.util.updateQueryData('getChatMessages', { chat_group_id: Number(currentGroup.id), page: pageToPatch }, (draft) => {
            draft.data.messages = draft.data.messages.filter(m => String(m.id) !== String(msg.id));
          })
        );
      };
      // Apply deletion to both the current viewing page and the first page cache
      patchCache(pageRef.current);
      if (pageRef.current !== 1) {
        patchCache(1);
      }

      setShowActionMenu(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error("Failed to delete message:", error);
      Alert.alert("Error", "Failed to delete message. Please try again.");
    }
  };

  const handleDownloadFile = async () => {
    if (!selectedMessage) return;
    
    const mediaUrl = resolveMediaUrl(selectedMessage.attachment_url || selectedMessage.content);
    const filename = selectedMessage.metadata?.original_filename || (selectedMessage.type === 'image' ? 'image.jpg' : 'document.pdf');
    
    try {
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const localUri = `${FileSystem.documentDirectory}${safeName}`;
      
      const headers: Record<string, string> | undefined = token ? { Authorization: `Bearer ${token}` } : undefined;
      
      const downloadResumable = FileSystem.createDownloadResumable(
        mediaUrl,
        localUri,
        { headers }
      );

      Alert.alert("Downloading", "Please wait while the file is downloading...");
      
      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) throw new Error('Download failed');

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri);
      } else {
        Alert.alert("Error", "Sharing is not available on this device.");
      }
    } catch (error) {
      console.error("File download failed:", error);
      Alert.alert("Error", "Failed to download file.");
    }
  };

  // ── Date Separator component ────────────────────────────────────────────
  const DateSeparator = ({ date }: { date: Date }) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (isSameDay(date, today)) label = 'Today';
    else if (isSameDay(date, yesterday)) label = 'Yesterday';
    else label = format(date, 'EEE, d MMM yyyy');

    return (
      <View style={{ alignItems: 'center', marginVertical: 8 }}>
        <View style={{ backgroundColor: 'rgba(0,0,0,0.12)', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 20 }}>
          <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600' }}>{label}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100"
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
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
                {totalMembersCount} members
              </Text>
            )}
          </View>
        </TouchableOpacity>
 
        <TouchableOpacity 
          className="p-2" 
          activeOpacity={0.7}
          onPress={async () => {
            try {
              await togglePin({ chat_group_id: currentGroup.id }).unwrap();
            } catch (error) {
              console.error("Failed to toggle pin:", error);
            }
          }}
        >
          <MaterialIcons 
            name="push-pin" 
            size={22} 
            color={currentGroup.is_disabled ? "#3b82f6" : "#6b7280"} 
            style={currentGroup.is_disabled ? { transform: [{ rotate: '45deg' }] } : {}}
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

      {/*
        ── Keyboard-aware zone ────────────────────────────────────────────────
        Header is ABOVE this KAV so it never moves when keyboard opens.
        iOS:     behavior="padding" + keyboardVerticalOffset = measured header height.
                 This pushes the input bar above the keyboard correctly.
        Android: softwareKeyboardLayoutMode="pan" (app.json) pans the whole window,
                 so KAV must be a no-op (behavior=undefined) to avoid double-offset.
      */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >

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

            // Show a date separator above (i.e. rendered below in inverted list) when the day changes
            const currentDate = new Date(item.timestamp);
            const showDateSeparator = !nextChronologicalMessage ||
              !isSameDay(currentDate, new Date(nextChronologicalMessage.timestamp));

            return (
              <>
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
                {showDateSeparator && <DateSeparator date={currentDate} />}
              </>
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
                    setIsPreviewVisible(true);
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
                    handleDownloadFile();
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
                onPress={async () => {
                  if (selectedMessage?.content) {
                    await Clipboard.setStringAsync(selectedMessage.content);
                  }
                  setShowActionMenu(false);
                  Alert.alert("Copied", "Message copied to clipboard");
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
        {/* Chat Input Area */}
        {currentGroup.type !== 'system' && (
          <ChatInputBar
            onSendMessage={handleSendMessage}
            onSendAttachment={handleSendAttachment}
            initialValue={editingMessage?.content}
            isDisabled={currentGroup.is_disabled}
            isAdminsOnly={currentGroup.only_admins_can_message}
            isAdmin={isAdmin}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            onTyping={() => {
              RealTimeNotificationService.sendTypingIndicator(Number(currentGroup.id), user?.full_name || 'Someone');
            }}
          />
        )}
      </View>
      <MessageReceiptsModal
        visible={showReceiptsModal}
        onClose={() => setShowReceiptsModal(false)}
        message={selectedMessage}
      />

      <MediaPreviewModal
        visible={isPreviewVisible}
        onClose={() => setIsPreviewVisible(false)}
        mediaUrl={
          selectedMessage?.type === 'image' || selectedMessage?.type === 'video' || (selectedMessage?.type === 'file' && /\.(mp4|mov|avi|wmv|mkv)$/i.test(selectedMessage?.attachment_url || selectedMessage?.metadata?.original_filename || ''))
            ? resolveMediaUrl(selectedMessage?.attachment_url || selectedMessage?.content)
            : resolveMediaUrl(selectedMessage?.attachment_url)
        }
        mediaType={
          selectedMessage?.type === 'video' || (selectedMessage?.type === 'file' && /\.(mp4|mov|avi|wmv|mkv)$/i.test(selectedMessage?.attachment_url || selectedMessage?.metadata?.original_filename || ''))
            ? 'video'
            : selectedMessage?.type as 'image' | 'file'
        }
        filename={selectedMessage?.metadata?.original_filename}
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
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChatView;
