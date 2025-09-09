import type React from "react";
import { AppScreen, Stack } from "../layouts";
import { TactileButton } from "../TactileButton";

interface LandingScreenProps {
  onNavigateToSignIn: () => void;
  onNavigateToSignUp: () => void;
  bottomBar?: React.ReactNode;
}

export function LandingScreen({ onNavigateToSignIn, onNavigateToSignUp, bottomBar }: LandingScreenProps) {
  return (
    <AppScreen
      padHeader={false}
      padBottomBar={false}
      className="bg-cover bg-center"
      style={{ backgroundImage: "url('/landing-bg.png')" }}
      scrollAreaClassName="grid place-items-center"
      bottomBar={bottomBar}
    >
      <div className="text-center text-white bg-black/40 p-8 rounded-lg backdrop-blur-sm max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-4">WorkItOut</h1>
        <p className="mb-8">Track your workouts and reach your goals</p>
        <Stack gap="md">
          <TactileButton onClick={onNavigateToSignIn} className="w-full bg-warm-coral text-primary-foreground">
            Sign In
          </TactileButton>
          <TactileButton onClick={onNavigateToSignUp} className="w-full bg-warm-peach text-primary-foreground">
            Sign Up
          </TactileButton>
        </Stack>
      </div>
    </AppScreen>
  );
}
