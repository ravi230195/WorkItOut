// components/auth/SignInScreen.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { TactileButton } from "../TactileButton";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dumbbell, Eye, EyeOff } from "lucide-react";
import { supabaseAPI } from "../../utils/supabase/supabase-api";
import { toast } from "sonner";
import { AppScreen, Stack, Spacer } from "../layouts";

interface SignInScreenProps {
  onAuthSuccess: (token: string) => void;
  onNavigateToSignUp: () => void;
  bottomBar?: React.ReactNode;
}

export function SignInScreen({ onAuthSuccess, onNavigateToSignUp, bottomBar }: SignInScreenProps) {
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
    <AppScreen
      padHeader={false}
      padBottomBar={false}
      className="bg-gradient-to-br from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/30"
      scrollAreaClassName="grid place-items-center"
      bottomBar={bottomBar}
      contentClassName=""
      maxContent="responsive"
    >
      <Card
        className="
          w-full
          bg-white/80 backdrop-blur-sm border-[var(--border)]
          shadow-soft
        "
      >
        <CardHeader className="text-center pb-6">
          <Stack gap="md">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
              <Dumbbell size={32} className="text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-medium text-[var(--warm-brown)]">Welcome Back</h1>
              <p className="text-[var(--warm-brown)]/60">Sign in to continue your fitness journey</p>
            </div>
          </Stack>
        </CardHeader>

        <CardContent>
          <Stack gap="lg">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[var(--warm-brown)]">Email</Label>
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
                <Label htmlFor="password" className="text-[var(--warm-brown)]">Password</Label>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--warm-brown)]/60 hover:text-[var(--warm-brown)] transition-colors"
                    disabled={isLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
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

            <Stack gap="md" className="text-center">
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
                Don&apos;t have an account?{" "}
                <button
                  onClick={onNavigateToSignUp}
                  className="text-[var(--warm-coral)] hover:text-[var(--warm-coral)]/80 transition-colors font-medium"
                  disabled={isLoading}
                >
                  Sign up
                </button>
              </div>
            </Stack>

            <Spacer y="xs" />
          </Stack>
        </CardContent>
      </Card>
    </AppScreen>
  );
}