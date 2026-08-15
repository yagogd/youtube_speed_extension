const test = require("node:test");
const assert = require("node:assert/strict");
const { ObsidianAdapter } = require("../src/obsidian/adapter.js");

test("el adaptador rechaza servidores que no sean loopback", async () => {
  const adapter = new ObsidianAdapter({ apiUrl:"https://example.com", apiToken:"secret" });
  await assert.rejects(() => adapter.testConnection(), /localhost|127\.0\.0\.1/);
});

test("actualiza la ruta codificada con token y Markdown", async (context) => {
  const originalFetch = global.fetch;
  context.after(() => { global.fetch = originalFetch; });
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok:true, status:204 };
  };
  const adapter = new ObsidianAdapter({ apiUrl:"http://127.0.0.1:27123/", apiToken:"secret" });
  await adapter.updateNote("YouTube/Mis vídeos/Nota.md", "# Nota");
  assert.equal(request.url, "http://127.0.0.1:27123/vault/YouTube/Mis%20v%C3%ADdeos/Nota.md");
  assert.equal(request.options.method, "PUT");
  assert.equal(request.options.headers.Authorization, "Bearer secret");
  assert.equal(request.options.body, "# Nota");
});

test("convierte un fallo de red en estado de Obsidian no disponible", async (context) => {
  const originalFetch = global.fetch;
  context.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => { throw new TypeError("Failed to fetch"); };
  const adapter = new ObsidianAdapter({ apiUrl:"http://localhost:27123", apiToken:"secret" });
  await assert.rejects(() => adapter.testConnection(), /no está disponible/);
});

test("recorre las carpetas anidadas del vault", async (context) => {
  const originalFetch = global.fetch;
  context.after(() => { global.fetch = originalFetch; });
  const listings = {
    "/vault/": { files:["YouTube/", "Notas.md", ".obsidian/"] },
    "/vault/YouTube/": { files:["Inbox/", "IA/"] },
    "/vault/YouTube/Inbox/": { files:[] },
    "/vault/YouTube/IA/": { files:["Modelos/"] },
    "/vault/YouTube/IA/Modelos/": { files:[] },
  };
  global.fetch = async (url) => ({ ok:true, status:200, json:async () => listings[new URL(url).pathname] });
  const adapter = new ObsidianAdapter({ apiUrl:"http://127.0.0.1:27123", apiToken:"secret" });
  assert.deepEqual(await adapter.getFolders(), ["YouTube", "YouTube/IA", "YouTube/IA/Modelos", "YouTube/Inbox"]);
});
