import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSelector } from "react-redux";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { theme } from "../../../styles/theme";
import {
  useGetActiveMealPlanListDataQuery,
  useGetMyCanteenOrderListDataQuery,
  useCreateCanteenOrderMutation,
  useCancelCanteenOrderMutation,
  getCanteenOrderStatusColor,
  formatCanteenDate,
  CanteenMealPlan,
} from "../../../api/canteen-management-api";
import MealPlanDetailModal from "../../../screens/authenticated/educator/dashboard/modals/MealPlanDetailModal";

interface CanteenOrderDrawerProps {
  visible?: boolean;
  onClose: () => void;
  studentId: number;
  studentName?: string;
}

interface LinkedStudent {
  id: number;
  full_name?: string;
  student_calling_name?: string;
  admission_number?: string;
}

const PAGE_SIZE = 10;

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const CanteenOrderDrawer: React.FC<CanteenOrderDrawerProps> = ({
  onClose,
  studentId,
  studentName,
}) => {
  const [activeTab, setActiveTab] = useState<"order" | "history">("order");

  // Each meal card places its own order independently (own student, date,
  // quantity), but they all start out seeded with the same sensible default:
  // the parent's only child, or whichever profile this drawer was opened
  // from - the parent can still override per meal via that card's picker.
  const { sessionData } = useSelector((state: any) => state.app);
  const linkedStudents: LinkedStudent[] = useMemo(
    () => sessionData?.data?.student_list || [],
    [sessionData],
  );
  const defaultStudentId = useMemo(() => {
    if (linkedStudents.length === 1) return linkedStudents[0].id;
    if (linkedStudents.some((s) => s.id === studentId)) return studentId;
    return null;
  }, [linkedStudents, studentId]);

  const [detailMealPlan, setDetailMealPlan] = useState<CanteenMealPlan | null>(
    null,
  );

  // My Orders tab state
  const [historyPage, setHistoryPage] = useState(1);

  const {
    data: mealPlanData,
    isLoading: isMealPlansLoading,
    error: mealPlansError,
  } = useGetActiveMealPlanListDataQuery(undefined, {
    skip: !studentId || activeTab !== "order",
  });
  const mealPlans = mealPlanData?.data || [];

  const {
    data: orderHistoryData,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    error: historyError,
  } = useGetMyCanteenOrderListDataQuery(
    { page: historyPage, page_size: PAGE_SIZE },
    { skip: activeTab !== "history" },
  );
  const orderHistory = orderHistoryData?.data;

  // Green dot on the "My Orders" tab while any of the parent's orders
  // (across all their children) is still Pending.
  const { data: pendingHistoryData } = useGetMyCanteenOrderListDataQuery({
    status: "Pending",
    page: 1,
    page_size: 1,
  });
  const hasPendingHistoryOrder = (pendingHistoryData?.data?.total ?? 0) > 0;

  const [cancelCanteenOrder, { isLoading: isCancelling }] =
    useCancelCanteenOrderMutation();

  const handleCancelOrder = (orderId: number) => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelCanteenOrder({ id: orderId }).unwrap();
          } catch (err: any) {
            Alert.alert(
              "Cancel Failed",
              err?.data?.message || "Could not cancel this order.",
            );
          }
        },
      },
    ]);
  };

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Canteen</Text>
            {!!studentName && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {studentName}
              </Text>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Segmented control */}
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeTab === "order" && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveTab("order")}
          >
            <Text
              style={[
                styles.segmentButtonText,
                activeTab === "order" && styles.segmentButtonTextActive,
              ]}
            >
              Order Meal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeTab === "history" && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveTab("history")}
          >
            <View style={styles.segmentLabelRow}>
              <Text
                style={[
                  styles.segmentButtonText,
                  activeTab === "history" && styles.segmentButtonTextActive,
                ]}
              >
                My Orders
              </Text>
              {hasPendingHistoryOrder && (
                <View style={styles.pendingOrderDot} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {activeTab === "order" ? (
          <>
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Loading / Error */}
              {isMealPlansLoading && (
                <View style={styles.stateContainer}>
                  <MaterialIcons name="sync" size={28} color="#920734" />
                  <Text style={styles.stateText}>Loading meal plans...</Text>
                </View>
              )}
              {!isMealPlansLoading && mealPlansError && (
                <View style={styles.stateContainer}>
                  <MaterialIcons
                    name="error-outline"
                    size={28}
                    color="#DC2626"
                  />
                  <Text style={[styles.stateText, styles.stateErrorText]}>
                    Failed to load meal plans
                  </Text>
                </View>
              )}
              {!isMealPlansLoading &&
                !mealPlansError &&
                mealPlans.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <MaterialIcons
                      name="restaurant-menu"
                      size={40}
                      color="#CCCCCC"
                    />
                    <Text style={styles.emptyText}>
                      No meal plans available
                    </Text>
                  </View>
                )}

              {/* Meal plan board */}
              <View style={styles.mealPlanList}>
                {mealPlans.map((mealPlan) => (
                  <MealPlanCard
                    key={mealPlan.id}
                    mealPlan={mealPlan}
                    linkedStudents={linkedStudents}
                    defaultStudentId={defaultStudentId}
                    onPressDetail={() => setDetailMealPlan(mealPlan)}
                  />
                ))}
              </View>
            </ScrollView>
          </>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {isHistoryLoading && (
              <View style={styles.stateContainer}>
                <MaterialIcons name="sync" size={28} color="#920734" />
                <Text style={styles.stateText}>Loading orders...</Text>
              </View>
            )}
            {!isHistoryLoading && historyError && (
              <View style={styles.stateContainer}>
                <MaterialIcons name="error-outline" size={28} color="#DC2626" />
                <Text style={[styles.stateText, styles.stateErrorText]}>
                  Failed to load orders
                </Text>
              </View>
            )}
            {!isHistoryLoading &&
              !historyError &&
              orderHistory?.data.length === 0 && (
                <View style={styles.emptyContainer}>
                  <MaterialIcons
                    name="receipt-long"
                    size={40}
                    color="#CCCCCC"
                  />
                  <Text style={styles.emptyText}>No orders yet</Text>
                </View>
              )}

            <View style={styles.orderList}>
              {orderHistory?.data.map((order) => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderCardHeaderRow}>
                    <View style={styles.orderCardHeaderTextBlock}>
                      <Text style={styles.orderDate}>
                        {formatCanteenDate(order.order_date)}
                      </Text>
                      {!!order.student && (
                        <Text style={styles.orderStudentLine} numberOfLines={1}>
                          {order.student.full_name}
                          {order.student.grade_level_class?.name
                            ? ` · ${order.student.grade_level_class.name}`
                            : ""}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: getCanteenOrderStatusColor(
                            order.status,
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.statusPillText}>{order.status}</Text>
                    </View>
                  </View>
                  {order.items.map((item) => (
                    <View key={item.id} style={styles.orderItemRow}>
                      <Text style={styles.orderItemText} numberOfLines={1}>
                        {item.quantity}x {item.meal_plan_title}
                      </Text>
                      <Text style={styles.orderItemPrice}>
                        Rs. {item.subtotal}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.orderCardFooterRow}>
                    <Text style={styles.orderTotalLabel}>Total</Text>
                    <Text style={styles.orderTotalValue}>
                      Rs. {order.total_amount}
                    </Text>
                  </View>
                  {order.status === "Pending" && (
                    <TouchableOpacity
                      style={styles.cancelOrderButton}
                      onPress={() => handleCancelOrder(order.id)}
                      disabled={isCancelling}
                    >
                      <Text style={styles.cancelOrderButtonText}>
                        Cancel Order
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {/* Pagination */}
            {orderHistory && orderHistory.last_page > 1 && (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[
                    styles.pageButton,
                    historyPage <= 1 && styles.pageButtonDisabled,
                  ]}
                  disabled={historyPage <= 1}
                  onPress={() => setHistoryPage((p) => Math.max(1, p - 1))}
                >
                  <MaterialIcons
                    name="chevron-left"
                    size={20}
                    color="#920734"
                  />
                </TouchableOpacity>
                <Text style={styles.pageIndicatorText}>
                  {isHistoryFetching
                    ? "..."
                    : `Page ${orderHistory.current_page} of ${orderHistory.last_page}`}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.pageButton,
                    historyPage >= orderHistory.last_page &&
                      styles.pageButtonDisabled,
                  ]}
                  disabled={historyPage >= orderHistory.last_page}
                  onPress={() =>
                    setHistoryPage((p) =>
                      Math.min(orderHistory.last_page, p + 1),
                    )
                  }
                >
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color="#920734"
                  />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
      <MealPlanDetailModal
        mealPlan={detailMealPlan}
        onClose={() => setDetailMealPlan(null)}
      />
    </>
  );
};

interface MealPlanCardProps {
  mealPlan: CanteenMealPlan;
  linkedStudents: LinkedStudent[];
  defaultStudentId: number | null;
  onPressDetail: () => void;
}

const MealPlanCard: React.FC<MealPlanCardProps> = ({
  mealPlan,
  linkedStudents,
  defaultStudentId,
  onPressDetail,
}) => {
  const isOutOfStock = mealPlan.quantity_available === 0;
  const [quantity, setQuantity] = useState(0);
  const [orderStudentId, setOrderStudentId] = useState<number | null>(
    defaultStudentId,
  );
  const [orderDate, setOrderDate] = useState(new Date());
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [createCanteenOrder, { isLoading: isPlacingOrder }] =
    useCreateCanteenOrderMutation();

  const selectedStudent =
    linkedStudents.find((s) => s.id === orderStudentId) || null;

  const changeQuantity = (next: number) => {
    setQuantity(Math.max(0, Math.min(next, mealPlan.quantity_available)));
  };

  const handlePlaceOrder = async () => {
    if (quantity === 0) return;
    if (!orderStudentId) {
      Alert.alert(
        "Select a Student",
        "Please choose which of your children this meal is for.",
      );
      return;
    }
    try {
      await createCanteenOrder({
        student_id: orderStudentId,
        order_date: toDateInputValue(orderDate),
        items: [{ meal_plan_id: mealPlan.id, quantity }],
      }).unwrap();
      setQuantity(0);
      Alert.alert("Order Placed", `${mealPlan.title} order has been placed.`);
    } catch (err: any) {
      Alert.alert(
        "Order Failed",
        err?.data?.message || "Could not place your order. Please try again.",
      );
    }
  };

  return (
    <View
      style={[styles.mealPlanCard, isOutOfStock && styles.mealPlanCardDisabled]}
    >
      <TouchableOpacity activeOpacity={0.85} onPress={onPressDetail}>
        <Image
          source={mealPlan.image_url ? { uri: mealPlan.image_url } : undefined}
          style={styles.mealPlanImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.mealPlanCardBody}>
          <Text style={styles.mealPlanTitle} numberOfLines={1}>
            {mealPlan.title}
          </Text>
          <Text style={styles.mealPlanPrice}>Rs. {mealPlan.price}</Text>
          <Text style={styles.mealPlanStock}>
            {isOutOfStock
              ? "Out of stock"
              : `${mealPlan.quantity_available} left`}
          </Text>
        </View>
      </TouchableOpacity>

      {!isOutOfStock && (
        <View style={styles.mealPlanControls}>
          <TouchableOpacity
            style={styles.miniSelectButton}
            onPress={() =>
              linkedStudents.length > 1 && setShowStudentPicker(true)
            }
          >
            <MaterialIcons name="person" size={12} color="#920734" />
            <Text style={styles.miniSelectButtonText} numberOfLines={1}>
              {selectedStudent?.student_calling_name ||
                selectedStudent?.full_name ||
                "Select student"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.miniSelectButton}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialIcons name="calendar-today" size={12} color="#920734" />
            <Text style={styles.miniSelectButtonText} numberOfLines={1}>
              {orderDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={orderDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(_event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setOrderDate(selectedDate);
              }}
            />
          )}

          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => changeQuantity(quantity - 1)}
              disabled={quantity === 0}
            >
              <MaterialIcons
                name="remove"
                size={16}
                color={quantity === 0 ? "#CCCCCC" : "#920734"}
              />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => changeQuantity(quantity + 1)}
              disabled={quantity >= mealPlan.quantity_available}
            >
              <MaterialIcons
                name="add"
                size={16}
                color={
                  quantity >= mealPlan.quantity_available
                    ? "#CCCCCC"
                    : "#920734"
                }
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.cardPlaceOrderButton,
              (quantity === 0 || !orderStudentId) &&
                styles.placeOrderButtonDisabled,
            ]}
            onPress={handlePlaceOrder}
            disabled={quantity === 0 || !orderStudentId || isPlacingOrder}
          >
            {isPlacingOrder ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.cardPlaceOrderButtonText}>Place Order</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {showStudentPicker && (
        <Modal
          visible
          animationType="fade"
          transparent
          onRequestClose={() => setShowStudentPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setShowStudentPicker(false)}
          >
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>Select Student</Text>
              {linkedStudents.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  style={styles.pickerRow}
                  onPress={() => {
                    setOrderStudentId(student.id);
                    setShowStudentPicker(false);
                  }}
                >
                  <Text style={styles.pickerRowName}>
                    {student.student_calling_name || student.full_name}
                  </Text>
                  {!!student.admission_number && (
                    <Text style={styles.pickerRowMeta}>
                      {student.admission_number}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#920734",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: { padding: 8 },
  headerTitleBlock: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  headerSpacer: { width: 40 },
  segmentRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: "#6B7280",
  },
  segmentButtonTextActive: {
    color: "#920734",
    fontFamily: theme.fonts.bold,
  },
  segmentLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pendingOrderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  content: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 24,
  },
  pickerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    maxHeight: "70%",
  },
  pickerTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: "#111827",
    marginBottom: 10,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  pickerRowName: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#111827",
  },
  pickerRowMeta: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#9CA3AF",
  },
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: theme.spacing.sm,
  },
  stateText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#920734",
  },
  stateErrorText: { color: "#DC2626" },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#999999",
  },
  mealPlanList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  mealPlanCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  mealPlanCardDisabled: {
    opacity: 0.55,
  },
  mealPlanImage: {
    width: "100%",
    height: 100,
    backgroundColor: "#F3F4F6",
  },
  mealPlanCardBody: { padding: 10, paddingBottom: 8 },
  mealPlanTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 13,
    color: "#111827",
  },
  mealPlanPrice: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#920734",
    marginTop: 2,
  },
  mealPlanStock: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  mealPlanControls: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 6,
  },
  miniSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  miniSelectButtonText: {
    flex: 1,
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: "#374151",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 2,
  },
  stepperButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#111827",
    minWidth: 16,
    textAlign: "center",
  },
  cardPlaceOrderButton: {
    backgroundColor: "#920734",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  placeOrderButtonDisabled: {
    opacity: 0.5,
  },
  cardPlaceOrderButtonText: {
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    color: "#FFFFFF",
  },
  orderList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  orderCardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  orderCardHeaderTextBlock: {
    flex: 1,
  },
  orderDate: {
    fontFamily: theme.fonts.bold,
    fontSize: 13,
    color: "#111827",
  },
  orderStudentLine: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 7,
  },
  statusPillText: {
    fontFamily: theme.fonts.bold,
    fontSize: 9,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  orderItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1,
  },
  orderItemText: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#4B5563",
  },
  orderItemPrice: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#4B5563",
  },
  orderCardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  orderTotalLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#6B7280",
  },
  orderTotalValue: {
    fontFamily: theme.fonts.bold,
    fontSize: 13,
    color: "#920734",
  },
  cancelOrderButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  cancelOrderButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#DC2626",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 20,
  },
  pageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageIndicatorText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#6B7280",
  },
});

export default CanteenOrderDrawer;
