import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabaseAPI } from "../utils/supabase/supabase-api";

interface AuthContextType {
  userToken: string | null;
  setUserToken: (token: string | null) => void;
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
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("USER_TOKEN");

    if (storedToken) {
      setUserTokenState(storedToken);
      // Set the token in the supabase API client
      supabaseAPI.setToken(storedToken);
    }
    setIsInitialized(true);
  }, []);

  const setUserToken = (token: string | null) => {
    setUserTokenState(token);
    // Update both localStorage and supabase API client
    if (token) {
      localStorage.setItem("USER_TOKEN", token);
      supabaseAPI.setToken(token);
    } else {
      localStorage.removeItem("USER_TOKEN");
      supabaseAPI.setToken(null);
    }
  };

  const signOut = async () => {
    // Sign out from Supabase
    if (userToken) {
      try {
        await supabaseAPI.signOut();
      } catch (error) {
        console.error("Failed to sign out from Supabase:", error);
      }
    }
    
    setUserToken(null);
  };

  const isAuthenticated = !!userToken;

  // Don't render children until auth state is initialized
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
      setUserToken, 
      isAuthenticated, 
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}