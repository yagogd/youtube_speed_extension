(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const state = ytx.state;

  function createBlockRow(block, index) {
    const row = document.createElement("div");
    row.className = "ytx-transcript-row";
    row.dataset.blockIndex = String(index);

    const time = document.createElement("button");
    time.type = "button";
    time.className = "ytx-transcript-row__time";
    time.textContent = ytx.formatTime(block.startMs);
    time.title = "Ir a este momento";
    time.setAttribute("aria-label", `Ir al minuto ${ytx.formatTime(block.startMs)}`);
    time.addEventListener("click", () => {
      const video = document.querySelector("video");
      if (video) video.currentTime = block.startMs / 1000;
    });

    const text = document.createElement("span");
    text.className = "ytx-transcript-row__text";
    text.textContent = block.text;
    const actions = ytx.notes.createBlockActions(block, row);
    row.append(time, text, actions);
    return row;
  }

  function setTranscriptTitle() {
    ytx.panel.setTitle(state.transcript?.languageName || "Subtítulos");
    state.ui.copyButton.hidden = false;
  }

  function renderFull() {
    const ui = ytx.panel.ensure();
    const blocks = state.displayBlocks;
    if (!ui || !blocks) return;

    setTranscriptTitle();
    const fragment = document.createDocumentFragment();
    blocks.forEach((block, index) => fragment.appendChild(createBlockRow(block, index)));
    ui.content.replaceChildren(fragment);
    state.activeBlockIndex = -1;
    ytx.search.refresh();
    ytx.notes.refreshMarkers();
    ytx.sync.start(ytx.sync.updateActiveBlock);
  }

  function updateProgressive() {
    const ui = state.ui;
    const blocks = state.displayBlocks;
    const video = document.querySelector("video");
    if (!ui || !blocks || !video || state.settings.mode !== "progressive") return;

    const currentMs = video.currentTime * 1000;
    const nextIndex = blocks.findIndex((block) => block.startMs > currentMs);
    const targetCount = nextIndex === -1 ? blocks.length : nextIndex;

    if (targetCount < state.renderedBlockCount) {
      ui.content.replaceChildren();
      state.renderedBlockCount = 0;
      state.activeBlockIndex = -1;
    }

    if (targetCount !== state.renderedBlockCount) {
      const fragment = document.createDocumentFragment();
      for (let index = state.renderedBlockCount; index < targetCount; index += 1) {
        fragment.appendChild(createBlockRow(blocks[index], index));
      }
      ui.content.appendChild(fragment);
      state.renderedBlockCount = targetCount;
      ytx.search.refresh();
      ytx.notes.refreshMarkers();
      if (state.autoScrollEnabled) ui.content.scrollTop = ui.content.scrollHeight;
    }
    ytx.sync.updateActiveBlock();
  }

  function renderProgressive() {
    const ui = ytx.panel.ensure();
    if (!ui || !state.displayBlocks) return;
    setTranscriptTitle();
    ui.content.replaceChildren();
    state.renderedBlockCount = 0;
    state.activeBlockIndex = -1;
    ytx.search.refresh();
    ytx.sync.start(updateProgressive);
  }

  function renderCurrentMode() {
    if (!state.transcript) return;
    state.displayBlocks = globalThis.YTXTranscriptParser.blocksForMode(
      state.transcript.cues || [],
      state.settings.grouping,
    );
    if (state.settings.mode === "progressive") renderProgressive();
    else renderFull();
  }

  ytx.renderer = { renderCurrentMode, updateProgressive };
})();
