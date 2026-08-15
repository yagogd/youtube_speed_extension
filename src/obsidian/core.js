(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.YTXObsidianCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_SETTINGS = Object.freeze({
    enabled: false,
    apiUrl: "http://127.0.0.1:27123",
    apiToken: "",
    defaultFolder: "YouTube/Inbox",
    fileNameTemplate: "{video_title}",
    noteTemplate: "{{frontmatter}}\n\n# {{title}}\n\n{{general_note}}\n\n{{timestamp_notes}}",
    saveBehavior: "auto",
    includeMetadata: true,
    includeGeneralNote: true,
    includeTimestampNotes: true,
    includeTags: true,
    includeTimestampLinks: true,
  });

  function normalizeTags(tags) {
    const seen = new Set();
    return (Array.isArray(tags) ? tags : String(tags || "").split(","))
      .map((tag) => String(tag).trim().replace(/^#+/, ""))
      .filter((tag) => tag && !seen.has(tag.toLocaleLowerCase()) && seen.add(tag.toLocaleLowerCase()));
  }

  function sanitizeFileName(value) {
    return String(value || "Untitled")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/[. ]+$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180) || "Untitled";
  }

  function safeFolder(value) {
    return String(value || "").split(/[\\/]+/).map(sanitizeFileName).filter(Boolean).join("/");
  }

  function formatDate(value) {
    const date = value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
  }

  function formatTime(milliseconds) {
    const total = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = String(total % 60).padStart(2, "0");
    return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
  }

  function timestampUrl(url, startMs) {
    const separator = String(url || "").includes("?") ? "&" : "?";
    return `${url}${separator}t=${Math.max(0, Math.floor((Number(startMs) || 0) / 1000))}s`;
  }

  function yamlString(value) {
    return JSON.stringify(String(value || ""));
  }

  function renderFileName(record, settings) {
    const values = {
      video_title: record.videoTitle || "YouTube video",
      channel: record.channel || "Unknown channel",
      date: formatDate(record.date || record.createdAt),
      video_id: record.videoId || "",
    };
    const template = settings.fileNameTemplate || DEFAULT_SETTINGS.fileNameTemplate;
    return sanitizeFileName(template.replace(/\{([a-z_]+)\}/g, (match, key) => key in values ? values[key] : match));
  }

  function notePath(record, settings) {
    const destination = safeFolder(record.folder || settings.defaultFolder || DEFAULT_SETTINGS.defaultFolder);
    return [destination, `${renderFileName(record, settings)}.md`].filter(Boolean).join("/");
  }

  function timestampNotes(record, settings) {
    return (record.timestampNotes || []).slice().sort((a, b) => a.startMs - b.startMs).map((note) => {
      const body = [note.text, note.note].filter(Boolean).join("\n\n") || "Saved moment";
      const link = settings.includeTimestampLinks ? `\n\n[Ver en YouTube](${timestampUrl(record.videoUrl, note.startMs)})` : "";
      return `### ${formatTime(note.startMs)}\n\n${body}${link}`;
    }).join("\n\n");
  }

  function renderMarkdown(record, suppliedSettings = {}) {
    const settings = { ...DEFAULT_SETTINGS, ...suppliedSettings };
    const tags = normalizeTags(record.tags);
    let frontmatter = "";
    if (settings.includeMetadata) {
      const yaml = ["---", "source: youtube", `video_id: ${yamlString(record.videoId)}`, `channel: ${yamlString(record.channel)}`, `url: ${yamlString(record.videoUrl)}`, `date: ${formatDate(record.date || record.createdAt)}`];
      if (settings.includeTags) {
        yaml.push("tags:");
        tags.forEach((tag) => yaml.push(`  - ${yamlString(tag)}`));
        if (!tags.length) yaml[yaml.length - 1] += " []";
      }
      yaml.push("---");
      frontmatter = yaml.join("\n");
    }
    const values = {
      frontmatter,
      title: record.videoTitle || "YouTube video",
      general_note: settings.includeGeneralNote ? `## Nota general\n\n${record.generalNote || ""}`.trimEnd() : "",
      timestamp_notes: settings.includeTimestampNotes ? `## Notas\n\n${timestampNotes(record, settings)}`.trimEnd() : "",
      url: record.videoUrl || "",
      channel: record.channel || "",
      video_id: record.videoId || "",
      tags: settings.includeTags ? normalizeTags(record.tags).join(", ") : "",
    };
    const template = settings.noteTemplate || DEFAULT_SETTINGS.noteTemplate;
    const rendered = template.replace(/\{\{([a-z_]+)\}\}/g, (match, key) => key in values ? values[key] : match);
    return `${rendered.trim()}\n`;
  }

  function normalizeTagCatalog(payload) {
    const source = payload?.tags ?? payload;
    let entries = [];
    if (Array.isArray(source)) entries = source.map((item) => typeof item === "string" ? item : item?.tag ?? item?.name);
    else if (source && typeof source === "object") entries = Object.keys(source);
    return normalizeTags(entries.map((tag) => String(tag || "").replace(/^#/, ""))).sort((a, b) => a.localeCompare(b));
  }

  function contentFingerprint(record, settings) {
    let hash = 2166136261;
    for (const char of renderMarkdown(record, settings)) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  return { DEFAULT_SETTINGS, normalizeTags, normalizeTagCatalog, sanitizeFileName, safeFolder, formatTime, timestampUrl, renderFileName, notePath, renderMarkdown, contentFingerprint };
});
