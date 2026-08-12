"use strict";

const MODIFIER_CODES = new Set([
  "ControlLeft", "ControlRight", "AltLeft", "AltRight",
  "ShiftLeft", "ShiftRight", "MetaLeft", "MetaRight",
]);

export function isModifierCode(code) {
  return MODIFIER_CODES.has(code);
}

export function shortcutFromKeyboardEvent(event) {
  const parts = [];
  if (event.ctrlKey && !event.code.startsWith("Control")) parts.push("Ctrl");
  if (event.altKey && !event.code.startsWith("Alt")) parts.push("Alt");
  if (event.shiftKey && !event.code.startsWith("Shift")) parts.push("Shift");
  if (event.metaKey && !event.code.startsWith("Meta")) parts.push("Meta");
  const keyLabel = isModifierCode(event.code)
    ? event.code.replace(/Left|Right/, "").replace("Control", "Ctrl").replace("Meta", "Windows")
    : (event.key.length === 1 ? event.key.toUpperCase() : event.key);
  parts.push(keyLabel);
  return {
    code: event.code,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
    label: parts.join(" + "),
  };
}

export function shortcutsMatch(left, right) {
  return left.code === right.code &&
    Boolean(left.ctrl) === Boolean(right.ctrl) &&
    Boolean(left.alt) === Boolean(right.alt) &&
    Boolean(left.shift) === Boolean(right.shift) &&
    Boolean(left.meta) === Boolean(right.meta) &&
    left.label === right.label;
}
