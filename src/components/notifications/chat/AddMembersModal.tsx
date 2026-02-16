import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { User } from "./ChatTypes";
import { useSearchChatUsersQuery } from "../../../api/chat-api";
import { useEffect } from "react";
import { ActivityIndicator } from "react-native";

interface AddMembersModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (selectedUsers: User[]) => void;
  chatGroupId?: string | number;
}

const FILTERS: { label: string; value: any }[] = [
  { label: "All", value: "all" },
  { label: "Educator", value: "teacher" },
  { label: "Student", value: "student" },
  { label: "Parent", value: "parent" },
  { label: "Management", value: "management" },
];

const AddMembersModal: React.FC<AddMembersModalProps> = ({ visible, onClose, onAdd, chatGroupId }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<any>("all");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);

  const { data: searchData, isFetching } = useSearchChatUsersQuery(
    {
      query: searchQuery,
      filter: activeFilter,
      chat_group_id: chatGroupId,
      per_page: 20,
      page: page,
    },
    { skip: !visible }
  );

  // Reset search when filter or query changes
  useEffect(() => {
    setPage(1);
    setUsers([]);
  }, [searchQuery, activeFilter]);

  // Append results when searchData changes
  useEffect(() => {
    if (searchData?.data?.data) {
      if (page === 1) {
        setUsers(searchData.data.data);
      } else {
        // Only append unique users
        setUsers(prev => {
          const newUsers = searchData.data.data.filter(
            nu => !prev.some(pu => pu.id === nu.id)
          );
          return [...prev, ...newUsers];
        });
      }
    }
  }, [searchData, page]);

  const loadMore = () => {
    const currentPage = searchData?.data?.current_page;
    const lastPage = searchData?.data?.last_page;
    if (currentPage && lastPage && currentPage < lastPage && !isFetching) {
      setPage(prev => prev + 1);
    }
  };

  const toggleUserSelection = (user: User) => {
    if (selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleAdd = () => {
    if (selectedUsers.length > 0) {
      onAdd(selectedUsers);
      setSelectedUsers([]);
      setSearchQuery("");
      setActiveFilter("all");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/40">
        <View className="flex-1 mt-14 bg-white rounded-t-[40px] shadow-2xl overflow-hidden">
          {/* Header */}
          <View className="px-6 py-6 border-b border-gray-50 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={onClose} className="mr-3">
                <MaterialIcons name="close" size={26} color="#374151" />
              </TouchableOpacity>
              <Text className="text-xl font-bold text-gray-900">Add Members</Text>
            </View>
            {selectedUsers.length > 0 && (
              <TouchableOpacity 
                onPress={handleAdd}
                className="bg-blue-600 px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-bold text-sm">Add ({selectedUsers.length})</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search and Filters */}
          <View className="p-4 bg-white border-b border-gray-50">
            <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 h-12 mb-4">
              <MaterialIcons name="search" size={20} color="#9ca3af" />
              <TextInput
                placeholder="Search by name, role, or grade..."
                className="flex-1 ml-2 text-sm text-gray-900"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  onPress={() => setActiveFilter(f.value)}
                  className={`mr-2 px-6 py-2.5 rounded-full border ${
                    activeFilter === f.value 
                      ? "bg-gray-900 border-gray-900" 
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-xs font-bold ${activeFilter === f.value ? "text-white" : "text-gray-500"}`}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Selected Users Chips */}
          {selectedUsers.length > 0 && (
            <View className="py-2 bg-gray-50 border-b border-gray-100">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2">
                {selectedUsers.map((user) => (
                  <View key={user.id} className="mr-2 bg-white border border-blue-100 rounded-full flex-row items-center px-3 py-1 shadow-sm">
                    <Text className="text-[11px] font-bold text-gray-900 mr-1.5">{user.name}</Text>
                    <TouchableOpacity onPress={() => toggleUserSelection(user)}>
                      <MaterialIcons name="cancel" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* User List */}
          <FlatList
            data={users}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetching && page > 1 ? (
                <View className="py-4 items-center">
                  <ActivityIndicator color="#2563eb" />
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const isSelected = selectedUsers.some((u) => u.id === item.id);
              const isMember = item.is_member;
              
              return (
                <TouchableOpacity
                  onPress={() => !isMember && toggleUserSelection(item)}
                  className={`flex-row items-center px-4 py-3 border-b border-gray-50 ${isMember ? "bg-gray-50/50" : "active:bg-gray-50"}`}
                  activeOpacity={isMember ? 1 : 0.7}
                  disabled={isMember}
                >
                  <View className="relative">
                    <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center border border-gray-100">
                      <MaterialIcons name="person" size={24} color="#9ca3af" />
                    </View>
                    {isSelected && (
                      <View className="absolute -top-1 -right-1 bg-blue-600 rounded-full w-5 h-5 items-center justify-center border-2 border-white">
                        <MaterialIcons name="check" size={12} color="white" />
                      </View>
                    )}
                  </View>
                  <View className="flex-1 ml-3">
                    <View className="flex-row items-center">
                      <Text className={`font-semibold text-[15px] ${isMember ? "text-gray-400" : "text-gray-900"}`}>{item.name}</Text>
                      {isMember && (
                        <View className="bg-gray-100 px-2 py-0.5 rounded-md ml-2">
                          <Text className="text-gray-400 text-[9px] font-bold uppercase">Member</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-gray-400 text-xs capitalize">{item.role}</Text>
                  </View>
                  {!isMember && (
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected ? "bg-blue-600 border-blue-600" : "border-gray-200"}`}>
                      {isSelected && <MaterialIcons name="check" size={14} color="white" />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center pt-20 px-8">
                {isFetching ? (
                   <Text className="text-gray-500 font-bold mt-4">Searching...</Text>
                ) : (
                  <>
                    <MaterialIcons name="person-off" size={64} color="#d1d5db" />
                    <Text className="text-gray-500 font-bold mt-4">No users found</Text>
                    <Text className="text-gray-400 text-center mt-2">Try a different name or filter.</Text>
                  </>
                )}
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

export default AddMembersModal;
