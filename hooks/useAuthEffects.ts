import { useEffect } from "react";
import { useAuth } from "../components/AuthContext";
import { supabaseAPI } from "../utils/supabase-api";
import { AppView } from "../utils/navigation";
import { toast } from "sonner";

interface UseAuthEffectsProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
}

export function useAuthEffects({ currentView, setCurrentView }: UseAuthEffectsProps) {
  const { isAuthenticated, userToken, signOut } = useAuth();

  // Update API token when auth state changes
  useEffect(() => {
    supabaseAPI.setToken(userToken);
  }, [userToken]);

  // Auth guard - redirect to signin if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      if (currentView !== "signin" && currentView !== "signup") {
        setCurrentView("signin");
      }
    } else if (currentView === "signin" || currentView === "signup") {
      setCurrentView("dashboard");
    }
  }, [isAuthenticated, currentView, setCurrentView]);

  // Handle unauthorized errors globally
  useEffect(() => {
    const handleUnauthorizedError = (error: Error) => {
      if (error.message === "UNAUTHORIZED") {
        toast.error("Session expired. Please sign in.");
        signOut();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof Error) {
        handleUnauthorizedError(event.reason);
      }
    };

    // Listen for unhandled promise rejections (API errors)
    window.addEventListener('unhandledrejection', handleRejection);

    // Also create a global error handler for fetch failures
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Check for 401/403 responses
        if ((response.status === 401 || response.status === 403) && userToken) {
          const url = args[0] as string;
          // Only handle auth errors for our API calls
          if (url.includes('/rest/v1/') || url.includes('/auth/v1/') || url.includes('/api/')) {
            handleUnauthorizedError(new Error("UNAUTHORIZED"));
          }
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      window.fetch = originalFetch;
    };
  }, [signOut, userToken]);

  return { isAuthenticated };
}