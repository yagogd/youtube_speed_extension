(() => {
  "use strict";
  const ytx = globalThis.__YTX || (globalThis.__YTX = {});
  ytx.state = ytx.state || {
    settings: { enabled: true, mode: "full", grouping: "grouped" },
    ui: null,
    transcript: null,
    displayBlocks: [],
    syncTimer: null,
    renderedBlockCount: 0,
    activeBlockIndex: -1,
    autoScrollEnabled: true,
    search: { query: "", matches: [], currentMatch: -1 },
    savedNotes: [],
  };
  ytx.isWatchPage = () => location.pathname === "/watch" && new URL(location.href).searchParams.has("v");
})();
