(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const state = ytx.state;
  let syncedVideo = null;
  let seekHandler = null;

  function scrollRowIntoView(row) {
    const content = state.ui?.content;
    if (!row || !content || !state.autoScrollEnabled) return;
    const contentRect = content.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const padding = Math.min(28, content.clientHeight * 0.12);
    let nextScrollTop = content.scrollTop;
    if (rowRect.top < contentRect.top + padding) {
      nextScrollTop += rowRect.top - contentRect.top - padding;
    } else if (rowRect.bottom > contentRect.bottom - padding) {
      nextScrollTop += rowRect.bottom - contentRect.bottom + padding;
    }
    if (Math.abs(nextScrollTop - content.scrollTop) < 1) return;
    state.autoScrollInProgress = true;
    content.scrollTop = nextScrollTop;
    requestAnimationFrame(() => { state.autoScrollInProgress = false; });
  }

  function updateActiveBlock() {
    const blocks = state.displayBlocks;
    const ui = state.ui;
    const video = document.querySelector("video");
    if (!blocks?.length || !ui || !video) return;

    const currentMs = video.currentTime * 1000 + (Number(state.settings.displayLeadMs) || 0);
    let nextIndex = -1;
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      const block = blocks[index];
      if (block.startMs <= currentMs && currentMs < block.endMs) {
        nextIndex = index;
        break;
      }
    }
    if (nextIndex === -1) {
      nextIndex = blocks.findLastIndex((block) => block.startMs <= currentMs);
    }
    if (nextIndex === state.activeBlockIndex) return;

    ui.content.querySelector(`[data-block-index="${state.activeBlockIndex}"]`)
      ?.classList.remove("ytx-transcript-row--active");
    state.activeBlockIndex = nextIndex;
    const activeRow = ui.content.querySelector(`[data-block-index="${state.activeBlockIndex}"]`);
    activeRow?.classList.add("ytx-transcript-row--active");
    scrollRowIntoView(activeRow);
  }

  function start(tick) {
    stop();
    syncedVideo = document.querySelector("video");
    if (syncedVideo) {
      seekHandler = () => {
        state.autoScrollEnabled = true;
        state.autoScrollInProgress = true;
        tick();
        requestAnimationFrame(() => {
          tick();
          const activeRow = state.ui?.content.querySelector(`[data-block-index="${state.activeBlockIndex}"]`);
          scrollRowIntoView(activeRow);
          requestAnimationFrame(() => { state.autoScrollInProgress = false; });
        });
      };
      syncedVideo.addEventListener("seeked", seekHandler);
    }
    const update = () => {
      tick();
      state.syncTimer = requestAnimationFrame(update);
    };
    update();
  }

  function stop() {
    if (state.syncTimer) cancelAnimationFrame(state.syncTimer);
    state.syncTimer = null;
    if (syncedVideo && seekHandler) syncedVideo.removeEventListener("seeked", seekHandler);
    syncedVideo = null;
    seekHandler = null;
  }

  ytx.sync = { updateActiveBlock, start, stop, scrollRowIntoView };
})();
