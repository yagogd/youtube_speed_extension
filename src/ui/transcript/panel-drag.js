(() => {
  "use strict";
  const ytx = globalThis.__YTX;

  ytx.makePanelDraggable = (panel, header, boundsElement = null) => {
    const onMouseDown = (event) => {
      if (event.button !== 0 || event.target.closest("button, input, select")) return;
      event.preventDefault();

      const rect = panel.getBoundingClientRect();
      const bounds = boundsElement?.getBoundingClientRect() || { left:0, top:0, width:window.innerWidth, height:window.innerHeight };
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      panel.style.left = `${rect.left - bounds.left}px`;
      panel.style.top = `${rect.top - bounds.top}px`;
      panel.style.right = "auto";
      document.body.classList.add("ytx-no-select");

      const onMove = (moveEvent) => {
        const currentBounds = boundsElement?.getBoundingClientRect() || bounds;
        const maxLeft = Math.max(8, currentBounds.width - panel.offsetWidth - 8);
        const maxTop = Math.max(8, currentBounds.height - panel.offsetHeight - 8);
        panel.style.left = `${Math.max(8, Math.min(maxLeft, moveEvent.clientX - currentBounds.left - offsetX))}px`;
        panel.style.top = `${Math.max(8, Math.min(maxTop, moveEvent.clientY - currentBounds.top - offsetY))}px`;
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
