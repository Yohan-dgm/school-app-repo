import { apiServer1 } from "../api/api-server-1";
import { apiService } from "../services/api/ApiService";
import { studentExamApi } from "../api/student-exam-api";
import { studentExamReportApi } from "../api/student-exam-report-api";
import appSlice from "./slices/app-slice";
import schoolPostsSlice from "./slices/school-life/school-posts-slice";
import classPostsSlice from "./slices/school-life/class-posts-slice";
import studentPostsSlice from "./slices/school-life/student-posts-slice";
import calendarSlice from "./slices/calendar/calendarSlice";
import studentGrowthSlice from "./slices/student-growth/studentGrowthSlice";
import educatorFeedbackSlice from "./slices/educator/educatorFeedbackSliceWithAPI";
import attendanceSlice from "./slices/educator/attendanceSlice";
import studentAnalysisSlice from "./slices/educator/studentAnalysisSlice";
import paymentSlice from "./slices/payment/paymentSlice";
import { userPostsMiddleware } from "./middleware/user-posts-middleware";
import { studentSelectionMiddleware } from "./middleware/student-selection-middleware";
import { authResponseLogger } from "./middleware/auth-response-logger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Middleware, MiddlewareAPI } from "@reduxjs/toolkit";
import {
  combineReducers,
  configureStore,
  isRejectedWithValue,
} from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from "redux-persist";

const persistConfig = {
  key: "root",
  version: 2, // Increment version to trigger migration
  storage: AsyncStorage,
  blacklist: [
    apiServer1.reducerPath,
    apiService.reducerPath,
    studentExamApi.reducerPath,
    studentExamReportApi.reducerPath,
  ], // these reduce will not persist data (NOTE: blacklist rtk api slices so that to use tags)
  migrate: (state: any) => {
    // Handle calendar slice migration
    if (state && state.calendar && !state.calendar.lastFetched) {
      state.calendar.lastFetched = null;
    }
    return Promise.resolve(state);
  },
  // whitelist: ['users'], //these reduce will persist data
};

const getEnhancers = (getDefaultEnhancers: any) => {
  if (process.env.NODE_ENV === "development") {
    const reactotron = require("../utils/reactotronConfig").default;
    return getDefaultEnhancers().concat(reactotron.createEnhancer());
  }
  return getDefaultEnhancers();
};

/**
 * On api error this will be called
 */
export const rtkQueryErrorLogger: Middleware =
  (api: MiddlewareAPI) => (next) => (action) => {
    // RTK Query uses `createAsyncThunk` from redux-toolkit under the hood, so we're able to utilize these matchers!
    if (isRejectedWithValue(action)) {
      // Check if this is an authentication error
      const isAuthError =
        (action.meta as any)?.arg?.endpointName === "loginUser" ||
        (action.meta as any)?.baseQueryMeta?.request?.url?.includes("sign-in");

      if (!isAuthError) {
        console.log("isRejectedWithValue", action.error, action.payload);
        // alert(JSON.stringify(action)); // This is just an example. You can replace it with your preferred method for displaying notifications.
      }
    }
    return next(action);
  };

// https://redux-toolkit.js.org/rtk-query/overview#configure-the-store
// Add the generated reducer as a specific top-level slice
const rootReducer = combineReducers({
  app: appSlice,
  apiServer1: apiServer1.reducer,
  [apiService.reducerPath]: apiService.reducer,
  [studentExamApi.reducerPath]: studentExamApi.reducer,
  [studentExamReportApi.reducerPath]: studentExamReportApi.reducer,
  schoolPosts: schoolPostsSlice,
  classPosts: classPostsSlice,
  studentPosts: studentPostsSlice,
  calendar: calendarSlice,
  studentGrowth: studentGrowthSlice,
  educatorFeedback: educatorFeedbackSlice,
  attendance: attendanceSlice,
  studentAnalysis: studentAnalysisSlice,
  payment: paymentSlice,
});
export type RootReducer = ReturnType<typeof rootReducer>;
const persistedReducer = persistReducer<RootReducer>(
  persistConfig,
  rootReducer,
);

const store = configureStore({
  reducer: persistedReducer,
  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of `rtk-query`.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Configure serializable check for redux-persist
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        warnAfter: 128, // Increase from default 32ms to 128ms
      },
      // Configure immutable state check for performance
      immutableCheck: {
        warnAfter: 128, // Increase threshold from 32ms to 128ms
        // Ignore specific state paths that are known to be large
        ignoredPaths: [
          "apiServer1",
          "apiService",
          "studentExamApi",
          "studentExamReportApi",
          "calendar.allEvents", // Ignore calendar events array for performance
        ],
      },
    }).concat(
      apiServer1.middleware,
      apiService.middleware,
      studentExamApi.middleware,
      studentExamReportApi.middleware,
      rtkQueryErrorLogger,
      userPostsMiddleware,
      studentSelectionMiddleware,
      authResponseLogger,
    ),
  enhancers: getEnhancers,
});

setupListeners(store.dispatch);

// Create persistor for external use in middleware
const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
export { persistor };
