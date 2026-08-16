"use strict";

import { getStored, removeStored, setStored } from "./storage.js";
import { createSettingsGroup } from "./settings-groups.js";

const PANEL_DEFAULTS = {
  transcriptPanelBackground: "#1e1e22",
  transcriptPanelTextColor: "#e4e4e7",
  transcriptPanelFont: "Inter, Roboto, Arial, sans-serif",
  transcriptPanelFontSize: 13.5,
  transcriptPanelOpacity: 0.84,
};

export async function initAppearance({ onExtensionStateChange }) {
  const mainView = document.getElementById("main-view");
  const themeToggle = document.getElementById("theme-toggle");
  const powerButton = document.getElementById("extension-power");
  const extensionStatus = document.getElementById("extension-status");
  const panelBackground = document.getElementById("panel-background");
  const panelTextColor = document.getElementById("panel-text-color");
  const panelFont = document.getElementById("panel-font");
  const panelFontSize = document.getElementById("panel-font-size");
  const panelOpacity = document.getElementById("panel-opacity");
  const settingsStatus = document.getElementById("settings-status");
  const rememberPlaybackSpeed = document.getElementById("remember-playback-speed");
  const rememberPanelLayout = document.getElementById("remember-panel-layout");
  let extensionEnabled = true;

  const panelCard = panelBackground.closest("details.card");
  const transcriptSettingsBody = document.getElementById("transcript-enabled").closest(".settings-body");
  const appearanceGroup = createSettingsGroup(
    "Apariencia y disposición",
    "Personaliza el aspecto del panel o recupera su posición y tamaño originales."
  );
  const appearanceRows = [
    panelBackground.closest(".appearance-grid"),
    panelFont.closest("label"),
    panelFontSize.closest(".appearance-grid"),
    document.getElementById("reset-panel-appearance"),
  ];
  const layoutCopy = document.getElementById("reset-panel-layout").previousElementSibling;
  appearanceGroup.append(...appearanceRows, layoutCopy, document.getElementById("reset-panel-layout"), settingsStatus);
  transcriptSettingsBody.appendChild(appearanceGroup);
  panelCard.remove();

  function applyTheme(theme) {
    const light = theme === "light";
    document.body.classList.toggle("popup-light", light);
    themeToggle.textContent = light ? "☾" : "☀";
    themeToggle.title = light ? "Usar tema oscuro" : "Usar tema claro";
    themeToggle.setAttribute("aria-label", themeToggle.title);
  }

  function applyExtensionState(enabled) {
    extensionEnabled = enabled;
    mainView.classList.toggle("extension-off", !enabled);
    [mainView.querySelector(".content > .card:first-child"), mainView.querySelector(".feature-list")]
      .forEach((section) => section?.setAttribute("aria-hidden", String(!enabled)));
    powerButton.setAttribute("aria-pressed", String(enabled));
    powerButton.title = enabled ? "Apagar extensión" : "Encender extensión";
    powerButton.setAttribute("aria-label", powerButton.title);
    extensionStatus.textContent = enabled ? "Control rápido" : "Extensión apagada";
    const controls = ["speed", "speed-slider", "speed-down", "speed-up", "quick-transcript-enabled", "quick-pause-enabled", "quick-shortcuts-enabled"]
      .map((id) => document.getElementById(id));
    controls.push(...document.querySelectorAll(".preset-grid .preset"));
    controls.forEach((control) => { control.disabled = !enabled; });
    onExtensionStateChange(enabled);
  }

  function fillPanelAppearance(stored) {
    panelBackground.value = stored.transcriptPanelBackground;
    panelTextColor.value = stored.transcriptPanelTextColor;
    panelFont.value = stored.transcriptPanelFont;
    panelFontSize.value = stored.transcriptPanelFontSize;
    panelOpacity.value = stored.transcriptPanelOpacity;
  }

  const initial = await getStored({
    popupTheme: "dark",
    extensionEnabled: true,
    rememberPlaybackSpeed: true,
    transcriptRememberLayout: true,
    ...PANEL_DEFAULTS,
  });
  applyTheme(initial.popupTheme);
  applyExtensionState(initial.extensionEnabled);
  fillPanelAppearance(initial);
  rememberPlaybackSpeed.checked = initial.rememberPlaybackSpeed !== false;
  rememberPanelLayout.checked = initial.transcriptRememberLayout !== false;

  themeToggle.addEventListener("click", () => {
    const theme = document.body.classList.contains("popup-light") ? "dark" : "light";
    applyTheme(theme);
    setStored({ popupTheme: theme });
  });
  powerButton.addEventListener("click", () => {
    applyExtensionState(!extensionEnabled);
    setStored({ extensionEnabled });
  });
  panelBackground.addEventListener("input", () => setStored({ transcriptPanelBackground: panelBackground.value }));
  panelTextColor.addEventListener("input", () => setStored({ transcriptPanelTextColor: panelTextColor.value }));
  panelFont.addEventListener("change", () => setStored({ transcriptPanelFont: panelFont.value }));
  panelFontSize.addEventListener("change", () => setStored({ transcriptPanelFontSize: Math.min(22, Math.max(10, Number(panelFontSize.value) || 13.5)) }));
  panelOpacity.addEventListener("input", () => setStored({ transcriptPanelOpacity: Number(panelOpacity.value) }));
  document.getElementById("reset-panel-appearance").addEventListener("click", () => {
    setStored(PANEL_DEFAULTS, () => {
      fillPanelAppearance(PANEL_DEFAULTS);
      settingsStatus.textContent = "Apariencia restaurada.";
    });
  });
  document.getElementById("reset-panel-layout").addEventListener("click", () => {
    removeStored(["transcriptPanelGeometry", "transcriptPanelMinimized", "transcriptHeaderCollapsed"], () => {
      settingsStatus.textContent = "Diseño restablecido. Se aplicará al volver a abrir el panel.";
    });
  });
  rememberPlaybackSpeed.addEventListener("change", () => setStored({ rememberPlaybackSpeed: rememberPlaybackSpeed.checked }));
  rememberPanelLayout.addEventListener("change", () => {
    setStored({ transcriptRememberLayout: rememberPanelLayout.checked });
    if (!rememberPanelLayout.checked) removeStored(["transcriptPanelGeometry", "transcriptHeaderCollapsed"]);
  });

  return { isExtensionEnabled: () => extensionEnabled };
}
