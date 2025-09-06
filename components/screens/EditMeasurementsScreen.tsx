import { AppScreen, ScreenHeader, Section, Stack, Spacer } from "../layouts";
import { TactileButton } from "../TactileButton";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";
import MeasurementCard from "../measurements/MeasurementCard";

interface EditMeasurementsScreenProps {
  onBack: () => void;
}

const measurementData = [
  {
    key: "chest",
    label: "Chest",
    icon: "🫁",
    initial: "102",
    history: [
      { date: "2024-01-15", value: "100" },
      { date: "2024-01-08", value: "99" },
      { date: "2024-01-01", value: "98" },
      { date: "2023-12-25", value: "97" }
    ]
  },
  {
    key: "rightArm",
    label: "Right Arm",
    icon: "💪",
    initial: "35",
    history: [
      { date: "2024-01-15", value: "34" },
      { date: "2024-01-08", value: "33.5" },
      { date: "2024-01-01", value: "33" },
      { date: "2023-12-25", value: "32.5" }
    ]
  },
  {
    key: "leftArm",
    label: "Left Arm",
    icon: "💪",
    initial: "34.5",
    history: [
      { date: "2024-01-15", value: "34" },
      { date: "2024-01-08", value: "33.5" },
      { date: "2024-01-01", value: "33" },
      { date: "2023-12-25", value: "32.5" }
    ]
  },
  {
    key: "hip",
    label: "Hip",
    icon: "🩳",
    initial: "95",
    history: [
      { date: "2024-01-15", value: "94.5" },
      { date: "2024-01-08", value: "94" },
      { date: "2024-01-01", value: "93.5" },
      { date: "2023-12-25", value: "93" }
    ]
  },
  {
    key: "glutes",
    label: "Glutes",
    icon: "🍑",
    initial: "",
    history: []
  },
  {
    key: "leftQuad",
    label: "Left Quad",
    icon: "🦵",
    initial: "35",
    history: [
      { date: "2024-01-15", value: "34.5" },
      { date: "2024-01-08", value: "34" },
      { date: "2024-01-01", value: "33.5" },
      { date: "2023-12-25", value: "33" }
    ]
  },
  {
    key: "rightQuad",
    label: "Right Quad",
    icon: "🦵",
    initial: "58.5",
    history: [
      { date: "2024-01-15", value: "58" },
      { date: "2024-01-08", value: "57.5" },
      { date: "2024-01-01", value: "57" },
      { date: "2023-12-25", value: "56.5" }
    ]
  }
];

export default function EditMeasurementsScreen({ onBack }: EditMeasurementsScreenProps) {
  const handleSave = () => {
    toast.success("Measurements saved");
    onBack();
  };

  return (
    <AppScreen
      header={<ScreenHeader title="Body Measurements" onBack={onBack} showBorder={false} denseSmall contentHeightPx={74} titleClassName="text-[17px] font-bold" />}
      maxContent="responsive"
      padContent={false}
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={null}
      bottomBarSticky
      contentClassName=""
    >
      <Stack gap="fluid">
        <Section variant="card" padding="md" className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-soft-gray flex items-center justify-center shrink-0">
            <TrendingUp className="text-warm-brown" size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-warm-brown truncate">Track Your Progress</div>
            <div className="text-sm text-warm-brown/60 truncate">Record measurements to see changes over time</div>
          </div>
        </Section>
        <Spacer y="sm" />
        {measurementData.map((m) => (
          <div key={m.key} className="space-y-2">
            <MeasurementCard label={m.label} icon={m.icon} initial={m.initial} history={m.history} />
          </div>
        ))}
        <Spacer y="sm" />
        <Section variant="plain" padding="none">
          <TactileButton
            onClick={handleSave}
            className="w-full h-12 md:h-14 bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-sm md:text-base rounded-full border-0"
          >
            Save Measurements
          </TactileButton>
        </Section>
      </Stack>
    </AppScreen>
  );
}

