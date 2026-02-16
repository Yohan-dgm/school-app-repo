import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useGetMyFeedbacksQuery } from "../../../../../api/educator-feedback-api";
import { GRADE_LEVELS } from "../../../../../constants/gradeLevels";

interface MyFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

const MyFeedbackModal: React.FC<MyFeedbackModalProps> = ({
  visible,
  onClose,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [gradeLevelFilter, setGradeLevelFilter] = useState<number | null>(null); // null = all grades

  const { data, isLoading, isFetching, error, refetch } =
    useGetMyFeedbacksQuery(
      {
        grade_level_id: gradeLevelFilter,
        page: currentPage,
        page_size: 10,
      },
      {
        skip: !visible,
      }
    );

  const feedbacks = data?.data?.data || [];
  const totalPages = data?.data?.last_page || 1;
  const totalCount = data?.data?.total || 0;

  const handleGradeLevelFilterChange = (gradeId: number | null) => {
    setGradeLevelFilter(gradeId);
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleRefresh = () => {
    setCurrentPage(1); // Reset to first page
    refetch(); // Refetch data
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="person" size={24} color="#920734" />
            <Text style={styles.title}>My Feedbacks</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Grade Level Filter */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by Grade Level:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScrollView}
          >
            <TouchableOpacity
              onPress={() => handleGradeLevelFilterChange(null)}
              style={[
                styles.filterChip,
                gradeLevelFilter === null && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  gradeLevelFilter === null && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
              {gradeLevelFilter === null && (
                <MaterialIcons name="check" size={16} color="#FFF" />
              )}
            </TouchableOpacity>
            {GRADE_LEVELS.map((grade) => (
              <TouchableOpacity
                key={grade.id}
                onPress={() => handleGradeLevelFilterChange(grade.id)}
                style={[
                  styles.filterChip,
                  gradeLevelFilter === grade.id && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    gradeLevelFilter === grade.id && styles.filterChipTextActive,
                  ]}
                >
                  {grade.name}
                </Text>
                {gradeLevelFilter === grade.id && (
                  <MaterialIcons name="check" size={16} color="#FFF" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {totalCount} feedback{totalCount !== 1 ? "s" : ""} found
          </Text>
        </View>

        {/* Content */}
        {isLoading || isFetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#920734" />
            <Text style={styles.loadingText}>
              {isLoading ? "Loading your feedbacks..." : "Loading page..."}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#FF5252" />
            <Text style={styles.errorText}>Failed to load feedbacks</Text>
            <TouchableOpacity
              onPress={() => refetch()}
              style={styles.retryButton}
            >
              <MaterialIcons name="refresh" size={20} color="#FFF" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : feedbacks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={80} color="#CCC" />
            <Text style={styles.emptyText}>No feedbacks found</Text>
            <Text style={styles.emptySubtext}>
              {gradeLevelFilter
                ? "Try changing the grade level filter"
                : "You haven't created any feedbacks yet"}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.feedbackList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isFetching}
                onRefresh={handleRefresh}
                colors={["#920734"]}
                tintColor="#920734"
              />
            }
          >
            {feedbacks.map((feedback: any) => {
              return (
                <View key={feedback.id} style={styles.feedbackCard}>
                  {/* Student Section */}
                  <View style={styles.studentSection}>
                    <View style={styles.studentInfo}>
                      <MaterialIcons name="person" size={20} color="#920734" />
                      <View style={styles.studentDetails}>
                        <Text style={styles.studentName}>
                          {feedback.student?.full_name || "Unknown Student"}
                        </Text>
                        <Text style={styles.studentAdmission}>
                          {feedback.student?.admission_number || "N/A"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Feedback Details */}
                  <View style={styles.detailsSection}>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="category" size={16} color="#666" />
                      <Text style={styles.detailLabel}>Category:</Text>
                      <Text style={styles.detailValue}>
                        {feedback.category?.name || "N/A"}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="school" size={16} color="#666" />
                      <Text style={styles.detailLabel}>Grade:</Text>
                      <Text style={styles.detailValue}>
                        {feedback.grade_level?.name || "N/A"}
                      </Text>
                    </View>
                    {typeof feedback.rating === "number" &&
                      !isNaN(feedback.rating) && (
                        <View style={styles.detailRow}>
                          <MaterialIcons
                            name="star"
                            size={16}
                            color="#FFD700"
                          />
                          <Text style={styles.detailLabel}>Rating:</Text>
                          <Text style={styles.detailValue}>
                            {feedback.rating.toFixed(1)}/5.0
                          </Text>
                        </View>
                      )}
                    <View style={styles.detailRow}>
                      <MaterialIcons
                        name="calendar-today"
                        size={16}
                        color="#666"
                      />
                      <Text style={styles.detailLabel}>Created:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(feedback.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  {/* Comments Section */}
                  {feedback.comments && feedback.comments.length > 0 && (
                    <View style={styles.commentsSection}>
                      <Text style={styles.sectionTitle}>
                        My Comments ({feedback.comments.length})
                      </Text>
                      {feedback.comments.slice(0, 2).map((comment: any) => (
                        <View key={comment.id} style={styles.commentCard}>
                          <Text style={styles.commentText}>
                            {comment.comment}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Parent Comments Section */}
                  {feedback.parent_comments &&
                    feedback.parent_comments.length > 0 && (
                      <View style={styles.parentCommentsSection}>
                        <View style={styles.parentCommentHeader}>
                          <MaterialIcons
                            name="comment"
                            size={18}
                            color="#4CAF50"
                          />
                          <Text style={styles.sectionTitle}>
                            Parent Comments ({feedback.parent_comments.length})
                          </Text>
                        </View>
                        {feedback.parent_comments.map((comment: any) => (
                          <View
                            key={comment.id}
                            style={styles.parentCommentCard}
                          >
                            <Text style={styles.parentCommentText}>
                              {comment.comment}
                            </Text>
                            <View style={styles.parentCommentMeta}>
                              <MaterialIcons
                                name="person"
                                size={12}
                                color="#999"
                              />
                              <Text style={styles.parentCommentAuthor}>
                                {comment.createdBy?.call_name_with_title ||
                                  "Parent"}
                              </Text>
                              <Text style={styles.parentCommentDate}>
                                {" • "}
                                {new Date(
                                  comment.created_at
                                ).toLocaleDateString()}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                  {/* Subcategories */}
                  {feedback.subcategories &&
                    feedback.subcategories.length > 0 && (
                      <View style={styles.subcategoriesSection}>
                        <Text style={styles.subcategoriesLabel}>
                          Subcategories:
                        </Text>
                        <View style={styles.subcategoriesList}>
                          {feedback.subcategories.map((sub: any) => (
                            <View key={sub.id} style={styles.subcategoryChip}>
                              <Text style={styles.subcategoryText}>
                                {sub.subcategory_name}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Pagination */}
        {!isLoading && !error && feedbacks.length > 0 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              disabled={currentPage === 1 || isFetching}
              onPress={handlePreviousPage}
              style={[
                styles.paginationButton,
                (currentPage === 1 || isFetching) &&
                  styles.paginationButtonDisabled,
              ]}
            >
              <MaterialIcons
                name="chevron-left"
                size={24}
                color={currentPage === 1 || isFetching ? "#CCC" : "#920734"}
              />
              <Text
                style={[
                  styles.paginationButtonText,
                  (currentPage === 1 || isFetching) &&
                    styles.paginationButtonTextDisabled,
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            <View style={styles.pageInfoContainer}>
              {isFetching ? (
                <ActivityIndicator size="small" color="#920734" />
              ) : (
                <Text style={styles.pageInfo}>
                  Page {currentPage} of {totalPages}
                </Text>
              )}
            </View>

            <TouchableOpacity
              disabled={currentPage >= totalPages || isFetching}
              onPress={handleNextPage}
              style={[
                styles.paginationButton,
                (currentPage >= totalPages || isFetching) &&
                  styles.paginationButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.paginationButtonText,
                  (currentPage >= totalPages || isFetching) &&
                    styles.paginationButtonTextDisabled,
                ]}
              >
                Next
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={
                  currentPage >= totalPages || isFetching ? "#CCC" : "#920734"
                }
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    elevation: 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#920734",
  },
  closeButton: {
    padding: 8,
  },
  filterContainer: {
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  filterScrollView: {
    flexDirection: "row",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#920734",
    backgroundColor: "#FFF",
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: "#920734",
  },
  filterChipText: {
    fontSize: 14,
    color: "#920734",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#FFF",
  },
  resultsContainer: {
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  resultsText: {
    fontSize: 13,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#FF5252",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#920734",
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#CCC",
    textAlign: "center",
  },
  feedbackList: {
    flex: 1,
  },
  feedbackCard: {
    margin: 12,
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    elevation: 2,
  },
  studentSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  studentAdmission: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFF",
  },
  detailsSection: {
    marginBottom: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  commentsSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  commentCard: {
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  commentText: {
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
  },
  parentCommentsSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },
  parentCommentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  parentCommentCard: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  parentCommentText: {
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
    marginBottom: 6,
  },
  parentCommentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  parentCommentAuthor: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },
  parentCommentDate: {
    fontSize: 11,
    color: "#999",
  },
  subcategoriesSection: {
    marginTop: 12,
  },
  subcategoriesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
  },
  subcategoriesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  subcategoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
  },
  subcategoryText: {
    fontSize: 11,
    color: "#1976D2",
    fontWeight: "500",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  paginationButtonDisabled: {
    opacity: 0.3,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#920734",
  },
  paginationButtonTextDisabled: {
    color: "#CCC",
  },
  pageInfoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
});

export default MyFeedbackModal;
