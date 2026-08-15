import { getStored, setStored } from "./storage.js";

const KEY = "ytxObsidianSettings";
const DEFAULTS = { enabled:false, apiUrl:"http://127.0.0.1:27123", apiToken:"", defaultFolder:"YouTube/Inbox", fileNameTemplate:"{video_title}", noteTemplate:"{{frontmatter}}\n\n# {{title}}\n\n{{general_note}}\n\n{{timestamp_notes}}", saveBehavior:"auto", includeMetadata:true, includeGeneralNote:true, includeTimestampNotes:true, includeTags:true, includeTimestampLinks:true };
const cleanSettings = (value = {}) => Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, key in value ? value[key] : DEFAULTS[key]]));

export async function initObsidianSettings() {
  const mapping = { enabled:"enabled", "api-url":"apiUrl", "api-token":"apiToken", "default-folder":"defaultFolder", "file-name-template":"fileNameTemplate", "note-template":"noteTemplate", "include-metadata":"includeMetadata", "include-general-note":"includeGeneralNote", "include-timestamp-notes":"includeTimestampNotes", "include-tags":"includeTags", "include-timestamp-links":"includeTimestampLinks" };
  const status = document.getElementById("obsidian-test-status");
  const previous = (await getStored({ [KEY]: {} }))[KEY] || {};
  if (!previous.defaultFolder && (previous.rootFolder || previous.inboxFolder)) previous.defaultFolder = [previous.rootFolder, previous.inboxFolder].filter(Boolean).join("/");
  const stored = cleanSettings(previous);
  stored.saveBehavior = "auto";
  await new Promise((resolve) => setStored({ [KEY]: stored }, resolve));

  const noteTemplate = document.getElementById("obsidian-note-template");
  const nestedNamePreset = document.querySelector('#obsidian-file-name-presets option[value="{channel}/{video_title}"]');
  if (nestedNamePreset) nestedNamePreset.value = "{video_id} - {video_title}";
  const templatePresets = {
    "Estándar":"{{frontmatter}}\n\n# {{title}}\n\n{{general_note}}\n\n{{timestamp_notes}}",
    "Compacta":"{{frontmatter}}\n\n# {{title}}\n\n{{general_note}}\n\n{{timestamp_notes}}",
    "Estudio":"{{frontmatter}}\n\n# {{title}}\n\n## Fuente\n\n[Ver vídeo]({{url}}) · {{channel}}\n\n{{general_note}}\n\n## Conceptos relacionados\n\n- \n\n{{timestamp_notes}}",
  };
  const presetRow = document.createElement("div");
  presetRow.className = "template-preset-row";
  const presetSelect = document.createElement("select");
  presetSelect.setAttribute("aria-label", "Plantilla Markdown predefinida");
  Object.keys(templatePresets).forEach((name) => presetSelect.add(new Option(name, name)));
  const applyPreset = document.createElement("button");
  applyPreset.type = "button";
  applyPreset.className = "secondary";
  applyPreset.textContent = "Aplicar preset";
  applyPreset.addEventListener("click", () => {
    noteTemplate.value = templatePresets[presetSelect.value];
    noteTemplate.dispatchEvent(new Event("change"));
  });
  presetRow.append(presetSelect, applyPreset);
  noteTemplate.closest("label").before(presetRow);

  Object.entries(mapping).forEach(([id, key]) => {
    const field = document.getElementById(`obsidian-${id}`);
    if (field.type === "checkbox") field.checked = Boolean(stored[key]); else field.value = stored[key];
    field.addEventListener("change", async () => {
      const current = cleanSettings((await getStored({ [KEY]: {} }))[KEY]);
      current[key] = field.type === "checkbox" ? field.checked : field.value.trim();
      setStored({ [KEY]: current });
      status.textContent = "Configuración guardada";
    });
  });

  document.getElementById("obsidian-test").addEventListener("click", () => {
    status.textContent = "Comprobando conexión…";
    chrome.runtime.sendMessage({ type:"YTX_OBSIDIAN_TEST" }, (response) => {
      status.textContent = response?.ok ? "Conexión correcta" : response?.error || chrome.runtime.lastError?.message || "No se pudo conectar";
    });
  });
  document.getElementById("obsidian-sync-pending").addEventListener("click", () => {
    status.textContent = "Sincronizando notas pendientes…";
    chrome.runtime.sendMessage({ type:"YTX_OBSIDIAN_SYNC_PENDING" }, (response) => {
      status.textContent = response?.ok === false ? response.error : `${response?.synced || 0} sincronizadas; ${response?.pending || 0} pendientes`;
    });
  });
}
