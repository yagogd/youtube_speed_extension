(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const state = ytx.state;

  function updateActiveBlock() {
    const blocks = state.displayBlocks;
    const ui = state.ui;
    const video = document.querySelector("video");
    if (!blocks?.length || !ui || !video) return;

    const currentMs = video.currentTime * 1000 + (ytx.CAPTION_DISPLAY_LEAD_MS || 0);
    let nextIndex = -1;
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      const block = blocks[index];
      if (block.startMs <= currentMs && currentMs < block.endMs) {
        nextIndex = index;
        break;
      }
    }
    if (nextIndex === state.activeBlockIndex) return;

    ui.content.querySelector(`[data-block-index="${state.activeBlockIndex}"]`)
      ?.classList.remove("ytx-transcript-row--active");
    state.activeBlockIndex = nextIndex;
    ui.content.querySelector(`[data-block-index="${state.activeBlockIndex}"]`)
      ?.classList.add("ytx-transcript-row--active");
  }

  function start(tick) {
    stop();
    const update = () => {
      tick();
      state.syncTimer = requestAnimationFrame(update);
    };
    update();
  }

  function stop() {
    if (state.syncTimer) cancelAnimationFrame(state.syncTimer);
    state.syncTimer = null;
  }

  ytx.sync = { updateActiveBlock, start, stop };
})();
