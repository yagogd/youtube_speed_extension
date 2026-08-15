(function (root) {
  "use strict";
  class ObsidianAdapter {
    constructor(settings) { this.settings = settings; }
    async request(path, options = {}) {
      const base = String(this.settings.apiUrl || "").replace(/\/+$/, "");
      if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(base)) throw new Error("La URL debe apuntar a localhost o 127.0.0.1");
      let response;
      try {
        response = await fetch(`${base}${path}`, {
          ...options,
          headers: { Authorization:`Bearer ${this.settings.apiToken}`, ...(options.body ? { "Content-Type":"text/markdown; charset=utf-8" } : {}), ...(options.headers || {}) },
        });
      } catch (error) {
        throw new Error("Obsidian no está disponible");
      }
      if (!response.ok) {
        const error = new Error(response.status === 401 || response.status === 403 ? "Token de Obsidian incorrecto o sin permiso" : `Obsidian respondió con HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return response;
    }
    testConnection() { return this.request("/"); }
    async getTags() { return (await this.request("/tags/", { headers:{ Accept:"application/json" } })).json(); }
    async listDirectory(path = "") {
      const encoded = String(path).split("/").filter(Boolean).map(encodeURIComponent).join("/");
      return (await this.request(`/vault/${encoded ? `${encoded}/` : ""}`, { headers:{ Accept:"application/json" } })).json();
    }
    async getFolders(limit = 300) {
      const folders = [];
      const queue = [""];
      while (queue.length && folders.length < limit) {
        const parent = queue.shift();
        const payload = await this.listDirectory(parent);
        const entries = Array.isArray(payload?.files) ? payload.files : [];
        entries.filter((entry) => String(entry).endsWith("/") && !String(entry).startsWith(".")).forEach((entry) => {
          const child = [parent, String(entry).replace(/\/$/, "")].filter(Boolean).join("/");
          if (!folders.includes(child) && folders.length < limit) { folders.push(child); queue.push(child); }
        });
      }
      return folders.sort((a, b) => a.localeCompare(b));
    }
    saveNote(path, markdown) { return this.request(`/vault/${path.split("/").map(encodeURIComponent).join("/")}`, { method:"PUT", body:markdown }); }
    updateNote(path, markdown) { return this.saveNote(path, markdown); }
    async removeNote(path) {
      try { return await this.request(`/vault/${path.split("/").map(encodeURIComponent).join("/")}`, { method:"DELETE" }); }
      catch (error) { if (error.status !== 404) throw error; return null; }
    }
  }
  root.ObsidianAdapter = ObsidianAdapter;
  if (typeof module === "object" && module.exports) module.exports = { ObsidianAdapter };
})(globalThis);
