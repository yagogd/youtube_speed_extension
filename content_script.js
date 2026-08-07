(() => {
  "use strict";
  if (globalThis.__ytxSpeedControllerLoaded) return;
  globalThis.__ytxSpeedControllerLoaded = true;

  let preferredRate = 1;
  let shortcuts = [];
  let heldShortcut = null;
  let retryTimer = null;
  const pauseRewind = { enabled: false, seconds: 2, mode: "fixed" };

  function validRate(value) {
    const rate = Number(value);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  }

  function broadcastRate(rate, temporary = false) {
    window.postMessage({ source: "YT_SPEED_STATE", rate, temporary }, "*");
  }

  function applyRate(rate, temporary = false) {
    const video = document.querySelector("video");
    if (!video) return false;
    video.playbackRate = rate;
    broadcastRate(rate, temporary);
    return true;
  }

  function setPreferredRate(value, persist = true) {
    const rate = validRate(value);
    if (!rate) return false;
    preferredRate = rate;
    if (persist) chrome.storage.local.set({ lastSpeed: rate });
    if (!heldShortcut) applyRate(rate);
    return true;
  }

  function applyCurrentRateWithRetry() {
    if (retryTimer) clearInterval(retryTimer);
    let attempts = 0;
    const apply = () => {
      attempts += 1;
      const rate = heldShortcut?.speed || preferredRate;
      const applied = applyRate(rate, Boolean(heldShortcut));
      if (applied || attempts >= 40) {
        clearInterval(retryTimer);
        retryTimer = null;
      }
    };
    apply();
    if (!document.querySelector("video")) retryTimer = setInterval(apply, 250);
  }

  function isEditableTarget(target) {
    return target instanceof HTMLElement &&
      (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
  }

  function matchesShortcut(event, shortcut) {
    return event.code === shortcut.code &&
      Boolean(event.ctrlKey) === Boolean(shortcut.ctrl) &&
      Boolean(event.altKey) === Boolean(shortcut.alt) &&
      Boolean(event.shiftKey) === Boolean(shortcut.shift) &&
      Boolean(event.metaKey) === Boolean(shortcut.meta);
  }

  function onKeyDown(event) {
    if (event.repeat || isEditableTarget(event.target)) return;
    const shortcut = shortcuts.find((candidate) => matchesShortcut(event, candidate));
    if (!shortcut) return;

    const speed = validRate(shortcut.speed);
    if (!speed) return;
    event.preventDefault();

    if (shortcut.behavior === "hold") {
      if (heldShortcut) return;
      heldShortcut = { id: shortcut.id, code: shortcut.code, speed };
      applyRate(speed, true);
    } else {
      setPreferredRate(speed, true);
    }
  }

  function onKeyUp(event) {
    if (!heldShortcut || event.code !== heldShortcut.code) return;
    event.preventDefault();
    heldShortcut = null;
    applyRate(preferredRate, false);
  }

  chrome.storage.local.get({
    lastSpeed: 1,
    speedShortcuts: [],
    pauseRewindEnabled: false,
    pauseRewindSeconds: 2,
    pauseRewindMode: "fixed",
  }, (stored) => {
    preferredRate = validRate(stored.lastSpeed) || 1;
    shortcuts = Array.isArray(stored.speedShortcuts) ? stored.speedShortcuts : [];
    pauseRewind.enabled = Boolean(stored.pauseRewindEnabled);
    pauseRewind.seconds = validRate(stored.pauseRewindSeconds) || 2;
    pauseRewind.mode = stored.pauseRewindMode === "scaled" ? "scaled" : "fixed";
    applyCurrentRateWithRetry();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.lastSpeed) {
      preferredRate = validRate(changes.lastSpeed.newValue) || preferredRate;
      if (!heldShortcut) applyCurrentRateWithRetry();
    }
    if (changes.speedShortcuts) {
      shortcuts = Array.isArray(changes.speedShortcuts.newValue) ? changes.speedShortcuts.newValue : [];
    }
    if (changes.pauseRewindEnabled) pauseRewind.enabled = Boolean(changes.pauseRewindEnabled.newValue);
    if (changes.pauseRewindSeconds) pauseRewind.seconds = validRate(changes.pauseRewindSeconds.newValue) || 2;
    if (changes.pauseRewindMode) pauseRewind.mode = changes.pauseRewindMode.newValue === "scaled" ? "scaled" : "fixed";
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "set-speed") return;
    const ok = setPreferredRate(message.value, true);
    sendResponse({ ok, error: ok ? undefined : "Velocidad no válida" });
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "YT_SPEED_CONTROL") return;
    setPreferredRate(event.data.rate, true);
  });
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("yt-navigate-finish", applyCurrentRateWithRetry);
  document.addEventListener("loadedmetadata", (event) => {
    if (event.target instanceof HTMLVideoElement) {
      applyRate(heldShortcut?.speed || preferredRate, Boolean(heldShortcut));
    }
  }, true);
  document.addEventListener("pause", (event) => {
    const video = event.target;
    if (!(video instanceof HTMLVideoElement) || !pauseRewind.enabled || video.ended) return;
    const multiplier = pauseRewind.mode === "scaled" ? video.playbackRate : 1;
    video.currentTime = Math.max(0, video.currentTime - pauseRewind.seconds * multiplier);
  }, true);
})();
