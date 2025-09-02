import React, { useEffect, useMemo, useState } from "react";
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

/* ---------- responsive helpers (unchanged) ---------- */
function useViewportWidth() {
  const [vw, setVw] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : 390
  );
  useEffect(() => {
    const handler = () => setVw(window.innerWidth);
    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler);
    window.addEventListener("pageshow", handler);
    const t = setTimeout(handler, 100);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
      window.removeEventListener("pageshow", handler);
      clearTimeout(t);
    };
  }, []);
  return vw;
}

const clampNum = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const percentOf = (part: number | null | undefined, total: number | null | undefined) => {
  if (part == null || total == null || !isFinite(part) || !isFinite(total) || total <= 0) return null;
  return clampNum(Math.round((part / total) * 100), 0, 100);
};
const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString());

/* ---------- component ---------- */
function ProgressRings({
  steps,
  goal,
  recoveryPercent,
  strain,
  onStepsClick,
  onRecoveryClick,
  onStrainClick,
}: ProgressRingsProps) {
  const { warmBrown, warmCoral, accentBlue, trackGray, recoveryYellow } =
    useThemeTokens();
  const vw = useViewportWidth();

  // scale ring size with viewport width (keeps 3 across on all phones)
  const ring = useMemo(() => {
    const candidate = vw * 0.28;
    return Math.round(clampNum(candidate, 96, 140));
  }, [vw]);

  // keep stroke proportional
  const ringStroke = useMemo(() => {
    const s = Math.round(ring * (10 / 108));
    return clampNum(s, 8, 14);
  }, [ring]);

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
          size={ring}
          strokeWidth={ringStroke}
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
          size={ring}
          strokeWidth={ringStroke}
          textColor={warmBrown}
          progressColor={recoveryYellow}
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
          size={ring}
          strokeWidth={ringStroke}
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
      {/* Centered row; CSS controls spacing, no JS width math */}
      <div className="flex justify-center gap-4 sm:gap-6 px-2">
        {items.map(({ key, onClick, node }) => (
          <button
            key={key}
            className="touch-manipulation inline-flex shrink-0"
            onClick={onClick}
            aria-label={`${key} progress`}
          >
            {node}
          </button>
        ))}
      </div>

      {/* subtle divider */}
      <div className="mt-3 h-px bg-foreground/5" />
    </div>
  );
}

export default ProgressRings;
