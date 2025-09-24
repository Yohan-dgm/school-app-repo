import { createSlice, createAction } from "@reduxjs/toolkit";
import { ProfileImage } from "../../types/auth";

// Create thunk actions for user management that will be handled by middleware
export const setUserWithPostsUpdate = createAction<any>(
  "app/setUserWithPostsUpdate",
);
export const logoutWithPostsCleanup = createAction(
  "app/logoutWithPostsCleanup",
);

// Define interface for selected student data
interface SelectedStudent {
  id: number;
  student_id: number;
  user_id: number;
  grade: string;
  class_id: number | null;
  student_calling_name: string;
  full_name: string;
  admission_number: string;
  profileImage?: any;
  campus?: string;
  gender?: string;
  dateOfBirth?: string;
  schoolHouse?: string;
  guardianInfo?: any;
  timeline?: any[];
}

interface UserData {
  id: number;
  full_name: string;
  username: string;
  email: string;
  user_type_list: any[];
  user_category: number;
  profile_image?: ProfileImage;
}

interface PaymentStatus {
  isValid: boolean;
  ups_is_active: boolean;
  message?: string;
  schoolContact?: string;
}

interface AppVersionStatus {
  user_id: number;
  username: string;
  email: string;
  iso_app_version: string;
  android_app_version: string;
  is_active: boolean;
  user_category: string;
}

interface AppState {
  token: string | null;
  isAuthenticated: boolean;
  sessionData: any;
  user: UserData | null;
  selectedStudent: SelectedStudent | null;
  paymentStatus: PaymentStatus | null;
  showPaymentOverlay: boolean;
  appVersionStatus: AppVersionStatus | null;
  showVersionUpdateOverlay: boolean;
}

const appSlice = createSlice({
  name: "app",
  initialState: {
    token: null,
    isAuthenticated: false,
    sessionData: null,
    user: null,
    selectedStudent: null,
    paymentStatus: null,
    showPaymentOverlay: false,
    appVersionStatus: null,
    showVersionUpdateOverlay: false,
  } as AppState,
  reducers: {
    setToken: (state, action) => {
      state.token = action.payload;
    },
    setIsAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
    },
    setSessionData: (state, action) => {
      console.log("🔄 Redux - setSessionData called:", {
        hasExistingData: !!state.sessionData,
        existingDataFields: state.sessionData?.data
          ? {
              id: !!state.sessionData.data.id,
              full_name: !!state.sessionData.data.full_name,
              user_category: state.sessionData.data.user_category,
              lastUpdated: state.sessionData.lastUpdated
                ? new Date(state.sessionData.lastUpdated).toISOString()
                : "No timestamp",
            }
          : null,
        newDataFields: action.payload?.data
          ? {
              id: !!action.payload.data.id,
              full_name: !!action.payload.data.full_name,
              user_category: action.payload.data.user_category,
              lastUpdated: action.payload.lastUpdated
                ? new Date(action.payload.lastUpdated).toISOString()
                : "No timestamp",
            }
          : null,
        caller: new Error().stack?.split("\n")[2]?.trim(), // Track who called this
        timestamp: new Date().toISOString(),
      });

      state.sessionData = action.payload;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setSelectedStudent: (state, action) => {
      state.selectedStudent = action.payload;
      console.log(
        "🎓 Global State - Selected student updated:",
        action.payload?.student_calling_name,
      );
    },
    clearSelectedStudent: (state) => {
      state.selectedStudent = null;
      console.log("🎓 Global State - Selected student cleared");
    },
    setPaymentStatus: (state, action) => {
      state.paymentStatus = action.payload;
      console.log("💰 Global State - Payment status updated:", action.payload);
    },
    setShowPaymentOverlay: (state, action) => {
      state.showPaymentOverlay = action.payload;
      console.log(
        "💰 Global State - Payment overlay visibility:",
        action.payload,
      );
    },
    setAppVersionStatus: (state, action) => {
      state.appVersionStatus = action.payload;
      console.log(
        "📱 Global State - App version status updated:",
        action.payload,
      );
    },
    setShowVersionUpdateOverlay: (state, action) => {
      state.showVersionUpdateOverlay = action.payload;
      console.log(
        "📱 Global State - Version update overlay visibility:",
        action.payload,
      );
    },
    logout: (state) => {
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
      state.sessionData = null;
      state.selectedStudent = null;
      state.paymentStatus = null;
      state.showPaymentOverlay = false;
      state.appVersionStatus = null;
      state.showVersionUpdateOverlay = false;
    },
    clearAuth: (state) => {
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
      state.sessionData = null;
      state.selectedStudent = null;
      state.paymentStatus = null;
      state.showPaymentOverlay = false;
      state.appVersionStatus = null;
      state.showVersionUpdateOverlay = false;
    },
  },
});

export const {
  setToken,
  logout,
  clearAuth,
  setIsAuthenticated,
  setSessionData,
  setUser,
  setSelectedStudent,
  clearSelectedStudent,
  setPaymentStatus,
  setShowPaymentOverlay,
  setAppVersionStatus,
  setShowVersionUpdateOverlay,
} = appSlice.actions;

export default appSlice.reducer;
