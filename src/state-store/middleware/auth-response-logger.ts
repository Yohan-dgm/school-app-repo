import { Middleware, isFulfilled, isRejectedWithValue } from "@reduxjs/toolkit";
import {
  setPaymentStatus,
  setShowPaymentOverlay,
  logout,
  clearAuth,
} from "../slices/app-slice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { USER_CATEGORIES } from "../../constants/userCategories";
import { userPaymentApi } from "../../api/user-payment-api";
import { persistor } from "../store";
import { router } from "expo-router";

/**
 * Enhanced middleware to:
 * 1. Log and display auth API response data in every backend request
 * 2. Validate user_payments data and show payment overlay when needed
 * 3. Handle 400/401 errors with automatic session cleanup and logout
 *
 * This middleware intercepts both fulfilled and rejected API responses:
 * - For auth endpoints: logs data, validates payments, handles payment overlay
 * - For 400/401 errors: clears session data and logs out automatically
 * - For other endpoints: shows current user context
 */
export const authResponseLogger: Middleware = (store) => (next) => (action) => {
  // Check if this is a fulfilled RTK Query action
  if (isFulfilled(action)) {
    const { meta, payload } = action;

    // Get the endpoint name from meta
    const endpointName = (meta as any)?.arg?.endpointName;

    // Check if this is an auth-related endpoint
    const isAuthEndpoint =
      endpointName &&
      (endpointName === "loginUser" ||
        endpointName === "refreshSessionData" ||
        endpointName === "checkPaymentStatus" ||
        endpointName === "verifyPin");

    // Log auth response data for auth endpoints (separate from payment validation)
    if (isAuthEndpoint && payload) {
      const paymentCount = (payload as any).data?.user_payments?.length || 0;
      const userCategory = (payload as any).data?.user_category;

      console.log(`🔐 Auth Response Logger - ${endpointName} response:`, {
        endpoint: endpointName,
        status: (payload as any).status,
        message: (payload as any).message,
        userData: (payload as any).data
          ? {
              id: (payload as any).data.id,
              username: (payload as any).data.username,
              email: (payload as any).data.email,
              userCategory: (payload as any).data.user_category,
              hasToken: !!(payload as any).data.token,
              tokenPreview: (payload as any).data.token
                ? `${(payload as any).data.token.substring(0, 15)}...`
                : "No token",
              studentCount: (payload as any).data.student_list?.length || 0,
              paymentCount: paymentCount,
              hasProfileImage: !!(payload as any).data.profile_image,
            }
          : null,
        timestamp: new Date().toISOString(),
      });

      // Display user info in console for all requests after auth
      if ((payload as any).data?.id) {
        console.log(`👤 Current User Info - Available for all requests:`, {
          userId: (payload as any).data.id,
          name: (payload as any).data.full_name,
          category: (payload as any).data.user_category,
          authenticated: true,
          lastAuthUpdate: new Date().toISOString(),
        });
      }
    }

    // PAYMENT VALIDATION - Run on EVERY API request using dedicated payment API
    if (endpointName) {
      const currentState = store.getState().app;
      const userData = currentState.user;

      // Enhanced logging to track user data state changes
      console.log(`🔍 User Data State Check - ${endpointName}:`, {
        endpoint: endpointName,
        hasUserData: !!userData,
        userDataFields: userData
          ? {
              id: !!userData.id,
              full_name: !!userData.full_name,
              username: !!userData.username,
              user_category: userData.user_category,
            }
          : null,
        timestamp: new Date().toISOString(),
      });

      // Check if this is a parent user (user_category = 1) and not the payment endpoint itself
      if (
        userData?.user_category === 1 &&
        endpointName !== "getCurrentUserPayments"
      ) {
        console.log(`💰 Payment Check Trigger - ${endpointName}:`, {
          endpoint: endpointName,
          userId: userData.id,
          userCategory: userData.user_category,
          triggeringPaymentCheck: true,
          timestamp: new Date().toISOString(),
        });

        // Dispatch the payment API call to check current user payments
        (store.dispatch as any)(
          userPaymentApi.endpoints.getCurrentUserPayments.initiate(),
        )
          .then((result: any) => {
            if (result.data) {
              // Check if user has valid payments
              const payments = result.data.data?.payments || [];
              const hasValidPayments = payments.some(
                (payment: any) =>
                  payment.is_currently_valid === true &&
                  payment.is_active === true,
              );

              console.log(`💰 Payment API Result - ${endpointName}:`, {
                endpoint: endpointName,
                totalPayments: payments.length,
                validPayments: payments.filter((p: any) => p.is_currently_valid)
                  .length,
                hasValidPayments: hasValidPayments,
                shouldShowOverlay: !hasValidPayments,
                paymentDetails: payments.map((p: any) => ({
                  id: p.id,
                  package_type: p.package_type,
                  is_active: p.is_active,
                  is_currently_valid: p.is_currently_valid,
                  status: p.status,
                })),
                summary: result.data.data?.summary,
                timestamp: new Date().toISOString(),
              });

              // Update payment status in store
              const paymentStatus = {
                isValid: hasValidPayments,
                ups_is_active: hasValidPayments,
                message: hasValidPayments
                  ? "Valid payment found"
                  : "Please update your subscription with school",
                schoolContact: "Please contact your school administration",
              };

              store.dispatch(setPaymentStatus(paymentStatus));
              store.dispatch(setShowPaymentOverlay(!hasValidPayments));
            } else {
              console.warn(`⚠️ Payment API Error - ${endpointName}:`, {
                endpoint: endpointName,
                error: result.error,
                assumingNoPayments: true,
                timestamp: new Date().toISOString(),
              });

              // If API fails, assume no payments and show overlay
              store.dispatch(
                setPaymentStatus({
                  isValid: false,
                  ups_is_active: false,
                  message:
                    "Unable to verify payment status - please contact school",
                  schoolContact: "Please contact your school administration",
                }),
              );
              store.dispatch(setShowPaymentOverlay(true));
            }
          })
          .catch((error: any) => {
            console.error(`❌ Payment API Call Failed - ${endpointName}:`, {
              endpoint: endpointName,
              error: error,
              assumingNoPayments: true,
              timestamp: new Date().toISOString(),
            });

            // If API call fails, assume no payments and show overlay
            store.dispatch(
              setPaymentStatus({
                isValid: false,
                ups_is_active: false,
                message:
                  "Unable to verify payment status - please contact school",
                schoolContact: "Please contact your school administration",
              }),
            );
            store.dispatch(setShowPaymentOverlay(true));
          });
      } else if (userData?.user_category !== 1) {
        // Not a parent user - hide overlay
        console.log(`💰 Payment Check Skipped - ${endpointName}:`, {
          endpoint: endpointName,
          userId: userData?.id,
          userCategory: userData?.user_category,
          reason: "Not parent user",
          hidingOverlay: true,
          timestamp: new Date().toISOString(),
        });

        store.dispatch(setShowPaymentOverlay(false));
      }
    }

    // For non-auth endpoints, show current user context if available
    if (!isAuthEndpoint && endpointName) {
      const currentUser = store.getState().app.user;
      const currentToken = store.getState().app.token;

      if (currentUser && currentToken) {
        console.log(`📡 API Request Context - ${endpointName}:`, {
          endpoint: endpointName,
          authenticatedUser: {
            id: currentUser.id,
            name: currentUser.full_name,
            category: currentUser.user_category,
          },
          hasValidToken: !!currentToken,
          requestTimestamp: new Date().toISOString(),
        });
      }
    }
  }

  // Handle API errors (400/401/422) with automatic logout
  if (isRejectedWithValue(action)) {
    const { meta, payload } = action;
    const endpointName = (meta as any)?.arg?.endpointName;
    const status = (payload as any)?.status || (action.error as any)?.status;

    console.log(`❌ API Error Logger - ${endpointName}:`, {
      endpoint: endpointName,
      status: status,
      error: payload,
      timestamp: new Date().toISOString(),
    });

    // Handle 400, 401, and 422 errors with automatic session cleanup
    if (status === 400 || status === 401 || status === 422) {
      console.warn(
        `🚨 Authentication Error - Status ${status} - Clearing all app data and logging out`,
      );

      // Perform cleanup asynchronously without blocking middleware
      const performCleanup = async () => {
        // Use persistor.purge() for complete data cleanup instead of manual AsyncStorage clearing
        try {
          await persistor.purge();
          console.log("✅ Persistor purged successfully");
        } catch (error) {
          console.error("❌ Error purging persistor:", error);
          // Fallback to manual clearing if persistor fails
          AsyncStorage.removeItem("persist:root").catch((err) => {
            console.error("Error clearing AsyncStorage:", err);
          });
        }

        // Clear any other manual storage items
        AsyncStorage.removeItem("loginCredentials").catch((error) => {
          console.error("Error clearing login credentials:", error);
        });

        // Navigate to login screen
        try {
          router.replace("/public/login");
          console.log("✅ Navigated to login screen");
        } catch (error) {
          console.error("❌ Error navigating to login:", error);
        }

        console.log(
          `✅ Complete session cleanup and logout completed due to ${status} error`,
        );
      };

      // Dispatch logout to clear Redux state immediately
      store.dispatch(logout());

      // Hide payment overlay since user is being logged out
      store.dispatch(setShowPaymentOverlay(false));

      // Perform cleanup asynchronously
      performCleanup();
    }
  }

  return next(action);
};
