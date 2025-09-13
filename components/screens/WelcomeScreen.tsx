import { ReactNode } from "react";
import { TactileButton } from "../TactileButton";
import { AppScreen, Stack, Spacer } from "../layouts";

interface WelcomeScreenProps {
  onNavigateToSignUp: () => void;
  onNavigateToSignIn: () => void;
  bottomBar?: ReactNode;
}

export function WelcomeScreen({
  onNavigateToSignUp,
  onNavigateToSignIn,
  bottomBar,
}: WelcomeScreenProps) {
  return (
    <AppScreen
      padHeader={false}
      padBottomBar={false}
      disableSafeArea={true}
      backgroundImageSrc="/Workout/Images/LandingPage.png"
      backgroundOverlayClassName="bg-black/50"
      scrollAreaClassName="flex flex-col"
      contentClassName="flex-1 flex flex-col justify-between text-center text-white"
      bottomBar={bottomBar}
      maxContent="responsive"
    >
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <Stack gap="sm">
          <h1 className="text-3xl font-semibold">Welcome to Strong</h1>
          <p className="text-base">Your workout journey starts here.</p>
        </Stack>
      </div>
      <div className="w-full px-4 pb-8 space-y-4">
        <TactileButton className="w-full" onClick={onNavigateToSignUp}>
          Sign Up
        </TactileButton>
        <TactileButton
          variant="secondary"
          className="w-full"
          onClick={onNavigateToSignIn}
        >
          Sign In
        </TactileButton>
        <Spacer y="xs" />
      </div>
    </AppScreen>
  );
}

