"use strict";
import { isModifierCode, shortcutFromKeyboardEvent } from "./shortcut-utils.js";

export function createPauseShortcutsController({ showNotice, getSpeedShortcuts, renderSpeedShortcuts }) {
  const pauseShortcutKey = document.getElementById("pause-shortcut-key");
  const pauseShortcutAction = document.getElementById("pause-shortcut-action");
  const pauseShortcutRewindOptions = document.getElementById("pause-shortcut-rewind-options");
  const pauseShortcutSeconds = document.getElementById("pause-shortcut-seconds");
  const pauseShortcutMode = document.getElementById("pause-shortcut-mode");
  const pauseShortcutAdd = document.getElementById("pause-shortcut-add");
  const pauseShortcutList = document.getElementById("pause-shortcut-list");
  const quickPauseShortcutsSummary = document.getElementById("quick-pause-shortcuts-summary");
  const quickPauseShortcutsList = document.getElementById("quick-pause-shortcuts-list");
  let shortcuts = [];
  let capturedShortcut = null;
  let pendingModifier = null;

  function finishCapture(shortcut) {
    capturedShortcut = shortcut;
    pendingModifier = null;
    pauseShortcutKey.textContent = shortcut.label;
    document.removeEventListener("keydown", captureKeyDown, true);
    document.removeEventListener("keyup", captureKeyUp, true);
  }

  function captureKeyDown(event) {
    event.preventDefault();
    event.stopPropagation();
    const shortcut = shortcutFromKeyboardEvent(event);
    if (isModifierCode(event.code)) {
      pendingModifier = shortcut;
      pauseShortcutKey.textContent = `${shortcut.label} + …`;
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

  function stopCapture() {
    document.removeEventListener("keydown", captureKeyDown, true);
    document.removeEventListener("keyup", captureKeyUp, true);
  }

  function updateSummary() {
    const active = shortcuts.filter((shortcut) => shortcut.enabled !== false).length;
    quickPauseShortcutsSummary.textContent = shortcuts.length
      ? `${active} de ${shortcuts.length} ${shortcuts.length === 1 ? "activo" : "activos"}`
      : "Sin atajos configurados";
  }

  function render() {
    updateSummary();
    pauseShortcutList.replaceChildren();
    quickPauseShortcutsList.replaceChildren();
    if (!shortcuts.length) {
      const empty = document.createElement("div");
      empty.className = "shortcut-empty";
      empty.textContent = "No hay atajos de pausa configurados.";
      if (!getSpeedShortcuts().length) pauseShortcutList.appendChild(empty);
      const quickEmpty = empty.cloneNode(true);
      quickEmpty.className = "quick-shortcut-empty";
      quickPauseShortcutsList.appendChild(quickEmpty);
      renderSpeedShortcuts();
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
      quickDescription.textContent = shortcut.action === "pause-rewind"
        ? `${Number(shortcut.seconds) || 3}s ${shortcut.mode === "scaled" ? "por velocidad" : "fijos"}`
        : "Pausa normal";
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
        chrome.storage.local.set({ pauseShortcuts: shortcuts });
        updateSummary();
      });
      quickSwitch.append(quickToggle, quickTrack);
      quickItem.append(quickInfo, quickSwitch);
      quickPauseShortcutsList.appendChild(quickItem);

      const item = document.createElement("div");
      item.className = "shortcut-item";
      const chips = document.createElement("div");
      chips.className = "shortcut-chips";
      const key = document.createElement("span");
      key.className = "shortcut-chip shortcut-chip--key";
      key.textContent = shortcut.label;
      const action = document.createElement("button");
      action.className = "shortcut-chip shortcut-chip--behavior";
      action.textContent = shortcut.action === "pause-rewind" ? "Pausa + retroceso" : "Pausa normal";
      action.title = "Cambiar acción";
      action.addEventListener("click", () => {
        shortcut.action = shortcut.action === "pause-rewind" ? "toggle" : "pause-rewind";
        if (shortcut.action === "pause-rewind") {
          shortcut.seconds = Number(shortcut.seconds) || 3;
          shortcut.mode = shortcut.mode === "scaled" ? "scaled" : "fixed";
        }
        chrome.storage.local.set({ pauseShortcuts: shortcuts });
        render();
      });
      chips.append(key, action);
      if (shortcut.action === "pause-rewind") {
        const seconds = document.createElement("button");
        seconds.className = "shortcut-chip shortcut-chip--speed";
        seconds.textContent = `${Number(shortcut.seconds) || 3}s`;
        seconds.title = "Cambiar segundos de retroceso";
        seconds.addEventListener("click", () => {
          const editor = document.createElement("input");
          editor.className = "shortcut-speed-editor";
          editor.type = "number";
          editor.min = "0.1";
          editor.step = "0.5";
          editor.value = Number(shortcut.seconds) || 3;
          seconds.replaceWith(editor);
          editor.focus();
          editor.select();
          let saved = false;
          const saveSeconds = () => {
            if (saved) return;
            saved = true;
            const value = Number(editor.value);
            if (Number.isFinite(value) && value > 0) shortcut.seconds = value;
            chrome.storage.local.set({ pauseShortcuts: shortcuts });
            render();
          };
          editor.addEventListener("keydown", (event) => {
            if (event.key === "Enter") saveSeconds();
            if (event.key === "Escape") render();
          });
          editor.addEventListener("blur", saveSeconds);
        });
        const mode = document.createElement("button");
        mode.className = "shortcut-chip shortcut-chip--behavior";
        mode.textContent = shortcut.mode === "scaled" ? "Según velocidad" : "Tiempo fijo";
        mode.title = "Cambiar cálculo del retroceso";
        mode.addEventListener("click", () => {
          shortcut.mode = shortcut.mode === "scaled" ? "fixed" : "scaled";
          chrome.storage.local.set({ pauseShortcuts: shortcuts });
          render();
        });
        chips.append(seconds, mode);
      }
      const remove = document.createElement("button");
      remove.className = "shortcut-remove";
      remove.textContent = "×";
      remove.title = "Eliminar atajo de pausa";
      remove.addEventListener("click", () => {
        shortcuts = shortcuts.filter((candidate) => candidate.id !== shortcut.id);
        chrome.storage.local.set({ pauseShortcuts: shortcuts });
        render();
      });
      item.append(chips, remove);
      pauseShortcutList.appendChild(item);
    });
    renderSpeedShortcuts();
  }

  function initLegacyForm({ stopUnifiedCapture }) {
    const updateForm = () => {
      pauseShortcutRewindOptions.hidden = pauseShortcutAction.value !== "pause-rewind";
    };
    pauseShortcutAction.addEventListener("change", updateForm);
    updateForm();
    pauseShortcutKey.addEventListener("click", () => {
      capturedShortcut = null;
      pendingModifier = null;
      pauseShortcutKey.textContent = "Pulsa una tecla…";
      stopUnifiedCapture();
      document.addEventListener("keydown", captureKeyDown, true);
      document.addEventListener("keyup", captureKeyUp, true);
    });
    pauseShortcutAdd.addEventListener("click", () => {
      if (!capturedShortcut) {
        showNotice("Asigna una tecla para el atajo de pausa.");
        return;
      }
      shortcuts = shortcuts.filter((shortcut) => shortcut.code !== capturedShortcut.code ||
        shortcut.ctrl !== capturedShortcut.ctrl || shortcut.alt !== capturedShortcut.alt ||
        shortcut.shift !== capturedShortcut.shift || shortcut.meta !== capturedShortcut.meta);
      shortcuts.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...capturedShortcut,
        action: pauseShortcutAction.value,
        seconds: Math.max(0.1, Number(pauseShortcutSeconds.value) || 3),
        mode: pauseShortcutMode.value === "scaled" ? "scaled" : "fixed",
      });
      chrome.storage.local.set({ pauseShortcuts: shortcuts });
      capturedShortcut = null;
      pauseShortcutKey.textContent = "Asignar tecla";
      render();
    });
  }

  function load({ enabledInput, quickEnabledInput }) {
    chrome.storage.local.get({ pauseShortcutsEnabled: true, pauseShortcuts: [] }, (stored) => {
      enabledInput.checked = stored.pauseShortcutsEnabled;
      quickEnabledInput.checked = stored.pauseShortcutsEnabled;
      shortcuts = Array.isArray(stored.pauseShortcuts) ? stored.pauseShortcuts : [];
      render();
    });
  }

  return {
    getAll: () => shortcuts,
    setAll: (value) => { shortcuts = value; },
    add: (shortcut) => shortcuts.push(shortcut),
    render,
    load,
    initLegacyForm,
    stopCapture,
  };
}
