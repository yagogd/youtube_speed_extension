(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const state = ytx.state;

  function baseLanguageName(value) {
    return String(value || "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  }

  function normalizeLanguage(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
  }

  const spanishLanguageNames = new Intl.DisplayNames(["es"], { type: "language" });
  const englishLanguageNames = new Intl.DisplayNames(["en"], { type: "language" });

  function languageAliases(track) {
    const code = String(track.languageCode || "");
    const baseCode = code.split("-")[0];
    const aliases = [code, baseCode, baseLanguageName(track.languageName)];
    [code, baseCode].forEach((candidate) => {
      try {
        aliases.push(spanishLanguageNames.of(candidate), englishLanguageNames.of(candidate));
      } catch (_) { /* Un código desconocido se compara con los datos originales. */ }
    });
    return new Set(aliases.filter(Boolean).map(normalizeLanguage));
  }

  function trackMatchesFavorite(track, favoriteLanguage) {
    const favorite = normalizeLanguage(favoriteLanguage);
    if (!favorite) return false;
    return [...languageAliases(track)].some((alias) => alias === favorite || alias.startsWith(`${favorite}-`));
  }

  function createView() {
    const trackSelector = document.createElement("div");
    trackSelector.className = "ytx-track-selector";
    trackSelector.hidden = true;
    const trackLabel = document.createElement("label");
    trackLabel.htmlFor = "ytx-transcript-track";
    trackLabel.textContent = "Pista";
    const trackSelect = document.createElement("input");
    trackSelect.id = "ytx-transcript-track";
    trackSelect.type = "search";
    trackSelect.autocomplete = "off";
    trackSelect.name = `ytx-language-search-${chrome.runtime.id}`;
    trackSelect.spellcheck = false;
    trackSelect.placeholder = "Idioma…";
    trackSelect.setAttribute("aria-label", "Pista de subtítulos");
    trackSelect.setAttribute("aria-haspopup", "listbox");
    trackSelect.setAttribute("aria-expanded", "false");
    const trackDatalist = document.createElement("datalist");
    trackDatalist.id = "ytx-transcript-track-options";
    const trackMenu = document.createElement("div");
    trackMenu.className = "ytx-track-selector__menu";
    trackMenu.setAttribute("role", "listbox");
    trackMenu.hidden = true;
    trackSelector.append(trackLabel, trackSelect, trackDatalist, trackMenu);
    return { trackSelector, trackSelect, trackDatalist, trackMenu };
  }

  function update(ui = state.ui) {
    if (!ui?.trackSelect || !ui.trackDatalist || !ui.trackMenu) return;
    const tracks = Array.isArray(state.transcriptTracks) ? state.transcriptTracks : [];
    const trackPriority = (track) => track.isTranslated ? 2 : track.isAutomatic ? 1 : 0;
    const tracksByLanguage = new Map();
    tracks.forEach((track) => {
      const key = String(track.languageCode || track.languageName).toLocaleLowerCase();
      const current = tracksByLanguage.get(key);
      if (!current || trackPriority(track) < trackPriority(current)) tracksByLanguage.set(key, track);
    });
    const selectableTracks = Array.from(tracksByLanguage.values());
    const favoriteLanguages = Array.isArray(state.settings.favoriteLanguages) ? state.settings.favoriteLanguages : ["es", "en"];
    const languageIsFavorite = (track) => favoriteLanguages.some((language) => trackMatchesFavorite(track, language));
    const favoriteIndex = (track) => favoriteLanguages.findIndex((language) => trackMatchesFavorite(track, language));
    const favoriteTracks = selectableTracks.filter(languageIsFavorite)
      .sort((left, right) => favoriteIndex(left) - favoriteIndex(right));
    const regularTracks = selectableTracks.filter((track) => !languageIsFavorite(track));
    const orderedTracks = [...favoriteTracks, ...regularTracks];
    ui.trackDatalist.replaceChildren();
    ui.trackMenu.replaceChildren();
    if (!tracks.length) {
      ui.trackSelect.value = state.transcript?.languageName
        ? baseLanguageName(state.transcript.languageName)
        : (ui.title.dataset.fullTitle || "Cargando subtítulos…");
    }
    orderedTracks.forEach((track, index) => {
      if (index === favoriteTracks.length && favoriteTracks.length && regularTracks.length) {
        const separator = document.createElement("div");
        separator.className = "ytx-track-selector__separator";
        separator.setAttribute("role", "separator");
        ui.trackMenu.appendChild(separator);
      }
      const option = document.createElement("option");
      option.value = baseLanguageName(track.languageName) || track.languageCode;
      option.dataset.trackId = track.id;
      ui.trackDatalist.appendChild(option);
      const menuOption = document.createElement("button");
      menuOption.type = "button";
      menuOption.className = "ytx-track-selector__option";
      menuOption.dataset.trackId = track.id;
      menuOption.dataset.value = option.value;
      menuOption.setAttribute("role", "option");
      menuOption.classList.toggle("ytx-track-selector__option--favorite", languageIsFavorite(track));
      menuOption.textContent = option.value;
      ui.trackMenu.appendChild(menuOption);
    });
    ui.trackSelector.hidden = false;
    ui.trackSelect.disabled = selectableTracks.length < 2;
    if (selectableTracks.length) {
      const selected = selectableTracks.find((track) => track.id === state.transcript?.selectedTrackId) ||
        selectableTracks.find((track) => track.languageCode === state.transcript?.languageCode) || selectableTracks[0];
      ui.trackSelect.value = baseLanguageName(selected.languageName) || selected.languageCode;
      ui.trackSelect.dataset.selectedTrackId = selected.id;
    }
  }

  function attach(ui) {
    const { trackSelector, trackSelect, trackDatalist, trackMenu } = ui;
    const selectTrack = (trackId, value) => {
      const option = Array.from(trackDatalist.options).find((candidate) => candidate.dataset.trackId === trackId);
      if (!option?.dataset.trackId) {
        const current = Array.from(trackDatalist.options).find((candidate) => candidate.dataset.trackId === trackSelect.dataset.selectedTrackId);
        if (current) trackSelect.value = current.value;
        return;
      }
      trackSelect.value = value || option.value;
      trackSelect.dataset.selectedTrackId = option.dataset.trackId;
      trackMenu.hidden = true;
      trackSelect.setAttribute("aria-expanded", "false");
      window.postMessage({
        source: "YT_TRANSCRIPT_CONTROL", enabled: true,
        preferredLanguage: state.settings.preferredLanguage || "auto",
        selectTrackId: option.dataset.trackId,
      }, "*");
    };
    const onTrackChange = () => {
      const option = Array.from(trackDatalist.options).find((candidate) => candidate.value === trackSelect.value);
      selectTrack(option?.dataset.trackId, option?.value);
    };
    const onTrackFocus = () => trackSelect.select();
    const openTrackMenu = () => {
      trackMenu.querySelectorAll(".ytx-track-selector__option").forEach((option) => { option.hidden = false; });
      trackMenu.querySelector(".ytx-track-selector__separator")?.removeAttribute("hidden");
      trackMenu.hidden = false;
      trackSelect.setAttribute("aria-expanded", "true");
    };
    const onTrackClick = () => {
      chrome.storage.local.get({ transcriptFavoriteLanguages: ["es", "en"] }, (stored) => {
        const latestFavorites = Array.isArray(stored.transcriptFavoriteLanguages)
          ? stored.transcriptFavoriteLanguages : ["es", "en"];
        state.settings.favoriteLanguages = latestFavorites;
        update(ui);
        openTrackMenu();
      });
    };
    const onTrackInput = () => {
      const query = trackSelect.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
      trackMenu.querySelectorAll(".ytx-track-selector__option").forEach((option) => {
        const value = option.dataset.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
        option.hidden = Boolean(query) && !value.includes(query);
      });
      const visibleFavorites = trackMenu.querySelector(".ytx-track-selector__option--favorite:not([hidden])");
      const visibleRegular = trackMenu.querySelector(".ytx-track-selector__option:not(.ytx-track-selector__option--favorite):not([hidden])");
      trackMenu.querySelector(".ytx-track-selector__separator")?.toggleAttribute("hidden", !(visibleFavorites && visibleRegular));
      trackMenu.hidden = false;
      trackSelect.setAttribute("aria-expanded", "true");
    };
    const onTrackMenuClick = (event) => {
      const option = event.target.closest(".ytx-track-selector__option");
      if (option) selectTrack(option.dataset.trackId, option.dataset.value);
    };
    const onOutsideTrackClick = (event) => {
      if (trackSelector.contains(event.target)) return;
      trackMenu.hidden = true;
      trackSelect.setAttribute("aria-expanded", "false");
    };
    trackSelect.addEventListener("change", onTrackChange);
    trackSelect.addEventListener("focus", onTrackFocus);
    trackSelect.addEventListener("click", onTrackClick);
    trackSelect.addEventListener("input", onTrackInput);
    trackMenu.addEventListener("click", onTrackMenuClick);
    document.addEventListener("pointerdown", onOutsideTrackClick, true);
    return () => {
      trackSelect.removeEventListener("change", onTrackChange);
      trackSelect.removeEventListener("focus", onTrackFocus);
      trackSelect.removeEventListener("click", onTrackClick);
      trackSelect.removeEventListener("input", onTrackInput);
      trackMenu.removeEventListener("click", onTrackMenuClick);
      document.removeEventListener("pointerdown", onOutsideTrackClick, true);
    };
  }

  ytx.trackSelector = { createView, update, attach, baseLanguageName };
})();
