import type { TimeRange } from "../../../src/types/progress";
import type { ProgressDomain, SnapshotLookup } from "./types";
import { daysAgoISO, generateTrend } from "./utils";

export const MOCK_SNAPSHOTS: SnapshotLookup = {
  strength: {
    week: {
      series: [
        generateTrend("strength", "week", 1050, 0.32, 0),
        generateTrend("strength", "week", 860, 0.28, 1),
        generateTrend("strength", "week", 1340, 0.3, 2),
        generateTrend("strength", "week", 620, 0.26, 3),
      ],
      kpis: [
        { title: "Duration", unit: "hours", value: "3h 18m", currentNumeric: 198, previous: 172 },
        { title: "Workouts", value: "5", currentNumeric: 5, previous: 4 },
        { title: "Total Weight", unit: "kg", value: "82,640", currentNumeric: 82640, previous: 79320 },
        { title: "Streak", unit: "days", value: "6", currentNumeric: 6, previous: 4 },
      ],
      history: [
        { type: "strength", id: "s1", name: "Upper Power", date: daysAgoISO(1), duration: "52 min", totalWeight: "28,450 kg" },
        { type: "strength", id: "s2", name: "Posterior Chain", date: daysAgoISO(3), duration: "47 min", totalWeight: "30,120 kg" },
        { type: "strength", id: "s3", name: "Power Pull", date: daysAgoISO(5), duration: "41 min", totalWeight: "24,360 kg" },
      ],
    },
    threeMonths: {
      series: [
        generateTrend("strength", "threeMonths", 1220, 0.24, 0),
        generateTrend("strength", "threeMonths", 940, 0.22, 1),
        generateTrend("strength", "threeMonths", 1480, 0.25, 2),
        generateTrend("strength", "threeMonths", 680, 0.21, 3),
      ],
      kpis: [
        { title: "Duration", unit: "hours", value: "12h 42m", currentNumeric: 762, previous: 708 },
        { title: "Workouts", value: "18", currentNumeric: 18, previous: 16 },
        { title: "Total Weight", unit: "kg", value: "322,130", currentNumeric: 322130, previous: 304980 },
        { title: "Streak", unit: "days", value: "12", currentNumeric: 12, previous: 9 },
      ],
      history: [],
    },
    sixMonths: {
      series: [
        generateTrend("strength", "sixMonths", 1380, 0.18, 0),
        generateTrend("strength", "sixMonths", 980, 0.17, 1),
        generateTrend("strength", "sixMonths", 1620, 0.2, 2),
        generateTrend("strength", "sixMonths", 720, 0.15, 3),
      ],
      kpis: [
        { title: "Duration", unit: "hours", value: "156", currentNumeric: 9360, previous: 9020 },
        { title: "Workouts", value: "182", currentNumeric: 182, previous: 178 },
        { title: "Total Weight", unit: "kg", value: "3.4M", currentNumeric: 3400000, previous: 3320000 },
        { title: "Streak", unit: "days", value: "21", currentNumeric: 21, previous: 18 },
      ],
      history: [],
    },
  },
  cardio: {
    week: {
      series: [
        generateTrend("cardio", "week", 8, 0.32, 0),
        generateTrend("cardio", "week", 6.4, 0.28, 1),
        generateTrend("cardio", "week", 9.8, 0.3, 2),
        generateTrend("cardio", "week", 5.2, 0.26, 3),
      ],
      kpis: [
        { title: "Total Time", unit: "hours", value: "4h 05m", currentNumeric: 245, previous: 203 },
        { title: "Distance", unit: "km", value: "42.5", currentNumeric: 42.5, previous: 38.2 },
        { title: "Calories", unit: "kcal", value: "3,420", currentNumeric: 3420, previous: 3150 },
        { title: "Steps", value: "64,210", currentNumeric: 64210, previous: 60890 },
      ],
      history: [
        { type: "cardio", id: "c1", activity: "Outdoor Run", date: daysAgoISO(1), duration: "00:42:10", distance: "7.4 km", calories: "612 kcal" },
        { type: "cardio", id: "c2", activity: "Indoor Run", date: daysAgoISO(3), duration: "00:35:05", distance: "5.6 km", calories: "438 kcal" },
        { type: "cardio", id: "c3", activity: "Cycling", date: daysAgoISO(5), duration: "00:48:44", distance: "18.2 km", calories: "502 kcal" },
      ],
    },
    threeMonths: {
      series: [
        generateTrend("cardio", "threeMonths", 28, 0.22, 0),
        generateTrend("cardio", "threeMonths", 21, 0.2, 1),
        generateTrend("cardio", "threeMonths", 34, 0.23, 2),
        generateTrend("cardio", "threeMonths", 17, 0.19, 3),
      ],
      kpis: [
        { title: "Total Time", unit: "hours", value: "15h 38m", currentNumeric: 938, previous: 902 },
        { title: "Distance", unit: "km", value: "168", currentNumeric: 168, previous: 160 },
        { title: "Calories", unit: "kcal", value: "13,420", currentNumeric: 13420, previous: 12680 },
        { title: "Steps", value: "262,410", currentNumeric: 262410, previous: 254000 },
      ],
      history: [],
    },
    sixMonths: {
      series: [
        generateTrend("cardio", "sixMonths", 52, 0.18, 0),
        generateTrend("cardio", "sixMonths", 38, 0.16, 1),
        generateTrend("cardio", "sixMonths", 58, 0.19, 2),
        generateTrend("cardio", "sixMonths", 32, 0.15, 3),
      ],
      kpis: [
        { title: "Total Time", unit: "hours", value: "168", currentNumeric: 10080, previous: 9980 },
        { title: "Distance", unit: "km", value: "1,932", currentNumeric: 1932, previous: 1870 },
        { title: "Calories", unit: "kcal", value: "124,650", currentNumeric: 124650, previous: 123200 },
        { title: "Steps", value: "2.9M", currentNumeric: 2900000, previous: 2840000 },
      ],
      history: [],
    },
  },
  measurement: {
    week: {
      series: [
        generateTrend("measurement", "week", 101.2, 0.03, 0),
        generateTrend("measurement", "week", 36.4, 0.025, 1),
        generateTrend("measurement", "week", 58.8, 0.024, 2),
        generateTrend("measurement", "week", 96.7, 0.028, 3),
      ],
      kpis: [
        { title: "Chest", unit: "cm", value: "101.2", currentNumeric: 101.2, previous: 101.5 },
        { title: "Arms", unit: "cm", value: "36.4", currentNumeric: 36.4, previous: 36.1 },
        { title: "Legs", unit: "cm", value: "58.8", currentNumeric: 58.8, previous: 58.6 },
        { title: "Back", unit: "cm", value: "96.7", currentNumeric: 96.7, previous: 97.1 },
      ],
      history: [],
    },
    threeMonths: {
      series: [
        generateTrend("measurement", "threeMonths", 101.4, 0.03, 0),
        generateTrend("measurement", "threeMonths", 36.2, 0.024, 1),
        generateTrend("measurement", "threeMonths", 59.1, 0.022, 2),
        generateTrend("measurement", "threeMonths", 96.9, 0.027, 3),
      ],
      kpis: [
        { title: "Chest", unit: "cm", value: "101.4", currentNumeric: 101.4, previous: 102.0 },
        { title: "Arms", unit: "cm", value: "36.2", currentNumeric: 36.2, previous: 36.0 },
        { title: "Legs", unit: "cm", value: "59.1", currentNumeric: 59.1, previous: 58.9 },
        { title: "Back", unit: "cm", value: "96.9", currentNumeric: 96.9, previous: 97.3 },
      ],
      history: [],
    },
    sixMonths: {
      series: [
        generateTrend("measurement", "sixMonths", 102.8, 0.032, 0),
        generateTrend("measurement", "sixMonths", 36.0, 0.022, 1),
        generateTrend("measurement", "sixMonths", 59.6, 0.02, 2),
        generateTrend("measurement", "sixMonths", 97.2, 0.026, 3),
      ],
      kpis: [
        { title: "Chest", unit: "cm", value: "102.8", currentNumeric: 102.8, previous: 103.6 },
        { title: "Arms", unit: "cm", value: "36.0", currentNumeric: 36.0, previous: 35.8 },
        { title: "Legs", unit: "cm", value: "59.6", currentNumeric: 59.6, previous: 59.2 },
        { title: "Back", unit: "cm", value: "97.2", currentNumeric: 97.2, previous: 97.9 },
      ],
      history: [],
    },
  },
};

export const DOMAIN_OPTIONS: Array<{ value: ProgressDomain; label: string }> = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "measurement", label: "Measurement" },
];

export const RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: "week", label: "Week" },
  { value: "threeMonths", label: "3 Month" },
  { value: "sixMonths", label: "6 Month" },
];
