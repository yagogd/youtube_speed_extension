"use strict";

import { languageCatalog, normalizeLanguageSearch } from "./languages.js";

export function initTranscriptSettings() {
    const enabled = document.getElementById("transcript-enabled");
    const mode = document.getElementById("transcript-mode");
    const grouping = document.getElementById("transcript-grouping");
    const preferredLanguage = document.getElementById("transcript-preferred-language");
    const favoriteLanguages = document.getElementById("transcript-favorite-languages");
    const favoriteLanguageAddRow = document.createElement("div");
    favoriteLanguageAddRow.className = "favorite-languages__add";
    const favoriteLanguageInput = document.createElement("input");
    favoriteLanguageInput.type = "text";
    favoriteLanguageInput.autocomplete = "off";
    favoriteLanguageInput.placeholder = "Idioma o código (ej. Chino, zh)";
    const favoriteLanguageAdd = document.createElement("button");
    favoriteLanguageAdd.type = "button";
    favoriteLanguageAdd.textContent = "Añadir";
    const favoriteLanguageMenu = document.createElement("div");
    favoriteLanguageMenu.className = "favorite-languages__menu";
    favoriteLanguageMenu.setAttribute("role", "listbox");
    favoriteLanguageMenu.hidden = true;
    favoriteLanguageAddRow.append(favoriteLanguageInput, favoriteLanguageAdd, favoriteLanguageMenu);
    favoriteLanguages.after(favoriteLanguageAddRow);
    const autoOpenNext = document.getElementById("transcript-auto-open-next");
    const quickEnabled = document.getElementById("quick-transcript-enabled");
    const quickMode = document.getElementById("quick-transcript-mode");
    const quickGrouping = document.getElementById("quick-transcript-grouping");

    chrome.storage.local.get({
      transcriptEnabled: true,
      transcriptMode: "full",
      transcriptGrouping: "sentences",
      transcriptPreferredLanguage: "auto",
      transcriptFavoriteLanguages: ["es", "en"],
      transcriptFavoriteLanguageChoices: null,
      transcriptAutoOpenNextVideo: true,
    }, (stored) => {
      if (stored.transcriptGrouping === "grouped") {
        stored.transcriptGrouping = "sentences";
        chrome.storage.local.set({ transcriptGrouping: "sentences" });
      }
      enabled.checked = stored.transcriptEnabled;
      quickEnabled.checked = stored.transcriptEnabled;
      mode.value = stored.transcriptMode;
      quickMode.value = stored.transcriptMode;
      grouping.value = stored.transcriptGrouping;
      quickGrouping.value = stored.transcriptGrouping;
      preferredLanguage.value = stored.transcriptPreferredLanguage;
      let selectedFavorites = Array.isArray(stored.transcriptFavoriteLanguages)
        ? stored.transcriptFavoriteLanguages : ["es", "en"];
      let favoriteChoices = Array.isArray(stored.transcriptFavoriteLanguageChoices)
        ? stored.transcriptFavoriteLanguageChoices : [...new Set(selectedFavorites.length ? selectedFavorites : ["es", "en"])];
      const displayNames = { es: "Español", en: "Inglés" };
      const normalized = normalizeLanguageSearch;
      let selectedSuggestion = null;
      const catalog = () => languageCatalog(globalThis.YTXI18n?.getLanguage());
      const languageName = (value) => catalog().find((language) => normalized(language.code) === normalized(value))?.name || value;
      const saveFavorites = () => chrome.storage.local.set({
        transcriptFavoriteLanguages: selectedFavorites,
        transcriptFavoriteLanguageChoices: favoriteChoices,
      });
      const renderFavorites = () => {
        favoriteLanguages.replaceChildren();
        favoriteChoices.forEach((language) => {
          const item = document.createElement("div");
          item.className = "favorite-languages__item";
          const label = document.createElement("label");
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = selectedFavorites.some((value) => normalized(value) === normalized(language));
          checkbox.addEventListener("change", () => {
            selectedFavorites = checkbox.checked
              ? [...selectedFavorites.filter((value) => normalized(value) !== normalized(language)), language]
              : selectedFavorites.filter((value) => normalized(value) !== normalized(language));
            saveFavorites();
          });
          const name = document.createElement("span");
          name.textContent = languageName(language) || displayNames[normalized(language)] || language;
          name.dataset.i18nSkip = "";
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "favorite-languages__remove";
          remove.textContent = "×";
          remove.setAttribute("aria-label", `Eliminar ${name.textContent}`);
          remove.addEventListener("click", () => {
            favoriteChoices = favoriteChoices.filter((value) => normalized(value) !== normalized(language));
            selectedFavorites = selectedFavorites.filter((value) => normalized(value) !== normalized(language));
            saveFavorites();
            renderFavorites();
          });
          label.append(checkbox, name);
          item.append(label, remove);
          favoriteLanguages.appendChild(item);
        });
      };
      const addFavorite = () => {
        const language = selectedSuggestion?.code;
        if (!language || favoriteChoices.some((value) => normalized(value) === normalized(language))) return;
        favoriteChoices.push(language);
        selectedFavorites.push(language);
        favoriteLanguageInput.value = "";
        selectedSuggestion = null;
        favoriteLanguageMenu.hidden = true;
        saveFavorites();
        renderFavorites();
      };
      const showSuggestions = () => {
        const query = normalized(favoriteLanguageInput.value);
        const matches = catalog().filter((language) => !query || language.search.includes(query)).slice(0, 12);
        favoriteLanguageMenu.replaceChildren();
        selectedSuggestion = null;
        matches.forEach((language, index) => {
          const option = document.createElement("button");
          option.type = "button";
          option.className = "favorite-languages__option";
          option.setAttribute("role", "option");
          option.dataset.code = language.code;
          const name = document.createElement("span");
          name.textContent = language.name;
          const code = document.createElement("small");
          code.textContent = language.code;
          option.append(name, code);
          option.addEventListener("pointerdown", (event) => event.preventDefault());
          option.addEventListener("click", () => {
            selectedSuggestion = language;
            favoriteLanguageInput.value = language.name;
            favoriteLanguageMenu.hidden = true;
            favoriteLanguageInput.focus();
          });
          favoriteLanguageMenu.appendChild(option);
          if (index === 0) selectedSuggestion = language;
        });
        favoriteLanguageMenu.hidden = !matches.length;
      };
      favoriteLanguageAdd.addEventListener("click", addFavorite);
      favoriteLanguageInput.addEventListener("focus", showSuggestions);
      favoriteLanguageInput.addEventListener("input", showSuggestions);
      favoriteLanguageInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          favoriteLanguageMenu.hidden = true;
          return;
        }
        if (event.key !== "Enter") return;
        event.preventDefault();
        addFavorite();
      });
      favoriteLanguageInput.addEventListener("blur", () => setTimeout(() => { favoriteLanguageMenu.hidden = true; }, 0));
      renderFavorites();
      autoOpenNext.checked = stored.transcriptAutoOpenNextVideo;
    });

    enabled.addEventListener("change", () => {
      quickEnabled.checked = enabled.checked;
      chrome.storage.local.set({ transcriptEnabled: enabled.checked });
    });
    mode.addEventListener("change", () => {
      quickMode.value = mode.value;
      chrome.storage.local.set({ transcriptMode: mode.value });
    });
    grouping.addEventListener("change", () => {
      quickGrouping.value = grouping.value;
      chrome.storage.local.set({ transcriptGrouping: grouping.value });
    });
    preferredLanguage.addEventListener("change", () => {
      chrome.storage.local.set({ transcriptPreferredLanguage: preferredLanguage.value });
    });
    autoOpenNext.addEventListener("change", () => {
      chrome.storage.local.set({ transcriptAutoOpenNextVideo: autoOpenNext.checked });
    });
    quickEnabled.addEventListener("change", () => {
      enabled.checked = quickEnabled.checked;
      chrome.storage.local.set({ transcriptEnabled: quickEnabled.checked });
    });
    quickMode.addEventListener("change", () => {
      mode.value = quickMode.value;
      chrome.storage.local.set({ transcriptMode: quickMode.value });
    });
    quickGrouping.addEventListener("change", () => {
      grouping.value = quickGrouping.value;
      chrome.storage.local.set({ transcriptGrouping: quickGrouping.value });
    });
  }
