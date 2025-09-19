import { AppScreen, ScreenHeader, Section, Stack } from "../../layouts";
import { Card } from "../../ui/card";
import { TactileButton } from "../../TactileButton";
import {
  Activity,
  Flame,
  Footprints,
  HeartPulse,
  Moon,
  Sparkles,
} from "lucide-react";

interface DeviceSettingsScreenProps {
  onBack: () => void;
}

export function DeviceSettingsScreen({ onBack }: DeviceSettingsScreenProps) {
  const featureIcons = [HeartPulse, Moon, Footprints, Activity, Flame, Sparkles];

  return (
    <AppScreen
      className="bg-gradient-to-b from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/60 text-black"
      header={
        <ScreenHeader
          title="Device Settings"
          onBack={onBack}
          showBorder={false}
          denseSmall
          titleClassName="text-[17px] font-bold text-black"
        />
      }
      maxContent="responsive"
      showHeaderBorder={false}
      showBottomBarBorder={false}
      headerInScrollArea
      padContent={false}
    >
      <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <Stack gap="fluid">
          <Section variant="plain" padding="none">
            <Card className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 px-6 py-8 text-center shadow-md">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10" />
              <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-accent/10" />

              <div className="relative flex items-center justify-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/5">
                  <HeartPulse className="h-8 w-8 text-[#ff3b30]" strokeWidth={1.6} />
                </div>
                <div className="h-px w-10 bg-black/10" />
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-black shadow-lg shadow-primary/30">
                  <span className="text-lg font-semibold">WI</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {featureIcons.map((Icon, index) => (
                  <div
                    key={Icon.displayName ?? Icon.name ?? index}
                    className="flex h-10 w-full items-center justify-center rounded-xl border border-border/60 bg-white/70 text-primary"
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-3">
                <h1 className="text-[clamp(20px,5vw,26px)] font-semibold">
                  Connect WorkItOut with Apple Health
                </h1>
                <p className="text-sm text-black/70">
                  Syncing your Apple Health data—from sleep to steps—helps WorkItOut
                  personalize your training and build smarter guidance over time.
                </p>
              </div>

              <div className="mt-8 space-y-2 text-sm text-black/60">
                <p>
                  You can update these permissions anytime in your device settings.
                  Head to <span className="font-medium text-black">Settings &gt; Apps &gt; Health</span>,
                  then choose <span className="font-medium text-black">Data Access &amp; Devices</span>.
                </p>
                <p>
                  Select <span className="font-medium text-black">WorkItOut</span> and enable the metrics you want to share.
                </p>
              </div>

              <div className="mt-8">
                <TactileButton
                  variant="primary"
                  className="w-full justify-center rounded-2xl text-sm font-semibold"
                  type="button"
                >
                  Learn More
                </TactileButton>
              </div>
            </Card>
          </Section>

          <Section
            variant="translucent"
            padding="lg"
            className="rounded-3xl border border-border/60 shadow-sm"
          >
            <Stack gap="sm">
              <h2 className="text-base font-semibold text-black">
                Why connect your devices?
              </h2>
              <ul className="space-y-3 text-sm text-black/70">
                <li>
                  Tailored recovery reminders based on your real rest and activity data.
                </li>
                <li>
                  Richer progress insights that highlight trends across workouts, sleep, and energy.
                </li>
                <li>
                  Smarter coaching moments when WorkItOut notices meaningful changes.
                </li>
              </ul>
            </Stack>
          </Section>
        </Stack>
      </div>
    </AppScreen>
  );
}
