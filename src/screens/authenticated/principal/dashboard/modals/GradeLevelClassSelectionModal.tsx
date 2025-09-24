import React, { useState, useMemo, forwardRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Modalize } from "react-native-modalize";
import {
  useGetGradeLevelsWithClassesQuery,
  GradeLevelWithClasses,
  GradeLevelClass,
} from "../../../../../api/grade-level-api";

interface GradeLevelClassSelectionModalProps {
  onSelectClass: (classData: GradeLevelClass & { gradeLevelName: string }) => void;
}

const GradeLevelClassSelectionModal = forwardRef<Modalize, GradeLevelClassSelectionModalProps>(
  ({ onSelectClass }, ref) => {
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch grade levels with classes
    const {
      data: gradeLevelsData,
      isLoading,
      error,
    } = useGetGradeLevelsWithClassesQuery({
      page_size: 50,
      page: 1,
    });

    // Flatten and filter classes based on search
    const filteredClasses = useMemo(() => {
      if (!gradeLevelsData?.data?.data) return [];

      const allClasses: (GradeLevelClass & { gradeLevelName: string })[] = [];
      
      gradeLevelsData.data.data.forEach((gradeLevel: GradeLevelWithClasses) => {
        gradeLevel.grade_level_class_list.forEach((classItem: GradeLevelClass) => {
          allClasses.push({
            ...classItem,
            gradeLevelName: gradeLevel.name,
          });
        });
      });

      if (!searchQuery.trim()) return allClasses;

      return allClasses.filter((classItem) =>
        classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        classItem.gradeLevelName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [gradeLevelsData, searchQuery]);

    const handleSelectClass = (classData: GradeLevelClass & { gradeLevelName: string }) => {
      console.log("🎯 Class selected:", classData);
      onSelectClass(classData);
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.close();
      }
    };

    const renderClassItem = ({ item }: { item: GradeLevelClass & { gradeLevelName: string } }) => (
      <TouchableOpacity
        style={styles.classItem}
        onPress={() => handleSelectClass(item)}
        activeOpacity={0.7}
      >
        <View style={styles.classInfo}>
          <View style={styles.classHeader}>
            <MaterialIcons name="class" size={20} color="#920734" />
            <Text style={styles.className}>{item.name}</Text>
          </View>
          <Text style={styles.gradeLevelName}>{item.gradeLevelName}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>
    );

    return (
      <Modalize
        ref={ref}
        modalTopOffset={0}
        modalHeight={999999}
        adjustToContentHeight={false}
        modalStyle={styles.modal}
        rootStyle={styles.modalRoot}
        HeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <MaterialIcons name="class" size={24} color="#920734" />
              <Text style={styles.headerTitle}>Select Class</Text>
            </View>
          </View>
        }
      >
        <View style={styles.container}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search classes or grade levels..."
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

          {/* Content */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#920734" />
              <Text style={styles.loadingText}>Loading classes...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <MaterialIcons name="error-outline" size={48} color="#F44336" />
              <Text style={styles.errorText}>Failed to load classes</Text>
              <Text style={styles.errorSubtext}>Please try again later</Text>
            </View>
          ) : filteredClasses.length === 0 ? (
            <View style={styles.centerContainer}>
              <MaterialIcons name="search-off" size={48} color="#999" />
              <Text style={styles.emptyText}>
                {searchQuery ? "No classes found" : "No classes available"}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? "Try a different search term" : "Contact administrator"}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultsCount}>
                {filteredClasses.length} class{filteredClasses.length !== 1 ? "es" : ""} found
              </Text>
              <FlatList
                data={filteredClasses}
                renderItem={renderClassItem}
                keyExtractor={(item) => `${item.id}-${item.grade_level_id}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
              />
            </>
          )}
        </View>
      </Modalize>
    );
  }
);

const styles = StyleSheet.create({
  modalRoot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    height: "100%",
  },
  modal: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 0,
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    backgroundColor: "white",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginLeft: 8,
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  classItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  classInfo: {
    flex: 1,
  },
  classHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  className: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginLeft: 8,
  },
  gradeLevelName: {
    fontSize: 14,
    color: "#666",
    marginLeft: 28,
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
});

GradeLevelClassSelectionModal.displayName = "GradeLevelClassSelectionModal";

export default GradeLevelClassSelectionModal;