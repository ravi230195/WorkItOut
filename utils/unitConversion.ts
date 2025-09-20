import type { UnitLength, UnitWeight } from "./supabase/supabase-types";

export const DEFAULT_LENGTH_UNIT: UnitLength = "cm";
export const DEFAULT_WEIGHT_UNIT: UnitWeight = "kg";

const CM_PER_METER = 100;
const LB_PER_KG = 2.2046226218;

const roundTo = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export const formatNumber = (value: number, precision: number): string => {
  if (!Number.isFinite(value)) {
    return "";
  }
  if (precision <= 0) {
    return Math.round(value).toString();
  }
  const rounded = roundTo(value, precision);
  return Number(rounded.toFixed(precision)).toString();
};

export const WEIGHT_DECIMAL_PLACES = 2;
export const LENGTH_DECIMAL_PLACES = 2;

export const isWithinDecimalPrecision = (value: string, maxDecimals: number): boolean => {
  if (maxDecimals < 0) return true;
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;

  if (trimmed === "." || trimmed === "-." || trimmed === "+.") {
    return maxDecimals >= 0;
  }

  const precisionPattern = new RegExp(`^[-+]?\\d*(?:\\.\\d{0,${maxDecimals}})?$`);
  return precisionPattern.test(trimmed);
};

export const isWeightInputWithinPrecision = (value: string): boolean =>
  isWithinDecimalPrecision(value, WEIGHT_DECIMAL_PLACES);

export const isLengthInputWithinPrecision = (value: string): boolean =>
  isWithinDecimalPrecision(value, LENGTH_DECIMAL_PLACES);

export const normalizeLengthUnit = (value: UnitLength | string | null | undefined): UnitLength => {
  return value === "m" || value === "cm" ? (value as UnitLength) : DEFAULT_LENGTH_UNIT;
};

export const normalizeWeightUnit = (value: UnitWeight | string | null | undefined): UnitWeight => {
  if (value === "lb" || value === "lbs") return "lb";
  return DEFAULT_WEIGHT_UNIT;
};

export const lengthCmToUnit = (lengthCm: number, unit: UnitLength): number => {
  const normalized = normalizeLengthUnit(unit);
  return normalized === "m" ? lengthCm / CM_PER_METER : lengthCm;
};

export const lengthUnitToCm = (length: number, unit: UnitLength): number => {
  const normalized = normalizeLengthUnit(unit);
  return normalized === "m" ? length * CM_PER_METER : length;
};

export const weightKgToUnit = (weightKg: number, unit: UnitWeight): number => {
  const normalized = normalizeWeightUnit(unit);
  return normalized === "lb" ? weightKg * LB_PER_KG : weightKg;
};

export const weightUnitToKg = (weight: number, unit: UnitWeight): number => {
  const normalized = normalizeWeightUnit(unit);
  return normalized === "lb" ? weight / LB_PER_KG : weight;
};

export const formatLength = (
  lengthCm: number | null | undefined,
  unit: UnitLength,
  precision = unit === "m" ? 2 : 1,
): string => {
  if (lengthCm == null || !Number.isFinite(lengthCm)) {
    return "";
  }
  const converted = lengthCmToUnit(lengthCm, unit);
  return formatNumber(converted, precision);
};

export const formatWeight = (
  weightKg: number | null | undefined,
  unit: UnitWeight,
  precision = WEIGHT_DECIMAL_PLACES,
): string => {
  if (weightKg == null || !Number.isFinite(weightKg)) {
    return "";
  }
  const converted = weightKgToUnit(weightKg, unit);
  return formatNumber(converted, precision);
};

export const parseLengthInput = (value: string, unit: UnitLength): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return undefined;
  return lengthUnitToCm(numeric, unit);
};

export const parseWeightInput = (value: string, unit: UnitWeight): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return undefined;
  return weightUnitToKg(numeric, unit);
};

export const getLengthUnitLabel = (unit: UnitLength): string => {
  const normalized = normalizeLengthUnit(unit);
  return normalized;
};

export const getWeightUnitLabel = (unit: UnitWeight): string => {
  const normalized = normalizeWeightUnit(unit);
  return normalized === "lb" ? "lbs" : "kg";
};
