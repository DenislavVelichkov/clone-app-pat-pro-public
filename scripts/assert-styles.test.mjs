// Fixture test for assert-styles.mjs, driven through its CLI.
// Run: node --test scripts/assert-styles.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "assert-styles.mjs");

function run(assertions, cloneStyles) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "assert-styles-"));
  const a = path.join(dir, "assertions.json");
  const c = path.join(dir, "clone-styles.json");
  const out = path.join(dir, "metrics.json");
  fs.writeFileSync(a, JSON.stringify(assertions));
  fs.writeFileSync(c, JSON.stringify(cloneStyles));
  const res = spawnSync(process.execPath, [script, "--assertions", a, "--clone-styles", c, "--out", out], { cwd: dir });
  return { status: res.status, block: JSON.parse(fs.readFileSync(out)).style_assertions };
}

test("unit mismatch fails", () => {
  const r = run(
    [
      { selector: ".a", prop: "width", expected: "16px" },
      { selector: ".a", prop: "border", expected: "1px solid red" },
    ],
    { ".a": { width: "16%", border: "1px dashed blue" } },
  );
  assert.equal(r.status, 1);
  assert.equal(r.block.failed, 2);
});

test("matching units pass within tolerance", () => {
  const r = run(
    [
      { selector: ".a", prop: "fontSize", expected: "16px" },
      { selector: ".a", prop: "letterSpacing", expected: "0.5em" },
    ],
    { ".a": { fontSize: "16.5px", letterSpacing: "0.505em" } },
  );
  assert.equal(r.status, 0);
  assert.equal(r.block.passed, 2);
});

test("page and viewport values stay separate", () => {
  const clone = {
    "/": {
      desktop: { h1: { fontSize: "48px" } },
      mobile: { h1: { fontSize: "32px" } },
    },
  };
  const ok = run(
    [
      { page: "/", viewport: "desktop", selector: "h1", prop: "fontSize", expected: "48px" },
      { page: "/", viewport: "mobile", selector: "h1", prop: "fontSize", expected: "32px" },
    ],
    clone,
  );
  assert.equal(ok.status, 0);
  assert.equal(ok.block.passed, 2);

  const bad = run([{ page: "/", viewport: "mobile", selector: "h1", prop: "fontSize", expected: "48px" }], clone);
  assert.equal(bad.status, 1);
  assert.deepEqual(bad.block.failures, [
    { selector: "h1", prop: "fontSize", expected: "48px", actual: "32px", page: "/", viewport: "mobile" },
  ]);
});

test("old flat format passes", () => {
  const r = run(
    [{ selector: "button", prop: "backgroundColor", expected: "rgb(0, 0, 0)" }],
    { button: { backgroundColor: "rgb(0,  0, 0)" } },
  );
  assert.equal(r.status, 0);
  assert.equal(r.block.passed, 1);
});
