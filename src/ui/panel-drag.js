(() => {
  "use strict";
  const ytx = globalThis.__YTX;

  ytx.makePanelDraggable = (panel, header) => {
    const onMouseDown = (event) => {
      if (event.button !== 0 || event.target.closest("button")) return;
      event.preventDefault();

      const rect = panel.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      panel.style.left = `${rect.left}px`;
      panel.style.right = "auto";
      document.body.classList.add("ytx-no-select");

      const onMove = (moveEvent) => {
        const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
        const maxTop = Math.max(8, window.innerHeight - 58);
        panel.style.left = `${Math.max(8, Math.min(maxLeft, moveEvent.clientX - offsetX))}px`;
        panel.style.top = `${Math.max(8, Math.min(maxTop, moveEvent.clientY - offsetY))}px`;
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.classList.remove("ytx-no-select");
        panel.dispatchEvent(new CustomEvent("ytx:geometrychange"));
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };

    header.addEventListener("mousedown", onMouseDown);
    return () => header.removeEventListener("mousedown", onMouseDown);
  };
})();
