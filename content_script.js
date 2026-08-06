(() => {
  "use strict";
  if (globalThis.__ytxSpeedControllerLoaded) return;
  globalThis.__ytxSpeedControllerLoaded = true;

  let preferredRate = 1;
  let retryTimer = null;

  function setVideoRate(rate) {
    const video = document.querySelector("video");
    if (!video) return false;
    video.playbackRate = rate;
    console.log("YouTube Speed Setter: velocidad establecida en", rate);
    return true;
  }

  function applyPreferredRateWithRetry() {
    if (retryTimer) clearInterval(retryTimer);
    let attempts = 0;
    const apply = () => {
      attempts += 1;
      const applied = setVideoRate(preferredRate);
      if (applied || attempts >= 40) {
        clearInterval(retryTimer);
        retryTimer = null;
      }
    };
    apply();
    if (!document.querySelector("video")) retryTimer = setInterval(apply, 250);
  }

  chrome.storage.local.get({ lastSpeed: 1 }, (stored) => {
    const rate = Number(stored.lastSpeed);
    preferredRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
    applyPreferredRateWithRetry();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.lastSpeed) return;
    const rate = Number(changes.lastSpeed.newValue);
    if (!Number.isFinite(rate) || rate <= 0) return;
    preferredRate = rate;
    applyPreferredRateWithRetry();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "set-speed") return;
    const rate = Number(message.value);
    if (!Number.isFinite(rate) || rate <= 0) {
      sendResponse({ ok: false, error: "Velocidad no válida" });
      return;
    }
    preferredRate = rate;
    sendResponse({ ok: setVideoRate(rate) });
  });

  window.addEventListener("yt-navigate-finish", applyPreferredRateWithRetry);
  document.addEventListener("loadedmetadata", (event) => {
    if (event.target instanceof HTMLVideoElement) setVideoRate(preferredRate);
  }, true);
})();
