const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/obsidian/core.js");

const record = {
  videoId: "abc123", videoTitle: "Neural Networks: A/B?", videoUrl: "https://www.youtube.com/watch?v=abc123",
  channel: "3Blue1Brown", createdAt: "2026-08-14T10:00:00Z", videoPublishedAt:"2025-01-20", generalNote: "Relacionar con [[Backpropagation]].",
  tags: [" machine-learning ", "#statistics", "MACHINE-LEARNING"], folder: "Mathematics",
  timestampNotes: [{ startMs: 452000, text: "Ejemplo", note: "Buen ejemplo de [[Gradient Descent]]." }, { startMs: 161000, text: "Neurona", note: "Función parametrizada." }],
};

test("normaliza tags sin duplicados y conserva su contenido", () => {
  assert.deepEqual(core.normalizeTags(record.tags), ["machine-learning", "statistics"]);
});

test("solo considera apuntado un vídeo con contenido creado por el usuario", () => {
  assert.equal(core.hasNoteContent({ generalNote:"", tags:[], timestampNotes:[], folder:"YouTube/Inbox" }), false);
  assert.equal(core.hasNoteContent({ generalNote:"Resumen", tags:[], timestampNotes:[] }), true);
  assert.equal(core.hasNoteContent({ generalNote:"", tags:["repasar"], timestampNotes:[] }), true);
  assert.equal(core.hasNoteContent({ generalNote:"", tags:[], timestampNotes:[{ type:"favorite" }] }), true);
});

test("sanitiza únicamente caracteres incompatibles del nombre", () => {
  assert.equal(core.renderFileName(record, { fileNameTemplate: "{channel} - {video_title}" }), "3Blue1Brown - Neural Networks- A-B-");
});

test("genera una ruta estable bajo la carpeta elegida", () => {
  assert.equal(core.notePath(record, { defaultFolder: "YouTube/Inbox", fileNameTemplate: "{video_title}" }), "Mathematics/Neural Networks- A-B-.md");
});

test("genera Markdown Obsidian ordenado y conserva wikilinks", () => {
  const markdown = core.renderMarkdown(record, core.DEFAULT_SETTINGS);
  assert.match(markdown, /video_id: "abc123"/);
  assert.match(markdown, /note_created: 2026-08-14/);
  assert.match(markdown, /video_published: 2025-01-20/);
  assert.match(markdown, /- "machine-learning"/);
  assert.match(markdown, /\[\[Backpropagation\]\]/);
  assert.ok(markdown.indexOf("### [2:41]") < markdown.indexOf("### [7:32]"));
  assert.match(markdown, /### \[2:41\]\(https:\/\/www\.youtube\.com\/watch\?v=abc123\)/);
  assert.doesNotMatch(markdown, /^# Neural Networks/m);
});

test("permite elegir cada dato del frontmatter por separado", () => {
  const markdown = core.renderMarkdown(record, {
    ...core.DEFAULT_SETTINGS, includeSource:false, includeVideoId:false, includeChannel:true,
    includeUrl:false, includeNoteCreatedDate:false, includeVideoPublishedDate:true, includeTags:false,
  });
  assert.match(markdown, /channel: "3Blue1Brown"/);
  assert.match(markdown, /video_published: 2025-01-20/);
  assert.doesNotMatch(markdown, /source: youtube|video_id:|url:|note_created:|tags:/);
});

test("incluye tags específicos dentro de cada nota timestamp", () => {
  const tagged = { ...record, timestampNotes:[{ ...record.timestampNotes[0], tags:["concepto", "repasar"] }] };
  const markdown = core.renderMarkdown(tagged, core.DEFAULT_SETTINGS);
  assert.match(markdown, /### \[7:32\]\([^)]*\)\n#concepto #repasar\n\*Ejemplo\*/);
});

test("mantiene el frontmatter primero y respeta el orden del resto", () => {
  const markdown = core.renderMarkdown(record, { ...core.DEFAULT_SETTINGS, contentOrder:["timestampNotes", "generalNote", "metadata"] });
  assert.equal(markdown.indexOf("---"), 0);
  assert.ok(markdown.indexOf("## Notas") < markdown.indexOf("## Nota general"));
});

test("usa Inbox cuando el vídeo no tiene carpeta", () => {
  assert.match(core.notePath({ ...record, folder: "" }, core.DEFAULT_SETTINGS), /^YouTube\/Inbox\//);
});

test("acepta carpetas predeterminadas anidadas sin prefijo obligatorio", () => {
  const path = core.notePath({ ...record, folder:"" }, { ...core.DEFAULT_SETTINGS, defaultFolder:"IA/Modelos/Inbox" });
  assert.match(path, /^IA\/Modelos\/Inbox\//);
});

test("renderiza una plantilla Markdown personalizada", () => {
  const markdown = core.renderMarkdown(record, { ...core.DEFAULT_SETTINGS, includeTimestampNotes:false, noteTemplate:"{{frontmatter}}\n# {{title}}\nCanal: {{channel}}\n{{general_note}}" });
  assert.match(markdown, /# Neural Networks: A\/B\?/);
  assert.match(markdown, /Canal: 3Blue1Brown/);
  assert.match(markdown, /\[\[Backpropagation\]\]/);
  assert.doesNotMatch(markdown, /### \[2:41\]/);
});

test("añade el contenido activado aunque una plantilla personalizada olvide sus variables", () => {
  const markdown = core.renderMarkdown(record, { ...core.DEFAULT_SETTINGS, noteTemplate:"{{frontmatter}}" });
  assert.match(markdown, /## Nota general/);
  assert.match(markdown, /Relacionar con \[\[Backpropagation\]\]/);
  assert.match(markdown, /## Notas/);
  assert.match(markdown, /### \[2:41\]/);
});

test("conserva los saltos Markdown escritos por el usuario", () => {
  const markdown = core.renderMarkdown({ ...record, generalNote:"Primero\n\n\nSegundo" }, core.DEFAULT_SETTINGS);
  assert.match(markdown, /Primero\n\n\nSegundo/);
});

test("normaliza catálogos de tags de distintas versiones de la API", () => {
  assert.deepEqual(core.normalizeTagCatalog({ tags:{ "#machine-learning":3, statistics:1 } }), ["machine-learning", "statistics"]);
  assert.deepEqual(core.normalizeTagCatalog({ tags:[{ tag:"#math", count:2 }, { name:"ai" }] }), ["ai", "math"]);
});

test("el fingerprint sólo cambia cuando cambia la salida", () => {
  const first = core.contentFingerprint(record, core.DEFAULT_SETTINGS);
  assert.equal(first, core.contentFingerprint({ ...record }, core.DEFAULT_SETTINGS));
  assert.notEqual(first, core.contentFingerprint({ ...record, generalNote: "Otra" }, core.DEFAULT_SETTINGS));
});
