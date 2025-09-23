import type { TimeRange } from "../../../src/types/progress";
import type { ProgressDomain } from "../../progress/Progress.types";

export type DomainOption = { value: ProgressDomain; label: string };
export type RangeOption = { value: TimeRange; label: string };

export const DOMAIN_OPTIONS: DomainOption[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "measurement", label: "Measurement" },
];

export const RANGE_OPTIONS: RangeOption[] = [
  { value: "week", label: "Week" },
  { value: "threeMonths", label: "3 Month" },
  { value: "sixMonths", label: "6 Month" },
];

export const DOMAIN_LABELS: Record<ProgressDomain, string> = {
  strength: "Strength",
  cardio: "Cardio",
  measurement: "Measurement",
};

export const RANGE_LABELS: Record<TimeRange, string> = {
  week: "Week",
  threeMonths: "3 Month",
  sixMonths: "6 Month",
};
