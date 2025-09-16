import { useState, useEffect, type ReactNode, type SVGProps } from "react";
import { Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { TactileButton } from "../TactileButton";
import { AppScreen, Stack } from "../layouts";
import { cn } from "../ui/utils";
import { supabaseAPI } from "../../utils/supabase/supabase-api";

type SocialProvider = "Apple" | "Google";

interface SocialButtonProps {
  variant: SocialProvider;
  onClick: () => void;
  disabled?: boolean;
}

function AppleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" {...props}>
      <path
        d="M12 6.528V3a1 1 0 0 1 1-1"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <path
        d="M18.237 21A15 15 0 0 0 22 11a6 6 0 0 0-10-4.472A6 6 0 0 0 2 11a15.1 15.1 0 0 0 3.763 10 3 3 0 0 0 3.648.648 5.5 5.5 0 0 1 5.178 0A3 3 0 0 0 18.237 21"
        fill="currentColor"
      />
    </svg>
  );
}

function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden focusable="false" {...props}>
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6395-.0573-1.2518-.1641-1.8386H9v3.4791h4.8436c-.2092 1.125-.8454 2.0795-1.799 2.7173v2.258h2.9087c1.7028-1.5691 2.6877-3.8818 2.6877-6.6158z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4668-.8064 5.9559-2.1932l-2.9087-2.258c-.8077.54-1.84.8614-3.0472.8614-2.3442 0-4.3274-1.5831-5.0368-3.7119H.9055v2.3327C2.3846 15.7959 5.4446 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.9632 10.6983A5.4082 5.4082 0 0 1 3.683 9c0-.5894.1019-1.1591.2802-1.6983V4.969h-2.39C.582 6.0977 0 7.495 0 9s.582 2.9023 1.5732 4.031l2.39-2.3327z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5104.454 3.4447 1.3478l2.583-2.583C13.4636.9268 11.427 0 9 0 5.4446 0 2.3846 2.2041.9055 5.2018l2.3777 2.3327C4.6726 5.1623 6.6558 3.5795 9 3.5795z"
      />
    </svg>
  );
}

function SocialButton({ variant, onClick, disabled = false }: SocialButtonProps) {
  const config: Record<SocialProvider, { label: string; className: string; icon: ReactNode }> = {
    Apple: {
      label: "Sign in with Apple",
      className:
        "bg-black text-white hover:bg-neutral-900 focus-visible:ring-offset-black shadow-[0_12px_24px_rgba(0,0,0,0.35)]",
      icon: <AppleIcon className="h-5 w-5" />,
    },
    Google: {
      label: "Sign in with Google",
      className:
        "bg-white text-[#3C4043] border border-[#E0E0E0] hover:bg-white/90 hover:border-[#CACACA] focus-visible:ring-offset-white shadow-[0_12px_24px_rgba(32,33,36,0.18)]",
      icon: <GoogleIcon className="h-5 w-5" />,
    },
  };

  const { label, className, icon } = config[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-disabled={disabled}
      className={cn(
        "w-full h-12 sm:h-14 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-peach focus-visible:ring-offset-2",
        "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
    >
      <span className="flex items-center justify-center" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-white/60 text-xs uppercase tracking-[0.3em]">
      <span className="h-px flex-1 bg-white/20" aria-hidden />
      <span>or</span>
      <span className="h-px flex-1 bg-white/20" aria-hidden />
    </div>
  );
}

interface WelcomeScreenProps {
  onNavigateToSignUp: () => void;
  onNavigateToSignIn: () => void;
  onAuthSuccess: (token: string, refreshToken: string) => void;
  bottomBar?: ReactNode;
}

export function WelcomeScreen({
  onNavigateToSignUp,
  onNavigateToSignIn,
  onAuthSuccess,
  bottomBar,
}: WelcomeScreenProps) {
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);

  const handleSocialSignIn = async (provider: SocialProvider) => {
    if (pendingProvider) return;

    try {
      setPendingProvider(provider);
      await supabaseAPI.signInWithOAuth(provider);
    } catch (error) {
      setPendingProvider(null);
      const message =
        error instanceof Error ? error.message : "We couldn't start the sign-in flow. Please try again.";
      toast.error(message);
    }
  };

  // Listen for OAuth events to reset button state across web/native flows
  useEffect(() => {
    const handleAuthSuccess = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          provider?: SocialProvider;
          providerSlug?: string;
          token?: string;
          refreshToken?: string;
        }>
      ).detail;

      setPendingProvider(null);

      if (!detail?.token || !detail.refreshToken) {
        toast.error("We couldn't complete the sign-in. Please try again.");
        return;
      }

      onAuthSuccess(detail.token, detail.refreshToken);
      if (detail.provider) {
        toast.success(`Signed in with ${detail.provider}`);
      } else {
        toast.success("Welcome back!");
      }
    };

    const handleAuthError = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          provider?: SocialProvider;
          providerSlug?: string;
          message?: string;
        }>
      ).detail;

      setPendingProvider(null);
      const defaultMessage = detail?.provider
        ? `We couldn't complete the ${detail.provider} sign-in. Please try again.`
        : "We couldn't complete the sign-in. Please try again.";
      const message = detail?.message ?? defaultMessage;
      const normalizedMessage = message.toLowerCase();
      const providerPrefix = detail?.provider ? `${detail.provider} ` : "";

      if (normalizedMessage.includes("canceled") || normalizedMessage.includes("cancelled")) {
        toast.info(detail?.provider ? `${providerPrefix}sign-in was canceled.` : message);
      } else {
        toast.error(message);
      }
    };

    const handleAuthCancelled = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          provider?: SocialProvider;
          providerSlug?: string;
        }>
      ).detail;
      setPendingProvider(null);
      const providerPrefix = detail?.provider ? `${detail.provider} ` : "";
      toast.info(`${providerPrefix}sign-in was canceled before completion.`.trim());
    };

    window.addEventListener('auth-success', handleAuthSuccess as EventListener);
    window.addEventListener('auth-error', handleAuthError as EventListener);
    window.addEventListener('auth-cancelled', handleAuthCancelled as EventListener);

    return () => {
      window.removeEventListener('auth-success', handleAuthSuccess as EventListener);
      window.removeEventListener('auth-error', handleAuthError as EventListener);
      window.removeEventListener('auth-cancelled', handleAuthCancelled as EventListener);
    };
  }, [onAuthSuccess]);

  return (
    <AppScreen
      padHeader={false}
      padBottomBar={false}
      disableSafeArea={true}
      backgroundImageSrc="/Workout/Images/LandingPage.png"
      backgroundOverlayClassName="bg-black/60"
      scrollAreaClassName="flex flex-col"
      contentClassName="flex-1 flex flex-col"
      bottomBar={bottomBar}
      maxContent="responsive"
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-white">
        <div className="w-full max-w-md flex flex-col items-center gap-10 sm:gap-12 text-center">
          <Stack align="center" gap="md" className="text-balance">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
              <Dumbbell className="h-9 w-9 text-black" aria-hidden />
            </div>
            <Stack align="center" gap="sm" className="text-white">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
                Start your personalized workout plan.
              </h1>
              <p className="text-base sm:text-lg text-white/80">
                Sign in to sync your workouts across devices and stay motivated every day.
              </p>
            </Stack>
          </Stack>

          <div className="w-full flex flex-col gap-4">
            <SocialButton
              variant="Apple"
              onClick={() => handleSocialSignIn("Apple")}
              disabled={pendingProvider !== null}
            />
            <SocialButton
              variant="Google"
              onClick={() => handleSocialSignIn("Google")}
              disabled={pendingProvider !== null}
            />
            <Divider />
            <TactileButton
              type="button"
              className="w-full rounded-2xl border-0 font-semibold text-black"
              onClick={onNavigateToSignUp}
            >
              Continue with email
            </TactileButton>
            <button
              type="button"
              onClick={onNavigateToSignIn}
              className="text-sm text-white/80 hover:text-white transition-colors"
            >
              Already have an account? <span className="font-semibold text-white">Sign in</span>
            </button>
          </div>

          <p className="text-xs text-white/70 leading-relaxed">
            By continuing, you agree to our
            {" "}
            <a href="/terms" className="font-medium text-white hover:underline">
              Terms
            </a>
            {" "}
            and
            {" "}
            <a href="/privacy" className="font-medium text-white hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </AppScreen>
  );
}

