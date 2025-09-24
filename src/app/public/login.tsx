import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import { useDispatch } from "react-redux";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TButton } from "@/components/TButton";
import { TInput } from "@/components/TInput";
import { TOtpInput } from "@/components/TOtpInput";
import { Eye } from "@/lib/icons/Eye";
import { EyeOff } from "@/lib/icons/EyeOff";
import { authApi } from "@/api/auth-api";
import {
  setIsAuthenticated,
  setSessionData,
  setUser,
} from "@/state-store/slices/app-slice";
import { getUserCategoryName } from "@/constants/userCategories";

// PIN mapping configuration
const PIN_MAPPING: Record<string, string> = {
  NEXISY: "nexis_college_sms_staging",
  // NEXISY: "sms_v1",
  SCHL01: "sms_v2",
};

// Form validation schema - only check for empty fields
const loginSchema = z.object({
  username_or_email: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
  pin: z.string().min(1, "School PIN is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // RTK Query mutation using trigger pattern
  const [loginUserTrigger] = authApi.endpoints.loginUser.useMutation();

  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit", // Only validate on submit
    defaultValues: {
      username_or_email: "",
      password: "",
      pin: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    // Map user-entered PIN to backend value
    const mappedPin = PIN_MAPPING[data.pin.toUpperCase()];

    // Check if PIN is valid - show toast for invalid PIN
    if (!mappedPin) {
      Toast.show({
        type: "error",
        text1: "Invalid Credentials ❌",
        text2: "Please check your login details and try again",
        position: "top",
        visibilityTime: 4000,
      });
      setIsLoading(false);
      return;
    }

    console.log("Submitting login data:", {
      username_or_email: data.username_or_email,
      password: "****",
      pin: data.pin,
      mapped_pin: mappedPin,
      pin_length: data.pin.length,
    });

    try {
      console.log("🔄 Public Login - Starting login request...");

      // Use loginUserTrigger pattern as requested
      const response = await loginUserTrigger({
        pin: mappedPin,
        username_or_email: data.username_or_email,
        password: data.password,
      }).unwrap();

      console.log(
        "🎉 Public Login - Login successful:",
        JSON.stringify(response, null, 2),
      );

      // Extract user data from response
      if (response?.data) {
        const userData = {
          id: response.data.id,
          full_name: response.data.full_name,
          username: response.data.username,
          email: response.data.email,
          user_type_list: response.data.user_type_list,
          user_category: response.data.user_category,
          profile_image: response.data.profile_image,
        };
        dispatch(setUser(userData));
        console.log(
          "👤 Public Login - User data stored in Redux:",
          JSON.stringify(userData, null, 2),
        );
      } else {
        console.log("⚠️ Public Login - No user data found in response");
      }

      // Extract user category first (handle malformed field names from backend)
      let userCategory = response?.data?.user_category;

      // If user_category is undefined, check for malformed field names
      if (!userCategory) {
        const dataKeys = Object.keys(response?.data || {});
        const userCategoryKey = dataKeys.find((key) =>
          key.trim().toLowerCase().includes("user_category"),
        );
        if (userCategoryKey) {
          userCategory = response.data[userCategoryKey];
          console.log(
            "🔄 Public Login - Found malformed user_category field:",
            userCategoryKey,
            "with value:",
            userCategory,
          );
        }
      }

      // Create enhanced session data that includes user_category at root level
      const enhancedSessionData = {
        ...response,
        // Flatten user_category and user_role to root level for easy access
        user_category: userCategory, // Use the cleaned userCategory value
        user_role: response?.data?.user_role,
        lastUpdated: Date.now(), // Add timestamp to track data freshness
      };

      // Dispatch authentication state
      dispatch(setIsAuthenticated(true));
      dispatch(setSessionData(enhancedSessionData));

      console.log(
        "🔄 Public Login - Enhanced session data stored:",
        enhancedSessionData,
      );
      console.log(
        "🔄 Public Login - user_category:",
        enhancedSessionData.user_category,
      );

      // Show success toast
      Toast.show({
        type: "success",
        text1: "Login Successful! 🎉",
        text2: "Welcome back to School App",
        position: "top",
        visibilityTime: 3000,
      });

      console.log(
        "🔄 Public Login - Redirecting based on user_category:",
        userCategory,
      );

      // Use the proper user category mapping from constants
      const targetRoute = getUserCategoryName(userCategory);
      console.log(
        "🔄 Public Login - Target route:",
        `/authenticated/${targetRoute}`,
      );

      setTimeout(() => {
        router.replace(`/authenticated/${targetRoute}`);
      }, 1000);
    } catch (error: any) {
      // Silently handle login errors - don't log to console

      // Always show generic invalid credentials message for security
      Toast.show({
        type: "error",
        text1: "Invalid Credentials ❌",
        text2: "Please check your login details and try again",
        position: "top",
        visibilityTime: 4000,
      });

      dispatch(setIsAuthenticated(false));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Effects */}
      <View style={styles.backgroundEffects}>
        <View style={styles.gradientCircle1} />
        <View style={styles.gradientCircle2} />
        <View style={styles.patternOverlay} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View
            style={[styles.header, { paddingVertical: 25, marginVertical: 0 }]}
          >
            <Image
              source={require("@/assets/SchooSnap_logo.png")}
              style={[styles.logo, { marginBottom: 8 }]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.title,
                {
                  color: "#9b0737",
                  fontSize: 45,
                  fontWeight: "800",
                  letterSpacing: 2,
                  marginTop: 0,
                  marginBottom: 4,
                  padding: 0,
                },
              ]}
            >
              Welcome
            </Text>
            <Text style={[styles.subtitle, { marginTop: 0, marginBottom: 0 }]}>
              Sign in to your account
            </Text>
          </View>

          {/* Login Form */}
          <View
            style={[
              styles.formContainer,
              { paddingVertical: 15, marginTop: 10 },
            ]}
          >
            <View style={[styles.inputContainer, { marginBottom: 12 }]}>
              <Text style={[styles.label, { marginBottom: 4 }]}>
                Username or Email
              </Text>
              <Controller
                control={control}
                name="username_or_email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <TInput
                      placeholder="Enter your username or email"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.username_or_email?.message}
                      style={styles.input}
                    />
                    {errors.username_or_email && (
                      <Text style={styles.errorText}>
                        {errors.username_or_email.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>

            <View style={[styles.inputContainer, { marginBottom: 12 }]}>
              <Text style={[styles.label, { marginBottom: 4 }]}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <View style={styles.passwordInputContainer}>
                      <TInput
                        placeholder="Enter your password"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry={!showPassword}
                        error={errors.password?.message}
                        style={[styles.input, styles.passwordInput]}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff size={20} color="#666666" />
                        ) : (
                          <Eye size={20} color="#666666" />
                        )}
                      </TouchableOpacity>
                    </View>
                    {errors.password && (
                      <Text style={styles.errorText}>
                        {errors.password.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>

            <View style={[styles.inputContainer, { marginBottom: 12 }]}>
              <Text style={[styles.label, { marginBottom: 4 }]}>
                School PIN
              </Text>
              <Controller
                control={control}
                name="pin"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.pinInputContainer}>
                    <TOtpInput
                      value={value}
                      onChange={(newValue) => {
                        // Allow alphanumeric input (letters and numbers)
                        const alphanumericValue = newValue
                          .replace(/[^a-zA-Z0-9]/g, "")
                          .toUpperCase();
                        onChange(alphanumericValue);
                      }}
                      length={6}
                      style={styles.otpInput}
                    />
                    {errors.pin && (
                      <Text style={styles.errorText}>{errors.pin.message}</Text>
                    )}
                  </View>
                )}
              />
              <Text style={styles.pinHint}>
                💡 PIN can contain letters and numbers (4-6 characters)
              </Text>
            </View>

            <TButton
              title={isLoading ? "Signing In..." : "Login"}
              variant="primary"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading}
              style={[styles.loginButton, { marginTop: 15, marginBottom: 10 }]}
              textStyle={styles.loginButtonText}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don&apos;t have an account? Contact your school administrator.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    position: "relative",
  },
  backgroundEffects: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  gradientCircle1: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(155, 7, 55, 0.12)",
  },
  gradientCircle2: {
    position: "absolute",
    bottom: -120,
    left: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255, 107, 107, 0.08)",
  },
  patternOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 100, // Account for floating navbar (30px bottom + 55px height + 15px extra spacing)
    zIndex: 1,
  },
  header: {
    alignItems: "center",
    paddingVertical: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  customTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#9b0737",
    marginBottom: 8,
    letterSpacing: 1,
    textAlign: "center",
    textShadowColor: "rgba(155, 7, 55, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
  },
  formContainer: {
    paddingVertical: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    marginHorizontal: -10,
    paddingHorizontal: 30,
    shadowColor: "#9b0737",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  input: {
    marginBottom: 0,
  },
  passwordInputContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
  },
  eyeIcon: {
    position: "absolute",
    right: 15,
    padding: 5,
    zIndex: 1,
  },
  pinInputContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  otpInput: {
    marginBottom: 8,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  pinHint: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  loginButton: {
    marginTop: 30,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#9b0737",
    shadowColor: "#9b0737",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    lineHeight: 20,
  },
});
