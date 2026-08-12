"use strict";
import { normalizePauseSeconds } from "./pause-settings.js";
import { createPauseShortcutsController } from "./pause-shortcuts.js";
import { createSpeedShortcutsController } from "./speed-shortcuts.js";
import { isModifierCode, shortcutFromKeyboardEvent, shortcutsMatch } from "./shortcut-utils.js";

export function initShortcuts({ showNotice, tr }) {
  const shortcutSettingsToggle = document.getElementById("shortcut-settings-toggle");
  const shortcutSettings = document.getElementById("shortcut-settings");
  const shortcutKeyButton = document.getElementById("shortcut-key");
  const shortcutSpeed = document.getElementById("shortcut-speed");
  const shortcutBehavior = document.getElementById("shortcut-behavior");
  const shortcutAdd = document.getElementById("shortcut-add");
  const shortcutList = document.getElementById("shortcut-list");
  const speedShortcutsEnabled = document.getElementById("speed-shortcuts-enabled");
  const quickShortcutsEnabled = document.getElementById("quick-shortcuts-enabled");
  const pauseShortcutsEnabled = document.getElementById("pause-shortcuts-enabled");
  const pauseShortcutSeconds = document.getElementById("pause-shortcut-seconds");
  const pauseShortcutMode = document.getElementById("pause-shortcut-mode");
  const pauseShortcutList = document.getElementById("pause-shortcut-list");
  const quickPauseShortcutsEnabled = document.getElementById("quick-pause-shortcuts-enabled");
  let capturedShortcut = null;
  let pendingModifier = null;

  const shortcutDetails = shortcutList.closest("details");
  const shortcutSectionTitle = shortcutDetails?.querySelector(".section-title strong");
  const shortcutSectionCopy = shortcutDetails?.querySelector(".section-title span");
  if (shortcutSectionTitle) shortcutSectionTitle.textContent = "Atajos de teclado";
  if (shortcutSectionCopy) shortcutSectionCopy.textContent = "Velocidad, pausa y retroceso";
  shortcutList.after(pauseShortcutList);

  const shortcutCreateRow = shortcutKeyButton.closest(".shortcut-create-row");
  shortcutCreateRow.classList.add("unified-shortcut-row");
  const shortcutType = document.createElement("select");
  shortcutType.id = "shortcut-type";
  shortcutType.setAttribute("aria-label", "Tipo de atajo");
  shortcutType.innerHTML = '<option value="speed">Velocidad</option><option value="pause">Pausa</option><option value="pause-rewind">Pausa + retroceso</option>';
  shortcutCreateRow.insertBefore(shortcutType, shortcutSpeed);
  pauseShortcutSeconds.classList.add("shortcut-extra");
  pauseShortcutSeconds.setAttribute("aria-label", "Segundos de retroceso");
  pauseShortcutMode.classList.add("shortcut-extra");
  pauseShortcutMode.setAttribute("aria-label", "Cálculo del retroceso");
  pauseShortcutMode.options[0].textContent = "Fijo";
  pauseShortcutMode.options[1].textContent = "× velocidad";
  shortcutCreateRow.insertBefore(pauseShortcutSeconds, shortcutAdd);
  shortcutCreateRow.insertBefore(pauseShortcutMode, shortcutAdd);

  let speedController;
  let pauseController;
  speedController = createSpeedShortcutsController({
    showNotice,
    tr,
    getPauseShortcuts: () => pauseController?.getAll() || [],
  });
  pauseController = createPauseShortcutsController({
    showNotice,
    getSpeedShortcuts: () => speedController.getAll(),
    renderSpeedShortcuts: () => speedController.render(),
  });

  function updateUnifiedShortcutForm() {
    const speedType = shortcutType.value === "speed";
    const rewindType = shortcutType.value === "pause-rewind";
    shortcutCreateRow.dataset.type = shortcutType.value;
    shortcutSpeed.hidden = !speedType;
    shortcutBehavior.hidden = !speedType;
    pauseShortcutSeconds.hidden = !rewindType;
    pauseShortcutMode.hidden = !rewindType;
  }

  function finishCapture(shortcut) {
    capturedShortcut = shortcut;
    pendingModifier = null;
    shortcutKeyButton.textContent = shortcut.label;
    stopUnifiedCapture();
  }

  function captureKeyDown(event) {
    event.preventDefault();
    event.stopPropagation();
    const shortcut = shortcutFromKeyboardEvent(event);
    if (isModifierCode(event.code)) {
      pendingModifier = shortcut;
      shortcutKeyButton.textContent = `${shortcut.label} + …`;
      return;
    }
    finishCapture(shortcut);
  }

  function captureKeyUp(event) {
    if (!pendingModifier || event.code !== pendingModifier.code) return;
    event.preventDefault();
    event.stopPropagation();
    finishCapture(pendingModifier);
  }

  function stopUnifiedCapture() {
    document.removeEventListener("keydown", captureKeyDown, true);
    document.removeEventListener("keyup", captureKeyUp, true);
  }

  shortcutType.addEventListener("change", updateUnifiedShortcutForm);
  updateUnifiedShortcutForm();

  shortcutSettingsToggle.addEventListener("click", () => {
    const opening = shortcutSettings.hidden;
    if (opening) {
      shortcutSettings.hidden = false;
      shortcutSettingsToggle.textContent = "Cancelar";
      shortcutSettings.appendChild(shortcutSettingsToggle);
    } else {
      shortcutSettings.hidden = true;
      shortcutSettingsToggle.textContent = "Añadir un atajo";
      shortcutSettings.parentElement.insertBefore(shortcutSettingsToggle, shortcutSettings);
    }
  });

  shortcutBehavior.addEventListener("click", () => {
    const hold = shortcutBehavior.value !== "hold";
    shortcutBehavior.value = hold ? "hold" : "permanent";
    shortcutBehavior.innerHTML = hold ? "Mientras<br>pulsas" : "Permanente";
    shortcutBehavior.setAttribute("aria-label", `Comportamiento: ${hold ? "mientras pulsas" : "permanente"}`);
  });

  shortcutKeyButton.addEventListener("click", () => {
    capturedShortcut = null;
    pendingModifier = null;
    shortcutKeyButton.textContent = "Pulsa una tecla…";
    pauseController.stopCapture();
    stopUnifiedCapture();
    document.addEventListener("keydown", captureKeyDown, true);
    document.addEventListener("keyup", captureKeyUp, true);
  });

  shortcutAdd.addEventListener("click", () => {
    const speed = Number(shortcutSpeed.value);
    if (shortcutType.value === "speed" && speed > 16) {
      showNotice(tr("No puedes asignar una velocidad superior a 16×."));
      return;
    }
    if (!capturedShortcut || (shortcutType.value === "speed" && (!Number.isFinite(speed) || speed <= 0))) {
      showNotice(tr(shortcutType.value === "speed" ? "Asigna una tecla e introduce una velocidad válida." : "Asigna una tecla."));
      return;
    }
    speedController.setAll(speedController.getAll().filter((shortcut) => !shortcutsMatch(shortcut, capturedShortcut)));
    pauseController.setAll(pauseController.getAll().filter((shortcut) => !shortcutsMatch(shortcut, capturedShortcut)));
    if (shortcutType.value === "speed") {
      speedController.add({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...capturedShortcut,
        speed,
        behavior: shortcutBehavior.value,
      });
    } else {
      pauseController.add({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...capturedShortcut,
        action: shortcutType.value === "pause-rewind" ? "pause-rewind" : "toggle",
        seconds: normalizePauseSeconds(pauseShortcutSeconds.value),
        mode: pauseShortcutMode.value === "scaled" ? "scaled" : "fixed",
      });
    }
    chrome.storage.local.set({
      speedShortcuts: speedController.getAll(),
      pauseShortcuts: pauseController.getAll(),
    });
    capturedShortcut = null;
    shortcutKeyButton.textContent = "Asignar tecla";
    speedController.render();
    pauseController.render();
  });

  speedController.load();
  chrome.storage.local.get({ speedShortcutsEnabled: true, pauseShortcutsEnabled: true }, (stored) => {
    speedShortcutsEnabled.checked = stored.speedShortcutsEnabled && stored.pauseShortcutsEnabled;
    quickShortcutsEnabled.checked = stored.speedShortcutsEnabled;
  });
  speedShortcutsEnabled.addEventListener("change", () => {
    quickShortcutsEnabled.checked = speedShortcutsEnabled.checked;
    quickPauseShortcutsEnabled.checked = speedShortcutsEnabled.checked;
    pauseShortcutsEnabled.checked = speedShortcutsEnabled.checked;
    chrome.storage.local.set({
      speedShortcutsEnabled: speedShortcutsEnabled.checked,
      pauseShortcutsEnabled: speedShortcutsEnabled.checked,
    });
  });
  quickShortcutsEnabled.addEventListener("change", () => {
    speedShortcutsEnabled.checked = quickShortcutsEnabled.checked;
    chrome.storage.local.set({ speedShortcutsEnabled: quickShortcutsEnabled.checked });
  });

  pauseController.load({ enabledInput: pauseShortcutsEnabled, quickEnabledInput: quickPauseShortcutsEnabled });
  pauseShortcutsEnabled.addEventListener("change", () => {
    quickPauseShortcutsEnabled.checked = pauseShortcutsEnabled.checked;
    chrome.storage.local.set({ pauseShortcutsEnabled: pauseShortcutsEnabled.checked });
  });
  quickPauseShortcutsEnabled.addEventListener("change", () => {
    pauseShortcutsEnabled.checked = quickPauseShortcutsEnabled.checked;
    chrome.storage.local.set({ pauseShortcutsEnabled: quickPauseShortcutsEnabled.checked });
  });

  pauseController.initLegacyForm({ stopUnifiedCapture });
}
