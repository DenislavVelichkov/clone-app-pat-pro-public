# Stage 9: Polish

Run this stage after the style-assertion gate passes. It tightens remaining measurable differences and checks the finished routes at the requested viewports.

## Procedure

1. Confirm the latest QA cycle has zero failed style assertions and the project build succeeds.
2. Visit each requested route and viewport with the configured browser-control tool. Read DOM and computed styles; use screenshots only as visual references when the tool returns a file.
3. Fix only issues supported by measured reference values. Keep changes targeted and avoid changing shared tokens unless evidence shows the token itself is wrong.
4. Recheck affected computed styles and rerun the assertion script. Run the project build after edits.
5. Update status and progress records. Report changed files, measurements, build result, and remaining limits, then wait for user approval.

## Focus areas

- Gradient type, angle, layer order, colors, and stop positions.
- Per-side spacing, asymmetric radii, layered shadows, and opacity.
- Cursor, focus ring, hover state, and transition timing.
- Responsive behavior at measured breakpoints and nearby widths.
- Dark mode, when present in the reference.

## Outputs

- Targeted edits in the output directory.
- An optional screenshot under 09-polish/final-screenshots/ only when the browser tool returns an actual file.
- Updated status and progress records.

If a route is unavailable or a value cannot be measured, record the reason and stop. Do not claim a visual estimate is a measured pass.
