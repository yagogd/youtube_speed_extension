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
      const compact = rect.height < 340 || rect.width < 520;
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

    const speedControl = document.createElement("div");
    speedControl.className = "ytx-speed-control";

    const speedDownButton = document.createElement("button");
    speedDownButton.type = "button";
    speedDownButton.className = "ytx-speed-control__button";
    speedDownButton.textContent = "−";
    speedDownButton.title = "Reducir 0,25x";

    const speedInput = document.createElement("input");
    speedInput.className = "ytx-speed-control__input";
    speedInput.type = "number";
    speedInput.min = "0.1";
    speedInput.step = "0.25";
    speedInput.value = "1";
    speedInput.title = "Velocidad del vídeo";

    const speedUpButton = document.createElement("button");
    speedUpButton.type = "button";
    speedUpButton.className = "ytx-speed-control__button";
    speedUpButton.textContent = "+";
    speedUpButton.title = "Aumentar 0,25x";

    const speedResetButton = document.createElement("button");
    speedResetButton.type = "button";
    speedResetButton.className = "ytx-speed-control__reset";
    speedResetButton.textContent = "1×";
    speedResetButton.title = "Restablecer a 1x";
    speedControl.append(speedDownButton, speedInput, speedUpButton, speedResetButton);

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

    const searchToggle = document.createElement("button");
    searchToggle.type = "button";
    searchToggle.className = "ytx-button ytx-button--search";
    searchToggle.textContent = "⌕";
    searchToggle.title = "Buscar en la transcripción";

    const bookmarkButton = document.createElement("button");
    bookmarkButton.type = "button";
    bookmarkButton.className = "ytx-button ytx-button--bookmark";
    bookmarkButton.textContent = "☆";
    bookmarkButton.title = "Guardar el momento actual";

    const notesToggle = document.createElement("button");
    notesToggle.type = "button";
    notesToggle.className = "ytx-button ytx-button--notes";
    notesToggle.textContent = "☷";
    notesToggle.title = "Marcadores de este vídeo";

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

    const searchBar = document.createElement("div");
    searchBar.className = "ytx-search";
    const searchInput = document.createElement("input");
    searchInput.className = "ytx-search__input";
    searchInput.type = "search";
    searchInput.placeholder = "Buscar en la transcripción…";
    searchInput.value = state.search.query;
    const searchCounter = document.createElement("span");
    searchCounter.className = "ytx-search__counter";
    searchCounter.textContent = "0/0";
    const searchPrevious = document.createElement("button");
    searchPrevious.type = "button";
    searchPrevious.className = "ytx-search__button";
    searchPrevious.textContent = "↑";
    searchPrevious.title = "Coincidencia anterior";
    const searchNext = document.createElement("button");
    searchNext.type = "button";
    searchNext.className = "ytx-search__button";
    searchNext.textContent = "↓";
    searchNext.title = "Coincidencia siguiente";
    const searchClose = document.createElement("button");
    searchClose.type = "button";
    searchClose.className = "ytx-search__button";
    searchClose.textContent = "×";
    searchClose.title = "Cerrar búsqueda";
    searchBar.append(searchInput, searchCounter, searchPrevious, searchNext, searchClose);

    const notesDrawer = document.createElement("section");
    notesDrawer.className = "ytx-notes";
    const notesHeading = document.createElement("strong");
    notesHeading.className = "ytx-notes__heading";
    notesHeading.textContent = "Marcadores de este vídeo";
    const notesList = document.createElement("div");
    notesList.className = "ytx-notes__list";
    notesDrawer.append(notesHeading, notesList);

    const noteEditor = document.createElement("section");
    noteEditor.className = "ytx-note-editor";
    const noteEditorHeading = document.createElement("div");
    noteEditorHeading.className = "ytx-note-editor__heading";
    const noteEditorTime = document.createElement("strong");
    const noteEditorText = document.createElement("span");
    noteEditorText.className = "ytx-note-editor__text";
    noteEditorHeading.append(noteEditorTime, noteEditorText);
    const noteEditorInput = document.createElement("textarea");
    noteEditorInput.className = "ytx-note-editor__input";
    noteEditorInput.placeholder = "Añade una nota opcional…";
    const noteEditorActions = document.createElement("div");
    noteEditorActions.className = "ytx-note-editor__actions";
    const noteEditorCancel = document.createElement("button");
    noteEditorCancel.className = "ytx-button";
    noteEditorCancel.textContent = "Cancelar";
    const noteEditorSave = document.createElement("button");
    noteEditorSave.className = "ytx-button ytx-note-editor__save";
    noteEditorSave.textContent = "Guardar";
    noteEditorActions.append(noteEditorCancel, noteEditorSave);
    noteEditor.append(noteEditorHeading, noteEditorInput, noteEditorActions);

    const headerActions = document.createElement("div");
    headerActions.className = "ytx-panel__actions";
    headerActions.append(searchToggle, bookmarkButton, notesToggle, collapseHeaderButton, copyButton, minimizeButton, closeButton);
    header.append(title, speedControl, headerActions);
    panel.append(header, searchBar, notesDrawer, noteEditor, content);
    (document.fullscreenElement || document.body).appendChild(panel);

    const ui = {
      panel,
      header,
      title,
      content,
      speedControl,
      speedInput,
      headerActions,
      searchToggle,
      searchBar,
      searchInput,
      searchCounter,
      searchPrevious,
      searchNext,
      searchClose,
      bookmarkButton,
      notesToggle,
      notesDrawer,
      notesList,
      noteEditor,
      noteEditorTime,
      noteEditorText,
      noteEditorInput,
      noteEditorCancel,
      noteEditorSave,
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
    ui.cleanups.push(ytx.search.attach(ui));
    ui.cleanups.push(ytx.notes.attach(ui));
    if (state.search.query) panel.classList.add("ytx-panel--search-open");

    const sendSpeed = (value) => {
      const rate = Number(value);
      if (!Number.isFinite(rate) || rate <= 0) return;
      const normalized = Math.round(rate * 100) / 100;
      speedInput.value = String(normalized);
      window.postMessage({ source: "YT_SPEED_CONTROL", rate: normalized }, "*");
    };
    const changeSpeed = (delta) => sendSpeed(Math.max(0.1, (Number(speedInput.value) || 1) + delta));
    const onSpeedDown = () => changeSpeed(-0.25);
    const onSpeedUp = () => changeSpeed(0.25);
    const onSpeedReset = () => sendSpeed(1);
    const onSpeedInputKey = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        sendSpeed(speedInput.value);
        speedInput.blur();
      }
    };
    const onSpeedState = (event) => {
      if (event.source !== window || event.data?.source !== "YT_SPEED_STATE") return;
      speedInput.value = String(Math.round(Number(event.data.rate) * 100) / 100);
      speedControl.classList.toggle("ytx-speed-control--temporary", Boolean(event.data.temporary));
    };
    speedDownButton.addEventListener("click", onSpeedDown);
    speedUpButton.addEventListener("click", onSpeedUp);
    speedResetButton.addEventListener("click", onSpeedReset);
    speedInput.addEventListener("keydown", onSpeedInputKey);
    window.addEventListener("message", onSpeedState);
    ui.cleanups.push(() => speedDownButton.removeEventListener("click", onSpeedDown));
    ui.cleanups.push(() => speedUpButton.removeEventListener("click", onSpeedUp));
    ui.cleanups.push(() => speedResetButton.removeEventListener("click", onSpeedReset));
    ui.cleanups.push(() => speedInput.removeEventListener("keydown", onSpeedInputKey));
    ui.cleanups.push(() => window.removeEventListener("message", onSpeedState));
    chrome.storage.local.get({ lastSpeed: 1 }, (stored) => {
      if (state.ui === ui) speedInput.value = String(stored.lastSpeed || 1);
    });

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

    let previousScrollTop = content.scrollTop;
    const onContentScroll = () => {
      const distanceFromBottom = content.scrollHeight - content.scrollTop - content.clientHeight;
      if (content.scrollTop < previousScrollTop - 1) state.autoScrollEnabled = false;
      else if (distanceFromBottom <= 4) state.autoScrollEnabled = true;
      previousScrollTop = content.scrollTop;
    };
    content.addEventListener("scroll", onContentScroll, { passive: true });
    ui.cleanups.push(() => content.removeEventListener("scroll", onContentScroll));

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
