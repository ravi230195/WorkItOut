// hooks/useAuthEffects.ts
import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthContext";
import { supabaseAPI } from "../utils/supabase/supabase-api";
import { AppView } from "../utils/navigation";
import { toast } from "sonner";

interface UseAuthEffectsProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
}

export function useAuthEffects({ currentView, setCurrentView }: UseAuthEffectsProps) {
  const { isAuthenticated, userToken, signOut } = useAuth();

  // ✅ new: gate initial render until auth is initialized
  const [authReady, setAuthReady] = useState(false);

  // Keep API token synced
  useEffect(() => {
    supabaseAPI.setToken(userToken);
  }, [userToken]);

  // Mark auth as ready once on mount (or after your own async session check if you have one)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // If your AuthContext does async session probing, await it here.
        // Otherwise, this just flips ready on next tick to avoid a flash.
        await Promise.resolve();
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Route guard – only redirect after authReady is true
  useEffect(() => {
    if (!authReady) return;

    if (!isAuthenticated) {
      if (currentView !== "signin" && currentView !== "signup" && currentView !== "landing") {
        setCurrentView("landing");
      }
    } else if (currentView === "signin" || currentView === "signup" || currentView === "landing") {
      setCurrentView("workouts");
    }
  }, [authReady, isAuthenticated, currentView, setCurrentView]);

  // Global unauthorized handling (unchanged)
  useEffect(() => {
    const handleUnauthorizedError = (error: Error) => {
      if (error.message === "UNAUTHORIZED") {
        toast.error("Session expired. Please sign in.");
        signOut();
      }
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof Error) handleUnauthorizedError(event.reason);
    };

    window.addEventListener("unhandledrejection", handleRejection);

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if ((res.status === 401 || res.status === 403) && userToken) {
        const url = String(args[0]);
        if (url.includes("/rest/v1/") || url.includes("/auth/v1/") || url.includes("/api/")) {
          handleUnauthorizedError(new Error("UNAUTHORIZED"));
        }
      }
      return res;
    };

    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.fetch = originalFetch;
    };
  }, [signOut, userToken]);

  return { isAuthenticated, authReady };
}