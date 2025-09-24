import React, { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../../state-store/store";
import { logout } from "../../../state-store/slices/app-slice";
import { AuthContext } from "../../../context/AuthContext";
import { theme } from "../../../styles/theme";
import {
  USER_CATEGORIES,
  getUserCategoryDisplayName,
} from "../../../constants/userCategories";
import { getUserProfileImageSourceWithAuth } from "../../../utils/profileImageUtils";
import {
  useGetStudentDetailsByClassQuery,
  StudentDetails,
} from "../../../api/student-details-api";

interface UniversalDrawerMenuProps {
  onClose: () => void;
  showStudentDetails?: boolean;
  selectedClassId?: number;
  selectedClassName?: string;
  selectedGradeLevelName?: string;
  onBack?: () => void;
}

const UniversalDrawerMenu: React.FC<UniversalDrawerMenuProps> = ({
  onClose,
  showStudentDetails = false,
  selectedClassId,
  selectedClassName,
  selectedGradeLevelName,
  onBack,
}) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { setUser } = useContext(AuthContext);

  // Get user information from Redux
  const { user, token } = useSelector((state: RootState) => state.app);
  const userCategory = user?.user_category || USER_CATEGORIES.PARENT;
  const userDisplayName = getUserCategoryDisplayName(userCategory);

  // Student details mode state
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch students data when in student details mode
  const {
    data: studentsData,
    isLoading: studentsLoading,
    error: studentsError,
  } = useGetStudentDetailsByClassQuery(
    {
      grade_level_class_id: selectedClassId || 0,
      page: 1,
      page_size: 100,
    },
    { skip: !showStudentDetails || !selectedClassId }
  );

  // Filter students based on search
  const filteredStudents = React.useMemo(() => {
    if (!studentsData?.data?.data) return [];
    
    if (!searchQuery.trim()) return studentsData.data.data;
    
    return studentsData.data.data.filter((student: StudentDetails) =>
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.admission_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.father_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.mother_full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [studentsData, searchQuery]);

  // Get user profile information
  const userInfo = {
    name: user?.full_name || "User Name",
    email: user?.email || "user@school.com",
    role: userDisplayName,
    profileImage: user ? getUserProfileImageSourceWithAuth(user, token) : null,
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          dispatch(logout());
          setUser(null);
          router.replace("/login");
        },
      },
    ]);
  };

  // Phone call handler
  const handlePhoneCall = (phoneNumber: string, contactName: string) => {
    if (!phoneNumber || phoneNumber === "N/A") {
      Alert.alert("No Phone Number", "Phone number not available for this contact.");
      return;
    }

    const cleanedNumber = phoneNumber.replace(/[^0-9+]/g, '');
    
    Alert.alert(
      "Make Call",
      `Call ${contactName} at ${phoneNumber}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Call", 
          onPress: () => {
            Linking.openURL(`tel:${cleanedNumber}`).catch((err) => {
              Alert.alert("Error", "Unable to make phone call. Please check if your device supports calling.");
              console.error('Error making phone call:', err);
            });
          }
        }
      ]
    );
  };

  // Common menu items for all users
  const commonMenuItems = [
    {
      id: "profile",
      title: "Profile",
      icon: "person",
      onPress: () => {
        onClose();
        // Navigate to profile or open profile modal
      },
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: "notifications",
      onPress: () => {
        onClose();
        // Navigate to notifications
      },
    },
    {
      id: "help",
      title: "Help & Support",
      icon: "help",
      onPress: () => {
        onClose();
        // Navigate to help
      },
    },
    {
      id: "settings",
      title: "Settings",
      icon: "settings",
      onPress: () => {
        onClose();
        // Navigate to settings
      },
    },
    {
      id: "privacy",
      title: "Privacy Policy",
      icon: "privacy-tip",
      onPress: () => {
        onClose();
        // Navigate to privacy policy
      },
    },
    {
      id: "terms",
      title: "Terms & Conditions",
      icon: "description",
      onPress: () => {
        onClose();
        // Navigate to terms
      },
    },
  ];

  // Role-specific menu items
  const getRoleSpecificItems = () => {
    const items: any[] = [];

    // Payment section only for parents
    if (userCategory === USER_CATEGORIES.PARENT) {
      items.push({
        id: "payment",
        title: "Payment & Billing",
        icon: "payment",
        onPress: () => {
          onClose();
          // Navigate to payment section
        },
      });
    }

    // Admin-specific items
    if (
      userCategory === USER_CATEGORIES.ADMIN ||
      userCategory === USER_CATEGORIES.SENIOR_MANAGEMENT ||
      userCategory === USER_CATEGORIES.PRINCIPAL
    ) {
      items.push({
        id: "admin",
        title: "Administration",
        icon: "admin-panel-settings",
        onPress: () => {
          onClose();
          // Navigate to admin panel
        },
      });
    }

    // Educator-specific items
    if (userCategory === USER_CATEGORIES.EDUCATOR) {
      items.push({
        id: "gradebook",
        title: "Grade Book",
        icon: "book",
        onPress: () => {
          onClose();
          // Navigate to gradebook
        },
      });
    }

    // Sport coach specific items
    if (userCategory === USER_CATEGORIES.SPORT_COACH) {
      items.push({
        id: "team-management",
        title: "Team Management",
        icon: "sports",
        onPress: () => {
          onClose();
          // Navigate to team management
        },
      });
    }

    // Security specific items
    if (userCategory === USER_CATEGORIES.SECURITY) {
      items.push({
        id: "security-reports",
        title: "Security Reports",
        icon: "security",
        onPress: () => {
          onClose();
          // Navigate to security reports
        },
      });
    }

    // Toyar team specific items
    if (userCategory === USER_CATEGORIES.TOYAR_TEAM) {
      items.push({
        id: "system-admin",
        title: "System Administration",
        icon: "computer",
        onPress: () => {
          onClose();
          // Navigate to system admin
        },
      });
    }

    return items;
  };

  const roleSpecificItems = getRoleSpecificItems();

  const MenuSeparator = () => <View style={styles.separator} />;

  const MenuItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
      <MaterialIcons name={item.icon} size={24} color={theme.colors.primary} />
      <Text style={styles.menuText}>{item.title}</Text>
      <MaterialIcons name="chevron-right" size={24} color="#CCCCCC" />
    </TouchableOpacity>
  );

  // Render student details content
  const renderStudentDetailsContent = () => {
    if (studentsLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#920734" />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      );
    }

    if (studentsError) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>Failed to load students</Text>
          <Text style={styles.errorSubtext}>Please try again later</Text>
        </View>
      );
    }

    if (!filteredStudents.length) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="school" size={48} color="#999" />
          <Text style={styles.emptyText}>
            {searchQuery ? "No students found" : "No students in this class"}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? "Try a different search term" : "Students will appear here when enrolled"}
          </Text>
        </View>
      );
    }

    return (
      <>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students or parents..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Results Count */}
        <Text style={styles.resultsCount}>
          {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} found
        </Text>

        {/* Students List */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.studentsList}>
          {filteredStudents.map((student: StudentDetails) => (
            <View key={student.id} style={styles.studentCard}>
              {/* Student Header */}
              <View style={styles.studentHeader}>
                <View style={styles.studentAvatar}>
                  {student.student_attachment_list?.length > 0 ? (
                    <Image
                      source={{ uri: `${process.env.EXPO_PUBLIC_BASE_URL_API_SERVER_1}/storage/${student.student_attachment_list[0].file_name}` }}
                      style={styles.studentAvatarImage}
                    />
                  ) : (
                    <MaterialIcons name="person" size={32} color="#666" />
                  )}
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.full_name}</Text>
                  <Text style={styles.studentMeta}>
                    {student.admission_number} • {student.grade_level_class?.name || 'No Class'}
                  </Text>
                  <Text style={styles.studentMeta}>
                    {student.school_house?.name || 'No House'} • {student.gender}
                  </Text>
                </View>
              </View>

              {/* Parent Contact Cards */}
              <View style={styles.contactCardsContainer}>
                {/* Father Contact */}
                {student.father_full_name && (
                  <View style={styles.contactCard}>
                    <View style={styles.contactHeader}>
                      <MaterialIcons name="person" size={16} color="#920734" />
                      <Text style={styles.contactRole}>Father</Text>
                    </View>
                    <Text style={styles.contactName}>{student.father_full_name}</Text>
                    <View style={styles.contactActions}>
                      {student.father_phone && student.father_phone !== "N/A" && (
                        <TouchableOpacity 
                          style={styles.phoneButton}
                          onPress={() => handlePhoneCall(student.father_phone || "", `${student.father_full_name || 'Father'} (Father)`)}
                        >
                          <MaterialIcons name="phone" size={16} color="#FFFFFF" />
                          <Text style={styles.phoneButtonText}>{student.father_phone}</Text>
                        </TouchableOpacity>
                      )}
                      {student.father_whatsapp && student.father_whatsapp !== "N/A" && (
                        <TouchableOpacity 
                          style={styles.whatsappButton}
                          onPress={() => handlePhoneCall(student.father_whatsapp || "", `${student.father_full_name || 'Father'} (WhatsApp)`)}
                        >
                          <MaterialIcons name="chat" size={16} color="#FFFFFF" />
                          <Text style={styles.phoneButtonText}>{student.father_whatsapp}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* Mother Contact */}
                {student.mother_full_name && (
                  <View style={styles.contactCard}>
                    <View style={styles.contactHeader}>
                      <MaterialIcons name="person" size={16} color="#920734" />
                      <Text style={styles.contactRole}>Mother</Text>
                    </View>
                    <Text style={styles.contactName}>{student.mother_full_name}</Text>
                    <View style={styles.contactActions}>
                      {student.mother_phone && student.mother_phone !== "N/A" && (
                        <TouchableOpacity 
                          style={styles.phoneButton}
                          onPress={() => handlePhoneCall(student.mother_phone || "", `${student.mother_full_name || 'Mother'} (Mother)`)}
                        >
                          <MaterialIcons name="phone" size={16} color="#FFFFFF" />
                          <Text style={styles.phoneButtonText}>{student.mother_phone}</Text>
                        </TouchableOpacity>
                      )}
                      {student.mother_whatsapp && student.mother_whatsapp !== "N/A" && (
                        <TouchableOpacity 
                          style={styles.whatsappButton}
                          onPress={() => handlePhoneCall(student.mother_whatsapp || "", `${student.mother_full_name || 'Mother'} (WhatsApp)`)}
                        >
                          <MaterialIcons name="chat" size={16} color="#FFFFFF" />
                          <Text style={styles.phoneButtonText}>{student.mother_whatsapp}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* Guardian Contact */}
                {student.guardian_full_name && (
                  <View style={styles.contactCard}>
                    <View style={styles.contactHeader}>
                      <MaterialIcons name="person" size={16} color="#920734" />
                      <Text style={styles.contactRole}>Guardian</Text>
                    </View>
                    <Text style={styles.contactName}>{student.guardian_full_name}</Text>
                    <View style={styles.contactActions}>
                      {student.guardian_phone && student.guardian_phone !== "N/A" && (
                        <TouchableOpacity 
                          style={styles.phoneButton}
                          onPress={() => handlePhoneCall(student.guardian_phone || "", `${student.guardian_full_name || 'Guardian'} (Guardian)`)}
                        >
                          <MaterialIcons name="phone" size={16} color="#FFFFFF" />
                          <Text style={styles.phoneButtonText}>{student.guardian_phone}</Text>
                        </TouchableOpacity>
                      )}
                      {student.guardian_whatsapp && student.guardian_whatsapp !== "N/A" && (
                        <TouchableOpacity 
                          style={styles.whatsappButton}
                          onPress={() => handlePhoneCall(student.guardian_whatsapp || "", `${student.guardian_full_name || 'Guardian'} (WhatsApp)`)}
                        >
                          <MaterialIcons name="chat" size={16} color="#FFFFFF" />
                          <Text style={styles.phoneButtonText}>{student.guardian_whatsapp}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* Additional Student Details */}
              <View style={styles.studentDetails}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="cake" size={16} color="#666" />
                  <Text style={styles.detailLabel}>DOB:</Text>
                  <Text style={styles.detailValue}>{new Date(student.date_of_birth).toLocaleDateString()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="local-hospital" size={16} color="#666" />
                  <Text style={styles.detailLabel}>Blood:</Text>
                  <Text style={styles.detailValue}>{student.blood_group}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="home" size={16} color="#666" />
                  <Text style={styles.detailLabel}>House:</Text>
                  <Text style={styles.detailValue}>{student.school_house?.name || 'Not assigned'}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </>
    );
  };

  const drawerContent = (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {showStudentDetails && onBack ? (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {showStudentDetails ? "My Class" : "Menu"}
          </Text>
          {showStudentDetails && selectedClassName && (
            <Text style={styles.headerSubtitle}>
              {selectedClassName} - {selectedGradeLevelName}
            </Text>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {showStudentDetails ? (
          renderStudentDetailsContent()
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* User Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.profileAvatar}>
                {userInfo.profileImage ? (
                  <Image source={userInfo.profileImage} style={styles.profileImage} />
                ) : (
                  <MaterialIcons name="person" size={40} color="#CCCCCC" />
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{userInfo.name}</Text>
                <Text style={styles.profileRole}>{userInfo.role}</Text>
                <Text style={styles.profileEmail}>{userInfo.email}</Text>
              </View>
            </View>

            <MenuSeparator />

            {/* Role-specific Items */}
            {roleSpecificItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}

            {roleSpecificItems.length > 0 && <MenuSeparator />}

            {/* Common Menu Items */}
            {commonMenuItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}

            <MenuSeparator />

            {/* Logout */}
            <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
              <MaterialIcons name="logout" size={24} color="#FF3B30" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>School App v1.0.0</Text>
              <Text style={styles.footerSubtext}>Toyar Technologies</Text>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );

  // Wrap in Modal for full screen when showing student details
  if (showStudentDetails) {
    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {drawerContent}
      </Modal>
    );
  }

  // Return regular drawer for menu
  return drawerContent;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40, // Same width as close button for centering
  },
  content: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 1,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 15,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  separator: {
    height: 8,
    backgroundColor: "#F0F0F0",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a1a",
    marginLeft: 15,
  },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    color: "#FF3B30",
    fontWeight: "600",
    marginLeft: 15,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#999999",
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  // Student Details Styles
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
    opacity: 0.8,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a1a",
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: "#666",
    marginHorizontal: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F44336",
    marginTop: 16,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  studentsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  studentCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  studentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  studentAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  studentMeta: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  contactCardsContainer: {
    marginBottom: 16,
  },
  contactCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  contactRole: {
    fontSize: 12,
    fontWeight: "600",
    color: "#920734",
    marginLeft: 4,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  contactActions: {
    flexDirection: "row",
    gap: 8,
  },
  phoneButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#34C759",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flex: 1,
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25D366",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flex: 1,
  },
  phoneButtonText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
    marginLeft: 4,
  },
  studentDetails: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    marginRight: 8,
    minWidth: 40,
  },
  detailValue: {
    fontSize: 12,
    color: "#1a1a1a",
    flex: 1,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  profileRole: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
    marginBottom: 2,
  },
});

export default UniversalDrawerMenu;
