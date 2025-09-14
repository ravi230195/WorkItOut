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
      <div className="flex-1 flex flex-col items-center justify-start pt-10">
        <Stack>
          <h1 className="text-4xl sm:text-5xl font-white tracking-tight leading-tight text-white">
            Welcome to WorkItOut
          </h1>
          <p className="mt-2 text-xl text-white">
            Your workout journey starts here.
          </p>

        </Stack>
      </div>
      <div className="w-full px-4 pb-8 flex flex-col gap-6 items-center justify-center text-center">
        <TactileButton className="rounded-xl border-0 font-medium items-center justify-center" onClick={onNavigateToSignUp}>
          Sign Up
        </TactileButton>
        <TactileButton
          variant="secondary"
          className="rounded-xl border-0 font-medium items-center justify-center"
          onClick={onNavigateToSignIn}
        >
          Sign In
        </TactileButton>
        <Spacer y="xs" />
      </div>
    </AppScreen>
  );
}

