// Entry point for the extension popup.
import { createNotesController } from "./notes-controller.js";
import { initSpeedControls } from "./speed.js";
import { initTranscriptSettings } from "./transcript-settings.js";
import { initAppearance } from "./appearance.js";
import { initNavigation } from "./navigation.js";
import { initPauseSettings, normalizePauseSeconds } from "./pause-settings.js";
import { isModifierCode, shortcutFromKeyboardEvent, shortcutsMatch } from "./shortcut-utils.js";

document.addEventListener('DOMContentLoaded', async () => {
  const i18n = globalThis.YTXI18n;
  const tr = (value) => i18n?.t(value) || value;
  const languageButtons = [...document.querySelectorAll('.language-toggle')];

  function refreshLanguageButtons() {
    const isSpanish = (i18n?.getLanguage() || 'es') === 'es';
    const label = isSpanish ? 'Cambiar a inglés' : 'Switch to Spanish';
    languageButtons.forEach((button) => {
      button.textContent = isSpanish ? 'ES' : 'EN';
      button.title = label;
      button.setAttribute('aria-label', label);
    });
  }

  languageButtons.forEach((button) => button.addEventListener('click', () => {
    i18n?.setLanguage(i18n.getLanguage() === 'es' ? 'en' : 'es');
  }));
  window.addEventListener('ytx:languagechange', () => {
    refreshLanguageButtons();
    i18n?.apply(document);
  });
  i18n?.start({ scope: 'popup' });
  refreshLanguageButtons();
  function alert(message) {
    document.querySelector('.popup-notice')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'popup-notice';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Aviso');
    const box = document.createElement('div');
    box.className = 'popup-notice__box';
    const text = document.createElement('p');
    text.textContent = String(message);
    const accept = document.createElement('button');
    accept.className = 'primary';
    accept.textContent = 'Aceptar';
    const close = () => overlay.remove();
    accept.addEventListener('click', close);
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
    box.append(text, accept);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    accept.focus();
  }
  const panelBackground = document.getElementById('panel-background');
  const transcriptEnabled = document.getElementById('transcript-enabled');
  const transcriptAutoOpenNext = document.getElementById('transcript-auto-open-next');
  const continuitySettings = document.getElementById('continuity-settings');
  const rememberPlaybackSpeed = document.getElementById('remember-playback-speed');
  const rememberPanelLayout = document.getElementById('remember-panel-layout');
  const shortcutSettingsToggle = document.getElementById('shortcut-settings-toggle');
  const shortcutSettings = document.getElementById('shortcut-settings');
  const shortcutKeyButton = document.getElementById('shortcut-key');
  const shortcutSpeed = document.getElementById('shortcut-speed');
  const shortcutBehavior = document.getElementById('shortcut-behavior');
  const shortcutAdd = document.getElementById('shortcut-add');
  const shortcutList = document.getElementById('shortcut-list');
  const speedShortcutsEnabled = document.getElementById('speed-shortcuts-enabled');
  const quickShortcutsEnabled = document.getElementById('quick-shortcuts-enabled');
  const quickShortcutsSummary = document.getElementById('quick-shortcuts-summary');
  const quickShortcutsList = document.getElementById('quick-shortcuts-list');
  const pauseShortcutsEnabled = document.getElementById('pause-shortcuts-enabled');
  const pauseShortcutKey = document.getElementById('pause-shortcut-key');
  const pauseShortcutAction = document.getElementById('pause-shortcut-action');
  const pauseShortcutRewindOptions = document.getElementById('pause-shortcut-rewind-options');
  const pauseShortcutSeconds = document.getElementById('pause-shortcut-seconds');
  const pauseShortcutMode = document.getElementById('pause-shortcut-mode');
  const pauseShortcutAdd = document.getElementById('pause-shortcut-add');
  const pauseShortcutList = document.getElementById('pause-shortcut-list');
  const quickPauseShortcutsEnabled = document.getElementById('quick-pause-shortcuts-enabled');
  const quickPauseShortcutsSummary = document.getElementById('quick-pause-shortcuts-summary');
  const quickPauseShortcutsList = document.getElementById('quick-pause-shortcuts-list');
  let speedShortcuts = [];
  let capturedShortcut = null;
  let pendingModifier = null;
  let editingShortcutId = null;
  let pauseShortcuts = [];
  let capturedPauseShortcut = null;
  let pendingPauseModifier = null;
  let extensionEnabled = true;
  const notesController = createNotesController({ tr });

  const autoOpenRow = transcriptAutoOpenNext.closest('.toggle');
  if (autoOpenRow) continuitySettings.appendChild(autoOpenRow);

  const shortcutDetails = shortcutList.closest('details');
  const shortcutSectionTitle = shortcutDetails?.querySelector('.section-title strong');
  const shortcutSectionCopy = shortcutDetails?.querySelector('.section-title span');
  if (shortcutSectionTitle) shortcutSectionTitle.textContent = 'Atajos de teclado';
  if (shortcutSectionCopy) shortcutSectionCopy.textContent = 'Velocidad, pausa y retroceso';
  shortcutList.after(pauseShortcutList);

  const settingsContent = continuitySettings.closest('.content');
  const continuityDetails = continuitySettings.closest('details');
  const transcriptDetails = transcriptEnabled.closest('details');
  const panelDetails = panelBackground.closest('details');
  const presetDetails = document.getElementById('preset-editor-list').closest('details');
  [continuityDetails, transcriptDetails, panelDetails, presetDetails, shortcutDetails]
    .forEach((section) => settingsContent.appendChild(section));

  const shortcutCreateRow = shortcutKeyButton.closest('.shortcut-create-row');
  shortcutCreateRow.classList.add('unified-shortcut-row');
  const shortcutType = document.createElement('select');
  shortcutType.id = 'shortcut-type';
  shortcutType.setAttribute('aria-label', 'Tipo de atajo');
  shortcutType.innerHTML = '<option value="speed">Velocidad</option><option value="pause">Pausa</option><option value="pause-rewind">Pausa + retroceso</option>';
  shortcutCreateRow.insertBefore(shortcutType, shortcutSpeed);
  pauseShortcutSeconds.classList.add('shortcut-extra');
  pauseShortcutSeconds.setAttribute('aria-label', 'Segundos de retroceso');
  pauseShortcutMode.classList.add('shortcut-extra');
  pauseShortcutMode.setAttribute('aria-label', 'Cálculo del retroceso');
  pauseShortcutMode.options[0].textContent = 'Fijo';
  pauseShortcutMode.options[1].textContent = '× velocidad';
  shortcutCreateRow.insertBefore(pauseShortcutSeconds, shortcutAdd);
  shortcutCreateRow.insertBefore(pauseShortcutMode, shortcutAdd);

  function updateUnifiedShortcutForm() {
    const speedType = shortcutType.value === 'speed';
    const rewindType = shortcutType.value === 'pause-rewind';
    shortcutCreateRow.dataset.type = shortcutType.value;
    shortcutSpeed.hidden = !speedType;
    shortcutBehavior.hidden = !speedType;
    pauseShortcutSeconds.hidden = !rewindType;
    pauseShortcutMode.hidden = !rewindType;
  }
  shortcutType.addEventListener('change', updateUnifiedShortcutForm);
  updateUnifiedShortcutForm();
  initTranscriptSettings();

  const appearance = await initAppearance({
    onExtensionStateChange: (enabled) => { extensionEnabled = enabled; },
  });

  initNavigation({ notesController });

  initSpeedControls({
    isExtensionEnabled: appearance.isExtensionEnabled,
    showNotice: alert,
    tr,
  });

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
    const shortcut = shortcutFromKeyboardEvent(event);
    if (isModifierCode(event.code)) {
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

  function finishPauseShortcutCapture(shortcut) {
    capturedPauseShortcut = shortcut;
    pendingPauseModifier = null;
    pauseShortcutKey.textContent = shortcut.label;
    document.removeEventListener('keydown', capturePauseKeyDown, true);
    document.removeEventListener('keyup', capturePauseKeyUp, true);
  }

  function capturePauseKeyDown(event) {
    event.preventDefault();
    event.stopPropagation();
    const shortcut = shortcutFromKeyboardEvent(event);
    if (isModifierCode(event.code)) {
      pendingPauseModifier = shortcut;
      pauseShortcutKey.textContent = `${shortcut.label} + …`;
      return;
    }
    finishPauseShortcutCapture(shortcut);
  }

  function capturePauseKeyUp(event) {
    if (!pendingPauseModifier || event.code !== pendingPauseModifier.code) return;
    event.preventDefault();
    event.stopPropagation();
    finishPauseShortcutCapture(pendingPauseModifier);
  }

  function updatePauseShortcutSummary() {
    const active = pauseShortcuts.filter((shortcut) => shortcut.enabled !== false).length;
    quickPauseShortcutsSummary.textContent = pauseShortcuts.length
      ? `${active} de ${pauseShortcuts.length} ${pauseShortcuts.length === 1 ? 'activo' : 'activos'}`
      : 'Sin atajos configurados';
  }

  function renderPauseShortcuts() {
    updatePauseShortcutSummary();
    pauseShortcutList.replaceChildren();
    quickPauseShortcutsList.replaceChildren();
    if (!pauseShortcuts.length) {
      const empty = document.createElement('div');
      empty.className = 'shortcut-empty';
      empty.textContent = 'No hay atajos de pausa configurados.';
      if (!speedShortcuts.length) pauseShortcutList.appendChild(empty);
      const quickEmpty = empty.cloneNode(true);
      quickEmpty.className = 'quick-shortcut-empty';
      quickPauseShortcutsList.appendChild(quickEmpty);
      renderShortcuts();
      return;
    }
    pauseShortcuts.forEach((shortcut) => {
      const quickItem = document.createElement('div');
      quickItem.className = 'quick-shortcut';
      const quickInfo = document.createElement('div');
      quickInfo.className = 'quick-shortcut__info';
      const quickKey = document.createElement('strong');
      quickKey.textContent = shortcut.label;
      const quickDescription = document.createElement('span');
      quickDescription.textContent = shortcut.action === 'pause-rewind'
        ? `${Number(shortcut.seconds) || 3}s ${shortcut.mode === 'scaled' ? 'por velocidad' : 'fijos'}`
        : 'Pausa normal';
      quickInfo.append(quickKey, quickDescription);
      const quickSwitch = document.createElement('label');
      quickSwitch.className = 'switch';
      const quickToggle = document.createElement('input');
      quickToggle.type = 'checkbox';
      quickToggle.checked = shortcut.enabled !== false;
      quickToggle.setAttribute('aria-label', `${quickToggle.checked ? 'Desactivar' : 'Activar'} atajo ${shortcut.label}`);
      const quickTrack = document.createElement('span');
      quickToggle.addEventListener('change', () => {
        shortcut.enabled = quickToggle.checked;
        quickToggle.setAttribute('aria-label', `${quickToggle.checked ? 'Desactivar' : 'Activar'} atajo ${shortcut.label}`);
        chrome.storage.local.set({ pauseShortcuts });
        updatePauseShortcutSummary();
      });
      quickSwitch.append(quickToggle, quickTrack);
      quickItem.append(quickInfo, quickSwitch);
      quickPauseShortcutsList.appendChild(quickItem);

      const item = document.createElement('div');
      item.className = 'shortcut-item';
      const chips = document.createElement('div');
      chips.className = 'shortcut-chips';
      const key = document.createElement('span');
      key.className = 'shortcut-chip shortcut-chip--key';
      key.textContent = shortcut.label;
      const action = document.createElement('button');
      action.className = 'shortcut-chip shortcut-chip--behavior';
      action.textContent = shortcut.action === 'pause-rewind' ? 'Pausa + retroceso' : 'Pausa normal';
      action.title = 'Cambiar acción';
      action.addEventListener('click', () => {
        shortcut.action = shortcut.action === 'pause-rewind' ? 'toggle' : 'pause-rewind';
        if (shortcut.action === 'pause-rewind') {
          shortcut.seconds = Number(shortcut.seconds) || 3;
          shortcut.mode = shortcut.mode === 'scaled' ? 'scaled' : 'fixed';
        }
        chrome.storage.local.set({ pauseShortcuts });
        renderPauseShortcuts();
      });
      chips.append(key, action);
      if (shortcut.action === 'pause-rewind') {
        const seconds = document.createElement('button');
        seconds.className = 'shortcut-chip shortcut-chip--speed';
        seconds.textContent = `${Number(shortcut.seconds) || 3}s`;
        seconds.title = 'Cambiar segundos de retroceso';
        seconds.addEventListener('click', () => {
          const editor = document.createElement('input');
          editor.className = 'shortcut-speed-editor';
          editor.type = 'number';
          editor.min = '0.1';
          editor.step = '0.5';
          editor.value = Number(shortcut.seconds) || 3;
          seconds.replaceWith(editor);
          editor.focus();
          editor.select();
          let saved = false;
          const saveSeconds = () => {
            if (saved) return;
            saved = true;
            const value = Number(editor.value);
            if (Number.isFinite(value) && value > 0) shortcut.seconds = value;
            chrome.storage.local.set({ pauseShortcuts });
            renderPauseShortcuts();
          };
          editor.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') saveSeconds();
            if (event.key === 'Escape') renderPauseShortcuts();
          });
          editor.addEventListener('blur', saveSeconds);
        });
        const mode = document.createElement('button');
        mode.className = 'shortcut-chip shortcut-chip--behavior';
        mode.textContent = shortcut.mode === 'scaled' ? 'Según velocidad' : 'Tiempo fijo';
        mode.title = 'Cambiar cálculo del retroceso';
        mode.addEventListener('click', () => {
          shortcut.mode = shortcut.mode === 'scaled' ? 'fixed' : 'scaled';
          chrome.storage.local.set({ pauseShortcuts });
          renderPauseShortcuts();
        });
        chips.append(seconds, mode);
      }
      const remove = document.createElement('button');
      remove.className = 'shortcut-remove';
      remove.textContent = '×';
      remove.title = 'Eliminar atajo de pausa';
      remove.addEventListener('click', () => {
        pauseShortcuts = pauseShortcuts.filter((candidate) => candidate.id !== shortcut.id);
        chrome.storage.local.set({ pauseShortcuts });
        renderPauseShortcuts();
      });
      item.append(chips, remove);
      pauseShortcutList.appendChild(item);
    });
    renderShortcuts();
  }

  function updateShortcutSummary() {
    const active = speedShortcuts.filter((shortcut) => shortcut.enabled !== false).length;
    quickShortcutsSummary.textContent = speedShortcuts.length
      ? `${active} de ${speedShortcuts.length} ${speedShortcuts.length === 1 ? 'activo' : 'activos'}`
      : 'Sin atajos configurados';
  }

  function renderShortcuts() {
    updateShortcutSummary();
    shortcutList.replaceChildren();
    quickShortcutsList.replaceChildren();
    if (!speedShortcuts.length) {
      if (!pauseShortcuts.length) {
        const empty = document.createElement('div');
        empty.className = 'shortcut-empty';
        empty.textContent = 'No hay atajos configurados.';
        shortcutList.appendChild(empty);
      }
      const quickEmpty = document.createElement('div');
      quickEmpty.className = 'quick-shortcut-empty';
      quickEmpty.textContent = 'No hay atajos configurados.';
      quickShortcutsList.appendChild(quickEmpty);
      return;
    }

    speedShortcuts.forEach((shortcut) => {
      const quickItem = document.createElement('div');
      quickItem.className = 'quick-shortcut';
      const quickInfo = document.createElement('div');
      quickInfo.className = 'quick-shortcut__info';
      const quickKey = document.createElement('strong');
      quickKey.textContent = shortcut.label;
      const quickDescription = document.createElement('span');
      quickDescription.textContent = `${shortcut.speed}× · ${shortcut.behavior === 'hold' ? 'mientras pulsas' : 'permanente'}`;
      quickInfo.append(quickKey, quickDescription);
      const quickSwitch = document.createElement('label');
      quickSwitch.className = 'switch';
      const quickToggle = document.createElement('input');
      quickToggle.type = 'checkbox';
      quickToggle.checked = shortcut.enabled !== false;
      quickToggle.setAttribute('aria-label', `${quickToggle.checked ? 'Desactivar' : 'Activar'} atajo ${shortcut.label}`);
      const quickTrack = document.createElement('span');
      quickToggle.addEventListener('change', () => {
        shortcut.enabled = quickToggle.checked;
        quickToggle.setAttribute('aria-label', `${quickToggle.checked ? 'Desactivar' : 'Activar'} atajo ${shortcut.label}`);
        chrome.storage.local.set({ speedShortcuts });
        updateShortcutSummary();
      });
      quickSwitch.append(quickToggle, quickTrack);
      quickItem.append(quickInfo, quickSwitch);
      quickShortcutsList.appendChild(quickItem);

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
        editor.max = '16';
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
          if (value > 16) {
            alert(tr('No puedes asignar una velocidad superior a 16×.'));
          } else if (Number.isFinite(value) && value > 0) {
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
    const opening = shortcutSettings.hidden;
    if (opening) {
      shortcutSettings.hidden = false;
      shortcutSettingsToggle.textContent = 'Cancelar';
      shortcutSettings.appendChild(shortcutSettingsToggle);
    } else {
      shortcutSettings.hidden = true;
      shortcutSettingsToggle.textContent = 'Añadir un atajo';
      shortcutSettings.parentElement.insertBefore(shortcutSettingsToggle, shortcutSettings);
    }
  });

  shortcutBehavior.addEventListener('click', () => {
    const hold = shortcutBehavior.value !== 'hold';
    shortcutBehavior.value = hold ? 'hold' : 'permanent';
    shortcutBehavior.innerHTML = hold ? 'Mientras<br>pulsas' : 'Permanente';
    shortcutBehavior.setAttribute('aria-label', `Comportamiento: ${hold ? 'mientras pulsas' : 'permanente'}`);
  });

  shortcutKeyButton.addEventListener('click', () => {
    editingShortcutId = null;
    capturedShortcut = null;
    pendingModifier = null;
    shortcutKeyButton.textContent = 'Pulsa una tecla…';
    document.removeEventListener('keydown', capturePauseKeyDown, true);
    document.removeEventListener('keyup', capturePauseKeyUp, true);
    document.addEventListener('keydown', captureKeyDown, true);
    document.addEventListener('keyup', captureKeyUp, true);
  });

  shortcutAdd.addEventListener('click', () => {
    const speed = Number(shortcutSpeed.value);
    if (shortcutType.value === 'speed' && speed > 16) {
      alert(tr('No puedes asignar una velocidad superior a 16×.'));
      return;
    }
    if (!capturedShortcut || (shortcutType.value === 'speed' && (!Number.isFinite(speed) || speed <= 0))) {
      alert(tr(shortcutType.value === 'speed' ? 'Asigna una tecla e introduce una velocidad válida.' : 'Asigna una tecla.'));
      return;
    }
    speedShortcuts = speedShortcuts.filter((shortcut) => !shortcutsMatch(shortcut, capturedShortcut));
    pauseShortcuts = pauseShortcuts.filter((shortcut) => !shortcutsMatch(shortcut, capturedShortcut));
    if (shortcutType.value === 'speed') {
      speedShortcuts.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...capturedShortcut,
        speed,
        behavior: shortcutBehavior.value,
      });
      chrome.storage.local.set({ speedShortcuts, pauseShortcuts });
    } else {
      pauseShortcuts.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...capturedShortcut,
        action: shortcutType.value === 'pause-rewind' ? 'pause-rewind' : 'toggle',
        seconds: normalizePauseSeconds(pauseShortcutSeconds.value),
        mode: pauseShortcutMode.value === 'scaled' ? 'scaled' : 'fixed',
      });
      chrome.storage.local.set({ speedShortcuts, pauseShortcuts });
    }
    capturedShortcut = null;
    shortcutKeyButton.textContent = 'Asignar tecla';
    renderShortcuts();
    renderPauseShortcuts();
  });

  chrome.storage.local.get({ speedShortcuts: [] }, (stored) => {
    speedShortcuts = Array.isArray(stored.speedShortcuts) ? stored.speedShortcuts : [];
    quickShortcutsSummary.textContent = speedShortcuts.length
      ? `${speedShortcuts.length} ${speedShortcuts.length === 1 ? 'atajo configurado' : 'atajos configurados'}`
      : 'Sin atajos configurados';
    renderShortcuts();
  });

  chrome.storage.local.get({ speedShortcutsEnabled: true, pauseShortcutsEnabled: true }, (stored) => {
    speedShortcutsEnabled.checked = stored.speedShortcutsEnabled && stored.pauseShortcutsEnabled;
    quickShortcutsEnabled.checked = stored.speedShortcutsEnabled;
  });
  speedShortcutsEnabled.addEventListener('change', () => {
    quickShortcutsEnabled.checked = speedShortcutsEnabled.checked;
    quickPauseShortcutsEnabled.checked = speedShortcutsEnabled.checked;
    pauseShortcutsEnabled.checked = speedShortcutsEnabled.checked;
    chrome.storage.local.set({
      speedShortcutsEnabled: speedShortcutsEnabled.checked,
      pauseShortcutsEnabled: speedShortcutsEnabled.checked,
    });
  });
  quickShortcutsEnabled.addEventListener('change', () => {
    speedShortcutsEnabled.checked = quickShortcutsEnabled.checked;
    chrome.storage.local.set({ speedShortcutsEnabled: quickShortcutsEnabled.checked });
  });

  chrome.storage.local.get({ pauseShortcutsEnabled: true, pauseShortcuts: [] }, (stored) => {
    pauseShortcutsEnabled.checked = stored.pauseShortcutsEnabled;
    quickPauseShortcutsEnabled.checked = stored.pauseShortcutsEnabled;
    pauseShortcuts = Array.isArray(stored.pauseShortcuts) ? stored.pauseShortcuts : [];
    renderPauseShortcuts();
  });
  pauseShortcutsEnabled.addEventListener('change', () => {
    quickPauseShortcutsEnabled.checked = pauseShortcutsEnabled.checked;
    chrome.storage.local.set({ pauseShortcutsEnabled: pauseShortcutsEnabled.checked });
  });
  quickPauseShortcutsEnabled.addEventListener('change', () => {
    pauseShortcutsEnabled.checked = quickPauseShortcutsEnabled.checked;
    chrome.storage.local.set({ pauseShortcutsEnabled: quickPauseShortcutsEnabled.checked });
  });
  function updatePauseShortcutForm() {
    pauseShortcutRewindOptions.hidden = pauseShortcutAction.value !== 'pause-rewind';
  }
  pauseShortcutAction.addEventListener('change', updatePauseShortcutForm);
  updatePauseShortcutForm();
  pauseShortcutKey.addEventListener('click', () => {
    capturedPauseShortcut = null;
    pendingPauseModifier = null;
    pauseShortcutKey.textContent = 'Pulsa una tecla…';
    document.removeEventListener('keydown', captureKeyDown, true);
    document.removeEventListener('keyup', captureKeyUp, true);
    document.addEventListener('keydown', capturePauseKeyDown, true);
    document.addEventListener('keyup', capturePauseKeyUp, true);
  });
  pauseShortcutAdd.addEventListener('click', () => {
    if (!capturedPauseShortcut) {
      alert('Asigna una tecla para el atajo de pausa.');
      return;
    }
    pauseShortcuts = pauseShortcuts.filter((shortcut) => shortcut.code !== capturedPauseShortcut.code ||
      shortcut.ctrl !== capturedPauseShortcut.ctrl || shortcut.alt !== capturedPauseShortcut.alt ||
      shortcut.shift !== capturedPauseShortcut.shift || shortcut.meta !== capturedPauseShortcut.meta);
    pauseShortcuts.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...capturedPauseShortcut,
      action: pauseShortcutAction.value,
      seconds: Math.max(0.1, Number(pauseShortcutSeconds.value) || 3),
      mode: pauseShortcutMode.value === 'scaled' ? 'scaled' : 'fixed',
    });
    chrome.storage.local.set({ pauseShortcuts });
    capturedPauseShortcut = null;
    pauseShortcutKey.textContent = 'Asignar tecla';
    renderPauseShortcuts();
  });

  initPauseSettings();

});
