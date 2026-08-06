(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const EDGES = ["left", "right", "top", "bottom"];

  ytx.addResizeHandles = (panel) => {
    const cleanups = EDGES.map((edge) => {
      const handle = document.createElement("div");
      handle.className = `ytx-resize-handle ytx-resize-handle--${edge}`;
      handle.dataset.resizeEdge = edge;
      panel.appendChild(handle);

      const onMouseDown = (event) => {
        event.preventDefault();
        const startX = event.clientX;
        const startY = event.clientY;
        const rect = panel.getBoundingClientRect();
        panel.style.left = `${rect.left}px`;
        panel.style.right = "auto";
        document.body.classList.add("ytx-no-select");

        const onMove = (moveEvent) => {
          if (edge === "left") {
            const nextLeft = Math.max(8, Math.min(rect.right - 300, moveEvent.clientX));
            panel.style.left = `${nextLeft}px`;
            panel.style.width = `${Math.min(window.innerWidth * 0.7, rect.right - nextLeft)}px`;
          } else if (edge === "right") {
            panel.style.width = `${Math.max(300, Math.min(window.innerWidth - rect.left - 8, rect.width + moveEvent.clientX - startX))}px`;
          } else if (edge === "bottom") {
            panel.style.height = `${Math.max(130, Math.min(window.innerHeight - rect.top - 12, rect.height + moveEvent.clientY - startY))}px`;
          } else {
            const nextTop = Math.max(12, Math.min(rect.bottom - 130, rect.top + moveEvent.clientY - startY));
            panel.style.top = `${nextTop}px`;
            panel.style.height = `${rect.bottom - nextTop}px`;
          }
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

      handle.addEventListener("mousedown", onMouseDown);
      return () => handle.removeEventListener("mousedown", onMouseDown);
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  };
})();
