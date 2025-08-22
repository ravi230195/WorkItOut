import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { TactileButton } from "../TactileButton";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dumbbell, Eye, EyeOff } from "lucide-react";
import { supabaseAPI } from "../../utils/supabase/supabase-api";
import { toast } from "sonner";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";

interface SignInScreenProps {
  onAuthSuccess: (token: string) => void;
  onNavigateToSignUp: () => void;
}

export function SignInScreen({ onAuthSuccess, onNavigateToSignUp }: SignInScreenProps) {
  // Keyboard-aware scrolling
  useKeyboardInset();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      const token = await supabaseAPI.signIn(email, password);
      supabaseAPI.setToken(token);
      onAuthSuccess(token);
      toast.success("Welcome back!");
    } catch (error) {
      console.error("Sign in failed:", error);
      if (error instanceof Error) {
        if (error.message.includes("UNAUTHORIZED") || error.message.includes("Invalid")) {
          toast.error("Invalid email or password. Please check your credentials.");
        } else if (error.message.includes("RATE_LIMIT")) {
          toast.error("Too many attempts. Please try again in a few minutes.");
        } else {
          toast.error(error.message || "Sign in failed. Please try again.");
        }
      } else {
        toast.error("Sign in failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="
        fixed inset-0                     /* lock to visible viewport */
        flex items-center justify-center
        overflow-hidden overscroll-none   /* prevent page scroll/bounce */
        px-6                              /* horizontal padding only */
        bg-gradient-to-br from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/30
        [height:100dvh]                   /* dynamic vh to avoid iOS URL bar overshoot */
      "
    >
      <Card
        className="
          w-full max-w-md
          bg-white/80 backdrop-blur-sm border-[var(--border)]
          max-h-[100svh]                  /* never taller than small visible viewport */
          overflow-y-auto                 /* internal scroll if needed */
          pt-safe pb-safe kb-aware        /* respect notches/home indicator + keyboard */
        "
      >
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-[var(--warm-coral)] to-[var(--warm-peach)] flex items-center justify-center mx-auto">
            <Dumbbell size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-medium text-[var(--warm-brown)]">
              Welcome Back
            </h1>
            <p className="text-[var(--warm-brown)]/60">
              Sign in to continue your fitness journey
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--warm-brown)]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-[var(--input-background)] border-[var(--border)]"
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[var(--warm-brown)]">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="bg-[var(--input-background)] border-[var(--border)] pr-10"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--warm-brown)]/60 hover:text-[var(--warm-brown)] transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <TactileButton
              type="submit"
              className="w-full bg-gradient-to-r from-[var(--warm-coral)] to-[var(--warm-peach)] text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                  Signing In...
                </div>
              ) : (
                "Sign In"
              )}
            </TactileButton>
          </form>

          <div className="text-center space-y-4">
            <button
              onClick={() => toast.info("Password reset coming soon!")}
              className="text-sm text-[var(--warm-coral)] hover:text-[var(--warm-coral)]/80 transition-colors"
              disabled={isLoading}
            >
              Forgot your password?
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-sm text-[var(--warm-brown)]/60">or</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            <div className="text-sm text-[var(--warm-brown)]/60">
              Don't have an account?{" "}
              <button
                onClick={onNavigateToSignUp}
                className="text-[var(--warm-coral)] hover:text-[var(--warm-coral)]/80 transition-colors font-medium"
                disabled={isLoading}
              >
                Sign up
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}