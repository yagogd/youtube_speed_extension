"use strict";

const NOTES_KEY = "ytxSavedNotes";
const RECORDS_KEY = "ytxVideoRecords";
const SETTINGS_KEY = "ytxObsidianSettings";
const formatTime = (ms) => { const seconds = Math.floor((Number(ms) || 0) / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; };
const noteLink = (item) => `${item.videoUrl}&t=${Math.floor((Number(item.startMs) || 0) / 1000)}s`;

export function createNotesController({ tr = (value) => value } = {}) {
  const toggle = document.getElementById("global-notes-toggle");
  const section = document.getElementById("global-notes");
  const exportButton = document.getElementById("notes-export");
  const list = document.getElementById("global-notes-list");
  const headingCopy = section.querySelector(".card__heading p");
  if (headingCopy) headingCopy.textContent = "Organizada por carpetas, vídeos y momentos.";
  const toolbar = document.createElement("div");
  toolbar.className = "notes-explorer-toolbar";
  const search = document.createElement("input");
  search.type = "search";
  search.className = "notes-explorer-search";
  search.placeholder = "Buscar vídeo, carpeta, tag o nota…";
  const summary = document.createElement("span");
  summary.className = "notes-explorer-summary";
  toolbar.append(search, summary);
  list.before(toolbar);
  let cache = null;

  function confirmDeletion() {
    document.querySelector(".popup-notice")?.remove();
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "popup-notice popup-confirm";
      overlay.setAttribute("role", "alertdialog");
      const box = document.createElement("div");
      box.className = "popup-notice__box";
      const title = document.createElement("strong");
      title.textContent = tr("Eliminar nota");
      const text = document.createElement("p");
      text.textContent = tr("¿Quieres eliminar esta nota? Esta acción no se puede deshacer.");
      const actions = document.createElement("div");
      actions.className = "popup-confirm__actions";
      const cancel = document.createElement("button");
      cancel.className = "secondary";
      cancel.textContent = tr("Cancelar");
      const remove = document.createElement("button");
      remove.className = "popup-confirm__delete";
      remove.textContent = tr("Eliminar");
      let settled = false;
      const close = (answer) => { if (!settled) { settled = true; overlay.remove(); resolve(answer); } };
      cancel.onclick = () => close(false);
      remove.onclick = () => close(true);
      overlay.onkeydown = (event) => { if (event.key === "Escape") close(false); };
      actions.append(cancel, remove);
      box.append(title, text, actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      cancel.focus();
    });
  }

  function syncWidth(visible = true) {
    document.documentElement.classList.toggle("popup-notes-open", visible && !section.hidden);
  }

  function caretOffset(target, event, fallback) {
    const caret = event && (document.caretPositionFromPoint?.(event.clientX, event.clientY) || document.caretRangeFromPoint?.(event.clientX, event.clientY));
    const node = caret?.offsetNode || caret?.startContainer;
    const offset = caret?.offset ?? caret?.startOffset;
    return node && target.contains(node) ? Math.min(fallback.length, offset) : fallback.length;
  }

  function openInlineEditor(target, value, offset, onSave) {
    if (target.parentElement?.querySelector(":scope > .global-note__editor")) return;
    const editor = document.createElement("textarea");
    editor.className = "global-note__editor global-note__editor--inline";
    editor.value = value;
    const actions = document.createElement("div");
    actions.className = "global-note__editor-actions";
    const cancel = document.createElement("button");
    cancel.className = "secondary"; cancel.textContent = "Cancelar";
    const save = document.createElement("button");
    save.className = "primary"; save.textContent = "Guardar";
    actions.append(cancel, save);
    target.hidden = true;
    target.after(editor, actions);
    editor.focus();
    editor.setSelectionRange(offset, offset);
    const close = () => { editor.remove(); actions.remove(); target.hidden = false; };
    cancel.onclick = close;
    save.onclick = () => onSave(editor.value.trim());
    editor.onkeydown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); save.click(); }
    };
  }

  function saveTimestampEdit(allNotes, item, value) {
    const updated = allNotes.map((note) => note.id === item.id ? { ...note, note:value, updatedAt:new Date().toISOString() } : note);
    chrome.storage.local.get({ [RECORDS_KEY]:{} }, (stored) => {
      const records = stored[RECORDS_KEY] || {};
      const record = records[item.videoId];
      if (record) records[item.videoId] = { ...record, timestampNotes:updated.filter((note) => note.videoId === item.videoId), updatedAt:new Date().toISOString(), obsidian:{ ...(record.obsidian || {}), status:"pending" } };
      chrome.storage.local.set({ [NOTES_KEY]:updated, [RECORDS_KEY]:records }, load);
    });
  }

  function saveGeneralEdit(record, value) {
    chrome.storage.local.get({ [RECORDS_KEY]:{} }, (stored) => {
      const records = stored[RECORDS_KEY] || {};
      const previous = records[record.videoId] || record;
      records[record.videoId] = { ...previous, generalNote:value, updatedAt:new Date().toISOString(), obsidian:{ ...(previous.obsidian || {}), status:"pending" } };
      chrome.storage.local.set({ [RECORDS_KEY]:records }, load);
    });
  }

  function noteCard(item, allNotes) {
    const card = document.createElement("article");
    card.className = "global-note";
    const meta = document.createElement("div");
    meta.className = "global-note__meta";
    const time = document.createElement("a");
    time.href = noteLink(item); time.target = "_blank"; time.textContent = formatTime(item.startMs);
    const actions = document.createElement("div");
    actions.className = "global-note__actions";
    const edit = document.createElement("button");
    edit.className = "global-note__edit"; edit.textContent = "Editar";
    const remove = document.createElement("button");
    remove.textContent = "Eliminar";
    actions.append(edit, remove); meta.append(time, actions);
    const text = document.createElement("div");
    text.className = "global-note__text"; text.textContent = item.text || "Momento guardado";
    card.append(meta, text);
    let editableText = text;
    if (item.note) { const note = document.createElement("div"); note.className = "global-note__note"; note.textContent = item.note; card.appendChild(note); editableText = note; }
    editableText.classList.add("global-note__editable");
    editableText.title = "Doble clic para editar la nota";
    if (item.tags?.length) {
      const tags = document.createElement("div"); tags.className = "global-note__tags"; tags.dataset.i18nSkip = "";
      item.tags.forEach((tag) => { const chip = document.createElement("span"); chip.textContent = `#${String(tag).replace(/^#/, "")}`; tags.appendChild(chip); });
      card.appendChild(tags);
    }
    remove.onclick = async () => { if (await confirmDeletion()) chrome.storage.local.set({ [NOTES_KEY]:allNotes.filter((note) => note.id !== item.id) }, load); };
    const beginEdit = (event) => openInlineEditor(editableText, item.note || "", caretOffset(editableText, event, item.note || ""), (value) => saveTimestampEdit(allNotes, item, value));
    editableText.ondblclick = beginEdit;
    edit.onclick = () => beginEdit(null);
    return card;
  }

  function render() {
    if (!cache) return;
    const { notes, records, defaultFolder } = cache;
    const query = search.value.trim().toLocaleLowerCase();
    const videos = new Map();
    notes.forEach((note) => {
      const entry = videos.get(note.videoId) || { record:records[note.videoId] || note, notes:[] };
      entry.notes.push(note); videos.set(note.videoId, entry);
    });
    Object.entries(records).forEach(([id, record]) => { if (record.generalNote?.trim() || videos.has(id)) videos.set(id, videos.get(id) || { record, notes:[] }); });
    const root = { folders:new Map(), videos:[] };
    let videoCount = 0, noteCount = 0;
    videos.forEach((entry, videoId) => {
      const record = { ...entry.notes[0], ...entry.record, videoId };
      const folder = String(record.folder || defaultFolder || "Sin carpeta").replace(/^\/+|\/+$/g, "") || "Sin carpeta";
      const haystack = [folder, record.videoTitle, record.channel, record.generalNote, ...(record.tags || []), ...entry.notes.flatMap((note) => [note.text, note.note, ...(note.tags || [])])].join(" ").toLocaleLowerCase();
      if (query && !haystack.includes(query)) return;
      let node = root;
      folder.split("/").filter(Boolean).forEach((name) => { if (!node.folders.has(name)) node.folders.set(name, { folders:new Map(), videos:[] }); node = node.folders.get(name); });
      node.videos.push({ record, notes:entry.notes.slice().sort((a, b) => a.startMs - b.startMs) });
      videoCount += 1; noteCount += entry.notes.length;
    });
    list.replaceChildren(); summary.textContent = `${videoCount} vídeos · ${noteCount} notas`;
    if (!videoCount) { const empty = document.createElement("div"); empty.className = "shortcut-empty"; empty.textContent = query ? "No hay resultados." : "Todavía no tienes notas ni favoritos."; list.appendChild(empty); return; }
    const nodeCount = (node) => node.videos.length + [...node.folders.values()].reduce((sum, child) => sum + nodeCount(child), 0);
    const renderVideo = ({ record, notes:videoNotes }) => {
      const details = document.createElement("details"); details.className = "notes-video"; details.open = Boolean(query);
      const heading = document.createElement("summary");
      const title = document.createElement("span"); title.className = "notes-video__title"; title.dataset.i18nSkip = ""; title.textContent = record.videoTitle || "Vídeo de YouTube";
      const count = document.createElement("span"); count.className = "notes-tree-count"; count.textContent = String(videoNotes.length);
      heading.append(title, count);
      const body = document.createElement("div"); body.className = "notes-video__body";
      const link = document.createElement("a"); link.className = "notes-video__link"; link.href = record.videoUrl; link.target = "_blank";
      if (record.channel) { const channel = document.createElement("span"); channel.dataset.i18nSkip = ""; channel.textContent = record.channel; link.append(channel, document.createTextNode(" · ")); }
      link.appendChild(document.createTextNode("Abrir vídeo ↗")); body.appendChild(link);
      const general = document.createElement("div"); general.className = "notes-video__general";
      const generalLabel = document.createElement("strong"); generalLabel.textContent = "Nota general";
      const generalCopy = document.createElement("p"); generalCopy.className = "global-note__editable"; generalCopy.textContent = record.generalNote || "Doble clic para añadir una nota general…"; generalCopy.title = "Doble clic para editar la nota general";
      if (record.generalNote) generalCopy.dataset.i18nSkip = "";
      generalCopy.ondblclick = (event) => openInlineEditor(generalCopy, record.generalNote || "", caretOffset(generalCopy, event, record.generalNote || ""), (value) => saveGeneralEdit(record, value));
      general.append(generalLabel, generalCopy); body.appendChild(general);
      if (record.tags?.length) { const tags = document.createElement("div"); tags.className = "notes-video__tags"; tags.dataset.i18nSkip = ""; record.tags.forEach((tag) => { const chip = document.createElement("span"); chip.textContent = `#${tag}`; tags.appendChild(chip); }); body.appendChild(tags); }
      videoNotes.forEach((note) => body.appendChild(noteCard(note, notes)));
      details.append(heading, body); return details;
    };
    const renderFolder = (name, node, depth = 0) => {
      const details = document.createElement("details"); details.className = "notes-folder"; details.open = depth === 0 || Boolean(query);
      const heading = document.createElement("summary"); const label = document.createElement("span"); label.className = "notes-folder__name"; label.dataset.i18nSkip = ""; label.textContent = name; const count = document.createElement("span"); count.className = "notes-tree-count"; count.textContent = String(nodeCount(node)); heading.append(label, count);
      const children = document.createElement("div"); children.className = "notes-folder__children";
      [...node.folders.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([childName, child]) => children.appendChild(renderFolder(childName, child, depth + 1)));
      node.videos.sort((a, b) => (a.record.videoTitle || "").localeCompare(b.record.videoTitle || "")).forEach((video) => children.appendChild(renderVideo(video)));
      details.append(heading, children); return details;
    };
    [...root.folders.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([name, node]) => list.appendChild(renderFolder(name, node)));
  }

  function load() {
    chrome.storage.local.get({ [NOTES_KEY]:[], [RECORDS_KEY]:{}, [SETTINGS_KEY]:{} }, (stored) => {
      cache = { notes:Array.isArray(stored[NOTES_KEY]) ? stored[NOTES_KEY] : [], records:stored[RECORDS_KEY] || {}, defaultFolder:stored[SETTINGS_KEY]?.defaultFolder || "YouTube/Inbox" };
      render();
    });
  }

  search.oninput = render;
  toggle.onclick = () => { section.hidden = !section.hidden; syncWidth(); toggle.setAttribute("aria-expanded", String(!section.hidden)); if (!section.hidden) load(); };
  exportButton.onclick = () => chrome.storage.local.get({ [NOTES_KEY]:[] }, (stored) => {
    const notes = Array.isArray(stored[NOTES_KEY]) ? stored[NOTES_KEY] : [];
    const grouped = new Map(); notes.forEach((note) => { const group = grouped.get(note.videoId) || []; group.push(note); grouped.set(note.videoId, group); });
    const lines = ["# Notas y favoritos de YouTube", ""];
    grouped.forEach((items) => { const first = items[0]; lines.push(`## [${first.videoTitle || "Vídeo de YouTube"}](${first.videoUrl})`, ""); items.sort((a, b) => a.startMs - b.startMs).forEach((item) => { lines.push(`- [${formatTime(item.startMs)}](${noteLink(item)}) — ${item.text || "Momento guardado"}`); if (item.note) lines.push(`  - Nota: ${item.note}`); }); lines.push(""); });
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type:"text/markdown;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "notas-youtube.md"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && (changes[NOTES_KEY] || changes[RECORDS_KEY] || changes[SETTINGS_KEY]) && !section.hidden) load(); });
  return { isOpen:() => !section.hidden, load, syncWidth };
}
