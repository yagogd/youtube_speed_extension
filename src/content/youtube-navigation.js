(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const state = ytx.state;

  function onNavigate() {
    if (state.settings.autoOpenNextVideo) state.dismissedVideoId = null;
    state.transcript = null;
    state.transcriptTracks = [];
    state.displayBlocks = [];
    state.autoScrollEnabled = true;
    if (state.settings.extensionEnabled && ytx.isWatchPage()) ytx.notes.loadCurrent();
    if (state.settings.extensionEnabled && state.settings.enabled && !state.dismissedVideoId && ytx.isWatchPage()) {
      ytx.panel.showMessage("Cargando transcripción…", "Buscando una pista de subtítulos…");
    } else {
      ytx.panel.remove();
    }
    ytx.bridge.sendControl();
  }

  function onFullscreenChange() {
    const panel = document.getElementById("yt-transcript-panel");
    if (panel) (document.fullscreenElement || document.body).appendChild(panel);
  }

  ytx.navigation = {
    start() {
      window.addEventListener("yt-navigate-finish", onNavigate);
      document.addEventListener("fullscreenchange", onFullscreenChange);
    },
    stop() {
      window.removeEventListener("yt-navigate-finish", onNavigate);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    },
  };
})();
