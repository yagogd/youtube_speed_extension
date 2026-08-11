// popup.js
document.addEventListener('DOMContentLoaded', () => {
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
  const mainView = document.getElementById('main-view');
  const settingsView = document.getElementById('settings-view');
  const openSettingsButtons = [
    document.getElementById('open-settings'),
    document.getElementById('open-settings-secondary'),
  ];
  const closeSettingsButton = document.getElementById('close-settings');
  const resetPanelLayout = document.getElementById('reset-panel-layout');
  const settingsStatus = document.getElementById('settings-status');
  const panelBackground = document.getElementById('panel-background');
  const panelTextColor = document.getElementById('panel-text-color');
  const panelFont = document.getElementById('panel-font');
  const panelFontSize = document.getElementById('panel-font-size');
  const panelOpacity = document.getElementById('panel-opacity');
  const resetPanelAppearance = document.getElementById('reset-panel-appearance');
  const themeToggle = document.getElementById('theme-toggle');
  const extensionPower = document.getElementById('extension-power');
  const extensionStatus = document.getElementById('extension-status');
  const speedInput = document.getElementById('speed');
  const speedSlider = document.getElementById('speed-slider');
  const speedDown = document.getElementById('speed-down');
  const speedUp = document.getElementById('speed-up');
  const presets = document.querySelectorAll('.preset');
  const transcriptEnabled = document.getElementById('transcript-enabled');
  const transcriptMode = document.getElementById('transcript-mode');
  const transcriptGrouping = document.getElementById('transcript-grouping');
  const transcriptPreferredLanguage = document.getElementById('transcript-preferred-language');
  const transcriptAutoOpenNext = document.getElementById('transcript-auto-open-next');
  const continuitySettings = document.getElementById('continuity-settings');
  const rememberPlaybackSpeed = document.getElementById('remember-playback-speed');
  const rememberPanelLayout = document.getElementById('remember-panel-layout');
  const quickTranscriptEnabled = document.getElementById('quick-transcript-enabled');
  const quickTranscriptMode = document.getElementById('quick-transcript-mode');
  const quickTranscriptGrouping = document.getElementById('quick-transcript-grouping');
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
  const openSettingsShortcuts = document.getElementById('open-settings-shortcuts');
  const pauseShortcutsEnabled = document.getElementById('pause-shortcuts-enabled');
  const pauseShortcutKey = document.getElementById('pause-shortcut-key');
  const pauseShortcutAction = document.getElementById('pause-shortcut-action');
  const pauseShortcutRewindOptions = document.getElementById('pause-shortcut-rewind-options');
  const pauseShortcutSeconds = document.getElementById('pause-shortcut-seconds');
  const pauseShortcutMode = document.getElementById('pause-shortcut-mode');
  const pauseShortcutAdd = document.getElementById('pause-shortcut-add');
  const pauseShortcutList = document.getElementById('pause-shortcut-list');
  const globalNotesToggle = document.getElementById('global-notes-toggle');
  const globalNotes = document.getElementById('global-notes');
  const notesExport = document.getElementById('notes-export');
  const globalNotesList = document.getElementById('global-notes-list');
  const pauseRewindEnabled = document.getElementById('pause-rewind-enabled');
  const pauseRewindSeconds = document.getElementById('pause-rewind-seconds');
  const pauseRewindMode = document.getElementById('pause-rewind-mode');
  const quickPauseEnabled = document.getElementById('quick-pause-enabled');
  const quickPauseSeconds = document.getElementById('quick-pause-seconds');
  const quickPauseMode = document.getElementById('quick-pause-mode');
  const quickPauseShortcutsEnabled = document.getElementById('quick-pause-shortcuts-enabled');
  const quickPauseShortcutsSummary = document.getElementById('quick-pause-shortcuts-summary');
  const quickPauseShortcutsList = document.getElementById('quick-pause-shortcuts-list');
  const openSettingsPauseShortcuts = document.getElementById('open-settings-pause-shortcuts');
  let speedShortcuts = [];
  let capturedShortcut = null;
  let pendingModifier = null;
  let editingShortcutId = null;
  let pauseShortcuts = [];
  let capturedPauseShortcut = null;
  let pendingPauseModifier = null;
  let extensionEnabled = true;

  const autoOpenRow = transcriptAutoOpenNext.closest('.toggle');
  if (autoOpenRow) continuitySettings.appendChild(autoOpenRow);

  const shortcutDetails = shortcutList.closest('details');
  const shortcutSectionTitle = shortcutDetails?.querySelector('.section-title strong');
  const shortcutSectionCopy = shortcutDetails?.querySelector('.section-title span');
  if (shortcutSectionTitle) shortcutSectionTitle.textContent = 'Atajos de teclado';
  if (shortcutSectionCopy) shortcutSectionCopy.textContent = 'Velocidad, pausa y retroceso';
  shortcutList.after(pauseShortcutList);

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

  function applyPopupTheme(theme) {
    const light = theme === 'light';
    document.body.classList.toggle('popup-light', light);
    themeToggle.textContent = light ? '☾' : '☀';
    themeToggle.title = light ? 'Usar tema oscuro' : 'Usar tema claro';
    themeToggle.setAttribute('aria-label', themeToggle.title);
  }

  function applyExtensionState(enabled) {
    extensionEnabled = enabled;
    mainView.classList.toggle('extension-off', !enabled);
    [mainView.querySelector('.content > .card:first-child'), mainView.querySelector('.feature-list')]
      .forEach((section) => section?.setAttribute('aria-hidden', String(!enabled)));
    extensionPower.setAttribute('aria-pressed', String(enabled));
    extensionPower.title = enabled ? 'Apagar extensión' : 'Encender extensión';
    extensionPower.setAttribute('aria-label', extensionPower.title);
    extensionStatus.textContent = enabled ? 'Control rápido' : 'Extensión apagada';
    [speedInput, speedSlider, speedDown, speedUp, ...presets, quickTranscriptEnabled,
      quickPauseEnabled, quickShortcutsEnabled].forEach((control) => { control.disabled = !enabled; });
  }

  chrome.storage.local.get({ popupTheme: 'dark', extensionEnabled: true }, (stored) => {
    applyPopupTheme(stored.popupTheme);
    applyExtensionState(stored.extensionEnabled);
  });
  themeToggle.addEventListener('click', () => {
    const theme = document.body.classList.contains('popup-light') ? 'dark' : 'light';
    applyPopupTheme(theme);
    chrome.storage.local.set({ popupTheme: theme });
  });
  extensionPower.addEventListener('click', () => {
    applyExtensionState(!extensionEnabled);
    chrome.storage.local.set({ extensionEnabled });
  });

  function updateQuickTranscriptControls() {
    quickTranscriptMode.disabled = !quickTranscriptEnabled.checked;
    quickTranscriptGrouping.disabled = !quickTranscriptEnabled.checked;
  }

  function updateQuickPauseControls() {
    quickPauseSeconds.disabled = false;
    quickPauseMode.disabled = false;
  }

  function showSettings(show) {
    mainView.hidden = show;
    settingsView.hidden = !show;
    window.scrollTo(0, 0);
  }

  openSettingsButtons.forEach((button) => {
    button.addEventListener('click', () => showSettings(true));
  });
  closeSettingsButton.addEventListener('click', () => showSettings(false));
  openSettingsShortcuts.addEventListener('click', () => {
    showSettings(true);
    const section = document.querySelector('[data-settings-section="shortcuts"]');
    if (section) section.open = true;
  });
  openSettingsPauseShortcuts.addEventListener('click', () => {
    showSettings(true);
    const section = pauseShortcutList.closest('details');
    if (section) section.open = true;
  });

  document.querySelectorAll('[data-quick-expand]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.getAttribute('aria-controls'));
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      target.hidden = !expanded;
    });
  });

  resetPanelLayout.addEventListener('click', () => {
    chrome.storage.local.remove([
      'transcriptPanelGeometry',
      'transcriptPanelMinimized',
      'transcriptHeaderCollapsed',
    ], () => {
      settingsStatus.textContent = 'Diseño restablecido. Se aplicará al volver a abrir el panel.';
    });
  });

  const appearanceDefaults = {
    transcriptPanelBackground: '#1e1e22', transcriptPanelTextColor: '#e4e4e7',
    transcriptPanelFont: 'Inter, Roboto, Arial, sans-serif', transcriptPanelFontSize: 13.5,
    transcriptPanelOpacity: 0.84,
  };
  function fillAppearance(stored) {
    panelBackground.value = stored.transcriptPanelBackground;
    panelTextColor.value = stored.transcriptPanelTextColor;
    panelFont.value = stored.transcriptPanelFont;
    panelFontSize.value = stored.transcriptPanelFontSize;
    panelOpacity.value = stored.transcriptPanelOpacity;
  }
  chrome.storage.local.get(appearanceDefaults, fillAppearance);
  panelBackground.addEventListener('input', () => chrome.storage.local.set({ transcriptPanelBackground: panelBackground.value }));
  panelTextColor.addEventListener('input', () => chrome.storage.local.set({ transcriptPanelTextColor: panelTextColor.value }));
  panelFont.addEventListener('change', () => chrome.storage.local.set({ transcriptPanelFont: panelFont.value }));
  panelFontSize.addEventListener('change', () => chrome.storage.local.set({ transcriptPanelFontSize: Math.min(22, Math.max(10, Number(panelFontSize.value) || 13.5)) }));
  panelOpacity.addEventListener('input', () => chrome.storage.local.set({ transcriptPanelOpacity: Number(panelOpacity.value) }));
  resetPanelAppearance.addEventListener('click', () => {
    chrome.storage.local.set(appearanceDefaults, () => {
      fillAppearance(appearanceDefaults);
      settingsStatus.textContent = 'Apariencia restaurada.';
    });
  });

  chrome.storage.local.get({ rememberPlaybackSpeed: true, transcriptRememberLayout: true }, (stored) => {
    rememberPlaybackSpeed.checked = stored.rememberPlaybackSpeed !== false;
    rememberPanelLayout.checked = stored.transcriptRememberLayout !== false;
  });
  rememberPlaybackSpeed.addEventListener('change', () => {
    chrome.storage.local.set({ rememberPlaybackSpeed: rememberPlaybackSpeed.checked });
  });
  rememberPanelLayout.addEventListener('change', () => {
    chrome.storage.local.set({ transcriptRememberLayout: rememberPanelLayout.checked });
    if (!rememberPanelLayout.checked) {
      chrome.storage.local.remove(['transcriptPanelGeometry', 'transcriptHeaderCollapsed']);
    }
  });

  // Envía mensaje al tab activo
  async function sendSpeedToActiveTab(rate) {
    if (!extensionEnabled) {
      alert('La extensión está apagada. Enciéndela antes de cambiar la velocidad.');
      return;
    }
    rate = parseFloat(rate);
    if (rate > 16) {
      alert('No puedes usar una velocidad superior a 16×, ya que es el máximo permitido.');
      return;
    }
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


  function setSpeedControls(value, apply = false) {
    const rate = Math.min(16, Math.max(0.1, Number(value) || 1));
    const formatted = Number(rate.toFixed(2));
    speedInput.value = formatted;
    speedSlider.value = formatted;
    presets.forEach((preset) => {
      const selected = Math.abs(Number(preset.dataset.speed) - formatted) < 0.001;
      preset.classList.toggle('is-active', selected);
      preset.setAttribute('aria-pressed', String(selected));
    });
    if (apply) sendSpeedToActiveTab(formatted);
  }

  speedSlider.addEventListener('input', () => setSpeedControls(speedSlider.value));
  speedSlider.addEventListener('change', () => setSpeedControls(speedSlider.value, true));
  speedDown.addEventListener('click', () => setSpeedControls(Number(speedInput.value) - 0.25, true));
  speedUp.addEventListener('click', () => setSpeedControls(Number(speedInput.value) + 0.25, true));

  // Detectar tecla Enter en el campo de velocidad
  speedInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // evita que se envíe el formulario
      setSpeedControls(speedInput.value, true);
    }
  });
  speedInput.addEventListener('change', () => setSpeedControls(speedInput.value, true));

  presets.forEach(btn => {
    btn.addEventListener('click', (e) => {
      setSpeedControls(e.currentTarget.dataset.speed, true);
    });
  });

  // cargar último speed guardado
  chrome.storage.local.get(['lastSpeed'], (res) => {
    setSpeedControls(res.lastSpeed || 1);
  });

  chrome.storage.local.get({ transcriptEnabled: true, transcriptMode: 'full', transcriptGrouping: 'sentences', transcriptPreferredLanguage: 'auto', transcriptAutoOpenNextVideo: true }, (res) => {
    if (res.transcriptGrouping === 'grouped') {
      res.transcriptGrouping = 'sentences';
      chrome.storage.local.set({ transcriptGrouping: 'sentences' });
    }
    transcriptEnabled.checked = res.transcriptEnabled;
    quickTranscriptEnabled.checked = res.transcriptEnabled;
    transcriptMode.value = res.transcriptMode;
    quickTranscriptMode.value = res.transcriptMode;
    transcriptGrouping.value = res.transcriptGrouping;
    quickTranscriptGrouping.value = res.transcriptGrouping;
    transcriptPreferredLanguage.value = res.transcriptPreferredLanguage;
    transcriptAutoOpenNext.checked = res.transcriptAutoOpenNextVideo;
    transcriptMode.disabled = !res.transcriptEnabled;
    transcriptGrouping.disabled = !res.transcriptEnabled;
    updateQuickTranscriptControls();
  });

  transcriptEnabled.addEventListener('change', () => {
    quickTranscriptEnabled.checked = transcriptEnabled.checked;
    updateQuickTranscriptControls();
    transcriptMode.disabled = !transcriptEnabled.checked;
    transcriptGrouping.disabled = !transcriptEnabled.checked;
    chrome.storage.local.set({ transcriptEnabled: transcriptEnabled.checked });
  });

  transcriptMode.addEventListener('change', () => {
    quickTranscriptMode.value = transcriptMode.value;
    chrome.storage.local.set({ transcriptMode: transcriptMode.value });
  });

  transcriptGrouping.addEventListener('change', () => {
    quickTranscriptGrouping.value = transcriptGrouping.value;
    chrome.storage.local.set({ transcriptGrouping: transcriptGrouping.value });
  });
  transcriptPreferredLanguage.addEventListener('change', () => {
    chrome.storage.local.set({ transcriptPreferredLanguage: transcriptPreferredLanguage.value });
  });
  transcriptAutoOpenNext.addEventListener('change', () => {
    chrome.storage.local.set({ transcriptAutoOpenNextVideo: transcriptAutoOpenNext.checked });
  });

  quickTranscriptEnabled.addEventListener('change', () => {
    transcriptEnabled.checked = quickTranscriptEnabled.checked;
    transcriptMode.disabled = !quickTranscriptEnabled.checked;
    transcriptGrouping.disabled = !quickTranscriptEnabled.checked;
    updateQuickTranscriptControls();
    chrome.storage.local.set({ transcriptEnabled: quickTranscriptEnabled.checked });
  });
  quickTranscriptMode.addEventListener('change', () => {
    transcriptMode.value = quickTranscriptMode.value;
    chrome.storage.local.set({ transcriptMode: quickTranscriptMode.value });
  });
  quickTranscriptGrouping.addEventListener('change', () => {
    transcriptGrouping.value = quickTranscriptGrouping.value;
    chrome.storage.local.set({ transcriptGrouping: quickTranscriptGrouping.value });
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
    const modifierCodes = ['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'];
    const shortcut = shortcutFromEvent(event);
    if (modifierCodes.includes(event.code)) {
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
            alert('No puedes asignar una velocidad superior a 16×.');
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
      alert('No puedes asignar una velocidad superior a 16×.');
      return;
    }
    if (!capturedShortcut || (shortcutType.value === 'speed' && (!Number.isFinite(speed) || speed <= 0))) {
      alert(shortcutType.value === 'speed' ? 'Asigna una tecla e introduce una velocidad válida.' : 'Asigna una tecla.');
      return;
    }
    const signature = JSON.stringify(capturedShortcut);
    const sameShortcut = (shortcut) => JSON.stringify({
      code: shortcut.code,
      ctrl: shortcut.ctrl,
      alt: shortcut.alt,
      shift: shortcut.shift,
      meta: shortcut.meta,
      label: shortcut.label,
    }) === signature;
    speedShortcuts = speedShortcuts.filter((shortcut) => !sameShortcut(shortcut));
    pauseShortcuts = pauseShortcuts.filter((shortcut) => !sameShortcut(shortcut));
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

  function updatePauseRewindControls() {
    pauseRewindSeconds.disabled = !pauseRewindEnabled.checked;
    pauseRewindMode.disabled = !pauseRewindEnabled.checked;
  }

  function normalizePauseSeconds(value) {
    return Math.max(0.5, Math.round((Number(value) || 2) * 2) / 2);
  }

  pauseRewindSeconds.min = '0.5';
  quickPauseSeconds.min = '0.5';

  chrome.storage.local.get({
    pauseRewindEnabled: false,
    pauseRewindSeconds: 2,
    pauseRewindMode: 'fixed',
  }, (stored) => {
    pauseRewindEnabled.checked = stored.pauseRewindEnabled;
    quickPauseEnabled.checked = stored.pauseRewindEnabled;
    const normalizedSeconds = normalizePauseSeconds(stored.pauseRewindSeconds);
    pauseRewindSeconds.value = normalizedSeconds;
    quickPauseSeconds.value = normalizedSeconds;
    if (normalizedSeconds !== Number(stored.pauseRewindSeconds)) {
      chrome.storage.local.set({ pauseRewindSeconds: normalizedSeconds });
    }
    pauseRewindMode.value = stored.pauseRewindMode;
    quickPauseMode.value = stored.pauseRewindMode;
    updatePauseRewindControls();
    updateQuickPauseControls();
  });

  pauseRewindEnabled.addEventListener('change', () => {
    quickPauseEnabled.checked = pauseRewindEnabled.checked;
    updateQuickPauseControls();
    updatePauseRewindControls();
    chrome.storage.local.set({ pauseRewindEnabled: pauseRewindEnabled.checked });
  });
  pauseRewindSeconds.addEventListener('change', () => {
    const seconds = normalizePauseSeconds(pauseRewindSeconds.value);
    pauseRewindSeconds.value = seconds;
    quickPauseSeconds.value = seconds;
    chrome.storage.local.set({ pauseRewindSeconds: seconds });
  });
  pauseRewindMode.addEventListener('change', () => {
    quickPauseMode.value = pauseRewindMode.value;
    chrome.storage.local.set({ pauseRewindMode: pauseRewindMode.value });
  });

  quickPauseEnabled.addEventListener('change', () => {
    pauseRewindEnabled.checked = quickPauseEnabled.checked;
    updatePauseRewindControls();
    updateQuickPauseControls();
    chrome.storage.local.set({ pauseRewindEnabled: quickPauseEnabled.checked });
  });
  quickPauseSeconds.addEventListener('change', () => {
    const seconds = normalizePauseSeconds(quickPauseSeconds.value);
    quickPauseSeconds.value = seconds;
    pauseRewindSeconds.value = seconds;
    chrome.storage.local.set({ pauseRewindSeconds: seconds });
  });
  quickPauseMode.addEventListener('change', () => {
    pauseRewindMode.value = quickPauseMode.value;
    chrome.storage.local.set({ pauseRewindMode: quickPauseMode.value });
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
        const edit = document.createElement('button');
        edit.className = 'global-note__edit';
        edit.textContent = 'Editar';
        edit.setAttribute('aria-label', `Editar nota de ${formatNoteTime(item.startMs)}`);
        const remove = document.createElement('button');
        remove.textContent = 'Eliminar';
        remove.addEventListener('click', () => {
          if (!window.confirm('¿Quieres eliminar esta nota? Esta acción no se puede deshacer.')) return;
          chrome.storage.local.set({ ytxSavedNotes: notes.filter((candidate) => candidate.id !== item.id) }, loadGlobalNotes);
        });
        remove.setAttribute('aria-label', `Eliminar nota de ${formatNoteTime(item.startMs)}`);
        const metaActions = document.createElement('div');
        metaActions.className = 'global-note__actions';
        metaActions.append(edit, remove);
        meta.append(time, metaActions);
        const text = document.createElement('div');
        text.className = 'global-note__text';
        text.textContent = item.text || 'Momento guardado';
        card.append(title, meta, text);
        const note = document.createElement('div');
        note.className = 'global-note__note';
        note.textContent = item.note || '';
        if (item.note) {
          card.appendChild(note);
        }
        edit.addEventListener('click', () => {
          if (card.querySelector('.global-note__editor')) return;
          const editor = document.createElement('textarea');
          editor.className = 'global-note__editor';
          editor.value = item.note || '';
          editor.setAttribute('aria-label', 'Editar texto de la nota');
          const actions = document.createElement('div');
          actions.className = 'global-note__editor-actions';
          const cancel = document.createElement('button');
          cancel.className = 'secondary';
          cancel.textContent = 'Cancelar';
          const save = document.createElement('button');
          save.className = 'primary';
          save.textContent = 'Guardar';
          actions.append(cancel, save);
          card.append(editor, actions);
          editor.focus();
          const closeEditor = () => {
            editor.remove();
            actions.remove();
            edit.focus();
          };
          cancel.addEventListener('click', closeEditor);
          save.addEventListener('click', () => {
            const updated = notes.map((candidate) => candidate.id === item.id
              ? { ...candidate, note: editor.value.trim(), updatedAt: new Date().toISOString() }
              : candidate);
            chrome.storage.local.set({ ytxSavedNotes: updated }, loadGlobalNotes);
          });
          editor.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeEditor();
            }
          });
        });
        globalNotesList.appendChild(card);
      });
    });
  }

  globalNotesToggle.addEventListener('click', () => {
    globalNotes.hidden = !globalNotes.hidden;
    globalNotesToggle.setAttribute('aria-expanded', String(!globalNotes.hidden));
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
