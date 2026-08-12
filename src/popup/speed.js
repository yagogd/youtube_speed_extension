"use strict";

import { initSpeedPresets } from "./speed-presets.js";
import { setStored } from "./storage.js";

const MIN_SPEED = 0.1;
const MAX_SPEED = 16;
const SPEED_STEP = 0.25;

export function initSpeedControls({ isExtensionEnabled, showNotice, tr }) {
  const input = document.getElementById("speed");
  const slider = document.getElementById("speed-slider");
  const down = document.getElementById("speed-down");
  const up = document.getElementById("speed-up");
  const presetGrid = document.querySelector(".preset-grid");

  async function applyToActiveTab(value) {
    if (!isExtensionEnabled()) {
      showNotice(tr("La extensión está apagada. Enciéndela antes de cambiar la velocidad."));
      return;
    }
    const rate = Number.parseFloat(value);
    if (rate > MAX_SPEED) {
      showNotice(tr("No puedes usar una velocidad superior a 16×, ya que es el máximo permitido."));
      return;
    }
    if (Number.isNaN(rate) || rate <= 0) {
      showNotice(tr("Introduce una velocidad válida (> 0)."));
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        showNotice(tr("No se detecta ninguna pestaña activa."));
        return;
      }
      if (!tab.url?.includes("youtube.com")) {
        showNotice(tr("Abre YouTube antes de usar la extensión."));
        return;
      }
      chrome.tabs.sendMessage(tab.id, { type: "set-speed", value: rate }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError.message);
          showNotice(tr("⚠️ No se pudo comunicar con el vídeo. Prueba a recargar la página de YouTube."));
          return;
        }
        if (!response) {
          showNotice(tr("⚠️ No se recibió respuesta del script."));
          return;
        }
        if (response.ok) {
          setStored({ lastSpeed: rate });
          return;
        }
        showNotice(`${tr("Error al aplicar la velocidad:")} ${response.error || tr("desconocido.")}`);
      });
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      showNotice(tr("Error al enviar mensaje a la pestaña."));
    }
  }

  function setControls(value, apply = false) {
    const rate = Math.min(MAX_SPEED, Math.max(MIN_SPEED, Number(value) || 1));
    const formatted = Number(rate.toFixed(2));
    input.value = formatted;
    slider.value = formatted;
    presetGrid.querySelectorAll(".preset").forEach((preset) => {
      const selected = Math.abs(Number(preset.dataset.speed) - formatted) < 0.001;
      preset.classList.toggle("is-active", selected);
      preset.setAttribute("aria-pressed", String(selected));
    });
    if (apply) applyToActiveTab(formatted);
  }

  slider.addEventListener("input", () => setControls(slider.value));
  slider.addEventListener("change", () => setControls(slider.value, true));
  down.addEventListener("click", () => setControls(Number(input.value) - SPEED_STEP, true));
  up.addEventListener("click", () => setControls(Number(input.value) + SPEED_STEP, true));
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    setControls(input.value, true);
  });
  input.addEventListener("change", () => setControls(input.value, true));
  presetGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".preset");
    if (button) setControls(button.dataset.speed, true);
  });

  initSpeedPresets({ setSpeedControls: setControls, isExtensionEnabled });
  return { setControls };
}
