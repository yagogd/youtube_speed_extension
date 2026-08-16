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
    noteTemplate: "{{frontmatter}}\n\n{{general_note}}\n\n{{timestamp_notes}}",
    generalNoteTemplate: "## Nota general\n\n{{content}}",
    timestampNoteTemplate: "### [{{time}}]({{url}})\n{{tags}}\n*{{text}}*\n\n{{note}}",
    saveBehavior: "auto",
    includeMetadata: true,
    includeSource: true,
    includeVideoId: true,
    includeChannel: true,
    includeUrl: true,
    includeNoteCreatedDate: true,
    includeVideoPublishedDate: true,
    includeGeneralNote: true,
    includeTimestampNotes: true,
    includeTags: true,
    contentOrder: ["source", "videoId", "channel", "url", "noteCreatedDate", "videoPublishedDate", "tags", "generalNote", "timestampNotes"],
  });

  function normalizeTags(tags) {
    const seen = new Set();
    return (Array.isArray(tags) ? tags : String(tags || "").split(","))
      .map((tag) => String(tag).trim().replace(/^#+/, ""))
      .filter((tag) => tag && !seen.has(tag.toLocaleLowerCase()) && seen.add(tag.toLocaleLowerCase()));
  }

  function hasNoteContent(record = {}) {
    return Boolean(String(record.generalNote || "").trim() || normalizeTags(record.tags).length || (record.timestampNotes || []).length);
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
      note_date: formatDate(record.date || record.createdAt),
      video_date: record.videoPublishedAt ? formatDate(record.videoPublishedAt) : "",
      video_id: record.videoId || "",
    };
    const template = settings.fileNameTemplate || DEFAULT_SETTINGS.fileNameTemplate;
    return sanitizeFileName(template.replace(/\{([a-z_]+)\}/g, (match, key) => key in values ? values[key] : match));
  }

  function notePath(record, settings) {
    const destination = safeFolder(record.folder || settings.defaultFolder || DEFAULT_SETTINGS.defaultFolder);
    return [destination, `${renderFileName(record, settings)}.md`].filter(Boolean).join("/");
  }

  function renderTemplate(template, values) {
    return String(template || "")
      .split("\n")
      .map((line) => {
        let dynamic = false;
        const substituted = line.replace(/\{\{([a-z_]+)\}\}/g, (match, key) => {
          dynamic = true;
          return key in values ? String(values[key] ?? "") : match;
        }).trim();
        if (dynamic && (!substituted || /^[*_~`#>+\-]+$/.test(substituted))) return null;
        return substituted;
      })
      .filter((line) => line !== null)
      .reduce((acc, line) => {
        if (line === "" && acc[acc.length - 1] === "") return acc;
        acc.push(line);
        return acc;
      }, [])
      .join("\n")
      .trim();
  }

  function renderTimestampNotes(record, settings) {
    const template = settings.timestampNoteTemplate || DEFAULT_SETTINGS.timestampNoteTemplate;
    return (record.timestampNotes || []).slice().sort((a, b) => a.startMs - b.startMs).map((note) => {
      const tags = normalizeTags(note.tags);
      return renderTemplate(template, {
        time: formatTime(note.startMs),
        url: record.videoUrl || "",
        text: String(note.text || "").trim(),
        note: String(note.note || "").trim(),
        tags: tags.map((tag) => `#${tag}`).join(" "),
      });
    }).filter(Boolean).join("\n\n");
  }

  function renderMarkdown(record, suppliedSettings = {}) {
    const settings = { ...DEFAULT_SETTINGS, ...suppliedSettings };
    const tags = normalizeTags(record.tags);
    const metadataLines = {
      source: settings.includeSource ? ["source: youtube"] : [],
      videoId: settings.includeVideoId ? [`video_id: ${yamlString(record.videoId)}`] : [],
      channel: settings.includeChannel ? [`channel: ${yamlString(record.channel)}`] : [],
      url: settings.includeUrl ? [`url: ${yamlString(record.videoUrl)}`] : [],
      noteCreatedDate: settings.includeNoteCreatedDate ? [`note_created: ${formatDate(record.date || record.createdAt)}`] : [],
      videoPublishedDate: settings.includeVideoPublishedDate && record.videoPublishedAt ? [`video_published: ${formatDate(record.videoPublishedAt)}`] : [],
      tags: settings.includeTags ? ["tags:", ...(tags.length ? tags.map((tag) => `  - ${yamlString(tag)}`) : ["  []"])] : [],
    };
    const requestedMetadataOrder = Array.isArray(settings.contentOrder) ? settings.contentOrder : DEFAULT_SETTINGS.contentOrder;
    const metadataOrder = [...new Set([...requestedMetadataOrder, ...Object.keys(metadataLines)])].filter((key) => key in metadataLines);
    const yamlBody = metadataOrder.flatMap((key) => metadataLines[key]);
    const frontmatter = yamlBody.length ? ["---", ...yamlBody, "---"].join("\n") : "";
    const values = {
      frontmatter,
      title: record.videoTitle || "YouTube video",
      general_note: settings.includeGeneralNote ? renderTemplate(settings.generalNoteTemplate, { content: String(record.generalNote || "") }) : "",
      timestamp_notes: settings.includeTimestampNotes ? `## Notas\n\n${renderTimestampNotes(record, settings)}`.trimEnd() : "",
      url: record.videoUrl || "",
      channel: record.channel || "",
      video_id: record.videoId || "",
      tags: settings.includeTags ? normalizeTags(record.tags).join(", ") : "",
    };
    const defaultOrder = DEFAULT_SETTINGS.contentOrder;
    const requestedOrder = Array.isArray(settings.contentOrder) ? settings.contentOrder : defaultOrder;
    const contentOrder = [...new Set([...requestedOrder, ...defaultOrder])].filter((key) => defaultOrder.includes(key));
    const metadataKeys = new Set([...Object.entries(metadataLines).filter(([, lines]) => lines.length).map(([key]) => key), "metadata"]);
    const orderedSections = contentOrder.map((key) => ({
      generalNote: "{{general_note}}",
      timestampNotes: "{{timestamp_notes}}",
    })[key] || "").filter((token, index, tokens) => token && tokens.indexOf(token) === index);
    const orderedDefaultTemplate = [frontmatter ? "{{frontmatter}}" : "", ...orderedSections].filter(Boolean).join("\n\n");
    const configuredTemplate = settings.noteTemplate || DEFAULT_SETTINGS.noteTemplate;
    let template = configuredTemplate === DEFAULT_SETTINGS.noteTemplate ? orderedDefaultTemplate : configuredTemplate;
    if (configuredTemplate !== DEFAULT_SETTINGS.noteTemplate) {
      if (frontmatter) template = ["{{frontmatter}}", template.replace(/\{\{frontmatter\}\}/g, "").trim()].filter(Boolean).join("\n\n");
      let missingMetadataPlaced = Boolean(frontmatter);
      const missingTokens = contentOrder.map((key) => {
        if (metadataKeys.has(key) && !missingMetadataPlaced) {
          missingMetadataPlaced = true;
          return "{{frontmatter}}";
        }
        if (key === "generalNote" && settings.includeGeneralNote && !template.includes("{{general_note}}")) return "{{general_note}}";
        if (key === "timestampNotes" && settings.includeTimestampNotes && !template.includes("{{timestamp_notes}}")) return "{{timestamp_notes}}";
        return "";
      }).filter((token, index, tokens) => token && tokens.indexOf(token) === index);
      if (missingTokens.length) template = [template.trim(), ...missingTokens].filter(Boolean).join("\n\n");
    }
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

  return { DEFAULT_SETTINGS, normalizeTags, normalizeTagCatalog, hasNoteContent, sanitizeFileName, safeFolder, formatTime, timestampUrl, renderFileName, notePath, renderMarkdown, contentFingerprint };
});
