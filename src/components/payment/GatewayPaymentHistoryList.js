import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";
import { useGetMyPaymentHistoryQuery } from "../../api/payment-gateway-api";
import { useDownloadPaymentReceipt } from "../../hooks/useDownloadPaymentReceipt";

const STATUS_COLORS = {
  pending_review: "#FF9800",
  approved: "#4CAF50",
  rejected: "#F44336",
};

const STATUS_ICONS = {
  pending_review: "schedule",
  approved: "check-circle",
  rejected: "error",
};

const formatStatusLabel = (status) => {
  if (!status) return "Unknown";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
};

const PaymentCard = ({ payment }) => {
  const statusColor = STATUS_COLORS[payment.admin_status] || "#666666";
  const statusIcon = STATUS_ICONS[payment.admin_status] || "help";
  const { downloadReceipt, isDownloading } = useDownloadPaymentReceipt();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.paymentCard}>
      <TouchableOpacity
        style={styles.paymentHeader}
        onPress={() => setIsExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentType}>{payment.invoice_type}</Text>
          <Text style={styles.paymentDate}>{formatDateTime(payment.created_at)}</Text>
        </View>
        <View style={styles.paymentStatus}>
          <MaterialIcons name={statusIcon} size={20} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {formatStatusLabel(payment.admin_status)}
          </Text>
          <MaterialIcons
            name={isExpanded ? "expand-less" : "expand-more"}
            size={22}
            color="#999999"
          />
        </View>
      </TouchableOpacity>

      <View style={styles.paymentDetails}>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>
            {payment.currency} {(parseFloat(payment.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>

        {(parseFloat(payment.service_fee_amount) || 0) > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Online Service Charge:</Text>
            <Text style={styles.detailValue}>
              {payment.currency} {(parseFloat(payment.service_fee_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
        )}

        {(parseFloat(payment.total_charged_amount) || 0) > 0 && (
          <View style={[styles.detailRow, styles.totalChargedRow]}>
            <Text style={styles.totalChargedLabel}>Total Charged</Text>
            <Text style={styles.totalChargedValue}>
              {payment.currency} {(parseFloat(payment.total_charged_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
        )}

        {payment.admin_status === "pending_review" && (
          <View style={styles.pendingReviewNotice}>
            <MaterialIcons name="info-outline" size={15} color="#1565C0" />
            <Text style={styles.pendingReviewText}>
              After review, your invoice will be updated by the school.
            </Text>
          </View>
        )}

        {isExpanded && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice:</Text>
              <Text style={styles.detailValue}>#{payment.invoice_id}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{payment.order_reference}</Text>
            </View>

            {payment.cybersource_reference && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gateway Ref:</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{payment.cybersource_reference}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Paid On:</Text>
              <Text style={styles.detailValue}>{formatDateTime(payment.created_at)}</Text>
            </View>

            {payment.admin_approved_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reviewed On:</Text>
                <Text style={styles.detailValue}>{formatDateTime(payment.admin_approved_at)}</Text>
              </View>
            )}

            {payment.admin_notes && (
              <View style={styles.adminNotesBox}>
                <Text style={styles.adminNotesLabel}>Finance Team Note</Text>
                <Text style={styles.adminNotesText}>{payment.admin_notes}</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* payment/my-history only ever returns status='completed' orders
          (see GetMyPaymentHistoryIntent.php), so every row here is already
          eligible — no extra client-side check needed before allowing this. */}
      <View style={styles.paymentActions}>
        <TouchableOpacity
          style={[styles.receiptButton, isDownloading && styles.receiptButtonDisabled]}
          onPress={() => downloadReceipt(payment.order_reference)}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <MaterialIcons name="receipt" size={16} color={theme.colors.primary} />
          )}
          <Text style={styles.receiptButtonText}>
            {isDownloading ? "Preparing..." : "Download Receipt"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Online (CyberSource) payment history — shown directly inline in the
 * Payment Center, no navigation required. Pagination is server-side
 * (10 records per page — see GetMyPaymentHistoryIntent.php); this component
 * only ever holds one page of records in memory at a time.
 */
const GatewayPaymentHistoryList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError, refetch } = useGetMyPaymentHistoryQuery({ page });

  const payments = useMemo(() => data?.data?.payments || [], [data]);
  const pagination = data?.data?.pagination;

  const filterOptions = useMemo(() => {
    const statuses = Array.from(new Set(payments.map((p) => p.admin_status).filter(Boolean)));
    return [
      { key: "all", label: "All Payments" },
      ...statuses.map((s) => ({ key: s, label: formatStatusLabel(s) })),
    ];
  }, [payments]);

  const getFilteredPayments = () => {
    let filtered = payments;

    if (selectedFilter !== "all") {
      filtered = filtered.filter((payment) => payment.admin_status === selectedFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (payment) =>
          payment.invoice_type?.toLowerCase().includes(q) ||
          payment.order_reference?.toLowerCase().includes(q) ||
          String(payment.invoice_id).includes(q),
      );
    }

    return filtered;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading payment history...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="error-outline" size={48} color="#CCCCCC" />
        <Text style={styles.emptyStateTitle}>Unable to Load History</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredPayments = getFilteredPayments();

  return (
    <View>
      {/* Search and Filter */}
      <View style={styles.searchFilterSection}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterButton,
                selectedFilter === option.key && styles.activeFilterButton,
              ]}
              onPress={() => setSelectedFilter(option.key)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === option.key && styles.activeFilterButtonText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Payment List — plain View, not ScrollView: this is embedded inside
          the Payment Center's own outer ScrollView, so a nested vertical
          scroll container here would fight it for scroll gestures. */}
      {filteredPayments.length > 0 ? (
        filteredPayments.map((payment) => <PaymentCard key={payment.id} payment={payment} />)
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="receipt-long" size={48} color="#CCCCCC" />
          <Text style={styles.emptyStateTitle}>No Payments Found</Text>
          <Text style={styles.emptyStateText}>
            {searchQuery.trim() || selectedFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "You haven't made any online payments yet"}
          </Text>
        </View>
      )}

      {/* Pagination controls — server-side, 10 records per page */}
      {pagination && pagination.last_page > 1 && (
        <View style={styles.paginationRow}>
          <TouchableOpacity
            style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isFetching}
          >
            <Text style={styles.pageButtonText}>Previous</Text>
          </TouchableOpacity>
          <Text style={styles.pageIndicator}>
            Page {pagination.current_page} of {pagination.last_page}
          </Text>
          <TouchableOpacity
            style={[styles.pageButton, !pagination.has_more && styles.pageButtonDisabled]}
            onPress={() => setPage((p) => p + 1)}
            disabled={!pagination.has_more || isFetching}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: "#666666",
    marginTop: 12,
    fontFamily: theme.fonts.medium,
  },
  retryButton: {
    marginTop: 14,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
    fontSize: 14,
  },
  searchFilterSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    paddingVertical: 11,
    marginLeft: 10,
  },
  filterContainer: {
    flexDirection: "row",
  },
  filterButton: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    marginRight: 10,
  },
  activeFilterButton: {
    backgroundColor: theme.colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: "#666666",
  },
  activeFilterButtonText: {
    color: "#FFFFFF",
  },
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  paymentInfo: {
    flex: 1,
  },
  paymentType: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: "#666666",
  },
  paymentStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    marginLeft: 3,
  },
  paymentDetails: {
    padding: 16,
  },
  amountSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: "#666666",
  },
  amountValue: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: "#666666",
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    flex: 1,
    textAlign: "right",
  },
  totalChargedRow: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 10,
  },
  totalChargedLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    flex: 1,
  },
  totalChargedValue: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
    flex: 1,
    textAlign: "right",
  },
  pendingReviewNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  pendingReviewText: {
    flex: 1,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: "#1565C0",
    lineHeight: 17,
  },
  adminNotesBox: {
    marginTop: 10,
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  adminNotesLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.bold,
    color: "#F57C00",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  adminNotesText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: "#5D4037",
    lineHeight: 18,
  },
  paymentActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  receiptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary + "10",
    paddingVertical: 11,
    borderRadius: 8,
    gap: 8,
  },
  receiptButtonDisabled: {
    opacity: 0.6,
  },
  receiptButtonText: {
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pageButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
    fontSize: 13,
  },
  pageIndicator: {
    fontSize: 13,
    color: "#666666",
    fontFamily: theme.fonts.medium,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    marginHorizontal: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: "#666666",
    marginTop: 14,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: "#999999",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

export default GatewayPaymentHistoryList;
