import { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { TactileButton } from "./TactileButton";
import { supabaseAPI } from "../utils/supabase-api";

interface AuthScreenProps {
  onAuthSuccess: (token: string) => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const validateInputs = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!password.trim()) {
      setError("Password is required");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    return true;
  };

  const handleSignIn = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    setError("");
    setNeedsConfirmation(false);
    
    try {
      const token = await supabaseAPI.signIn(email, password);
      onAuthSuccess(token);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("400") || err.message.includes("401") || err.message.toLowerCase().includes("invalid")) {
          setError("Invalid email or password");
        } else {
          setError(err.message || "Sign in failed");
        }
      } else {
        setError("Sign in failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    setError("");
    setNeedsConfirmation(false);
    
    try {
      const result = await supabaseAPI.signUp(email, password);
      
      if (result.token) {
        onAuthSuccess(result.token);
      } else if (result.needsConfirmation) {
        setNeedsConfirmation(true);
      } else {
        setError("Sign up failed - no token received");
      }
    } catch (err) {
      if (err instanceof Error) {
        // Handle common sign up errors
        if (err.message.toLowerCase().includes("email")) {
          setError("Invalid email address");
        } else if (err.message.toLowerCase().includes("password")) {
          setError("Password must be at least 6 characters");
        } else {
          setError(err.message || "Sign up failed");
        }
      } else {
        setError("Sign up failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/30 flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border-[var(--border)]">
        <CardHeader className="text-center space-y-2">
          <h1 className="text-2xl font-medium text-[var(--warm-brown)]">Welcome</h1>
          <p className="text-[var(--warm-brown)]/70">Sign in or create an account.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white/80 text-[var(--warm-brown)] placeholder:text-[var(--warm-brown)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--warm-coral)]/30 focus:border-[var(--warm-coral)]"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white/80 text-[var(--warm-brown)] placeholder:text-[var(--warm-brown)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--warm-coral)]/30 focus:border-[var(--warm-coral)]"
                disabled={isLoading}
                autoComplete="current-password"
                onKeyPress={(e) => e.key === 'Enter' && handleSignIn()}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {needsConfirmation && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-600">
                Check your email to confirm your account.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <TactileButton
              onClick={handleSignIn}
              disabled={isLoading || !email || !password}
              className="w-full bg-gradient-to-r from-[var(--warm-coral)] to-[var(--warm-peach)] text-white"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </TactileButton>
            
            <TactileButton
              onClick={handleSignUp}
              disabled={isLoading || !email || !password}
              variant="secondary"
              className="w-full"
            >
              {isLoading ? "Signing Up..." : "Sign Up"}
            </TactileButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}