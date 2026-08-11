(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const state = ytx.state;
  const PANEL_STORAGE_DEFAULTS = {
    transcriptPanelGeometry: null,
    transcriptHeaderCollapsed: false,
  };
  const ICON_PATHS = {
    search: ['<circle cx="11" cy="11" r="7"/>', '<path d="m20 20-4-4"/>'],
    star: ['<path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2-4.6-4.4 6.3-.9Z"/>'],
    list: ['<path d="M8 6h13M8 12h13M8 18h13"/>', '<path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>'],
    chevronUp: ['<path d="m6 15 6-6 6 6"/>'],
    chevronDown: ['<path d="m6 9 6 6 6-6"/>'],
    close: ['<path d="m6 6 12 12M18 6 6 18"/>'],
    copy: ['<rect x="8" y="8" width="11" height="11" rx="2"/>', '<path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'],
    check: ['<path d="m5 12 4 4L19 6"/>'],
    edit: ['<path d="M12 20h9"/>', '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>'],
    trash: ['<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>'],
    arrowUp: ['<path d="m6 11 6-6 6 6M12 5v14"/>'],
    arrowDown: ['<path d="m6 13 6 6 6-6M12 19V5"/>'],
  };

  function setButtonIcon(button, name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("ytx-icon");
    svg.innerHTML = (ICON_PATHS[name] || []).join("");
    button.replaceChildren(svg);
  }

  function labelButton(button, label) {
    button.title = label;
    button.setAttribute("aria-label", label);
  }

  function applyAppearance() {
    const panel = state.ui?.panel;
    if (!panel) return;
    const appearance = state.appearance || {};
    const hex = /^#[0-9a-f]{6}$/i.test(appearance.background) ? appearance.background : "#1e1e22";
    const red = parseInt(hex.slice(1, 3), 16);
    const green = parseInt(hex.slice(3, 5), 16);
    const blue = parseInt(hex.slice(5, 7), 16);
    const opacity = Math.min(1, Math.max(0.35, Number(appearance.opacity) || 0.84));
    panel.style.setProperty("--ytx-panel-background", `rgba(${red}, ${green}, ${blue}, ${opacity})`);
    panel.style.setProperty("--ytx-panel-text", appearance.text || "#e4e4e7");
    panel.style.setProperty("--ytx-panel-font", appearance.font || "Inter, Roboto, Arial, sans-serif");
    panel.style.setProperty("--ytx-panel-font-size", `${Math.min(22, Math.max(10, Number(appearance.fontSize) || 13.5))}px`);
  }

  function showNotice(message) {
    const panel = state.ui?.panel;
    if (!panel) return;
    panel.querySelector(".ytx-notice")?.remove();
    const notice = document.createElement("div");
    notice.className = "ytx-notice";
    notice.setAttribute("role", "alertdialog");
    notice.setAttribute("aria-modal", "true");
    notice.setAttribute("aria-label", "Aviso");
    const text = document.createElement("p");
    text.textContent = message;
    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "ytx-button ytx-notice__accept";
    accept.textContent = "Aceptar";
    const close = () => notice.remove();
    accept.addEventListener("click", close);
    notice.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
    notice.append(text, accept);
    panel.appendChild(notice);
    accept.focus();
  }

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
    if (state.settings.rememberLayout === false) return;
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

  function baseLanguageName(value) {
    return String(value || "")
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function setTitle(text) {
    if (!state.ui) return;
    const languageName = baseLanguageName(text) || "Subtítulos";
    state.ui.title.dataset.fullTitle = languageName;
    state.ui.title.title = languageName;
    if (!state.transcriptTracks?.length && state.ui.trackSelect) state.ui.trackSelect.value = languageName;
  }

  function setupAdaptiveHeader(ui) {
    const update = () => {
      const rect = ui.panel.getBoundingClientRect();
      const compact = rect.height < 340 || rect.width < 520;
      ui.panel.classList.toggle("ytx-panel--compact", compact);
      ui.copyButton.classList.toggle("ytx-button--icon-only", compact);
    };
    const observer = new ResizeObserver(update);
    observer.observe(ui.panel);
    update();
    return () => observer.disconnect();
  }

  function updateTrackSelector() {
    const ui = state.ui;
    if (!ui?.trackSelect || !ui.trackDatalist || !ui.trackMenu) return;
    const tracks = Array.isArray(state.transcriptTracks) ? state.transcriptTracks : [];
    const trackPriority = (track) => track.isTranslated ? 2 : track.isAutomatic ? 1 : 0;
    const tracksByLanguage = new Map();
    tracks.forEach((track) => {
      const key = String(track.languageCode || track.languageName).toLocaleLowerCase();
      const current = tracksByLanguage.get(key);
      if (!current || trackPriority(track) < trackPriority(current)) tracksByLanguage.set(key, track);
    });
    const selectableTracks = Array.from(tracksByLanguage.values());
    ui.trackDatalist.replaceChildren();
    ui.trackMenu.replaceChildren();
    if (!tracks.length) {
      ui.trackSelect.value = state.transcript?.languageName
        ? baseLanguageName(state.transcript.languageName)
        : (ui.title.dataset.fullTitle || "Cargando subtítulos…");
    }
    selectableTracks.forEach((track) => {
      const option = document.createElement("option");
      option.value = baseLanguageName(track.languageName) || track.languageCode;
      option.dataset.trackId = track.id;
      ui.trackDatalist.appendChild(option);
      const menuOption = document.createElement("button");
      menuOption.type = "button";
      menuOption.className = "ytx-track-selector__option";
      menuOption.dataset.trackId = track.id;
      menuOption.dataset.value = option.value;
      menuOption.setAttribute("role", "option");
      menuOption.textContent = option.value;
      ui.trackMenu.appendChild(menuOption);
    });
    ui.trackSelector.hidden = false;
    ui.trackSelect.disabled = selectableTracks.length < 2;
    if (selectableTracks.length) {
      const selected = selectableTracks.find((track) => track.id === state.transcript?.selectedTrackId) ||
        selectableTracks.find((track) => track.languageCode === state.transcript?.languageCode) ||
        selectableTracks[0];
      ui.trackSelect.value = baseLanguageName(selected.languageName) || selected.languageCode;
      ui.trackSelect.dataset.selectedTrackId = selected.id;
    }
  }

  function createPanel() {
    const existing = document.getElementById("yt-transcript-panel");
    if (existing) return state.ui;

    const panel = document.createElement("aside");
    panel.id = "yt-transcript-panel";
    panel.className = "ytx-panel";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Panel de transcripción");

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
    setButtonIcon(copyButton, "copy");
    labelButton(copyButton, "Copiar toda la transcripción");

    const collapseHeaderButton = document.createElement("button");
    collapseHeaderButton.type = "button";
    collapseHeaderButton.className = "ytx-button ytx-button--collapse-header";
    setButtonIcon(collapseHeaderButton, "chevronDown");
    labelButton(collapseHeaderButton, "Ocultar la cabecera");
    collapseHeaderButton.setAttribute("aria-expanded", "true");

    const searchToggle = document.createElement("button");
    searchToggle.type = "button";
    searchToggle.className = "ytx-button ytx-button--search";
    setButtonIcon(searchToggle, "search");
    labelButton(searchToggle, "Buscar en la transcripción");
    searchToggle.setAttribute("aria-expanded", "false");
    searchToggle.setAttribute("aria-controls", "ytx-transcript-search");

    const notesToggle = document.createElement("button");
    notesToggle.type = "button";
    notesToggle.className = "ytx-button ytx-button--notes";
    setButtonIcon(notesToggle, "list");
    labelButton(notesToggle, "Mostrar notas y favoritos de este vídeo");
    notesToggle.setAttribute("aria-expanded", "false");
    notesToggle.setAttribute("aria-controls", "ytx-transcript-notes");

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "ytx-button ytx-button--close";
    setButtonIcon(closeButton, "close");
    labelButton(closeButton, "Cerrar la transcripción");

    const content = document.createElement("div");
    content.className = "ytx-panel__content";
    content.dataset.transcriptContent = "";
    content.textContent = "Buscando una pista de subtítulos…";

    const trackSelector = document.createElement("div");
    trackSelector.className = "ytx-track-selector";
    trackSelector.hidden = true;
    const trackLabel = document.createElement("label");
    trackLabel.htmlFor = "ytx-transcript-track";
    trackLabel.textContent = "Pista";
    const trackSelect = document.createElement("input");
    trackSelect.id = "ytx-transcript-track";
    trackSelect.type = "search";
    trackSelect.placeholder = "Idioma…";
    trackSelect.setAttribute("aria-label", "Pista de subtítulos");
    trackSelect.setAttribute("aria-haspopup", "listbox");
    trackSelect.setAttribute("aria-expanded", "false");
    const trackDatalist = document.createElement("datalist");
    trackDatalist.id = "ytx-transcript-track-options";
    const trackMenu = document.createElement("div");
    trackMenu.className = "ytx-track-selector__menu";
    trackMenu.setAttribute("role", "listbox");
    trackMenu.hidden = true;
    trackSelector.append(trackLabel, trackSelect, trackDatalist, trackMenu);

    const searchBar = document.createElement("div");
    searchBar.id = "ytx-transcript-search";
    searchBar.className = "ytx-search";
    searchBar.setAttribute("role", "search");
    const searchInput = document.createElement("input");
    searchInput.className = "ytx-search__input";
    searchInput.type = "search";
    searchInput.placeholder = "Buscar en la transcripción…";
    searchInput.value = state.search.query;
    searchInput.setAttribute("aria-label", "Buscar texto en la transcripción");
    const searchCounter = document.createElement("span");
    searchCounter.className = "ytx-search__counter";
    searchCounter.textContent = "0/0";
    const searchPrevious = document.createElement("button");
    searchPrevious.type = "button";
    searchPrevious.className = "ytx-search__button";
    setButtonIcon(searchPrevious, "arrowUp");
    labelButton(searchPrevious, "Coincidencia anterior");
    const searchNext = document.createElement("button");
    searchNext.type = "button";
    searchNext.className = "ytx-search__button";
    setButtonIcon(searchNext, "arrowDown");
    labelButton(searchNext, "Coincidencia siguiente");
    const searchClose = document.createElement("button");
    searchClose.type = "button";
    searchClose.className = "ytx-search__button";
    setButtonIcon(searchClose, "close");
    labelButton(searchClose, "Cerrar búsqueda");
    searchBar.append(searchInput, searchCounter, searchPrevious, searchNext, searchClose);

    const notesDrawer = document.createElement("section");
    notesDrawer.id = "ytx-transcript-notes";
    notesDrawer.className = "ytx-notes";
    notesDrawer.setAttribute("aria-label", "Notas y favoritos de este vídeo");
    const notesHeading = document.createElement("strong");
    notesHeading.className = "ytx-notes__heading";
    notesHeading.textContent = "Marcadores de este vídeo";
    const notesClose = document.createElement("button");
    notesClose.type = "button";
    notesClose.className = "ytx-notes__close";
    setButtonIcon(notesClose, "close");
    labelButton(notesClose, "Cerrar marcadores de este vídeo");
    const notesHeader = document.createElement("div");
    notesHeader.className = "ytx-notes__header";
    notesHeader.append(notesHeading, notesClose);
    const notesList = document.createElement("div");
    notesList.className = "ytx-notes__list";
    notesDrawer.append(notesHeader, notesList);

    const noteEditor = document.createElement("section");
    noteEditor.className = "ytx-note-editor";
    noteEditor.setAttribute("role", "dialog");
    noteEditor.setAttribute("aria-label", "Editor de nota");
    const noteEditorHeading = document.createElement("div");
    noteEditorHeading.className = "ytx-note-editor__heading";
    const noteEditorTime = document.createElement("strong");
    const noteEditorText = document.createElement("span");
    noteEditorText.className = "ytx-note-editor__text";
    noteEditorHeading.append(noteEditorTime, noteEditorText);
    const noteEditorInput = document.createElement("textarea");
    noteEditorInput.className = "ytx-note-editor__input";
    noteEditorInput.placeholder = "Añade una nota opcional…";
    noteEditorInput.setAttribute("aria-label", "Texto de la nota");
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
    const transcriptActions = document.createElement("div");
    transcriptActions.className = "ytx-panel__action-group";
    transcriptActions.append(searchToggle, notesToggle, copyButton);
    const windowActions = document.createElement("div");
    windowActions.className = "ytx-panel__action-group";
    windowActions.append(collapseHeaderButton, closeButton);
    title.replaceChildren(trackSelector);
    headerActions.append(transcriptActions, windowActions);
    header.append(title, headerActions);
    panel.append(header, searchBar, notesDrawer, noteEditor, content);
    (document.fullscreenElement || document.body).appendChild(panel);

    const ui = {
      panel,
      header,
      title,
      content,
      headerActions,
      trackSelector,
      trackSelect,
      trackDatalist,
      trackMenu,
      searchToggle,
      searchBar,
      searchInput,
      searchCounter,
      searchPrevious,
      searchNext,
      searchClose,
      notesToggle,
      notesDrawer,
      notesClose,
      notesList,
      noteEditor,
      noteEditorTime,
      noteEditorText,
      noteEditorInput,
      noteEditorCancel,
      noteEditorSave,
      collapseHeaderButton,
      copyButton,
      closeButton,
      cleanups: [],
    };
    state.ui = ui;
    ytx.playerControls?.updateTranscriptButton();
    applyAppearance();
    ui.cleanups.push(ytx.addResizeHandles(panel));
    ui.cleanups.push(ytx.makePanelDraggable(panel, header));
    ui.cleanups.push(setupAdaptiveHeader(ui));
    ui.cleanups.push(ytx.search.attach(ui));
    ui.cleanups.push(ytx.notes.attach(ui));
    if (state.search.query) {
      panel.classList.add("ytx-panel--search-open");
      searchToggle.setAttribute("aria-expanded", "true");
    }
    updateTrackSelector();

    const selectTrack = (trackId, value) => {
      const option = Array.from(trackDatalist.options).find((candidate) => candidate.dataset.trackId === trackId);
      if (!option?.dataset.trackId) {
        const current = Array.from(trackDatalist.options).find((candidate) => candidate.dataset.trackId === trackSelect.dataset.selectedTrackId);
        if (current) trackSelect.value = current.value;
        return;
      }
      trackSelect.value = value || option.value;
      trackSelect.dataset.selectedTrackId = option.dataset.trackId;
      trackMenu.hidden = true;
      trackSelect.setAttribute("aria-expanded", "false");
      window.postMessage({
        source: "YT_TRANSCRIPT_CONTROL",
        enabled: true,
        preferredLanguage: state.settings.preferredLanguage || "auto",
        selectTrackId: option.dataset.trackId,
      }, "*");
    };
    const onTrackChange = () => {
      const option = Array.from(trackDatalist.options).find((candidate) => candidate.value === trackSelect.value);
      selectTrack(option?.dataset.trackId, option?.value);
    };
    trackSelect.addEventListener("change", onTrackChange);
    const onTrackFocus = () => trackSelect.select();
    const onTrackClick = () => {
      trackMenu.querySelectorAll(".ytx-track-selector__option").forEach((option) => { option.hidden = false; });
      trackMenu.hidden = false;
      trackSelect.setAttribute("aria-expanded", "true");
    };
    const onTrackInput = () => {
      const query = trackSelect.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
      trackMenu.querySelectorAll(".ytx-track-selector__option").forEach((option) => {
        const value = option.dataset.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
        option.hidden = Boolean(query) && !value.includes(query);
      });
      trackMenu.hidden = false;
      trackSelect.setAttribute("aria-expanded", "true");
    };
    const onTrackMenuClick = (event) => {
      const option = event.target.closest(".ytx-track-selector__option");
      if (option) selectTrack(option.dataset.trackId, option.dataset.value);
    };
    const onOutsideTrackClick = (event) => {
      if (trackSelector.contains(event.target)) return;
      trackMenu.hidden = true;
      trackSelect.setAttribute("aria-expanded", "false");
    };
    trackSelect.addEventListener("focus", onTrackFocus);
    trackSelect.addEventListener("click", onTrackClick);
    trackSelect.addEventListener("input", onTrackInput);
    trackMenu.addEventListener("click", onTrackMenuClick);
    document.addEventListener("pointerdown", onOutsideTrackClick, true);
    ui.cleanups.push(() => trackSelect.removeEventListener("change", onTrackChange));
    ui.cleanups.push(() => trackSelect.removeEventListener("focus", onTrackFocus));
    ui.cleanups.push(() => trackSelect.removeEventListener("click", onTrackClick));
    ui.cleanups.push(() => trackSelect.removeEventListener("input", onTrackInput));
    ui.cleanups.push(() => trackMenu.removeEventListener("click", onTrackMenuClick));
    ui.cleanups.push(() => document.removeEventListener("pointerdown", onOutsideTrackClick, true));

    let headerCollapsed = false;
    const onCollapseHeader = () => {
      headerCollapsed = !headerCollapsed;
      panel.classList.toggle("ytx-panel--header-collapsed", headerCollapsed);
      setButtonIcon(collapseHeaderButton, headerCollapsed ? "chevronUp" : "chevronDown");
      labelButton(collapseHeaderButton, headerCollapsed ? "Mostrar la cabecera" : "Ocultar la cabecera");
      collapseHeaderButton.setAttribute("aria-expanded", String(!headerCollapsed));
      chrome.storage.local.set({ transcriptHeaderCollapsed: headerCollapsed });
    };
    collapseHeaderButton.addEventListener("click", onCollapseHeader);
    ui.cleanups.push(() => collapseHeaderButton.removeEventListener("click", onCollapseHeader));

    const onClose = () => {
      if (state.settings.autoOpenNextVideo) {
        state.dismissedVideoId = new URL(location.href).searchParams.get("v");
        removePanel();
        ytx.bridge.sendControl();
      } else {
        chrome.storage.local.set({ transcriptEnabled: false });
      }
    };
    closeButton.addEventListener("click", onClose);
    ui.cleanups.push(() => closeButton.removeEventListener("click", onClose));

    const onCopyAll = async () => {
      const blocks = state.displayBlocks || [];
      if (!blocks.length) return;
      await navigator.clipboard.writeText(blocks.map((block) => block.text).join(" "));
      setButtonIcon(copyButton, "check");
      setTimeout(() => {
        if (state.ui === ui) setButtonIcon(copyButton, "copy");
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

    const onGeometryChange = () => savePanelGeometry(panel);
    panel.addEventListener("ytx:geometrychange", onGeometryChange);
    ui.cleanups.push(() => panel.removeEventListener("ytx:geometrychange", onGeometryChange));

    chrome.storage.local.get(PANEL_STORAGE_DEFAULTS, (stored) => {
      if (state.ui !== ui) return;
      if (state.settings.rememberLayout !== false) applyStoredGeometry(panel, stored.transcriptPanelGeometry);
      headerCollapsed = state.settings.rememberLayout !== false && Boolean(stored.transcriptHeaderCollapsed);
      panel.classList.toggle("ytx-panel--header-collapsed", headerCollapsed);
      panel.style.minHeight = "130px";
      setButtonIcon(collapseHeaderButton, headerCollapsed ? "chevronUp" : "chevronDown");
      labelButton(collapseHeaderButton, headerCollapsed ? "Mostrar la cabecera" : "Ocultar la cabecera");
      collapseHeaderButton.setAttribute("aria-expanded", String(!headerCollapsed));
    });
    return ui;
  }

  function removePanel() {
    ytx.sync?.stop();
    if (!state.ui) return;
    state.ui.cleanups.forEach((cleanup) => cleanup());
    state.ui.panel.remove();
    state.ui = null;
    ytx.playerControls?.updateTranscriptButton();
  }

  function ensurePanel() {
    if (!state.settings.extensionEnabled || !state.settings.enabled || state.dismissedVideoId === new URL(location.href).searchParams.get("v") || !ytx.isWatchPage()) {
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

  ytx.panel = { create: createPanel, remove: removePanel, ensure: ensurePanel, setTitle, showMessage, showNotice, updateTrackSelector, applyAppearance, setButtonIcon, labelButton };
})();
