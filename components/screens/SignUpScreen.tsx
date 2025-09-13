// components/auth/SignUpScreen.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { TactileButton } from "../TactileButton";
import { supabaseAPI } from "../../utils/supabase/supabase-api";
import { toast } from "sonner";
import { AppScreen, Stack, Spacer } from "../layouts";

interface SignUpScreenProps {
  onAuthSuccess: (token: string, refreshToken: string) => void;
  onNavigateToSignIn: () => void;
  bottomBar?: React.ReactNode;
}

export function SignUpScreen({ onAuthSuccess, onNavigateToSignIn, bottomBar }: SignUpScreenProps) {
  // Keyboard-aware insets (updates --kb-inset)

  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [displayName, setDisplayName] = useState("");
  const [height, setHeight]         = useState("");
  const [weight, setWeight]         = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [isLoading, setIsLoading]   = useState(false);

  const validateInputs = () => {
    if (!firstName.trim())  return toast.error("First name is required"), false;
    if (!lastName.trim())   return toast.error("Last name is required"), false;
    if (!displayName.trim())return toast.error("Display name is required"), false;
    if (!email.trim())      return toast.error("Email is required"), false;
    if (!password.trim())   return toast.error("Password is required"), false;
    if (password.length < 6)return toast.error("Password must be at least 6 characters"), false;
    if (height && (isNaN(Number(height)) || Number(height) <= 0)) {
      return toast.error("Height must be a valid number"), false;
    }
    if (weight && (isNaN(Number(weight)) || Number(weight) <= 0)) {
      return toast.error("Weight must be a valid number"), false;
    }
    return true;
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      // 1) Sign up
      const signUpResult = await supabaseAPI.signUp(email, password);
      let token: string;
      let refreshToken: string;

      if (signUpResult.token && signUpResult.refresh_token) {
        token = signUpResult.token;
        refreshToken = signUpResult.refresh_token;
      } else if (signUpResult.needsSignIn) {
        // 2) Fallback sign-in
        const signInResult = await supabaseAPI.signIn(email, password);
        token = signInResult.access_token;
        refreshToken = signInResult.refresh_token;
      } else {
        throw new Error("No token received from sign up or sign in");
      }

      // 3) Persist token and upsert profile
      supabaseAPI.setToken(token);
      const heightCm = height ? Number(height) : undefined;
      const weightKg = weight ? Number(weight) : undefined;
      await supabaseAPI.upsertProfile(firstName, lastName, displayName, heightCm, weightKg);

      // 4) Navigate to home
      onAuthSuccess(token, refreshToken);
      toast.success("Account created successfully!");
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "RATE_LIMIT") {
          toast.error("Too many requests. Please wait a few minutes and try again.");
        } else if (err.message.toLowerCase().includes("email")) {
          toast.error("Invalid email address or email already exists");
        } else if (err.message.toLowerCase().includes("password")) {
          toast.error("Password must be at least 6 characters");
        } else if (err.message.includes("429")) {
          toast.error("Server is busy. Please wait a moment and try again.");
        } else {
          toast.error(err.message || "Sign up failed");
        }
      } else {
        toast.error("Sign up failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disabledSubmit = isLoading || !firstName || !lastName || !displayName || !email || !password;

  return (
    <AppScreen
      // Auth screen: no header / bottom bar
      padHeader={false}
      padBottomBar={false}
      className="relative"
      // Slightly narrower max width than default for auth flows
      maxContent="responsive"
      bottomBar={bottomBar}
      contentClassName="relative flex min-h-[100dvh]"
    >
      <div className="absolute inset-0 z-0">
        <img
          src="/Workout/Images/LandingPage.png"
          alt="Workout background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/60" />
      </div>
      <div className="relative z-10 flex flex-1 items-center justify-center p-4">
      <Card
        className="
          w-full max-w-md
          bg-card/90 backdrop-blur-sm border-border
          shadow-soft
          max-h-[100svh] overflow-y-auto
          pt-safe pb-safe kb-aware
        "
      >
        <CardHeader className="text-center">
          <Stack gap="xs">
            <h1 className="text-2xl font-medium text-black">Create Account</h1>
            <p className="text-black">Join and start tracking your workouts</p>
          </Stack>
        </CardHeader>

        <CardContent>
          <Stack gap="md">
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input-background text-black placeholder:text-black focus:outline-none focus:ring-2 focus:ring-warm-coral/30 focus:border-warm-coral"
                    disabled={isLoading}
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input-background text-black placeholder:text-black focus:outline-none focus:ring-2 focus:ring-warm-coral/30 focus:border-warm-coral"
                    disabled={isLoading}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input-background text-black placeholder:text-black focus:outline-none focus:ring-2 focus:ring-warm-coral/30 focus:border-warm-coral"
                  disabled={isLoading}
                  autoComplete="nickname"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    placeholder="Height (cm)"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input-background text-black placeholder:text-black focus:outline-none focus:ring-2 focus:ring-warm-coral/30 focus:border-warm-coral"
                    disabled={isLoading}
                    min="1"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Weight (kg)"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input-background text-black placeholder:text-black focus:outline-none focus:ring-2 focus:ring-warm-coral/30 focus:border-warm-coral"
                    disabled={isLoading}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input-background text-black placeholder:text-black focus:outline-none focus:ring-2 focus:ring-warm-coral/30 focus:border-warm-coral"
                  disabled={isLoading}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input-background text-black placeholder:text-black focus:outline-none focus:ring-2 focus:ring-warm-coral/30 focus:border-warm-coral"
                  disabled={isLoading}
                  autoComplete="new-password"
                  required
                />
              </div>

              <TactileButton
                type="submit"
                disabled={disabledSubmit}
                className="w-full bg-gradient-to-r from-warm-coral to-warm-peach text-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 animate-spin border-2 border-black border-t-transparent rounded-full" />
                    Creating Account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </TactileButton>
            </form>

            <Spacer y="xs" />

            <div className="text-center">
              <div className="text-sm text-black">
                Already have an account?{" "}
                <button
                  onClick={onNavigateToSignIn}
                  className="text-black hover:text-black transition-colors font-medium"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </div>
            </div>
          </Stack>
        </CardContent>
      </Card>
      </div>
    </AppScreen>
  );
}
