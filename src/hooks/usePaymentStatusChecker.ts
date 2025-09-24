import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLazyCheckPaymentStatusQuery } from "@/api/auth-api";
import {
  setPaymentStatus,
  setShowPaymentOverlay,
} from "@/state-store/slices/app-slice";
import { RootState } from "@/state-store/store";
import { USER_CATEGORIES } from "@/constants/userCategories";

export const usePaymentStatusChecker = () => {
  const dispatch = useDispatch();
  const { token, isAuthenticated, sessionData } = useSelector(
    (state: RootState) => state.app,
  );
  const [checkPaymentStatus, { data, error, isLoading }] =
    useLazyCheckPaymentStatusQuery();

  const checkStatus = useCallback(async () => {
    // Only check payment status if user is fully authenticated
    if (!token || !isAuthenticated || !sessionData) {
      // Ensure overlay is hidden for non-authenticated users
      dispatch(setShowPaymentOverlay(false));
      return;
    }

    // Check if we already have payment info in session data
    if (sessionData?.data) {
      let isValid = true;
      let ups_is_active = true;
      let message = "";
      let schoolContact = "Please contact your school administration";

      // Get user category from session data
      const userCategory =
        sessionData?.user_category || sessionData?.data?.user_category;
      const isParent = userCategory === USER_CATEGORIES.PARENT; // user_category === 1

      // UPDATED LOGIC: Only show overlay for PARENT users with no payment data
      if (
        isParent &&
        (!sessionData.data.user_payments ||
          !Array.isArray(sessionData.data.user_payments) ||
          sessionData.data.user_payments.length === 0)
      ) {
        // Parent user with no payment data - show overlay
        isValid = false;
        ups_is_active = false;
        message = "Please update your subscription with school";
      } else {
        // Either not a parent user OR has payment data - don't show overlay
        isValid = true;
        ups_is_active = true;

        if (!isParent) {
          message = "Payment check not required for this user type";
        } else {
          message = "Payment data found";
        }
      }

      const paymentStatus = {
        isValid,
        ups_is_active,
        message,
        schoolContact,
      };

      dispatch(setPaymentStatus(paymentStatus));

      const shouldShowOverlay = !isValid || !ups_is_active;
      dispatch(setShowPaymentOverlay(shouldShowOverlay));
      return;
    }

    // If no session data, assume payment is valid to avoid blocking
    dispatch(
      setPaymentStatus({
        isValid: true,
        ups_is_active: true,
        message: "Payment status unknown - session data not available",
        schoolContact: "Please contact your school administration",
      }),
    );
    dispatch(setShowPaymentOverlay(false));
  }, [token, isAuthenticated, sessionData, dispatch]);

  // Check payment status when authentication state changes
  useEffect(() => {
    if (token && isAuthenticated && sessionData) {
      checkStatus();
    }
  }, [token, isAuthenticated, sessionData, checkStatus]);

  // Set up periodic checks (every 10 minutes when app is active and user is authenticated)
  // Reduced frequency since we now refresh on app foreground
  useEffect(() => {
    if (!token || !isAuthenticated || !sessionData) return;

    const interval = setInterval(
      () => {
        checkStatus();
      },
      10 * 60 * 1000,
    ); // 10 minutes

    return () => clearInterval(interval);
  }, [token, isAuthenticated, sessionData, checkStatus]);

  return {
    checkStatus,
    isLoading,
    error,
  };
};
