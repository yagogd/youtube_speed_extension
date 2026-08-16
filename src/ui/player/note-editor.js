(() => {
  "use strict";
  const ytx = globalThis.__YTX;

  ytx.createPlayerNoteEditor = ({ onSaved }) => {
    let active = null;

    function parseTime(value, fallback) {
      const parts = String(value || "").trim().split(":").map(Number);
      if (!parts.length || parts.some((part) => !Number.isFinite(part) || part < 0)) return fallback;
      if (parts.length === 1) return parts[0];
      return parts.reduce((total, part) => total * 60 + part, 0);
    }

    function formatSeconds(seconds) {
      return ytx.formatTime(Math.max(0, seconds) * 1000);
    }

    function applyAppearance(editor) {
      const appearance = ytx.state.appearance || {};
      const opacity = .54;
      editor.style.setProperty("--ytx-editor-background", `rgba(8,8,10,${opacity})`);
      editor.style.setProperty("--ytx-editor-text", appearance.text || "#e4e4e7");
      editor.style.setProperty("--ytx-editor-font", appearance.font || "Inter, Roboto, Arial, sans-serif");
      editor.style.setProperty("--ytx-editor-font-size", `${Math.min(22, Math.max(10, Number(appearance.fontSize) || 13.5))}px`);
    }

    function makeDraggable(editor, handle, player) {
      let removeActiveDrag = null;
      const onPointerDown = (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        const editorRect = editor.getBoundingClientRect();
        const playerRect = player.getBoundingClientRect();
        const offsetX = event.clientX - editorRect.left;
        const offsetY = event.clientY - editorRect.top;
        editor.style.transform = "none";
        editor.style.left = `${editorRect.left - playerRect.left}px`;
        editor.style.top = `${editorRect.top - playerRect.top}px`;
        handle.classList.add("ytx-player-note-editor__drag-handle--dragging");

        const onPointerMove = (moveEvent) => {
          const bounds = player.getBoundingClientRect();
          const maxLeft = Math.max(8, bounds.width - editor.offsetWidth - 8);
          const maxTop = Math.max(8, bounds.height - editor.offsetHeight - 8);
          editor.style.left = `${Math.max(8, Math.min(maxLeft, moveEvent.clientX - bounds.left - offsetX))}px`;
          editor.style.top = `${Math.max(8, Math.min(maxTop, moveEvent.clientY - bounds.top - offsetY))}px`;
        };
        const onPointerUp = () => {
          document.removeEventListener("pointermove", onPointerMove, true);
          document.removeEventListener("pointerup", onPointerUp, true);
          handle.classList.remove("ytx-player-note-editor__drag-handle--dragging");
          removeActiveDrag = null;
        };
        document.addEventListener("pointermove", onPointerMove, true);
        document.addEventListener("pointerup", onPointerUp, true);
        removeActiveDrag = onPointerUp;
      };
      handle.addEventListener("pointerdown", onPointerDown);
      return () => {
        removeActiveDrag?.();
        handle.removeEventListener("pointerdown", onPointerDown);
      };
    }

    function close() {
      if (!active) return;
      clearInterval(active.timer);
      active.keyboardCleanup();
      active.dragCleanup();
      active.editor.remove();
      active.returnFocus?.focus();
      active = null;
    }

    function open(player, video, returnFocus) {
      if (!player || !video) return;
      close();
      const initialSeconds = Math.max(0, video.currentTime - 3);
      let manualEnd = false;
      const editor = document.createElement("section");
      editor.className = "ytx-player-note-editor";
      editor.setAttribute("role", "dialog");
      editor.setAttribute("aria-label", "Crear nota del vídeo");
      applyAppearance(editor);
      const heading = document.createElement("div");
      heading.className = "ytx-player-note-editor__drag-handle";
      const headingTitle = document.createElement("strong");
      headingTitle.textContent = "Nueva nota";
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "ytx-player-note-editor__close";
      closeButton.textContent = "×";
      closeButton.title = "Cerrar nueva nota";
      closeButton.setAttribute("aria-label", "Cerrar nueva nota");
      heading.append(headingTitle, closeButton);
      const times = document.createElement("div");
      times.className = "ytx-player-note-editor__times";
      const startLabel = document.createElement("label");
      startLabel.textContent = "Inicio";
      const startInput = document.createElement("input");
      startInput.value = formatSeconds(initialSeconds);
      startInput.setAttribute("aria-label", "Tiempo inicial de la nota");
      startLabel.appendChild(startInput);
      const endLabel = document.createElement("label");
      endLabel.textContent = "Final";
      const endInput = document.createElement("input");
      endInput.value = formatSeconds(video.currentTime);
      endInput.setAttribute("aria-label", "Tiempo final de la nota");
      endInput.addEventListener("input", () => { manualEnd = true; });
      endLabel.appendChild(endInput);
      times.append(startLabel, endLabel);
      const textarea = document.createElement("textarea");
      textarea.placeholder = "Escribe tu nota…";
      textarea.setAttribute("aria-label", "Contenido de la nota");
      const tagsInput = document.createElement("input");
      tagsInput.placeholder = "Buscar o crear tag…";
      tagsInput.setAttribute("aria-label", "Tags de esta nota");
      tagsInput.setAttribute("autocomplete", "off");
      const tagChips = document.createElement("div");
      tagChips.className = "ytx-player-note-editor__tag-chips";
      let selectedTags = [];
      const tagsCatalog = document.createElement("div");
      tagsCatalog.className = "ytx-video-note__catalog ytx-player-note-editor__tags-catalog";
      tagsCatalog.hidden = true;
      const tagsWrap = document.createElement("div");
      tagsWrap.className = "ytx-player-note-editor__tags-wrap";
      tagsWrap.append(tagChips, tagsInput, tagsCatalog);
      const renderTagChips = () => {
        tagChips.replaceChildren(...selectedTags.map((tag) => {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.textContent = `#${tag} ×`;
          chip.setAttribute("aria-label", `Eliminar tag ${tag}`);
          chip.addEventListener("click", () => {
            selectedTags = selectedTags.filter((value) => value !== tag);
            renderTagChips();
            tagsInput.focus();
          });
          return chip;
        }));
      };
      const commitTag = (value = tagsInput.value) => {
        const additions = globalThis.YTXObsidianCore?.normalizeTags(value) || [];
        if (!additions.length) return false;
        selectedTags = globalThis.YTXObsidianCore.normalizeTags([...selectedTags, ...additions]);
        tagsInput.value = "";
        tagsCatalog.hidden = true;
        renderTagChips();
        return true;
      };
      const renderTags = () => {
        const query = tagsInput.value.trim().toLocaleLowerCase();
        const tags = (ytx.notes?.getAvailableTags?.() || []).filter((tag) => !selectedTags.includes(tag) && (!query || tag.toLocaleLowerCase().includes(query))).slice(0, 60);
        tagsCatalog.replaceChildren(...tags.map((tag) => {
          const option = document.createElement("button");
          option.type = "button";
          option.textContent = tag;
          option.addEventListener("mousedown", (event) => event.preventDefault());
          option.addEventListener("click", () => {
            commitTag(tag);
            tagsInput.focus();
          });
          return option;
        }));
        tagsCatalog.hidden = !tags.length;
      };
      tagsInput.addEventListener("focus", renderTags);
      tagsInput.addEventListener("input", renderTags);
      tagsInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== ",") return;
        event.preventDefault();
        commitTag();
      });
      tagsInput.addEventListener("blur", () => { tagsCatalog.hidden = true; });
      const hint = document.createElement("small");
      hint.textContent = "Enter para guardar · Shift + Enter para una línea nueva";
      const actions = document.createElement("div");
      actions.className = "ytx-player-note-editor__actions";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancelar";
      const save = document.createElement("button");
      save.type = "button";
      save.className = "ytx-player-note-editor__save";
      save.textContent = "Guardar nota";
      actions.append(cancel, save);
      editor.append(heading, times, textarea, tagsWrap, hint, actions);
      player.appendChild(editor);

      const saveNote = async () => {
        const note = textarea.value.trim();
        if (!note) {
          textarea.focus();
          return;
        }
        const endFallback = video.currentTime;
        const startSeconds = parseTime(startInput.value, initialSeconds);
        const endSeconds = Math.max(startSeconds, manualEnd ? parseTime(endInput.value, endFallback) : endFallback);
        await ytx.notes.save({
          type: "note",
          startMs: startSeconds * 1000,
          endMs: endSeconds * 1000,
          text: "",
          note,
          tags: globalThis.YTXObsidianCore?.normalizeTags([...selectedTags, tagsInput.value]) || [],
        });
        close();
        onSaved();
      };
      const blockPlayerShortcuts = (event) => {
        if (!editor.contains(event.target)) return;
        event.stopImmediatePropagation();
        if (event.type !== "keydown") return;
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        } else if (event.target === textarea && event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          saveNote();
        }
      };
      ["keydown", "keyup", "keypress"].forEach((type) => window.addEventListener(type, blockPlayerShortcuts, true));
      const keyboardCleanup = () => {
        ["keydown", "keyup", "keypress"].forEach((type) => window.removeEventListener(type, blockPlayerShortcuts, true));
      };
      const dragCleanup = makeDraggable(editor, heading, player);
      const timer = setInterval(() => {
        if (!manualEnd && active?.editor === editor) endInput.value = formatSeconds(video.currentTime);
      }, 250);
      active = { editor, timer, keyboardCleanup, dragCleanup, returnFocus };
      cancel.addEventListener("click", close);
      closeButton.addEventListener("click", close);
      save.addEventListener("click", saveNote);
      textarea.focus();
    }

    return { open, close, destroy: close };
  };
})();
