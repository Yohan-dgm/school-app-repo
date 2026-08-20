import type { Middleware } from "@reduxjs/toolkit";
import { setToken, logout, clearAuth } from "../slices/app-slice";
import { secureTokenStorage } from "../../utils/secureTokenStorage";

// Keeps expo-secure-store in sync with the token in the `app` slice.
// The token itself is stripped from the AsyncStorage-backed redux-persist
// blob (see stripTokenTransform in store.ts) so it never sits in plaintext
// device storage.
export const secureTokenMiddleware: Middleware = () => (next) => (action) => {
  const result = next(action);

  if (setToken.match(action)) {
    if (action.payload) {
      secureTokenStorage.setToken(action.payload).catch(() => {});
    } else {
      secureTokenStorage.clearToken().catch(() => {});
    }
  } else if (logout.match(action) || clearAuth.match(action)) {
    secureTokenStorage.clearToken().catch(() => {});
  }

  return result;
};
