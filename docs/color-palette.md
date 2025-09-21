# Color Palette

Use this palette to keep the workout experience warm, energetic, and consistent. Each color maps to CSS variables declared in `styles/globals.css` so you can reference them from Tailwind via arbitrary values (for example `bg-[var(--brand-orange-soft)]`).

| Token | Hex | HSL | Suggested use |
| --- | --- | --- | --- |
| `--brand-orange-strong` | `#D65A43` | `9°, 64%, 55%` | Call-to-actions, active states, highlights |
| `--brand-orange` | `#E07A5F` | `13°, 68%, 63%` | Primary buttons, icons, progress emphasis |
| `--brand-orange-soft` | `#F4A48A` | `15°, 83%, 75%` | Panels, dropdown surfaces, subtle gradients |
| `--brand-orange-subtle` | `#FBE1D6` | `18°, 82%, 91%` | Background tints, badges, hover states |
| `--brand-green-strong` | `#2F7D52` | `147°, 45%, 34%` | Success states, streak indicators |
| `--brand-green` | `#4F9D69` | `140°, 33%, 46%` | Secondary buttons, wellness cues |
| `--brand-green-soft` | `#A7CBB2` | `138°, 26%, 73%` | Background accents, neutral cards |
| `--brand-yellow-strong` | `#F0B429` | `42°, 87%, 55%` | Warning cues, activity summary glyphs |
| `--brand-yellow` | `#F7C948` | `44°, 92%, 63%` | Highlights, goal progress bars |
| `--brand-yellow-soft` | `#FFEDC2` | `42°, 100%, 88%` | Warm overlays, charts, hover fills |

### Usage notes
- `--warm-coral` and `--warm-sage` now map to the orange/green tokens above, so legacy components automatically stay on-brand.
- For translucent surfaces, prefer applying opacity to the element (e.g. `opacity-80`) rather than tweaking the color token directly—this keeps gradients and overlays predictable.
- Pair orange primaries with green/yellow accents to reinforce motivation without overwhelming the user.
