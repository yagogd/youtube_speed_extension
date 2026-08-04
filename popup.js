// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const speedInput = document.getElementById('speed');
  const applyBtn = document.getElementById('apply');
  const resetBtn = document.getElementById('reset');
  const presets = document.querySelectorAll('.preset');

  // Envía mensaje al tab activo
  async function sendSpeedToActiveTab(rate) {
    rate = parseFloat(rate);
    if (isNaN(rate) || rate <= 0) {
      alert('Introduce una velocidad válida (> 0).');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        alert("No se detecta ninguna pestaña activa.");
        return;
      }

      // Verifica que es YouTube
      if (!tab.url || !tab.url.includes("youtube.com")) {
        alert("Abre YouTube antes de usar la extensión.");
        return;
      }

      // Envia el mensaje al content script
      chrome.tabs.sendMessage(tab.id, { type: 'set-speed', value: rate }, (resp) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError.message);
          alert('⚠️ No se pudo comunicar con el vídeo. Prueba a recargar la página de YouTube.');
          return;
        }

        if (!resp) {
          alert('⚠️ No se recibió respuesta del script.');
          return;
        }

        if (resp.ok) {
          console.log(`✅ Velocidad aplicada: ${rate}x`);
          chrome.storage.local.set({ lastSpeed: rate });
        } else {
          alert('Error al aplicar la velocidad: ' + (resp.error || 'desconocido.'));
        }
      });
    } catch (e) {
      console.error('Error general:', e);
      alert("Error al enviar mensaje a la pestaña.");
    }
  }


  applyBtn.addEventListener('click', () => {
    sendSpeedToActiveTab(speedInput.value);
  });

  resetBtn.addEventListener('click', () => {
    speedInput.value = 1;
    sendSpeedToActiveTab(1);
  });

  // Detectar tecla Enter en el campo de velocidad
  speedInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // evita que se envíe el formulario
      sendSpeedToActiveTab(speedInput.value);
    }
  });

  presets.forEach(btn => {
    btn.addEventListener('click', (e) => {
      speedInput.value = e.target.textContent.trim();
      sendSpeedToActiveTab(speedInput.value);
    });
  });

  // cargar último speed guardado
  chrome.storage.local.get(['lastSpeed'], (res) => {
    if (res.lastSpeed) speedInput.value = res.lastSpeed;
  });
});
