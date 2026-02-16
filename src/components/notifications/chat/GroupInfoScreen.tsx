import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ChatGroup, ChatMember } from "./ChatTypes";
import EditGroupModal from "./EditGroupModal";
import AddMembersModal from "./AddMembersModal";
import { 
  useGetChatGroupMembersQuery, 
  useAddChatGroupMembersMutation, 
  useRemoveChatGroupMemberMutation,
  useDeleteChatGroupMutation 
} from "../../../api/chat-api";

interface GroupInfoScreenProps {
  chat: ChatGroup;
  onBack: () => void;
  onUpdateGroup: (updatedChat: ChatGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  currentUserId: string;
}

const GroupInfoScreen: React.FC<GroupInfoScreenProps> = ({
  chat,
  onBack,
  onUpdateGroup,
  onDeleteGroup,
  currentUserId,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [page, setPage] = useState(1);

  const { data: membersData, isLoading: membersLoading, isFetching: membersFetching } = useGetChatGroupMembersQuery(
    { chat_group_id: chat.id, page, per_page: 20 },
    { skip: !chat.id }
  );

  const [addMembers] = useAddChatGroupMembersMutation();
  const [removeMember] = useRemoveChatGroupMemberMutation();
  const [deleteGroup] = useDeleteChatGroupMutation();

  const members = membersData?.data?.members || [];
  const hasMore = membersData?.data?.pagination?.has_more ?? false;
  const totalMembers = membersData?.data?.pagination?.total ?? chat.members_count ?? 0;
  
  const isOwner = chat.created_by?.toString() === currentUserId?.toString();
  const isAdmin = isOwner || chat.current_user_role === 'admin';

  const handleRemoveMember = (member: ChatMember) => {
    if (!isAdmin) return;
    
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${member.name} from the group?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            try {
              await removeMember({
                chat_group_id: chat.id,
                user_id: member.id
              }).unwrap();
            } catch (error) {
              console.error("Failed to remove member:", error);
              Alert.alert("Error", "Failed to remove member.");
            }
          }
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    if (!isOwner) return;

    Alert.alert(
      "Delete Group",
      "This action will permanently delete the group and all messages. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Group", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteGroup({ chat_group_id: chat.id }).unwrap();
              onDeleteGroup(chat.id.toString());
            } catch (error) {
              console.error("Failed to delete group:", error);
              Alert.alert("Error", "Failed to delete group.");
            }
          }
        },
      ]
    );
  };

  const loadMore = () => {
    if (hasMore && !membersFetching) {
      setPage(prev => prev + 1);
    }
  };

  const renderHeader = () => (
    <View>
      {/* Group Profile Card */}
      <View className="bg-white items-center py-8 px-4 border-b border-gray-100 shadow-sm">
        <View className="relative">
          <View className="w-28 h-28 rounded-full bg-blue-100 items-center justify-center">
            <Text className="text-blue-600 font-bold text-3xl">
              {chat.name.trim().split(' ').length >= 2 
                ? (chat.name.trim().split(' ')[0][0] + chat.name.trim().split(' ')[1][0]).toUpperCase()
                : (chat.name[0] || '?').toUpperCase()
              }
            </Text>
          </View>
          {isAdmin && (
            <TouchableOpacity 
              className="absolute bottom-0 right-0 bg-blue-600 w-10 h-10 rounded-full border-4 border-white items-center justify-center shadow-lg"
              onPress={() => setShowEditModal(true)}
            >
              <MaterialIcons name="edit" size={18} color="white" />
            </TouchableOpacity>
          )}
        </View>
        
        <Text className="text-2xl font-bold text-gray-900 mt-4 text-center">{chat.name}</Text>
        <View className="bg-blue-50 px-3 py-1 rounded-full mt-2">
          <Text className="text-blue-600 text-[10px] font-bold uppercase tracking-wider">
             {chat.type} Group
          </Text>
        </View>
        
        <View className="flex-row mt-6 space-x-2">
          <View className="items-center px-4">
            <Text className="text-gray-900 font-bold text-lg">{totalMembers}</Text>
            <Text className="text-gray-400 text-[10px] uppercase">Members</Text>
          </View>
          <View className="w-[1px] h-8 bg-gray-100 self-center" />
          <View className="items-center px-4">
            <Text className="text-gray-900 font-bold text-lg" numberOfLines={1}>
              {chat.created_by_name || 'Admin'}
            </Text>
            <Text className="text-gray-400 text-[10px] uppercase">Created by</Text>
          </View>
        </View>
      </View>

      {/* Member List Header */}
      <View className="mt-4 bg-white border-t border-gray-100 px-4 py-4 flex-row items-center justify-between border-b border-gray-50">
        <Text className="text-gray-900 font-bold text-base">Members</Text>
        {isAdmin && (
          <TouchableOpacity 
            onPress={() => setShowAddMembersModal(true)}
            className="flex-row items-center bg-blue-50 px-3 py-1.5 rounded-xl active:bg-blue-100"
          >
            <MaterialIcons name="person-add" size={18} color="#2563eb" />
            <Text className="text-blue-600 font-bold text-xs ml-1.5">Add Members</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFooter = () => (
    <View className="mb-20">
      {membersFetching && (
        <View className="py-4">
          <ActivityIndicator color="#2563eb" />
        </View>
      )}
      
      {isAdmin && (
        <View className="mt-4 px-4">
          <TouchableOpacity 
            className="bg-white flex-row items-center px-4 py-4 rounded-2xl border border-gray-100 active:bg-gray-50 shadow-sm"
            onPress={() => setShowEditModal(true)}
          >
            <View className="bg-blue-50 w-10 h-10 rounded-xl items-center justify-center mr-3">
              <MaterialIcons name="settings" size={20} color="#2563eb" />
            </View>
            <Text className="text-gray-900 font-semibold flex-1">Group Settings</Text>
            <MaterialIcons name="chevron-right" size={24} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-white flex-row items-center px-4 py-4 rounded-2xl border border-gray-100 mt-3 active:bg-gray-50 shadow-sm"
            onPress={handleDeleteGroup}
          >
            <View className="bg-red-50 w-10 h-10 rounded-xl items-center justify-center mr-3">
              <MaterialIcons name="delete-forever" size={20} color="#ef4444" />
            </View>
            <Text className="text-red-600 font-semibold flex-1">Delete Group</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderMember = ({ item: member }: { item: ChatMember }) => (
    <View
      className="flex-row items-center px-4 py-3 border-b border-gray-50 bg-white"
    >
      <View className="flex-1 ml-1">
        <View className="flex-row items-center">
          <Text className="text-gray-900 font-semibold text-[15px]">{member.name}</Text>
          {member.id.toString() === chat.created_by?.toString() && (
            <View className="bg-green-50 px-2 py-0.5 rounded-md ml-2 border border-green-100">
              <Text className="text-green-600 text-[9px] font-bold uppercase">Owner</Text>
            </View>
          )}
          {member.role === 'admin' && member.id.toString() !== chat.created_by?.toString() && (
            <View className="bg-blue-50 px-2 py-0.5 rounded-md ml-2 border border-blue-100">
              <Text className="text-blue-600 text-[9px] font-bold uppercase">Admin</Text>
            </View>
          )}
          {member.id?.toString() === currentUserId?.toString() && (
            <Text className="text-gray-400 text-[10px] ml-1.5">(You)</Text>
          )}
        </View>
        <View className="flex-row items-center">
          <Text className="text-gray-400 text-xs capitalize">{(member as any).user_role_label || 'member'}</Text>
          <View className="w-1 h-1 bg-gray-200 rounded-full mx-1.5" />
          <Text className="text-gray-400 text-[10px] uppercase tracking-tighter">{member.role || 'member'}</Text>
        </View>
      </View>
      {isAdmin && member.id?.toString() !== currentUserId?.toString() && (
        <TouchableOpacity 
          onPress={() => {
            Alert.alert(
              "Member Options",
              `Manage ${member.name}`,
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Remove from Group", 
                  style: "destructive", 
                  onPress: () => handleRemoveMember(member) 
                },
              ]
            );
          }} 
          className="p-2"
        >
          <MaterialIcons name="more-vert" size={20} color="#9ca3af" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={onBack} className="p-2 -ml-2">
          <MaterialIcons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 ml-2">Group Info</Text>
      </View>

      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !membersLoading ? (
            <View className="bg-white py-8 items-center">
              <Text className="text-gray-400">No members found</Text>
            </View>
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      {/* Modals */}
      <EditGroupModal
        visible={showEditModal}
        chat={chat}
        onClose={() => setShowEditModal(false)}
        onUpdate={(updatedData) => {
          onUpdateGroup({ ...chat, ...updatedData });
          setShowEditModal(false);
        }}
      />

      <AddMembersModal
        visible={showAddMembersModal}
        chatGroupId={chat.id}
        onClose={() => setShowAddMembersModal(false)}
        onAdd={async (selectedUsers) => {
          try {
            await addMembers({
              chat_group_id: chat.id,
              user_ids: selectedUsers.map(u => u.id)
            }).unwrap();
            setShowAddMembersModal(false);
          } catch (error) {
            console.error("Failed to add members:", error);
            Alert.alert("Error", "Failed to add members.");
          }
        }}
      />
    </View>
  );
};

export default GroupInfoScreen;
