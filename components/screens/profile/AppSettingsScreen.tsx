import { useState } from "react";
import { Settings2 } from "lucide-react";
import { AppScreen, ScreenHeader, Section, Stack } from "../../layouts";
import { Card, CardContent } from "../../ui/card";
import SegmentedToggle from "../../segmented/SegmentedToggle";
import { logger } from "../../../utils/logging";

interface AppSettingsScreenProps {
  onBack: () => void;
}

type LengthUnit = "cm" | "m";
type WeightUnit = "kg" | "lbs";

export function AppSettingsScreen({ onBack }: AppSettingsScreenProps) {
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>("cm");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");

  const handleLengthUnitChange = (value: LengthUnit) => {
    setLengthUnit(value);
    logger.info(`[AppSettings] Length unit set to ${value.toUpperCase()}`);
  };

  const handleWeightUnitChange = (value: WeightUnit) => {
    setWeightUnit(value);
    logger.info(`[AppSettings] Weight unit set to ${value.toUpperCase()}`);
  };

  return (
    <AppScreen
      header={
        <ScreenHeader
          title="App Settings"
          onBack={onBack}
          showBorder={false}
          denseSmall
          titleClassName="text-[17px] font-bold text-black"
        />
      }
      maxContent="responsive"
      showHeaderBorder={false}
      showBottomBarBorder={false}
    >
      <Stack gap="fluid">
        <Section variant="plain" padding="none">
          <Card className="border border-border bg-card/80 backdrop-blur-sm shadow-sm">
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/80 text-black shadow-md shadow-primary/30">
                <Settings2 size={22} />
              </div>
              <div className="space-y-1">
                <h1 className="text-[clamp(20px,5vw,26px)] font-semibold text-black">
                  Unit Preferences
                </h1>
                <p className="text-sm text-black/60">
                  Choose how measurements are displayed throughout the app.
                </p>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section variant="plain" padding="none">
          <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-sm space-y-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-black/60">
                Length Units
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-black/80">
                  Choose how height is displayed
                </div>
                <SegmentedToggle<LengthUnit>
                  value={lengthUnit}
                  onChange={handleLengthUnitChange}
                  options={[
                    { value: "cm", label: "CM" },
                    { value: "m", label: "M" },
                  ]}
                  size="md"
                  variant="filled"
                  tone="accent"
                />
              </div>
            </div>

            <div className="h-px bg-border/80" />

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-black/60">
                Weight Units
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-black/80">
                  Choose how weight is displayed
                </div>
                <SegmentedToggle<WeightUnit>
                  value={weightUnit}
                  onChange={handleWeightUnitChange}
                  options={[
                    { value: "kg", label: "KG" },
                    { value: "lbs", label: "LBS" },
                  ]}
                  size="md"
                  variant="filled"
                  tone="accent"
                />
              </div>
            </div>
          </div>
        </Section>

      </Stack>
    </AppScreen>
  );
}
