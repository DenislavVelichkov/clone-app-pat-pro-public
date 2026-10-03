# clone-app-pat-pro

A Codex skill for rebuilding a website or web app from a live reference URL.

It measures the rendered DOM and CSS instead of guessing from screenshots, downloads real assets and fonts where possible, builds the clone, and checks computed styles against a machine-readable design system.

## Workflow

1. **Recon:** inspect routes, viewports, menus, panels, and other interactive states.
2. **Extraction:** collect computed styles, CSS rules, layout, fonts, assets, and cleaned DOM.
3. **Design system:** derive reusable tokens and selector-level assertions from measured evidence.
4. **Architecture and build:** plan components, build shared foundations, then implement routes in sequence.
5. **QA and polish:** compare the running clone’s computed styles with the assertions, fix failures, and repeat until the gate passes or the run is blocked.

The active Codex session runs each stage in order and pauses for the user to review its artifacts before continuing.

## Browser requirement

The Codex session needs a browser-control tool that can navigate, evaluate JavaScript in the page, inspect the DOM, interact with controls, and resize the viewport. Screenshot capture is optional. Tool names differ by environment, so the skill maps capabilities to the tools actually available in that session. If the required browser actions are unavailable, configure a Codex-compatible browser tool before starting; screenshot-only inspection cannot pass the measured QA gate.

Screenshots are visual aids. The gate uses DOM/CSSOM and `getComputedStyle` values, compared by `scripts/assert-styles.mjs`.

After the plugin is installed or refreshed, invoke it explicitly with:

```text
$clone-app-pat-pro Clone https://example.com and save the app to ./my-clone.
```

For standalone use, place this skill directory under `.agents/skills/clone-app-pat-pro/` in a project or `$CODEX_HOME/skills/clone-app-pat-pro/` for the user.

## Files

| Path | Purpose |
|---|---|
| `SKILL.md` | Routing, operating rules, stage order, and verification gate |
| `references/00-contract.md` | Artifact layout, stage inputs/outputs, and gate definition |
| `references/01-recon.md` … `08-extend.md` | Detailed stage procedures |
| `references/stage-prompts.md` | Compact briefs for the current Codex session |
| `references/tooling.md` | Browser capabilities, evidence rules, and QA record format |
| `scripts/assert-styles.mjs` | Compares captured computed styles against assertions |

The clone is written to the output directory requested by the user. Intermediate artifacts live under `clone-workspace/{name}/`.
