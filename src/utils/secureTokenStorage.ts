import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";

export const secureTokenStorage = {
  getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  setToken(token: string): Promise<void> {
    return SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  clearToken(): Promise<void> {
    return SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
