console.log("🎬 Transcript script loaded (top-line finalize mode)");

function createTranscriptPanel() {
  let panel = document.getElementById("yt-transcript-panel");
  if (panel) return panel;

  panel = document.createElement("div");
  Object.assign(panel, { id: "yt-transcript-panel" });
  Object.assign(panel.style, {
    position: "fixed",
    top: "60px",
    right: "0",
    width: "400px",
    height: "calc(100% - 60px)",
    background: "rgba(0,0,0,0.85)",
    color: "white",
    padding: "15px",
    overflowY: "auto",
    fontSize: "14px",
    lineHeight: "1.4",
    zIndex: "99999",
    whiteSpace: "pre-line",
    transition: "height .3s ease, padding .3s ease, opacity .3s ease",
  });

  // Botón minimizar/restaurar
  const btn = document.createElement("button");
  btn.textContent = "—";
  btn.title = "Minimizar / Restaurar";
  Object.assign(btn.style, {
    position: "absolute",
    top: "5px",
    right: "5px",
    background: "rgba(255,255,255,0.2)",
    color: "white",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    borderRadius: "5px",
    width: "30px",
    height: "30px",
    lineHeight: "20px",
    textAlign: "center",
  });

  const textBox = document.createElement("div");
  textBox.id = "yt-transcript-text";
  textBox.style.marginTop = "30px";
  textBox.innerHTML = "<b>🎧 Capturando subtítulos (línea superior finalizada)…</b>\n";

  let minimized = false;
  btn.addEventListener("click", () => {
    minimized = !minimized;
    if (minimized) {
      panel.style.height = "40px";
      panel.style.paddingTop = "30px";
      panel.style.overflowY = "hidden";
      panel.style.opacity = "0.6";
      btn.textContent = "+";
    } else {
      panel.style.height = "calc(100% - 60px)";
      panel.style.paddingTop = "15px";
      panel.style.overflowY = "auto";
      panel.style.opacity = "1";
      btn.textContent = "—";
    }
  });

  panel.appendChild(btn);
  panel.appendChild(textBox);
  document.body.appendChild(panel);
  return { panel, textBox };
}

// Lee las líneas visibles actuales desde el overlay de YouTube (hasta 2 líneas)
function getCurrentCaptionLines() {
  // Tomamos el contenedor que dibuja los subtítulos
  const container = document.querySelector(".ytp-caption-window-container");
  if (!container) return [];

  // innerText preserva saltos de línea visuales
  const raw = container.innerText || "";
  // partimos por saltos de línea y normalizamos
  const lines = raw
    .split("\n")
    .map(s => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // YouTube suele mostrar máx. 2 líneas; nos quedamos con las dos primeras
  return lines.slice(0, 2);
}

function startCaptionObserver() {
  const { panel, textBox } = createTranscriptPanel();

  let prevLines = [];        // líneas visibles en el tick anterior (arriba, abajo)
  let lastAppended = "";     // última línea “finalizada” que ya añadimos
  let lastMutationTs = 0;

  const appendFinalized = (line) => {
    if (!line || line === lastAppended) return;
    const el = document.createElement("div");
    el.textContent = line;
    textBox.appendChild(el);
    panel.scrollTop = panel.scrollHeight;
    lastAppended = line;
  };

  // Observa cambios en el overlay de subtítulos
  const observer = new MutationObserver(() => {
    // Throttle ligero para evitar ráfagas excesivas
    const now = Date.now();
    if (now - lastMutationTs < 80) return;
    lastMutationTs = now;

    const curr = getCurrentCaptionLines(); // [top, bottom] (si existen)

    // Regla clave:
    // - Añadimos SOLO la línea superior del frame anterior CUANDO YA NO ESTÉ en el frame actual.
    //   Eso indica que esa línea se “terminó” y YouTube la retiró (subió/quitó).
    if (prevLines.length > 0) {
      const prevTop = prevLines[0];

      // Si la línea superior anterior ya no está visible (ni arriba ni abajo), la damos por finalizada.
      const stillVisible = curr.includes(prevTop);

      if (!stillVisible && prevTop && prevTop !== lastAppended) {
        // Evita falsos positivos por microcambios (espacios, signos)
        const normalizedPrevTop = prevTop.replace(/\s+/g, " ").trim();
        appendFinalized(normalizedPrevTop);
      }
    }

    // Actualizamos el estado
    prevLines = curr;
  });

  const waitForContainer = setInterval(() => {
    const container = document.querySelector(".ytp-caption-window-container");
    if (container) {
      clearInterval(waitForContainer);
      observer.observe(container, { childList: true, subtree: true, characterData: true });
      console.log("✅ Top-line finalize mode ON");
      // Inicializa prevLines con el estado actual (no añadimos nada aún)
      prevLines = getCurrentCaptionLines();
    }
  }, 300);
}

startCaptionObserver();
