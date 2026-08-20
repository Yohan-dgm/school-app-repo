// import CryptoJS from "react-native-crypto-js"; // Temporarily disabled due to compatibility issues
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Device from "expo-device";

// Security configuration
const SECURITY_CONFIG = {
  MAX_REQUEST_SIZE: 10000, // 10KB
  MAX_REQUESTS_PER_MINUTE: 10,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  ENCRYPTION_KEY_LENGTH: 32,
  NONCE_LENGTH: 16,
};

// Device fingerprinting
export class DeviceFingerprint {
  private static fingerprint: string | null = null;

  static async generate(): Promise<string> {
    if (this.fingerprint) return this.fingerprint;

    try {
      const deviceInfo = {
        brand: Device.brand || "unknown",
        modelName: Device.modelName || "unknown",
        osName: Device.osName || "unknown",
        osVersion: Device.osVersion || "unknown",
        platformApiLevel: Device.platformApiLevel || 0,
        totalMemory: Device.totalMemory || 0,
        applicationId: Application.applicationId || "unknown",
        applicationName: Application.applicationName || "unknown",
        nativeApplicationVersion:
          Application.nativeApplicationVersion || "unknown",
      };

      const fingerprintData = JSON.stringify(deviceInfo);
      // Simple hash function instead of crypto
      let hash = 0;
      for (let i = 0; i < fingerprintData.length; i++) {
        const char = fingerprintData.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      this.fingerprint = "device_" + Math.abs(hash).toString(36);
      return this.fingerprint;
    } catch (error) {
      console.warn("Failed to generate device fingerprint:", error);
      this.fingerprint = "fallback-" + Date.now();
      return this.fingerprint;
    }
  }

  static async verify(providedFingerprint: string): Promise<boolean> {
    const currentFingerprint = await this.generate();
    return currentFingerprint === providedFingerprint;
  }
}

// Request validation
export class RequestValidator {
  static validateMessageContent(content: string): {
    valid: boolean;
    error?: string;
  } {
    // Check length
    if (content.length > SECURITY_CONFIG.MAX_REQUEST_SIZE) {
      return {
        valid: false,
        error: `Message too long. Maximum ${SECURITY_CONFIG.MAX_REQUEST_SIZE} characters allowed.`,
      };
    }

    // Check for potentially malicious content
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return {
          valid: false,
          error: "Message contains potentially unsafe content.",
        };
      }
    }

    return { valid: true };
  }

  static validateRequestSize(data: any): boolean {
    const serialized = JSON.stringify(data);
    return serialized.length <= SECURITY_CONFIG.MAX_REQUEST_SIZE;
  }
}

// Enhanced rate limiting with device tracking
export class EnhancedRateLimiter {
  private static readonly RATE_LIMIT_KEY = "enhanced_rate_limit";

  static async checkLimit(): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    reason?: string;
  }> {
    try {
      const deviceId = await DeviceFingerprint.generate();
      const now = Date.now();
      const windowDuration = 60 * 1000; // 1 minute

      const stored = await AsyncStorage.getItem(
        `${this.RATE_LIMIT_KEY}_${deviceId}`,
      );
      let rateLimitData = stored
        ? JSON.parse(stored)
        : {
            requests: [],
            blocked: false,
            blockUntil: 0,
          };

      // Remove old requests outside the window
      rateLimitData.requests = rateLimitData.requests.filter(
        (timestamp: number) => now - timestamp < windowDuration,
      );

      // Check if currently blocked
      if (rateLimitData.blocked && now < rateLimitData.blockUntil) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: rateLimitData.blockUntil,
          reason: "Temporarily blocked due to rate limit violation",
        };
      }

      // Reset block status if expired
      if (rateLimitData.blocked && now >= rateLimitData.blockUntil) {
        rateLimitData.blocked = false;
        rateLimitData.blockUntil = 0;
      }

      // Check current rate
      const currentRequests = rateLimitData.requests.length;
      if (currentRequests >= SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE) {
        // Block for 5 minutes
        rateLimitData.blocked = true;
        rateLimitData.blockUntil = now + 5 * 60 * 1000;

        await AsyncStorage.setItem(
          `${this.RATE_LIMIT_KEY}_${deviceId}`,
          JSON.stringify(rateLimitData),
        );

        return {
          allowed: false,
          remaining: 0,
          resetTime: rateLimitData.blockUntil,
          reason: "Rate limit exceeded. Blocked for 5 minutes.",
        };
      }

      // Add current request
      rateLimitData.requests.push(now);

      await AsyncStorage.setItem(
        `${this.RATE_LIMIT_KEY}_${deviceId}`,
        JSON.stringify(rateLimitData),
      );

      return {
        allowed: true,
        remaining:
          SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE -
          rateLimitData.requests.length,
        resetTime: now + windowDuration,
      };
    } catch (error) {
      console.warn("Rate limit check failed:", error);
      // Fail open but log the error
      return {
        allowed: true,
        remaining: SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE,
        resetTime: Date.now() + 60000,
      };
    }
  }
}

// Session management
export class SessionManager {
  private static readonly SESSION_KEY = "chat_session";

  static async createSession(): Promise<string> {
    // Generate a simple session ID without crypto dependency
    const sessionId =
      "session_" +
      Date.now() +
      "_" +
      Math.random().toString(36).substring(2, 15);
    const session = {
      id: sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      deviceFingerprint: await DeviceFingerprint.generate(),
    };

    await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return sessionId;
  }

  static async validateSession(): Promise<{
    valid: boolean;
    sessionId?: string;
  }> {
    try {
      const stored = await AsyncStorage.getItem(this.SESSION_KEY);
      if (!stored) {
        return { valid: false };
      }

      const session = JSON.parse(stored);
      const now = Date.now();

      // Check if session expired
      if (now - session.lastActivity > SECURITY_CONFIG.SESSION_TIMEOUT) {
        await this.destroySession();
        return { valid: false };
      }

      // Verify device fingerprint
      const currentFingerprint = await DeviceFingerprint.generate();
      if (session.deviceFingerprint !== currentFingerprint) {
        await this.destroySession();
        return { valid: false };
      }

      // Update last activity
      session.lastActivity = now;
      await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

      return { valid: true, sessionId: session.id };
    } catch (error) {
      console.warn("Session validation failed:", error);
      return { valid: false };
    }
  }

  static async destroySession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      console.warn("Session destruction failed:", error);
    }
  }
}

// Content sanitization
export class ContentSanitizer {
  static sanitizeInput(input: string): string {
    // Remove potentially dangerous characters and patterns
    return input
      .replace(/[<>]/g, "") // Remove angle brackets
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/data:/gi, "") // Remove data: protocol
      .replace(/vbscript:/gi, "") // Remove vbscript: protocol
      .replace(/on\w+\s*=/gi, "") // Remove event handlers
      .trim();
  }

  static sanitizeOutput(output: string): string {
    // Sanitize AI response to prevent potential issues
    return output
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/data:text\/html/gi, "") // Remove data URLs
      .trim();
  }
}

// Export all security utilities
export const Security = {
  DeviceFingerprint,
  RequestValidator,
  EnhancedRateLimiter,
  SessionManager,
  ContentSanitizer,
  SECURITY_CONFIG,
};
