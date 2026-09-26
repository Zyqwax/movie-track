"use client";

import { useRef } from "react";

export default function HorizontalMovieRail({ children, className = "" }) {
  const railRef = useRef(null);
  const dragRef = useRef({ active: false, moved: false, startX: 0, startScrollLeft: 0 });

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
    }
    rail.scrollLeft = drag.startScrollLeft - distance;
  };

  const stopDragging = (event) => {
    const rail = railRef.current;
    if (rail?.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    dragRef.current.active = false;
  };

  const preventDraggedClick = (event) => {
    if (!dragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
  };

  return (
    <div
      ref={railRef}
      className={`cursor-grab active:cursor-grabbing ${className}`}
      style={{ touchAction: "pan-y" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onWheel={(event) => {
        if (event.deltaX === 0 && event.deltaY !== 0) {
          event.currentTarget.scrollLeft += event.deltaY;
        }
      }}
      onClickCapture={preventDraggedClick}
    >
      {children}
    </div>
  );
}
