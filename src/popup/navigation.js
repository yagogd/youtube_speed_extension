"use strict";

export function initNavigation({ notesController }) {
  const mainView = document.getElementById("main-view");
  const settingsView = document.getElementById("settings-view");

  function showSettings(show) {
    mainView.hidden = show;
    settingsView.hidden = !show;
    notesController.syncWidth(!show);
    window.scrollTo(0, 0);
  }

  [document.getElementById("open-settings"), document.getElementById("open-settings-secondary")]
    .forEach((button) => button.addEventListener("click", () => showSettings(true)));
  document.getElementById("close-settings").addEventListener("click", () => showSettings(false));
  document.getElementById("open-settings-shortcuts").addEventListener("click", () => {
    showSettings(true);
    const section = document.querySelector('[data-settings-section="shortcuts"]');
    if (section) section.open = true;
  });
  document.getElementById("open-settings-pause-shortcuts").addEventListener("click", () => {
    showSettings(true);
    const section = document.getElementById("pause-shortcut-list").closest("details");
    if (section) section.open = true;
  });
  document.querySelectorAll("[data-quick-expand]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.getAttribute("aria-controls"));
      const expanded = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(expanded));
      target.hidden = !expanded;
    });
  });

  return { showSettings };
}
