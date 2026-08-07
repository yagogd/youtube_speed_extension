// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const mainView = document.getElementById('main-view');
  const settingsView = document.getElementById('settings-view');
  const openSettingsButtons = [
    document.getElementById('open-settings'),
    document.getElementById('open-settings-secondary'),
  ];
  const closeSettingsButton = document.getElementById('close-settings');
  const resetPanelLayout = document.getElementById('reset-panel-layout');
  const settingsStatus = document.getElementById('settings-status');
  const speedInput = document.getElementById('speed');
  const applyBtn = document.getElementById('apply');
  const resetBtn = document.getElementById('reset');
  const presets = document.querySelectorAll('.preset');
  const transcriptEnabled = document.getElementById('transcript-enabled');
  const transcriptMode = document.getElementById('transcript-mode');
  const transcriptGrouping = document.getElementById('transcript-grouping');
  const shortcutSettingsToggle = document.getElementById('shortcut-settings-toggle');
  const shortcutSettings = document.getElementById('shortcut-settings');
  const shortcutKeyButton = document.getElementById('shortcut-key');
  const shortcutSpeed = document.getElementById('shortcut-speed');
  const shortcutBehavior = document.getElementById('shortcut-behavior');
  const shortcutAdd = document.getElementById('shortcut-add');
  const shortcutList = document.getElementById('shortcut-list');
  const globalNotesToggle = document.getElementById('global-notes-toggle');
  const globalNotes = document.getElementById('global-notes');
  const notesExport = document.getElementById('notes-export');
  const globalNotesList = document.getElementById('global-notes-list');
  const pauseRewindEnabled = document.getElementById('pause-rewind-enabled');
  const pauseRewindSeconds = document.getElementById('pause-rewind-seconds');
  const pauseRewindMode = document.getElementById('pause-rewind-mode');
  let speedShortcuts = [];
  let capturedShortcut = null;
  let pendingModifier = null;
  let editingShortcutId = null;

  function showSettings(show) {
    mainView.hidden = show;
    settingsView.hidden = !show;
    window.scrollTo(0, 0);
  }

  openSettingsButtons.forEach((button) => {
    button.addEventListener('click', () => showSettings(true));
  });
  closeSettingsButton.addEventListener('click', () => showSettings(false));

  resetPanelLayout.addEventListener('click', () => {
    chrome.storage.local.remove([
      'transcriptPanelGeometry',
      'transcriptPanelMinimized',
      'transcriptHeaderCollapsed',
    ], () => {
      settingsStatus.textContent = 'Diseño restablecido. Se aplicará al volver a abrir el panel.';
    });
  });

  // Envía mensaje al tab activo
  async function sendSpeedToActiveTab(rate) {
    rate = parseFloat(rate);
    if (isNaN(rate) || rate <= 0) {
      alert('Introduce una velocidad válida (> 0).');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        alert("No se detecta ninguna pestaña activa.");
        return;
      }

      // Verifica que es YouTube
      if (!tab.url || !tab.url.includes("youtube.com")) {
        alert("Abre YouTube antes de usar la extensión.");
        return;
      }

      // Envia el mensaje al content script
      chrome.tabs.sendMessage(tab.id, { type: 'set-speed', value: rate }, (resp) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError.message);
          alert('⚠️ No se pudo comunicar con el vídeo. Prueba a recargar la página de YouTube.');
          return;
        }

        if (!resp) {
          alert('⚠️ No se recibió respuesta del script.');
          return;
        }

        if (resp.ok) {
          console.log(`✅ Velocidad aplicada: ${rate}x`);
          chrome.storage.local.set({ lastSpeed: rate });
        } else {
          alert('Error al aplicar la velocidad: ' + (resp.error || 'desconocido.'));
        }
      });
    } catch (e) {
      console.error('Error general:', e);
      alert("Error al enviar mensaje a la pestaña.");
    }
  }


  applyBtn.addEventListener('click', () => {
    sendSpeedToActiveTab(speedInput.value);
  });

  resetBtn.addEventListener('click', () => {
    speedInput.value = 1;
    sendSpeedToActiveTab(1);
  });

  // Detectar tecla Enter en el campo de velocidad
  speedInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // evita que se envíe el formulario
      sendSpeedToActiveTab(speedInput.value);
    }
  });

  presets.forEach(btn => {
    btn.addEventListener('click', (e) => {
      speedInput.value = e.target.textContent.trim();
      sendSpeedToActiveTab(speedInput.value);
    });
  });

  // cargar último speed guardado
  chrome.storage.local.get(['lastSpeed'], (res) => {
    if (res.lastSpeed) speedInput.value = res.lastSpeed;
  });

  chrome.storage.local.get({ transcriptEnabled: true, transcriptMode: 'full', transcriptGrouping: 'grouped' }, (res) => {
    transcriptEnabled.checked = res.transcriptEnabled;
    transcriptMode.value = res.transcriptMode;
    transcriptGrouping.value = res.transcriptGrouping;
    transcriptMode.disabled = !res.transcriptEnabled;
    transcriptGrouping.disabled = !res.transcriptEnabled;
  });

  transcriptEnabled.addEventListener('change', () => {
    transcriptMode.disabled = !transcriptEnabled.checked;
    transcriptGrouping.disabled = !transcriptEnabled.checked;
    chrome.storage.local.set({ transcriptEnabled: transcriptEnabled.checked });
  });

  transcriptMode.addEventListener('change', () => {
    chrome.storage.local.set({ transcriptMode: transcriptMode.value });
  });

  transcriptGrouping.addEventListener('change', () => {
    chrome.storage.local.set({ transcriptGrouping: transcriptGrouping.value });
  });

  function shortcutFromEvent(event) {
    const modifierCodes = ['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'];
    const ownModifier = modifierCodes.includes(event.code);
    const parts = [];
    if (event.ctrlKey && !event.code.startsWith('Control')) parts.push('Ctrl');
    if (event.altKey && !event.code.startsWith('Alt')) parts.push('Alt');
    if (event.shiftKey && !event.code.startsWith('Shift')) parts.push('Shift');
    if (event.metaKey && !event.code.startsWith('Meta')) parts.push('Meta');
    const keyLabel = ownModifier
      ? event.code.replace(/Left|Right/, '').replace('Control', 'Ctrl').replace('Meta', 'Windows')
      : (event.key.length === 1 ? event.key.toUpperCase() : event.key);
    parts.push(keyLabel);
    return {
      code: event.code,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey,
      label: parts.join(' + '),
    };
  }

  function finishShortcutCapture(shortcut) {
    if (editingShortcutId) {
      speedShortcuts = speedShortcuts.map((item) => item.id === editingShortcutId
        ? { ...item, ...shortcut }
        : item);
      chrome.storage.local.set({ speedShortcuts });
      editingShortcutId = null;
      pendingModifier = null;
      document.removeEventListener('keydown', captureKeyDown, true);
      document.removeEventListener('keyup', captureKeyUp, true);
      renderShortcuts();
      return;
    }
    capturedShortcut = shortcut;
    pendingModifier = null;
    shortcutKeyButton.textContent = shortcut.label;
    document.removeEventListener('keydown', captureKeyDown, true);
    document.removeEventListener('keyup', captureKeyUp, true);
  }

  function captureKeyDown(event) {
    event.preventDefault();
    event.stopPropagation();
    const modifierCodes = ['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'];
    const shortcut = shortcutFromEvent(event);
    if (modifierCodes.includes(event.code)) {
      pendingModifier = shortcut;
      shortcutKeyButton.textContent = `${shortcut.label} + …`;
      return;
    }
    finishShortcutCapture(shortcut);
  }

  function captureKeyUp(event) {
    if (!pendingModifier || event.code !== pendingModifier.code) return;
    event.preventDefault();
    event.stopPropagation();
    finishShortcutCapture(pendingModifier);
  }

  function renderShortcuts() {
    shortcutList.replaceChildren();
    if (!speedShortcuts.length) {
      const empty = document.createElement('div');
      empty.className = 'shortcut-empty';
      empty.textContent = 'No hay atajos configurados.';
      shortcutList.appendChild(empty);
      return;
    }

    speedShortcuts.forEach((shortcut) => {
      const item = document.createElement('div');
      item.className = 'shortcut-item';
      const chips = document.createElement('div');
      chips.className = 'shortcut-chips';

      const key = document.createElement('button');
      key.className = 'shortcut-chip shortcut-chip--key';
      key.textContent = shortcut.label;
      key.title = 'Cambiar tecla';
      key.addEventListener('click', () => {
        editingShortcutId = shortcut.id;
        pendingModifier = null;
        key.textContent = 'Pulsa una tecla…';
        document.addEventListener('keydown', captureKeyDown, true);
        document.addEventListener('keyup', captureKeyUp, true);
      });

      const speed = document.createElement('button');
      speed.className = 'shortcut-chip shortcut-chip--speed';
      speed.textContent = `${shortcut.speed}×`;
      speed.title = 'Cambiar velocidad';
      speed.addEventListener('click', () => {
        const editor = document.createElement('input');
        editor.className = 'shortcut-speed-editor';
        editor.type = 'number';
        editor.min = '0.1';
        editor.step = '0.25';
        editor.value = shortcut.speed;
        speed.replaceWith(editor);
        editor.focus();
        editor.select();
        let saved = false;
        const saveSpeed = () => {
          if (saved) return;
          saved = true;
          const value = Number(editor.value);
          if (Number.isFinite(value) && value > 0) {
            shortcut.speed = value;
            chrome.storage.local.set({ speedShortcuts });
          }
          renderShortcuts();
        };
        editor.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') saveSpeed();
          if (event.key === 'Escape') renderShortcuts();
        });
        editor.addEventListener('blur', saveSpeed);
      });

      const behavior = document.createElement('button');
      behavior.className = 'shortcut-chip shortcut-chip--behavior';
      behavior.textContent = shortcut.behavior === 'hold' ? 'Mientras pulsas' : 'Permanente';
      behavior.title = 'Cambiar comportamiento';
      behavior.addEventListener('click', () => {
        shortcut.behavior = shortcut.behavior === 'hold' ? 'permanent' : 'hold';
        chrome.storage.local.set({ speedShortcuts });
        renderShortcuts();
      });

      chips.append(key, speed, behavior);
      const remove = document.createElement('button');
      remove.className = 'shortcut-remove';
      remove.textContent = '×';
      remove.title = 'Eliminar atajo';
      remove.addEventListener('click', () => {
        speedShortcuts = speedShortcuts.filter((candidate) => candidate.id !== shortcut.id);
        chrome.storage.local.set({ speedShortcuts });
        renderShortcuts();
      });
      item.append(chips, remove);
      shortcutList.appendChild(item);
    });
  }

  shortcutSettingsToggle.addEventListener('click', () => {
    shortcutSettings.hidden = !shortcutSettings.hidden;
    shortcutSettingsToggle.textContent = shortcutSettings.hidden ? 'Añadir un atajo' : 'Cancelar';
  });

  shortcutKeyButton.addEventListener('click', () => {
    editingShortcutId = null;
    capturedShortcut = null;
    pendingModifier = null;
    shortcutKeyButton.textContent = 'Pulsa una tecla…';
    document.addEventListener('keydown', captureKeyDown, true);
    document.addEventListener('keyup', captureKeyUp, true);
  });

  shortcutAdd.addEventListener('click', () => {
    const speed = Number(shortcutSpeed.value);
    if (!capturedShortcut || !Number.isFinite(speed) || speed <= 0) {
      alert('Asigna una tecla e introduce una velocidad válida.');
      return;
    }
    const signature = JSON.stringify(capturedShortcut);
    speedShortcuts = speedShortcuts.filter((shortcut) => JSON.stringify({
      code: shortcut.code,
      ctrl: shortcut.ctrl,
      alt: shortcut.alt,
      shift: shortcut.shift,
      meta: shortcut.meta,
      label: shortcut.label,
    }) !== signature);
    speedShortcuts.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...capturedShortcut,
      speed,
      behavior: shortcutBehavior.value,
    });
    chrome.storage.local.set({ speedShortcuts });
    capturedShortcut = null;
    shortcutKeyButton.textContent = 'Asignar tecla';
    renderShortcuts();
  });

  chrome.storage.local.get({ speedShortcuts: [] }, (stored) => {
    speedShortcuts = Array.isArray(stored.speedShortcuts) ? stored.speedShortcuts : [];
    renderShortcuts();
  });

  function updatePauseRewindControls() {
    pauseRewindSeconds.disabled = !pauseRewindEnabled.checked;
    pauseRewindMode.disabled = !pauseRewindEnabled.checked;
  }

  chrome.storage.local.get({
    pauseRewindEnabled: false,
    pauseRewindSeconds: 2,
    pauseRewindMode: 'fixed',
  }, (stored) => {
    pauseRewindEnabled.checked = stored.pauseRewindEnabled;
    pauseRewindSeconds.value = stored.pauseRewindSeconds;
    pauseRewindMode.value = stored.pauseRewindMode;
    updatePauseRewindControls();
  });

  pauseRewindEnabled.addEventListener('change', () => {
    updatePauseRewindControls();
    chrome.storage.local.set({ pauseRewindEnabled: pauseRewindEnabled.checked });
  });
  pauseRewindSeconds.addEventListener('change', () => {
    const seconds = Math.max(0.1, Number(pauseRewindSeconds.value) || 2);
    pauseRewindSeconds.value = seconds;
    chrome.storage.local.set({ pauseRewindSeconds: seconds });
  });
  pauseRewindMode.addEventListener('change', () => {
    chrome.storage.local.set({ pauseRewindMode: pauseRewindMode.value });
  });

  function formatNoteTime(milliseconds) {
    const secondsTotal = Math.floor((Number(milliseconds) || 0) / 1000);
    const minutes = Math.floor(secondsTotal / 60);
    return `${minutes}:${String(secondsTotal % 60).padStart(2, '0')}`;
  }

  function noteLink(item) {
    return `${item.videoUrl}&t=${Math.floor((Number(item.startMs) || 0) / 1000)}s`;
  }

  function loadGlobalNotes() {
    chrome.storage.local.get({ ytxSavedNotes: [] }, (stored) => {
      const notes = Array.isArray(stored.ytxSavedNotes) ? stored.ytxSavedNotes : [];
      globalNotesList.replaceChildren();
      if (!notes.length) {
        const empty = document.createElement('div');
        empty.className = 'shortcut-empty';
        empty.textContent = 'Todavía no tienes notas ni favoritos.';
        globalNotesList.appendChild(empty);
        return;
      }

      notes.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach((item) => {
        const card = document.createElement('div');
        card.className = 'global-note';
        const title = document.createElement('a');
        title.className = 'global-note__title';
        title.href = noteLink(item);
        title.target = '_blank';
        title.textContent = item.videoTitle || 'Vídeo de YouTube';
        const meta = document.createElement('div');
        meta.className = 'global-note__meta';
        const time = document.createElement('a');
        time.href = noteLink(item);
        time.target = '_blank';
        time.textContent = formatNoteTime(item.startMs);
        const remove = document.createElement('button');
        remove.textContent = 'Eliminar';
        remove.addEventListener('click', () => {
          chrome.storage.local.set({ ytxSavedNotes: notes.filter((candidate) => candidate.id !== item.id) }, loadGlobalNotes);
        });
        meta.append(time, remove);
        const text = document.createElement('div');
        text.className = 'global-note__text';
        text.textContent = item.text || 'Momento guardado';
        card.append(title, meta, text);
        if (item.note) {
          const note = document.createElement('div');
          note.className = 'global-note__note';
          note.textContent = item.note;
          card.appendChild(note);
        }
        globalNotesList.appendChild(card);
      });
    });
  }

  globalNotesToggle.addEventListener('click', () => {
    globalNotes.hidden = !globalNotes.hidden;
    if (!globalNotes.hidden) loadGlobalNotes();
  });

  notesExport.addEventListener('click', () => {
    chrome.storage.local.get({ ytxSavedNotes: [] }, (stored) => {
      const notes = Array.isArray(stored.ytxSavedNotes) ? stored.ytxSavedNotes : [];
      const grouped = new Map();
      notes.forEach((item) => {
        const group = grouped.get(item.videoId) || [];
        group.push(item);
        grouped.set(item.videoId, group);
      });
      const lines = ['# Notas y favoritos de YouTube', ''];
      grouped.forEach((items) => {
        const first = items[0];
        lines.push(`## [${first.videoTitle || 'Vídeo de YouTube'}](${first.videoUrl})`, '');
        items.sort((a, b) => a.startMs - b.startMs).forEach((item) => {
          lines.push(`- [${formatNoteTime(item.startMs)}](${noteLink(item)}) — ${item.text || 'Momento guardado'}`);
          if (item.note) lines.push(`  - Nota: ${item.note}`);
        });
        lines.push('');
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'notas-youtube.md';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.ytxSavedNotes && !globalNotes.hidden) loadGlobalNotes();
  });
});
