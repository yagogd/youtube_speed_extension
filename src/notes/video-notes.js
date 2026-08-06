(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const state = ytx.state;
  const STORAGE_KEY = "ytxSavedNotes";
  let editorDraft = null;

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

  async function loadCurrent() {
    const all = await readAll();
    state.savedNotes = all.filter((item) => item.videoId === videoId());
    renderDrawer();
    refreshMarkers();
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
    return item;
  }

  async function remove(id) {
    const all = await readAll();
    await writeAll(all.filter((item) => item.id !== id));
    await loadCurrent();
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
    ui.noteEditorTime.textContent = ytx.formatTime(draft.startMs);
    ui.noteEditorText.textContent = draft.text || "Marcador sin texto";
    ui.noteEditorInput.value = draft.note || "";
    ui.panel.classList.add("ytx-panel--note-editor-open");
    ui.noteEditorInput.focus();
  }

  function currentMomentDraft() {
    const video = document.querySelector("video");
    const currentMs = (video?.currentTime || 0) * 1000;
    const block = state.displayBlocks.find((candidate) => candidate.startMs <= currentMs && currentMs < candidate.endMs);
    return {
      type: "favorite",
      startMs: block?.startMs ?? currentMs,
      endMs: block?.endMs ?? currentMs,
      text: block?.text || "",
      note: "",
    };
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
        row.className = "ytx-note-item";
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
        deleteButton.textContent = "×";
        deleteButton.title = "Eliminar";
        deleteButton.addEventListener("click", () => remove(item.id));
        row.append(jump, body, deleteButton);
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
      if (favorite) favorite.textContent = saved ? "★" : "☆";
    });
  }

  function createBlockActions(block, row) {
    const actions = document.createElement("div");
    actions.className = "ytx-row-actions";
    const copy = document.createElement("button");
    copy.className = "ytx-row-action";
    copy.textContent = "⧉";
    copy.title = "Copiar fragmento";
    copy.addEventListener("click", () => navigator.clipboard.writeText(selectedTextInside(row, block.text)));

    const favorite = document.createElement("button");
    favorite.className = "ytx-row-action ytx-row-action--favorite";
    favorite.textContent = "☆";
    favorite.title = "Guardar en favoritos";
    favorite.addEventListener("click", () => {
      const existing = state.savedNotes.find((item) => Math.abs(item.startMs - block.startMs) < 500);
      if (existing) remove(existing.id);
      else save({ ...block, type: "favorite", note: "" });
    });

    const note = document.createElement("button");
    note.className = "ytx-row-action";
    note.textContent = "✎";
    note.title = "Añadir nota";
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
    const onBookmark = () => openEditor(currentMomentDraft());
    const onToggleNotes = () => {
      ui.panel.classList.toggle("ytx-panel--notes-open");
      renderDrawer();
    };
    const onCancel = () => {
      editorDraft = null;
      ui.panel.classList.remove("ytx-panel--note-editor-open");
    };
    const onSave = async () => {
      if (!editorDraft) return;
      await save({ ...editorDraft, note: ui.noteEditorInput.value });
      onCancel();
    };
    const onStorageChanged = (changes, area) => {
      if (area === "local" && changes[STORAGE_KEY]) loadCurrent();
    };
    ui.bookmarkButton.addEventListener("click", onBookmark);
    ui.notesToggle.addEventListener("click", onToggleNotes);
    ui.noteEditorCancel.addEventListener("click", onCancel);
    ui.noteEditorSave.addEventListener("click", onSave);
    chrome.storage.onChanged.addListener(onStorageChanged);
    loadCurrent();
    return () => {
      ui.bookmarkButton.removeEventListener("click", onBookmark);
      ui.notesToggle.removeEventListener("click", onToggleNotes);
      ui.noteEditorCancel.removeEventListener("click", onCancel);
      ui.noteEditorSave.removeEventListener("click", onSave);
      chrome.storage.onChanged.removeListener(onStorageChanged);
    };
  }

  ytx.notes = { attach, loadCurrent, save, remove, createBlockActions, refreshMarkers };
})();
