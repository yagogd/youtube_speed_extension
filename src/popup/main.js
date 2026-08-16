// Entry point for the extension popup.
import { initAppearance } from "./appearance.js";
import { createNotesController } from "./notes-controller.js";
import { initNavigation } from "./navigation.js";
import { initPauseSettings } from "./pause-settings.js";
import { initShortcuts } from "./shortcuts.js";
import { initSpeedControls } from "./speed.js";
import { initTranscriptSettings } from "./transcript-settings.js";
import { initNotesSettings } from "./notes-settings.js";
import { initObsidianSettings } from "./obsidian-settings.js";

document.addEventListener("DOMContentLoaded", async () => {
  const i18n = globalThis.YTXI18n;
  const tr = (value) => i18n?.t(value) || value;
  const languageButtons = [...document.querySelectorAll(".language-toggle")];
  const refreshLanguageButtons = () => {
    const isSpanish = (i18n?.getLanguage() || "es") === "es";
    const label = isSpanish ? "Cambiar a inglés" : "Switch to Spanish";
    languageButtons.forEach((button) => {
      button.textContent = isSpanish ? "ES" : "EN";
      button.title = label;
      button.setAttribute("aria-label", label);
    });
  };
  const showNotice = (message) => {
    document.querySelector(".popup-notice")?.remove();
    const overlay = document.createElement("div");
    overlay.className = "popup-notice";
    overlay.setAttribute("role", "alertdialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Aviso");
    const box = document.createElement("div");
    box.className = "popup-notice__box";
    const text = document.createElement("p");
    text.textContent = String(message);
    const accept = document.createElement("button");
    accept.className = "primary";
    accept.textContent = "Aceptar";
    const close = () => overlay.remove();
    accept.addEventListener("click", close);
    overlay.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
    box.append(text, accept);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    accept.focus();
  };

  languageButtons.forEach((button) => button.addEventListener("click", () => {
    i18n?.setLanguage(i18n.getLanguage() === "es" ? "en" : "es");
  }));
  window.addEventListener("ytx:languagechange", () => {
    refreshLanguageButtons();
    i18n?.apply(document);
  });
  i18n?.start({ scope: "popup" });
  refreshLanguageButtons();

  const transcriptEnabled = document.getElementById("transcript-enabled");
  const continuitySettings = document.getElementById("continuity-settings");
  const autoOpenRow = document.getElementById("transcript-auto-open-next").closest(".toggle");
  if (autoOpenRow) continuitySettings.appendChild(autoOpenRow);
  const settingsContent = continuitySettings.closest(".content");
  [
    continuitySettings.closest("details"),
    transcriptEnabled.closest("details"),
    document.getElementById("panel-background").closest("details"),
    document.getElementById("notes-appearance-mode").closest("details"),
    document.getElementById("preset-editor-list").closest("details"),
    document.getElementById("shortcut-list").closest("details"),
  ].forEach((section) => settingsContent.appendChild(section));

  const notesController = createNotesController({ tr });
  initTranscriptSettings();
  initNotesSettings();
  const appearance = await initAppearance({ onExtensionStateChange: () => {} });
  initNavigation({ notesController });
  initSpeedControls({ isExtensionEnabled: appearance.isExtensionEnabled, showNotice, tr });
  initShortcuts({ showNotice, tr });
  initPauseSettings();
  initObsidianSettings();
});
