import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  TextInput, 
  ActivityIndicator 
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLazyGetStudentListQuery } from "../../api/student-management-api";
import { useGetGradeLevelsWithClassesQuery, useGetGradeLevelListQuery } from "../../api/grade-level-api";

interface StudentSelectorProps {
  selectedStudentIds: number[];
  onSelectionChange: (ids: number[]) => void;
  multiSelect?: boolean;
}

const StudentSelector: React.FC<StudentSelectorProps> = ({
  selectedStudentIds,
  onSelectionChange,
  multiSelect = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  // Filter states
  const [filterGradeLevelId, setFilterGradeLevelId] = useState<number | null>(null);
  const [filterClassId, setFilterClassId] = useState<number | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Student Query
  const [trigger, { data, isLoading, isFetching }] = useLazyGetStudentListQuery();
  
  // Grade/Class data for filters
  const { data: gradeLevelData } = useGetGradeLevelsWithClassesQuery({ page: 1, page_size: 100 });
  const gradeLevels = gradeLevelData?.data?.data || [];
  
  const selectedGradeData = gradeLevels.find(g => g.id === filterGradeLevelId);

  // Effect to handle data accumulation
  useEffect(() => {
    if (data?.data?.data) {
        if (page === 1) {
            setAllStudents(data.data.data);
        } else {
            // Append new students, avoiding duplicates
            setAllStudents(prev => {
                const newStudents = data.data.data.filter((s:any) => !prev.some(p => p.id === s.id));
                return [...prev, ...newStudents];
            });
        }
        // Check if we reached the end (assuming page size is 50)
        if (data.data.data.length < 50) {
            setHasMore(false);
        } else {
            setHasMore(true);
        }
    }
  }, [data, page]);

  // Debounced search effect - resets to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // Reset page
      trigger({
        page: 1,
        page_size: 50,
        search: searchQuery,
        grade_level_id: filterGradeLevelId || undefined,
        grade_level_class_id: filterClassId || undefined,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, filterGradeLevelId, filterClassId]);

  // Load more function
  const loadMore = () => {
    if (!isFetching && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        trigger({
            page: nextPage,
            page_size: 50,
            search: searchQuery,
            grade_level_id: filterGradeLevelId || undefined,
            grade_level_class_id: filterClassId || undefined,
        });
    }
  };

  const toggleStudent = (id: number) => {
    if (multiSelect) {
        // Multi select
        if (selectedStudentIds.includes(id)) {
            onSelectionChange(selectedStudentIds.filter(sid => sid !== id));
        } else {
            onSelectionChange([...selectedStudentIds, id]);
        }
    } else {
        // Single select: always replace with the new ID
        if (selectedStudentIds.includes(id)) {
            // Allow deselecting the currently selected student
            onSelectionChange([]);
        } else {
            onSelectionChange([id]);
        }
    }
  };
  
  const selectAll = () => {
    if (!multiSelect) return;
    const allIds = allStudents.map(s => s.id);
    const newSelection = Array.from(new Set([...selectedStudentIds, ...allIds]));
    onSelectionChange(newSelection);
  };

  return (
    <View className="flex-1 mt-4">
      {/* Search Bar */}
      <View className="flex-row items-center gap-2 mb-4">
        <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-4 py-2 border border-gray-200">
            <MaterialIcons name="search" size={20} color="#9ca3af" />
            <TextInput
            placeholder="Search students..."
            className="flex-1 ml-2 text-sm text-gray-900"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
            />
             {isLoading || isFetching ? (
                <ActivityIndicator size="small" color="#7c2d3e" />
            ) : null}
        </View>
      </View>

      {/* Always Visible Filters */}
      <View className="bg-gray-50 p-3 rounded-xl mb-3 border border-gray-100">
          <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Filter by Grade</Text>
          <FlatList 
              horizontal
              data={gradeLevels}
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id.toString()}
              renderItem={({item}) => (
                  <TouchableOpacity
                      onPress={() => {
                          setFilterGradeLevelId(item.id === filterGradeLevelId ? null : item.id);
                          setFilterClassId(null); // Reset class on grade change
                      }}
                      className={`mr-2 px-3 py-1.5 rounded-lg border ${
                          filterGradeLevelId === item.id 
                              ? "bg-gray-800 border-gray-800" 
                              : "bg-white border-gray-200"
                      }`}
                  >
                      <Text className={`text-xs ${filterGradeLevelId === item.id ? "text-white" : "text-gray-700"}`}>
                          {item.name}
                      </Text>
                  </TouchableOpacity>
              )}
              className="mb-2"
          />
          
          {selectedGradeData && selectedGradeData.grade_level_class_list.length > 0 && (
              <>
                  <Text className="text-xs font-bold text-gray-500 uppercase mb-2 mt-2">Filter by Class</Text>
                  <View className="flex-row flex-wrap gap-2">
                      {selectedGradeData.grade_level_class_list.map(cls => (
                           <TouchableOpacity
                              key={cls.id}
                              onPress={() => setFilterClassId(cls.id === filterClassId ? null : cls.id)}
                              className={`px-3 py-1.5 rounded-lg border ${
                                  filterClassId === cls.id 
                                      ? "bg-gray-700 border-gray-700" 
                                      : "bg-white border-gray-200"
                              }`}
                          >
                              <Text className={`text-xs ${filterClassId === cls.id ? "text-white" : "text-gray-700"}`}>
                                  {cls.name}
                              </Text>
                          </TouchableOpacity>
                      ))}
                  </View>
              </>
          )}
      </View>

      {/* Selected Count */}
      <View className="flex-row justify-between items-center mb-2 px-1">
        <Text className="text-xs font-bold text-gray-500">
             {selectedStudentIds.length > 0 ? `${selectedStudentIds.length} SELECTED` : "SELECT STUDENTS"}
        </Text>
        {multiSelect && allStudents.length > 0 && !isLoading && (
            <TouchableOpacity onPress={selectAll}>
              <Text className="text-xs font-bold text-rose-700">Select All Found</Text>
            </TouchableOpacity>
        )}
      </View>

      {/* Student List */}
      <View className="flex-1 bg-white border border-gray-100 rounded-xl overflow-hidden min-h-[300px]">
        {allStudents.length === 0 && !isLoading && !isFetching ? (
          <View className="flex-1 items-center justify-center p-8">
            <MaterialIcons name="people-outline" size={48} color="#e5e7eb" />
            <Text className="text-gray-400 text-center mt-3">No students found.</Text>
            <Text className="text-gray-300 text-center text-xs">Try adjusting your search or filters.</Text>
          </View>
        ) : (
          <FlatList
            scrollEnabled={true}
            data={allStudents}
            keyExtractor={(item) => item.id.toString()}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => (
                isFetching && page > 1 ? (
                    <View className="py-4 items-center">
                        <ActivityIndicator size="small" color="#7c2d3e" />
                    </View>
                ) : null
            )}
            renderItem={({ item }) => {
              const isSelected = selectedStudentIds.includes(item.id);
              return (
                <TouchableOpacity
                  onPress={() => toggleStudent(item.id)}
                  className={`flex-row items-center p-3 border-b border-gray-50 ${
                    isSelected ? "bg-rose-50/50" : "bg-white"
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-800">{item.full_name_with_title}</Text>
                    <View className="flex-row items-center mt-1">
                        <Text className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded mr-2">
                             {item.admission_number}
                        </Text>
                        <Text className="text-xs text-gray-500">
                            {item.grade_level?.name} • {item.grade_level_class?.name}
                        </Text>
                    </View>
                  </View>

                  <View className={`w-5 h-5 ${multiSelect ? "rounded-md" : "rounded-full"} border items-center justify-center ${
                    isSelected ? "bg-rose-600 border-rose-600" : "border-gray-300 bg-white"
                  }`}>
                    {isSelected && (
                        multiSelect ? (
                            <MaterialIcons name="check" size={14} color="white" />
                        ) : (
                            <View className="w-2.5 h-2.5 rounded-full bg-white" />
                        )
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </View>
  );
};

export default StudentSelector;
