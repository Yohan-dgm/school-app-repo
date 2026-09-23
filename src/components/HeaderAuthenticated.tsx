import React, { useState } from "react";
import {
  Image,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";

import { Menu } from "@/lib/icons/Menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSelector, useDispatch } from "react-redux";
import {
  USER_CATEGORIES,
  getUserCategoryDisplayName,
} from "@/constants/userCategories";
import { setSelectedStudent } from "@/state-store/slices/app-slice";
import {
  getStudentProfilePicture,
  getDefaultStudentProfileImage,
  getLocalFallbackProfileImage,
} from "../utils/studentProfileUtils";
export default function HeaderAuthenticated() {
  const dispatch = useDispatch();
  const [showStudentModal, setShowStudentModal] = useState(false);

  // Get global state
  const { sessionData, selectedStudent } = useSelector(
    (state: any) => state.app,
  );

  // Get user category from session data
  const userCategory =
    sessionData?.user_category ||
    sessionData?.data?.user_category ||
    USER_CATEGORIES.PARENT;
  const isParent = userCategory === USER_CATEGORIES.PARENT;

  // Mock students data for parent (this should come from API in real implementation)
  const mockStudents = [
    {
      id: 1,
      name: "Emma Johnson",
      student_calling_name: "Emma",
      admission_number: "2024001",
      grade: "Grade 10",
    },
    {
      id: 2,
      name: "Michael Johnson",
      student_calling_name: "Mike",
      admission_number: "2024002",
      grade: "Grade 8",
    },
    {
      id: 3,
      name: "Sarah Johnson",
      student_calling_name: "Sarah",
      admission_number: "2024003",
      grade: "Grade 12",
    },
  ];

  // Handle student selection
  const handleStudentSelect = (student: any) => {
    dispatch(setSelectedStudent(student));
    setShowStudentModal(false);
  };

  // Get profile picture for the selected student
  const profilePictureSource = selectedStudent
    ? getStudentProfilePicture(selectedStudent)
    : null;

  // Fallback to default image if no profile picture
  const profileImage = profilePictureSource || getDefaultStudentProfileImage();

  // If still no profile image, use local fallback
  const finalProfileImage = profileImage || getLocalFallbackProfileImage();

  // Debug log
  console.log("🖼️ HeaderAuthenticated - Profile picture:", {
    selectedStudent: selectedStudent?.id,
    selectedStudentName: selectedStudent?.student_calling_name,
    profilePictureSource,
    profileImage,
    finalProfileImage,
    hasSelectedStudent: !!selectedStudent,
    selectedStudentKeys: selectedStudent ? Object.keys(selectedStudent) : [],
  });

  return (
    <View className="flex flex-col w-full pt-[8px] bg-[#2569CF]">
      {/*  */}
      <View className="flex flex-row w-full justify-end items-center px-[16px]">
        {isParent ? (
          <TouchableOpacity
            className="flex flex-row items-center"
            onPress={() => setShowStudentModal(true)}
          >
            <Text className="text-[#fff] opacity-[0.75]">
              {selectedStudent
                ? `Selected: ${selectedStudent.student_calling_name || selectedStudent.name || "Student"}`
                : "Select Student"}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text className="text-[#fff] opacity-[0.75]">
            {getUserCategoryDisplayName(userCategory)} Account
          </Text>
        )}
      </View>
      {/*  */}
      <View className="flex flex-row w-full justify-between items-center px-[16px]">
        <View>
          <Menu
            className="opacity-[0.75]"
            size={32}
            color="#fff"
            onTouchStart={() => {
              console.log("Menu Open");
            }}
          />
        </View>

        <View className="min-w-[164px] h-[48px]">
          <Image
            source={require("@/assets/images/nexis-logo.png")}
            className="w-[164px] h-[48px]"
            resizeMethod="resize"
            resizeMode="contain"
          />
        </View>
        <View className="flex flex-row justify-end">
          <ThemeToggle />

          {/* Test with regular Image component */}
          <View className="w-[48px] h-[48px] rounded-full overflow-hidden mr-2">
            <Image
              source={finalProfileImage}
              style={{ width: 48, height: 48 }}
              onError={(e) => {
                console.log("🖼️ Test Image Error:", e.nativeEvent);
              }}
              onLoad={() => console.log("🖼️ Test Image Loaded Successfully")}
              resizeMode="cover"
            />
          </View>

          <Avatar alt="" className="w-[48px] h-[48px]">
            <AvatarImage
              source={finalProfileImage}
              onError={(e) => {
                console.log("🖼️ Avatar Image Error:", e.nativeEvent);
                // Try local fallback on error
                return getLocalFallbackProfileImage();
              }}
              onLoad={() => console.log("🖼️ Avatar Image Loaded Successfully")}
            />
            <AvatarFallback>
              <Text>N</Text>
            </AvatarFallback>
          </Avatar>
        </View>
      </View>
      {/*  */}
      <View className="flex flex-row justify-between items-center w-full h-[48px] bg-[rgba(255,255,255,0.15)] mt-[8px] py-[8px] px-[16px]">
        <Text className="text-[rgba(255,255,255,0.45)] text-[12px] max-w-[50%]">
          Nexis College International - Yakkala
        </Text>
        <View className="gap-[8px] flex flex-row justify-end items-center bg-[rgba(0,0,0,0.05)] rounded-[18px] h-[36px] pr-[8px] border-solid border-[rgba(255,255,255,0.25)] border-[1px]">
          <Avatar alt="" className="w-[32px] h-[32px]">
            <AvatarImage source={profileImage} />
            <AvatarFallback>
              <Text>N</Text>
            </AvatarFallback>
          </Avatar>
          <Text className="text-[#fff]">
            {selectedStudent?.student_calling_name || "Student"}
          </Text>
        </View>
      </View>

      {/* Student Selection Modal for Parents */}
      {isParent && (
        <Modal
          visible={showStudentModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowStudentModal(false)}
        >
          <View className="items-center justify-center flex-1 bg-black/50">
            <View className="p-4 mx-4 bg-white rounded-lg w-80 max-h-96">
              <Text className="mb-4 text-lg font-semibold text-center">
                Select Student
              </Text>

              <FlatList
                data={mockStudents}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className={`p-3 border-b border-gray-200 ${selectedStudent?.id === item.id ? "bg-blue-50" : ""}`}
                    onPress={() => handleStudentSelect(item)}
                  >
                    <Text className="font-medium text-gray-900">
                      {item.student_calling_name}
                    </Text>
                    <Text className="text-sm text-gray-600">{item.name}</Text>
                    <Text className="text-xs text-gray-500">
                      {item.admission_number} - {item.grade}
                    </Text>
                  </TouchableOpacity>
                )}
              />

              <TouchableOpacity
                className="p-3 mt-4 bg-gray-200 rounded-lg"
                onPress={() => setShowStudentModal(false)}
              >
                <Text className="font-medium text-center text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
