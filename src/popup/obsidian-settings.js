import { getStored, setStored } from "./storage.js";

const KEY = "ytxObsidianSettings";
const DEFAULT_NOTE_TEMPLATE = "{{frontmatter}}\n\n{{general_note}}\n\n{{timestamp_notes}}";
const DEFAULT_GENERAL_NOTE_TEMPLATE = "## Nota general\n\n{{content}}";
const DEFAULT_TIMESTAMP_NOTE_TEMPLATE = "### [{{time}}]({{link}})\n{{tags}}\n*{{text}}*\n\n{{note}}";
const DEFAULTS = {
  enabled:false, apiUrl:"http://127.0.0.1:27123", apiToken:"", defaultFolder:"YouTube/Inbox",
  fileNameTemplate:"{video_title}", noteTemplate:DEFAULT_NOTE_TEMPLATE, saveBehavior:"auto",
  generalNoteTemplate:DEFAULT_GENERAL_NOTE_TEMPLATE, timestampNoteTemplate:DEFAULT_TIMESTAMP_NOTE_TEMPLATE,
  includeMetadata:true, includeSource:true, includeVideoId:true, includeChannel:true, includeUrl:true,
  includeNoteCreatedDate:true, includeVideoPublishedDate:true, includeGeneralNote:true, includeTimestampNotes:true, includeTags:true,
  contentSettingsVersion:2, contentOrderVersion:3, contentOrder:["source", "videoId", "channel", "url", "noteCreatedDate", "videoPublishedDate", "tags", "generalNote", "timestampNotes"], fileNamePresets:[], noteTemplatePresets:[],
};
const BUILTIN_NAMES = [
  { name:"Título", value:"{video_title}" },
  { name:"Canal y título", value:"{channel} - {video_title}" },
  { name:"Fecha y título", value:"{date} - {video_title}" },
  { name:"ID y título", value:"{video_id} - {video_title}" },
];
const BUILTIN_NOTES = [
  { name:"Nota sencilla", value:DEFAULT_NOTE_TEMPLATE },
  { name:"Notas de estudio", value:"{{frontmatter}}\n\n## Fuente\n\n[Ver vídeo]({{url}}) · {{channel}}\n\n{{general_note}}\n\n## Conceptos relacionados\n\n- \n\n{{timestamp_notes}}" },
];

const cleanSettings = (value = {}) => Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, key in value ? value[key] : DEFAULTS[key]]));
const readSettings = async () => cleanSettings((await getStored({ [KEY]:{} }))[KEY]);
const writeSettings = (settings) => new Promise((resolve) => setStored({ [KEY]:settings }, resolve));

function makeGroup(title, copy) {
  const section = document.createElement("details");
  section.className = "obsidian-settings-group";
  const heading = document.createElement("summary");
  heading.className = "obsidian-settings-group__heading";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const text = document.createElement("span");
  text.textContent = copy;
  heading.append(strong, text);
  section.appendChild(heading);
  return section;
}

function makeEditor(title, copy) {
  const section = document.createElement("details");
  section.className = "obsidian-format-editor";
  const heading = document.createElement("summary");
  heading.className = "obsidian-format-editor__heading";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const text = document.createElement("span");
  text.textContent = copy;
  heading.append(strong, text);
  section.appendChild(heading);
  return section;
}

function makeTemplateField(id, labelText, rows) {
  const label = document.createElement("label");
  label.className = "field";
  label.appendChild(document.createTextNode(labelText));
  const textarea = document.createElement("textarea");
  textarea.id = id;
  textarea.rows = rows;
  label.appendChild(textarea);
  return { label, textarea };
}

function createPresetManager({ field, storageKey, builtins, status, title }) {
  const root = document.createElement("div");
  root.className = "obsidian-preset-manager";
  const heading = document.createElement("strong");
  heading.textContent = title;
  const savedCopy = document.createElement("span");
  savedCopy.className = "obsidian-preset-manager__copy";
  savedCopy.textContent = "Selecciona una opción incluida o una que hayas guardado.";
  const picker = document.createElement("div");
  picker.className = "obsidian-preset-manager__row";
  const select = document.createElement("select");
  select.setAttribute("aria-label", title);
  const apply = document.createElement("button");
  apply.type = "button";
  apply.className = "secondary";
  apply.textContent = "Usar";
  const rename = document.createElement("button");
  rename.type = "button";
  rename.className = "secondary obsidian-preset-manager__rename";
  rename.textContent = "Renombrar";
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "secondary obsidian-preset-manager__remove";
  remove.textContent = "Eliminar";
  picker.append(select, apply, rename, remove);
  const creator = document.createElement("div");
  creator.className = "obsidian-preset-manager__row obsidian-preset-manager__row--create";
  const creatorHeading = document.createElement("strong");
  creatorHeading.textContent = "Guardar como nuevo";
  const name = document.createElement("input");
  name.placeholder = "Ej.: Mis notas de estudio";
  name.setAttribute("aria-label", "Nombre del nuevo formato");
  const save = document.createElement("button");
  save.type = "button";
  save.className = "primary";
  save.textContent = "Guardar copia";
  creator.append(creatorHeading, name, save);
  root.append(heading, savedCopy, picker, creator);

  async function render(selected = "") {
    const settings = await readSettings();
    const custom = Array.isArray(settings[storageKey]) ? settings[storageKey] : [];
    select.replaceChildren();
    [...builtins.map((item) => ({ ...item, builtin:true })), ...custom].forEach((item) => {
      const option = new Option(`${item.builtin ? "Incluida · " : "Personal · "}${item.name}`, item.name);
      option.dataset.value = item.value;
      option.dataset.builtin = String(Boolean(item.builtin));
      select.add(option);
    });
    if (selected) select.value = selected;
    const isBuiltin = select.selectedOptions[0]?.dataset.builtin === "true";
    remove.disabled = isBuiltin;
    rename.disabled = isBuiltin;
  }
  select.addEventListener("change", () => {
    const isBuiltin = select.selectedOptions[0]?.dataset.builtin === "true";
    remove.disabled = isBuiltin;
    rename.disabled = isBuiltin;
  });
  apply.addEventListener("click", () => {
    field.value = select.selectedOptions[0]?.dataset.value || "";
    field.dispatchEvent(new Event("change"));
    status.textContent = "Formato aplicado y guardado";
  });
  save.addEventListener("click", async () => {
    const presetName = name.value.trim();
    if (!presetName || !field.value.trim()) { status.textContent = "Escribe un nombre y un contenido antes de guardar"; return; }
    const settings = await readSettings();
    const custom = Array.isArray(settings[storageKey]) ? settings[storageKey] : [];
    const editingName = creator.dataset.editingName || "";
    settings[storageKey] = [...custom.filter((item) => item.name !== editingName && item.name.toLocaleLowerCase() !== presetName.toLocaleLowerCase()), { name:presetName, value:field.value }];
    await writeSettings(settings);
    name.value = "";
    delete creator.dataset.editingName;
    creatorHeading.textContent = "Guardar como nuevo";
    save.textContent = "Guardar copia";
    await render(presetName);
    status.textContent = `Formato “${presetName}” guardado`;
  });
  rename.addEventListener("click", () => {
    const option = select.selectedOptions[0];
    if (!option || option.dataset.builtin === "true") return;
    creator.dataset.editingName = option.value;
    creatorHeading.textContent = "Cambiar nombre";
    name.value = option.value;
    name.focus();
    name.select();
    save.textContent = "Guardar nombre";
  });
  remove.addEventListener("click", async () => {
    const option = select.selectedOptions[0];
    if (!option || option.dataset.builtin === "true") return;
    const settings = await readSettings();
    settings[storageKey] = (settings[storageKey] || []).filter((item) => item.name !== option.value);
    await writeSettings(settings);
    await render();
    status.textContent = "Formato eliminado";
  });
  render();
  return root;
}

function createVariableHelper(field, variables, copy) {
  const root = document.createElement("div");
  root.className = "obsidian-variable-helper";
  const description = document.createElement("span");
  description.textContent = copy;
  const chips = document.createElement("div");
  chips.className = "obsidian-variable-helper__chips";
  variables.forEach(({ token, label }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "obsidian-variable-chip";
    button.innerHTML = `<strong>${label}</strong><code>${token}</code>`;
    button.title = `Insertar ${token}`;
    button.addEventListener("click", () => {
      const start = field.selectionStart ?? field.value.length;
      const end = field.selectionEnd ?? start;
      field.setRangeText(token, start, end, "end");
      field.focus();
      field.dispatchEvent(new Event("change"));
    });
    chips.appendChild(button);
  });
  root.append(description, chips);
  return root;
}

function createContentOrganizer(options, status) {
  const root = document.createElement("div");
  root.className = "obsidian-content-builder";
  const orderLabel = document.createElement("p");
  orderLabel.className = "section-copy";
  orderLabel.textContent = "Activa los bloques y arrástralos para decidir el orden de la nota.";
  const list = document.createElement("div");
  list.className = "obsidian-content-list";
  const primary = [
    { id:"source", input:"obsidian-include-source", title:"Fuente", copy:"Identifica la nota como YouTube" },
    { id:"videoId", input:"obsidian-include-video-id", title:"ID del vídeo", copy:"Identificador único de YouTube" },
    { id:"channel", input:"obsidian-include-channel", title:"Canal", copy:"Nombre del creador" },
    { id:"url", input:"obsidian-include-url", title:"URL del vídeo", copy:"Enlace al vídeo original" },
    { id:"noteCreatedDate", input:"obsidian-include-note-created-date", title:"Creación de la nota", copy:"Día en que empezaste a tomar notas" },
    { id:"videoPublishedDate", input:"obsidian-include-video-published-date", title:"Publicación del vídeo", copy:"Fecha publicada por YouTube" },
    { id:"generalNote", input:"obsidian-include-general-note", title:"Nota general", copy:"Resumen o conclusiones" },
    { id:"timestampNotes", input:"obsidian-include-timestamp-notes", title:"Notas timestamp", copy:"Momentos guardados del vídeo" },
    { id:"tags", input:"obsidian-include-tags", title:"Tags", copy:"Se exportan en el frontmatter" },
  ].map((item) => {
    const input = document.getElementById(item.input);
    return { ...item, element:input, label:input.closest("label") };
  });
  let order = [];

  async function persist() {
    const settings = await readSettings();
    settings.contentOrder = order;
    await writeSettings(settings);
    status.textContent = "Orden de contenido guardado";
  }
  function move(id, offset) {
    const index = order.indexOf(id);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    render();
    persist();
  }
  function render() {
    list.replaceChildren();
    order.forEach((id, index) => {
      const item = primary.find((entry) => entry.id === id);
      const input = item.element;
      const row = document.createElement("div");
      row.className = `obsidian-content-item${input.checked ? " is-enabled" : ""}`;
      row.draggable = true;
      row.dataset.id = id;
      const handle = document.createElement("span");
      handle.className = "obsidian-content-item__handle";
      handle.textContent = "⠿";
      handle.title = "Arrastrar para ordenar";
      const copy = document.createElement("label");
      copy.className = "obsidian-content-item__copy";
      copy.htmlFor = item.input;
      copy.innerHTML = `<strong>${item.title}</strong><span>${item.copy}</span>`;
      const toggle = item.label;
      toggle.className = "obsidian-content-item__toggle";
      row.append(handle, copy, toggle);
      const controls = document.createElement("span");
      controls.className = "obsidian-content-item__controls";
      [["↑", -1, "Subir"], ["↓", 1, "Bajar"]].forEach(([text, offset, title]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = text;
        button.title = title;
        button.disabled = offset < 0 ? index === 0 : index === order.length - 1;
        button.addEventListener("click", () => move(id, offset));
        controls.appendChild(button);
      });
      row.appendChild(controls);
      input.addEventListener("change", render, { once:true });
      row.addEventListener("dragstart", (event) => { event.dataTransfer.setData("text/plain", id); row.classList.add("is-dragging"); });
      row.addEventListener("dragend", () => row.classList.remove("is-dragging"));
      row.addEventListener("dragover", (event) => { event.preventDefault(); row.classList.add("is-drag-over"); });
      row.addEventListener("dragleave", () => row.classList.remove("is-drag-over"));
      row.addEventListener("drop", (event) => {
        event.preventDefault();
        const source = event.dataTransfer.getData("text/plain");
        const sourceIndex = order.indexOf(source);
        const targetIndex = order.indexOf(id);
        if (sourceIndex < 0 || sourceIndex === targetIndex) return;
        order.splice(targetIndex, 0, order.splice(sourceIndex, 1)[0]);
        render();
        persist();
      });
      list.appendChild(row);
    });
  }
  readSettings().then((settings) => {
    const storedOrder = Array.isArray(settings.contentOrder) ? settings.contentOrder : [];
    order = [...new Set([...storedOrder, ...primary.map((item) => item.id)])].filter((id) => primary.some((item) => item.id === id));
    render();
  });
  root.append(orderLabel, list);
  options.replaceChildren(root);
  return options;
}

export async function initObsidianSettings() {
  const metadataInput = document.getElementById("obsidian-include-metadata");
  const metadataLabel = metadataInput.closest("label");
  const metadataOptions = [
    ["source", "Fuente"], ["video-id", "ID del vídeo"], ["channel", "Canal"], ["url", "URL"],
    ["note-created-date", "Fecha de creación de la nota"], ["video-published-date", "Fecha de publicación del vídeo"],
  ].map(([id, label]) => {
    const wrapper = document.createElement("label");
    const input = document.createElement("input");
    input.id = `obsidian-include-${id}`;
    input.type = "checkbox";
    wrapper.append(input, document.createTextNode(` ${label}`));
    return wrapper;
  });
  metadataLabel.replaceWith(...metadataOptions);
  const mapping = { enabled:"enabled", "api-url":"apiUrl", "api-token":"apiToken", "default-folder":"defaultFolder", "file-name-template":"fileNameTemplate", "note-template":"noteTemplate", "include-source":"includeSource", "include-video-id":"includeVideoId", "include-channel":"includeChannel", "include-url":"includeUrl", "include-note-created-date":"includeNoteCreatedDate", "include-video-published-date":"includeVideoPublishedDate", "include-general-note":"includeGeneralNote", "include-timestamp-notes":"includeTimestampNotes", "include-tags":"includeTags" };
  const status = document.getElementById("obsidian-test-status");
  const previous = (await getStored({ [KEY]:{} }))[KEY] || {};
  if (previous.contentSettingsVersion !== 2) {
    previous.includeGeneralNote = true;
    previous.includeTimestampNotes = true;
    previous.contentSettingsVersion = 2;
  }
  if (previous.contentOrderVersion !== 3) {
    previous.contentOrder = DEFAULTS.contentOrder.slice();
    previous.contentOrderVersion = 3;
  }
  if (!previous.defaultFolder && (previous.rootFolder || previous.inboxFolder)) previous.defaultFolder = [previous.rootFolder, previous.inboxFolder].filter(Boolean).join("/");
  if (!("includeSource" in previous)) {
    const includeLegacyMetadata = previous.includeMetadata !== false;
    ["includeSource", "includeVideoId", "includeChannel", "includeUrl", "includeNoteCreatedDate", "includeVideoPublishedDate"].forEach((key) => { previous[key] = includeLegacyMetadata; });
  }
  if (Array.isArray(previous.contentOrder) && previous.contentOrder.includes("metadata")) {
    const expanded = ["source", "videoId", "channel", "url", "noteCreatedDate", "videoPublishedDate"];
    previous.contentOrder = previous.contentOrder.flatMap((key) => key === "metadata" ? expanded : key);
  }
  const oldDefault = "{{frontmatter}}\n\n# {{title}}\n\n{{general_note}}\n\n{{timestamp_notes}}";
  if (!previous.noteTemplate || previous.noteTemplate === oldDefault) previous.noteTemplate = DEFAULT_NOTE_TEMPLATE;
  const stored = cleanSettings(previous);
  stored.saveBehavior = "auto";
  await writeSettings(stored);

  Object.entries(mapping).forEach(([id, key]) => {
    const field = document.getElementById(`obsidian-${id}`);
    if (field.type === "checkbox") field.checked = Boolean(stored[key]); else field.value = stored[key];
    field.addEventListener("change", async () => {
      const current = await readSettings();
      current[key] = field.type === "checkbox" ? field.checked : field.value.trim();
      await writeSettings(current);
      status.textContent = "Configuración guardada";
    });
  });

  const quickEnabled = document.getElementById("quick-obsidian-enabled");
  if (quickEnabled) {
    const obsidianEnabled = document.getElementById("obsidian-enabled");
    const syncQuick = () => { quickEnabled.checked = Boolean(obsidianEnabled?.checked); };
    syncQuick();
    quickEnabled.addEventListener("change", async () => {
      const current = await readSettings();
      current.enabled = quickEnabled.checked;
      await writeSettings(current);
      if (obsidianEnabled) obsidianEnabled.checked = quickEnabled.checked;
    });
    obsidianEnabled?.addEventListener("change", syncQuick);
  }

  const fileField = document.getElementById("obsidian-file-name-template");
  const noteField = document.getElementById("obsidian-note-template");
  const fileManager = createPresetManager({ field:fileField, storageKey:"fileNamePresets", builtins:BUILTIN_NAMES, status, title:"Formatos guardados" });
  const noteManager = createPresetManager({ field:noteField, storageKey:"noteTemplatePresets", builtins:BUILTIN_NOTES, status, title:"Plantillas guardadas" });
  const fileVariables = createVariableHelper(fileField, [
    { token:"{video_title}", label:"Título" }, { token:"{channel}", label:"Canal" },
    { token:"{note_date}", label:"Fecha nota" }, { token:"{video_date}", label:"Fecha vídeo" }, { token:"{video_id}", label:"ID" },
  ], "Construye el nombre pulsando las piezas que necesites. Puedes escribir texto entre ellas.");
  const noteVariables = createVariableHelper(noteField, [
    { token:"{{frontmatter}}", label:"Metadata" }, { token:"{{title}}", label:"Título" },
    { token:"{{general_note}}", label:"Nota general" }, { token:"{{timestamp_notes}}", label:"Notas" },
    { token:"{{url}}", label:"URL" }, { token:"{{channel}}", label:"Canal" },
    { token:"{{tags}}", label:"Tags" }, { token:"{{video_id}}", label:"ID" },
  ], "Escribe Markdown normal y pulsa una pieza para insertarla donde esté el cursor.");

  const generalNoteField = makeTemplateField("obsidian-general-note-template", "Plantilla del bloque de nota general", 4);
  const timestampNoteField = makeTemplateField("obsidian-timestamp-note-template", "Plantilla de cada nota con timestamp", 7);
  const bindTemplateField = (field, key) => {
    field.value = stored[key] ?? "";
    field.addEventListener("change", async () => {
      const current = await readSettings();
      current[key] = field.value;
      await writeSettings(current);
      status.textContent = "Configuración guardada";
    });
  };
  bindTemplateField(generalNoteField.textarea, "generalNoteTemplate");
  bindTemplateField(timestampNoteField.textarea, "timestampNoteTemplate");
  const generalNoteVariables = createVariableHelper(generalNoteField.textarea, [
    { token:"{{content}}", label:"Contenido" },
  ], "Escribe el bloque de la nota general. Pulsa la pieza para insertarla donde esté el cursor.");
  const timestampNoteVariables = createVariableHelper(timestampNoteField.textarea, [
    { token:"{{time}}", label:"Minuto" }, { token:"{{link}}", label:"Enlace al minuto" }, { token:"{{url}}", label:"Enlace" },
    { token:"{{tags}}", label:"Tags" }, { token:"{{text}}", label:"Texto" }, { token:"{{note}}", label:"Nota" },
  ], "Compón el formato de cada momento guardado. Envuelve las piezas en Markdown: [{{time}}]({{link}}), *{{text}}*, #{{tags}}…");
  const makeResetButton = (field, defaultValue) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary wide-button";
    button.style.marginTop = "10px";
    button.textContent = "Restaurar valores";
    button.addEventListener("click", () => {
      field.value = defaultValue;
      field.dispatchEvent(new Event("change"));
    });
    return button;
  };
  const generalNoteReset = makeResetButton(generalNoteField.textarea, DEFAULT_GENERAL_NOTE_TEMPLATE);
  const timestampNoteReset = makeResetButton(timestampNoteField.textarea, DEFAULT_TIMESTAMP_NOTE_TEMPLATE);

  const body = document.querySelector(".obsidian-settings");
  const connection = makeGroup("Conexión", "Acceso local y cola offline");
  const destination = makeGroup("Destino", "Dónde se guardan las notas por defecto");
  const templates = makeGroup("Formato", "Nombres y contenido completamente personalizables");
  const content = makeGroup("Contenido", "Elige qué información exportar");
  const toggle = body.querySelector(".toggle");
  const urlLabel = document.getElementById("obsidian-api-url").closest("label");
  const tokenLabel = document.getElementById("obsidian-api-token").closest("label");
  const urlCopy = tokenLabel.nextElementSibling;
  urlCopy.textContent = "HTTP local evita problemas con certificados. También puedes usar HTTPS si tu navegador confía en el certificado.";
  const folderLabel = document.getElementById("obsidian-default-folder").closest("label");
  const folderCopy = folderLabel.nextElementSibling;
  folderCopy.textContent = "Escribe la ruta desde la raíz del vault y separa cada nivel con /. Ejemplo: YouTube/Inbox. La carpeta elegida para un vídeo concreto tendrá prioridad.";
  const fileLabel = fileField.closest("label");
  const fileDatalist = document.getElementById("obsidian-file-name-presets");
  const fileCopy = fileDatalist.nextElementSibling;
  fileCopy.textContent = "Puedes combinar texto con título, canal, ID, fecha de creación de la nota o fecha de publicación del vídeo.";
  const noteLabel = noteField.closest("label");
  const noteCopy = noteLabel.nextElementSibling;
  const options = body.querySelector(".obsidian-options");
  const test = document.getElementById("obsidian-test");
  const sync = document.getElementById("obsidian-sync-pending");
  const retryCopy = status.nextElementSibling;
  retryCopy.textContent = "Tu navegador reintenta la sincronización cada minuto y al arrancar; cuando vuelve la conexión, actualiza todos los vídeos pendientes.";
  const credentials = document.createElement("div");
  credentials.className = "obsidian-credentials";
  credentials.append(urlLabel, tokenLabel);
  connection.append(toggle, credentials, urlCopy, test, sync, status, retryCopy);
  destination.append(folderLabel, folderCopy);
  const fileEditor = makeEditor("1. Nombre del archivo", "Define cómo se llamará el archivo .md dentro de Obsidian.");
  fileEditor.append(fileLabel, fileDatalist, fileVariables, fileCopy, fileManager);
  const noteEditor = makeEditor("2. Plantilla Markdown", "Define qué aspecto tendrá el contenido de la nota.");
  noteEditor.append(noteLabel, noteVariables, noteCopy, noteManager);
  const generalNoteEditor = makeEditor("3. Nota general", "Formato del bloque de resumen o conclusiones.");
  generalNoteEditor.append(generalNoteField.label, generalNoteVariables, generalNoteReset);
  const timestampNoteEditor = makeEditor("4. Notas con timestamp", "Formato de cada momento guardado del vídeo.");
  timestampNoteEditor.append(timestampNoteField.label, timestampNoteVariables, timestampNoteReset);
  templates.append(fileEditor, noteEditor, generalNoteEditor, timestampNoteEditor);
  content.append(createContentOrganizer(options, status));
  body.replaceChildren(connection, destination, templates, content);

  test.addEventListener("click", () => {
    status.textContent = "Comprobando conexión…";
    chrome.runtime.sendMessage({ type:"YTX_OBSIDIAN_TEST" }, (response) => { status.textContent = response?.ok ? "Conexión correcta" : response?.error || chrome.runtime.lastError?.message || "No se pudo conectar"; });
  });
  sync.addEventListener("click", () => {
    status.textContent = "Sincronizando notas pendientes…";
    chrome.runtime.sendMessage({ type:"YTX_OBSIDIAN_SYNC_PENDING" }, (response) => { status.textContent = response?.ok === false ? response.error : `${response?.synced || 0} sincronizadas; ${response?.pending || 0} pendientes`; });
  });
}
