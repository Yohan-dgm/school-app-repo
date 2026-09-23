import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../../../../styles/theme";
import {
  useGetMealPlanListDataQuery,
  useCreateMealPlanMutation,
  useUpdateMealPlanMutation,
  useDeleteMealPlanMutation,
  useGetCanteenOrderListDataQuery,
  CanteenMealPlan,
  CanteenOrderStatus,
  MealPlanImageFile,
  getCanteenOrderStatusColor,
  formatCanteenDate,
} from "../../../../../api/canteen-management-api";

interface CanteenManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 10;
const ORDER_STATUS_FILTERS: (CanteenOrderStatus | "All")[] = [
  "All",
  "Pending",
  "Cancelled",
];

const toDateInputString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getApiErrorMessage = (error: any): string => {
  return (
    error?.data?.message ||
    error?.data?.error ||
    error?.error ||
    "Something went wrong. Please try again."
  );
};

const emptyForm = {
  title: "",
  description: "",
  price: "",
  quantityAvailable: "",
  isActive: true,
};

const CanteenManagementModal: React.FC<CanteenManagementModalProps> = ({
  visible,
  onClose,
}) => {
  const [topTab, setTopTab] = useState<"mealPlans" | "orders">("mealPlans");
  const [view, setView] = useState<"list" | "form">("list");

  // Meal plans list state
  const [mealPlanSearch, setMealPlanSearch] = useState("");
  const [mealPlanPage, setMealPlanPage] = useState(1);

  // Meal plan form state
  const [editingMealPlan, setEditingMealPlan] =
    useState<CanteenMealPlan | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageAsset, setImageAsset] = useState<MealPlanImageFile | null>(null);

  // Orders state
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    CanteenOrderStatus | "All"
  >("All");
  const [orderDateFilter, setOrderDateFilter] = useState<Date | null>(null);
  const [showOrderDatePicker, setShowOrderDatePicker] = useState(false);
  const [orderPage, setOrderPage] = useState(1);

  const {
    data: mealPlanData,
    isLoading: isLoadingMealPlans,
    error: mealPlanError,
  } = useGetMealPlanListDataQuery(
    {
      search_phrase: mealPlanSearch || undefined,
      page: mealPlanPage,
      page_size: PAGE_SIZE,
    },
    { skip: !visible || topTab !== "mealPlans" || view !== "list" },
  );
  const mealPlans = mealPlanData?.data?.data || [];

  const {
    data: orderData,
    isLoading: isLoadingOrders,
    isFetching: isFetchingOrders,
    error: orderError,
  } = useGetCanteenOrderListDataQuery(
    {
      search_phrase: orderSearch || undefined,
      status: orderStatusFilter === "All" ? undefined : orderStatusFilter,
      order_date: orderDateFilter
        ? toDateInputString(orderDateFilter)
        : undefined,
      page: orderPage,
      page_size: PAGE_SIZE,
    },
    { skip: !visible || topTab !== "orders" },
  );
  const orders = orderData?.data?.data || [];

  const [createMealPlan, { isLoading: isCreating }] =
    useCreateMealPlanMutation();
  const [updateMealPlan, { isLoading: isUpdating }] =
    useUpdateMealPlanMutation();
  const [deleteMealPlan] = useDeleteMealPlanMutation();
  const isSubmitting = isCreating || isUpdating;

  const resetForm = () => {
    setForm(emptyForm);
    setImageAsset(null);
    setEditingMealPlan(null);
  };

  const handleClose = () => {
    resetForm();
    setView("list");
    setTopTab("mealPlans");
    onClose();
  };

  const openCreateForm = () => {
    resetForm();
    setView("form");
  };

  const openEditForm = (mealPlan: CanteenMealPlan) => {
    setEditingMealPlan(mealPlan);
    setForm({
      title: mealPlan.title,
      description: mealPlan.description || "",
      price: mealPlan.price,
      quantityAvailable: String(mealPlan.quantity_available),
      isActive: mealPlan.is_active,
    });
    setImageAsset(null);
    setView("form");
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setImageAsset({
        uri: asset.uri,
        name: asset.fileName || `meal_plan_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      Alert.alert("Missing title", "Please enter a meal title.");
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      Alert.alert("Invalid price", "Please enter a valid price.");
      return;
    }
    const quantity = parseInt(form.quantityAvailable, 10);
    if (isNaN(quantity) || quantity < 0) {
      Alert.alert("Invalid quantity", "Please enter a valid quantity.");
      return;
    }
    if (!editingMealPlan && !imageAsset) {
      Alert.alert("Image required", "Please select an image for this meal.");
      return;
    }

    try {
      if (editingMealPlan) {
        await updateMealPlan({
          id: editingMealPlan.id,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          price,
          quantity_available: quantity,
          is_active: form.isActive,
          image: imageAsset || undefined,
        }).unwrap();
      } else {
        await createMealPlan({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          price,
          quantity_available: quantity,
          image: imageAsset as MealPlanImageFile,
        }).unwrap();
      }
      resetForm();
      setView("list");
    } catch (error) {
      Alert.alert("Failed", getApiErrorMessage(error));
    }
  };

  const handleDelete = (mealPlan: CanteenMealPlan) => {
    Alert.alert(
      "Remove meal plan",
      `Remove "${mealPlan.title}" from the catalog? Parents will no longer be able to order it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMealPlan({ id: mealPlan.id }).unwrap();
            } catch (error) {
              Alert.alert("Failed", getApiErrorMessage(error));
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          {view === "form" ? (
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => {
                resetForm();
                setView("list");
              }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#920734" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerIconButton} />
          )}
          <Text style={styles.headerTitle}>
            {view === "form"
              ? editingMealPlan
                ? "Edit Meal Plan"
                : "New Meal Plan"
              : "Canteen Management"}
          </Text>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={handleClose}
          >
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {view === "list" && (
          <View style={styles.topTabRow}>
            <TouchableOpacity
              style={[
                styles.topTabButton,
                topTab === "mealPlans" && styles.topTabButtonActive,
              ]}
              onPress={() => setTopTab("mealPlans")}
            >
              <Text
                style={[
                  styles.topTabButtonText,
                  topTab === "mealPlans" && styles.topTabButtonTextActive,
                ]}
              >
                Meal Plans
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.topTabButton,
                topTab === "orders" && styles.topTabButtonActive,
              ]}
              onPress={() => setTopTab("orders")}
            >
              <Text
                style={[
                  styles.topTabButtonText,
                  topTab === "orders" && styles.topTabButtonTextActive,
                ]}
              >
                Orders
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {view === "form" ? (
          <ScrollView
            style={styles.formScroll}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.imagePickerBox}
              onPress={handlePickImage}
            >
              {imageAsset ? (
                <Image
                  source={{ uri: imageAsset.uri }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
              ) : editingMealPlan?.image_url ? (
                <Image
                  source={{ uri: editingMealPlan.image_url }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <MaterialIcons name="add-a-photo" size={28} color="#9CA3AF" />
                  <Text style={styles.imagePickerPlaceholderText}>
                    Add Photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.formLabel}>Title</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Chicken Fried Rice"
              placeholderTextColor="#9CA3AF"
              value={form.title}
              onChangeText={(text) => setForm((f) => ({ ...f, title: text }))}
            />

            <Text style={styles.formLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.formInput, styles.formInputMultiline]}
              placeholder="Short description"
              placeholderTextColor="#9CA3AF"
              value={form.description}
              onChangeText={(text) =>
                setForm((f) => ({ ...f, description: text }))
              }
              multiline
            />

            <View style={styles.formRow}>
              <View style={styles.formRowItem}>
                <Text style={styles.formLabel}>Price (Rs.)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  value={form.price}
                  onChangeText={(text) =>
                    setForm((f) => ({ ...f, price: text }))
                  }
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.formRowItem}>
                <Text style={styles.formLabel}>Quantity Available</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  value={form.quantityAvailable}
                  onChangeText={(text) =>
                    setForm((f) => ({ ...f, quantityAvailable: text }))
                  }
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {editingMealPlan && (
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>
                  Active (visible to parents)
                </Text>
                <Switch
                  value={form.isActive}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, isActive: value }))
                  }
                  trackColor={{ true: "#920734" }}
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingMealPlan ? "Save Changes" : "Add Meal Plan"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : topTab === "mealPlans" ? (
          <>
            <View style={styles.searchRow}>
              <View style={styles.searchInputWrapper}>
                <MaterialIcons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search meal plans"
                  placeholderTextColor="#9CA3AF"
                  value={mealPlanSearch}
                  onChangeText={(text) => {
                    setMealPlanSearch(text);
                    setMealPlanPage(1);
                  }}
                />
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={openCreateForm}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.listScroll}
              showsVerticalScrollIndicator={false}
            >
              {isLoadingMealPlans && (
                <View style={styles.stateContainer}>
                  <ActivityIndicator color="#920734" />
                  <Text style={styles.stateText}>Loading meal plans...</Text>
                </View>
              )}
              {!isLoadingMealPlans && mealPlanError && (
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
              {!isLoadingMealPlans &&
                !mealPlanError &&
                mealPlans.length === 0 && (
                  <View style={styles.stateContainer}>
                    <MaterialIcons
                      name="restaurant-menu"
                      size={36}
                      color="#CCCCCC"
                    />
                    <Text style={styles.stateText}>No meal plans yet</Text>
                  </View>
                )}

              {mealPlans.map((mealPlan) => (
                <View key={mealPlan.id} style={styles.mealPlanRow}>
                  <Image
                    source={
                      mealPlan.image_url
                        ? { uri: mealPlan.image_url }
                        : undefined
                    }
                    style={styles.mealPlanThumb}
                    contentFit="cover"
                  />
                  <View style={styles.mealPlanRowBody}>
                    <View style={styles.mealPlanRowTopLine}>
                      <Text style={styles.mealPlanRowTitle} numberOfLines={1}>
                        {mealPlan.title}
                      </Text>
                      <View
                        style={[
                          styles.activePill,
                          {
                            backgroundColor: mealPlan.is_active
                              ? "#16A34A"
                              : "#9CA3AF",
                          },
                        ]}
                      >
                        <Text style={styles.activePillText}>
                          {mealPlan.is_active ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.mealPlanRowMeta}>
                      Rs. {mealPlan.price} · {mealPlan.quantity_available} in
                      stock
                    </Text>
                  </View>
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      style={styles.actionIconButton}
                      onPress={() => openEditForm(mealPlan)}
                    >
                      <MaterialIcons name="edit" size={16} color="#920734" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionIconButton, styles.deleteButton]}
                      onPress={() => handleDelete(mealPlan)}
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={16}
                        color="#DC2626"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {mealPlanData?.data && mealPlanData.data.last_page > 1 && (
                <PaginationRow
                  currentPage={mealPlanData.data.current_page}
                  lastPage={mealPlanData.data.last_page}
                  onPrev={() => setMealPlanPage((p) => Math.max(1, p - 1))}
                  onNext={() =>
                    setMealPlanPage((p) =>
                      Math.min(mealPlanData.data.last_page, p + 1),
                    )
                  }
                />
              )}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={styles.filterRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipRow}
              >
                {ORDER_STATUS_FILTERS.map((status) => {
                  const isActive = orderStatusFilter === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterChip,
                        isActive && styles.filterChipActive,
                      ]}
                      onPress={() => {
                        setOrderStatusFilter(status);
                        setOrderPage(1);
                      }}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isActive && styles.filterChipTextActive,
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    orderDateFilter && styles.filterChipActive,
                  ]}
                  onPress={() => setShowOrderDatePicker(true)}
                >
                  <MaterialIcons
                    name="calendar-today"
                    size={13}
                    color={orderDateFilter ? "#FFFFFF" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      orderDateFilter && styles.filterChipTextActive,
                      { marginLeft: 4 },
                    ]}
                  >
                    {orderDateFilter
                      ? formatCanteenDate(toDateInputString(orderDateFilter))
                      : "Any Date"}
                  </Text>
                </TouchableOpacity>
                {orderDateFilter && (
                  <TouchableOpacity
                    style={styles.clearDateButton}
                    onPress={() => setOrderDateFilter(null)}
                  >
                    <MaterialIcons name="close" size={14} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
            {showOrderDatePicker && (
              <DateTimePicker
                value={orderDateFilter || new Date()}
                mode="date"
                display="default"
                onChange={(_event, selectedDate) => {
                  setShowOrderDatePicker(false);
                  if (selectedDate) {
                    setOrderDateFilter(selectedDate);
                    setOrderPage(1);
                  }
                }}
              />
            )}

            <View style={styles.searchRow}>
              <View style={styles.searchInputWrapper}>
                <MaterialIcons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search student name or admission no."
                  placeholderTextColor="#9CA3AF"
                  value={orderSearch}
                  onChangeText={(text) => {
                    setOrderSearch(text);
                    setOrderPage(1);
                  }}
                />
              </View>
            </View>

            <ScrollView
              style={styles.listScroll}
              showsVerticalScrollIndicator={false}
            >
              {isLoadingOrders && (
                <View style={styles.stateContainer}>
                  <ActivityIndicator color="#920734" />
                  <Text style={styles.stateText}>Loading orders...</Text>
                </View>
              )}
              {!isLoadingOrders && orderError && (
                <View style={styles.stateContainer}>
                  <MaterialIcons
                    name="error-outline"
                    size={28}
                    color="#DC2626"
                  />
                  <Text style={[styles.stateText, styles.stateErrorText]}>
                    Failed to load orders
                  </Text>
                </View>
              )}
              {!isLoadingOrders && !orderError && orders.length === 0 && (
                <View style={styles.stateContainer}>
                  <MaterialIcons
                    name="receipt-long"
                    size={36}
                    color="#CCCCCC"
                  />
                  <Text style={styles.stateText}>No orders found</Text>
                </View>
              )}

              {orders.map((order) => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderCardTopRow}>
                    <Text style={styles.orderStudentName} numberOfLines={1}>
                      {order.student?.full_name_with_title ||
                        order.student?.full_name ||
                        `Student #${order.student_id}`}
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
                  <Text style={styles.orderMeta}>
                    {order.student?.admission_number
                      ? `${order.student.admission_number} · `
                      : ""}
                    {formatCanteenDate(order.order_date)}
                  </Text>
                  {order.items.map((item) => (
                    <Text
                      key={item.id}
                      style={styles.orderItemLine}
                      numberOfLines={1}
                    >
                      {item.quantity}x {item.meal_plan_title}
                    </Text>
                  ))}
                  <Text style={styles.orderTotal}>
                    Total: Rs. {order.total_amount}
                  </Text>
                </View>
              ))}

              {isFetchingOrders && !isLoadingOrders && (
                <ActivityIndicator
                  color="#920734"
                  style={{ marginVertical: 12 }}
                />
              )}

              {orderData?.data && orderData.data.last_page > 1 && (
                <PaginationRow
                  currentPage={orderData.data.current_page}
                  lastPage={orderData.data.last_page}
                  onPrev={() => setOrderPage((p) => Math.max(1, p - 1))}
                  onNext={() =>
                    setOrderPage((p) =>
                      Math.min(orderData.data.last_page, p + 1),
                    )
                  }
                />
              )}
            </ScrollView>
          </>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

interface PaginationRowProps {
  currentPage: number;
  lastPage: number;
  onPrev: () => void;
  onNext: () => void;
}

const PaginationRow: React.FC<PaginationRowProps> = ({
  currentPage,
  lastPage,
  onPrev,
  onNext,
}) => (
  <View style={styles.paginationRow}>
    <TouchableOpacity
      style={[styles.pageButton, currentPage <= 1 && styles.pageButtonDisabled]}
      disabled={currentPage <= 1}
      onPress={onPrev}
    >
      <MaterialIcons name="chevron-left" size={20} color="#920734" />
    </TouchableOpacity>
    <Text style={styles.pageIndicatorText}>
      Page {currentPage} of {lastPage}
    </Text>
    <TouchableOpacity
      style={[
        styles.pageButton,
        currentPage >= lastPage && styles.pageButtonDisabled,
      ]}
      disabled={currentPage >= lastPage}
      onPress={onNext}
    >
      <MaterialIcons name="chevron-right" size={20} color="#920734" />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerIconButton: { width: 40, alignItems: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: theme.fonts.bold,
    fontSize: 17,
    color: "#111827",
  },
  topTabRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
  },
  topTabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  topTabButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  topTabButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: "#6B7280",
  },
  topTabButtonTextActive: { color: "#920734", fontFamily: theme.fonts.bold },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: "#111827",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#920734",
    alignItems: "center",
    justifyContent: "center",
  },
  listScroll: { flex: 1, paddingHorizontal: 16 },
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    gap: theme.spacing.sm,
  },
  stateText: { fontFamily: theme.fonts.medium, fontSize: 14, color: "#920734" },
  stateErrorText: { color: "#DC2626" },
  mealPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  mealPlanThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  mealPlanRowBody: { flex: 1 },
  mealPlanRowTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  mealPlanRowTitle: {
    flex: 1,
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#111827",
  },
  activePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  activePillText: {
    fontFamily: theme.fonts.bold,
    fontSize: 9,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  mealPlanRowMeta: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },
  rowActions: { flexDirection: "row", gap: 8 },
  actionIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FDF2F8",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: { backgroundColor: "#FEF2F2" },
  formScroll: { flex: 1, padding: 16 },
  imagePickerBox: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginBottom: 16,
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePickerPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  imagePickerPlaceholderText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: "#9CA3AF",
  },
  formLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
    marginTop: 4,
  },
  formInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#111827",
    marginBottom: 12,
  },
  formInputMultiline: { minHeight: 70, textAlignVertical: "top" },
  formRow: { flexDirection: "row", gap: 12 },
  formRowItem: { flex: 1 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: "#920734",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 30,
  },
  submitButtonText: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  filterRow: { paddingHorizontal: 16, paddingTop: 8 },
  filterChipRow: { gap: 8, alignItems: "center" },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: { backgroundColor: "#920734", borderColor: "#920734" },
  filterChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#6B7280",
  },
  filterChipTextActive: { color: "#FFFFFF" },
  clearDateButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  orderCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  orderStudentName: {
    flex: 1,
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#111827",
  },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  statusPillText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  orderMeta: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 3,
    marginBottom: 6,
  },
  orderItemLine: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: "#4B5563",
  },
  orderTotal: {
    fontFamily: theme.fonts.bold,
    fontSize: 13,
    color: "#920734",
    marginTop: 6,
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
  pageButtonDisabled: { opacity: 0.4 },
  pageIndicatorText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#6B7280",
  },
});

export default CanteenManagementModal;
