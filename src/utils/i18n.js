(() => {
  "use strict";
  if (globalThis.YTXI18n) return;

  const EN = {
    "Control rápido": "Quick controls", "Extensión apagada": "Extension off",
    "Velocidad": "Speed", "Aplicar": "Apply", "Transcripción": "Transcript",
    "Panel con los subtítulos del vídeo": "Panel with the video's captions",
    "Contenido": "Content", "Todo desde el inicio": "Everything from the beginning",
    "En tiempo real con el vídeo": "Live with the video", "Párrafos": "Paragraphs",
    "Una frase por bloque": "One sentence per block", "Original de YouTube": "YouTube original",
    "Retroceso al pausar": "Rewind on pause", "Recupera contexto al detener el vídeo": "Recover context when pausing the video",
    "Retroceder": "Rewind", "Fijo": "Fixed", "× velocidad": "× speed",
    "Atajos de pausa": "Pause shortcuts", "Sin atajos configurados": "No shortcuts configured",
    "Gestionar atajos": "Manage shortcuts", "Atajos de velocidad": "Speed shortcuts",
    "Abrir notas y favoritos": "Open notes and favorites", "★ Abrir notas y favoritos": "★ Open notes and favorites",
    "Abrir configuración completa": "Open full settings", "⚙ Abrir configuración completa": "⚙ Open full settings",
    "Tu colección": "Your collection", "Fragmentos y momentos guardados.": "Saved excerpts and moments.",
    "Descargar Markdown": "Download Markdown", "Ajustes": "Settings", "Configura la extensión a tu manera": "Customize the extension your way",
    "Los cambios se guardan automáticamente y se aplican en tus próximos vídeos.": "Changes are saved automatically and applied to your next videos.",
    "Continuidad entre vídeos": "Continuity between videos", "Decide qué ajustes se conservan": "Choose which settings are preserved",
    "Mantener la velocidad": "Keep playback speed", "Usa la velocidad actual al abrir otro vídeo.": "Use the current speed when opening another video.",
    "Recordar posición del panel": "Remember panel position", "Conserva su tamaño y posición entre sesiones.": "Keep its size and position between sessions.",
    "Reabrir en el siguiente vídeo": "Reopen on the next video", "Si cierras el panel, volverá a aparecer al cambiar de vídeo.": "If you close the panel, it will reappear when changing videos.",
    "Visibilidad, idioma, avance y estructura": "Visibility, language, progress and structure",
    "Idioma favorito": "Preferred language", "Automático · primera pista disponible": "Automatic · first available track",
    "Español si está disponible": "Spanish if available", "Inglés si está disponible": "English if available",
    "Catalán si está disponible": "Catalan if available", "Portugués si está disponible": "Portuguese if available",
    "Francés si está disponible": "French if available", "Alemán si está disponible": "German if available", "Italiano si está disponible": "Italian if available",
    "Se prioriza una pista manual del idioma elegido y, si no existe, la automática. Si no hay ninguna, se usa la primera disponible.": "A manual track in the selected language is preferred, then an automatic one. If neither exists, the first available track is used.",
    "Cuándo mostrar el contenido": "When to show content", "Todo el vídeo desde el inicio": "Entire video from the beginning",
    "Se actualiza en tiempo real con el vídeo": "Updates live with the video", "División de párrafos": "Paragraph splitting",
    "Bloques originales de YouTube": "Original YouTube blocks", "Panel de transcripción": "Transcript panel",
    "Apariencia, posición y tamaño": "Appearance, position and size", "Fondo": "Background", "Texto": "Text",
    "Tipo de letra": "Font", "Moderna": "Modern", "Monoespaciada": "Monospace", "Tamaño": "Size", "Opacidad": "Opacity",
    "Restaurar apariencia": "Restore appearance", "Restablecer posición y tamaño": "Reset position and size",
    "Velocidades rápidas": "Quick speeds", "Personaliza los botones bajo el deslizador": "Customize the buttons below the slider",
    "Nueva velocidad": "New speed", "Añadir": "Add", "Restaurar valores": "Restore defaults", "Atajos de teclado": "Keyboard shortcuts",
    "Velocidad, pausa y retroceso": "Speed, pause and rewind", "Activar atajos": "Enable shortcuts",
    "Conserva los atajos guardados aunque los desactives.": "Keep saved shortcuts when disabled.", "Añadir un atajo": "Add a shortcut",
    "Asignar tecla": "Assign key", "Pausa": "Pause", "Pausa + retroceso": "Pause + rewind", "Mientras pulsas": "While held",
    "Permanente": "Permanent", "Cancelar": "Cancel", "Tiempo fijo": "Fixed time", "Multiplicar por velocidad": "Multiply by speed",
    "Buscar idioma…": "Search language…", "Buscar en la transcripción": "Search transcript", "Buscar en la transcripción…": "Search transcript…",
    "Marcadores de este vídeo": "Markers in this video", "Momento guardado": "Saved moment", "Añade una nota opcional…": "Add an optional note…",
    "Guardar": "Save", "Copiar toda la transcripción": "Copy full transcript", "Cerrar la transcripción": "Close transcript",
    "Ocultar la cabecera": "Hide header", "Mostrar la cabecera": "Show header", "Cerrar búsqueda": "Close search",
    "Coincidencia anterior": "Previous match", "Coincidencia siguiente": "Next match", "Editar nota": "Edit note", "Eliminar nota": "Delete note",
    "Guardar en favoritos": "Save to favorites", "Quitar de favoritos": "Remove from favorites", "Copiar fragmento": "Copy excerpt",
    "Añadir nota": "Add note", "Notas y favoritos de este vídeo": "Notes and favorites for this video",
    "Crear una nota en este momento": "Create a note at this moment", "Velocidad de reproducción": "Playback speed",
    "Reducir velocidad en 0,25": "Decrease speed by 0.25", "Aumentar velocidad en 0,25": "Increase speed by 0.25",
    "Deslizador de velocidad": "Speed slider", "Velocidad del vídeo": "Video speed", "Máximo 16×": "Maximum 16×",
    "Cargando transcripción…": "Loading transcript…", "Buscando una pista de subtítulos…": "Looking for a caption track…",
    "Sin transcripción": "No transcript", "Este vídeo no ofrece ninguna pista de subtítulos.": "This video has no caption tracks.",
    "No se pudo cargar": "Could not load", "Ha ocurrido un error desconocido.": "An unknown error occurred.",
    "YouTube ha limitado temporalmente las peticiones de subtítulos. Espera unos segundos antes de cambiar de idioma.": "YouTube has temporarily limited caption requests. Wait a few seconds before changing language.",
    "Aceptar": "OK", "Aviso": "Notice", "Eliminar": "Delete", "Editar": "Edit", "Volver": "Back",
    "Cambiar tema": "Change theme", "Cambiar entre tema claro y oscuro": "Switch between light and dark theme",
    "Abrir ajustes": "Open settings", "Apagar extensión": "Turn extension off", "Encender extensión": "Turn extension on",
    "Velocidad exacta; pulsa para editar": "Exact speed; click to edit", "Pulsa para escribir una velocidad": "Click to enter a speed",
    "Reducir 0,25": "Decrease by 0.25", "Aumentar 0,25": "Increase by 0.25", "Reducir velocidad 0,25": "Decrease speed by 0.25",
    "Aumentar velocidad 0,25": "Increase speed by 0.25", "Velocidades predefinidas": "Speed presets", "Funciones rápidas": "Quick features",
    "Mostrar ajustes rápidos de transcripción": "Show quick transcript settings", "Mostrar ajustes rápidos de pausa": "Show quick pause settings",
    "Mostrar ajustes rápidos de atajos": "Show quick shortcut settings", "Segundos de retroceso": "Rewind seconds", "Cálculo del retroceso": "Rewind calculation",
    "Reproducción y pausas": "Playback and pauses", "Retroceso automático y atajos de pausa": "Automatic rewind and pause shortcuts",
    "Comportamiento general al pausar con los controles del vídeo.": "General behavior when pausing with the video controls.",
    "Segundos": "Seconds", "Cálculo": "Calculation", "Según la velocidad": "Based on speed", "Cada tecla puede tener su propio retroceso.": "Each key can have its own rewind setting.",
    "Pausa normal": "Normal pause", "Segundos propios": "Custom seconds", "Cálculo propio": "Custom calculation", "Guardar atajo de pausa": "Save pause shortcut",
    "Teclas, velocidad y comportamiento": "Keys, speed and behavior", "Velocidad del atajo": "Shortcut speed", "Comportamiento: mientras pulsas": "Behavior: while held",
    "La disposición actual se recuerda automáticamente entre sesiones.": "The current layout is remembered automatically between sessions.",
    "Diseño restablecido. Se aplicará al volver a abrir el panel.": "Layout reset. It will apply when the panel is reopened.",
    "Apariencia restaurada.": "Appearance restored.", "Debes conservar al menos 4 velocidades.": "You must keep at least 4 speeds.",
    "Velocidades actualizadas.": "Speeds updated.", "Introduce una velocidad entre 0,1 y 16.": "Enter a speed between 0.1 and 16.",
    "Esa velocidad ya está añadida.": "That speed has already been added.", "Velocidad añadida.": "Speed added.", "Valores restaurados.": "Defaults restored.",
    "No hay atajos de pausa configurados.": "No pause shortcuts configured.", "No hay atajos configurados.": "No shortcuts configured.",
    "Pulsa una tecla…": "Press a key…", "Todavía no tienes notas ni favoritos.": "You do not have any notes or favorites yet.",
    "Vídeo de YouTube": "YouTube video", "Marcador sin texto": "Marker without text", "Todavía no hay marcadores en este vídeo.": "There are no markers in this video yet.",
    "Pista": "Track", "Nueva nota": "New note", "Inicio": "Start", "Final": "End", "Guardar nota": "Save note",
    "Enter para guardar · Shift + Enter para una línea nueva": "Enter to save · Shift + Enter for a new line",
    "La extensión está apagada. Enciéndela antes de cambiar la velocidad.": "The extension is off. Turn it on before changing the speed.",
    "No puedes usar una velocidad superior a 16×, ya que es el máximo permitido.": "You cannot use a speed above 16×, which is the maximum allowed.",
    "Introduce una velocidad válida (> 0).": "Enter a valid speed (> 0).", "No se detecta ninguna pestaña activa.": "No active tab was detected.",
    "Abre YouTube antes de usar la extensión.": "Open YouTube before using the extension.",
    "⚠️ No se pudo comunicar con el vídeo. Prueba a recargar la página de YouTube.": "⚠️ Could not communicate with the video. Try reloading the YouTube page.",
    "⚠️ No se recibió respuesta del script.": "⚠️ No response was received from the script.", "Error al enviar mensaje a la pestaña.": "Error sending a message to the tab.",
    "No puedes asignar una velocidad superior a 16×.": "You cannot assign a speed above 16×.",
    "Asigna una tecla e introduce una velocidad válida.": "Assign a key and enter a valid speed.", "Asigna una tecla.": "Assign a key.",
    "¿Quieres eliminar esta nota? Esta acción no se puede deshacer.": "Do you want to delete this note? This action cannot be undone."
  };
  const ES = Object.fromEntries(Object.entries(EN).map(([es, en]) => [en, es]));
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  let language = "es";
  let observer = null;
  let storageListening = false;

  function translateValue(value, lang) {
    if (!value) return value;
    const dictionary = lang === "en" ? EN : ES;
    if (dictionary[value]) return dictionary[value];
    if (lang === "en") {
      let match = value.match(/^(\d+) de (\d+) (activo|activos)$/);
      if (match) return `${match[1]} of ${match[2]} active`;
      match = value.match(/^(\d+(?:[.,]\d+)?)s fijos$/);
      if (match) return `${match[1]}s fixed`;
      match = value.match(/^(\d+(?:[.,]\d+)?)s por velocidad$/);
      if (match) return `${match[1]}s by speed`;
      match = value.match(/^(Favorito|Nota) · (.+)$/);
      if (match) return `${match[1] === "Favorito" ? "Favorite" : "Note"} · ${match[2]}`;
    }
    return value;
  }

  function skipped(node) {
    return node.parentElement?.closest('[data-i18n-skip],.ytx-transcript-row__text,.ytx-note-item__text,.ytx-note-item__note,.global-note__text,.global-note__note,.ytx-note-editor__text,.ytx-progress-marker-preview__body');
  }

  function translateTree(root = document, lang = language) {
    const elementRoot = root.nodeType === Node.ELEMENT_NODE ? root : null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (skipped(node) || !node.nodeValue.trim()) continue;
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const original = originalText.get(node);
      const leading = original.match(/^\s*/)?.[0] || "";
      const trailing = original.match(/\s*$/)?.[0] || "";
      node.nodeValue = `${leading}${lang === "en" ? translateValue(original.trim(), "en") : original.trim()}${trailing}`;
    }
    const elements = [elementRoot, ...(root.querySelectorAll?.('*') || [])].filter(Boolean);
    elements.forEach((element) => {
      if (element.matches?.('[data-i18n-skip],.ytx-transcript-row__text,.ytx-note-item__text,.ytx-note-item__note,.ytx-note-editor__text,.ytx-progress-marker-preview__body')) return;
      const stored = originalAttrs.get(element) || {};
      ["title", "aria-label", "placeholder"].forEach((attr) => {
        if (!element.hasAttribute?.(attr)) return;
        if (!(attr in stored)) stored[attr] = element.getAttribute(attr);
        element.setAttribute(attr, lang === "en" ? translateValue(stored[attr], "en") : stored[attr]);
      });
      originalAttrs.set(element, stored);
    });
  }

  function relevantContentNode(node) {
    if (!(node instanceof Element)) return null;
    return node.matches('.ytx-panel,.ytx-player-controls,.ytx-player-speed-menu,.ytx-player-note-editor,.ytx-progress-marker-preview')
      ? node
      : node.closest('.ytx-panel,.ytx-player-controls,.ytx-player-speed-menu,.ytx-player-note-editor,.ytx-progress-marker-preview');
  }

  function apply(root) { translateTree(root || document, language); }
  function setLanguage(next) {
    language = next === "en" ? "en" : "es";
    chrome.storage.local.set({ uiLanguage: language });
    apply(document);
    window.dispatchEvent(new CustomEvent("ytx:languagechange", { detail: { language } }));
  }
  function start(options = {}) {
    const scope = options.scope || "popup";
    chrome.storage.local.get({ uiLanguage: "es" }, (stored) => {
      language = stored.uiLanguage === "en" ? "en" : "es";
      apply(document);
      window.dispatchEvent(new CustomEvent("ytx:languagechange", { detail: { language } }));
    });
    observer?.disconnect();
    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        const target = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        if (!(target instanceof Element)) return;
        if (scope === "popup") apply(target);
        else {
          const relevant = relevantContentNode(target);
          if (relevant) apply(relevant);
        }
      }));
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    if (!storageListening && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local" || !changes.uiLanguage) return;
        const next = changes.uiLanguage.newValue === "en" ? "en" : "es";
        if (next === language) return;
        language = next;
        apply(document);
        window.dispatchEvent(new CustomEvent("ytx:languagechange", { detail: { language } }));
      });
      storageListening = true;
    }
  }

  globalThis.YTXI18n = { start, apply, setLanguage, getLanguage: () => language, t: (value) => translateValue(value, language) };
})();
