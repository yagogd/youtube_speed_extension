(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const state = ytx.state;
  const PANEL_STORAGE_DEFAULTS = {
    transcriptPanelGeometry: null,
    transcriptPanelMinimized: false,
    transcriptHeaderCollapsed: false,
  };

  function applyStoredGeometry(panel, geometry) {
    if (!geometry) return null;
    const maxWidth = Math.max(300, Math.min(window.innerWidth * 0.7, window.innerWidth - 16));
    const width = Math.max(300, Math.min(maxWidth, Number(geometry.width) || 420));
    const maxHeight = Math.max(130, window.innerHeight - 24);
    const height = Math.max(130, Math.min(maxHeight, Number(geometry.height) || window.innerHeight - 88));
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, Number(geometry.left) || 8));
    const top = Math.max(8, Math.min(window.innerHeight - 58, Number(geometry.top) || 72));

    panel.style.left = `${left}px`;
    panel.style.right = "auto";
    panel.style.top = `${top}px`;
    panel.style.width = `${width}px`;
    panel.style.height = `${height}px`;
    return height;
  }

  function savePanelGeometry(panel, heightOverride) {
    const rect = panel.getBoundingClientRect();
    chrome.storage.local.set({
      transcriptPanelGeometry: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(heightOverride || rect.height),
      },
    });
  }

  function setTitle(text) {
    if (!state.ui) return;
    state.ui.title.dataset.fullTitle = text;
    state.ui.title.title = text;
    state.ui.title.textContent = state.ui.panel.classList.contains("ytx-panel--compact") ? "Transcripción" : text;
  }

  function setupAdaptiveHeader(ui) {
    const update = () => {
      const rect = ui.panel.getBoundingClientRect();
      const compact = rect.height < 340 || rect.width < 360;
      ui.panel.classList.toggle("ytx-panel--compact", compact);
      ui.title.textContent = compact ? "Transcripción" : ui.title.dataset.fullTitle;
      ui.copyButton.textContent = compact ? "⧉" : "Copiar todo";
    };
    const observer = new ResizeObserver(update);
    observer.observe(ui.panel);
    update();
    return () => observer.disconnect();
  }

  function createPanel() {
    const existing = document.getElementById("yt-transcript-panel");
    if (existing) return state.ui;

    const panel = document.createElement("aside");
    panel.id = "yt-transcript-panel";
    panel.className = "ytx-panel";

    const header = document.createElement("div");
    header.className = "ytx-panel__header";

    const title = document.createElement("strong");
    title.className = "ytx-panel__title";
    title.dataset.transcriptTitle = "";
    title.dataset.fullTitle = "Cargando transcripción…";
    title.textContent = title.dataset.fullTitle;

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "ytx-button ytx-button--copy";
    copyButton.dataset.copyTranscript = "";
    copyButton.textContent = "Copiar todo";
    copyButton.title = "Copiar toda la transcripción";

    const collapseHeaderButton = document.createElement("button");
    collapseHeaderButton.type = "button";
    collapseHeaderButton.className = "ytx-button ytx-button--collapse-header";
    collapseHeaderButton.textContent = "⌃";
    collapseHeaderButton.title = "Ocultar la cabecera";

    const minimizeButton = document.createElement("button");
    minimizeButton.type = "button";
    minimizeButton.className = "ytx-button ytx-button--minimize";
    minimizeButton.textContent = "—";
    minimizeButton.title = "Minimizar o restaurar";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "ytx-button ytx-button--close";
    closeButton.textContent = "×";
    closeButton.title = "Cerrar la transcripción";

    const content = document.createElement("div");
    content.className = "ytx-panel__content";
    content.dataset.transcriptContent = "";
    content.textContent = "Buscando una pista de subtítulos…";

    header.append(title, collapseHeaderButton, copyButton, minimizeButton, closeButton);
    panel.append(header, content);
    (document.fullscreenElement || document.body).appendChild(panel);

    const ui = {
      panel,
      header,
      title,
      content,
      collapseHeaderButton,
      copyButton,
      minimizeButton,
      closeButton,
      cleanups: [],
    };
    state.ui = ui;
    ui.cleanups.push(ytx.addResizeHandles(panel));
    ui.cleanups.push(ytx.makePanelDraggable(panel, header));
    ui.cleanups.push(setupAdaptiveHeader(ui));

    let minimized = false;
    let previousHeight = panel.getBoundingClientRect().height;
    const onMinimize = () => {
      minimized = !minimized;
      if (minimized) previousHeight = panel.getBoundingClientRect().height;
      panel.classList.toggle("ytx-panel--minimized", minimized);
      panel.style.minHeight = minimized ? "58px" : "130px";
      panel.style.height = minimized ? "58px" : `${previousHeight}px`;
      minimizeButton.textContent = minimized ? "+" : "—";
      chrome.storage.local.set({ transcriptPanelMinimized: minimized });
      savePanelGeometry(panel, previousHeight);
    };
    minimizeButton.addEventListener("click", onMinimize);
    ui.cleanups.push(() => minimizeButton.removeEventListener("click", onMinimize));

    let headerCollapsed = false;
    const onCollapseHeader = () => {
      headerCollapsed = !headerCollapsed;
      panel.classList.toggle("ytx-panel--header-collapsed", headerCollapsed);
      collapseHeaderButton.textContent = headerCollapsed ? "⌄" : "⌃";
      collapseHeaderButton.title = headerCollapsed ? "Mostrar la cabecera" : "Ocultar la cabecera";
      chrome.storage.local.set({ transcriptHeaderCollapsed: headerCollapsed });
    };
    collapseHeaderButton.addEventListener("click", onCollapseHeader);
    ui.cleanups.push(() => collapseHeaderButton.removeEventListener("click", onCollapseHeader));

    const onClose = () => chrome.storage.local.set({ transcriptEnabled: false });
    closeButton.addEventListener("click", onClose);
    ui.cleanups.push(() => closeButton.removeEventListener("click", onClose));

    const onCopyAll = async () => {
      const blocks = state.displayBlocks || [];
      if (!blocks.length) return;
      await navigator.clipboard.writeText(blocks.map((block) => block.text).join(" "));
      copyButton.textContent = "✓";
      setTimeout(() => {
        if (state.ui === ui) copyButton.textContent = panel.classList.contains("ytx-panel--compact") ? "⧉" : "Copiar todo";
      }, 1200);
    };
    copyButton.addEventListener("click", onCopyAll);
    ui.cleanups.push(() => copyButton.removeEventListener("click", onCopyAll));

    const onCopySelection = (event) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) return;
      event.clipboardData.setData("text/plain", selection.toString().replace(/\s+/g, " ").trim());
      event.preventDefault();
    };
    content.addEventListener("copy", onCopySelection);
    ui.cleanups.push(() => content.removeEventListener("copy", onCopySelection));

    const onGeometryChange = () => savePanelGeometry(panel, minimized ? previousHeight : undefined);
    panel.addEventListener("ytx:geometrychange", onGeometryChange);
    ui.cleanups.push(() => panel.removeEventListener("ytx:geometrychange", onGeometryChange));

    chrome.storage.local.get(PANEL_STORAGE_DEFAULTS, (stored) => {
      if (state.ui !== ui) return;
      previousHeight = applyStoredGeometry(panel, stored.transcriptPanelGeometry) || previousHeight;
      minimized = Boolean(stored.transcriptPanelMinimized);
      headerCollapsed = Boolean(stored.transcriptHeaderCollapsed);
      panel.classList.toggle("ytx-panel--minimized", minimized);
      panel.classList.toggle("ytx-panel--header-collapsed", headerCollapsed);
      panel.style.minHeight = minimized ? "58px" : "130px";
      panel.style.height = minimized ? "58px" : `${previousHeight}px`;
      minimizeButton.textContent = minimized ? "+" : "—";
      collapseHeaderButton.textContent = headerCollapsed ? "⌄" : "⌃";
      collapseHeaderButton.title = headerCollapsed ? "Mostrar la cabecera" : "Ocultar la cabecera";
    });
    return ui;
  }

  function removePanel() {
    ytx.sync?.stop();
    if (!state.ui) return;
    state.ui.cleanups.forEach((cleanup) => cleanup());
    state.ui.panel.remove();
    state.ui = null;
  }

  function ensurePanel() {
    if (!state.settings.enabled || !ytx.isWatchPage()) {
      removePanel();
      return null;
    }
    return state.ui || createPanel();
  }

  function showMessage(title, message) {
    const ui = ensurePanel();
    if (!ui) return;
    setTitle(title);
    ui.copyButton.hidden = true;
    const paragraph = document.createElement("p");
    paragraph.className = "ytx-panel__message";
    paragraph.textContent = message;
    ui.content.replaceChildren(paragraph);
  }

  ytx.panel = { create: createPanel, remove: removePanel, ensure: ensurePanel, setTitle, showMessage };
})();
