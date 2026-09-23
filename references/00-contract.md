# Clone Pipeline Contract — single source of truth

The current Codex session runs this workflow and owns its outputs. This contract defines the workspace layout, stage inputs and outputs, the computed-style assertion gate, and the convergence process. If a stage reference disagrees with this file, this contract wins.

Browser-control tools come from the active Codex environment and are selected at runtime. See `tooling.md` for the required capabilities. Work with one writer and one browser tab at a time; complete routes and file edits sequentially. Do not assume vendor-specific browser tool IDs, a background orchestrator, or parallel subagents.

The mission: **own the target — pixel for pixel.** Extract every value that exists in the live page (read off the DOM/CSSOM, not a screenshot guess), rebuild it, and prove the match with **measured computed-style assertions**, not an opinion. Leave no stone unturned.

Use the configured browser-control tool for every browser action:

| Need | Browser capability |
|---|---|
| open a route | navigation |
| read computed styles / CSSOM / run JS (the verification ground truth) | JavaScript evaluation |
| read DOM / find elements | DOM inspection / element lookup |
| click / hover / focus and capture visual references | interaction / screenshot |
| set viewport | viewport resize |

Asset/font byte downloads and cross-origin sheet refetch use **Bash `curl`** (not browser-specific). The objective ground truth is **computed styles read through JavaScript evaluation**, never a screenshot.

## 1. Workspace layout (exact paths)

All artifacts live under clone-workspace/{name}/. Keep filenames fixed so the current Codex session can resume the workflow consistently.

```
clone-workspace/{name}/
├── 00-config.json                 # target_url, viewports, pages[], stack, gate thresholds
├── status.json                    # per-stage manifest (resume); see §6
├── progress.md                    # human log
├── 01-recon/
│   ├── sitemap.json               # { "routes": ["/", "/pricing", ...] }
│   ├── screenshots/                # optional visual-reference shots when files are available
│   │   ├── {page}--{viewport}.png        # visual-reference of each view
│   │   ├── hover-states/{page}--{el}.png
│   │   └── interaction-states/{page}--{action-slug}.png  # state revealed by an interaction (§8)
│   ├── interaction-map.json       # EVERY interactive element/panel/menu/filter exercised (§8)
│   └── recon.json                 # themes:["light","dark"], measured breakpoints, framework fingerprint
├── 02-extraction/
│   ├── fragments/                 # one set per route; merge shared files after each route
│   │   ├── {page}.computed.json    # deduped computed-style archetypes (§3-A)
│   │   ├── {page}.pseudo.json      # pseudo-element styles
│   │   ├── {page}.states.json      # :hover/:focus/:active style deltas
│   │   ├── {page}.interactions.json # DOM+styles of interaction-REVEALED UI (toolbar, menu, composer, panel) (§8)
│   │   ├── {page}.layout.json      # flex/grid, z-index/stacking, @media + @container breakpoints, rects
│   │   └── {page}.dom.html         # cleaned outerHTML
│   ├── css-variables.json          # all theme scopes (:root, [data-theme], .dark, prefers-color-scheme)
│   ├── all-styles.json             # full CSSOM rule dump incl. cross-origin REFETCHED sheets
│   ├── fonts.json                  # @font-face + document.fonts loaded set + variable-font fvar axes
│   ├── STATES-MANIFEST.md          # punch-list: every view/state × {screenshot ✓, code extracted ✓} (§8)
│   ├── assets.json                 # manifest of DOWNLOADED bytes (hash, ext, intrinsic dims, srcset)
│   └── assets/                     # the actual downloaded files
│       ├── img/  svg/  fonts/
├── 03-design-spec/
│   ├── DESIGN.md           # the authoritative token system (§3-D). Single author.
│   └── assertions.json     # machine-checkable assertions scoped by route and viewport — gate input (§5)
├── 04-architecture/
│   ├── file-tree.md
│   └── component-map.md
├── 05-build/                       # build notes/logs (code is written to OUTPUT_DIR)
├── 06-qa/
│   └── cycle-{N}/
│       ├── screenshots/{page}--{viewport}.png      # optional clone visual-reference shots
│       ├── clone-styles.json                       # clone's computed styles, scoped by route and viewport (§5)
│       ├── metrics.json                            # the GATE input: style_assertions result (§5)
│       └── bugs.json                               # measured failures for this cycle
└── 09-polish/
    └── final-screenshots/{page}--{viewport}.png
```

**Page slug rule:** route `/` → `home`; `/pricing` → `pricing`; `/blog/post` → `blog-post` (lowercase, non-alphanumerics → `-`, trim). **Viewport keys:** `desktop` (1920×1080), `tablet` (768×1024), `mobile` (375×667). Every per-page/per-viewport artifact uses `{page}--{viewport}` so the recon reference and the QA clone capture line up 1:1 for the side-by-side eyeball.

---

## 2. Stages and order

Run one stage at a time in the current Codex session. Within a stage, visit routes and viewports sequentially and keep one writer for each shared artifact.

| # | Stage | Order within stage | Reads | Writes |
|---|-------|--------------------|-------|--------|
| 1 | Recon | route × viewport | target URL | `01-recon/`, route list, interaction map |
| 2 | Extraction | one route at a time | route list and recon data | `02-extraction/fragments/*`, then merge shared files |
| 3 | Design Spec | one author | all `02-extraction/*` | `DESIGN.md`, `assertions.json` |
| 4 | Architecture | one author | `DESIGN.md`, `recon.json` | `file-tree.md`, `component-map.md` |
| 5a | Build foundation | before route code | spec, architecture | tokens/globals, layout, nav, shared components in OUTPUT_DIR |
| 5b | Build pages | one route at a time | foundation, spec, route fragments | route code in OUTPUT_DIR |
| 6 | QA | all routes × viewports, sequentially | running clone, DESIGN.md, assertions.json | scoped clone-styles.json, metrics.json, bugs.json, optional screenshots |
| 7 | Fix | one measured issue at a time | `bugs.json`, `metrics.json` | targeted edits in OUTPUT_DIR |
| 8 | Convergence | after each QA/fix pair | assertion and build results | next cycle or final report |
| 9 | Polish | after the gate passes | final metrics | OUTPUT_DIR and optional `09-polish/` references |

The sequence is Recon → Extraction → Design Spec → Architecture → Build foundation → Build pages → [QA → Fix] until terminal → Polish. Merge route lists and extraction data as each route finishes; never overwrite earlier route data with a partial capture.

## 3. Extraction completeness — leave no stone unturned

Capture from the LIVE page through `JavaScript evaluation capability` (run the extraction JS in the page; for large scripts, write the JS to a file and pass its contents to `JavaScript evaluation capability`). The cap of "50 elements / 17 properties" is **deleted**. Authoritative order when sources conflict: **CSSOM authored rules > driven interaction-state styles > deduped computed archetypes > screenshot estimate.**

**A. Computed styles — ALL meaningful nodes, deduped by signature.** Walk `document.querySelectorAll('*')` minus `script/style/meta/link/head` and zero-area nodes. For each, read the full property set below; build a signature hash; emit ONE representative per unique signature with a `count` + sample selector + `getBoundingClientRect()` (pixel ground truth). Drop any property equal to its CSS initial value (delta-from-default). Property set (minimum):
- **Color/bg:** color, backgroundColor, **backgroundImage** (gradients live here — mandatory), backgroundSize, backgroundPosition, backgroundRepeat, backgroundClip, backgroundBlendMode, opacity, mixBlendMode, accentColor, caretColor, `-webkit-background-clip`/`-webkit-text-fill-color` (gradient text)
- **Typography:** fontFamily, fontSize, fontWeight, fontStyle, fontStretch, lineHeight, letterSpacing, wordSpacing, textTransform, textDecoration{Line,Color,Style,Thickness}, textShadow, textAlign, whiteSpace, textOverflow, **fontVariationSettings**, fontOpticalSizing, fontFeatureSettings, textUnderlineOffset
- **Box model (per-side, not shorthand):** paddingTop/Right/Bottom/Left, marginT/R/B/L, border{T/R/B/L}{Width,Style,Color}, borderT/B-L/R-Radius (asymmetric), boxSizing, width/height, min/max-W/H, aspectRatio, inset/top/right/bottom/left, outline{Width,Style,Color,Offset}
- **Effects:** boxShadow, textShadow, filter, **backdropFilter** (glassmorphism), clipPath, maskImage/`-webkit-mask-image`, isolation
- **Layout:** display, flexDirection, flexWrap, justifyContent, alignItems, alignContent, alignSelf, flexGrow/Shrink/Basis, order, gridTemplateColumns/Rows/Areas, gridAutoFlow/Columns/Rows, justifyItems, placeItems, gridColumn/Row, rowGap, columnGap, overflowX/Y, overscrollBehavior, scrollSnapType, scrollBehavior, containerType, containerName
- **Layering/motion:** zIndex, position, transform, transformOrigin, perspective, willChange, transitionProperty/Duration/TimingFunction/Delay, animationName/Duration/TimingFunction/IterationCount/Direction/FillMode
- **Cursor:** cursor (every interactive element)

**B. Pseudo-elements** → `{page}.pseudo.json`: `getComputedStyle(el,'::before')` and `::after` (emit where `content!=='none'`), plus `::placeholder ::marker ::selection ::first-letter ::first-line ::backdrop`. Capture content, background/backgroundImage, geometry, transform, mask, clipPath, color, font.

**C. Interaction states** → `{page}.states.json`: drive `:hover :focus :focus-visible :active` via the extension's interaction capability (hover/focus the element) then re-read computed styles via `JavaScript evaluation capability`; emit **deltas only**. Primary fallback (most reliable here): parse the authored `:hover/:focus/:active` rules straight from the CSSOM (`JavaScript evaluation capability` walking `cssRules`).

**D. CSS variables / themes** → `css-variables.json`: every rule whose selector matches `:root, html, [data-theme], .dark, .light`, plus `@media (prefers-color-scheme)` groups; resolve the var union under each theme by toggling and re-reading `getPropertyValue`. Shape: `{ "themes": { "light": {...}, "dark": {...} } }`.

**E. CSSOM full dump** → `all-styles.json`: iterate every sheet's `cssRules` (style + `@media`/`@container`/`@font-face`/`@keyframes`/`@supports`). **When `cssRules` throws (cross-origin), refetch the sheet over HTTP with Bash `curl sheet.href` and parse the text** — do not stub with `/* cross-origin */`.

**F. Fonts** → `fonts.json` + `assets/fonts/`: `@font-face` rules + `Array.from(document.fonts)` filtered to `status==='loaded'`; resolve each `src url()` to absolute and **download the woff2/woff/ttf bytes with Bash `curl`**; record variable-font `fvar` axes (e.g. `wght 100..900`).

**G. Assets** → `assets.json` + `assets/{img,svg}/`: resolve every `img.currentSrc` (+`srcset`/`sizes`), CSS `url()` backgrounds, `<link rel=icon>`, OG images; **download the bytes with Bash `curl -sL`**. Inline SVG: emit FULL `outerHTML` (no 500-char truncation, no 20-element cap); for `<use href="#...">` fetch the sprite. Record intrinsic `naturalWidth/Height`. The build NEVER uses picsum/pravatar placeholders unless a download genuinely failed (log it).

**H. Layout/breakpoints** → `{page}.layout.json`: real `@media`/`@container` `conditionText` (actual breakpoints, not the 768/375 guess), stacking-context map (every positioned/transformed/opacity<1/filtered node + zIndex), and the per-archetype `getBoundingClientRect`.

**I. Framework fingerprint** → in `recon.json`: `__NEXT_DATA__`/`self.__next_f`, `__remixContext`, `__NUXT__`, `data-reactroot`/React hook, `ng-version`, `data-v-*`, `data-astro-*`; Tailwind via `--tw-*` props / utility-class density; asset hosts (`_next/static`, Vite `/assets/index-*`); `<meta name=generator>`.

---

## 4. Design system (Stage 3, single author)

Read all `02-extraction/*`. Produce `DESIGN.md` — a **portable, drop-in design file** in the widely-used `design.md` best-practice structure (à la `github.com/VoltAgent/awesome-design-md`), written so it can be referenced to build new pages, customize the app, or be dropped into a different project, not just consumed internally by this pipeline. Also emit `03-design-spec/assertions.json` — the machine-checkable form of these tokens (route/viewport-scoped computed-property assertions) that the gate compares against (§5). DESIGN.md is still the **single author** of tokens (Stage 5 wires them) and still the **gate's reference** (§5 asserts against `assertions.json` derived from it). It is a **token system inferred by usage frequency + confidence** (most-used value for a role = the token), not a flat per-element dump.

Structure: it **opens** with a **Visual Theme** paragraph (the overall feel/atmosphere — mood, density, contrast, accent discipline, corner/shadow softness, motion energy), then the rigorous token sections — Colors (incl. a **Gradients** table: type, angle/shape, stops), Typography (incl. variable-font axes), Spacing scale, Border-radius scale, Shadows (layered/inset), **Effects/backdrop-filter**, Motion (durations/easings/keyframes), States (hover/focus/active), Layout/breakpoints (measured), Assets (downloaded paths), Theme tokens (light/dark) — and **closes** with **Design Guardrails** (do's-and-don'ts that reproduce the *feel*) and an **Agent Prompt Guide** (how a coding agent uses this file alone to build in the design language). Boost confidence for values seen on multiple pages. The file must be self-contained: a reader with only DESIGN.md (in another repo or a fresh session) can reproduce the look; artifact citations stay in each row's `Evidence` column to prove values are measured, not invented.

---

## 5. The computed-style-assertion GATE (objective, machine-computed)

Verification is measured, never eyeballed — the measurement is **computed styles, not a screenshot comparison**. For each QA cycle:

1. The current Codex agent opens the running clone in the configured browser and reads each asserted selector's computed styles (`getComputedStyle`) → writes `06-qa/cycle-N/clone-styles.json`.
2. Run, via Bash:
   ```bash
   node scripts/assert-styles.mjs \
     --assertions 03-design-spec/assertions.json \
     --clone-styles 06-qa/cycle-N/clone-styles.json \
     --out 06-qa/cycle-N/metrics.json
   ```
   The script compares captured values with `assertions.json`, writes a `style_assertions` object to `metrics.json`, and exits nonzero when assertions fail. It compares the asserted properties directly; numeric values use the tolerances implemented by the script.
3. Run `npm run build` from OUTPUT_DIR and record its exit status in `progress.md`.

A passing cycle requires `style_assertions.failed == 0` and a successful build. Also review screenshots when available as a human sanity check; screenshots are not gate inputs.

## 6. Convergence loop + escalation

Run no more than ten QA cycles. Follow the check-in gate in §9 after each stage and wait for the user before continuing.

```text
start the dev server and wait for localhost to respond
cycle = 0; previous_failures = infinity; stall = 0; max_cycles = 10
repeat:
  cycle += 1
  QA all routes and viewports sequentially
  run assert-styles.mjs and npm run build
  if assertions pass and build succeeds: terminal = CONVERGED-PASS
  else:
    if failure count did not improve: stall += 1; otherwise stall = 0
    if stall >= 2: terminal = STUCK
    if cycle == max_cycles: terminal = CEILING
    otherwise run the Fix stage after user approval
until terminal
```

After each QA or Fix stage, report the captured results and exact paths, then wait for user approval. Stop early on an auth wall, login redirect, or build failure that cannot be resolved safely.

**Terminal states:** `CONVERGED-PASS` (gate met) · `STUCK` (no progress across two cycles) · `HARD-BLOCKER` (auth wall / login redirect / unresolved build failure) · `CEILING` (ten cycles). Record the terminal state, failing assertions, and next steps in `final-report.md` or `escalation.md`; report it to the user.

## 7. Stage brief standard

The current Codex agent owns the whole workflow. For each stage, use its reference and stage brief to identify, in order:

1. **ROLE** — the stage’s goal and what it does not own.
2. **INPUTS** — exact artifact paths to read.
3. **TASK** — ordered steps; map browser operations to available Codex tools using `tooling.md`.
4. **OUTPUTS** — exact artifact paths to write.
5. **EVIDENCE** — every visual claim must cite a measured value. Follow §3’s source order.
6. **HONESTY** — never invent values; record `null` and a reason when something cannot be measured.
7. **COMPLETION** — update the stage status, report the summary and artifact paths, and wait for user approval before starting the next stage.

## 8. Exhaustive interaction coverage — click EVERYTHING

A web app is not a stack of static pages. The controls that matter most — a rich-text toolbar that appears when you focus the editor, the comment composer, an opened menu, a side panel, a filter, a Kanban/board view toggle — **only exist after an interaction.** A clone built from first-paint screenshots silently ships skin-deep. So recon does not sample; it **exercises every interactive element on every route.**

After each action, capture a screenshot when the browser tool can save one, and record the interaction in interaction-map.json:

Only include the screenshot field when a screenshot file was actually saved; otherwise omit it or use null.

```json
{ "route": "/issue/PER-9",
  "interactions": [
    {"action_slug":"focus-description","trigger":".description","kind":"focus",
     "reveals":["rich-text toolbar (Aa,B,I,link,quote,code)"],"captured":true},
    {"action_slug":"open-priority-menu","trigger":"[data-priority]","kind":"click",
     "reveals":["priority dropdown: Urgent/High/Medium/Low/None"],"captured":true},
    {"action_slug":"comment-composer","trigger":".comment-box","kind":"focus","reveals":["composer + send"],"captured":true}
  ],
  "unreached": [] }
```

Check whether each reachable interaction appears and behaves in the clone; log missing or unreachable states in the QA report. This is a manual review reported separately from the computed-style gate. The rule is literal:

**Interaction-state extraction (Stage 2).** For each entry in `interaction-map.json`, trigger the interaction, then snapshot the **revealed DOM + computed styles** (the toolbar, the open menu, the composer, the side panel) into `{page}.interactions.json`. Note: this is a real DOM mutation, not a CSS pseudo-state — forcing `:hover` (§3-C) is not enough; you must perform the interaction and capture what newly appears.

**Build (Stage 5)** reproduces these interaction-revealed components and wires their client-side behavior (focus → show toolbar, click → open menu, composer renders).

**Interaction coverage review (Stage 6).** For each reachable interaction, exercise the equivalent UI in the clone and record whether it appears and behaves as expected. Log omissions in the QA report. This manual review is reported separately from the computed-style assertion gate.

**Scope levels (state explicitly in `00-config.json` → `scope`).** (a) **visual** — looks like it; (b) **interactive** — the interaction-revealed UI appears and behaves client-side (default for this skill); (c) **functional** — it actually works end-to-end (data persists, comments post). Level (c) is real app logic + a backend — that's building the app, not cloning it. The skill must not present a level-(a/b) clone as a working product.

**States Manifest (the punch-list).** Maintain `02-extraction/STATES-MANIFEST.md` — a table with one row per view/state discovered in `01-recon/interaction-map.json` and two checkboxes per row: **screenshot available** and **code/values extracted**. Recon marks screenshot availability; extraction fills the code column, working the list top to bottom. Screenshots are optional, so an unchecked screenshot box is informational; an unchecked code box means interaction evidence is incomplete.

## 9. Check-in gate — MANDATORY, after every stage (hard stop)

This skill runs in a live conversation, so the per-stage check-in is **always on and is a hard stop** — not an optional flag. After each stage the agent **stops, reports what it produced (summary + exact artifact paths / captured views), and WAITS** for the user before doing anything else. See the Operating Rules in SKILL.md.

At each pause the user can **approve & continue**, **revise** (add instructions and re-run that stage — e.g. tell recon "also click the filters and every side panel," and it runs another round that *augments* its prior pass, then checks in again), or **stop**.

**Running the next stage — or calling any tool — before the user replies is a failure.** The check-in is the whole human-in-the-loop point: review recon before extraction, review the design system before the build, review the build before QA. One stage → stop → wait, every time.

## 10. Post-clone extension — customize + agent access

After the clone passes the gate, offer the optional extension workflow and ask whether the user wants to add a feature or agent access. Each requested feature is built into the clone using DESIGN.md. The extension guide describes optional feature work and an API/MCP layer for connecting compatible clients.

## 11. Screenshots are a VISUAL REFERENCE only — the gate does NOT depend on them

The objective ground truth is **computed styles read through the configured browser tool** (§5). Screenshots are visual references for the user and Codex to review, not measured gate inputs. Capture a screenshot when the browser tool supports it; save it under the documented path only when the tool actually provides a file.

A missing screenshot file is not a failure. The gate is driven by `style_assertions.failed`, not by an image comparison.

**Every view is exhaustive, not a sample (recon, §8).** Reach every sidebar item, tab, filter, layout toggle, menu, side panel, detail, modal, interaction-revealed state, and requested viewport. For each, read computed styles through the browser’s JavaScript evaluator and log it in `interaction-map.json`. One view captured is incomplete recon; continue until each reachable view has been examined.
