const test = require("node:test");
const assert = require("node:assert/strict");

test("normaliza, ordena y elimina presets duplicados sin cambiar sus límites", async () => {
  const { normalizeSpeedPresets } = await import("../src/popup/speed-presets.js");
  assert.deepEqual(normalizeSpeedPresets([2, "1.5", 2, 0.05, 17, "no"]), [1.5, 2]);
});

test("normaliza el retroceso a pasos de medio segundo", async () => {
  const { normalizePauseSeconds } = await import("../src/popup/pause-settings.js");
  assert.equal(normalizePauseSeconds(2.26), 2.5);
  assert.equal(normalizePauseSeconds(0), 2);
});

test("compara atajos usando la firma persistida completa", async () => {
  const { shortcutsMatch } = await import("../src/popup/shortcut-utils.js");
  const shortcut = { code: "KeyP", ctrl: false, alt: false, shift: true, meta: false, label: "Shift + P" };
  assert.equal(shortcutsMatch(shortcut, { ...shortcut }), true);
  assert.equal(shortcutsMatch(shortcut, { ...shortcut, label: "P" }), false);
});
