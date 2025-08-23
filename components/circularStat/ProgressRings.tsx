import React from "react";
import CircularStat from "./CircularStat";
import { useThemeTokens } from "./useThemeTokens";

export type ProgressRingsProps = {
  steps: number | null | undefined;
  goal: number | null | undefined;
  recoveryPercent?: number | null;
  strain?: number | null;
  onStepsClick?: () => void;
  onRecoveryClick?: () => void;
  onStrainClick?: () => void;
};

const RING_SIZE = 108;
const RING_STROKE = 10;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const percentOf = (part: number | null | undefined, total: number | null | undefined) => {
  if (part == null || total == null || !isFinite(part) || !isFinite(total) || total <= 0) return null;
  return clamp(Math.round((part / total) * 100), 0, 100);
};
const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString());

function ProgressRings({
  steps,
  goal,
  recoveryPercent,
  strain,
  onStepsClick,
  onRecoveryClick,
  onStrainClick,
}: ProgressRingsProps) {
  const { warmBrown, warmCoral, accentBlue, trackGray } = useThemeTokens();

  const items: Array<{ key: string; onClick?: () => void; node: React.ReactNode }> = [
    {
      key: "steps",
      onClick: onStepsClick,
      node: (
        <CircularStat
          value={percentOf(steps, goal)}
          max={100}
          label="Steps"
          unit="%"
          size={RING_SIZE}
          strokeWidth={RING_STROKE}
          textColor={warmBrown}
          progressColor={accentBlue}
          trackColor={trackGray}
          primaryTextOverride={fmt(steps)}
          secondaryTextOverride={fmt(goal)}
        />
      ),
    },
    {
      key: "recovery",
      onClick: onRecoveryClick,
      node: (
        <CircularStat
          value={recoveryPercent ?? null}
          max={100}
          label="Recovery"
          unit="%"
          size={RING_SIZE}
          strokeWidth={RING_STROKE}
          textColor={warmBrown}
          progressColor={"#f2c94c"}
          trackColor={trackGray}
        />
      ),
    },
    {
      key: "strain",
      onClick: onStrainClick,
      node: (
        <CircularStat
          value={strain ?? null}
          max={10}
          label="Strain"
          unit=""
          size={RING_SIZE}
          strokeWidth={RING_STROKE}
          decimals={1}
          textColor={warmBrown}
          progressColor={warmCoral}
          trackColor={trackGray}
        />
      ),
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 px-1">
        {items.map(({ key, onClick, node }) => (
          <button key={key} className="touch-manipulation" onClick={onClick} aria-label={`${key} progress`}>
            {node}
          </button>
        ))}
      </div>
      <div className="mt-3 h-px bg-black/5" />
    </div>
  );
}

export default ProgressRings;
