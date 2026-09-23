import { apiServer1 } from "./api-server-1";

/**
 * CANTEEN MANAGEMENT API
 *
 * Educators maintain a meal-plan catalog (image, title, price, stock);
 * parents order meals for a student on any date and can cancel their own
 * pending orders. No payment gateway - orders are placed/reserved only.
 *
 * Endpoints: POST /api/canteen-management/meal-plan/*
 *            POST /api/canteen-management/canteen-order/*
 */

// ===== TYPESCRIPT INTERFACES =====

export interface CanteenMealPlan {
  id: number;
  title: string;
  description: string | null;
  price: string;
  quantity_available: number;
  image_path: string | null;
  image_url: string | null;
  is_active: boolean;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export type CanteenOrderStatus = "Pending" | "Cancelled";

export interface CanteenOrderItem {
  id: number;
  canteen_order_id: number;
  meal_plan_id: number;
  meal_plan_title: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
}

export interface CanteenOrderStudentRef {
  id: number;
  full_name: string;
  full_name_with_title: string;
  admission_number: string;
  grade_level_class_id: number;
}

export interface CanteenOrder {
  id: number;
  student_id: number;
  ordered_by: number;
  order_date: string;
  status: CanteenOrderStatus;
  total_amount: string;
  items: CanteenOrderItem[];
  student?: CanteenOrderStudentRef;
}

// Laravel's default paginate() shape
export interface CanteenPaginatedData<T> {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
}

interface ApiEnvelope<T> {
  status: string;
  message: string;
  data: T;
  metadata: any;
}

// ----- Meal plan params -----

export interface GetActiveMealPlanListDataResponse
  extends ApiEnvelope<CanteenMealPlan[]> {}

export interface GetMealPlanListDataParams {
  search_phrase?: string;
  page_size: number;
  page: number;
}

export interface GetMealPlanListDataResponse
  extends ApiEnvelope<CanteenPaginatedData<CanteenMealPlan>> {}

export interface MealPlanImageFile {
  uri: string;
  name: string;
  type: string;
}

export interface CreateMealPlanParams {
  title: string;
  description?: string;
  price: number;
  quantity_available: number;
  image: MealPlanImageFile;
}

export interface UpdateMealPlanParams {
  id: number;
  title: string;
  description?: string;
  price: number;
  quantity_available: number;
  is_active: boolean;
  image?: MealPlanImageFile;
}

export interface MealPlanMutationResponse
  extends ApiEnvelope<CanteenMealPlan> {}

// ----- Order params -----

export interface CreateCanteenOrderItemInput {
  meal_plan_id: number;
  quantity: number;
}

export interface CreateCanteenOrderParams {
  student_id: number;
  order_date: string;
  items: CreateCanteenOrderItemInput[];
}

export interface GetMyCanteenOrderListDataParams {
  student_id: number;
  page_size: number;
  page: number;
}

export interface GetCanteenOrderListDataParams {
  search_phrase?: string;
  status?: CanteenOrderStatus;
  order_date?: string;
  page_size: number;
  page: number;
}

export interface CanteenOrderListResponse
  extends ApiEnvelope<CanteenPaginatedData<CanteenOrder>> {}

export interface CanteenOrderMutationResponse
  extends ApiEnvelope<CanteenOrder> {}

// ===== API ENDPOINTS =====

export const canteenManagementApi = apiServer1.injectEndpoints({
  endpoints: (builder) => ({
    getActiveMealPlanListData: builder.query<
      GetActiveMealPlanListDataResponse,
      void
    >({
      query: () => ({
        url: "api/canteen-management/meal-plan/get-active-meal-plan-list-data",
        method: "POST",
        body: {},
      }),
      providesTags: ["CanteenMealPlanList"],
    }),

    getMealPlanListData: builder.query<
      GetMealPlanListDataResponse,
      GetMealPlanListDataParams
    >({
      query: (params) => ({
        url: "api/canteen-management/meal-plan/get-meal-plan-list-data",
        method: "POST",
        body: params,
      }),
      providesTags: ["CanteenMealPlanList"],
    }),

    createMealPlan: builder.mutation<
      MealPlanMutationResponse,
      CreateMealPlanParams
    >({
      query: (params) => {
        const formData = new FormData();
        formData.append("title", params.title);
        if (params.description) {
          formData.append("description", params.description);
        }
        formData.append("price", String(params.price));
        formData.append(
          "quantity_available",
          String(params.quantity_available),
        );
        formData.append("image", params.image as any);
        return {
          url: "api/canteen-management/meal-plan/create-meal-plan",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["CanteenMealPlanList"],
    }),

    updateMealPlan: builder.mutation<
      MealPlanMutationResponse,
      UpdateMealPlanParams
    >({
      query: (params) => {
        const formData = new FormData();
        formData.append("id", String(params.id));
        formData.append("title", params.title);
        if (params.description) {
          formData.append("description", params.description);
        }
        formData.append("price", String(params.price));
        formData.append(
          "quantity_available",
          String(params.quantity_available),
        );
        formData.append("is_active", params.is_active ? "1" : "0");
        if (params.image) {
          formData.append("image", params.image as any);
        }
        return {
          url: "api/canteen-management/meal-plan/update-meal-plan",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["CanteenMealPlanList"],
    }),

    deleteMealPlan: builder.mutation<MealPlanMutationResponse, { id: number }>({
      query: (params) => ({
        url: "api/canteen-management/meal-plan/delete-meal-plan",
        method: "POST",
        body: params,
      }),
      invalidatesTags: ["CanteenMealPlanList"],
    }),

    createCanteenOrder: builder.mutation<
      CanteenOrderMutationResponse,
      CreateCanteenOrderParams
    >({
      query: (params) => ({
        url: "api/canteen-management/canteen-order/create-canteen-order",
        method: "POST",
        body: params,
      }),
      invalidatesTags: ["MyCanteenOrderList", "CanteenMealPlanList"],
    }),

    cancelCanteenOrder: builder.mutation<
      CanteenOrderMutationResponse,
      { id: number }
    >({
      query: (params) => ({
        url: "api/canteen-management/canteen-order/cancel-canteen-order",
        method: "POST",
        body: params,
      }),
      invalidatesTags: [
        "MyCanteenOrderList",
        "CanteenOrderList",
        "CanteenMealPlanList",
      ],
    }),

    getMyCanteenOrderListData: builder.query<
      CanteenOrderListResponse,
      GetMyCanteenOrderListDataParams
    >({
      query: (params) => ({
        url: "api/canteen-management/canteen-order/get-my-canteen-order-list-data",
        method: "POST",
        body: params,
      }),
      providesTags: ["MyCanteenOrderList"],
    }),

    getCanteenOrderListData: builder.query<
      CanteenOrderListResponse,
      GetCanteenOrderListDataParams
    >({
      query: (params) => ({
        url: "api/canteen-management/canteen-order/get-canteen-order-list-data",
        method: "POST",
        body: params,
      }),
      providesTags: ["CanteenOrderList"],
    }),
  }),
});

export const {
  useGetActiveMealPlanListDataQuery,
  useGetMealPlanListDataQuery,
  useCreateMealPlanMutation,
  useUpdateMealPlanMutation,
  useDeleteMealPlanMutation,
  useCreateCanteenOrderMutation,
  useCancelCanteenOrderMutation,
  useGetMyCanteenOrderListDataQuery,
  useGetCanteenOrderListDataQuery,
} = canteenManagementApi;

// ===== UI UTILITIES =====

export const getCanteenOrderStatusColor = (
  status: CanteenOrderStatus,
): string => {
  switch (status) {
    case "Pending":
      return "#D97706";
    case "Cancelled":
      return "#6B7280";
    default:
      return "#6B7280";
  }
};

export const formatCanteenDate = (dateString: string): string => {
  try {
    const datePart = dateString.split("T")[0];
    const [year, month, day] = datePart.split("-").map(Number);
    if (!year || !month || !day) return dateString;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};
