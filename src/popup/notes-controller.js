"use strict";

  const STORAGE_KEY = "ytxSavedNotes";

  function formatTime(milliseconds) {
    const secondsTotal = Math.floor((Number(milliseconds) || 0) / 1000);
    const minutes = Math.floor(secondsTotal / 60);
    return `${minutes}:${String(secondsTotal % 60).padStart(2, "0")}`;
  }

  function noteLink(item) {
    return `${item.videoUrl}&t=${Math.floor((Number(item.startMs) || 0) / 1000)}s`;
  }

export function createNotesController({ tr = (value) => value } = {}) {
    const toggle = document.getElementById("global-notes-toggle");
    const section = document.getElementById("global-notes");
    const exportButton = document.getElementById("notes-export");
    const list = document.getElementById("global-notes-list");

    function confirmDeletion() {
      document.querySelector(".popup-notice")?.remove();
      return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "popup-notice popup-confirm";
        overlay.setAttribute("role", "alertdialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", tr("Confirmar eliminación"));
        const box = document.createElement("div");
        box.className = "popup-notice__box";
        const title = document.createElement("strong");
        title.className = "popup-confirm__title";
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
        const close = (confirmed) => {
          if (settled) return;
          settled = true;
          overlay.remove();
          resolve(confirmed);
        };
        cancel.addEventListener("click", () => close(false));
        remove.addEventListener("click", () => close(true));
        overlay.addEventListener("keydown", (event) => {
          if (event.key === "Escape") close(false);
        });
        actions.append(cancel, remove);
        box.append(title, text, actions);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        cancel.focus();
      });
    }

    function syncWidth(viewVisible = true) {
      document.documentElement.classList.toggle("popup-notes-open", viewVisible && !section.hidden);
    }

    function load() {
      chrome.storage.local.get({ [STORAGE_KEY]: [] }, (stored) => {
        const notes = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
        list.replaceChildren();
        if (!notes.length) {
          const empty = document.createElement("div");
          empty.className = "shortcut-empty";
          empty.textContent = "Todavía no tienes notas ni favoritos.";
          list.appendChild(empty);
          return;
        }

        notes.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach((item) => {
          const card = document.createElement("div");
          card.className = "global-note";
          const title = document.createElement("a");
          title.className = "global-note__title";
          title.href = noteLink(item);
          title.target = "_blank";
          title.textContent = item.videoTitle || "Vídeo de YouTube";
          const meta = document.createElement("div");
          meta.className = "global-note__meta";
          const time = document.createElement("a");
          time.href = noteLink(item);
          time.target = "_blank";
          time.textContent = formatTime(item.startMs);
          const edit = document.createElement("button");
          edit.className = "global-note__edit";
          edit.textContent = "Editar";
          edit.setAttribute("aria-label", `Editar nota de ${formatTime(item.startMs)}`);
          const remove = document.createElement("button");
          remove.textContent = "Eliminar";
          remove.addEventListener("click", async () => {
            if (!await confirmDeletion()) return;
            chrome.storage.local.set({ [STORAGE_KEY]: notes.filter((candidate) => candidate.id !== item.id) }, load);
          });
          remove.setAttribute("aria-label", `Eliminar nota de ${formatTime(item.startMs)}`);
          const metaActions = document.createElement("div");
          metaActions.className = "global-note__actions";
          metaActions.append(edit, remove);
          meta.append(time, metaActions);
          const text = document.createElement("div");
          text.className = "global-note__text";
          text.textContent = item.text || "Momento guardado";
          card.append(title, meta, text);
          const note = document.createElement("div");
          note.className = "global-note__note";
          note.textContent = item.note || "";
          if (item.note) card.appendChild(note);

          edit.addEventListener("click", () => {
            if (card.querySelector(".global-note__editor")) return;
            const editor = document.createElement("textarea");
            editor.className = "global-note__editor";
            editor.value = item.note || "";
            editor.setAttribute("aria-label", "Editar texto de la nota");
            const actions = document.createElement("div");
            actions.className = "global-note__editor-actions";
            const cancel = document.createElement("button");
            cancel.className = "secondary";
            cancel.textContent = "Cancelar";
            const save = document.createElement("button");
            save.className = "primary";
            save.textContent = "Guardar";
            actions.append(cancel, save);
            card.append(editor, actions);
            editor.focus();
            const closeEditor = () => {
              editor.remove();
              actions.remove();
              edit.focus();
            };
            cancel.addEventListener("click", closeEditor);
            save.addEventListener("click", () => {
              const updated = notes.map((candidate) => candidate.id === item.id
                ? { ...candidate, note: editor.value.trim(), updatedAt: new Date().toISOString() }
                : candidate);
              chrome.storage.local.set({ [STORAGE_KEY]: updated }, load);
            });
            editor.addEventListener("keydown", (event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeEditor();
              }
            });
          });
          list.appendChild(card);
        });
      });
    }

    toggle.addEventListener("click", () => {
      section.hidden = !section.hidden;
      syncWidth();
      toggle.setAttribute("aria-expanded", String(!section.hidden));
      if (!section.hidden) load();
    });

    exportButton.addEventListener("click", () => {
      chrome.storage.local.get({ [STORAGE_KEY]: [] }, (stored) => {
        const notes = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
        const grouped = new Map();
        notes.forEach((item) => {
          const group = grouped.get(item.videoId) || [];
          group.push(item);
          grouped.set(item.videoId, group);
        });
        const lines = ["# Notas y favoritos de YouTube", ""];
        grouped.forEach((items) => {
          const first = items[0];
          lines.push(`## [${first.videoTitle || "Vídeo de YouTube"}](${first.videoUrl})`, "");
          items.sort((a, b) => a.startMs - b.startMs).forEach((item) => {
            lines.push(`- [${formatTime(item.startMs)}](${noteLink(item)}) — ${item.text || "Momento guardado"}`);
            if (item.note) lines.push(`  - Nota: ${item.note}`);
          });
          lines.push("");
        });
        const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "notas-youtube.md";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[STORAGE_KEY] && !section.hidden) load();
    });

    return { isOpen: () => !section.hidden, load, syncWidth };
  }
