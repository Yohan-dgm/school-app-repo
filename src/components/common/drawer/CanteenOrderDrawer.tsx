import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
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

interface CanteenOrderDrawerProps {
  visible?: boolean;
  onClose: () => void;
  studentId: number;
  studentName?: string;
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

  // Order Meal tab state
  const [orderDate, setOrderDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cart, setCart] = useState<Record<number, number>>({});

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
    { student_id: studentId, page: historyPage, page_size: PAGE_SIZE },
    { skip: !studentId || activeTab !== "history" },
  );
  const orderHistory = orderHistoryData?.data;

  const [createCanteenOrder, { isLoading: isPlacingOrder }] =
    useCreateCanteenOrderMutation();
  const [cancelCanteenOrder, { isLoading: isCancelling }] =
    useCancelCanteenOrderMutation();

  const setQuantity = (mealPlanId: number, quantity: number, max: number) => {
    const clamped = Math.max(0, Math.min(quantity, max));
    setCart((prev) => {
      const next = { ...prev };
      if (clamped === 0) {
        delete next[mealPlanId];
      } else {
        next[mealPlanId] = clamped;
      }
      return next;
    });
  };

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const mealPlan = mealPlans.find((mp) => mp.id === Number(id));
    return sum + (mealPlan ? parseFloat(mealPlan.price) * qty : 0);
  }, 0);
  const cartItemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const handlePlaceOrder = async () => {
    if (cartItemCount === 0) return;
    try {
      await createCanteenOrder({
        student_id: studentId,
        order_date: toDateInputValue(orderDate),
        items: Object.entries(cart).map(([mealPlanId, quantity]) => ({
          meal_plan_id: Number(mealPlanId),
          quantity,
        })),
      }).unwrap();
      setCart({});
      Alert.alert("Order Placed", "Your canteen order has been placed.");
      setActiveTab("history");
      setHistoryPage(1);
    } catch (err: any) {
      Alert.alert(
        "Order Failed",
        err?.data?.message || "Could not place your order. Please try again.",
      );
    }
  };

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
          <Text
            style={[
              styles.segmentButtonText,
              activeTab === "history" && styles.segmentButtonTextActive,
            ]}
          >
            My Orders
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "order" ? (
        <>
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Date selector */}
            <View style={styles.dateBlock}>
              <Text style={styles.sectionLabel}>Order For</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialIcons
                  name="calendar-today"
                  size={18}
                  color="#920734"
                />
                <Text style={styles.dateButtonText}>
                  {orderDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
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
            </View>

            {/* Loading / Error */}
            {isMealPlansLoading && (
              <View style={styles.stateContainer}>
                <MaterialIcons name="sync" size={28} color="#920734" />
                <Text style={styles.stateText}>Loading meal plans...</Text>
              </View>
            )}
            {!isMealPlansLoading && mealPlansError && (
              <View style={styles.stateContainer}>
                <MaterialIcons name="error-outline" size={28} color="#DC2626" />
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
                  <Text style={styles.emptyText}>No meal plans available</Text>
                </View>
              )}

            {/* Meal plan list */}
            <View style={styles.mealPlanList}>
              {mealPlans.map((mealPlan) => (
                <MealPlanCard
                  key={mealPlan.id}
                  mealPlan={mealPlan}
                  quantity={cart[mealPlan.id] || 0}
                  onChangeQuantity={(qty) =>
                    setQuantity(mealPlan.id, qty, mealPlan.quantity_available)
                  }
                />
              ))}
            </View>
          </ScrollView>

          {/* Cart footer */}
          {cartItemCount > 0 && (
            <View style={styles.cartFooter}>
              <View>
                <Text style={styles.cartFooterCount}>
                  {cartItemCount} item{cartItemCount > 1 ? "s" : ""}
                </Text>
                <Text style={styles.cartFooterTotal}>
                  Rs. {cartTotal.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.placeOrderButton}
                onPress={handlePlaceOrder}
                disabled={isPlacingOrder}
              >
                {isPlacingOrder ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.placeOrderButtonText}>Place Order</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                <MaterialIcons name="receipt-long" size={40} color="#CCCCCC" />
                <Text style={styles.emptyText}>No orders yet</Text>
              </View>
            )}

          <View style={styles.orderList}>
            {orderHistory?.data.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderCardHeaderRow}>
                  <Text style={styles.orderDate}>
                    {formatCanteenDate(order.order_date)}
                  </Text>
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
                <MaterialIcons name="chevron-left" size={20} color="#920734" />
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
                  setHistoryPage((p) => Math.min(orderHistory.last_page, p + 1))
                }
              >
                <MaterialIcons name="chevron-right" size={20} color="#920734" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

interface MealPlanCardProps {
  mealPlan: CanteenMealPlan;
  quantity: number;
  onChangeQuantity: (quantity: number) => void;
}

const MealPlanCard: React.FC<MealPlanCardProps> = ({
  mealPlan,
  quantity,
  onChangeQuantity,
}) => {
  const isOutOfStock = mealPlan.quantity_available === 0;
  return (
    <View
      style={[styles.mealPlanCard, isOutOfStock && styles.mealPlanCardDisabled]}
    >
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
      {!isOutOfStock && (
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => onChangeQuantity(quantity - 1)}
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
            onPress={() => onChangeQuantity(quantity + 1)}
            disabled={quantity >= mealPlan.quantity_available}
          >
            <MaterialIcons
              name="add"
              size={16}
              color={
                quantity >= mealPlan.quantity_available ? "#CCCCCC" : "#920734"
              }
            />
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  dateBlock: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: theme.fonts.bold,
    fontSize: 13,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: "flex-start",
  },
  dateButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#111827",
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
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  mealPlanCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    gap: 12,
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
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  mealPlanCardBody: { flex: 1 },
  mealPlanTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#111827",
  },
  mealPlanPrice: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: "#920734",
    marginTop: 2,
  },
  mealPlanStock: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  cartFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
  },
  cartFooterCount: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#6B7280",
  },
  cartFooterTotal: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: "#111827",
  },
  placeOrderButton: {
    backgroundColor: "#920734",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 130,
    alignItems: "center",
  },
  placeOrderButtonText: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  orderList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  orderCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  orderDate: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#111827",
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  orderItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  orderItemText: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: "#4B5563",
  },
  orderItemPrice: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: "#4B5563",
  },
  orderCardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  orderTotalLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: "#6B7280",
  },
  orderTotalValue: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#920734",
  },
  cancelOrderButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
