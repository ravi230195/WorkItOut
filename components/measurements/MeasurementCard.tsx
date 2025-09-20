import { useMemo, useState } from "react";
import ExpandingCard from "../ui/ExpandingCard";
import { NumberInput } from "../ui/number-input";
import { Minus, Plus } from "lucide-react";
import { formatNumber, isLengthInputWithinPrecision } from "../../utils/unitConversion";

interface MeasurementEntry {
  date: string;
  value: string;
}

interface MeasurementCardProps {
  label: string;
  icon: React.ReactNode;
  unit?: string;
  entries: MeasurementEntry[]; // index 0 is today
  onEntryChange: (index: number, value: string) => void;
}

export default function MeasurementCard({
  label,
  icon,
  unit = "cm",
  entries,
  onEntryChange,
}: MeasurementCardProps) {
  const [expanded, setExpanded] = useState(false);

  const step = useMemo(() => (unit === "m" ? 0.01 : 0.5), [unit]);
  const valuePrecision = unit === "m" ? 2 : 1;
  const diffPrecision = valuePrecision;
  const parse = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };
  const update = (delta: number) => {
    const current = entries[0]?.value ?? "0";
    onEntryChange(0, (parse(current) + delta).toFixed(valuePrecision));
  };

  const handleDec = (e: React.MouseEvent) => {
    e.stopPropagation();
    update(-step);
  };
  const handleInc = (e: React.MouseEvent) => {
    e.stopPropagation();
    update(step);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const { value } = e.target;
    if (!isLengthInputWithinPrecision(value)) {
      return;
    }
    onEntryChange(0, value);
  };

  const diff =
    entries[1] != null
      ? parse(entries[0]?.value ?? "0") - parse(entries[1].value)
      : null;
  const diffText =
    diff != null
      ? `${diff >= 0 ? "+" : ""}${formatNumber(diff, diffPrecision)}${unit}`
      : undefined;

  return (
    <ExpandingCard
      variant="plain"
      size="md"
      expanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
      className="w-full rounded-2xl border border-border card-modern shadow-xl hover:shadow-xl transition-all text-left"
      style={{ border: "2px solid var(--border)" }}
      /* 50% title area */
      title={
        <div className="min-w-0 flex-[0_0_50%]">
          <div className="truncate">{label}</div>
        </div>
      }
      subtitle={diffText && <span className="text-sm text-black">{diffText}</span>}
      leading={<span className="text-xl">{icon}</span>}
      /* 40% controls, leave 10% for chevron via margin-right */
      trailing={
        <div
          className="flex-[0_0_40%] shrink-0 mr-[10%]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-[28px_minmax(3.5rem,1fr)_28px] items-center gap-2">
            <button
              type="button"
              onClick={handleDec}
              className="w-7 h-7 rounded-full bg-soft-gray flex items-center justify-center text-black"
            >
              <Minus size={14} />
            </button>

            <NumberInput
              step={step}
              min={0}
              mode="decimal"
              value={entries[0]?.value ?? ""}
              onChange={handleChange}
              placeholder={unit}
              className="h-7 text-center px-1 w-full"
            />

            <button
              type="button"
              onClick={handleInc}
              className="w-7 h-7 rounded-full bg-soft-gray flex items-center justify-center text-black"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      }
    >
      {entries.length > 0 && (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          {entries.slice(0, 4).map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-sm text-black">{p.date}</span>
              <div className="flex items-center gap-2">
                <NumberInput
                  step={step}
                  min={0}
                  mode="decimal"
                  value={p.value}
                  onChange={(e) => {
                    const { value } = e.target;
                    if (!isLengthInputWithinPrecision(value)) {
                      return;
                    }
                    onEntryChange(i, value);
                  }}
                  className="h-7 text-center px-1 w-[6.5rem] sm:w-[7.5rem]"
                />
                <span className="text-sm text-black">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </ExpandingCard>
  );
}
