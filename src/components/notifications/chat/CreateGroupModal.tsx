import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { GroupCategory } from "./ChatTypes";
import GradeLevelSelector from "../../announcements/GradeLevelSelector";
import StudentSelector from "../../announcements/StudentSelector";

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (data: { name: string; description: string; category: GroupCategory, selectionData?: any, is_disabled?: boolean }) => void;
}

interface GroupTypeOption {
  id: GroupCategory;
  name: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}

const GROUP_TYPES: GroupTypeOption[] = [
  {
    id: "all",
    name: "All",
    description: "Includes all users in the school",
    icon: "public",
    color: "#3b82f6",
  },
  {
    id: "educator",
    name: "Educator",
    description: "Teachers and academic staff only",
    icon: "school",
    color: "#10b981",
  },
  {
    id: "management",
    name: "Management",
    description: "School management and administrators",
    icon: "admin-panel-settings",
    color: "#7c2d3e",
  },
  {
    id: "grade_level",
    name: "Grade Level",
    description: "All users within a selected grade",
    icon: "layers",
    color: "#f59e0b",
  },
  {
    id: "class",
    name: "Grade Level – Class",
    description: "Specific class within a grade",
    icon: "meeting-room",
    color: "#8b5cf6",
  },
  {
    id: "student",
    name: "Student",
    description: "Select specific students",
    icon: "groups",
    color: "#ef4444",
  },
];

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ visible, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<GroupCategory | null>(null);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [is_disabled, setIsDisabled] = useState(true); // Default to true as per request

  // New Selection State
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setStep(1);
      setSelectedType(null);
      setGroupName("");
      setDescription("");
      setIsDisabled(true);
      setSelectedGradeLevelId(null);
      setSelectedClassId(null);
      setSelectedStudentIds([]);
    }
  }, [visible]);

  const requiresSelectionStep = (type: GroupCategory | null) => {
    return type === "grade_level" || type === "class" || type === "student";
  };

  const handleNext = () => {
    if (step === 1 && selectedType) {
      if (requiresSelectionStep(selectedType)) {
        setStep(2);
      } else {
        setStep(3); // Skip selection if not needed
      }
    } else if (step === 2) {
      // Validate selection
      if (selectedType === "grade_level" && !selectedGradeLevelId) {
        Alert.alert("Required", "Please select a grade level.");
        return;
      }
      if (selectedType === "class" && !selectedClassId) {
         Alert.alert("Required", "Please select a class.");
         return;
      }
      if (selectedType === "student" && selectedStudentIds.length === 0) {
        Alert.alert("Required", "Please select a student.");
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 3) {
      if (selectedType && requiresSelectionStep(selectedType)) {
        setStep(2);
      } else {
        setStep(1);
      }
    } else if (step === 2) {
      setStep(1);
    } else {
      onClose();
    }
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      Alert.alert("Required", "Please enter a group name.");
      return;
    }
    if (selectedType) {
      const selectionData: any = {};
      if (selectedType === 'grade_level') {
          selectionData.grade_level_id = selectedGradeLevelId;
      } else if (selectedType === 'class') {
          selectionData.grade_level_id = selectedGradeLevelId;
          selectionData.grade_level_class_id = selectedClassId;
      } else if (selectedType === 'student') {
          selectionData.student_ids = selectedStudentIds;
      }

      onSuccess({
        name: groupName,
        description: description,
        category: selectedType,
        selectionData,
        is_disabled,
      });
    }
  };

  const renderStep1 = () => (
    <View className="flex-1 px-4">
      <Text className="text-gray-500 mb-6">
        Select the group type to define who can participate.
      </Text>
      
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="flex-row flex-wrap justify-between pb-6">
          {GROUP_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              activeOpacity={0.7}
              onPress={() => setSelectedType(type.id)}
              className={`w-[48%] mb-4 p-4 rounded-3xl border-2 bg-white shadow-sm ${
                selectedType === type.id ? "border-blue-500 bg-blue-50/30" : "border-gray-50"
              }`}
            >
              <View 
                className="w-10 h-10 rounded-2xl items-center justify-center mb-3"
                style={{ backgroundColor: type.color + '20' }}
              >
                <MaterialIcons name={type.icon} size={24} color={type.color} />
              </View>
              <Text className="text-[15px] font-bold text-gray-900 mb-1">{type.name}</Text>
              <Text className="text-[11px] text-gray-500 leading-4">{type.description}</Text>
              
              {selectedType === type.id && (
                <View className="absolute top-3 right-3">
                  <MaterialIcons name="check-circle" size={18} color="#3b82f6" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View className="py-6">
        <TouchableOpacity
          disabled={!selectedType}
          onPress={handleNext}
          className={`h-14 rounded-2xl items-center justify-center shadow-lg ${
            selectedType ? "bg-blue-600" : "bg-gray-200"
          }`}
        >
          <Text className={`text-lg font-bold ${selectedType ? "text-white" : "text-gray-400"}`}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View className="flex-1 px-4">
       <Text className="text-gray-500 mb-4">
          Select members for the {GROUP_TYPES.find(t => t.id === selectedType)?.name} group.
       </Text>
       <View className="flex-1">
          {(selectedType === "grade_level" || selectedType === "class") && (
              <GradeLevelSelector
                  targetType={selectedType === "grade_level" ? "Grade_Level" : "Grade_Level_class"}
                  selectedGradeLevelId={selectedGradeLevelId}
                  selectedClassId={selectedClassId}
                  onGradeLevelChange={(id, classId) => {
                      setSelectedGradeLevelId(id);
                      setSelectedClassId(classId);
                  }}
                  onClassChange={setSelectedClassId}
              />
          )}

          {selectedType === "student" && (
              <StudentSelector 
                  selectedStudentIds={selectedStudentIds}
                  onSelectionChange={setSelectedStudentIds}
                  multiSelect={false}
              />
          )}
       </View>

       <View className="flex-row space-x-4 mt-auto py-6">
        <TouchableOpacity
          onPress={handleBack}
          className="flex-1 h-14 rounded-2xl items-center justify-center bg-gray-100"
        >
          <Text className="text-lg font-bold text-gray-600">Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handleNext}
          className="flex-[2] h-14 rounded-2xl items-center justify-center shadow-lg bg-blue-600"
        >
          <Text className="text-lg font-bold text-white">
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View className="flex-1 px-4">
      <Text className="text-gray-500 mb-8">
        Provide basic details for your new {GROUP_TYPES.find(t => t.id === selectedType)?.name} group.
      </Text>

      <View className="space-y-6">
        {/* Group Name */}
        <View>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-bold text-gray-700 ml-1">Group Name *</Text>
            <Text className={`text-[10px] ${groupName.length >= 50 ? "text-red-500" : "text-gray-400"}`}>
              {groupName.length}/50
            </Text>
          </View>
          <TextInput
            placeholder="e.g. All School Announcements"
            placeholderTextColor="#9ca3af"
            maxLength={50}
            className="bg-gray-50 rounded-2xl px-4 py-4 text-gray-900 border border-gray-100"
            value={groupName}
            onChangeText={setGroupName}
          />
        </View>

        {/* Group Description */}
        <View className="mt-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-bold text-gray-700 ml-1">Purpose (Optional)</Text>
            <Text className={`text-[10px] ${description.length >= 150 ? "text-red-500" : "text-gray-400"}`}>
              {description.length}/150
            </Text>
          </View>
          <TextInput
            placeholder="What is this group for?"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            maxLength={150}
            className="bg-gray-50 rounded-2xl px-4 py-4 text-gray-900 border border-gray-100 h-32"
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Admin Only Toggle */}
        <View className="mt-6 flex-row items-center justify-between bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
          <View className="flex-1 mr-4">
            <Text className="text-[15px] font-bold text-blue-700 mb-1">Message Admin Only</Text>
            <Text className="text-xs text-blue-500">Only admins can send messages to this group by default</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setIsDisabled(!is_disabled)}
            className={`w-12 h-6 rounded-full items-center justify-center ${is_disabled ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <View className={`w-4 h-4 bg-white rounded-full absolute ${is_disabled ? 'right-1' : 'left-1'}`} />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row space-x-4 mt-auto py-6">
        <TouchableOpacity
          onPress={handleBack}
          className="flex-1 h-14 rounded-2xl items-center justify-center bg-gray-100"
        >
          <Text className="text-lg font-bold text-gray-600">Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          disabled={!groupName.trim()}
          onPress={handleCreate}
          className={`flex-[2] h-14 rounded-2xl items-center justify-center shadow-lg ${
            groupName.trim() ? "bg-green-600" : "bg-gray-200"
          }`}
        >
          <Text className={`text-lg font-bold ${groupName.trim() ? "text-white" : "text-gray-400"}`}>
            Create Group
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/40">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 mt-20 bg-white rounded-t-[40px] shadow-2xl">
            {/* Modal Header */}
            <View className="px-6 py-8 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <TouchableOpacity onPress={handleBack} className="mr-3">
                  <MaterialIcons name={step > 1 ? "arrow-back" : "close"} size={28} color="#374151" />
                </TouchableOpacity>
                <View>
                  <Text className="text-2xl font-bold text-gray-900">
                    {step === 1 ? "Create New Chat Group" : step === 2 && requiresSelectionStep(selectedType) ? "Select Members" : "Group Details"}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <View className={`h-1.5 w-8 rounded-full ${step >= 1 ? "bg-blue-600" : "bg-gray-200"}`} />
                     {requiresSelectionStep(selectedType) && (
                         <View className={`h-1.5 w-8 rounded-full ml-1 ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`} />
                     )}
                    <View className={`h-1.5 w-8 rounded-full ml-1 ${step >= 3 || (!requiresSelectionStep(selectedType) && step >= 2) ? "bg-blue-600" : "bg-gray-200"}`} />
                  </View>
                </View>
              </View>
            </View>

            {/* Step Content */}
            {step === 1 ? renderStep1() : step === 2 && requiresSelectionStep(selectedType) ? renderStep2() : renderStep3()}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
export default CreateGroupModal;
