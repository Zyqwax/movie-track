"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function HorizontalMovieRail({ children, className = "" }) {
  const railRef = useRef(null);
  const dragRef = useRef({ active: false, moved: false, startX: 0, startScrollLeft: 0 });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
    setCanScrollLeft(rail.scrollLeft > 1);
    setCanScrollRight(maxScrollLeft - rail.scrollLeft > 1);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;

    updateScrollButtons();
    rail.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollButtons) : null;
    resizeObserver?.observe(rail);

    return () => {
      rail.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
      resizeObserver?.disconnect();
    };
  }, [updateScrollButtons]);

  const handlePointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rail = railRef.current;
    if (!rail) return;
    dragRef.current = { active: true, moved: false, startX: event.clientX, startScrollLeft: rail.scrollLeft };
  };

  const handlePointerMove = (event) => {
    const rail = railRef.current;
    const drag = dragRef.current;
    if (!rail || !drag.active) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 8) {
      drag.moved = true;
      if (!rail.hasPointerCapture(event.pointerId)) rail.setPointerCapture(event.pointerId);
      rail.style.scrollBehavior = "auto";
    }
    rail.scrollLeft = drag.startScrollLeft - distance;
  };

  const stopDragging = (event) => {
    const rail = railRef.current;
    if (rail?.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    if (rail) rail.style.scrollBehavior = "smooth";
    dragRef.current.active = false;
  };

  const handleWheel = (event) => {
    // Horizontal wheel/trackpad scrolling is intentionally disabled. The page
    // keeps its normal vertical wheel behavior and the rail uses the arrows.
    if (event.deltaX !== 0 || event.shiftKey) event.preventDefault();
  };

  const scrollByPage = (direction) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(rail.clientWidth * 0.7, 220), behavior: "smooth" });
  };

  const preventDraggedClick = (event) => {
    if (!dragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
  };

  return (
    <div className="group/rail relative">
      <div
        ref={railRef}
        className={`cursor-grab active:cursor-grabbing ${className}`}
        style={{
          touchAction: "pan-y",
          overscrollBehaviorX: "contain",
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onWheel={handleWheel}
        onClickCapture={preventDraggedClick}
      >
        {children}
      </div>
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Sola kaydır"
          onClick={() => scrollByPage(-1)}
          className="absolute left-1 top-1/2 z-10 hidden min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/95 text-text shadow-lg shadow-bg/30 backdrop-blur-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:flex"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          aria-label="Sağa kaydır"
          onClick={() => scrollByPage(1)}
          className="absolute right-1 top-1/2 z-10 hidden min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/95 text-text shadow-lg shadow-bg/30 backdrop-blur-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:flex"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
