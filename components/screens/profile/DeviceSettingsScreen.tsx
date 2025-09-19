import { AppScreen, ScreenHeader, Section, Stack } from "../../layouts";
import { TactileButton } from "../../TactileButton";
import {
  Activity,
  ArrowRight,
  Check,
  Dumbbell,
  Flame,
  Footprints,
  Info,
  Moon,
  Shield,
  Smartphone,
} from "lucide-react";

interface DeviceSettingsScreenProps {
  onBack: () => void;
}

const HIGHLIGHT_METRICS = [
  { icon: Activity, label: "Activity" },
  { icon: Footprints, label: "Steps" },
  { icon: Moon, label: "Sleep" },
  { icon: Flame, label: "Recovery" },
  { icon: Dumbbell, label: "Strength" },
] as const;

const PERMISSION_STEPS = [
  "Open the Apple Health app on your iPhone.",
  "Tap your profile icon → Apps → WorkItOut.",
  "Enable the categories you want WorkItOut to use.",
  "Return here and refresh to start syncing insights.",
] as const;

const SUPPORT_ITEMS = [
  {
    title: "Sync troubleshooting",
    description: "Review quick tips to refresh a stalled connection and confirm Apple Health is sharing data.",
  },
  {
    title: "Privacy controls",
    description: "See how WorkItOut keeps your health information secure and in your control at all times.",
  },
  {
    title: "Need a hand?",
    description: "Email support@workitout.app and our team will get you back to training in no time.",
  },
] as const;

export function DeviceSettingsScreen({ onBack }: DeviceSettingsScreenProps) {
  return (
    <AppScreen
      header={
        <ScreenHeader
          title="Device Settings"
          subtitle="Sync Apple Health with WorkItOut"
          onBack={onBack}
          denseSmall
          showBorder={false}
        />
      }
      maxContent="sm"
      padContent={false}
      showHeaderBorder={false}
      showBottomBarBorder={false}
      contentClassName="px-4 pb-16 pt-4"
    >
      <Stack gap="fluid">
        <Section variant="plain" padding="none">
          <div className="rounded-[32px] border border-transparent bg-gradient-to-br from-[var(--primary-light)] via-[var(--warm-peach)]/70 to-[var(--warm-cream)] text-black p-6 shadow-[0_30px_60px_-35px_rgba(224,122,95,0.9)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/60">
              WorkItOut Sync
            </p>

            <div className="mt-6 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/90 text-[var(--primary)] shadow-lg shadow-[rgba(224,122,95,0.3)]">
                <span className="text-2xl font-bold">W</span>
              </div>
              <ArrowRight size={24} className="text-black/50" />
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-black/80 text-white shadow-lg shadow-black/30">
                <Smartphone size={26} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-5 gap-3">
              {HIGHLIGHT_METRICS.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-2 text-center shadow-sm shadow-[rgba(0,0,0,0.08)]"
                >
                  <Icon size={20} className="text-[var(--primary)]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/70">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 text-sm leading-relaxed text-black/80">
              <p className="text-[15px] font-semibold text-black">
                Connecting your Apple Health data — from sleep to steps — personalizes your WorkItOut experience and unlocks deeper guidance for your training.
              </p>
              <p>
                You can update permissions at any time in Apple Health. We only use the categories you approve to surface insights, recovery trends, and coaching tailored to you.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <TactileButton size="md" variant="secondary" className="rounded-2xl px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.18em]">
                Learn how sync works
              </TactileButton>
              <span className="text-xs text-black/60">
                Updated moments ago · Last sync: just now
              </span>
            </div>
          </div>
        </Section>

        <Section variant="plain" padding="none">
          <div className="rounded-3xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/70">
              Enable permissions
            </p>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-black/80">
              {PERMISSION_STEPS.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-semibold text-[var(--primary)]">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-5 flex items-start gap-3 rounded-2xl bg-warm-cream/60 px-4 py-3 text-xs text-black/70">
              <Shield size={16} className="mt-0.5 text-[var(--primary)]" />
              <p className="leading-relaxed">
                WorkItOut only reads the data you approve and never shares it without permission. You can remove access anytime from Apple Health &gt; Apps &gt; WorkItOut.
              </p>
            </div>
          </div>
        </Section>

        <Section variant="plain" padding="none">
          <div className="space-y-4 rounded-3xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/70">
              Support &amp; tips
            </p>
            <div className="space-y-3 text-sm leading-relaxed text-black/80">
              {SUPPORT_ITEMS.map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-2xl bg-white/70 px-4 py-3 shadow-sm">
                  <Check size={16} className="mt-1 text-[var(--primary)]" />
                  <div>
                    <p className="text-sm font-semibold text-black">{item.title}</p>
                    <p className="text-xs text-black/70">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-[var(--accent-light)]/80 px-4 py-3 text-xs text-black/70">
              <Info size={16} className="mt-0.5 text-[var(--primary)]" />
              <p>
                Looking for other integrations? Device support for Garmin and Oura is coming soon. Stay tuned inside updates.
              </p>
            </div>
          </div>
        </Section>
      </Stack>
    </AppScreen>
  );
}
