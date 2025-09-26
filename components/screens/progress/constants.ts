import type { TimeRange } from "@/types/progress";
import type { ProgressDomain } from "../../progress/Progress.types";

export type DomainOption = { value: ProgressDomain; label: string };
export type RangeOption = { value: TimeRange; label: string };

export const DOMAIN_OPTIONS: DomainOption[] = [
  { value: "workouts", label: "Workouts" },
  { value: "measurement", label: "Measurement" },
];

export const RANGE_OPTIONS: RangeOption[] = [
  { value: "week", label: "W" },
  { value: "threeMonths", label: "3M" },
  { value: "sixMonths", label: "6M" },
];

export const DOMAIN_LABELS: Record<ProgressDomain, string> = {
  workouts: "Workouts",
  measurement: "Measurement",
};

export const RANGE_LABELS: Record<TimeRange, string> = {
  week: "W",
  threeMonths: "3M",
  sixMonths: "6M",
};
