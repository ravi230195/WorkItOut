import { AppScreen, ScreenHeader, Section, Stack } from "../../layouts";
import {
  Activity,
  ArrowUpRight,
  Flame,
  Footprints,
  HeartPulse,
  Link2,
  MoonStar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface DeviceSettingsScreenProps {
  onBack: () => void;
}

const highlightMetrics: Array<{ icon: LucideIcon; label: string }> = [
  { icon: MoonStar, label: "Sleep" },
  { icon: HeartPulse, label: "Heart" },
  { icon: Flame, label: "Energy" },
  { icon: Activity, label: "Training" },
  { icon: Footprints, label: "Steps" },
];

export function DeviceSettingsScreen({ onBack }: DeviceSettingsScreenProps) {
  return (
    <AppScreen
      header={
        <ScreenHeader
          title="Device Settings"
          onBack={onBack}
          denseSmall
          titleClassName="text-[17px] font-semibold text-black"
        />
      }
      showHeaderBorder={false}
      showBottomBarBorder={false}
      maxContent="md"
    >
      <Stack gap="fluid" className="py-6">
        <Section variant="plain" padding="none">
          <div className="relative overflow-hidden rounded-[32px] border border-white/20 bg-gradient-to-br from-[var(--warm-coral)] via-[#f69a7f] to-[#c86a4a] p-6 text-white shadow-[0px_24px_48px_-18px_rgba(224,122,95,0.75)] sm:p-8">
            <div
              className="pointer-events-none absolute inset-x-10 -top-32 h-64 rounded-full bg-white/25 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-24 -right-10 h-60 w-60 rounded-full bg-white/10 blur-3xl"
              aria-hidden
            />

            <Stack gap="md" className="relative">
              <span className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                WorkItOut
              </span>

              <Stack gap="sm" align="center" className="text-center">
                <Stack direction="x" gap="md" align="center" justify="center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 text-[var(--primary)] shadow-lg shadow-black/20">
                    <HeartPulse className="h-8 w-8" />
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/10 backdrop-blur">
                    <Link2 className="h-5 w-5" />
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/20 backdrop-blur text-lg font-semibold tracking-[0.18em]">
                    WIO
                  </div>
                </Stack>

                <h1 className="text-[clamp(22px,5vw,30px)] font-semibold leading-tight">
                  Sync your wellness data with WorkItOut
                </h1>

                <p className="max-w-xl text-sm leading-relaxed text-white/80">
                  Connecting your health data — from sleep to steps — personalizes
                  your WorkItOut experience and helps us surface smarter coaching
                  moments along your journey.
                </p>
              </Stack>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {highlightMetrics.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-white/90 backdrop-blur"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                ))}
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-2 self-start rounded-full border border-white/40 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/90 transition hover:bg-white/20"
              >
                Learn More
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </Stack>
          </div>
        </Section>

        <Section
          variant="translucent"
          padding="lg"
          className="border border-border/70 shadow-lg shadow-[rgba(224,122,95,0.12)]"
        >
          <Stack gap="sm">
            <h2 className="text-lg font-semibold text-black">Manage device permissions</h2>
            <p className="text-sm leading-relaxed text-black/70">
              You can manage your Health Connect or wearable permissions anytime
              in your device settings. When everything is enabled, WorkItOut can
              tailor recovery insights, celebrate milestones, and keep your daily
              plan feeling just right.
            </p>

            <div className="rounded-2xl border border-border bg-muted/70 px-4 py-3 text-sm leading-relaxed text-black/75">
              <ol className="list-decimal space-y-2 pl-4">
                <li>
                  Open your device <span className="font-medium">Settings</span>.
                </li>
                <li>
                  Navigate to <span className="font-medium">Apps &amp; notifications</span>
                  , then choose <span className="font-medium">WorkItOut</span>.
                </li>
                <li>
                  Tap <span className="font-medium">Data &amp; Devices</span> and enable
                  every permission toggle for sleep, activity, heart rate, and
                  steps.
                </li>
              </ol>
            </div>

            <p className="text-sm leading-relaxed text-black/70">
              Tip: if something looks off, toggle permissions off and back on to
              refresh the connection.
            </p>
          </Stack>
        </Section>
      </Stack>
    </AppScreen>
  );
}

export default DeviceSettingsScreen;
