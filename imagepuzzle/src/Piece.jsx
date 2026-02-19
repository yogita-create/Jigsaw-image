import React, { useEffect, useRef, useState, useCallback } from "react";
import "./Piece.css";

export default function Piece({
  piece,
  imgSrc,
  onMove,
  bringToFront,
  disabled,
  inTray = false
}) {
  const ref = useRef(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const boardRect = useRef(null);

  const [pos, setPos] = useState({ x: piece.x, y: piece.y });
  const [z, setZ] = useState(piece.z);
  const [isDragging, setIsDragging] = useState(false);

  /* Sync external updates */
  useEffect(() => {
    setPos({ x: piece.x, y: piece.y });
    setZ(piece.z);
  }, [piece.x, piece.y, piece.z]);

  /* Pointer Down */
  const onDown = useCallback((e) => {
    if (disabled || piece.placed) return;

    e.preventDefault();
    
    // Get current scale BEFORE changing state
    const currentScale = inTray ? 0.6 : 1;
    
    dragging.current = true;
    setIsDragging(true); // Piece will scale to full size
    bringToFront(piece.id);

    const br = ref.current.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    
    // Adjust offset for current scale
    offset.current = { 
      x: (clientX - br.left) / currentScale, 
      y: (clientY - br.top) / currentScale 
    };
    
    const board = document.querySelector(".jigsaw-board");
    boardRect.current = board?.getBoundingClientRect() || null;

    if (ref.current.setPointerCapture) {
      ref.current.setPointerCapture(e.pointerId);
    }
  }, [bringToFront, disabled, piece, inTray]);

  /* Pointer Move */
  const onMoveEvent = useCallback((e) => {
    if (!dragging.current || !boardRect.current) return;

    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

    const nx = Math.round(clientX - boardRect.current.left - offset.current.x);
    const ny = Math.round(clientY - boardRect.current.top - offset.current.y);

    onMove(piece.id, nx, ny, false);
  }, [onMove, piece.id]);

  /* Pointer Up */
  const onUp = useCallback((e) => {
    if (!dragging.current || !boardRect.current) return;

    dragging.current = false;
    setIsDragging(false);

    const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.changedTouches?.[0]?.clientY ?? 0;

    const nx = Math.round(clientX - boardRect.current.left - offset.current.x);
    const ny = Math.round(clientY - boardRect.current.top - offset.current.y);

    onMove(piece.id, nx, ny, true);

    if (ref.current.releasePointerCapture) {
      ref.current.releasePointerCapture(e.pointerId);
    }
    boardRect.current = null;
  }, [onMove, piece.id]);

  /* Global listeners */
  useEffect(() => {
    const handleMove = (e) => onMoveEvent(e);
    const handleUp = (e) => onUp(e);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [onMoveEvent, onUp]);

  // Scale: small in tray when NOT dragging, full size when dragging or placed
  const scale = (inTray && !isDragging) ? 0.6 : 1;
  const displayWidth = piece.width * scale;
  const displayHeight = piece.height * scale;

  const style = {
    width: displayWidth,
    height: displayHeight,
    transform: `translate(${pos.x}px, ${pos.y}px)`,
    zIndex: z,
    touchAction: "none",
    position: "absolute"
  };

  const maskId = `jigsaw-mask-${piece.id}`;

  return (
    <div
      ref={ref}
      className={`jigsaw-piece ${piece.placed ? "placed" : ""} ${inTray ? "in-tray" : ""}`}
      style={style}
      onPointerDown={onDown}
      onTouchStart={onDown}
    >
      <svg width={displayWidth} height={displayHeight} viewBox={`0 0 ${piece.width} ${piece.height}`}>
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
          </mask>
        </defs>

        <image
          href={imgSrc}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          mask={`url(#${maskId})`}
        />
      </svg>
    </div>
  );
}
