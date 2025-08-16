import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabaseAPI } from "../utils/supabase-api";

interface AuthContextType {
  userToken: string | null;
  setUserToken: (token: string | null) => void;
  isAuthenticated: boolean;
  signOut: () => void;
  // Workout session state
  currentWorkoutId: number | null;
  setCurrentWorkoutId: (id: number | null) => void;
  workoutStartedAt: string | null;
  setWorkoutStartedAt: (time: string | null) => void;
  workoutElapsedLabel: string;
  restSecondsActive: number;
  setRestSecondsActive: (seconds: number) => void;
  skipRest: () => void;
  clearWorkoutSession: () => void;
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
  
  // Workout session state
  const [currentWorkoutId, setCurrentWorkoutIdState] = useState<number | null>(null);
  const [workoutStartedAt, setWorkoutStartedAtState] = useState<string | null>(null);
  const [workoutElapsedLabel, setWorkoutElapsedLabel] = useState("0:00");
  const [restSecondsActive, setRestSecondsActiveState] = useState(0);

  // Initialize auth and session state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("USER_TOKEN");
    const storedWorkoutId = localStorage.getItem("CURRENT_WORKOUT_ID");
    const storedStartedAt = localStorage.getItem("WORKOUT_STARTED_AT");
    const storedRestSeconds = localStorage.getItem("REST_SECONDS_ACTIVE");

    if (storedToken) {
      setUserTokenState(storedToken);
      // Set the token in the supabase API client
      supabaseAPI.setToken(storedToken);
    }
    if (storedWorkoutId) {
      setCurrentWorkoutIdState(parseInt(storedWorkoutId));
    }
    if (storedStartedAt) {
      setWorkoutStartedAtState(storedStartedAt);
    }
    if (storedRestSeconds) {
      setRestSecondsActiveState(parseInt(storedRestSeconds));
    }
    setIsInitialized(true);
  }, []);

  // Global workout timer effect
  useEffect(() => {
    if (!workoutStartedAt) {
      setWorkoutElapsedLabel("0:00");
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const started = new Date(workoutStartedAt).getTime();
      const elapsedMs = now - started;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      setWorkoutElapsedLabel(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [workoutStartedAt]);

  // Rest timer countdown effect
  useEffect(() => {
    if (restSecondsActive <= 0) return;

    const interval = setInterval(() => {
      setRestSecondsActiveState(prev => {
        const newValue = Math.max(0, prev - 1);
        localStorage.setItem("REST_SECONDS_ACTIVE", newValue.toString());
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [restSecondsActive]);

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

  const setCurrentWorkoutId = (id: number | null) => {
    setCurrentWorkoutIdState(id);
    if (id !== null) {
      localStorage.setItem("CURRENT_WORKOUT_ID", id.toString());
    } else {
      localStorage.removeItem("CURRENT_WORKOUT_ID");
    }
  };

  const setWorkoutStartedAt = (time: string | null) => {
    setWorkoutStartedAtState(time);
    if (time) {
      localStorage.setItem("WORKOUT_STARTED_AT", time);
    } else {
      localStorage.removeItem("WORKOUT_STARTED_AT");
    }
  };

  const setRestSecondsActive = (seconds: number) => {
    setRestSecondsActiveState(seconds);
    localStorage.setItem("REST_SECONDS_ACTIVE", seconds.toString());
  };

  const skipRest = () => {
    setRestSecondsActive(0);
  };

  const clearWorkoutSession = () => {
    setCurrentWorkoutId(null);
    setWorkoutStartedAt(null);
    setRestSecondsActive(0);
    setWorkoutElapsedLabel("0:00");
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
    clearWorkoutSession();
  };

  const isAuthenticated = !!userToken;

  // Don't render children until auth state is initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/30 flex items-center justify-center">
        <div className="text-[var(--warm-brown)]">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      userToken, 
      setUserToken, 
      isAuthenticated, 
      signOut,
      currentWorkoutId,
      setCurrentWorkoutId,
      workoutStartedAt,
      setWorkoutStartedAt,
      workoutElapsedLabel,
      restSecondsActive,
      setRestSecondsActive,
      skipRest,
      clearWorkoutSession
    }}>
      {children}
    </AuthContext.Provider>
  );
}