"use strict";

import { getStored, setStored } from "./storage.js";

const NOTES_DEFAULTS = {
  notesAppearanceMode: "shared",
  notesAppearance: {
    background: "#08080a",
    text: "#e4e4e7",
    font: "Inter, Roboto, Arial, sans-serif",
    fontSize: 13.5,
    opacity: 0.54,
  },
  notesWindowAppearance: {
    background: "#08080a",
    text: "#e4e4e7",
    font: "Inter, Roboto, Arial, sans-serif",
    fontSize: 13.5,
    opacity: 0.54,
  },
  noteEditorAppearance: {
    background: "#08080a",
    text: "#e4e4e7",
    font: "Inter, Roboto, Arial, sans-serif",
    fontSize: 13.5,
    opacity: 0.54,
  },
  noteStartOffset: 3,
};

const clampSize = (value) => Math.min(22, Math.max(10, Number(value) || 13.5));
const clampOpacity = (value) => Math.min(1, Math.max(0.35, Number(value) || 0.54));

export async function initNotesSettings() {
  const mode = document.getElementById("notes-appearance-mode");
  const sharedBox = document.getElementById("notes-appearance-shared");
  const separateBox = document.getElementById("notes-appearance-separate");
  const offset = document.getElementById("note-start-offset");
  const fields = {
    shared: {
      background: document.getElementById("notes-shared-bg"),
      text: document.getElementById("notes-shared-text"),
      font: document.getElementById("notes-shared-font"),
      fontSize: document.getElementById("notes-shared-size"),
      opacity: document.getElementById("notes-shared-opacity"),
    },
    window: {
      background: document.getElementById("notes-window-bg"),
      text: document.getElementById("notes-window-text"),
      font: document.getElementById("notes-window-font"),
      fontSize: document.getElementById("notes-window-size"),
      opacity: document.getElementById("notes-window-opacity"),
    },
    editor: {
      background: document.getElementById("notes-editor-bg"),
      text: document.getElementById("notes-editor-text"),
      font: document.getElementById("notes-editor-font"),
      fontSize: document.getElementById("notes-editor-size"),
      opacity: document.getElementById("notes-editor-opacity"),
    },
  };
  const resetButtons = {
    shared: document.getElementById("reset-notes-shared"),
    window: document.getElementById("reset-notes-window"),
    editor: document.getElementById("reset-notes-editor"),
  };

  const stored = await getStored(NOTES_DEFAULTS);
  const values = {
    notesAppearanceMode: stored.notesAppearanceMode === "separate" ? "separate" : "shared",
    notesAppearance: { ...NOTES_DEFAULTS.notesAppearance, ...(stored.notesAppearance || {}) },
    notesWindowAppearance: { ...NOTES_DEFAULTS.notesWindowAppearance, ...(stored.notesWindowAppearance || {}) },
    noteEditorAppearance: { ...NOTES_DEFAULTS.noteEditorAppearance, ...(stored.noteEditorAppearance || {}) },
    noteStartOffset: Math.min(30, Math.max(0, Number(stored.noteStartOffset) || 3)),
  };

  function fillAppearance(group, appearance) {
    fields[group].background.value = appearance.background;
    fields[group].text.value = appearance.text;
    fields[group].font.value = appearance.font;
    fields[group].fontSize.value = String(appearance.fontSize);
    fields[group].opacity.value = String(appearance.opacity);
  }

  function applyMode(selected) {
    const separate = selected === "separate";
    mode.value = separate ? "separate" : "shared";
    sharedBox.hidden = separate;
    separateBox.hidden = !separate;
  }

  applyMode(values.notesAppearanceMode);
  fillAppearance("shared", values.notesAppearance);
  fillAppearance("window", values.notesWindowAppearance);
  fillAppearance("editor", values.noteEditorAppearance);
  offset.value = String(values.noteStartOffset);

  function wireAppearance(group, key) {
    const set = fields[group];
    const save = (patch) => {
      values[key] = { ...values[key], ...patch };
      setStored({ [key]: values[key] });
    };
    set.background.addEventListener("input", () => save({ background: set.background.value }));
    set.text.addEventListener("input", () => save({ text: set.text.value }));
    set.font.addEventListener("change", () => save({ font: set.font.value }));
    set.fontSize.addEventListener("change", () => {
      set.fontSize.value = String(clampSize(set.fontSize.value));
      save({ fontSize: Number(set.fontSize.value) });
    });
    set.opacity.addEventListener("input", () => {
      set.opacity.value = String(clampOpacity(set.opacity.value));
      save({ opacity: Number(set.opacity.value) });
    });
    resetButtons[group].addEventListener("click", () => {
      const defaults = { ...NOTES_DEFAULTS[key] };
      values[key] = defaults;
      setStored({ [key]: defaults });
      fillAppearance(group, defaults);
    });
  }
  wireAppearance("shared", "notesAppearance");
  wireAppearance("window", "notesWindowAppearance");
  wireAppearance("editor", "noteEditorAppearance");

  mode.addEventListener("change", () => {
    values.notesAppearanceMode = mode.value;
    setStored({ notesAppearanceMode: mode.value });
    applyMode(mode.value);
  });

  offset.addEventListener("change", () => {
    const value = Math.min(30, Math.max(0, Number(offset.value) || 0));
    offset.value = String(value);
    values.noteStartOffset = value;
    setStored({ noteStartOffset: value });
  });
}
