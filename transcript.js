(() => {
  if (window.__ytTranscriptContentLoaded) return;
  window.__ytTranscriptContentLoaded = true;

  const settings = { enabled: true, mode: "full" };
  let ui = null;
  let transcriptData = null;
  let progressiveTimer = null;
  let renderedCueCount = 0;

  function isWatchPage() {
    return location.pathname === "/watch" && new URL(location.href).searchParams.has("v");
  }

  function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
  }

  function createPanel() {
    const existing = document.getElementById("yt-transcript-panel");
    if (existing) {
      return {
        panel: existing,
        title: existing.querySelector("[data-transcript-title]"),
        content: existing.querySelector("[data-transcript-content]"),
        copyButton: existing.querySelector("[data-copy-transcript]"),
      };
    }

    const panel = document.createElement("aside");
    panel.id = "yt-transcript-panel";
    Object.assign(panel.style, {
      position: "fixed",
      top: "60px",
      right: "0",
      width: "400px",
      height: "calc(100vh - 60px)",
      boxSizing: "border-box",
      background: "rgba(15, 15, 15, 0.97)",
      color: "white",
      padding: "14px",
      overflowY: "auto",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      lineHeight: "1.45",
      zIndex: "99999",
      boxShadow: "-4px 0 14px rgba(0, 0, 0, .35)",
    });

    const header = document.createElement("div");
    Object.assign(header.style, {
      position: "sticky",
      top: "-14px",
      display: "grid",
      gridTemplateColumns: "1fr auto auto",
      alignItems: "center",
      gap: "8px",
      margin: "-14px -14px 12px",
      padding: "12px 14px",
      background: "#0f0f0f",
      borderBottom: "1px solid #444",
      zIndex: "1",
    });

    const title = document.createElement("strong");
    title.dataset.transcriptTitle = "";
    title.textContent = "Cargando transcripción…";

    const copyButton = document.createElement("button");
    copyButton.dataset.copyTranscript = "";
    copyButton.textContent = "Copiar todo";
    copyButton.title = "Copiar toda la transcripción";
    Object.assign(copyButton.style, {
      border: "0",
      borderRadius: "5px",
      padding: "7px 9px",
      background: "#333",
      color: "white",
      cursor: "pointer",
      fontSize: "12px",
    });
    copyButton.addEventListener("click", async () => {
      if (!transcriptData?.cues?.length) return;
      const text = transcriptData.cues.map((cue) => cue.text).join(" ");
      await navigator.clipboard.writeText(text);
      copyButton.textContent = "Copiado";
      setTimeout(() => { copyButton.textContent = "Copiar todo"; }, 1200);
    });

    const minimize = document.createElement("button");
    minimize.textContent = "—";
    minimize.title = "Minimizar o restaurar";
    Object.assign(minimize.style, {
      border: "0",
      borderRadius: "5px",
      width: "30px",
      height: "30px",
      background: "#333",
      color: "white",
      cursor: "pointer",
    });

    let minimized = false;
    minimize.addEventListener("click", () => {
      minimized = !minimized;
      panel.style.height = minimized ? "54px" : "calc(100vh - 60px)";
      panel.style.overflowY = minimized ? "hidden" : "auto";
      minimize.textContent = minimized ? "+" : "—";
    });

    const content = document.createElement("div");
    content.dataset.transcriptContent = "";
    content.style.userSelect = "text";
    content.textContent = "Buscando una pista de subtítulos…";
    content.addEventListener("copy", (event) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

      const selectedText = selection.toString().replace(/\s+/g, " ").trim();
      event.clipboardData.setData("text/plain", selectedText);
      event.preventDefault();
    });

    header.append(title, copyButton, minimize);
    panel.append(header, content);
    document.body.appendChild(panel);
    return { panel, title, content, copyButton };
  }

  function removePanel() {
    stopProgressiveMode();
    document.getElementById("yt-transcript-panel")?.remove();
    ui = null;
  }

  function ensurePanel() {
    if (!settings.enabled || !isWatchPage()) {
      removePanel();
      return false;
    }
    ui = createPanel();
    return true;
  }

  function showMessage(title, message) {
    if (!ensurePanel()) return;
    ui.title.textContent = title;
    ui.copyButton.style.display = "none";
    ui.content.replaceChildren();
    const text = document.createElement("p");
    text.textContent = message;
    ui.content.appendChild(text);
  }

  function createCueRow(cue) {
    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "grid",
      gridTemplateColumns: "48px 1fr",
      gap: "8px",
      padding: "6px 4px",
      borderRadius: "4px",
      alignItems: "start",
      userSelect: "none",
    });
    row.addEventListener("mouseenter", () => { row.style.background = "#292929"; });
    row.addEventListener("mouseleave", () => { row.style.background = "transparent"; });

    const time = document.createElement("button");
    time.type = "button";
    time.textContent = formatTime(cue.startMs);
    time.title = "Ir a este momento";
    Object.assign(time.style, {
      padding: "0",
      border: "0",
      background: "transparent",
      color: "#3ea6ff",
      cursor: "pointer",
      font: "inherit",
      textAlign: "left",
      userSelect: "none",
    });
    time.setAttribute("aria-label", `Ir al minuto ${formatTime(cue.startMs)}`);
    time.addEventListener("click", () => {
      const video = document.querySelector("video");
      if (video) video.currentTime = cue.startMs / 1000;
    });

    const text = document.createElement("span");
    text.textContent = cue.text;
    text.style.userSelect = "text";
    text.style.cursor = "text";

    row.append(time, text);
    return row;
  }

  function setTranscriptTitle() {
    const automatic = transcriptData?.isAutomatic ? " · automática" : "";
    const mode = settings.mode === "progressive" ? " · progresiva" : "";
    ui.title.textContent = `Transcripción · ${transcriptData?.languageName || ""}${automatic}${mode}`;
    ui.copyButton.style.display = "block";
  }

  function renderFullTranscript() {
    stopProgressiveMode();
    if (!ensurePanel() || !transcriptData) return;
    setTranscriptTitle();
    ui.content.replaceChildren();
    const fragment = document.createDocumentFragment();
    transcriptData.cues.forEach((cue) => fragment.appendChild(createCueRow(cue)));
    ui.content.appendChild(fragment);
  }

  function updateProgressiveTranscript() {
    if (!ui || !transcriptData || settings.mode !== "progressive") return;
    const video = document.querySelector("video");
    if (!video) return;
    const currentMs = video.currentTime * 1000;
    const targetCount = transcriptData.cues.findIndex((cue) => cue.startMs > currentMs);
    const count = targetCount === -1 ? transcriptData.cues.length : targetCount;

    if (count < renderedCueCount) {
      ui.content.replaceChildren();
      renderedCueCount = 0;
    }
    if (count === renderedCueCount) return;

    const fragment = document.createDocumentFragment();
    for (let index = renderedCueCount; index < count; index += 1) {
      fragment.appendChild(createCueRow(transcriptData.cues[index]));
    }
    ui.content.appendChild(fragment);
    renderedCueCount = count;
    ui.panel.scrollTop = ui.panel.scrollHeight;
  }

  function startProgressiveMode() {
    stopProgressiveMode();
    if (!ensurePanel() || !transcriptData) return;
    setTranscriptTitle();
    ui.content.replaceChildren();
    renderedCueCount = 0;
    updateProgressiveTranscript();
    progressiveTimer = setInterval(updateProgressiveTranscript, 300);
  }

  function stopProgressiveMode() {
    if (progressiveTimer) clearInterval(progressiveTimer);
    progressiveTimer = null;
  }

  function renderCurrentMode() {
    if (!transcriptData) return;
    if (settings.mode === "progressive") startProgressiveMode();
    else renderFullTranscript();
  }

  function sendControl() {
    window.postMessage({
      source: "YT_TRANSCRIPT_CONTROL",
      enabled: settings.enabled && isWatchPage(),
    }, "*");
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "YT_TRANSCRIPT_EXTENSION") return;
    if (!settings.enabled || !isWatchPage()) return;

    switch (event.data.type) {
      case "YT_TRANSCRIPT_LOADING":
        transcriptData = null;
        showMessage("Cargando transcripción…", "Buscando una pista de subtítulos…");
        break;
      case "YT_TRANSCRIPT_READY":
        transcriptData = event.data;
        renderCurrentMode();
        break;
      case "YT_TRANSCRIPT_UNAVAILABLE":
        showMessage("Sin transcripción", "Este vídeo no ofrece ninguna pista de subtítulos.");
        break;
      case "YT_TRANSCRIPT_ERROR":
        showMessage("No se pudo cargar", event.data.message || "Ha ocurrido un error desconocido.");
        break;
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.transcriptEnabled) settings.enabled = changes.transcriptEnabled.newValue;
    if (changes.transcriptMode) settings.mode = changes.transcriptMode.newValue;

    if (!settings.enabled) removePanel();
    else if (transcriptData) renderCurrentMode();
    else ensurePanel();
    sendControl();
  });

  window.addEventListener("yt-navigate-finish", () => {
    transcriptData = null;
    if (settings.enabled && isWatchPage()) {
      showMessage("Cargando transcripción…", "Buscando una pista de subtítulos…");
    } else {
      removePanel();
    }
    sendControl();
  });

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  script.onload = () => {
    script.remove();
    chrome.storage.local.get({ transcriptEnabled: true, transcriptMode: "full" }, (stored) => {
      settings.enabled = stored.transcriptEnabled;
      settings.mode = stored.transcriptMode;
      if (settings.enabled && isWatchPage()) ensurePanel();
      sendControl();
    });
  };
  (document.head || document.documentElement).appendChild(script);
})();
