"use strict";

export function initTranscriptSettings() {
    const enabled = document.getElementById("transcript-enabled");
    const mode = document.getElementById("transcript-mode");
    const grouping = document.getElementById("transcript-grouping");
    const preferredLanguage = document.getElementById("transcript-preferred-language");
    const autoOpenNext = document.getElementById("transcript-auto-open-next");
    const quickEnabled = document.getElementById("quick-transcript-enabled");
    const quickMode = document.getElementById("quick-transcript-mode");
    const quickGrouping = document.getElementById("quick-transcript-grouping");

    chrome.storage.local.get({
      transcriptEnabled: true,
      transcriptMode: "full",
      transcriptGrouping: "sentences",
      transcriptPreferredLanguage: "auto",
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
