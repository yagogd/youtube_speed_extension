(() => {
  if (window.__ytTranscriptNetworkObserverLoaded) return;
  window.__ytTranscriptNetworkObserverLoaded = true;

  const processedUrls = new Set();
  let currentVideoId = null;
  let requestGeneration = 0;
  let subtitlesEnabledByExtension = false;
  let transcriptCompleted = false;
  let enabled = false;
  let lastReadyPayload = null;

  function post(payload) {
    window.postMessage({ source: "YT_TRANSCRIPT_EXTENSION", ...payload }, "*");
  }

  function videoIdFromLocation() {
    return new URL(location.href).searchParams.get("v");
  }

  function getTrackInformation(url) {
    const languageCode = new URL(url).searchParams.get("lang") || "desconocido";
    let languageName = languageCode;
    let isAutomatic = new URL(url).searchParams.get("kind") === "asr";

    const tracks = window.ytInitialPlayerResponse?.captions
      ?.playerCaptionsTracklistRenderer?.captionTracks || [];
    const track = tracks.find((candidate) => candidate.languageCode === languageCode);
    if (track) {
      languageName = track.name?.simpleText ||
        track.name?.runs?.map((run) => run.text).join("") ||
        languageCode;
      isAutomatic = track.kind === "asr";
    }

    return { languageCode, languageName, isAutomatic };
  }

  function parseJson3(subtitles) {
    return (subtitles.events || [])
      .filter((event) => Array.isArray(event.segs))
      .map((event) => ({
        startMs: Number(event.tStartMs) || 0,
        durationMs: Number(event.dDurationMs) || 0,
        text: event.segs
          .map((segment) => segment.utf8 || "")
          .join("")
          .replace(/\n/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      }))
      .filter((cue) => cue.text);
  }

  function restoreSubtitleState() {
    if (!subtitlesEnabledByExtension) return;
    const button = document.querySelector(".ytp-subtitles-button");
    if (button?.getAttribute("aria-pressed") === "true") button.click();
    subtitlesEnabledByExtension = false;
  }

  async function processTimedTextUrl(url) {
    if (!enabled || processedUrls.has(url) || transcriptCompleted) return;

    const requestedVideoId = new URL(url).searchParams.get("v");
    if (requestedVideoId && currentVideoId && requestedVideoId !== currentVideoId) return;

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

      const cues = parseJson3(JSON.parse(text));
      if (!cues.length) throw new Error("La transcripción extraída está vacía");
      if (videoIdAtDetection !== currentVideoId) return;

      transcriptCompleted = true;
      window.ultimaTranscripcion = cues.map((cue) => cue.text).join(" ");

      lastReadyPayload = {
        type: "YT_TRANSCRIPT_READY",
        videoId: currentVideoId,
        cues,
        ...getTrackInformation(url),
      };
      post(lastReadyPayload);
      restoreSubtitleState();
    } catch (error) {
      console.error("[Transcript] Error:", error);
      window.ultimoErrorSubtitulos = String(error.message || error);
      if (videoIdAtDetection === currentVideoId) {
        post({ type: "YT_TRANSCRIPT_ERROR", message: String(error.message || error) });
        restoreSubtitleState();
      }
    }
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name.includes("/api/timedtext")) processTimedTextUrl(entry.name);
    }
  });
  observer.observe({ type: "resource", buffered: true });

  function requestTranscript(force = false) {
    if (!enabled) return;
    const nextVideoId = videoIdFromLocation();
    if (!force && nextVideoId && nextVideoId === currentVideoId && requestGeneration > 0) return;

    if (lastReadyPayload?.videoId === nextVideoId) {
      currentVideoId = nextVideoId;
      transcriptCompleted = true;
      post(lastReadyPayload);
      return;
    }

    requestGeneration += 1;
    const generation = requestGeneration;
    currentVideoId = nextVideoId;
    transcriptCompleted = false;
    subtitlesEnabledByExtension = false;
    post({ type: "YT_TRANSCRIPT_LOADING" });

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
        if (!alreadyEnabled) {
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
    if (enabled) {
      requestTranscript(true);
    } else {
      requestGeneration += 1;
      restoreSubtitleState();
    }
  });

  window.addEventListener("yt-navigate-finish", () => requestTranscript());
})();
