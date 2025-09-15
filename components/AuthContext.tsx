import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabaseAPI } from "../utils/supabase/supabase-api";
import { logger } from "../utils/logging";
import { toast } from "sonner";

interface AuthContextType {
  userToken: string | null;
  setUserToken: (token: string | null, refreshToken?: string | null) => void;
  isAuthenticated: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Manages Supabase authentication state and token lifecycle.
 *
 * Access tokens issued by Supabase are valid for 1 hour. We proactively
 * refresh them every 45 minutes while the app is active, on app startup
 * if the token is older than 1 hour, and whenever the app returns from
 * the background. If a refresh fails or no refresh token is available,
 * the user is signed out.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [userToken, setUserTokenState] = useState<string | null>(null);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const setUserToken = useCallback((token: string | null, refreshTokenValue?: string | null) => {
    setUserTokenState(token);
    if (refreshTokenValue) setRefreshTokenState(refreshTokenValue);

    if (token) {
      localStorage.setItem("USER_TOKEN", token);
      if (refreshTokenValue) {
        localStorage.setItem("REFRESH_TOKEN", refreshTokenValue);
      }
      supabaseAPI.setToken(token);
    } else {
      localStorage.removeItem("USER_TOKEN");
      localStorage.removeItem("REFRESH_TOKEN");
      setRefreshTokenState(null);
      supabaseAPI.setToken(null);
    }
  }, []);

  // Helper function to check token age
  const getTokenAge = (token: string): number => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const issuedAt = payload.iat * 1000;
      return Date.now() - issuedAt;
    } catch {
      return Infinity;
    }
  };

  // Refresh token function
  const refreshTokenOnAppStart = useCallback(async (refreshTokenValue: string) => {
    try {
      const newToken = await supabaseAPI.refreshToken(refreshTokenValue);
      setUserToken(newToken, refreshTokenValue);
    } catch (error) {
      logger.error("Token refresh failed on app start:", error);
      setUserToken(null, null);
    }
  }, [setUserToken]);

  const handleOAuthRedirect = useCallback(() => {
    if (typeof window === "undefined") return false;

    const { hash } = window.location;
    if (!hash || hash.length <= 1) return false;

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshTokenValue = params.get("refresh_token");
    const error = params.get("error_description") || params.get("error");
    const provider = params.get("provider");

    if (!accessToken && !error) return false;

    if (error) {
      toast.error(error);
      logger.error("OAuth sign-in failed:", error);
    } else if (accessToken) {
      setUserToken(accessToken, refreshTokenValue);
      const providerName = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "";
      toast.success(providerName ? `Signed in with ${providerName}` : "Signed in successfully");
    }

    const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, document.title, cleanUrl);

    return true;
  }, [setUserToken]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const handledOAuth = handleOAuthRedirect();

      if (handledOAuth) {
        setIsInitialized(true);
        return;
      }

      const storedToken = localStorage.getItem("USER_TOKEN");
      const storedRefreshToken = localStorage.getItem("REFRESH_TOKEN");

      if (storedToken && storedRefreshToken) {
        const tokenAge = getTokenAge(storedToken);
        
        if (tokenAge > 60 * 60 * 1000) { // Older than 1 hour
          await refreshTokenOnAppStart(storedRefreshToken);
        } else {
          setUserToken(storedToken, storedRefreshToken);
        }
      }
      
      setIsInitialized(true);
    };

    initializeAuth();
  }, [handleOAuthRedirect, refreshTokenOnAppStart, setUserToken]);
  const signOut = async () => {
    // Sign out from Supabase
    if (userToken) {
      try {
        await supabaseAPI.signOut();
      } catch (error) {
        logger.error("Failed to sign out from Supabase:", error);
      }
    }
    
    setUserToken(null, null);
  };

  // Active refresh logic - refresh every 45 minutes when app is active
  useEffect(() => {
    if (!userToken || !refreshToken) return;
    
    const refreshInterval = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        try {
          const newToken = await supabaseAPI.refreshToken(refreshToken);
          setUserToken(newToken, refreshToken);
        } catch (error) {
          logger.error("Active token refresh failed:", error);
          setUserToken(null, null);
        }
      }
    }, 45 * 60 * 1000); // Every 45 minutes
    
    return () => clearInterval(refreshInterval);
  }, [userToken, refreshToken, setUserToken]);

  // App resume logic - refresh when app comes back from background
  useEffect(() => {
    if (!userToken || !refreshToken) return;
    
    const handleAppResume = async () => {
      try {
        const newToken = await supabaseAPI.refreshToken(refreshToken);
        // Update auth state with the newly refreshed token
        setUserToken(newToken, refreshToken);
      } catch (error) {
        logger.error("Token refresh failed on resume:", error);
        setUserToken(null, null);
      }
    };
    
    // For web apps - detect visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleAppResume();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userToken, refreshToken, setUserToken]);

  const isAuthenticated = !!userToken;

  // Don't render children until auth state is initialized
  if (!isInitialized) {
    return (
      <div className="bg-gradient-to-br from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/30 flex items-center justify-center">
        <div className="text-black">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      userToken, 
      setUserToken, 
      isAuthenticated, 
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}