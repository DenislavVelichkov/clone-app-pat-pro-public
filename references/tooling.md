# Tooling & Conventions

The current Codex session runs the workflow and owns its outputs. [The pipeline contract](00-contract.md) is authoritative for artifact names, stage order, and pass/fail criteria.

## 1. Browser capabilities

At the start of the workflow, inspect the tools available in the current Codex session. Map their actual names to these required browser actions:

| Capability | Use |
|---|---|
| Navigate | Open the live reference and the local clone in the same controlled browser when possible |
| Evaluate JavaScript | Read DOM, CSSOM, `getComputedStyle`, layout rectangles, and interaction results |
| Inspect/find elements | Locate controls and confirm revealed UI |
| Interact | Click, focus, hover, and reset controls during the interaction sweep |
| Screenshot | Capture visual references when available; never required for the gate |
| Resize viewport | Match the contract’s desktop, tablet, and mobile dimensions |

If the session lacks JavaScript evaluation or the needed browser interaction, stop and ask the user to configure a compatible Codex browser-control tool. Do not replace DOM measurements with shell scraping or screenshot guesses. For authenticated sites, confirm the target is visible in the configured browser session before capturing data.

Use one controlled tab and perform browser actions sequentially. Do not assume a particular MCP server, browser extension, or tool identifier.

## 2. Evidence and screenshots

Screenshots help identify missing sections and confirm overall composition. Treat them as visual references, not as measured values or a pixel-diff gate. Record a screenshot path only when the browser tool actually saves a file.

The verification ground truth is DOM/CSSOM data and computed styles. For each asserted selector, capture the actual property value with `getComputedStyle`, then compare it with the expected value in `03-design-spec/assertions.json`.

Authoritative evidence order when sources conflict:

1. Authored CSS rules from the CSSOM.
2. Computed values from a deliberately driven state, when the browser supports it.
3. Representative computed-style archetypes from the rendered page.
4. Screenshot-based visual estimates, labeled as estimates.

Never describe an estimate as a measured value. If a value cannot be read, record `null` and the reason.

## 3. QA records

For each QA cycle, keep the captured styles, metrics, and measured bug list under `06-qa/cycle-{N}/`. One current Codex agent owns the cycle, so it can write the cycle’s merged `bugs.json` directly after checking all routes and viewports.

Each bug must cite a measurable mismatch:

```json
{
  "severity": "C",
  "category": "color",
  "element": "Top navigation background",
  "page": "/",
  "viewport": "desktop",
  "selector": ".top-nav",
  "expected": "rgb(255,255,255) (DESIGN.md token --surface)",
  "actual": "rgb(245,245,245) (getComputedStyle)",
  "evidence_method": "assert-styles.mjs failure backed by getComputedStyle",
  "fix_hint": "Apply the --surface token to the top navigation background",
  "file": "app/components/TopNav.tsx"
}
```

Use `getComputedStyle`, `CSSOM`, `forced-state`, or `assert-styles.mjs` as `evidence_method`. Do not use a visual impression as the sole basis for a bug.
