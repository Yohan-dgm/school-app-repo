import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../../../../styles/theme";
import {
  useGetSectionAccessListDataQuery,
  useSearchGrantableUsersQuery,
  useGrantSectionAccessMutation,
  useRevokeSectionAccessMutation,
  GrantableUser,
} from "../../../../../api/section-access-api";
import { getUserCategoryName } from "../../../../../constants/userCategories";

interface SectionAccessManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

const SECTION_KEYS: { key: string; label: string }[] = [
  { key: "canteen_management", label: "Canteen Management" },
  { key: "discipline_management", label: "Discipline Management" },
];

const getApiErrorMessage = (error: any): string => {
  return (
    error?.data?.message ||
    error?.data?.error ||
    error?.error ||
    "Something went wrong. Please try again."
  );
};

const SectionAccessManagementModal: React.FC<
  SectionAccessManagementModalProps
> = ({ visible, onClose }) => {
  const [selectedKey, setSelectedKey] = useState(SECTION_KEYS[0].key);
  const [view, setView] = useState<"list" | "form">("list");
  const [searchPhrase, setSearchPhrase] = useState("");

  const {
    data: grantListData,
    isLoading: isLoadingGrants,
    error: grantListError,
  } = useGetSectionAccessListDataQuery(
    { section_key: selectedKey },
    { skip: !visible },
  );
  const grants = grantListData?.data || [];

  const { data: searchData, isFetching: isSearching } =
    useSearchGrantableUsersQuery(
      { search_phrase: searchPhrase },
      { skip: !visible || view !== "form" || searchPhrase.trim().length < 2 },
    );
  const searchResults = searchData?.data || [];

  const [grantSectionAccess, { isLoading: isGranting }] =
    useGrantSectionAccessMutation();
  const [revokeSectionAccess] = useRevokeSectionAccessMutation();

  const handleClose = () => {
    setView("list");
    setSearchPhrase("");
    onClose();
  };

  const handleGrant = async (user: GrantableUser) => {
    try {
      await grantSectionAccess({
        user_id: user.id,
        section_key: selectedKey,
      }).unwrap();
      setSearchPhrase("");
      setView("list");
    } catch (error) {
      Alert.alert("Failed", getApiErrorMessage(error));
    }
  };

  const handleRevoke = (userId: number, userName: string) => {
    Alert.alert(
      "Revoke Access",
      `Remove ${userName}'s access to this section?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              await revokeSectionAccess({
                user_id: userId,
                section_key: selectedKey,
              }).unwrap();
            } catch (error) {
              Alert.alert("Failed", getApiErrorMessage(error));
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {view === "form" ? (
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => {
                setSearchPhrase("");
                setView("list");
              }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#920734" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerIconButton} />
          )}
          <Text style={styles.headerTitle}>
            {view === "form" ? "Grant Access" : "Section Access Management"}
          </Text>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={handleClose}
          >
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {view === "list" ? (
          <>
            {/* Section key selector */}
            <View style={styles.keySelectorRow}>
              {SECTION_KEYS.map((item) => {
                const isActive = selectedKey === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.keyChip, isActive && styles.keyChipActive]}
                    onPress={() => setSelectedKey(item.key)}
                  >
                    <Text
                      style={[
                        styles.keyChipText,
                        isActive && styles.keyChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.searchRow}>
              <Text style={styles.grantedCountText}>
                {grants.length} user{grants.length === 1 ? "" : "s"} granted
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setView("form")}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Grant Access</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.listScroll}
              showsVerticalScrollIndicator={false}
            >
              {isLoadingGrants && (
                <View style={styles.stateContainer}>
                  <ActivityIndicator color="#920734" />
                  <Text style={styles.stateText}>Loading...</Text>
                </View>
              )}
              {!isLoadingGrants && grantListError && (
                <View style={styles.stateContainer}>
                  <MaterialIcons
                    name="error-outline"
                    size={28}
                    color="#DC2626"
                  />
                  <Text style={[styles.stateText, styles.stateErrorText]}>
                    Failed to load access list
                  </Text>
                </View>
              )}
              {!isLoadingGrants && !grantListError && grants.length === 0 && (
                <View style={styles.stateContainer}>
                  <MaterialIcons
                    name="lock-outline"
                    size={36}
                    color="#CCCCCC"
                  />
                  <Text style={styles.stateText}>
                    No one has been granted this access yet
                  </Text>
                </View>
              )}

              {grants.map((grant) => (
                <View key={grant.id} style={styles.grantRow}>
                  <View style={styles.grantRowBody}>
                    <Text style={styles.grantRowName} numberOfLines={1}>
                      {grant.user?.full_name || `User #${grant.user_id}`}
                    </Text>
                    {!!grant.user?.username && (
                      <Text style={styles.grantRowMeta} numberOfLines={1}>
                        {grant.user.username}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.revokeButton}
                    onPress={() =>
                      handleRevoke(
                        grant.user_id,
                        grant.user?.full_name || `User #${grant.user_id}`,
                      )
                    }
                  >
                    <Text style={styles.revokeButtonText}>Revoke</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={styles.searchInputRow}>
              <View style={styles.searchInputWrapper}>
                <MaterialIcons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, username or email"
                  placeholderTextColor="#9CA3AF"
                  value={searchPhrase}
                  onChangeText={setSearchPhrase}
                  autoFocus
                />
              </View>
            </View>

            <ScrollView
              style={styles.listScroll}
              showsVerticalScrollIndicator={false}
            >
              {searchPhrase.trim().length < 2 && (
                <View style={styles.stateContainer}>
                  <Text style={styles.stateText}>
                    Type at least 2 characters to search
                  </Text>
                </View>
              )}
              {searchPhrase.trim().length >= 2 && isSearching && (
                <View style={styles.stateContainer}>
                  <ActivityIndicator color="#920734" />
                </View>
              )}
              {searchPhrase.trim().length >= 2 &&
                !isSearching &&
                searchResults.length === 0 && (
                  <View style={styles.stateContainer}>
                    <Text style={styles.stateText}>No users found</Text>
                  </View>
                )}

              {searchResults.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.grantRow}
                  onPress={() => handleGrant(user)}
                  disabled={isGranting}
                >
                  <View style={styles.grantRowBody}>
                    <Text style={styles.grantRowName} numberOfLines={1}>
                      {user.full_name}
                    </Text>
                    <Text style={styles.grantRowMeta} numberOfLines={1}>
                      {user.username} ·{" "}
                      {getUserCategoryName(user.user_category)}
                    </Text>
                  </View>
                  <MaterialIcons name="person-add" size={20} color="#920734" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerIconButton: { width: 40, alignItems: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: "#111827",
  },
  keySelectorRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  keyChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  keyChipActive: { backgroundColor: "#920734" },
  keyChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#6B7280",
  },
  keyChipTextActive: { color: "#FFFFFF", fontFamily: theme.fonts.bold },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  grantedCountText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: "#6B7280",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#920734",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addButtonText: {
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    color: "#FFFFFF",
  },
  searchInputRow: { paddingHorizontal: 16, paddingVertical: 12 },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#111827",
  },
  listScroll: { flex: 1, paddingHorizontal: 16 },
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    gap: theme.spacing.sm,
  },
  stateText: { fontFamily: theme.fonts.medium, fontSize: 14, color: "#920734" },
  stateErrorText: { color: "#DC2626" },
  grantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  grantRowBody: { flex: 1, marginRight: 10 },
  grantRowName: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#111827",
  },
  grantRowMeta: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  revokeButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  revokeButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#DC2626",
  },
});

export default SectionAccessManagementModal;
