(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const state = ytx.state;

  function sendControl() {
    window.postMessage({
      source: "YT_TRANSCRIPT_CONTROL",
      enabled: state.settings.enabled && ytx.isWatchPage(),
    }, "*");
  }

  function onMessage(event) {
    if (event.source !== window || event.data?.source !== "YT_TRANSCRIPT_EXTENSION") return;
    if (!state.settings.enabled || !ytx.isWatchPage()) return;

    switch (event.data.type) {
      case "YT_TRANSCRIPT_LOADING":
        state.transcript = null;
        state.displayBlocks = [];
        ytx.panel.showMessage("Cargando transcripción…", "Buscando una pista de subtítulos…");
        break;
      case "YT_TRANSCRIPT_READY":
        state.transcript = event.data;
        ytx.renderer.renderCurrentMode();
        break;
      case "YT_TRANSCRIPT_UNAVAILABLE":
        ytx.panel.showMessage("Sin transcripción", "Este vídeo no ofrece ninguna pista de subtítulos.");
        break;
      case "YT_TRANSCRIPT_ERROR":
        ytx.panel.showMessage("No se pudo cargar", event.data.message || "Ha ocurrido un error desconocido.");
        break;
    }
  }

  ytx.bridge = {
    sendControl,
    start() { window.addEventListener("message", onMessage); },
    stop() { window.removeEventListener("message", onMessage); },
  };
})();
