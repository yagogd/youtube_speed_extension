(() => {
  "use strict";
  if (globalThis.__ytTranscriptContentLoaded) return;
  globalThis.__ytTranscriptContentLoaded = true;

  const ytx = globalThis.__YTX;
  const state = ytx.state;

  function injectPageScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL(path);
      script.onload = () => { script.remove(); resolve(); };
      script.onerror = () => { script.remove(); reject(new Error(`No se pudo cargar ${path}`)); };
      (document.head || document.documentElement).appendChild(script);
    });
  }

  function onStorageChanged(changes, area) {
    if (area !== "local") return;
    if (changes.transcriptEnabled) state.settings.enabled = changes.transcriptEnabled.newValue;
    if (changes.transcriptMode) state.settings.mode = changes.transcriptMode.newValue;
    if (changes.transcriptGrouping) state.settings.grouping = changes.transcriptGrouping.newValue;

    if (!state.settings.enabled) ytx.panel.remove();
    else if (state.transcript) ytx.renderer.renderCurrentMode();
    else ytx.panel.ensure();
    ytx.bridge.sendControl();
  }

  async function start() {
    ytx.bridge.start();
    ytx.navigation.start();
    chrome.storage.onChanged.addListener(onStorageChanged);

    try {
      await injectPageScript("src/utils/transcript-parser.js");
      await injectPageScript("inject.js");
      chrome.storage.local.get({
        transcriptEnabled: true,
        transcriptMode: "full",
        transcriptGrouping: "grouped",
      }, (stored) => {
        state.settings.enabled = stored.transcriptEnabled;
        state.settings.mode = stored.transcriptMode;
        state.settings.grouping = stored.transcriptGrouping;
        if (state.settings.enabled && ytx.isWatchPage()) ytx.panel.ensure();
        ytx.bridge.sendControl();
      });
    } catch (error) {
      console.error("YouTube Transcript:", error);
      ytx.panel.showMessage("No se pudo cargar", error.message);
    }
  }

  ytx.destroy = () => {
    chrome.storage.onChanged.removeListener(onStorageChanged);
    ytx.navigation.stop();
    ytx.bridge.stop();
    ytx.panel.remove();
  };

  start();
})();
