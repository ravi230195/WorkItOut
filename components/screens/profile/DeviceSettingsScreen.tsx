import { AppScreen, ScreenHeader, Section, Stack } from "../../layouts";
import { TactileButton } from "../../TactileButton";
import {
  Activity,
  ArrowUpRight,
  Flame,
  Footprints,
  HeartPulse,
  Moon,
  Sparkles,
} from "lucide-react";

interface DeviceSettingsScreenProps {
  onBack: () => void;
}

const dataTypes = [
  { icon: Moon, label: "Sleep" },
  { icon: Footprints, label: "Steps" },
  { icon: Activity, label: "Activity" },
  { icon: Flame, label: "Energy" },
  { icon: HeartPulse, label: "Heart Rate" },
  { icon: Sparkles, label: "Mindfulness" },
] as const;

export function DeviceSettingsScreen({ onBack }: DeviceSettingsScreenProps) {
  return (
    <AppScreen
      header={
        <ScreenHeader
          title="Device Settings"
          onBack={onBack}
          showBorder={false}
          denseSmall
          titleClassName="text-[17px] font-semibold text-black"
        />
      }
      maxContent="sm"
      showHeaderBorder={false}
      showBottomBarBorder={false}
      headerInScrollArea
    >
      <Stack gap="fluid">
        <Section variant="plain" padding="none">
          <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-br from-[var(--primary-light)] via-[#f2cc8f]/80 to-[var(--warm-cream)] text-black shadow-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.65),transparent_58%)]" />
            <div className="relative flex flex-col gap-8 p-8">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.32em] text-black/70">
                <span>Apple Health</span>
                <span>Workout Tracker</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/90 shadow-lg shadow-primary/30 backdrop-blur-sm">
                  <HeartPulse className="h-8 w-8 text-[#ff4d6d]" strokeWidth={1.6} aria-hidden="true" />
                  <span className="sr-only">Apple Health</span>
                </div>
                <div className="relative h-px flex-1">
                  <div className="absolute inset-0 border-t border-dashed border-black/30" />
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-white text-sm font-semibold tracking-tight shadow-lg shadow-black/20">
                  WT
                  <span className="sr-only">Workout Tracker</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {dataTypes.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/40 bg-white/80 text-black shadow-sm shadow-primary/20 backdrop-blur-sm"
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
                    <span className="sr-only">{label}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-black/75">
                <p>
                  Connecting your Apple Health data — from Sleep to Steps — personalizes your Workout Tracker experience and helps
                  us build better guidance over time.
                </p>
                <div className="rounded-2xl border border-white/50 bg-white/80 p-6 text-sm text-black/75 shadow-sm backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-black/60">
                    Manage permissions
                  </p>
                  <p className="mt-3">
                    You can review permissions any time in Settings. To keep Workout Tracker in sync:
                  </p>
                  <ol className="mt-4 list-decimal space-y-2 pl-5">
                    <li>
                      Open <span className="font-medium">Settings</span> → <span className="font-medium">Health</span> → <span className="font-medium">Data Access &amp; Devices</span>.
                    </li>
                    <li>
                      Choose <span className="font-medium">Workout Tracker</span>.
                    </li>
                    <li>Enable all categories you want to share with the app.</li>
                  </ol>
                  <p className="mt-4 text-xs text-black/60">You&apos;re in control and can change these choices at any time.</p>
                </div>
              </div>

              <div>
                <TactileButton
                  variant="ghost"
                  size="sm"
                  className="group inline-flex items-center gap-1 px-0 text-sm font-medium text-black/80 hover:text-black"
                  type="button"
                >
                  Learn more
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </TactileButton>
              </div>
            </div>
          </div>
        </Section>
      </Stack>
    </AppScreen>
  );
}

export default DeviceSettingsScreen;
