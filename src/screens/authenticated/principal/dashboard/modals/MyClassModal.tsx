import React, { forwardRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Modalize } from "react-native-modalize";
import {
  useGetStudentDetailsByClassQuery,
  StudentDetails,
} from "../../../../../api/student-details-api";

interface MyClassModalProps {
  selectedClassId?: number;
  selectedClassName?: string;
  selectedGradeLevelName?: string;
}

const MyClassModal = forwardRef<Modalize, MyClassModalProps>(
  ({ selectedClassId, selectedClassName, selectedGradeLevelName }, ref) => {
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch student data for the selected class
    const {
      data: studentsData,
      isLoading,
      error,
    } = useGetStudentDetailsByClassQuery(
      {
        grade_level_class_id: selectedClassId || 0,
        page: 1,
        page_size: 100,
      },
      { skip: !selectedClassId },
    );

    // Filter students based on search
    const filteredStudents = React.useMemo(() => {
      if (!studentsData?.data?.data) return [];

      if (!searchQuery.trim()) return studentsData.data.data;

      return studentsData.data.data.filter(
        (student: StudentDetails) =>
          student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.admission_number
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
    }, [studentsData, searchQuery]);

    const renderStudentItem = ({ item }: { item: StudentDetails }) => (
      <TouchableOpacity style={styles.studentItem} activeOpacity={0.7}>
        <View style={styles.studentInfo}>
          <View style={styles.studentHeader}>
            <MaterialIcons name="person" size={20} color="#920734" />
            <Text style={styles.studentName}>{item.full_name}</Text>
          </View>
          <Text style={styles.admissionNumber}>
            ID: {item.admission_number}
          </Text>
          <Text style={styles.studentDetails}>
            Gender: {item.gender} • DOB:{" "}
            {new Date(item.date_of_birth).toLocaleDateString()}
          </Text>
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
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>My Class</Text>
                {selectedClassName && (
                  <Text style={styles.headerSubtitle}>
                    {selectedClassName} - {selectedGradeLevelName}
                  </Text>
                )}
              </View>
            </View>
          </View>
        }
      >
        <View style={styles.container}>
          {!selectedClassId ? (
            <View style={styles.noClassContainer}>
              <MaterialIcons name="info-outline" size={48} color="#999" />
              <Text style={styles.noClassText}>No class selected</Text>
              <Text style={styles.noClassSubtext}>
                Please select a class to view students
              </Text>
            </View>
          ) : isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#920734" />
              <Text style={styles.loadingText}>Loading students...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color="#F44336" />
              <Text style={styles.errorText}>Failed to load students</Text>
              <Text style={styles.errorSubtext}>Please try again later</Text>
            </View>
          ) : (
            <>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <MaterialIcons
                  name="search"
                  size={20}
                  color="#666"
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search students..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#999"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    style={styles.clearButton}
                  >
                    <MaterialIcons name="clear" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Students List */}
              {filteredStudents.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="school" size={48} color="#999" />
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? "No students found"
                      : "No students in this class"}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery
                      ? "Try a different search term"
                      : "Students will appear here when enrolled"}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.resultsCount}>
                    {filteredStudents.length} student
                    {filteredStudents.length !== 1 ? "s" : ""} found
                  </Text>
                  <FlatList
                    data={filteredStudents}
                    renderItem={renderStudentItem}
                    keyExtractor={(item) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                  />
                </>
              )}
            </>
          )}
        </View>
      </Modalize>
    );
  },
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
    shadowOffset: {
      width: 0,
      height: -2,
    },
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
    flex: 1,
  },
  headerTextContainer: {
    alignItems: "center",
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 2,
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
  studentItem: {
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
  studentInfo: {
    flex: 1,
  },
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginLeft: 8,
  },
  admissionNumber: {
    fontSize: 14,
    color: "#920734",
    marginLeft: 28,
    fontWeight: "500",
  },
  studentDetails: {
    fontSize: 12,
    color: "#666",
    marginLeft: 28,
    marginTop: 2,
  },
  loadingContainer: {
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
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
  noClassContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  noClassText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
    textAlign: "center",
  },
  noClassSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
});

MyClassModal.displayName = "MyClassModal";

export default MyClassModal;
