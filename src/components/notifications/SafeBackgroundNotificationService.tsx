import React from "react";
import BackgroundNotificationService from "./BackgroundNotificationService";

// Simple error boundary class component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error, errorInfo: any) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("❌ [SAFE WRAPPER] BackgroundNotificationService error boundary caught:", error, errorInfo);
    
    // Show alert in development
    if (__DEV__) {
      setTimeout(() => {
        alert(`BackgroundNotificationService error: ${error?.message || 'Unknown error'}`);
      }, 100);
    }
    
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null; // Don't render anything when there's an error
    }

    return this.props.children;
  }
}

/**
 * Safe wrapper for BackgroundNotificationService with error boundary
 */
export const SafeBackgroundNotificationService: React.FC = () => {
  console.log("🟦 [SAFE WRAPPER] Rendering SafeBackgroundNotificationService...");
  
  return (
    <ErrorBoundary 
      onError={(error, errorInfo) => {
        console.error("❌ [SAFE WRAPPER] Error boundary triggered:", { error, errorInfo });
      }}
    >
      <BackgroundNotificationService />
    </ErrorBoundary>
  );
};

export default SafeBackgroundNotificationService;