(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const state = ytx.state;

  function onNavigate() {
    state.transcript = null;
    state.displayBlocks = [];
    if (state.settings.enabled && ytx.isWatchPage()) {
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
