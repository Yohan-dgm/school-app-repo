import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useGetGradeLevelListQuery, useGetGradeLevelsWithClassesQuery } from "../../api/grade-level-api";

interface GradeLevelSelectorProps {
  targetType: "Grade_Level" | "Grade_Level_class";
  selectedGradeLevelId: number | null;
  selectedClassId: number | null;
  onGradeLevelChange: (gradeLevelId: number, classId: number | null) => void;
  onClassChange: (classId: number) => void;
}

const GradeLevelSelector: React.FC<GradeLevelSelectorProps> = ({
  targetType,
  selectedGradeLevelId,
  selectedClassId,
  onGradeLevelChange,
  onClassChange,
}) => {
  // We use different queries based on targetType, but for simplicity we can load the detailed one 
  // if 'class' is needed, or the simple one if only grade is needed.
  // However, the user provided specfic APIs. 
  
  // Query for simple list
  const { 
    data: simpleData, 
    isLoading: isSimpleLoading 
  } = useGetGradeLevelListQuery({ page: 1, page_size: 1000 }, { skip: targetType !== "Grade_Level" });

  // Query for classes list
  const { 
    data: classesData, 
    isLoading: isClassesLoading 
  } = useGetGradeLevelsWithClassesQuery({ page: 1, page_size: 100 }, { skip: targetType !== "Grade_Level_class" });

  const isLoading = targetType === "Grade_Level" ? isSimpleLoading : isClassesLoading;
  
  // Normalize data to a common structure for rendering
  const gradeLevels = React.useMemo(() => {
    if (targetType === "Grade_Level") {
      return simpleData?.data?.data || [];
    } else {
      return classesData?.data?.data || [];
    }
  }, [targetType, simpleData, classesData]);

  const selectedGradeLevelWithClasses = React.useMemo(() => {
    if (targetType === "Grade_Level_class" && selectedGradeLevelId && classesData?.data?.data) {
      return classesData.data.data.find(g => g.id === selectedGradeLevelId);
    }
    return null;
  }, [targetType, selectedGradeLevelId, classesData]);


  if (isLoading) {
    return (
      <View className="p-4 items-center">
        <ActivityIndicator size="small" color="#7c2d3e" />
      </View>
    );
  }

  return (
    <View className="mt-4">
      {/* Grade Level Selection */}
      <Text className="text-sm font-bold text-gray-700 mb-2">Select Grade Level</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        {gradeLevels.map((grade) => (
          <TouchableOpacity
            key={grade.id}
            onPress={() => onGradeLevelChange(grade.id, null)}
            className={`mr-2 px-4 py-2 rounded-lg border ${
              selectedGradeLevelId === grade.id
                ? "bg-rose-900 border-rose-900"
                : "bg-white border-gray-200"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                selectedGradeLevelId === grade.id ? "text-white" : "text-gray-700"
              }`}
            >
              {grade.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Class Selection (only if Grade_Level_class and Grade Level is selected) */}
      {targetType === "Grade_Level_class" && selectedGradeLevelWithClasses && (
        <>
          <Text className="text-sm font-bold text-gray-700 mb-2">Select Class</Text>
          <View className="flex-row flex-wrap gap-2">
            {selectedGradeLevelWithClasses.grade_level_class_list && selectedGradeLevelWithClasses.grade_level_class_list.length > 0 ? (
              selectedGradeLevelWithClasses.grade_level_class_list.map((cls) => (
                <TouchableOpacity
                  key={cls.id}
                  onPress={() => onClassChange(cls.id)}
                  className={`flex-row items-center px-3 py-2 rounded-lg border min-w-[30%] justify-center ${
                    selectedClassId === cls.id
                      ? "bg-rose-100 border-rose-900"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      selectedClassId === cls.id ? "font-bold text-rose-900" : "text-gray-600"
                    }`}
                  >
                    {cls.name}
                  </Text>
                  {selectedClassId === cls.id && (
                    <MaterialIcons name="check-circle" size={16} color="#881337" style={{ marginLeft: 6 }} />
                  )}
                </TouchableOpacity>
              ))
            ) : (
                <Text className="text-gray-500 text-xs italic">No classes found for this grade.</Text>
            )}
          </View>
        </>
      )}
    </View>
  );
};

export default GradeLevelSelector;
