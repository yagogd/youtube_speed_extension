"use strict";

export function normalizePauseSeconds(value) {
  return Math.max(0.5, Math.round((Number(value) || 2) * 2) / 2);
}

export function initPauseSettings() {
  const enabled = document.getElementById("pause-rewind-enabled");
  const secondsInput = document.getElementById("pause-rewind-seconds");
  const mode = document.getElementById("pause-rewind-mode");
  const quickEnabled = document.getElementById("quick-pause-enabled");
  const quickSeconds = document.getElementById("quick-pause-seconds");
  const quickMode = document.getElementById("quick-pause-mode");

  function updateAdvancedControls() {
    secondsInput.disabled = !enabled.checked;
    mode.disabled = !enabled.checked;
  }

  function updateQuickControls() {
    quickSeconds.disabled = false;
    quickMode.disabled = false;
  }

  secondsInput.min = "0.5";
  quickSeconds.min = "0.5";
  chrome.storage.local.get({
    pauseRewindEnabled: false,
    pauseRewindSeconds: 2,
    pauseRewindMode: "fixed",
  }, (stored) => {
    enabled.checked = stored.pauseRewindEnabled;
    quickEnabled.checked = stored.pauseRewindEnabled;
    const seconds = normalizePauseSeconds(stored.pauseRewindSeconds);
    secondsInput.value = seconds;
    quickSeconds.value = seconds;
    if (seconds !== Number(stored.pauseRewindSeconds)) chrome.storage.local.set({ pauseRewindSeconds: seconds });
    mode.value = stored.pauseRewindMode;
    quickMode.value = stored.pauseRewindMode;
    updateAdvancedControls();
    updateQuickControls();
  });

  enabled.addEventListener("change", () => {
    quickEnabled.checked = enabled.checked;
    updateQuickControls();
    updateAdvancedControls();
    chrome.storage.local.set({ pauseRewindEnabled: enabled.checked });
  });
  secondsInput.addEventListener("change", () => {
    const seconds = normalizePauseSeconds(secondsInput.value);
    secondsInput.value = seconds;
    quickSeconds.value = seconds;
    chrome.storage.local.set({ pauseRewindSeconds: seconds });
  });
  mode.addEventListener("change", () => {
    quickMode.value = mode.value;
    chrome.storage.local.set({ pauseRewindMode: mode.value });
  });
  quickEnabled.addEventListener("change", () => {
    enabled.checked = quickEnabled.checked;
    updateAdvancedControls();
    updateQuickControls();
    chrome.storage.local.set({ pauseRewindEnabled: quickEnabled.checked });
  });
  quickSeconds.addEventListener("change", () => {
    const seconds = normalizePauseSeconds(quickSeconds.value);
    quickSeconds.value = seconds;
    secondsInput.value = seconds;
    chrome.storage.local.set({ pauseRewindSeconds: seconds });
  });
  quickMode.addEventListener("change", () => {
    mode.value = quickMode.value;
    chrome.storage.local.set({ pauseRewindMode: quickMode.value });
  });
}
