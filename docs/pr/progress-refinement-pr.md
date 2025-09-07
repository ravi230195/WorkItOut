# Progress: Refine Week/Month/Year Charts

## Summary

Refine the Progress screen to improve scannability and focus:

- Remove Day tab; keep Week, Month, Year
- Scrollable bar charts that align with period length
  - Week: 7 daily bars (Sun–Sat)
  - Month: one bar per day in that month
- Flip charts: bars grow vertically with labels (days/months) at the bottom; metric maps to the y‑axis
- Keep warm, soft palette; maintain card hierarchy and spacing

## Non‑Goals

- Changing data sources or goals logic
- Reworking bottom navigation or unrelated screens

## Checklist

- [ ] Week: 7 bars, horizontally scrollable on small screens
- [ ] Month: bars equal to day count, horizontally scrollable
- [ ] Year: monthly bars with labels along bottom
- [ ] Metric toggle (Steps / Workouts) filters cards and charts
- [ ] Smooth transitions; no layout jank

## Test Plan

1. `npm run dev`
2. Progress → toggle Week / Month / Year
3. Verify bar counts, scrolling, labels at bottom
4. Switch Steps/Workouts and confirm charts update

## Screenshots / Video

_Add captures as you iterate._

## Risks & Rollback

- Chart rendering density on small devices
- Rollback by reverting this branch’s commits

