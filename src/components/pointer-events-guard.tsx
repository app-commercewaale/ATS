"use client";

import { useEffect } from "react";

/**
 * Radix dropdown + dialog stacking can strand `pointer-events: none` on <body>
 * after a dialog opened from a dropdown menu closes. This watches <body>
 * and clears the lock once no Radix modal is actually open.
 */
export function PointerEventsGuard() {
  useEffect(() => {
    const body = document.body;

    const clearIfStranded = () => {
      if (body.style.pointerEvents !== "none") return;
      const openModal = document.querySelector(
        '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"], [data-state="open"][role="menu"]'
      );
      if (!openModal) {
        body.style.pointerEvents = "";
      }
    };

    const observer = new MutationObserver(clearIfStranded);
    observer.observe(body, { attributes: true, attributeFilter: ["style"] });

    const interval = window.setInterval(clearIfStranded, 500);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
