(() => {
  "use strict";
  const ytx = globalThis.__YTX;
  const EDGES = ["left", "right", "top", "bottom"];

  ytx.addResizeHandles = (panel, boundsElement = null) => {
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
        const bounds = boundsElement?.getBoundingClientRect() || { left:0, top:0, right:window.innerWidth, bottom:window.innerHeight, width:window.innerWidth, height:window.innerHeight };
        panel.style.left = `${rect.left - bounds.left}px`;
        panel.style.top = `${rect.top - bounds.top}px`;
        panel.style.right = "auto";
        document.body.classList.add("ytx-no-select");

        const onMove = (moveEvent) => {
          if (edge === "left") {
            const nextLeft = Math.max(8, Math.min(rect.right - bounds.left - 300, moveEvent.clientX - bounds.left));
            panel.style.left = `${nextLeft}px`;
            panel.style.width = `${Math.min(bounds.width * 0.92, rect.right - bounds.left - nextLeft)}px`;
          } else if (edge === "right") {
            panel.style.width = `${Math.max(300, Math.min(bounds.right - rect.left - 8, rect.width + moveEvent.clientX - startX))}px`;
          } else if (edge === "bottom") {
            panel.style.height = `${Math.max(130, Math.min(bounds.bottom - rect.top - 8, rect.height + moveEvent.clientY - startY))}px`;
          } else {
            const nextTop = Math.max(8, Math.min(rect.bottom - bounds.top - 130, rect.top - bounds.top + moveEvent.clientY - startY));
            panel.style.top = `${nextTop}px`;
            panel.style.height = `${rect.bottom - bounds.top - nextTop}px`;
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
