---
name: clone-app-pat-pro
description: "Rebuild a website or web app from a live reference by measuring its DOM and CSS, then checking the clone with computed-style assertions. Use for requests to clone, copy, recreate, or replicate a site or UI."
metadata:
  short-description: "Rebuild web apps from live references"
---

# Clone App — Pat Pro

Recreate a web app from a live URL using measured browser evidence, real assets, and a computed-style verification loop.

## Use When

- The user asks to clone, copy, recreate, or replicate a website or web app from a URL.
- The user wants to reproduce a UI with measured styles and interactive states.

## Do Not Use

- The task is only to explain or review a website.
- The user asks for an original design without a reference app.

## Principles

Treat the rendered page and its DOM/CSSOM as evidence. Separate measured values from estimates, and record inaccessible routes or states instead of inventing them. Screenshots can help with visual review, but they do not replace browser measurements.

## Adapt to Scope

Follow the routes, viewports, output location, and behavior the user requests. Within that scope, inspect every reachable view and interaction. Use the existing project's stack and conventions; do not add backend behavior unless the requested scope includes it.

## Outputs

- A working clone in the requested output directory.
- `clone-workspace/{name}/` with recon, extracted styles/assets, design tokens, build notes, QA cycles, and a final report.

## Operating Rules

This is a workflow for the current Codex session. The active Codex agent owns each stage and its files. Work serially with one writer; do not assume background scripts or subagents.

Before recon, inspect the available browser tools. The workflow needs navigation, JavaScript evaluation in the page, DOM inspection, interaction, and viewport resizing. Screenshot capture is optional. Use the actual tool names exposed in this session. If JavaScript evaluation or browser interaction is unavailable, stop before claiming measured results and ask the user to configure a compatible Codex browser-control tool. A screenshot alone cannot satisfy the measurement gate.

Use one browser tab at a time. Keep the user’s authenticated session in the configured browser when the target requires sign-in. Never invent inaccessible pages or values.

Screenshots are visual references. Read DOM/CSSOM and `getComputedStyle` values for evidence. The QA gate compares those values with `03-design-spec/assertions.json`; it does not use screenshots as a pixel-diff gate.

After each stage, report the summary and exact artifact paths, then stop and wait for the user’s approval before starting the next stage. If blocked, record the reason in `status.json` and report it.

## Workflow

Read [the pipeline contract](references/00-contract.md) first, then [tooling and evidence guidance](references/tooling.md). Follow the stage references in order:

1. Recon every reachable route, viewport, and interaction state.
2. Extract computed styles, CSS rules, assets, fonts, layout, and DOM.
3. Write the design system and machine-readable assertions.
4. Plan the component structure and build order.
5. Build the shared foundation, then each route in sequence.
6. Run the computed-style QA cycle; fix measured failures and repeat until it passes, is blocked, stalls, or reaches the cycle limit.
7. Polish only after the gate passes.
8. When requested, add features or agent access using [the extension guide](references/08-extend.md).

Use [the stage briefs](references/stage-prompts.md) alongside each detailed reference. Keep the build compiling after every code stage.

## Verification

Run `scripts/assert-styles.mjs` with the paths and options documented in the contract. A passing cycle has zero failed style assertions and a successful project build. Include a visual review, but report its limits separately from measured assertions.

## Maintenance

When browser tools, Codex skill conventions, or the helper-script interface changes, update this file and the relevant reference together. Keep the skill name stable so existing invocations continue to work.
