import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLazyRefreshSessionDataQuery } from "@/api/auth-api";
import { setSessionData, setUser } from "@/state-store/slices/app-slice";
import store, { RootState } from "@/state-store/store";

export const useSessionRefresh = () => {
  const dispatch = useDispatch();
  const { token, isAuthenticated } = useSelector(
    (state: RootState) => state.app,
  );
  const [refreshSessionData, { isLoading, error }] =
    useLazyRefreshSessionDataQuery();

  const refreshSession = useCallback(async () => {
    // Only refresh if user is authenticated
    if (!token || !isAuthenticated) {
      console.log(
        "🔄 Session Refresh - User not authenticated, skipping refresh",
      );
      return null;
    }

    console.log("🔄 Session Refresh - Starting session data refresh...");

    try {
      const result = await refreshSessionData().unwrap();
      console.log("🔄 Session Refresh - Fresh data received:", {
        hasData: !!result?.data,
        resultStatus: result?.status,
        userCategory: result?.data?.user_category,
        hasUserPayments: !!result?.data?.user_payments,
        userPaymentsCount: result?.data?.user_payments?.length || 0,
        timestamp: new Date().toISOString(),
      });

      // Validate and compare data before updating to prevent overwrites with incomplete data
      if (result?.data && (result.status === "successful" || result.data.id)) {
        // Get current state for comparison
        const currentState = store.getState();
        const currentSessionData = currentState.app.sessionData;
        const currentUser = currentState.app.user;

        // Validate that new data has critical fields
        const hasRequiredFields =
          result.data.id &&
          result.data.full_name &&
          result.data.user_category !== undefined;

        // Compare data completeness
        const currentDataComplete =
          currentSessionData?.data?.id &&
          currentSessionData.data.full_name &&
          currentSessionData.data.user_category !== undefined;

        console.log("📊 Session Refresh - Data validation:", {
          newDataValid: hasRequiredFields,
          currentDataComplete: currentDataComplete,
          newDataFields: {
            id: !!result.data.id,
            full_name: !!result.data.full_name,
            user_category: result.data.user_category !== undefined,
            user_payments: !!result.data.user_payments,
            profile_image: !!result.data.profile_image,
          },
          currentDataFields: currentSessionData?.data
            ? {
                id: !!currentSessionData.data.id,
                full_name: !!currentSessionData.data.full_name,
                user_category:
                  currentSessionData.data.user_category !== undefined,
                user_payments: !!currentSessionData.data.user_payments,
                profile_image: !!currentSessionData.data.profile_image,
              }
            : null,
        });

        // Only update if new data has required fields
        if (hasRequiredFields) {
          // Add timestamp to track data freshness
          const enhancedResult = {
            ...result,
            lastUpdated: Date.now(),
          };

          // Update session data in Redux store
          dispatch(setSessionData(enhancedResult));

          // Update user data as well
          const userData = {
            id: result.data.id,
            full_name: result.data.full_name,
            username: result.data.username,
            email: result.data.email,
            user_type_list: result.data.user_type_list,
            user_category: result.data.user_category,
            profile_image: result.data.profile_image,
          };
          dispatch(setUser(userData));

          console.log(
            "✅ Session Refresh - Session data updated successfully with validation",
          );
          return enhancedResult;
        } else {
          console.warn(
            "⚠️ Session Refresh - New data missing critical fields, keeping current data:",
            {
              missingFields: {
                id: !result.data.id,
                full_name: !result.data.full_name,
                user_category: result.data.user_category === undefined,
              },
            },
          );
          return currentSessionData;
        }
      } else {
        console.warn(
          "⚠️ Session Refresh - No valid user data in response, keeping current state",
        );
        return null;
      }
    } catch (error: any) {
      console.error("❌ Session Refresh - Error refreshing session:", {
        error: error,
        status: error?.status,
        message: error?.message,
        timestamp: new Date().toISOString(),
      });

      // Handle specific error types
      if (error?.status === 404) {
        console.warn(
          "⚠️ Session Refresh - API endpoint not found, backend may need to implement user data refresh endpoint",
        );
      } else if (error?.status === 401) {
        console.warn(
          "⚠️ Session Refresh - Authentication failed, user may need to re-login",
        );
      } else if (error?.status === 500) {
        console.warn(
          "⚠️ Session Refresh - Server error, will retry on next app foreground",
        );
      }

      // Don't throw error to avoid breaking the app
      return null;
    }
  }, [token, isAuthenticated, refreshSessionData, dispatch]);

  return {
    refreshSession,
    isLoading,
    error,
  };
};
