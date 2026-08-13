(() => {
  if (window.__ytTranscriptNetworkObserverLoaded) return;
  window.__ytTranscriptNetworkObserverLoaded = true;

  const processedUrls = new Set();
  const transcriptCache = new Map();
  let currentVideoId = null;
  let requestGeneration = 0;
  let activeFetchController = null;
  let lastFailureKind = null;
  let rateLimitedUntil = 0;
  let subtitlesEnabledByExtension = false;
  let transcriptCompleted = false;
  let enabled = false;
  let preferredLanguage = "auto";
  let lastReadyPayload = null;
  let availableTracks = [];
  let buttonTimer = null;
  const pendingTimers = new Set();
  let observerActive = false;
  let observerStarted = false;
  let pendingPlayerTrack = null;
  const silentObservedUrls = new Set();

  function schedule(callback, delay) {
    const timer = setTimeout(() => {
      pendingTimers.delete(timer);
      callback();
    }, delay);
    pendingTimers.add(timer);
    return timer;
  }

  function post(payload) {
    window.postMessage({ source: "YT_TRANSCRIPT_EXTENSION", ...payload }, "*");
  }

  function videoIdFromLocation() {
    return new URL(location.href).searchParams.get("v");
  }

  function playerCaptionData() {
    const playerResponse = document.getElementById("movie_player")?.getPlayerResponse?.() || window.ytInitialPlayerResponse;
    return playerResponse?.captions?.playerCaptionsTracklistRenderer || {};
  }

  function playerResponseVideoId() {
    const playerResponse = document.getElementById("movie_player")?.getPlayerResponse?.() || window.ytInitialPlayerResponse;
    return playerResponse?.videoDetails?.videoId || null;
  }

  function playerCaptionTracks() {
    return playerCaptionData().captionTracks || [];
  }

  function playerTranslationLanguages() {
    return playerCaptionData().translationLanguages || [];
  }

  function trackName(track) {
    return track.name?.simpleText || track.name?.runs?.map((run) => run.text).join("") ||
      track.languageName?.simpleText || track.languageName?.runs?.map((run) => run.text).join("") ||
      track.languageCode || "Desconocido";
  }

  function collectTracks() {
    const originalTracks = playerCaptionTracks().map((track, index) => ({
      id: `${track.languageCode || "unknown"}:${track.kind || "manual"}:${index}`,
      languageCode: track.languageCode || "unknown",
      languageName: trackName(track),
      isAutomatic: track.kind === "asr",
      isTranslatable: track.isTranslatable !== false,
      baseUrl: track.baseUrl,
    })).filter((track) => {
      if (!track.baseUrl) return false;
      const trackVideoId = new URL(track.baseUrl).searchParams.get("v");
      return !trackVideoId || !currentVideoId || trackVideoId === currentVideoId;
    });
    const translatableTracks = originalTracks.filter((track) => track.isTranslatable);
    const translationSource = translatableTracks.find((track) => !track.isAutomatic) || translatableTracks[0];
    const originalLanguages = new Set(originalTracks.map((track) => track.languageCode.toLocaleLowerCase()));
    const translatedTracks = translationSource ? playerTranslationLanguages()
      .filter((language) => language.languageCode && !originalLanguages.has(language.languageCode.toLocaleLowerCase()))
      .map((language) => {
        const url = new URL(translationSource.baseUrl);
        url.searchParams.set("tlang", language.languageCode);
        return {
          id: `translated:${language.languageCode}`,
          languageCode: language.languageCode,
          languageName: trackName(language),
          isAutomatic: true,
          isTranslated: true,
          sourceLanguageCode: translationSource.languageCode,
          baseUrl: url.href,
        };
      }) : [];
    availableTracks = [...originalTracks, ...translatedTracks];
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

  function cacheKey(videoId, trackId) {
    return videoId && trackId ? `${videoId}:${trackId}` : null;
  }

  function restoreCachedTranscript(trackId) {
    const key = cacheKey(currentVideoId, trackId);
    const cached = key ? transcriptCache.get(key) : null;
    if (!cached) return false;
    transcriptCompleted = true;
    lastReadyPayload = { ...cached, tracks: availableTracks.map(({ baseUrl, ...track }) => track) };
    post(lastReadyPayload);
    return true;
  }

  function getTrackInformation(url) {
    const parsedUrl = new URL(url);
    const translatedLanguage = parsedUrl.searchParams.get("tlang");
    const languageCode = translatedLanguage || parsedUrl.searchParams.get("lang") || "desconocido";
    let languageName = languageCode;
    let isAutomatic = translatedLanguage ? true : parsedUrl.searchParams.get("kind") === "asr";
    const isTranslated = Boolean(translatedLanguage);

    if (translatedLanguage) {
      const language = playerTranslationLanguages().find((candidate) => candidate.languageCode === translatedLanguage);
      if (language) languageName = trackName(language);
      return { languageCode, languageName, isAutomatic, isTranslated };
    }

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

    return { languageCode, languageName, isAutomatic, isTranslated };
  }

  function suppressPlayerCaptions() {
    document.getElementById("movie_player")?.classList.add("ytx-caption-request-active");
  }

  function releasePlayerCaptionSuppression(waitForDisabled = false, attempts = 0) {
    const player = document.getElementById("movie_player");
    if (!player) return;
    const captionsStillVisible = document.querySelector(".ytp-subtitles-button")?.getAttribute("aria-pressed") === "true";
    if (waitForDisabled && captionsStillVisible && attempts < 20) {
      schedule(() => releasePlayerCaptionSuppression(true, attempts + 1), 100);
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      player.classList.remove("ytx-caption-request-active");
    }));
  }

  function ensureNativeCaptionsAreOff() {
    suppressPlayerCaptions();
    const button = document.querySelector(".ytp-subtitles-button");
    if (button?.getAttribute("aria-pressed") === "true") button.click();
    releasePlayerCaptionSuppression(true);
  }

  function restoreSubtitleState() {
    const trackRequest = pendingPlayerTrack;
    pendingPlayerTrack = null;
    if (trackRequest?.previousTrack) {
      document.getElementById("movie_player")?.setOption?.("captions", "track", trackRequest.previousTrack);
    }
    if (!subtitlesEnabledByExtension) {
      releasePlayerCaptionSuppression(false);
      return;
    }
    const button = document.querySelector(".ytp-subtitles-button");
    if (button?.getAttribute("aria-pressed") === "true") button.click();
    subtitlesEnabledByExtension = false;
    releasePlayerCaptionSuppression(true);
  }

  function trackMatchesUrl(track, url) {
    const parsed = new URL(url);
    const translatedLanguage = parsed.searchParams.get("tlang");
    if (track.isTranslated) return translatedLanguage === track.languageCode;
    const requestedLanguage = parsed.searchParams.get("lang") || "";
    return !translatedLanguage && (requestedLanguage === track.languageCode ||
      requestedLanguage.startsWith(`${track.languageCode}-`) || track.languageCode.startsWith(`${requestedLanguage}-`));
  }

  function requestTrackThroughPlayer(track, generation) {
    const player = document.getElementById("movie_player");
    if (!player?.setOption) return false;
    const button = document.querySelector(".ytp-subtitles-button");
    const captionsWereEnabled = button?.getAttribute("aria-pressed") === "true";
    const previousTrack = player.getOption?.("captions", "track") || null;
    const sourceLanguageCode = track.sourceLanguageCode || track.languageCode;
    const sourceTrack = playerCaptionTracks().find((candidate) => candidate.languageCode === sourceLanguageCode &&
      (track.isTranslated || (candidate.kind === "asr") === Boolean(track.isAutomatic))) ||
      playerCaptionTracks().find((candidate) => candidate.languageCode === sourceLanguageCode);
    const playerTrack = sourceTrack ? { ...sourceTrack } : { languageCode: sourceLanguageCode };
    if (track.isTranslated) {
      playerTrack.translationLanguage = playerTranslationLanguages().find((language) => language.languageCode === track.languageCode) ||
        { languageCode: track.languageCode };
    }
    const selectInPlayer = () => {
      const currentPlayer = document.getElementById("movie_player");
      if (!currentPlayer?.setOption) return;
      currentPlayer.loadModule?.("captions");
      currentPlayer.setOption("captions", "track", playerTrack);
    };
    try {
      pendingPlayerTrack = { track, generation, previousTrack };
      subtitlesEnabledByExtension = !captionsWereEnabled;
      suppressPlayerCaptions();
      selectInPlayer();
    } catch (error) {
      pendingPlayerTrack = null;
      subtitlesEnabledByExtension = false;
      releasePlayerCaptionSuppression(false);
      console.error("[Transcript] No se pudo seleccionar la pista en el reproductor:", error);
      return false;
    }
    [1800, 4500].forEach((delay) => schedule(() => {
      if (!enabled || transcriptCompleted || pendingPlayerTrack?.generation !== generation) return;
      try { selectInPlayer(); } catch (error) {
        console.debug("[Transcript] Reintento de pista pendiente:", error);
      }
    }, delay));
    schedule(() => {
      if (pendingPlayerTrack?.generation !== generation || transcriptCompleted) return;
      post({ type: "YT_TRANSCRIPT_ERROR", message: "YouTube no devolvió la pista de subtítulos seleccionada." });
      restoreSubtitleState();
    }, 12000);
    return true;
  }

  async function processTimedTextUrl(url, options = {}) {
    const { force = false, selectedTrackId = null, generation = requestGeneration, silentFailure = false, ignoreRateLimit = false } = options;
    if (!enabled || (!force && processedUrls.has(url)) || (!force && transcriptCompleted)) return false;
    if (!force && activeFetchController) return false;
    if (generation !== requestGeneration) return false;

    if (!ignoreRateLimit && Date.now() < rateLimitedUntil) {
      if (!silentFailure) post({
        type: "YT_TRANSCRIPT_ERROR",
        message: "YouTube ha limitado temporalmente las peticiones de subtítulos. Espera unos segundos antes de cambiar de idioma.",
      });
      return false;
    }

    const requestedVideoId = new URL(url).searchParams.get("v");
    if (requestedVideoId && currentVideoId && requestedVideoId !== currentVideoId) return false;

    processedUrls.add(url);
    if (silentFailure) silentObservedUrls.add(url);
    lastFailureKind = null;
    const videoIdAtDetection = currentVideoId;
    let controller = null;
    try {
      if (force) activeFetchController?.abort();
      controller = new AbortController();
      activeFetchController = controller;
      const response = await fetch(url, { credentials: "include", signal: controller.signal });
      const text = await response.text();
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after"));
        rateLimitedUntil = Date.now() + (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 30000);
        lastFailureKind = "rate-limit";
        throw new Error("HTTP 429: YouTube ha limitado temporalmente las peticiones de subtítulos");
      }
      if (!response.ok) {
        lastFailureKind = "http";
        throw new Error(`HTTP ${response.status}`);
      }
      if (!text.trim()) {
        lastFailureKind = "empty";
        throw new Error("YouTube devolvió una respuesta vacía para esta pista");
      }
      if (!text.trimStart().startsWith("{")) throw new Error("La respuesta no parece JSON");

      if (!window.YTXTranscriptParser) throw new Error("El parser de transcripción no está disponible");
      const { cues, blocks } = window.YTXTranscriptParser.parseJson3(JSON.parse(text));
      if (!cues.length) throw new Error("La transcripción extraída está vacía");
      if (videoIdAtDetection !== currentVideoId || generation !== requestGeneration) return false;

      transcriptCompleted = true;
      if (!availableTracks.length) collectTracks();
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
      const key = cacheKey(currentVideoId, lastReadyPayload.selectedTrackId);
      if (key) transcriptCache.set(key, lastReadyPayload);
      post(lastReadyPayload);
      restoreSubtitleState();
      return true;
    } catch (error) {
      if (error?.name === "AbortError" || generation !== requestGeneration) return false;
      if (!silentFailure) console.error("[Transcript] Error:", error);
      if (!silentFailure && videoIdAtDetection === currentVideoId) {
        post({ type: "YT_TRANSCRIPT_ERROR", message: String(error.message || error) });
        restoreSubtitleState();
      }
      return false;
    } finally {
      if (activeFetchController === controller) activeFetchController = null;
    }
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.name.includes("/api/timedtext")) continue;
      if (silentObservedUrls.delete(entry.name)) continue;
      const pending = pendingPlayerTrack;
      if (pending && trackMatchesUrl(pending.track, entry.name)) {
        processTimedTextUrl(entry.name, {
          force: true,
          selectedTrackId: pending.track.id,
          generation: pending.generation,
          ignoreRateLimit: true,
        });
      } else {
        processTimedTextUrl(entry.name);
      }
    }
  });

  function startObserver() {
    if (observerActive) return;
    observer.observe(observerStarted ? { type: "resource" } : { type: "resource", buffered: true });
    observerActive = true;
    observerStarted = true;
  }

  function stopBackgroundWork() {
    requestGeneration += 1;
    activeFetchController?.abort();
    activeFetchController = null;
    if (buttonTimer) clearInterval(buttonTimer);
    buttonTimer = null;
    pendingTimers.forEach((timer) => clearTimeout(timer));
    pendingTimers.clear();
    silentObservedUrls.clear();
    observer.disconnect();
    observerActive = false;
    restoreSubtitleState();
  }

  async function waitForCurrentVideoTracks(generation, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (enabled && generation === requestGeneration && Date.now() < deadline) {
      const responseVideoId = playerResponseVideoId();
      const tracks = playerCaptionTracks();
      if ((!responseVideoId || responseVideoId === currentVideoId) && tracks.length) return collectTracks();
      await new Promise((resolve) => schedule(resolve, 250));
    }
    return [];
  }

  async function loadTrackDirectly(track, generation) {
    let currentTrack = track;
    for (const delay of [0, 1200, 3000]) {
      if (delay) await new Promise((resolve) => schedule(resolve, delay));
      if (!enabled || generation !== requestGeneration) return false;
      if (delay) {
        const refreshedTracks = collectTracks();
        currentTrack = refreshedTracks.find((candidate) => candidate.id === track.id) ||
          refreshedTracks.find((candidate) => candidate.languageCode === track.languageCode &&
            Boolean(candidate.isTranslated) === Boolean(track.isTranslated)) || currentTrack;
      }
      const loaded = await processTimedTextUrl(json3Url(currentTrack.baseUrl), {
        force: true, selectedTrackId: currentTrack.id, generation, silentFailure: true,
      });
      if (loaded) return true;
      if (lastFailureKind === "rate-limit") return false;
    }
    return false;
  }

  async function requestTranscript(force = false) {
    if (!enabled) return;
    startObserver();
    const nextVideoId = videoIdFromLocation();
    if (!force && nextVideoId && nextVideoId === currentVideoId && (transcriptCompleted || activeFetchController)) return;

    if (!force && lastReadyPayload?.videoId === nextVideoId) {
      currentVideoId = nextVideoId;
      transcriptCompleted = true;
      post(lastReadyPayload);
      return;
    }

    requestGeneration += 1;
    const generation = requestGeneration;
    if (currentVideoId && nextVideoId !== currentVideoId) transcriptCache.clear();
    currentVideoId = nextVideoId;
    transcriptCompleted = false;
    processedUrls.clear();
    subtitlesEnabledByExtension = false;
    post({ type: "YT_TRANSCRIPT_LOADING" });

    // En navegaciones SPA, yt-navigate-finish puede llegar antes de que el reproductor
    // haya sustituido los datos del vídeo anterior. Esperamos la respuesta correcta.
    const tracks = await waitForCurrentVideoTracks(generation);
    if (generation !== requestGeneration || !enabled) return;
    const selected = preferredTrack(tracks);
    if (selected) {
      if (restoreCachedTranscript(selected.id)) return;
      const loaded = await loadTrackDirectly(selected, generation);
      if (loaded) return;
      if (generation !== requestGeneration || lastFailureKind === "rate-limit") return;
      // Si la URL directa aún no está habilitada, pedimos al propio reproductor que
      // seleccione la pista. Esto reproduce el camino que antes exigía pulsar CC.
      post({ type: "YT_TRANSCRIPT_ERROR", message: "YouTube no devolvió datos para esta pista de subtítulos." });
      return;
    }

    post({ type: "YT_TRANSCRIPT_UNAVAILABLE", videoId: currentVideoId });
    return;

    let attempts = 0;
    if (buttonTimer) clearInterval(buttonTimer);
    buttonTimer = setInterval(() => {
      if (generation !== requestGeneration || transcriptCompleted) {
        clearInterval(buttonTimer);
        buttonTimer = null;
        return;
      }

      attempts += 1;
      const button = document.querySelector(".ytp-subtitles-button");
      if (button) {
        clearInterval(buttonTimer);
        buttonTimer = null;
        const alreadyEnabled = button.getAttribute("aria-pressed") === "true";
        suppressPlayerCaptions();
        if (alreadyEnabled) {
          button.click();
          schedule(() => {
            if (generation === requestGeneration && !transcriptCompleted) button.click();
          }, 120);
        } else {
          subtitlesEnabledByExtension = true;
          button.click();
        }

        schedule(() => {
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
        buttonTimer = null;
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
    if (!enabled) {
      stopBackgroundWork();
      return;
    }
    ensureNativeCaptionsAreOff();
    if (event.data.selectTrackId) {
      const selected = availableTracks.find((track) => track.id === event.data.selectTrackId) || collectTracks().find((track) => track.id === event.data.selectTrackId);
      if (enabled && selected) {
        requestGeneration += 1;
        const generation = requestGeneration;
        activeFetchController?.abort();
        if (restoreCachedTranscript(selected.id)) return;
        transcriptCompleted = false;
        post({ type: "YT_TRANSCRIPT_LOADING" });
        processTimedTextUrl(json3Url(selected.baseUrl), {
          force: true,
          selectedTrackId: selected.id,
          generation,
          silentFailure: true,
        }).then((loaded) => {
          if (!loaded && generation === requestGeneration && enabled) {
            post({ type: "YT_TRANSCRIPT_ERROR", message: "YouTube no permitió seleccionar esta pista de subtítulos." });
          }
        });
      }
      return;
    }
    startObserver();
    requestTranscript();
  });

  window.addEventListener("yt-navigate-finish", () => requestTranscript());
})();
