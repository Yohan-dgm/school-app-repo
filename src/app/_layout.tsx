// IMMEDIATE DEBUG - Check if _layout.tsx is loading
console.log("🔴 [CRITICAL DEBUG] _layout.tsx file is loading...");

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import stateStore from "../state-store/store";
import { SplashScreen } from "../components/modules/SplashScreen";
import Toast from "react-native-toast-message";
import { AndroidConfig } from "../lib/android-config";
import { AuthProvider } from "../context/AuthContext";
import { DrawerProvider } from "../context/DrawerContext";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { AppState, AppStateStatus, Platform, useWindowDimensions } from "react-native";
// LogBox import disabled to prevent web bundling issues
let LogBox: any = null;
if (Platform.OS !== "web") {
  LogBox = require("react-native").LogBox;
}
import * as ExpoSplashScreen from "expo-splash-screen";
import * as ScreenOrientation from "expo-screen-orientation";
import NetInfo from "@react-native-community/netinfo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../state-store/store";
import { setToken } from "../state-store/slices/app-slice";
import { secureTokenStorage } from "../utils/secureTokenStorage";
// Test import immediately
console.log("🔵 [_LAYOUT DEBUG] Importing SafeBackgroundNotificationService...");
import SafeBackgroundNotificationService from "../components/notifications/SafeBackgroundNotificationService";
console.log("🔵 [_LAYOUT DEBUG] SafeBackgroundNotificationService imported successfully:", !!SafeBackgroundNotificationService);

// import { SplashUtils } from "../utils/splash-utils";
import "../../global.css";

// Import debug utilities in development
// if (__DEV__) {
//   import("../utils/splash-debug");
//   import("../utils/testNotificationAPI");
// }

// Clean app layout without notifications/websockets but with previous functionality

// Import test utils for API testing (remove in production)
if (__DEV__) {
  import("../utils/testActivityFeedAPI");
  import("../utils/testCalendarAPI");
}

// Disable LogBox for web to avoid bundling issues
if (Platform.OS !== "web" && LogBox) {
  LogBox.ignoreAllLogs();
  LogBox.ignoreLogs(['Warning:']); // Ignore specific warnings that cause bundling issues
}

// Prevent auto hide of native splash screen
ExpoSplashScreen.preventAutoHideAsync();

// Create persistor
const persistor = persistStore(stateStore);

// How long the app can sit backgrounded before returning to foreground
// triggers a full reload (re-init + remount of the whole screen tree).
const BACKGROUND_RELOAD_THRESHOLD_MS = 1 * 60 * 1000;

// Create AppContent component that handles splash logic AFTER PersistGate
function AppContent() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showCustomSplash, setShowCustomSplash] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { width } = useWindowDimensions();
  const dispatch = useDispatch();
  const backgroundedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      initializeApp();
    }
  }, [isInitialized]);

  // Reload the whole app if it's been backgrounded for a long time
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        backgroundedAtRef.current = Date.now();
      } else if (nextState === "active") {
        const backgroundedAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;

        if (
          backgroundedAt &&
          Date.now() - backgroundedAt >= BACKGROUND_RELOAD_THRESHOLD_MS
        ) {
          console.log(
            "🔄 App was backgrounded for a long time, reloading...",
          );
          setReloadKey((key) => key + 1);
          setAppIsReady(false);
          setIsInitialized(false);
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, []);

  // Runtime orientation control based on screen size
  useEffect(() => {
    const handleOrientationControl = async () => {
      try {
        if (width < 600) {
          // Phone: Lock to portrait
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP,
          );
        } else {
          // Tablet/foldable: Allow all orientations
          await ScreenOrientation.unlockAsync();
        }
      } catch (error) {
        console.warn("Error controlling screen orientation:", error);
      }
    };

    if (appIsReady && width) {
      handleOrientationControl();
    }
  }, [width, appIsReady]);

  const initializeApp = async () => {
    try {
      // Restore the auth token from expo-secure-store (it's intentionally
      // excluded from the AsyncStorage-backed redux-persist blob) before
      // anything authenticated renders or fires an API call.
      try {
        const storedToken = await secureTokenStorage.getToken();
        if (storedToken) {
          dispatch(setToken(storedToken));
        }
      } catch (error) {
        console.warn("Error restoring secure auth token:", error);
      }

      // Initialize Android configuration
      AndroidConfig.initialize();

      // Check network connectivity
      const networkState = await NetInfo.fetch();

      if (!networkState.isConnected) {
        // Wait for network connection
        const unsubscribe = NetInfo.addEventListener((state) => {
          if (state.isConnected) {
            unsubscribe();
            finishInitialization();
          }
        });
        return;
      }

      await finishInitialization();
    } catch (error) {
      console.warn("Error during app initialization:", error);
      await finishInitialization();
    }
  };

  const finishInitialization = async () => {
    try {
      // Debug: Show all storage keys in development
      // if (__DEV__) {
      //   await SplashUtils.debugAllStorageKeys();
      // }

      // Check if custom splash has been shown before (AFTER Redux persist is ready)
      // const hasShownSplash = await SplashUtils.hasShownSplash();

      // if (__DEV__) {
      //   console.log(`[AppContent] Splash check result:`, { hasShownSplash });
      // }

      // if (!hasShownSplash) {
      //   // First time launch - show custom splash
      //   setShowCustomSplash(true);
      //   await SplashUtils.markSplashAsShown();

      //   if (__DEV__) {
      //     console.log(`[AppContent] Will show custom splash screen`);
      //   }
      // } else {
      //   if (__DEV__) {
      //     console.log(
      //       `[AppContent] Splash already shown, going directly to main app`
      //     );
      //   }
      // }

      // Hide native splash
      await ExpoSplashScreen.hideAsync();
      setAppIsReady(true);
      setIsInitialized(true);
    } catch (error) {
      console.warn("Error finishing app initialization:", error);
      // Proceed anyway
      await ExpoSplashScreen.hideAsync();
      setAppIsReady(true);
      setIsInitialized(true);
    }
  };

  const handleCustomSplashComplete = () => {
    setShowCustomSplash(false);
  };

  // Show custom splash if it should be shown
  if (appIsReady && showCustomSplash) {
    return (
      <>
        <StatusBar style="light" />
        <SplashScreen onAnimationComplete={handleCustomSplashComplete} />
      </>
    );
  }

  // Don't show main app until ready
  if (!appIsReady) {
    return null;
  }

  // Render main app
  console.log("🔵 [_LAYOUT DEBUG] AppContent rendering...");
  
  return (
    <React.Fragment key={reloadKey}>
      <StatusBar style="auto" />
      {/* Background notification service - runs app-wide when user is authenticated */}
      {(() => {
        console.log("🔵 [_LAYOUT DEBUG] About to render SafeBackgroundNotificationService...");
        try {
          return <SafeBackgroundNotificationService />;
        } catch (error) {
          console.error("❌ [_LAYOUT DEBUG] SafeBackgroundNotificationService crashed during render:", error);
          return null;
        }
      })()}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="public" />
        <Stack.Screen name="unauthenticated" />
        <Stack.Screen name="authenticated" />
        <Stack.Screen name="private" />
        <Stack.Screen name="profile" />
      </Stack>
      <Toast />
    </React.Fragment>
  );
}

export default function RootLayout() {
  const [isConnected, setIsConnected] = useState(true);

  // Load Inter fonts
  const [fontsLoaded] = useFonts({
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-Bold": Inter_700Bold,
  });

  // Basic connectivity check
  useEffect(() => {
    const checkConnectivity = async () => {
      const networkState = await NetInfo.fetch();
      setIsConnected(networkState.isConnected ?? false);

      if (!networkState.isConnected) {
        const unsubscribe = NetInfo.addEventListener((state) => {
          if (state.isConnected) {
            setIsConnected(true);
            unsubscribe();
          }
        });
      }
    };

    checkConnectivity();
  }, []);

  // Don't render anything until fonts are loaded and connected
  if (!fontsLoaded || !isConnected) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <DrawerProvider>
            <Provider store={stateStore}>
              <PersistGate loading={null} persistor={persistor}>
                <AppContent />
              </PersistGate>
            </Provider>
          </DrawerProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
