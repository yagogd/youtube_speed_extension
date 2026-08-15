(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const state = ytx.state;
  const STORAGE_KEY = "ytxSavedNotes";
  const RECORDS_KEY = "ytxVideoRecords";
  const SETTINGS_KEY = "ytxObsidianSettings";
  let editorDraft = null;
  let editorReturnFocus = null;
  let autoSyncTimer = 0;
  let currentTags = [];
  let availableTags = [];
  let availableFolders = [];
  let catalogRefreshedAt = 0;

  function videoId() {
    return new URL(location.href).searchParams.get("v") || "";
  }

  function videoMetadata() {
    const id = videoId();
    const heading = document.querySelector("h1.ytd-watch-metadata yt-formatted-string, h1.title yt-formatted-string");
    return {
      videoId: id,
      videoTitle: heading?.textContent?.trim() || document.title.replace(/\s*-\s*YouTube\s*$/, ""),
      videoUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
      channel: document.querySelector("#owner #channel-name a, ytd-video-owner-renderer #channel-name a")?.textContent?.trim() || "",
    };
  }

  function readAll() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ [STORAGE_KEY]: [] }, (stored) => {
        resolve(Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : []);
      });
    });
  }

  async function writeAll(items) {
    await chrome.storage.local.set({ [STORAGE_KEY]: items });
  }

  function readStorage(defaults) { return new Promise((resolve) => chrome.storage.local.get(defaults, resolve)); }

  async function ensureVideoRecord(patch = {}) {
    const metadata = videoMetadata();
    if (!metadata.videoId) return null;
    const stored = await readStorage({ [RECORDS_KEY]: {}, [SETTINGS_KEY]: {} });
    const records = stored[RECORDS_KEY] || {};
    const previous = records[metadata.videoId] || {};
    const record = {
      generalNote: "", tags: [], folder: "", createdAt: new Date().toISOString(), obsidian: { status: "never", path: "", fingerprint: "", error: "" },
      ...previous, ...metadata, ...patch,
      timestampNotes: state.savedNotes.slice(),
    };
    if (Object.prototype.hasOwnProperty.call(patch, "folder") && previous.folder !== record.folder && previous.obsidian?.path) {
      record.obsidian = { ...record.obsidian, status:"pending", path:"", relocateFrom:previous.obsidian.path };
    }
    const settings = { ...YTXObsidianCore.DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] || {}) };
    const fingerprint = YTXObsidianCore.contentFingerprint(record, settings);
    if (record.obsidian?.fingerprint && record.obsidian.fingerprint !== fingerprint) record.obsidian = { ...record.obsidian, status: "pending" };
    records[metadata.videoId] = record;
    await chrome.storage.local.set({ [RECORDS_KEY]: records });
    return { record, settings };
  }

  function scheduleAutoSync(result) {
    if (result?.settings?.enabled && result.settings.apiUrl && result.settings.apiToken) {
      clearTimeout(autoSyncTimer);
      const scheduledVideoId = result.record.videoId;
      autoSyncTimer = setTimeout(() => chrome.runtime.sendMessage({ type: "YTX_OBSIDIAN_SYNC", videoId: scheduledVideoId }), 800);
    }
  }

  function statusText(status, configured, error) {
    if (!configured) return "Obsidian: no configurado";
    return ({ never: "Obsidian: listo", pending: "Obsidian: cambios sin guardar", synced: "Obsidian: sincronizado", error: `Obsidian: ${error || "error"}` })[status] || "Obsidian: listo";
  }

  async function loadVideoRecord() {
    if (!state.ui || !videoId()) return;
    const stored = await readStorage({ [RECORDS_KEY]: {}, [SETTINGS_KEY]: {} });
    const record = stored[RECORDS_KEY]?.[videoId()] || (await ensureVideoRecord())?.record;
    const settings = { ...YTXObsidianCore.DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] || {}) };
    if (!record) return;
    state.ui.generalNote.value = record.generalNote || "";
    state.ui.folder.value = record.folder || "";
    currentTags = YTXObsidianCore.normalizeTags(record.tags);
    renderTagChips();
    state.ui.syncStatus.textContent = statusText(record.obsidian?.status, settings.enabled && settings.apiUrl && settings.apiToken, record.obsidian?.error);
    state.ui.syncButton.disabled = !settings.enabled || !settings.apiUrl || !settings.apiToken;
  }

  async function saveVideoFields() {
    const ui = state.ui;
    const result = await ensureVideoRecord({
      generalNote: ui.generalNote.value,
      folder: ui.folder.value.trim(),
      tags: currentTags,
      updatedAt: new Date().toISOString(),
    });
    scheduleAutoSync(result);
    await loadVideoRecord();
  }

  function renderTagChips() {
    const ui = state.ui;
    if (!ui?.tagsChips) return;
    ui.tagsChips.replaceChildren();
    currentTags.forEach((tag) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.textContent = `#${tag} ×`;
      chip.setAttribute("aria-label", `Eliminar tag ${tag}`);
      chip.addEventListener("click", () => {
        currentTags = currentTags.filter((item) => item !== tag);
        renderTagChips();
        saveVideoFields();
      });
      ui.tagsChips.appendChild(chip);
    });
  }

  function catalogButton(label, onSelect) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", onSelect);
    return button;
  }

  function renderCatalog(container, items, query, onSelect, createLabel) {
    const normalizedQuery = String(query || "").trim().toLocaleLowerCase();
    const matches = items.filter((item) => !normalizedQuery || item.toLocaleLowerCase().includes(normalizedQuery)).slice(0, 60);
    const children = matches.map((item) => catalogButton(item, () => onSelect(item)));
    if (normalizedQuery && !items.some((item) => item.toLocaleLowerCase() === normalizedQuery)) {
      children.unshift(catalogButton(createLabel(String(query).trim()), () => onSelect(String(query).trim())));
    }
    if (!children.length) {
      const empty = document.createElement("div");
      empty.className = "ytx-video-note__catalog-empty";
      empty.textContent = "No hay elementos disponibles.";
      children.push(empty);
    }
    container.replaceChildren(...children);
    container.hidden = false;
  }

  function renderTagCatalog() {
    const ui = state.ui;
    renderCatalog(ui.tagsCatalog, availableTags.filter((tag) => !currentTags.includes(tag)), ui.tagsInput.value, (tag) => {
      currentTags = YTXObsidianCore.normalizeTags([...currentTags, tag]);
      ui.tagsInput.value = "";
      ui.tagsCatalog.hidden = true;
      renderTagChips();
      saveVideoFields();
    }, (tag) => `Crear tag #${tag.replace(/^#/, "")}`);
  }

  function renderFolderCatalog() {
    const ui = state.ui;
    renderCatalog(ui.folderCatalog, availableFolders, ui.folder.value, (folder) => {
      ui.folder.value = folder;
      ui.folderCatalog.hidden = true;
      saveVideoFields();
    }, (folder) => `Crear carpeta ${folder}`);
  }

  function refreshOrganizationCatalog(force = false) {
    if (!force && Date.now() - catalogRefreshedAt < 15000) return;
    catalogRefreshedAt = Date.now();
    chrome.runtime.sendMessage({ type:"YTX_OBSIDIAN_CATALOG" }, (response) => {
      if (!response?.ok || !state.ui) return;
      availableTags = response.tags || [];
      availableFolders = response.folders || [];
      if (!state.ui.tagsCatalog.hidden) renderTagCatalog();
      if (!state.ui.folderCatalog.hidden) renderFolderCatalog();
    });
  }

  async function loadCurrent() {
    const all = await readAll();
    state.savedNotes = all.filter((item) => item.videoId === videoId());
    renderDrawer();
    refreshMarkers();
    ytx.playerControls?.refreshNoteMarkers();
    ytx.playerControls?.updateNotesButton();
    await ensureVideoRecord();
    return state.savedNotes;
  }

  async function save(draft) {
    const all = await readAll();
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...videoMetadata(),
      type: draft.type || "note",
      startMs: Math.max(0, Number(draft.startMs) || 0),
      endMs: Math.max(Number(draft.endMs) || 0, Number(draft.startMs) || 0),
      text: String(draft.text || "").trim(),
      note: String(draft.note || "").trim(),
      createdAt: new Date().toISOString(),
    };
    all.push(item);
    await writeAll(all);
    await loadCurrent();
    scheduleAutoSync(await ensureVideoRecord());
    return item;
  }

  async function update(id, draft) {
    const all = await readAll();
    const index = all.findIndex((item) => item.id === id);
    if (index === -1) return null;
    all[index] = {
      ...all[index],
      note: String(draft.note || "").trim(),
      updatedAt: new Date().toISOString(),
    };
    await writeAll(all);
    await loadCurrent();
    scheduleAutoSync(await ensureVideoRecord());
    return all[index];
  }

  async function remove(id) {
    const all = await readAll();
    await writeAll(all.filter((item) => item.id !== id));
    await loadCurrent();
    scheduleAutoSync(await ensureVideoRecord());
  }

  function jumpTo(startMs) {
    const video = document.querySelector("video");
    if (video) video.currentTime = startMs / 1000;
  }

  function selectedTextInside(row, fallback) {
    const selection = window.getSelection();
    return selection && !selection.isCollapsed && row.contains(selection.anchorNode)
      ? selection.toString().replace(/\s+/g, " ").trim()
      : fallback;
  }

  function openEditor(draft) {
    const ui = state.ui;
    if (!ui) return;
    editorDraft = draft;
    editorReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ui.noteEditorTime.textContent = ytx.formatTime(draft.startMs);
    ui.noteEditorText.textContent = draft.text || "Marcador sin texto";
    ui.noteEditorInput.value = draft.note || "";
    ui.panel.classList.add("ytx-panel--note-editor-open");
    ui.noteEditorInput.focus();
  }

  function renderDrawer() {
    const ui = state.ui;
    if (!ui?.notesList) return;
    ui.notesList.replaceChildren();
    if (!state.savedNotes.length) {
      const empty = document.createElement("p");
      empty.className = "ytx-notes__empty";
      empty.textContent = "Todavía no hay marcadores en este vídeo.";
      ui.notesList.appendChild(empty);
      return;
    }

    state.savedNotes
      .slice()
      .sort((a, b) => a.startMs - b.startMs)
      .forEach((item) => {
        const row = document.createElement("div");
        row.className = `ytx-note-item ytx-note-item--${item.type === "favorite" ? "favorite" : "note"}`;
        row.dataset.noteId = item.id;
        const jump = document.createElement("button");
        jump.className = "ytx-note-item__jump";
        jump.textContent = ytx.formatTime(item.startMs);
        jump.addEventListener("click", () => jumpTo(item.startMs));
        const body = document.createElement("div");
        body.className = "ytx-note-item__body";
        const text = document.createElement("div");
        text.className = "ytx-note-item__text";
        text.textContent = item.text || "Momento guardado";
        body.appendChild(text);
        if (item.note) {
          const note = document.createElement("div");
          note.className = "ytx-note-item__note";
          note.textContent = item.note;
          body.appendChild(note);
        }
        const deleteButton = document.createElement("button");
        deleteButton.className = "ytx-note-item__delete";
        ytx.panel.setButtonIcon(deleteButton, "trash");
        ytx.panel.labelButton(deleteButton, "Eliminar nota");
        deleteButton.addEventListener("click", async () => {
          const confirmed = await ytx.panel.confirmAction("¿Quieres eliminar esta nota? Esta acción no se puede deshacer.");
          if (confirmed) remove(item.id);
        });
        const editButton = document.createElement("button");
        editButton.className = "ytx-note-item__edit";
        ytx.panel.setButtonIcon(editButton, "edit");
        ytx.panel.labelButton(editButton, "Editar nota");
        editButton.addEventListener("click", () => openEditor({ ...item, editingId: item.id }));
        const actions = document.createElement("div");
        actions.className = "ytx-note-item__actions";
        actions.append(editButton, deleteButton);
        row.append(jump, body, actions);
        ui.notesList.appendChild(row);
      });
  }

  function refreshMarkers() {
    const content = state.ui?.content;
    if (!content) return;
    content.querySelectorAll("[data-block-index]").forEach((row) => {
      const block = state.displayBlocks[Number(row.dataset.blockIndex)];
      const saved = block && state.savedNotes.some((item) => Math.abs(item.startMs - block.startMs) < 500);
      row.classList.toggle("ytx-transcript-row--saved", Boolean(saved));
      const favorite = row.querySelector(".ytx-row-action--favorite");
      if (favorite) {
        favorite.setAttribute("aria-pressed", String(Boolean(saved)));
        ytx.panel.labelButton(favorite, saved ? "Quitar de favoritos" : "Guardar en favoritos");
      }
    });
  }

  function createBlockActions(block, row) {
    const actions = document.createElement("div");
    actions.className = "ytx-row-actions";
    const copy = document.createElement("button");
    copy.className = "ytx-row-action";
    ytx.panel.setButtonIcon(copy, "copy");
    ytx.panel.labelButton(copy, "Copiar fragmento");
    copy.addEventListener("click", () => navigator.clipboard.writeText(selectedTextInside(row, block.text)));

    const favorite = document.createElement("button");
    favorite.className = "ytx-row-action ytx-row-action--favorite";
    ytx.panel.setButtonIcon(favorite, "star");
    ytx.panel.labelButton(favorite, "Guardar en favoritos");
    favorite.setAttribute("aria-pressed", "false");
    favorite.addEventListener("click", () => {
      const existing = state.savedNotes.find((item) => Math.abs(item.startMs - block.startMs) < 500);
      if (existing) remove(existing.id);
      else save({ ...block, type: "favorite", note: "" });
    });

    const note = document.createElement("button");
    note.className = "ytx-row-action";
    ytx.panel.setButtonIcon(note, "edit");
    ytx.panel.labelButton(note, "Añadir nota");
    note.addEventListener("click", () => openEditor({
      ...block,
      type: "note",
      text: selectedTextInside(row, block.text),
      note: "",
    }));
    actions.append(copy, favorite, note);
    return actions;
  }

  function attach(ui) {
    let saveTimer = 0;
    const setNotesOpen = (open) => {
      ui.panel.classList.toggle("ytx-panel--notes-open", open);
      ui.notesToggle.setAttribute("aria-expanded", String(open));
      ytx.panel.labelButton(ui.notesToggle, open ? "Cerrar notas y favoritos de este vídeo" : "Mostrar notas y favoritos de este vídeo");
      renderDrawer();
    };
    const onToggleNotes = () => setNotesOpen(!ui.panel.classList.contains("ytx-panel--notes-open"));
    const onCloseNotes = () => {
      setNotesOpen(false);
      ui.notesToggle.focus();
    };
    const onCancel = () => {
      editorDraft = null;
      ui.panel.classList.remove("ytx-panel--note-editor-open");
      editorReturnFocus?.focus();
      editorReturnFocus = null;
    };
    const onSave = async () => {
      if (!editorDraft) return;
      if (editorDraft.editingId) await update(editorDraft.editingId, { note: ui.noteEditorInput.value });
      else await save({ ...editorDraft, note: ui.noteEditorInput.value });
      onCancel();
    };
    const onEditorKeyDown = (event) => {
      if (event.key !== "Escape" || !ui.panel.classList.contains("ytx-panel--note-editor-open")) return;
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    };
    const onStorageChanged = (changes, area) => {
      if (area !== "local") return;
      if (changes[STORAGE_KEY]) loadCurrent();
      if (changes[RECORDS_KEY] || changes[SETTINGS_KEY]) loadVideoRecord();
    };
    const queueFieldSave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveVideoFields, 400); };
    const commitTags = () => {
      const additions = YTXObsidianCore.normalizeTags(ui.tagsInput.value);
      if (!additions.length) return;
      currentTags = YTXObsidianCore.normalizeTags([...currentTags, ...additions]);
      ui.tagsInput.value = "";
      renderTagChips();
      renderTagCatalog();
      saveVideoFields();
    };
    const onTagKeyDown = (event) => {
      if (event.key !== "Enter" && event.key !== ",") return;
      event.preventDefault();
      commitTags();
    };
    const hideCatalog = (event) => { event.currentTarget.nextElementSibling.hidden = true; };
    const onTagFocus = () => { renderTagCatalog(); refreshOrganizationCatalog(); };
    const onFolderFocus = () => { renderFolderCatalog(); refreshOrganizationCatalog(); };
    const onSync = async () => {
      clearTimeout(saveTimer);
      await saveVideoFields();
      clearTimeout(autoSyncTimer);
      ui.syncButton.disabled = true;
      ui.syncStatus.textContent = "Obsidian: guardando…";
      chrome.runtime.sendMessage({ type: "YTX_OBSIDIAN_SYNC", videoId: videoId() }, (response) => {
        ui.syncButton.disabled = false;
        if (chrome.runtime.lastError) ui.syncStatus.textContent = `Obsidian: ${chrome.runtime.lastError.message}`;
        else ui.syncStatus.textContent = response?.ok ? "Obsidian: sincronizado" : `Obsidian: ${response?.error || "error"}`;
      });
    };
    ui.notesToggle.addEventListener("click", onToggleNotes);
    ui.notesClose.addEventListener("click", onCloseNotes);
    ui.noteEditorCancel.addEventListener("click", onCancel);
    ui.noteEditorSave.addEventListener("click", onSave);
    ui.panel.addEventListener("keydown", onEditorKeyDown);
    [ui.generalNote, ui.folder].forEach((input) => input.addEventListener("input", queueFieldSave));
    ui.tagsInput.addEventListener("keydown", onTagKeyDown);
    ui.tagsInput.addEventListener("change", commitTags);
    ui.tagsInput.addEventListener("focus", onTagFocus);
    ui.tagsInput.addEventListener("input", renderTagCatalog);
    ui.tagsInput.addEventListener("blur", hideCatalog);
    ui.folder.addEventListener("focus", onFolderFocus);
    ui.folder.addEventListener("input", renderFolderCatalog);
    ui.folder.addEventListener("blur", hideCatalog);
    ui.syncButton.addEventListener("click", onSync);
    chrome.storage.onChanged.addListener(onStorageChanged);
    loadCurrent();
    loadVideoRecord();
    refreshOrganizationCatalog();
    return () => {
      ui.notesToggle.removeEventListener("click", onToggleNotes);
      ui.notesClose.removeEventListener("click", onCloseNotes);
      ui.noteEditorCancel.removeEventListener("click", onCancel);
      ui.noteEditorSave.removeEventListener("click", onSave);
      ui.panel.removeEventListener("keydown", onEditorKeyDown);
      [ui.generalNote, ui.folder].forEach((input) => input.removeEventListener("input", queueFieldSave));
      ui.tagsInput.removeEventListener("keydown", onTagKeyDown);
      ui.tagsInput.removeEventListener("change", commitTags);
      ui.tagsInput.removeEventListener("focus", onTagFocus);
      ui.tagsInput.removeEventListener("input", renderTagCatalog);
      ui.tagsInput.removeEventListener("blur", hideCatalog);
      ui.folder.removeEventListener("focus", onFolderFocus);
      ui.folder.removeEventListener("input", renderFolderCatalog);
      ui.folder.removeEventListener("blur", hideCatalog);
      ui.syncButton.removeEventListener("click", onSync);
      clearTimeout(saveTimer);
      clearTimeout(autoSyncTimer);
      chrome.storage.onChanged.removeListener(onStorageChanged);
    };
  }

  ytx.notes = { attach, loadCurrent, save, update, remove, createBlockActions, refreshMarkers };
})();
