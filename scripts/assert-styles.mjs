#!/usr/bin/env node
// assert-styles.mjs — computed-style assertion gate (NO browser; pure comparison).
//
// The QA agent opens the localhost clone with the Claude Chrome extension and reads
// the clone's computed styles via `javascript_tool` (getComputedStyle on each asserted
// selector), then writes them as JSON. THIS script just compares that JSON to the
// design tokens/assertions and writes the verdict. No browser here at all — pure comparison.
//
// Usage:
//   node assert-styles.mjs --assertions <03-design-spec/assertions.json> \
//        --clone-styles <clone-styles.json> --out <metrics.json>
//
//   assertions.json   : [{ "page": "/", "viewport": "desktop", "selector": "...", "prop": "...", "expected": "..." }]
//   clone-styles.json : { "/": { "desktop": { "<selector>": { "<prop>": "<actual computed value>" } } } }
//                       (produced by the agent via javascript_tool getComputedStyle;
//                        page/viewport are optional, so the old flat format still works)
//
// PASS = failed === 0.

import fs from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith("--") ? [...a, [v.slice(2), arr[i + 1]]] : a), [])
);
const assertionsPath = args.assertions;
const clonePath = args["clone-styles"];
const outPath = args.out;
if (!assertionsPath || !clonePath) {
  console.error("usage: assert-styles.mjs --assertions <a.json> --clone-styles <c.json> [--out <metrics.json>]");
  process.exit(2);
}

let assertions = [], clone = {};
try { assertions = JSON.parse(fs.readFileSync(assertionsPath)); } catch (e) { console.error("can't read assertions:", e.message); process.exit(2); }
try { clone = JSON.parse(fs.readFileSync(clonePath)); } catch (e) { console.error("can't read clone-styles:", e.message); process.exit(2); }

const rgb = (r, g, b, a) => (a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`);
const hexToRgb = (_, h) => {
  const [r, g, b, a = 255] = (h.length <= 4 ? h.replace(/./g, "$&$&") : h).match(/../g).map((x) => parseInt(x, 16));
  return rgb(r, g, b, +(a / 255).toFixed(2));
};
// One canonical color form for both sides: hex expanded, separators unspaced, alpha to 2 decimals.
// shortcut: named colors ("white", "transparent") are not converted; DESIGN.md asks for rgb() values.
const norm = (s) =>
  String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase()
    .replace(/\s*,\s*/g, ",").replace(/\(\s+|\s+\)/g, (m) => m.trim())
    .replace(/#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/g, hexToRgb)
    .replace(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/g, (_, r, g, b, a) => rgb(r, g, b, +Number(a).toFixed(2)));
const scalar = (s) => {
  const match = String(s ?? "").trim().match(/^(-?(?:\d+\.?\d*|\.\d+))(px|em|rem|%)?$/i);
  return match ? { value: Number(match[1]), unit: (match[2] || "").toLowerCase() } : null;
};

const failures = [];
let passed = 0;
for (const a of assertions) {
  let scope = clone;
  if (a.page != null) scope = scope?.[a.page] ?? {};
  if (a.viewport != null) scope = scope?.[a.viewport] ?? {};
  const actual = (scope?.[a.selector] || {})[a.prop];
  const exp = a.expected;
  let ok;
  const expectedScalar = scalar(exp), actualScalar = scalar(actual);
  if (expectedScalar && actualScalar && expectedScalar.unit === actualScalar.unit && ["px", "em"].includes(expectedScalar.unit)) {
    const tolerance = expectedScalar.unit === "em" ? 0.01 : 1;
    ok = Math.abs(expectedScalar.value - actualScalar.value) <= tolerance;
  } else {
    ok = norm(exp) === norm(actual);
  }
  if (ok) passed++;
  else {
    const failure = { selector: a.selector, prop: a.prop, expected: exp, actual: actual ?? null };
    if (a.page != null) failure.page = a.page;
    if (a.viewport != null) failure.viewport = a.viewport;
    failures.push(failure);
  }
}

const block = { total: assertions.length, passed, failed: failures.length, failures };

if (outPath) {
  let metrics = {};
  if (fs.existsSync(outPath)) { try { metrics = JSON.parse(fs.readFileSync(outPath)); } catch {} }
  metrics.style_assertions = block;
  fs.writeFileSync(outPath, JSON.stringify(metrics, null, 2));
}
console.log(`style assertions: ${passed}/${assertions.length} passed, ${failures.length} failed`);
process.exit(failures.length === 0 ? 0 : 1);
