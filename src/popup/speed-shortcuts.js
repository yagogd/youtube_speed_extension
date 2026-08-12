"use strict";
import { isModifierCode, shortcutFromKeyboardEvent } from "./shortcut-utils.js";

export function createSpeedShortcutsController({ showNotice, tr, getPauseShortcuts }) {
  const shortcutKeyButton = document.getElementById("shortcut-key");
  const shortcutList = document.getElementById("shortcut-list");
  const quickShortcutsSummary = document.getElementById("quick-shortcuts-summary");
  const quickShortcutsList = document.getElementById("quick-shortcuts-list");
  let shortcuts = [];
  let pendingModifier = null;
  let editingShortcutId = null;

  function finishCapture(shortcut) {
    if (!editingShortcutId) return;
    shortcuts = shortcuts.map((item) => item.id === editingShortcutId ? { ...item, ...shortcut } : item);
    chrome.storage.local.set({ speedShortcuts: shortcuts });
    editingShortcutId = null;
    pendingModifier = null;
    document.removeEventListener("keydown", captureKeyDown, true);
    document.removeEventListener("keyup", captureKeyUp, true);
    render();
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

  function updateSummary() {
    const active = shortcuts.filter((shortcut) => shortcut.enabled !== false).length;
    quickShortcutsSummary.textContent = shortcuts.length
      ? `${active} de ${shortcuts.length} ${shortcuts.length === 1 ? "activo" : "activos"}`
      : "Sin atajos configurados";
  }

  function render() {
    updateSummary();
    shortcutList.replaceChildren();
    quickShortcutsList.replaceChildren();
    if (!shortcuts.length) {
      if (!getPauseShortcuts().length) {
        const empty = document.createElement("div");
        empty.className = "shortcut-empty";
        empty.textContent = "No hay atajos configurados.";
        shortcutList.appendChild(empty);
      }
      const quickEmpty = document.createElement("div");
      quickEmpty.className = "quick-shortcut-empty";
      quickEmpty.textContent = "No hay atajos configurados.";
      quickShortcutsList.appendChild(quickEmpty);
      return;
    }

    shortcuts.forEach((shortcut) => {
      const quickItem = document.createElement("div");
      quickItem.className = "quick-shortcut";
      const quickInfo = document.createElement("div");
      quickInfo.className = "quick-shortcut__info";
      const quickKey = document.createElement("strong");
      quickKey.textContent = shortcut.label;
      const quickDescription = document.createElement("span");
      quickDescription.textContent = `${shortcut.speed}× · ${shortcut.behavior === "hold" ? "mientras pulsas" : "permanente"}`;
      quickInfo.append(quickKey, quickDescription);
      const quickSwitch = document.createElement("label");
      quickSwitch.className = "switch";
      const quickToggle = document.createElement("input");
      quickToggle.type = "checkbox";
      quickToggle.checked = shortcut.enabled !== false;
      quickToggle.setAttribute("aria-label", `${quickToggle.checked ? "Desactivar" : "Activar"} atajo ${shortcut.label}`);
      const quickTrack = document.createElement("span");
      quickToggle.addEventListener("change", () => {
        shortcut.enabled = quickToggle.checked;
        quickToggle.setAttribute("aria-label", `${quickToggle.checked ? "Desactivar" : "Activar"} atajo ${shortcut.label}`);
        chrome.storage.local.set({ speedShortcuts: shortcuts });
        updateSummary();
      });
      quickSwitch.append(quickToggle, quickTrack);
      quickItem.append(quickInfo, quickSwitch);
      quickShortcutsList.appendChild(quickItem);

      const item = document.createElement("div");
      item.className = "shortcut-item";
      const chips = document.createElement("div");
      chips.className = "shortcut-chips";
      const key = document.createElement("button");
      key.className = "shortcut-chip shortcut-chip--key";
      key.textContent = shortcut.label;
      key.title = "Cambiar tecla";
      key.addEventListener("click", () => {
        editingShortcutId = shortcut.id;
        pendingModifier = null;
        key.textContent = "Pulsa una tecla…";
        document.addEventListener("keydown", captureKeyDown, true);
        document.addEventListener("keyup", captureKeyUp, true);
      });
      const speed = document.createElement("button");
      speed.className = "shortcut-chip shortcut-chip--speed";
      speed.textContent = `${shortcut.speed}×`;
      speed.title = "Cambiar velocidad";
      speed.addEventListener("click", () => {
        const editor = document.createElement("input");
        editor.className = "shortcut-speed-editor";
        editor.type = "number";
        editor.min = "0.1";
        editor.max = "16";
        editor.step = "0.25";
        editor.value = shortcut.speed;
        speed.replaceWith(editor);
        editor.focus();
        editor.select();
        let saved = false;
        const saveSpeed = () => {
          if (saved) return;
          saved = true;
          const value = Number(editor.value);
          if (value > 16) {
            showNotice(tr("No puedes asignar una velocidad superior a 16×."));
          } else if (Number.isFinite(value) && value > 0) {
            shortcut.speed = value;
            chrome.storage.local.set({ speedShortcuts: shortcuts });
          }
          render();
        };
        editor.addEventListener("keydown", (event) => {
          if (event.key === "Enter") saveSpeed();
          if (event.key === "Escape") render();
        });
        editor.addEventListener("blur", saveSpeed);
      });
      const behavior = document.createElement("button");
      behavior.className = "shortcut-chip shortcut-chip--behavior";
      behavior.textContent = shortcut.behavior === "hold" ? "Mientras pulsas" : "Permanente";
      behavior.title = "Cambiar comportamiento";
      behavior.addEventListener("click", () => {
        shortcut.behavior = shortcut.behavior === "hold" ? "permanent" : "hold";
        chrome.storage.local.set({ speedShortcuts: shortcuts });
        render();
      });
      chips.append(key, speed, behavior);
      const remove = document.createElement("button");
      remove.className = "shortcut-remove";
      remove.textContent = "×";
      remove.title = "Eliminar atajo";
      remove.addEventListener("click", () => {
        shortcuts = shortcuts.filter((candidate) => candidate.id !== shortcut.id);
        chrome.storage.local.set({ speedShortcuts: shortcuts });
        render();
      });
      item.append(chips, remove);
      shortcutList.appendChild(item);
    });
  }

  function load() {
    chrome.storage.local.get({ speedShortcuts: [] }, (stored) => {
      shortcuts = Array.isArray(stored.speedShortcuts) ? stored.speedShortcuts : [];
      quickShortcutsSummary.textContent = shortcuts.length
        ? `${shortcuts.length} ${shortcuts.length === 1 ? "atajo configurado" : "atajos configurados"}`
        : "Sin atajos configurados";
      render();
    });
  }

  return {
    getAll: () => shortcuts,
    setAll: (value) => { shortcuts = value; },
    add: (shortcut) => shortcuts.push(shortcut),
    render,
    load,
  };
}
