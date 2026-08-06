(() => {
  if (window.__ytTranscriptContentLoaded) return;
  window.__ytTranscriptContentLoaded = true;

  function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function createPanel() {
    const existing = document.getElementById("yt-transcript-panel");
    if (existing) {
      return {
        panel: existing,
        title: existing.querySelector("[data-transcript-title]"),
        content: existing.querySelector("[data-transcript-content]"),
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
      background: "rgba(15, 15, 15, 0.96)",
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
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      margin: "-14px -14px 12px",
      padding: "12px 14px",
      background: "#0f0f0f",
      borderBottom: "1px solid #444",
    });

    const title = document.createElement("strong");
    title.dataset.transcriptTitle = "";
    title.textContent = "Cargando transcripción…";

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
    content.textContent = "Buscando una pista de subtítulos…";

    header.append(title, minimize);
    panel.append(header, content);
    document.body.appendChild(panel);
    return { panel, title, content };
  }

  const ui = createPanel();

  function showMessage(title, message) {
    ui.title.textContent = title;
    ui.content.replaceChildren();
    const text = document.createElement("p");
    text.textContent = message;
    ui.content.appendChild(text);
  }

  function renderTranscript(data) {
    const automaticLabel = data.isAutomatic ? " · automática" : "";
    ui.title.textContent = `Transcripción · ${data.languageName}${automaticLabel}`;
    ui.content.replaceChildren();

    if (!data.cues.length) {
      showMessage("Transcripción vacía", "La pista existe, pero no contiene texto legible.");
      return;
    }

    const fragment = document.createDocumentFragment();
    data.cues.forEach((cue) => {
      const row = document.createElement("button");
      row.type = "button";
      Object.assign(row.style, {
        display: "grid",
        gridTemplateColumns: "46px 1fr",
        gap: "8px",
        width: "100%",
        padding: "6px 4px",
        border: "0",
        borderRadius: "4px",
        background: "transparent",
        color: "white",
        textAlign: "left",
        cursor: "pointer",
        font: "inherit",
      });

      const time = document.createElement("span");
      time.textContent = formatTime(cue.startMs);
      time.style.color = "#3ea6ff";

      const text = document.createElement("span");
      text.textContent = cue.text;

      row.addEventListener("mouseenter", () => { row.style.background = "#292929"; });
      row.addEventListener("mouseleave", () => { row.style.background = "transparent"; });
      row.addEventListener("click", () => {
        const video = document.querySelector("video");
        if (video) video.currentTime = cue.startMs / 1000;
      });

      row.append(time, text);
      fragment.appendChild(row);
    });

    ui.content.appendChild(fragment);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "YT_TRANSCRIPT_EXTENSION") return;

    switch (event.data.type) {
      case "YT_TRANSCRIPT_LOADING":
        showMessage("Cargando transcripción…", "Buscando una pista de subtítulos…");
        break;
      case "YT_TRANSCRIPT_READY":
        renderTranscript(event.data);
        break;
      case "YT_TRANSCRIPT_UNAVAILABLE":
        showMessage("Sin transcripción", "Este vídeo no ofrece ninguna pista de subtítulos.");
        break;
      case "YT_TRANSCRIPT_ERROR":
        showMessage("No se pudo cargar", event.data.message || "Ha ocurrido un error desconocido.");
        break;
    }
  });

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
})();
