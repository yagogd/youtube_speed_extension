(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const state = ytx.state;

  function normalizeSearchText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("es");
  }

  function findMatchRanges(text, rawQuery) {
    const query = normalizeSearchText(rawQuery);
    if (!query) return [];

    let normalized = "";
    const indexMap = [];
    let originalOffset = 0;
    for (const character of String(text || "")) {
      const normalizedCharacter = normalizeSearchText(character);
      for (const normalizedPart of normalizedCharacter) {
        normalized += normalizedPart;
        indexMap.push({ start: originalOffset, end: originalOffset + character.length });
      }
      originalOffset += character.length;
    }

    const ranges = [];
    let searchFrom = 0;
    while (searchFrom <= normalized.length - query.length) {
      const matchIndex = normalized.indexOf(query, searchFrom);
      if (matchIndex === -1) break;
      const first = indexMap[matchIndex];
      const last = indexMap[matchIndex + query.length - 1];
      if (first && last) ranges.push({ start: first.start, end: last.end });
      searchFrom = matchIndex + query.length;
    }
    return ranges;
  }

  function renderTextHighlights(textElement, text, query) {
    const ranges = findMatchRanges(text, query);
    if (!ranges.length) {
      textElement.textContent = text;
      return;
    }

    const fragment = document.createDocumentFragment();
    let offset = 0;
    ranges.forEach((range) => {
      if (range.start > offset) fragment.appendChild(document.createTextNode(text.slice(offset, range.start)));
      const mark = document.createElement("mark");
      mark.className = "ytx-search-highlight";
      mark.textContent = text.slice(range.start, range.end);
      fragment.appendChild(mark);
      offset = range.end;
    });
    if (offset < text.length) fragment.appendChild(document.createTextNode(text.slice(offset)));
    textElement.replaceChildren(fragment);
  }

  function updateCounter() {
    if (!state.ui?.searchCounter) return;
    const total = state.search.matches.length;
    state.ui.searchCounter.textContent = total
      ? `${state.search.currentMatch + 1}/${total}`
      : "0/0";
  }

  function applyMatchClasses() {
    const content = state.ui?.content;
    if (!content) return;
    content.querySelectorAll(".ytx-transcript-row--match, .ytx-transcript-row--current-match")
      .forEach((row) => row.classList.remove("ytx-transcript-row--match", "ytx-transcript-row--current-match"));

    content.querySelectorAll("[data-block-index]").forEach((row) => {
      const block = state.displayBlocks[Number(row.dataset.blockIndex)];
      const textElement = row.querySelector(".ytx-transcript-row__text");
      if (block && textElement) renderTextHighlights(textElement, block.text, state.search.query);
    });

    state.search.matches.forEach((blockIndex, matchIndex) => {
      const row = content.querySelector(`[data-block-index="${blockIndex}"]`);
      row?.classList.add("ytx-transcript-row--match");
      if (matchIndex === state.search.currentMatch) row?.classList.add("ytx-transcript-row--current-match");
    });
  }

  function refresh(resetPosition = false) {
    const query = normalizeSearchText(state.search.query);
    const previousBlockIndex = state.search.matches[state.search.currentMatch];
    state.search.matches = query
      ? state.displayBlocks.reduce((matches, block, index) => {
        if (normalizeSearchText(block.text).includes(query)) matches.push(index);
        return matches;
      }, [])
      : [];

    if (!state.search.matches.length) {
      state.search.currentMatch = -1;
    } else if (resetPosition) {
      state.search.currentMatch = 0;
    } else {
      const preserved = state.search.matches.indexOf(previousBlockIndex);
      state.search.currentMatch = preserved >= 0 ? preserved : Math.min(Math.max(state.search.currentMatch, 0), state.search.matches.length - 1);
    }
    updateCounter();
    applyMatchClasses();
  }

  function focusCurrentMatch() {
    const blockIndex = state.search.matches[state.search.currentMatch];
    const block = state.displayBlocks[blockIndex];
    if (!block) return;

    state.autoScrollEnabled = false;
    const video = document.querySelector("video");
    if (video) video.currentTime = block.startMs / 1000;

    setTimeout(() => {
      applyMatchClasses();
      state.ui?.content.querySelector(`[data-block-index="${blockIndex}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, state.settings.mode === "progressive" ? 350 : 0);
  }

  function move(direction) {
    if (!state.search.matches.length) return;
    state.search.currentMatch = (
      state.search.currentMatch + direction + state.search.matches.length
    ) % state.search.matches.length;
    updateCounter();
    focusCurrentMatch();
  }

  function attach(ui) {
    const onInput = () => {
      state.search.query = ui.searchInput.value;
      refresh(true);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      move(event.shiftKey ? -1 : 1);
    };
    const onPrevious = () => move(-1);
    const onNext = () => move(1);
    const onClose = () => {
      ui.panel.classList.remove("ytx-panel--search-open");
      ui.searchInput.value = "";
      state.search.query = "";
      refresh(true);
    };
    const onToggle = () => {
      ui.panel.classList.toggle("ytx-panel--search-open");
      if (ui.panel.classList.contains("ytx-panel--search-open")) {
        ui.searchInput.focus();
        ui.searchInput.select();
      }
    };

    ui.searchInput.addEventListener("input", onInput);
    ui.searchInput.addEventListener("keydown", onKeyDown);
    ui.searchPrevious.addEventListener("click", onPrevious);
    ui.searchNext.addEventListener("click", onNext);
    ui.searchClose.addEventListener("click", onClose);
    ui.searchToggle.addEventListener("click", onToggle);
    return () => {
      ui.searchInput.removeEventListener("input", onInput);
      ui.searchInput.removeEventListener("keydown", onKeyDown);
      ui.searchPrevious.removeEventListener("click", onPrevious);
      ui.searchNext.removeEventListener("click", onNext);
      ui.searchClose.removeEventListener("click", onClose);
      ui.searchToggle.removeEventListener("click", onToggle);
    };
  }

  ytx.search = { attach, refresh, move, normalizeSearchText, findMatchRanges };
})();
