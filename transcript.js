(() => {
  if (window.__ytTranscriptContentLoaded) return;
  window.__ytTranscriptContentLoaded = true;

  const settings = { enabled: true, mode: "full" };
  let ui = null;
  let transcriptData = null;
  let progressiveTimer = null;
  let renderedCueCount = 0;
  let activeCueIndex = -1;

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

  function addResizeHandles(panel) {
    const handles = [
      { edge: "left", cursor: "ew-resize", style: { left: "-3px", top: "12px", bottom: "12px", width: "7px" } },
      { edge: "right", cursor: "ew-resize", style: { right: "-3px", top: "12px", bottom: "12px", width: "7px" } },
      { edge: "top", cursor: "ns-resize", style: { top: "-3px", left: "12px", right: "12px", height: "7px" } },
      { edge: "bottom", cursor: "ns-resize", style: { bottom: "-3px", left: "12px", right: "12px", height: "7px" } },
    ];

    handles.forEach(({ edge, cursor, style }) => {
      const handle = document.createElement("div");
      Object.assign(handle.style, {
        position: "absolute",
        cursor,
        zIndex: "3",
        ...style,
      });

      handle.addEventListener("mousedown", (event) => {
        event.preventDefault();
        const startX = event.clientX;
        const startY = event.clientY;
        const rect = panel.getBoundingClientRect();
        panel.style.left = `${rect.left}px`;
        panel.style.right = "auto";

        const onMove = (moveEvent) => {
          if (edge === "left") {
            const nextLeft = Math.max(8, Math.min(rect.right - 300, moveEvent.clientX));
            panel.style.left = `${nextLeft}px`;
            panel.style.width = `${Math.min(window.innerWidth * 0.7, rect.right - nextLeft)}px`;
          } else if (edge === "right") {
            panel.style.width = `${Math.max(300, Math.min(window.innerWidth - rect.left - 8, rect.width + moveEvent.clientX - startX))}px`;
          } else if (edge === "bottom") {
            panel.style.height = `${Math.max(130, Math.min(window.innerHeight - rect.top - 12, rect.height + moveEvent.clientY - startY))}px`;
          } else {
            const nextTop = Math.max(12, Math.min(rect.bottom - 130, rect.top + moveEvent.clientY - startY));
            panel.style.top = `${nextTop}px`;
            panel.style.height = `${rect.bottom - nextTop}px`;
          }
        };

        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          document.body.style.userSelect = "";
        };

        document.body.style.userSelect = "none";
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });

      panel.appendChild(handle);
    });
  }

  function makePanelDraggable(panel, header) {
    header.style.cursor = "move";
    header.addEventListener("mousedown", (event) => {
      if (event.button !== 0 || event.target.closest("button")) return;

      event.preventDefault();
      const rect = panel.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      panel.style.left = `${rect.left}px`;
      panel.style.right = "auto";

      const onMove = (moveEvent) => {
        const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
        const maxTop = Math.max(8, window.innerHeight - 58);
        panel.style.left = `${Math.max(8, Math.min(maxLeft, moveEvent.clientX - offsetX))}px`;
        panel.style.top = `${Math.max(8, Math.min(maxTop, moveEvent.clientY - offsetY))}px`;
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.userSelect = "";
      };

      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function setupAdaptiveHeader(panel, header, title, copyButton, minimize) {
    title.dataset.fullTitle = title.textContent;

    const update = () => {
      const rect = panel.getBoundingClientRect();
      const compact = rect.height < 340 || rect.width < 360;
      panel.dataset.compactHeader = String(compact);
      header.style.padding = compact ? "7px 10px" : "14px 16px 12px";
      header.style.marginBottom = compact ? "8px" : "14px";
      title.style.fontSize = compact ? "12px" : "15px";
      title.textContent = compact ? "Transcripción" : title.dataset.fullTitle;
      copyButton.textContent = compact ? "⧉" : "Copiar todo";
      copyButton.title = "Copiar toda la transcripción";
      copyButton.style.width = compact ? "27px" : "auto";
      copyButton.style.height = compact ? "27px" : "auto";
      copyButton.style.padding = compact ? "0" : "7px 10px";
      minimize.style.width = compact ? "27px" : "30px";
      minimize.style.height = compact ? "27px" : "30px";
    };

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(panel);
    panel.__transcriptResizeObserver = resizeObserver;
    update();
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
      top: "72px",
      right: "16px",
      width: "420px",
      height: "calc(100vh - 88px)",
      minWidth: "300px",
      minHeight: "130px",
      maxWidth: "70vw",
      maxHeight: "calc(100vh - 24px)",
      boxSizing: "border-box",
      background: "rgba(30, 30, 34, 0.84)",
      backdropFilter: "blur(18px) saturate(135%)",
      color: "#f4f4f5",
      padding: "16px",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      fontFamily: "Inter, Roboto, Arial, sans-serif",
      fontSize: "14px",
      lineHeight: "1.55",
      zIndex: "99999",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      borderRadius: "16px",
      boxShadow: "0 18px 48px rgba(0, 0, 0, .32), 0 2px 8px rgba(0, 0, 0, .2)",
    });

    const header = document.createElement("div");
    Object.assign(header.style, {
      position: "relative",
      display: "grid",
      gridTemplateColumns: "1fr auto auto",
      alignItems: "center",
      gap: "8px",
      margin: "-16px -16px 14px",
      padding: "14px 16px 12px",
      background: "rgba(30, 30, 34, 0.9)",
      backdropFilter: "blur(18px)",
      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "16px 16px 0 0",
      zIndex: "1",
      flexShrink: "0",
    });

    const title = document.createElement("strong");
    title.dataset.transcriptTitle = "";
    title.textContent = "Cargando transcripción…";
    Object.assign(title.style, {
      fontSize: "15px",
      fontWeight: "650",
      letterSpacing: "-0.01em",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });

    const copyButton = document.createElement("button");
    copyButton.dataset.copyTranscript = "";
    copyButton.textContent = "Copiar todo";
    copyButton.title = "Copiar toda la transcripción";
    Object.assign(copyButton.style, {
      border: "0",
      borderRadius: "8px",
      padding: "7px 10px",
      background: "rgba(255, 255, 255, 0.1)",
      color: "#e4e4e7",
      cursor: "pointer",
      fontSize: "11px",
      fontWeight: "600",
      transition: "background .18s ease, color .18s ease",
    });
    copyButton.addEventListener("mouseenter", () => { copyButton.style.background = "rgba(255,255,255,.18)"; });
    copyButton.addEventListener("mouseleave", () => { copyButton.style.background = "rgba(255,255,255,.1)"; });
    copyButton.addEventListener("click", async () => {
      if (!transcriptData?.cues?.length) return;
      const text = transcriptData.cues.map((cue) => cue.text).join(" ");
      await navigator.clipboard.writeText(text);
      copyButton.textContent = "✓";
      setTimeout(() => {
        copyButton.textContent = panel.dataset.compactHeader === "true" ? "⧉" : "Copiar todo";
      }, 1200);
    });

    const minimize = document.createElement("button");
    minimize.textContent = "—";
    minimize.title = "Minimizar o restaurar";
    Object.assign(minimize.style, {
      border: "0",
      borderRadius: "8px",
      width: "30px",
      height: "30px",
      background: "rgba(255, 255, 255, 0.1)",
      color: "#d4d4d8",
      cursor: "pointer",
      transition: "background .18s ease, color .18s ease",
    });
    minimize.addEventListener("mouseenter", () => { minimize.style.background = "rgba(255,255,255,.18)"; });
    minimize.addEventListener("mouseleave", () => { minimize.style.background = "rgba(255,255,255,.1)"; });

    let minimized = false;
    let previousHeight = panel.style.height;
    minimize.addEventListener("click", () => {
      minimized = !minimized;
      if (minimized) previousHeight = `${panel.getBoundingClientRect().height}px`;
      panel.style.minHeight = minimized ? "58px" : "130px";
      panel.style.height = minimized ? "58px" : previousHeight;
      content.style.display = minimized ? "none" : "block";
      minimize.textContent = minimized ? "+" : "—";
    });

    const content = document.createElement("div");
    content.dataset.transcriptContent = "";
    Object.assign(content.style, {
      userSelect: "text",
      flex: "1",
      minHeight: "0",
      overflowY: "auto",
      paddingRight: "3px",
      scrollbarWidth: "thin",
      scrollbarColor: "rgba(255,255,255,.22) transparent",
    });
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
    addResizeHandles(panel);
    makePanelDraggable(panel, header);
    (document.fullscreenElement || document.body).appendChild(panel);
    setupAdaptiveHeader(panel, header, title, copyButton, minimize);
    return { panel, title, content, copyButton };
  }

  function removePanel() {
    stopProgressiveMode();
    const panel = document.getElementById("yt-transcript-panel");
    panel?.__transcriptResizeObserver?.disconnect();
    panel?.remove();
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
    ui.title.dataset.fullTitle = title;
    ui.title.title = title;
    ui.title.textContent = ui.panel.dataset.compactHeader === "true" ? "Transcripción" : title;
    ui.copyButton.style.display = "none";
    ui.content.replaceChildren();
    const text = document.createElement("p");
    text.textContent = message;
    ui.content.appendChild(text);
  }

  function createCueRow(cue, index) {
    const row = document.createElement("div");
    row.dataset.cueIndex = String(index);
    Object.assign(row.style, {
      display: "grid",
      gridTemplateColumns: "44px 1fr",
      gap: "10px",
      padding: "9px 10px",
      marginBottom: "2px",
      borderLeft: "3px solid transparent",
      borderRadius: "8px",
      alignItems: "start",
      userSelect: "none",
      transition: "background .18s ease, border-color .18s ease",
    });
    row.addEventListener("mouseenter", () => {
      if (row.dataset.active !== "true") row.style.background = "rgba(255,255,255,.07)";
      time.style.color = "#a1a1aa";
    });
    row.addEventListener("mouseleave", () => applyCueState(row, row.dataset.active === "true"));

    const time = document.createElement("button");
    time.type = "button";
    time.textContent = formatTime(cue.startMs);
    time.title = "Ir a este momento";
    Object.assign(time.style, {
      padding: "0",
      border: "0",
      background: "transparent",
      color: "#71717a",
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: "11px",
      fontWeight: "550",
      lineHeight: "1.7",
      textAlign: "left",
      userSelect: "none",
      transition: "color .18s ease",
    });
    time.setAttribute("aria-label", `Ir al minuto ${formatTime(cue.startMs)}`);
    time.addEventListener("mouseenter", () => {
      time.style.color = "#5db5ff";
      time.style.textDecoration = "underline";
      time.style.textUnderlineOffset = "3px";
    });
    time.addEventListener("mouseleave", () => {
      time.style.textDecoration = "none";
      time.style.color = row.dataset.active === "true" ? "#5db5ff" : "#71717a";
    });
    time.addEventListener("click", () => {
      const video = document.querySelector("video");
      if (video) video.currentTime = cue.startMs / 1000;
    });

    const text = document.createElement("span");
    text.textContent = cue.text;
    Object.assign(text.style, {
      userSelect: "text",
      cursor: "text",
      color: "#e4e4e7",
      fontSize: "13.5px",
      lineHeight: "1.55",
    });

    row.append(time, text);
    return row;
  }

  function applyCueState(row, active) {
    if (!row) return;
    row.dataset.active = String(active);
    row.style.background = active ? "rgba(62, 166, 255, 0.13)" : "transparent";
    row.style.borderLeftColor = active ? "#3ea6ff" : "transparent";
    const time = row.querySelector("button");
    if (time) time.style.color = active ? "#5db5ff" : "#71717a";
  }

  function updateActiveCue() {
    if (!ui || !transcriptData?.cues?.length) return;
    const video = document.querySelector("video");
    if (!video) return;

    const currentMs = video.currentTime * 1000;
    const nextIndex = transcriptData.cues.findIndex((cue) => cue.startMs > currentMs);
    const nextActive = nextIndex === 0 ? -1 : nextIndex === -1 ? transcriptData.cues.length - 1 : nextIndex - 1;
    if (nextActive === activeCueIndex) return;

    applyCueState(ui.content.querySelector(`[data-cue-index="${activeCueIndex}"]`), false);
    activeCueIndex = nextActive;
    applyCueState(ui.content.querySelector(`[data-cue-index="${activeCueIndex}"]`), true);
  }

  function setTranscriptTitle() {
    const automatic = transcriptData?.isAutomatic ? " · automática" : "";
    const mode = settings.mode === "progressive" ? " · progresiva" : "";
    const fullTitle = `Transcripción · ${transcriptData?.languageName || ""}${automatic}${mode}`;
    ui.title.dataset.fullTitle = fullTitle;
    ui.title.title = fullTitle;
    ui.title.textContent = ui.panel.dataset.compactHeader === "true" ? "Transcripción" : fullTitle;
    ui.copyButton.style.display = "block";
  }

  function renderFullTranscript() {
    stopProgressiveMode();
    if (!ensurePanel() || !transcriptData) return;
    setTranscriptTitle();
    ui.content.replaceChildren();
    const fragment = document.createDocumentFragment();
    transcriptData.cues.forEach((cue, index) => fragment.appendChild(createCueRow(cue, index)));
    ui.content.appendChild(fragment);
    activeCueIndex = -1;
    updateActiveCue();
    progressiveTimer = setInterval(updateActiveCue, 300);
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
    if (count === renderedCueCount) {
      updateActiveCue();
      return;
    }

    const fragment = document.createDocumentFragment();
    for (let index = renderedCueCount; index < count; index += 1) {
      fragment.appendChild(createCueRow(transcriptData.cues[index], index));
    }
    ui.content.appendChild(fragment);
    renderedCueCount = count;
    updateActiveCue();
    ui.content.scrollTop = ui.content.scrollHeight;
  }

  function startProgressiveMode() {
    stopProgressiveMode();
    if (!ensurePanel() || !transcriptData) return;
    setTranscriptTitle();
    ui.content.replaceChildren();
    renderedCueCount = 0;
    activeCueIndex = -1;
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

  document.addEventListener("fullscreenchange", () => {
    const panel = document.getElementById("yt-transcript-panel");
    if (panel) (document.fullscreenElement || document.body).appendChild(panel);
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
