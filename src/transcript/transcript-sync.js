(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const state = ytx.state;

  function updateActiveBlock() {
    const blocks = state.displayBlocks;
    const ui = state.ui;
    const video = document.querySelector("video");
    if (!blocks?.length || !ui || !video) return;

    const currentMs = video.currentTime * 1000;
    const nextIndex = blocks.findIndex((block) => block.startMs <= currentMs && currentMs < block.endMs);
    if (nextIndex === state.activeBlockIndex) return;

    ui.content.querySelector(`[data-block-index="${state.activeBlockIndex}"]`)
      ?.classList.remove("ytx-transcript-row--active");
    state.activeBlockIndex = nextIndex;
    ui.content.querySelector(`[data-block-index="${state.activeBlockIndex}"]`)
      ?.classList.add("ytx-transcript-row--active");
  }

  function start(tick) {
    stop();
    tick();
    state.syncTimer = setInterval(tick, 300);
  }

  function stop() {
    if (state.syncTimer) clearInterval(state.syncTimer);
    state.syncTimer = null;
  }

  ytx.sync = { updateActiveBlock, start, stop };
})();
