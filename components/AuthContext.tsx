import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabaseAPI } from "../utils/supabase/supabase-api";

interface AuthContextType {
  userToken: string | null;
  refreshToken: string | null;
  lastActive: string | null;
  setSession: (accessToken: string | null, refreshToken: string | null) => void;
  updateLastActive: () => Promise<void>;
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [userToken, setUserTokenState] = useState<string | null>(null);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);
  const [lastActive, setLastActiveState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("USER_TOKEN");
    const storedRefresh = localStorage.getItem("REFRESH_TOKEN");
    const storedLast = localStorage.getItem("LAST_ACTIVE");

    if (storedToken) {
      setUserTokenState(storedToken);
      supabaseAPI.setToken(storedToken);
    }
    if (storedRefresh) setRefreshTokenState(storedRefresh);
    if (storedLast) setLastActiveState(storedLast);
    setIsInitialized(true);
  }, []);

  const setSession = (accessToken: string | null, refreshToken: string | null) => {
    setUserTokenState(accessToken);
    setRefreshTokenState(refreshToken);

    if (accessToken) {
      localStorage.setItem("USER_TOKEN", accessToken);
      supabaseAPI.setToken(accessToken);
    } else {
      localStorage.removeItem("USER_TOKEN");
      supabaseAPI.setToken(null);
    }

    if (refreshToken) {
      localStorage.setItem("REFRESH_TOKEN", refreshToken);
    } else {
      localStorage.removeItem("REFRESH_TOKEN");
    }
  };

  const updateLastActive = async () => {
    const now = new Date().toISOString();
    setLastActiveState(now);
    localStorage.setItem("LAST_ACTIVE", now);
    try {
      await supabaseAPI.updateLastActive();
    } catch (e) {
      console.error("Failed to update last activity", e);
    }
  };

  const signOut = async () => {
    if (userToken) {
      try {
        await supabaseAPI.signOut();
      } catch (error) {
        console.error("Failed to sign out from Supabase:", error);
      }
    }
    setSession(null, null);
    setLastActiveState(null);
    localStorage.removeItem("LAST_ACTIVE");
  };

  const isAuthenticated = !!userToken;

  if (!isInitialized) {
    return (
      <div className="bg-gradient-to-br from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/30 flex items-center justify-center">
        <div className="text-[var(--warm-brown)]">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      userToken,
      refreshToken,
      lastActive,
      setSession,
      updateLastActive,
      isAuthenticated,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
