importScripts("obsidian/core.js", "obsidian/adapter.js");

const SETTINGS_KEY = "ytxObsidianSettings";
const RECORDS_KEY = "ytxVideoRecords";
const RETRY_ALARM = "ytxObsidianRetry";
const EXPORT_SETTING_KEYS = ["defaultFolder", "fileNameTemplate", "noteTemplate", "generalNoteTemplate", "timestampNoteTemplate", "includeSource", "includeVideoId", "includeChannel", "includeUrl", "includeNoteCreatedDate", "includeVideoPublishedDate", "includeGeneralNote", "includeTimestampNotes", "includeTags", "contentOrder"];

function storageGet(defaults) { return new Promise((resolve) => chrome.storage.local.get(defaults, resolve)); }
function configured(settings) { return Boolean(settings.enabled && settings.apiUrl && settings.apiToken); }
function resolvedSettings(raw = {}) {
  const settings = { ...YTXObsidianCore.DEFAULT_SETTINGS, ...raw };
  if (raw.contentSettingsVersion !== 2) {
    settings.includeGeneralNote = true;
    settings.includeTimestampNotes = true;
  }
  if (raw.contentOrderVersion !== 3) settings.contentOrder = YTXObsidianCore.DEFAULT_SETTINGS.contentOrder.slice();
  return settings;
}
function snapshotSettings(settings) {
  return Object.fromEntries(EXPORT_SETTING_KEYS.map((key) => [key, Array.isArray(settings[key]) ? settings[key].slice() : settings[key]]));
}
function recordSettings(record, current) { return { ...current, ...(record.obsidian?.exportSettings || {}) }; }

async function syncOne(videoId) {
  const stored = await storageGet({ [SETTINGS_KEY]: {}, [RECORDS_KEY]: {} });
  const currentSettings = resolvedSettings(stored[SETTINGS_KEY]);
  if (!configured(currentSettings)) throw new Error("La integración con Obsidian no está configurada");
  const record = stored[RECORDS_KEY]?.[videoId];
  if (!record) throw new Error("No se encontraron datos locales del vídeo");
  const settings = recordSettings(record, currentSettings);
  const adapter = new ObsidianAdapter(currentSettings);
  if (!YTXObsidianCore.hasNoteContent(record)) {
    if (record.obsidian?.path) await adapter.removeNote(record.obsidian.path);
    const records = stored[RECORDS_KEY] || {};
    records[videoId] = { ...record, obsidian:{ ...(record.obsidian || {}), status:"never", path:"", fingerprint:"", error:"", relocateFrom:"" } };
    await chrome.storage.local.set({ [RECORDS_KEY]:records });
    return { ok:true, skipped:true, path:"", status:"never" };
  }
  const desiredPath = YTXObsidianCore.notePath(record, settings);
  const previousPath = record.obsidian?.relocateFrom || "";
  const path = record.obsidian?.path || desiredPath;
  const fingerprint = YTXObsidianCore.contentFingerprint(record, settings);
  await adapter.updateNote(path, YTXObsidianCore.renderMarkdown(record, settings));
  if (previousPath && previousPath !== path) await adapter.removeNote(previousPath);

  const latestStored = await storageGet({ [RECORDS_KEY]: {} });
  const records = latestStored[RECORDS_KEY] || {};
  const latest = records[videoId] || record;
  const stillCurrent = YTXObsidianCore.contentFingerprint(latest, settings) === fingerprint;
  records[videoId] = { ...latest, obsidian:{ ...(latest.obsidian || {}), status:stillCurrent ? "synced" : "pending", path, fingerprint, syncedAt:new Date().toISOString(), error:"", relocateFrom:"", exportSettings:latest.obsidian?.exportSettings || snapshotSettings(settings) } };
  await chrome.storage.local.set({ [RECORDS_KEY]: records });
  return { ok:true, path, status:records[videoId].obsidian.status };
}

async function markPending(videoId, error) {
  const stored = await storageGet({ [RECORDS_KEY]: {} });
  const records = stored[RECORDS_KEY] || {};
  if (!records[videoId]) return;
  records[videoId] = { ...records[videoId], obsidian:{ ...(records[videoId].obsidian || {}), status:"pending", error:error.message || "Obsidian no está disponible", lastAttemptAt:new Date().toISOString() } };
  await chrome.storage.local.set({ [RECORDS_KEY]: records });
}

async function syncPending(force = false) {
  const stored = await storageGet({ [SETTINGS_KEY]: {}, [RECORDS_KEY]: {} });
  const settings = resolvedSettings(stored[SETTINGS_KEY]);
  if (!configured(settings)) return { synced:0, pending:0 };
  const ids = Object.entries(stored[RECORDS_KEY] || {})
    .filter(([, record]) => {
      const hasContent = YTXObsidianCore.hasNoteContent(record);
      if (!hasContent) return Boolean(record.obsidian?.path);
      const outputSettings = recordSettings(record, settings);
      return force || ["never", "pending", "error"].includes(record.obsidian?.status || "never") ||
        record.obsidian?.fingerprint !== YTXObsidianCore.contentFingerprint(record, outputSettings);
    })
    .map(([id]) => id);
  let synced = 0;
  for (const id of ids) {
    try { await syncOne(id); synced += 1; }
    catch (error) { await markPending(id, error); break; }
  }
  return { synced, pending:ids.length - synced };
}

async function refreshAlarm() {
  const stored = await storageGet({ [SETTINGS_KEY]: {} });
  const settings = resolvedSettings(stored[SETTINGS_KEY]);
  if (configured(settings)) chrome.alarms.create(RETRY_ALARM, { delayInMinutes:1, periodInMinutes:1 });
  else chrome.alarms.clear(RETRY_ALARM);
}

async function preserveExistingFormats(change) {
  const oldSettings = resolvedSettings(change.oldValue);
  const stored = await storageGet({ [RECORDS_KEY]: {} });
  const records = stored[RECORDS_KEY] || {};
  Object.keys(records).forEach((id) => {
    const obsidian = records[id].obsidian || {};
    if (YTXObsidianCore.hasNoteContent(records[id]) && !obsidian.exportSettings) records[id] = { ...records[id], obsidian:{ ...obsidian, exportSettings:snapshotSettings(oldSettings) } };
  });
  await chrome.storage.local.set({ [RECORDS_KEY]: records });
}

chrome.runtime.onInstalled.addListener(() => { refreshAlarm(); syncPending(); });
chrome.runtime.onStartup.addListener(() => { refreshAlarm(); syncPending(); });
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === RETRY_ALARM) syncPending(); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[SETTINGS_KEY]) return;
  preserveExistingFormats(changes[SETTINGS_KEY]).then(() => { refreshAlarm(); syncPending(); });
});
refreshAlarm();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !["YTX_OBSIDIAN_SYNC", "YTX_OBSIDIAN_SYNC_PENDING", "YTX_OBSIDIAN_TEST", "YTX_OBSIDIAN_TAGS", "YTX_OBSIDIAN_CATALOG"].includes(message.type)) return false;
  (async () => {
    if (message.type === "YTX_OBSIDIAN_SYNC_PENDING") return syncPending(true);
    if (message.type === "YTX_OBSIDIAN_TAGS") {
      const stored = await storageGet({ [SETTINGS_KEY]: {} });
      const settings = resolvedSettings(stored[SETTINGS_KEY]);
      if (!configured(settings)) return { ok:false, tags:[], error:"Obsidian no está configurado" };
      const payload = await new ObsidianAdapter(settings).getTags();
      return { ok:true, tags:YTXObsidianCore.normalizeTagCatalog(payload) };
    }
    if (message.type === "YTX_OBSIDIAN_CATALOG") {
      const stored = await storageGet({ [SETTINGS_KEY]: {} });
      const settings = resolvedSettings(stored[SETTINGS_KEY]);
      if (!configured(settings)) return { ok:false, tags:[], folders:[], error:"Obsidian no está configurado" };
      const adapter = new ObsidianAdapter(settings);
      const [tagResult, folderResult] = await Promise.allSettled([adapter.getTags(), adapter.getFolders()]);
      if (tagResult.status === "rejected" && folderResult.status === "rejected") throw tagResult.reason;
      return {
        ok:true,
        tags:tagResult.status === "fulfilled" ? YTXObsidianCore.normalizeTagCatalog(tagResult.value) : [],
        folders:folderResult.status === "fulfilled" ? folderResult.value : [],
      };
    }
    if (message.type === "YTX_OBSIDIAN_TEST") {
      const stored = await storageGet({ [SETTINGS_KEY]: {} });
      const settings = resolvedSettings(stored[SETTINGS_KEY]);
      if (!settings.apiToken) throw new Error("Falta el token de Obsidian");
      await new ObsidianAdapter(settings).testConnection();
      return { ok:true };
    }
    try { return await syncOne(message.videoId); }
    catch (error) { await markPending(message.videoId, error); return { ok:false, pending:true, error:error.message }; }
  })().then(sendResponse).catch((error) => sendResponse({ ok:false, error:error.message || "Error de sincronización" }));
  return true;
});
