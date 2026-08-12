"use strict";

  const DEFAULTS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 8];

  export function normalizeSpeedPresets(values) {
    const normalized = (Array.isArray(values) ? values : [])
      .map(Number)
      .filter((value) => Number.isFinite(value) && value >= 0.1 && value <= 16)
      .map((value) => Number(value.toFixed(2)));
    return [...new Set(normalized)].sort((a, b) => a - b);
  }

export function initSpeedPresets({ setSpeedControls, isExtensionEnabled }) {
    const grid = document.querySelector(".preset-grid");
    const editorList = document.getElementById("preset-editor-list");
    const editorValue = document.getElementById("preset-editor-value");
    const addButton = document.getElementById("preset-editor-add");
    const resetButton = document.getElementById("preset-editor-reset");
    const status = document.getElementById("preset-editor-status");
    let presets = [...DEFAULTS];

    function render() {
      grid.replaceChildren();
      const columns = presets.length <= 8 ? presets.length : Math.ceil(presets.length / 2);
      grid.style.setProperty("--speed-preset-count", Math.min(8, columns));
      presets.forEach((value) => {
        const button = document.createElement("button");
        button.className = "preset";
        button.dataset.speed = value;
        button.textContent = value;
        button.disabled = !isExtensionEnabled();
        grid.appendChild(button);
      });
      setSpeedControls(document.getElementById("speed").value || 1);

      editorList.replaceChildren();
      presets.forEach((value, index) => {
        const item = document.createElement("div");
        item.className = "preset-editor-item";
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0.1";
        input.max = "16";
        input.step = "0.1";
        input.value = value;
        input.setAttribute("aria-label", `Velocidad rápida ${index + 1}`);
        input.addEventListener("change", () => {
          const next = [...presets];
          next[index] = Number(input.value);
          const normalized = normalizeSpeedPresets(next);
          if (normalized.length < 4) {
            status.textContent = "Debes conservar al menos 4 velocidades.";
            render();
            return;
          }
          presets = normalized;
          chrome.storage.local.set({ speedPresets: presets });
          status.textContent = "Velocidades actualizadas.";
          render();
        });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "preset-editor-remove";
        remove.textContent = "×";
        remove.title = "Eliminar velocidad";
        remove.disabled = presets.length <= 4;
        remove.addEventListener("click", () => {
          if (presets.length <= 4) return;
          presets.splice(index, 1);
          chrome.storage.local.set({ speedPresets: presets });
          render();
        });
        item.append(input, remove);
        editorList.appendChild(item);
      });
      addButton.disabled = false;
    }

    addButton.addEventListener("click", () => {
      const value = Number(editorValue.value);
      if (!Number.isFinite(value) || value < 0.1 || value > 16) {
        status.textContent = "Introduce una velocidad entre 0,1 y 16.";
        return;
      }
      const normalized = normalizeSpeedPresets([...presets, value]);
      if (normalized.length === presets.length) {
        status.textContent = "Esa velocidad ya está añadida.";
        return;
      }
      presets = normalized;
      editorValue.value = "";
      chrome.storage.local.set({ speedPresets: presets });
      status.textContent = "Velocidad añadida.";
      render();
    });

    resetButton.addEventListener("click", () => {
      presets = [...DEFAULTS];
      chrome.storage.local.set({ speedPresets: presets });
      status.textContent = "Valores restaurados.";
      render();
    });

    chrome.storage.local.get({ lastSpeed: 1, speedPresets: DEFAULTS }, (stored) => {
      const normalized = normalizeSpeedPresets(stored.speedPresets);
      presets = normalized.length >= 4 ? normalized : [...DEFAULTS];
      render();
      setSpeedControls(stored.lastSpeed || 1);
    });
  }
