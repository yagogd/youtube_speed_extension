(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const state = ytx.state;
  let observer = null;
  let storageListener = null;
  let currentUi = null;
  let ensureScheduled = false;
  let markerPreviewHideTimer = null;

  const ICONS = {
    transcript: '<path d="M6 3h9l3 3v15H6Z"/><path d="M15 3v4h4M9 11h6M9 15h6"/>',
    speed: '<circle cx="12" cy="12" r="8"/><path d="m12 12 4-3M7 17h10"/>',
    notes: '<path d="M5 5h14v11H9l-4 3V5Z"/><path d="M8 9h8M8 12h6"/>',
    addNote: '<path d="M5 5h14v11H9l-4 3V5Z"/><path d="M12 8v6M9 11h6"/>',
  };

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("ytx-player-icon");
    svg.innerHTML = ICONS[name];
    return svg;
  }

  function createControl(name, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `ytp-button ytx-player-control ytx-player-control--${name}`;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.appendChild(icon(name));
    return button;
  }

  function setSpeed(rate) {
    const requested = Number(rate);
    if (requested > 16) {
      if (currentUi) {
        currentUi.speedError.textContent = "Máximo 16×";
        currentUi.speedError.hidden = false;
      }
      return;
    }
    const value = Math.max(0.1, Math.round(requested * 100) / 100);
    if (!Number.isFinite(value)) return;
    if (currentUi) currentUi.speedError.hidden = true;
    window.postMessage({ source: "YT_SPEED_CONTROL", rate: value }, "*");
    if (currentUi) {
      currentUi.speedInput.value = String(value);
      currentUi.speedSlider.value = String(value);
      currentUi.speedValue.textContent = `${value.toFixed(2)}×`;
      currentUi.speedPresets?.forEach((preset) => preset.classList.toggle("ytx-speed-preset--active", Number(preset.dataset.rate) === value));
    }
  }

  function updateTranscriptButton() {
    if (!currentUi) return;
    const visible = Boolean(state.ui?.panel?.isConnected);
    currentUi.transcriptButton.setAttribute("aria-pressed", String(visible));
    currentUi.transcriptButton.classList.toggle("ytx-player-control--active", visible);
    currentUi.transcriptButton.title = visible ? "Ocultar transcripción" : "Mostrar transcripción";
  }

  function updateNotesButton() {
    if (!currentUi) return;
    const count = state.savedNotes?.length || 0;
    currentUi.notesCount.textContent = String(count);
    currentUi.notesCount.hidden = count === 0;
    currentUi.notesButton.title = count
      ? `Notas y favoritos de este vídeo (${count})`
      : "Notas y favoritos de este vídeo";
    currentUi.notesButton.setAttribute("aria-label", currentUi.notesButton.title);
  }

  function markerPreview(player) {
    let preview = player.querySelector(":scope > .ytx-progress-marker-preview");
    if (preview) return preview;
    preview = document.createElement("div");
    preview.className = "ytx-progress-marker-preview";
    preview.id = `ytx-marker-preview-${Math.random().toString(36).slice(2)}`;
    preview.setAttribute("role", "button");
    preview.setAttribute("tabindex", "0");
    preview.setAttribute("aria-label", "Abrir esta nota");
    preview.hidden = true;
    preview.addEventListener("pointerenter", () => clearTimeout(markerPreviewHideTimer));
    preview.addEventListener("pointerleave", () => scheduleMarkerPreviewHide(preview));
    preview.addEventListener("click", () => openSavedNote(preview.dataset.noteId));
    preview.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openSavedNote(preview.dataset.noteId);
      }
    });
    player.appendChild(preview);
    return preview;
  }

  function scheduleMarkerPreviewHide(preview) {
    clearTimeout(markerPreviewHideTimer);
    markerPreviewHideTimer = setTimeout(() => { preview.hidden = true; }, 700);
  }

  function showMarkerPreview(marker, item, time, player, preview) {
    const type = item.type === "favorite" ? "Favorito" : "Nota";
    const content = item.type === "favorite"
      ? (item.text || item.note || "Momento guardado como favorito")
      : (item.note || item.text || "Nota sin texto");
    const heading = document.createElement("div");
    heading.className = "ytx-progress-marker-preview__heading";
    heading.textContent = `${type} · ${time}`;
    const body = document.createElement("div");
    body.className = "ytx-progress-marker-preview__body";
    body.textContent = content;
    preview.replaceChildren(heading, body);
    preview.dataset.noteId = item.id;
    preview.classList.toggle("ytx-progress-marker-preview--favorite", item.type === "favorite");
    preview.hidden = false;

    const playerRect = player.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const previewWidth = preview.offsetWidth;
    const markerCenter = markerRect.left - playerRect.left + markerRect.width / 2;
    preview.style.left = `${Math.max(8, Math.min(playerRect.width - previewWidth - 8, markerCenter - previewWidth / 2))}px`;
    preview.style.bottom = `${Math.max(48, playerRect.bottom - markerRect.top + 9)}px`;
  }

  function handleProgressPointerMove(event) {
    const player = currentUi?.player;
    const progressList = player?.querySelector(".ytp-progress-list");
    const preview = player?.querySelector(":scope > .ytx-progress-marker-preview");
    if (!player || !progressList || !preview) return;
    const progressRect = progressList.getBoundingClientRect();
    const previewRect = preview.hidden ? null : preview.getBoundingClientRect();
    const insidePreviewPath = previewRect &&
      event.clientX >= previewRect.left - 12 &&
      event.clientX <= previewRect.right + 12 &&
      event.clientY >= previewRect.top - 8 &&
      event.clientY <= progressRect.top + progressRect.height / 2 + 18;
    if (preview.contains(event.target) || insidePreviewPath) {
      clearTimeout(markerPreviewHideTimer);
      return;
    }
    if (Math.abs(event.clientY - (progressRect.top + progressRect.height / 2)) > 16) {
      preview.hidden = true;
      return;
    }

    let closest = null;
    let closestDistance = Infinity;
    progressList.querySelectorAll(".ytx-progress-marker").forEach((marker) => {
      const rect = marker.getBoundingClientRect();
      const distance = Math.abs(event.clientX - (rect.left + rect.width / 2));
      if (distance < closestDistance) {
        closest = marker;
        closestDistance = distance;
      }
    });
    if (!closest || closestDistance > 10 || !closest._ytxSavedItem) {
      preview.hidden = true;
      return;
    }
    clearTimeout(markerPreviewHideTimer);
    const item = closest._ytxSavedItem;
    showMarkerPreview(closest, item, ytx.formatTime(item.startMs), player, preview);
  }

  function refreshNoteMarkers() {
    const progressList = document.querySelector(".html5-video-player .ytp-progress-list");
    const video = document.querySelector("video");
    if (!progressList || !video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const player = progressList.closest(".html5-video-player");
    if (!player) return;
    const preview = markerPreview(player);
    preview.hidden = true;
    let layer = progressList.querySelector(":scope > .ytx-progress-markers");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "ytx-progress-markers";
      progressList.appendChild(layer);
    }
    const progressHeight = Math.max(2, Math.round(progressList.getBoundingClientRect().height));
    layer.style.setProperty("--ytx-marker-bar-height", `${progressHeight}px`);
    layer.replaceChildren();
    (state.savedNotes || []).forEach((item) => {
      const startSeconds = Math.max(0, Number(item.startMs) / 1000 || 0);
      const endSeconds = Math.max(startSeconds, Number(item.endMs) / 1000 || startSeconds);
      const marker = document.createElement("button");
      marker.type = "button";
      marker._ytxSavedItem = item;
      marker.className = `ytx-progress-marker ytx-progress-marker--${item.type === "favorite" ? "favorite" : "note"}`;
      marker.style.left = `${Math.min(100, startSeconds / video.duration * 100)}%`;
      const time = ytx.formatTime(item.startMs);
      marker.setAttribute("aria-label", `Ir a la nota del minuto ${time}`);
      marker.setAttribute("aria-describedby", preview.id);
      const showPreview = () => showMarkerPreview(marker, item, time, player, preview);
      const hidePreview = () => { preview.hidden = true; };
      marker.addEventListener("pointerenter", showPreview);
      marker.addEventListener("focus", showPreview);
      marker.addEventListener("blur", hidePreview);
      marker.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        openSavedNote(item.id);
      });
      marker.addEventListener("click", (event) => {
        event.stopPropagation();
        hidePreview();
        video.currentTime = startSeconds;
      });
      layer.appendChild(marker);
    });
    updateNotesButton();
  }

  function toggleTranscript() {
    if (state.ui?.panel?.isConnected) {
      chrome.storage.local.set({ transcriptEnabled: false });
      return;
    }
    state.dismissedVideoId = null;
    chrome.storage.local.set({ transcriptEnabled: true }, () => {
      state.settings.enabled = true;
      ytx.panel.ensure();
      ytx.bridge.sendControl();
      setTimeout(updateTranscriptButton, 50);
    });
  }

  function openNotes() {
    state.dismissedVideoId = null;
    if (!state.settings.enabled) {
      chrome.storage.local.set({ transcriptEnabled: true });
      state.settings.enabled = true;
    }
    const ui = ytx.panel.ensure();
    ytx.bridge.sendControl();
    setTimeout(() => {
      const notesToggle = state.ui?.notesToggle || ui?.notesToggle;
      if (notesToggle && !state.ui.panel.classList.contains("ytx-panel--notes-open")) notesToggle.click();
      updateTranscriptButton();
    }, 80);
  }

  function openSavedNote(noteId) {
    if (!noteId) return;
    clearTimeout(markerPreviewHideTimer);
    const preview = currentUi?.player?.querySelector(":scope > .ytx-progress-marker-preview");
    if (preview) preview.hidden = true;
    openNotes();
    setTimeout(() => {
      const row = Array.from(state.ui?.notesList?.querySelectorAll(".ytx-note-item") || [])
        .find((candidate) => candidate.dataset.noteId === noteId);
      if (!row) return;
      row.scrollIntoView({ block: "center", behavior: "smooth" });
      row.classList.add("ytx-note-item--focused");
      setTimeout(() => row.classList.remove("ytx-note-item--focused"), 2200);
    }, 160);
  }

  function parseTime(value, fallback) {
    const parts = String(value || "").trim().split(":").map(Number);
    if (!parts.length || parts.some((part) => !Number.isFinite(part) || part < 0)) return fallback;
    if (parts.length === 1) return parts[0];
    return parts.reduce((total, part) => total * 60 + part, 0);
  }

  function formatSeconds(seconds) {
    return ytx.formatTime(Math.max(0, seconds) * 1000);
  }

  function applyEditorAppearance(editor) {
    const appearance = state.appearance || {};
    const hex = /^#[0-9a-f]{6}$/i.test(appearance.background) ? appearance.background : "#1e1e22";
    const red = parseInt(hex.slice(1, 3), 16);
    const green = parseInt(hex.slice(3, 5), 16);
    const blue = parseInt(hex.slice(5, 7), 16);
    const opacity = Math.min(1, Math.max(.55, Number(appearance.opacity) || .9));
    editor.style.setProperty("--ytx-editor-background", `rgba(${red},${green},${blue},${opacity})`);
    editor.style.setProperty("--ytx-editor-text", appearance.text || "#e4e4e7");
    editor.style.setProperty("--ytx-editor-font", appearance.font || "Inter, Roboto, Arial, sans-serif");
    editor.style.setProperty("--ytx-editor-font-size", `${Math.min(22, Math.max(10, Number(appearance.fontSize) || 13.5))}px`);
  }

  function closePlayerNoteEditor() {
    if (!currentUi?.noteEditor) return;
    clearInterval(currentUi.noteEditorTimer);
    currentUi.noteEditor.remove();
    currentUi.noteEditor = null;
    currentUi.noteEditorTimer = null;
    currentUi.addNoteButton?.focus();
  }

  function openPlayerNoteEditor() {
    const video = currentUi?.video || document.querySelector("video");
    if (!currentUi || !video) return;
    closePlayerNoteEditor();
    const initialSeconds = Math.max(0, video.currentTime - 3);
    let manualEnd = false;
    const editor = document.createElement("section");
    editor.className = "ytx-player-note-editor";
    editor.setAttribute("role", "dialog");
    editor.setAttribute("aria-label", "Crear nota del vídeo");
    applyEditorAppearance(editor);
    const heading = document.createElement("strong");
    heading.textContent = "Nueva nota";
    const times = document.createElement("div");
    times.className = "ytx-player-note-editor__times";
    const startLabel = document.createElement("label");
    startLabel.textContent = "Inicio";
    const startInput = document.createElement("input");
    startInput.value = formatSeconds(initialSeconds);
    startInput.setAttribute("aria-label", "Tiempo inicial de la nota");
    startLabel.appendChild(startInput);
    const endLabel = document.createElement("label");
    endLabel.textContent = "Final";
    const endInput = document.createElement("input");
    endInput.value = formatSeconds(video.currentTime);
    endInput.setAttribute("aria-label", "Tiempo final de la nota");
    endInput.addEventListener("input", () => { manualEnd = true; });
    endLabel.appendChild(endInput);
    times.append(startLabel, endLabel);
    const textarea = document.createElement("textarea");
    textarea.placeholder = "Escribe tu nota…";
    textarea.setAttribute("aria-label", "Contenido de la nota");
    const hint = document.createElement("small");
    hint.textContent = "Enter para guardar · Shift + Enter para una línea nueva";
    const actions = document.createElement("div");
    actions.className = "ytx-player-note-editor__actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancelar";
    const save = document.createElement("button");
    save.type = "button";
    save.className = "ytx-player-note-editor__save";
    save.textContent = "Guardar nota";
    actions.append(cancel, save);
    editor.append(heading, times, textarea, hint, actions);
    currentUi.player.appendChild(editor);
    currentUi.noteEditor = editor;
    currentUi.noteEditorTimer = setInterval(() => {
      if (!manualEnd && currentUi?.noteEditor === editor) endInput.value = formatSeconds(video.currentTime);
    }, 250);

    const saveNote = async () => {
      const note = textarea.value.trim();
      if (!note) {
        textarea.focus();
        return;
      }
      const endFallback = video.currentTime;
      const startSeconds = parseTime(startInput.value, initialSeconds);
      const endSeconds = Math.max(startSeconds, manualEnd ? parseTime(endInput.value, endFallback) : endFallback);
      await ytx.notes.save({
        type: "note",
        startMs: startSeconds * 1000,
        endMs: endSeconds * 1000,
        text: "",
        note,
      });
      closePlayerNoteEditor();
      refreshNoteMarkers();
    };
    cancel.addEventListener("click", closePlayerNoteEditor);
    save.addEventListener("click", saveNote);
    editor.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePlayerNoteEditor();
      } else if (event.target === textarea && event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        saveNote();
      }
    });
    textarea.focus();
  }

  function createUi(player, rightControls) {
    const group = document.createElement("div");
    group.className = "ytp-right-controls ytx-player-controls";
    const transcriptButton = createControl("transcript", "Mostrar transcripción");
    transcriptButton.setAttribute("aria-pressed", "false");
    const speedButton = createControl("speed", "Controlar velocidad");
    speedButton.setAttribute("aria-expanded", "false");
    const notesButton = createControl("notes", "Notas y favoritos de este vídeo");
    const notesCount = document.createElement("span");
    notesCount.className = "ytx-player-control__badge";
    notesCount.hidden = true;
    notesButton.appendChild(notesCount);
    const addNoteButton = createControl("addNote", "Crear una nota en este momento");
    group.append(transcriptButton, speedButton, notesButton, addNoteButton);
    rightControls.insertAdjacentElement("beforebegin", group);

    const speedMenu = document.createElement("div");
    speedMenu.className = "ytx-player-speed-menu";
    speedMenu.hidden = true;
    const speedHeading = document.createElement("strong");
    speedHeading.className = "ytx-player-speed-menu__heading";
    speedHeading.textContent = "Velocidad de reproducción";
    const speedValue = document.createElement("div");
    speedValue.className = "ytx-player-speed-menu__value";
    speedValue.textContent = "1.00×";
    const sliderRow = document.createElement("div");
    sliderRow.className = "ytx-player-speed-menu__slider-row";
    const down = document.createElement("button");
    down.type = "button";
    down.textContent = "−";
    down.setAttribute("aria-label", "Reducir velocidad en 0,25");
    const speedSlider = document.createElement("input");
    speedSlider.className = "ytx-player-speed-menu__range";
    speedSlider.type = "range";
    speedSlider.min = "0.25";
    speedSlider.max = "16";
    speedSlider.step = "0.25";
    speedSlider.value = "1";
    speedSlider.setAttribute("aria-label", "Deslizador de velocidad");
    const speedInput = document.createElement("input");
    speedInput.type = "number";
    speedInput.min = "0.1";
    speedInput.max = "16";
    speedInput.step = "0.25";
    speedInput.value = "1";
    speedInput.setAttribute("aria-label", "Velocidad del vídeo");
    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "+";
    up.setAttribute("aria-label", "Aumentar velocidad en 0,25");
    sliderRow.append(down, speedSlider, up);
    const manualRow = document.createElement("div");
    manualRow.className = "ytx-player-speed-menu__manual";
    const manualLabel = document.createElement("span");
    manualLabel.textContent = "Velocidad exacta";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "1×";
    reset.setAttribute("aria-label", "Restablecer velocidad a 1x");
    const speedError = document.createElement("span");
    speedError.className = "ytx-player-speed-error";
    speedError.hidden = true;
    manualRow.append(manualLabel, speedInput, reset);
    const presets = document.createElement("div");
    presets.className = "ytx-player-speed-menu__presets";
    const speedPresets = [];
    [1, 1.25, 1.5, 2, 2.5, 3, 4, 8, 16].forEach((rate) => {
      const preset = document.createElement("button");
      preset.type = "button";
      preset.textContent = `${rate}×`;
      preset.dataset.rate = String(rate);
      preset.addEventListener("click", () => setSpeed(rate));
      presets.appendChild(preset);
      speedPresets.push(preset);
    });
    speedMenu.append(speedHeading, speedValue, sliderRow, manualRow, presets, speedError);
    player.appendChild(speedMenu);

    const video = player.querySelector("video");
    const onDurationChange = () => refreshNoteMarkers();
    const onDocumentPointerMove = (event) => handleProgressPointerMove(event);
    const onDocumentClick = (event) => {
      const preview = player.querySelector(":scope > .ytx-progress-marker-preview");
      if (!preview || preview.hidden) return;
      const rect = preview.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openSavedNote(preview.dataset.noteId);
    };
    const onDocumentKeyDown = (event) => {
      const preview = player.querySelector(":scope > .ytx-progress-marker-preview");
      if (!preview || preview.hidden || (event.key !== "Enter" && event.key !== " ")) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openSavedNote(preview.dataset.noteId);
    };
    video?.addEventListener("durationchange", onDurationChange);
    document.addEventListener("pointermove", onDocumentPointerMove, true);
    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("keydown", onDocumentKeyDown, true);
    currentUi = { player, group, transcriptButton, speedButton, notesButton, notesCount, addNoteButton, speedMenu, speedInput, speedSlider, speedValue, speedPresets, speedError, video, onDurationChange, onDocumentPointerMove, onDocumentClick, onDocumentKeyDown };
    transcriptButton.addEventListener("click", toggleTranscript);
    notesButton.addEventListener("click", openNotes);
    addNoteButton.addEventListener("click", openPlayerNoteEditor);
    speedButton.addEventListener("click", () => {
      speedMenu.hidden = !speedMenu.hidden;
      speedButton.setAttribute("aria-expanded", String(!speedMenu.hidden));
      if (!speedMenu.hidden) speedInput.select();
    });
    down.addEventListener("click", () => setSpeed(Number(speedInput.value) - 0.25));
    up.addEventListener("click", () => setSpeed(Number(speedInput.value) + 0.25));
    reset.addEventListener("click", () => setSpeed(1));
    speedSlider.addEventListener("input", () => setSpeed(speedSlider.value));
    speedInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") setSpeed(speedInput.value);
      if (event.key === "Escape") {
        speedMenu.hidden = true;
        speedButton.setAttribute("aria-expanded", "false");
        speedButton.focus();
      }
    });
    chrome.storage.local.get({ lastSpeed: 1 }, (stored) => setSpeed(stored.lastSpeed || 1));
    updateTranscriptButton();
    updateNotesButton();
    refreshNoteMarkers();
  }

  function ensure() {
    if (!state.settings.extensionEnabled || !ytx.isWatchPage()) {
      remove();
      return;
    }
    const player = document.querySelector(".html5-video-player");
    const rightControls = player?.querySelector(".ytp-right-controls:not(.ytx-player-controls)");
    if (!player || !rightControls) return;
    if (currentUi?.group?.isConnected && currentUi.player === player) {
      updateTranscriptButton();
      if (!document.querySelector(".html5-video-player .ytp-progress-list > .ytx-progress-markers")) refreshNoteMarkers();
      return;
    }
    remove();
    createUi(player, rightControls);
  }

  function scheduleEnsure() {
    if (ensureScheduled) return;
    ensureScheduled = true;
    requestAnimationFrame(() => {
      ensureScheduled = false;
      ensure();
    });
  }

  function remove() {
    clearTimeout(markerPreviewHideTimer);
    closePlayerNoteEditor();
    currentUi?.video?.removeEventListener("durationchange", currentUi.onDurationChange);
    document.removeEventListener("pointermove", currentUi?.onDocumentPointerMove, true);
    document.removeEventListener("click", currentUi?.onDocumentClick, true);
    document.removeEventListener("keydown", currentUi?.onDocumentKeyDown, true);
    currentUi?.group?.remove();
    currentUi?.speedMenu?.remove();
    document.querySelectorAll(".ytx-progress-markers").forEach((layer) => layer.remove());
    document.querySelectorAll(".ytx-progress-marker-preview").forEach((preview) => preview.remove());
    currentUi = null;
  }

  function start() {
    if (observer) return;
    observer = new MutationObserver(scheduleEnsure);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    storageListener = (changes, area) => {
      if (area !== "local") return;
      if (changes.extensionEnabled) {
        state.settings.extensionEnabled = changes.extensionEnabled.newValue !== false;
        ensure();
      }
      if (changes.transcriptEnabled) setTimeout(updateTranscriptButton, 0);
      if (changes.lastSpeed && currentUi) {
        const value = Number(changes.lastSpeed.newValue) || 1;
        currentUi.speedInput.value = String(value);
        currentUi.speedSlider.value = String(value);
        currentUi.speedValue.textContent = `${value.toFixed(2)}×`;
        currentUi.speedPresets.forEach((preset) => preset.classList.toggle("ytx-speed-preset--active", Number(preset.dataset.rate) === value));
      }
      if (changes.ytxSavedNotes) setTimeout(() => ytx.notes.loadCurrent(), 0);
    };
    chrome.storage.onChanged.addListener(storageListener);
    ensure();
  }

  function stop() {
    observer?.disconnect();
    observer = null;
    if (storageListener) chrome.storage.onChanged.removeListener(storageListener);
    storageListener = null;
    remove();
  }

  ytx.playerControls = { start, stop, ensure, remove, refreshNoteMarkers, updateTranscriptButton, updateNotesButton };
})();
