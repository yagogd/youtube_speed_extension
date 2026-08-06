(function exposeTranscriptParser(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.YTXTranscriptParser = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createTranscriptParser() {
  "use strict";

  const DEFAULT_GROUPING_OPTIONS = Object.freeze({
    maxGapMs: 1000,
    minBlockCharacters: 45,
    splitOnSentence: true,
  });

  function normalizeText(value) {
    return String(value || "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  }

  function eventText(event) {
    if (!Array.isArray(event?.segs)) return "";
    return normalizeText(event.segs.map((segment) => segment?.utf8 || "").join(""));
  }

  function normalizeJson3Events(subtitles) {
    const cues = [];
    const events = Array.isArray(subtitles?.events) ? subtitles.events : [];

    for (const event of events) {
      const text = eventText(event);
      if (!text) continue;

      const startMs = Math.max(0, Number(event?.tStartMs) || 0);
      const durationMs = Math.max(0, Number(event?.dDurationMs) || 0);
      const endMs = startMs + durationMs;
      const cue = { startMs, durationMs, endMs, text };
      const previous = cues[cues.length - 1];

      // Los subtítulos automáticos pueden repetir o ampliar un evento mientras hablan.
      // Solo fusionamos duplicados evidentes que se solapan para no borrar repeticiones reales.
      if (previous && startMs <= previous.endMs) {
        if (text === previous.text) {
          previous.endMs = Math.max(previous.endMs, endMs);
          previous.durationMs = previous.endMs - previous.startMs;
          continue;
        }
        if (text.startsWith(previous.text) && startMs === previous.startMs) {
          previous.text = text;
          previous.endMs = Math.max(previous.endMs, endMs);
          previous.durationMs = previous.endMs - previous.startMs;
          continue;
        }
      }

      cues.push(cue);
    }

    return cues;
  }

  function endsSentence(text) {
    return /[.!?]["'”’)]?$/.test(text);
  }

  function groupCuesIntoBlocks(cues, options = {}) {
    const config = { ...DEFAULT_GROUPING_OPTIONS, ...options };
    const blocks = [];
    let current = null;

    const finishCurrent = () => {
      if (!current) return;
      current.text = normalizeText(current.text);
      blocks.push(current);
      current = null;
    };

    cues.forEach((cue, index) => {
      if (!cue?.text) return;
      if (!current) {
        current = {
          startMs: cue.startMs,
          endMs: cue.endMs,
          text: cue.text,
          cueStartIndex: index,
          cueEndIndex: index,
        };
        return;
      }

      const gapMs = Math.max(0, cue.startMs - current.endMs);
      const punctuationBoundary = config.splitOnSentence &&
        endsSentence(current.text) &&
        current.text.length >= config.minBlockCharacters;
      const shouldSplit = gapMs > config.maxGapMs ||
        punctuationBoundary;

      if (shouldSplit) {
        finishCurrent();
        current = {
          startMs: cue.startMs,
          endMs: cue.endMs,
          text: cue.text,
          cueStartIndex: index,
          cueEndIndex: index,
        };
        return;
      }

      current.text = `${current.text} ${cue.text}`;
      current.endMs = Math.max(current.endMs, cue.endMs);
      current.cueEndIndex = index;
    });

    finishCurrent();
    return blocks;
  }

  function originalCuesAsBlocks(cues) {
    return cues.map((cue, index) => ({
      startMs: cue.startMs,
      endMs: cue.endMs,
      text: cue.text,
      cueStartIndex: index,
      cueEndIndex: index,
    }));
  }

  function groupCuesBySentences(cues, options = {}) {
    const maxGapMs = options.maxGapMs ?? DEFAULT_GROUPING_OPTIONS.maxGapMs;
    const blocks = [];
    let current = null;

    const finishCurrent = () => {
      if (!current) return;
      current.text = normalizeText(current.text);
      blocks.push(current);
      current = null;
    };

    cues.forEach((cue, cueIndex) => {
      if (!cue?.text) return;
      if (current && cue.startMs - current.endMs > maxGapMs) finishCurrent();

      const matches = Array.from(cue.text.matchAll(/[^.!?]+(?:[.!?]+["'”’\])}]*|$)/g));
      const parts = matches.length ? matches : [{ 0: cue.text, index: 0 }];
      const textLength = Math.max(1, cue.text.length);
      const duration = Math.max(0, cue.endMs - cue.startMs);

      parts.forEach((match, partIndex) => {
        const text = normalizeText(match[0]);
        if (!text) return;
        const startOffset = Number(match.index) || 0;
        const endOffset = partIndex === parts.length - 1 ? textLength : startOffset + match[0].length;
        const partStartMs = cue.startMs + Math.round(duration * startOffset / textLength);
        const partEndMs = cue.startMs + Math.round(duration * endOffset / textLength);

        if (!current) {
          current = {
            startMs: partStartMs,
            endMs: partEndMs,
            text,
            cueStartIndex: cueIndex,
            cueEndIndex: cueIndex,
          };
        } else {
          current.text = `${current.text} ${text}`;
          current.endMs = Math.max(current.endMs, partEndMs);
          current.cueEndIndex = cueIndex;
        }

        const nextPartText = partIndex < parts.length - 1
          ? normalizeText(parts[partIndex + 1][0])
          : normalizeText(cues[cueIndex + 1]?.text);
        const nextPartStartMs = partIndex < parts.length - 1
          ? partEndMs
          : cues[cueIndex + 1]?.startMs;
        const continuesQuestionSeries = /\?["'”’\])}]*$/.test(text) &&
          nextPartText.startsWith("¿") &&
          Number.isFinite(nextPartStartMs) &&
          nextPartStartMs - partEndMs <= maxGapMs;

        if (endsSentence(text) && !continuesQuestionSeries) finishCurrent();
      });
    });

    finishCurrent();
    return blocks;
  }

  function blocksForMode(cues, mode = "grouped") {
    if (mode === "original") return originalCuesAsBlocks(cues);
    if (mode === "sentences") return groupCuesBySentences(cues);
    return groupCuesIntoBlocks(cues);
  }

  function parseJson3(subtitles, options) {
    const cues = normalizeJson3Events(subtitles);
    return { cues, blocks: groupCuesIntoBlocks(cues, options) };
  }

  return {
    DEFAULT_GROUPING_OPTIONS,
    normalizeText,
    normalizeJson3Events,
    groupCuesIntoBlocks,
    groupCuesBySentences,
    originalCuesAsBlocks,
    blocksForMode,
    parseJson3,
  };
});
