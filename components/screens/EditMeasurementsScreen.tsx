import { useState } from "react";
import { AppScreen, ScreenHeader, Section, Stack, Spacer } from "../layouts";
import { Input } from "../ui/input";
import { TactileButton } from "../TactileButton";
import { toast } from "sonner";

interface EditMeasurementsScreenProps {
  onBack: () => void;
}

export default function EditMeasurementsScreen({ onBack }: EditMeasurementsScreenProps) {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const handleSave = () => {
    // Placeholder save handler
    toast.success("Measurements saved");
    onBack();
  };

  return (
    <AppScreen
      header={<ScreenHeader title="Edit Measurements" onBack={onBack} showBorder={false} denseSmall contentHeightPx={74} titleClassName="text-[17px] font-bold" />}
      maxContent="responsive"
      padContent={false}
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={null}
      bottomBarSticky
      contentClassName=""
    >
      <Stack gap="fluid">
        <Spacer y="sm" />
        <Section variant="card" padding="md" className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-warm-brown">Weight (kg)</label>
            <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 70" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-warm-brown">Height (cm)</label>
            <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 175" />
          </div>
        </Section>
        <Spacer y="sm" />
        <Section variant="plain" padding="none">
          <TactileButton
            onClick={handleSave}
            className="w-full h-12 md:h-14 bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-sm md:text-base rounded-full border-0"
          >
            SAVE
          </TactileButton>
        </Section>
      </Stack>
    </AppScreen>
  );
}
