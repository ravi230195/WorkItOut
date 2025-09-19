import { AppScreen, ScreenHeader, Section, Stack } from "../../layouts";

interface DeviceSettingsScreenProps {
  onBack: () => void;
}

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
          <div className="relative overflow-hidden rounded-[32px] border border-white/20 bg-gradient-to-br from-[var(--warm-coral)] via-[#f69a7f] to-[#c86a4a] p-6 text-white shadow-[0px_24px_48px_-18px_rgba(224,122,95,0.75)] sm:p-10">
            <div
              className="pointer-events-none absolute inset-x-10 -top-32 h-64 rounded-full bg-white/25 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-24 -right-10 h-60 w-60 rounded-full bg-white/10 blur-3xl"
              aria-hidden
            />

            <Stack gap="xl" className="relative text-white">
              <Stack gap="xs">
                <span className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                  WorkItOut
                </span>

                <h1 className="text-[clamp(24px,5vw,32px)] font-semibold leading-tight text-white">
                  Keep WorkItOut in sync with Apple Health
                </h1>

                <p className="max-w-2xl text-sm leading-relaxed text-white/80">
                  Connecting your Apple Health data — from sleep to steps — personalizes your WorkItOut experience and
                  helps us build better guidance over time.
                </p>
              </Stack>

              <div className="rounded-3xl border border-white/60 bg-white/80 p-6 text-sm leading-relaxed text-black/75 shadow-md backdrop-blur-sm sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-black/60">
                  Manage permissions
                </p>
                <p className="mt-3">
                  You can review permissions any time in Settings. To keep WorkItOut in sync:
                </p>
                <ol className="mt-4 list-decimal space-y-2 pl-5">
                  <li>
                    Open <span className="font-medium">Settings</span> → <span className="font-medium">Health</span> →
                    {" "}
                    <span className="font-medium">Data Access &amp; Devices</span>.
                  </li>
                  <li>
                    Choose <span className="font-medium">WorkItOut</span>.
                  </li>
                  <li>Enable all categories you want to share with the app.</li>
                </ol>
                <p className="mt-4 text-xs text-black/60">You&apos;re in control and can change these choices at any time.</p>
              </div>
            </Stack>
          </div>
        </Section>
      </Stack>
    </AppScreen>
  );
}

export default DeviceSettingsScreen;
