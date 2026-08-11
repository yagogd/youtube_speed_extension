(() => {
  if (window.__ytTranscriptNetworkObserverLoaded) return;
  window.__ytTranscriptNetworkObserverLoaded = true;

  const processedUrls = new Set();
  let currentVideoId = null;
  let requestGeneration = 0;
  let subtitlesEnabledByExtension = false;
  let transcriptCompleted = false;
  let enabled = false;
  let preferredLanguage = "auto";
  let lastReadyPayload = null;
  let availableTracks = [];

  function post(payload) {
    window.postMessage({ source: "YT_TRANSCRIPT_EXTENSION", ...payload }, "*");
  }

  function videoIdFromLocation() {
    return new URL(location.href).searchParams.get("v");
  }

  function playerCaptionTracks() {
    const playerResponse = document.getElementById("movie_player")?.getPlayerResponse?.() || window.ytInitialPlayerResponse;
    return playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  }

  function trackName(track) {
    return track.name?.simpleText || track.name?.runs?.map((run) => run.text).join("") || track.languageCode || "Desconocido";
  }

  function collectTracks() {
    availableTracks = playerCaptionTracks().map((track, index) => ({
      id: `${track.languageCode || "unknown"}:${track.kind || "manual"}:${index}`,
      languageCode: track.languageCode || "unknown",
      languageName: trackName(track),
      isAutomatic: track.kind === "asr",
      baseUrl: track.baseUrl,
    })).filter((track) => {
      if (!track.baseUrl) return false;
      const trackVideoId = new URL(track.baseUrl).searchParams.get("v");
      return !trackVideoId || !currentVideoId || trackVideoId === currentVideoId;
    });
    post({
      type: "YT_TRANSCRIPT_TRACKS",
      videoId: currentVideoId,
      tracks: availableTracks.map(({ baseUrl, ...track }) => track),
    });
    return availableTracks;
  }

  function preferredTrack(tracks) {
    if (!tracks.length) return null;
    if (!preferredLanguage || preferredLanguage === "auto") return tracks[0];
    const language = preferredLanguage.toLocaleLowerCase();
    const matches = tracks.filter((track) => {
      const code = track.languageCode.toLocaleLowerCase();
      return code === language || code.startsWith(`${language}-`);
    });
    return matches.find((track) => !track.isAutomatic) || matches[0] || tracks[0];
  }

  function json3Url(baseUrl) {
    const url = new URL(baseUrl);
    url.searchParams.set("fmt", "json3");
    return url.href;
  }

  function getTrackInformation(url) {
    const languageCode = new URL(url).searchParams.get("lang") || "desconocido";
    let languageName = languageCode;
    let isAutomatic = new URL(url).searchParams.get("kind") === "asr";

    const tracks = window.ytInitialPlayerResponse?.captions
      ?.playerCaptionsTracklistRenderer?.captionTracks || [];
    const urlKind = new URL(url).searchParams.get("kind") || "manual";
    const track = tracks.find((candidate) => candidate.languageCode === languageCode && (candidate.kind || "manual") === urlKind) ||
      tracks.find((candidate) => candidate.languageCode === languageCode);
    if (track) {
      languageName = track.name?.simpleText ||
        track.name?.runs?.map((run) => run.text).join("") ||
        languageCode;
      isAutomatic = track.kind === "asr";
    }

    return { languageCode, languageName, isAutomatic };
  }

  function restoreSubtitleState() {
    if (!subtitlesEnabledByExtension) return;
    const button = document.querySelector(".ytp-subtitles-button");
    if (button?.getAttribute("aria-pressed") === "true") button.click();
    subtitlesEnabledByExtension = false;
  }

  async function processTimedTextUrl(url, options = {}) {
    const { force = false, selectedTrackId = null } = options;
    if (!enabled || (!force && processedUrls.has(url)) || (!force && transcriptCompleted)) return false;

    const requestedVideoId = new URL(url).searchParams.get("v");
    if (requestedVideoId && currentVideoId && requestedVideoId !== currentVideoId) return false;

    processedUrls.add(url);
    const videoIdAtDetection = currentVideoId;
    window.ultimaUrlSubtitulos = url;
    console.log("[Transcript] URL detectada:", url);

    try {
      const response = await fetch(url, { credentials: "include" });
      const text = await response.text();
      window.ultimaRespuestaSubtitulos = text;

      console.log("[Transcript] Respuesta:", {
        status: response.status,
        ok: response.ok,
        length: text.length,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!text.trim()) throw new Error("YouTube devolvió una respuesta vacía");
      if (!text.trimStart().startsWith("{")) throw new Error("La respuesta no parece JSON");

      if (!window.YTXTranscriptParser) throw new Error("El parser de transcripción no está disponible");
      const { cues, blocks } = window.YTXTranscriptParser.parseJson3(JSON.parse(text));
      if (!cues.length) throw new Error("La transcripción extraída está vacía");
      if (videoIdAtDetection !== currentVideoId) return;

      transcriptCompleted = true;
      if (!availableTracks.length) collectTracks();
      window.ultimaTranscripcion = cues.map((cue) => cue.text).join(" ");

      lastReadyPayload = {
        type: "YT_TRANSCRIPT_READY",
        videoId: currentVideoId,
        cues,
        blocks,
        ...getTrackInformation(url),
        selectedTrackId: selectedTrackId || availableTracks.find((track) => {
          const info = getTrackInformation(url);
          return track.languageCode === info.languageCode && track.isAutomatic === info.isAutomatic;
        })?.id || null,
        tracks: availableTracks.map(({ baseUrl, ...track }) => track),
      };
      post(lastReadyPayload);
      restoreSubtitleState();
      return true;
    } catch (error) {
      console.error("[Transcript] Error:", error);
      window.ultimoErrorSubtitulos = String(error.message || error);
      if (videoIdAtDetection === currentVideoId) {
        post({ type: "YT_TRANSCRIPT_ERROR", message: String(error.message || error) });
        restoreSubtitleState();
      }
      return false;
    }
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name.includes("/api/timedtext")) processTimedTextUrl(entry.name);
    }
  });
  observer.observe({ type: "resource", buffered: true });

  async function requestTranscript(force = false) {
    if (!enabled) return;
    const nextVideoId = videoIdFromLocation();
    if (!force && nextVideoId && nextVideoId === currentVideoId && requestGeneration > 0) return;

    if (!force && lastReadyPayload?.videoId === nextVideoId) {
      currentVideoId = nextVideoId;
      transcriptCompleted = true;
      post(lastReadyPayload);
      return;
    }

    requestGeneration += 1;
    const generation = requestGeneration;
    currentVideoId = nextVideoId;
    transcriptCompleted = false;
    processedUrls.clear();
    subtitlesEnabledByExtension = false;
    post({ type: "YT_TRANSCRIPT_LOADING" });

    const tracks = collectTracks();
    const selected = preferredTrack(tracks);
    if (selected) {
      const loaded = await processTimedTextUrl(json3Url(selected.baseUrl), { force: true, selectedTrackId: selected.id });
      if (loaded) return;
    }

    let attempts = 0;
    const buttonTimer = setInterval(() => {
      if (generation !== requestGeneration || transcriptCompleted) {
        clearInterval(buttonTimer);
        return;
      }

      attempts += 1;
      const button = document.querySelector(".ytp-subtitles-button");
      if (button) {
        clearInterval(buttonTimer);
        const alreadyEnabled = button.getAttribute("aria-pressed") === "true";
        if (alreadyEnabled) {
          button.click();
          setTimeout(() => {
            if (generation === requestGeneration && !transcriptCompleted) button.click();
          }, 120);
        } else {
          subtitlesEnabledByExtension = true;
          button.click();
        }

        setTimeout(() => {
          if (generation === requestGeneration && !transcriptCompleted) {
            post({
              type: "YT_TRANSCRIPT_ERROR",
              message: "YouTube no realizó la petición de subtítulos tras activar el botón.",
            });
            restoreSubtitleState();
          }
        }, 12000);
      } else if (attempts >= 40) {
        clearInterval(buttonTimer);
        post({
          type: "YT_TRANSCRIPT_UNAVAILABLE",
          videoId: currentVideoId,
        });
      }
    }, 250);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "YT_TRANSCRIPT_CONTROL") return;
    enabled = Boolean(event.data.enabled);
    preferredLanguage = event.data.preferredLanguage || preferredLanguage || "auto";
    if (event.data.selectTrackId) {
      const selected = availableTracks.find((track) => track.id === event.data.selectTrackId) || collectTracks().find((track) => track.id === event.data.selectTrackId);
      if (enabled && selected) {
        transcriptCompleted = false;
        post({ type: "YT_TRANSCRIPT_LOADING" });
        processTimedTextUrl(json3Url(selected.baseUrl), { force: true, selectedTrackId: selected.id });
      }
      return;
    }
    if (enabled) {
      requestTranscript(true);
    } else {
      requestGeneration += 1;
      restoreSubtitleState();
    }
  });

  window.addEventListener("yt-navigate-finish", () => requestTranscript());
})();
