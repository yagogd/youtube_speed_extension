(function waitForCaptions() {
  const tryGet = () => {
    try {
      // Buscar playerResponse desde diferentes lugares posibles
      const playerResponse =
        window.ytInitialPlayerResponse ||
        (window.ytplayer?.config?.args?.player_response &&
          JSON.parse(window.ytplayer.config.args.player_response)) ||
        (window.yt && window.yt.config_ && window.yt.config_.args && JSON.parse(window.yt.config_.args.raw_player_response));

      if (!playerResponse) return false;

      const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!tracks || tracks.length === 0) return false;

      // Buscar cualquier idioma que contenga "es" o "en"
      const track =
        tracks.find(t => t.languageCode && (t.languageCode.includes("es") || t.languageCode.includes("en"))) ||
        tracks[0];

      if (track && track.baseUrl) {
        console.log("✅ Subtítulos encontrados:", track.languageCode);
        window.postMessage({ type: "YT_CAPTIONS_URL", url: track.baseUrl }, "*");
        return true;
      }
    } catch (e) {
      console.warn("⚠️ Error en inject.js:", e);
    }
    return false;
  };

  // Reintentar cada 500 ms hasta 10 s o hasta encontrar subtítulos
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (tryGet() || attempts > 20) {
      clearInterval(interval);
      if (attempts > 20) {
        console.warn("⏱️ No se encontraron subtítulos tras varios intentos.");
        window.postMessage({ type: "YT_CAPTIONS_URL", url: null }, "*");
      }
    }
  }, 500);
})();
