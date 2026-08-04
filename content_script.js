console.log("YouTube Speed Setter content script loaded");

(function() {
  console.log("Script ejecutándose...");

  function setVideoRate(rate) {
    const video = document.querySelector('video');
    if (video) {
      video.playbackRate = rate;
      console.log('🎬 Velocidad del video establecida en', rate);
    } else {
      console.warn('⚠️ No se encontró ningún elemento <video>');
    }
  }

  // Escucha los mensajes enviados desde popup.js
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'set-speed') {
      setVideoRate(msg.value);
      sendResponse({ ok: true });
    }
  });
})();
