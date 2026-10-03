# Stage Briefs

Use these briefs as checklists in the current Codex session. Work serially, use the actual tools available in that session, and pause for user review after each stage. Detailed instructions are in the matching reference file.

## Stage 1: Recon

```text
ROLE: Inspect the live reference site, one route and viewport at a time.

INPUTS: target URL, PAGE={PAGE}, VIEWPORT={VIEWPORT}.

TASK:
1. Open the route in the configured browser and set the requested viewport. Wait for the page to hydrate.
2. If it is blank, redirects to login, or is blocked, record the reason in status.json and stop.
3. Read the DOM, detect same-origin routes, themes, framework signals, and measured breakpoints.
4. Exercise every reachable interactive element: links, buttons, tabs, menus, filters, panels, inputs, and contenteditable elements. Record revealed UI and unreachable states in interaction-map.json.
5. Save screenshots only when the browser tool returns an actual file. They are visual references, not gate inputs.

OUTPUTS: interaction-map.json, route fragments, recon.json, and optional screenshots.
COMPLETION: update status.json, report artifacts and blockers, then wait for user approval.
```

## Stage 2: Extraction

```text
ROLE: Extract measured styles, DOM, layout, assets, and interaction-revealed UI, one route at a time.

INPUTS: target URL, PAGE={PAGE}, sitemap.json, recon.json.

TASK: Follow references/02-extraction.md. Capture computed styles, pseudo-elements, authored state rules or driven interaction-state styles, CSS variables, CSSOM, fonts, downloaded assets, layout, breakpoints, and cleaned DOM. Replay each reachable interaction from interaction-map.json and capture its revealed DOM and computed styles. Use Bash curl only for allowed asset/font downloads and cross-origin CSS refetches.

OUTPUTS: the route fragments and shared extraction files defined in contract §1.
COMPLETION: update status.json, report artifacts and blockers, then wait for user approval.
```

## Stage 3: Design Spec

```text
ROLE: Derive the measured design system and assertion list.

INPUTS: all of 02-extraction/.

TASK: Write DESIGN.md using the evidence and token guidance in references/03-design-spec.md. Create assertions.json with one object per measured selector/property/route/viewport: page, viewport, selector, prop, expected.

OUTPUTS: 03-design-spec/DESIGN.md and 03-design-spec/assertions.json.
COMPLETION: update status.json, report artifacts and blockers, then wait for user approval.
```

## Stage 4: Architecture

```text
ROLE: Plan the component tree and file structure from measured DOM and styles.

INPUTS: DESIGN.md, recon.json, extraction fragments and assets.

TASK: Follow references/04-architecture.md. Identify shared and route-specific components, cite evidence, and list files in build order. Build shared foundations before route pages.

OUTPUTS: 04-architecture/file-tree.md and 04-architecture/component-map.md.
COMPLETION: update status.json, report artifacts and blockers, then wait for user approval.
```

## Stage 5a: Build Foundation

```text
ROLE: Build the project scaffold and shared foundation; own global tokens.

INPUTS: DESIGN.md, architecture files, downloaded assets and fonts.

TASK: Follow references/05-build.md. Implement global tokens, layout shell, navigation, footer, and shared components. Use downloaded assets and self-hosted fonts. Run the project build.

OUTPUTS: scaffold, shared code, and 05-build/build-log.md.
COMPLETION: update status.json, report changed files and build result, then wait for user approval.
```

## Stage 5b: Build Page

```text
ROLE: Implement one route at a time, consuming the shared foundation.

INPUTS: PAGE={PAGE}, foundation, DESIGN.md, that route's extraction fragments and assets.

TASK: Follow references/05-build.md. Match measured spacing, styles, assets, pseudo-elements, states, and breakpoints. Do not redefine shared tokens. Keep the project build green.

OUTPUTS: route code in OUTPUT_DIR and updated build-log.md.
COMPLETION: update status.json, report changed files and build result, then wait for user approval.
```

## Stage 6: QA

```text
ROLE: Measure the clone for every route and viewport, then report style and interaction coverage.

INPUTS: running clone, sitemap.json, configured viewports, DESIGN.md, assertions.json, interaction-map.json.

TASK:
1. Read each asserted property with getComputedStyle and save clone-styles.json nested by route, viewport, selector, and property.
2. Optionally save screenshots when the browser tool returns actual files.
3. Run scripts/assert-styles.mjs and the project build.
4. Replay reachable interactions from interaction-map.json on the clone. Record missing or broken states in bugs.json or progress.md; report this manual review separately from the style assertion result.

OUTPUTS: clone-styles.json, metrics.json, bugs.json, and updated progress/status records under 06-qa/cycle-{CYCLE}/.
COMPLETION: report assertion count, build result, interaction review, and artifacts; wait for user approval before fixes or another cycle.
```

## Stage 7: Fix

```text
ROLE: Fix one measured QA issue at a time.

INPUTS: CYCLE={CYCLE}, bugs.json, metrics.json, DESIGN.md.

TASK: Select one issue, make a targeted edit, remeasure the same route and viewport, rerun the assertion script, and build the project. Keep the change only if it improves the measured result without regression.

OUTPUTS: targeted edits in OUTPUT_DIR and updated QA/progress records.
COMPLETION: report changed files and measurements, then wait for user approval before the next cycle.
```

## Stage 9: Polish

```text
ROLE: Tighten measured details after the gate passes.

INPUTS: latest metrics, DESIGN.md, relevant recon and extraction artifacts, running clone.

TASK: Follow references/07-polish.md. Review computed styles at requested routes and viewports; screenshots are optional visual references. Fix only differences supported by measured evidence.

OUTPUTS: targeted edits and updated status/progress records; optional screenshot files.
COMPLETION: report measurements and build result, then wait for user approval.
```

## Stage 10: Feature

```text
ROLE: Add one feature the user requested to the converged clone.

INPUTS: feature request, existing clone, shared components, DESIGN.md.

TASK: Follow Part A of references/08-extend.md. Reuse existing components and tokens, wire the feature into the app, verify its interactions, and keep the build green.

OUTPUTS: feature code, feature notes, QA evidence, and updated build-log.md.
COMPLETION: report the result and wait for the user to request another feature or stop.
```

## Stage 11: Agent Access

```text
ROLE: Add API and MCP access when requested.

INPUTS: converged clone, its data shapes, detected stack, and any feature work.

TASK: Follow Part B of references/08-extend.md. Infer entities from the actual UI/data, implement authenticated API routes and an MCP server, and record smoke-test results.

OUTPUTS: API and MCP code, entity/API/tool maps, smoke-test records, and updated build-log.md.
COMPLETION: report artifacts, build result, and scope limits; then wait for user approval.
```
