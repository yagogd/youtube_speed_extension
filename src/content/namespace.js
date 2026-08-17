(() => {
  "use strict";
  const ytx = globalThis.__YTX || (globalThis.__YTX = {});
  ytx.state = ytx.state || {
    settings: { extensionEnabled: true, enabled: true, mode: "full", grouping: "sentences", preferredLanguage: "auto", favoriteLanguages: ["es", "en"], autoOpenNextVideo: true, rememberLayout: true, displayLeadMs: 1100 },
    dismissedVideoId: null,
    appearance: { background: "#1e1e22", text: "#e4e4e7", font: "Inter, Roboto, Arial, sans-serif", fontSize: 13.5, opacity: 0.84 },
    ui: null,
    transcript: null,
    transcriptTracks: [],
    displayBlocks: [],
    syncTimer: null,
    renderedBlockCount: 0,
    activeBlockIndex: -1,
    autoScrollEnabled: true,
    pendingScrollTop: null,
    search: { query: "", matches: [], currentMatch: -1 },
    savedNotes: [],
  };
  ytx.isWatchPage = () => location.pathname === "/watch" && new URL(location.href).searchParams.has("v");
})();
