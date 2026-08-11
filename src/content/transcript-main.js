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
    const relevant = changes.extensionEnabled || changes.transcriptEnabled || changes.transcriptMode ||
      changes.transcriptGrouping || changes.transcriptPreferredLanguage || changes.transcriptAutoOpenNextVideo ||
      changes.transcriptRememberLayout ||
      changes.transcriptPanelBackground || changes.transcriptPanelTextColor || changes.transcriptPanelFont ||
      changes.transcriptPanelFontSize || changes.transcriptPanelOpacity;
    if (!relevant) return;
    const needsTranscriptRequest = Boolean(changes.extensionEnabled || changes.transcriptEnabled || changes.transcriptPreferredLanguage);
    if (changes.extensionEnabled) {
      state.settings.extensionEnabled = changes.extensionEnabled.newValue !== false;
      if (state.settings.extensionEnabled) state.dismissedVideoId = null;
    }
    if (changes.transcriptEnabled) {
      state.settings.enabled = changes.transcriptEnabled.newValue;
      if (changes.transcriptEnabled.newValue) state.dismissedVideoId = null;
    }
    if (changes.transcriptMode) state.settings.mode = changes.transcriptMode.newValue;
    if (changes.transcriptGrouping) state.settings.grouping = changes.transcriptGrouping.newValue;
    if (changes.transcriptPreferredLanguage) state.settings.preferredLanguage = changes.transcriptPreferredLanguage.newValue || "auto";
    if (changes.transcriptAutoOpenNextVideo) state.settings.autoOpenNextVideo = changes.transcriptAutoOpenNextVideo.newValue !== false;
    if (changes.transcriptRememberLayout) state.settings.rememberLayout = changes.transcriptRememberLayout.newValue !== false;
    if (changes.transcriptPanelBackground) state.appearance.background = changes.transcriptPanelBackground.newValue;
    if (changes.transcriptPanelTextColor) state.appearance.text = changes.transcriptPanelTextColor.newValue;
    if (changes.transcriptPanelFont) state.appearance.font = changes.transcriptPanelFont.newValue;
    if (changes.transcriptPanelFontSize) state.appearance.fontSize = changes.transcriptPanelFontSize.newValue;
    if (changes.transcriptPanelOpacity) state.appearance.opacity = changes.transcriptPanelOpacity.newValue;

    const appearanceChanged = changes.transcriptPanelBackground || changes.transcriptPanelTextColor ||
      changes.transcriptPanelFont || changes.transcriptPanelFontSize || changes.transcriptPanelOpacity;
    const functionalChanged = changes.extensionEnabled || changes.transcriptEnabled || changes.transcriptMode ||
      changes.transcriptGrouping || changes.transcriptPreferredLanguage || changes.transcriptAutoOpenNextVideo;
    if (appearanceChanged && !functionalChanged) {
      ytx.panel.applyAppearance?.();
      return;
    }

    if (!state.settings.extensionEnabled || !state.settings.enabled) ytx.panel.remove();
    else if (state.transcript) ytx.renderer.renderCurrentMode();
    else ytx.panel.ensure();
    ytx.panel.applyAppearance?.();
    if (needsTranscriptRequest) ytx.bridge.sendControl();
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
        extensionEnabled: true,
        transcriptMode: "full",
      transcriptGrouping: "sentences",
      transcriptPreferredLanguage: "auto",
      transcriptAutoOpenNextVideo: true,
      transcriptRememberLayout: true,
      transcriptPanelBackground: "#1e1e22",
      transcriptPanelTextColor: "#e4e4e7",
      transcriptPanelFont: "Inter, Roboto, Arial, sans-serif",
      transcriptPanelFontSize: 13.5,
      transcriptPanelOpacity: 0.84,
      }, (stored) => {
        state.settings.enabled = stored.transcriptEnabled;
        state.settings.extensionEnabled = stored.extensionEnabled;
        state.settings.mode = stored.transcriptMode;
        state.settings.grouping = stored.transcriptGrouping;
        state.settings.preferredLanguage = stored.transcriptPreferredLanguage;
        state.settings.autoOpenNextVideo = stored.transcriptAutoOpenNextVideo;
        state.settings.rememberLayout = stored.transcriptRememberLayout !== false;
        state.appearance = {
          background: stored.transcriptPanelBackground,
          text: stored.transcriptPanelTextColor,
          font: stored.transcriptPanelFont,
          fontSize: stored.transcriptPanelFontSize,
          opacity: stored.transcriptPanelOpacity,
        };
        ytx.playerControls.start();
        if (state.settings.extensionEnabled && ytx.isWatchPage()) ytx.notes.loadCurrent();
        if (state.settings.extensionEnabled && state.settings.enabled && ytx.isWatchPage()) ytx.panel.ensure();
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
    ytx.playerControls.stop();
    ytx.bridge.stop();
    ytx.panel.remove();
  };

  start();
})();
