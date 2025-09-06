import { useState } from "react";
import ExpandingCard from "../ui/ExpandingCard";
import { Input } from "../ui/input";
import { Minus, Plus } from "lucide-react";

interface MeasurementCardProps {
  label: string;
  icon: React.ReactNode;
  unit?: string;
  initial?: string;
  history?: string[]; // most recent first
}

export default function MeasurementCard({
  label,
  icon,
  unit = "cm",
  initial = "",
  history = [],
}: MeasurementCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState(initial);
  const [past, setPast] = useState(history);

  const step = 0.5;

  const parse = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  const update = (delta: number) => {
    setValue((prev) => (parse(prev) + delta).toFixed(1));
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
    setValue(e.target.value);
  };

  const handlePastChange = (idx: number, v: string) => {
    setPast((arr) => {
      const copy = [...arr];
      copy[idx] = v;
      return copy;
    });
  };

  const diff = past[0] != null ? parse(value) - parse(past[0]) : null;
  const diffPct = diff != null && parse(past[0]) !== 0 ? (diff / parse(past[0])) * 100 : null;
  const diffText =
    diff != null
      ? `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}${unit} (${diffPct && diffPct >= 0 ? "+" : ""}${diffPct?.toFixed(1)}%) vs last entry`
      : undefined;

  return (
    <ExpandingCard
      variant="solid"
      size="lg"
      expanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
      title={label}
      subtitle={diffText && (
        <span className="text-sm text-warm-brown/60">{diffText}</span>
      )}
      leading={<span className="text-xl">{icon}</span>}
      trailing={
        <div className="flex items-center gap-2 mr-4" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleDec}
            className="w-7 h-7 rounded-full bg-soft-gray flex items-center justify-center text-warm-brown"
          >
            <Minus size={14} />
          </button>
          <Input
            value={value}
            onChange={handleChange}
            placeholder={unit}
            className="w-48 h-7 text-center p-1"
          />
          <button
            type="button"
            onClick={handleInc}
            className="w-7 h-7 rounded-full bg-soft-gray flex items-center justify-center text-warm-brown"
          >
            <Plus size={14} />
          </button>
        </div>
      }
    >
      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
        {past.slice(0, 4).map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <span className="text-sm text-warm-brown/60">Entry {i + 1}</span>
            <div className="flex items-center gap-2">
              <Input
                value={p}
                onChange={(e) => handlePastChange(i, e.target.value)}
                className="w-48 h-7 text-center p-1"
              />
              <span className="text-sm text-warm-brown">{unit}</span>
            </div>
          </div>
        ))}
      </div>
    </ExpandingCard>
  );
}

