import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Piece from "./Piece";
import "./Jigsaw.css";

const SNAP = 28;
const SIDE_MARGIN = 150;
const MOBILE_BREAKPOINT = 768;
const TRAY_HEIGHT = 180; 

export default function Jigsaw({ config = {} }) {
  const navigate = useNavigate();
  const boardRef = useRef(null);
  const trayRef = useRef(null);

  const { imageUrl, rows, cols } = config;

  const [boardSize, setBoardSize] = useState({ width: 800, height: 600 });

  const timerRef = useRef(null);

  const [pieces, setPieces] = useState([]);
  const [images, setImages] = useState({});
  const [placed, setPlaced] = useState(0);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [completed, setCompleted] = useState(false);

  const [preview, setPreview] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [paused, setPaused] = useState(false);
  const [boardBg, setBoardBg] = useState("#ffffff");
  const [reloadKey, setReloadKey] = useState(0);

  const [hintPiece, setHintPiece] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);

  /* Calculate actual board dimensions from CSS */
  useEffect(() => {
    const updateBoardSize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
      
      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        setBoardSize({
          width: rect.width,
          height: rect.height
        });
      }
    };

    setTimeout(updateBoardSize, 100);
    
    window.addEventListener("resize", updateBoardSize);
    return () => window.removeEventListener("resize", updateBoardSize);
  }, []);

  /* ⏱ TIMER */
  useEffect(() => {
    if (completed || paused) return;
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [completed, paused]);

  /* IMAGE SLICE + PIECE SPAWN */
  useEffect(() => {
    if (!imageUrl || boardSize.width === 0) return;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const BOARD_W = boardSize.width;
      const BOARD_H = boardSize.height;
      
      const pw = Math.floor(BOARD_W / cols);
      const ph = Math.floor(BOARD_H / rows);

      const imgs = {};
      const pcs = [];

      // Create pieces first
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement("canvas");
          canvas.width = pw;
          canvas.height = ph;

          canvas
            .getContext("2d")
            .drawImage(
              img,
              (img.width / cols) * c,
              (img.height / rows) * r,
              img.width / cols,
              img.height / rows,
              0,
              0,
              pw,
              ph
            );

          const id = `p-${r}-${c}`;
          imgs[id] = canvas.toDataURL();

          pcs.push({
            id,
            row: r,
            col: c,
            width: pw,
            height: ph,
            targetX: c * pw,
            targetY: r * ph,
            x: 0, 
            y: 0,
            placed: false,
            z: r * cols + c,
            group: id,
            inTray: isMobile
          });
        }
      }

      // Fisher-Yates shuffle for mobile tray randomization
      if (isMobile) {
        for (let i = pcs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pcs[i], pcs[j]] = [pcs[j], pcs[i]];
        }
      }

      // Now set positions based on order
      pcs.forEach((piece, idx) => {
        let x, y;

        if (isMobile) {
          // Spawn in tray at bottom - positions START FROM TOP (y=0)
          const allPieces = rows * cols;
          const trayColumns = Math.min(6, Math.ceil(Math.sqrt(allPieces))); // Dynamic columns
          
          const trayRow = Math.floor(idx / trayColumns);
          const trayCol = idx % trayColumns;
          
          // Scale pieces to fit tray nicely
          const trayPieceW = Math.min(pw * 0.6, 60); // Max 60px wide
          const trayPieceH = Math.min(ph * 0.6, 60); // Max 60px tall
          const padding = 6;
          
          // Add some randomness to position within tray
          const randomOffsetX = (Math.random() - 0.5) * 8;
          const randomOffsetY = (Math.random() - 0.5) * 8;
          
          // Position pieces starting from y=0 (top of tray)
          x = trayCol * (trayPieceW + padding) + padding + randomOffsetX;
          y = trayRow * (trayPieceH + padding) + padding + randomOffsetY; // Removed BOARD_H offset
        } else {
          // Desktop: spawn left/right
          const left = Math.random() > 0.5;
          x = left
            ? -pw - Math.random() * SIDE_MARGIN
            : BOARD_W + Math.random() * SIDE_MARGIN;
          y = Math.random() * (BOARD_H - ph);
        }

        piece.x = x;
        piece.y = y;
      });

      const hint = pcs[Math.floor(Math.random() * pcs.length)];
      setHintPiece({
        img: imgs[hint.id],
        x: hint.targetX,
        y: hint.targetY,
        width: hint.width,
        height: hint.height
      });

      setImages(imgs);
      setPieces(pcs);
      setPlaced(0);
      setMoves(0);
      setTime(0);
      setCompleted(false);
      setPaused(false);
    };

    img.src = imageUrl;
  }, [imageUrl, rows, cols, reloadKey, isMobile, boardSize.width, boardSize.height]);

  /* MOVE + SNAP */
  const onMove = useCallback((id, x, y, final) => {
    setPieces(prev => {
      const updated = prev.map(p => ({ ...p }));
      const moving = updated.find(p => p.id === id);
      if (!moving) return prev;

      const group = updated.filter(p => p.group === moving.group);
      const dx = x - moving.x;
      const dy = y - moving.y;

      group.forEach(p => {
        p.x += dx;
        p.y += dy;
        // Mark as out of tray when moved
        if (p.inTray) p.inTray = false;
      });

      let snap = null;

      for (const a of group.filter(p => !p.placed)) {
        for (const b of updated.filter(p => p.group !== a.group && !p.placed)) {
          if (a.row === b.row && Math.abs(a.col - b.col) === 1) {
            const ex = b.x + (a.col - b.col) * a.width;
            if (Math.hypot(a.x - ex, a.y - b.y) < SNAP) snap = { a, b };
          }
          if (a.col === b.col && Math.abs(a.row - b.row) === 1) {
            const ey = b.y + (a.row - b.row) * a.height;
            if (Math.hypot(a.y - ey, a.x - b.x) < SNAP) snap = { a, b };
          }
        }
      }

      if (snap) {
        const base = snap.b;
        updated.forEach(p => {
          if (p.group === snap.a.group) {
            p.x = base.x + (p.col - base.col) * p.width;
            p.y = base.y + (p.row - base.row) * p.height;
            p.group = base.group;
          }
        });
      }

      if (final) {
        updated.forEach(p => {
          if (
            !p.placed &&
            Math.hypot(p.x - p.targetX, p.y - p.targetY) < SNAP
          ) {
            p.x = p.targetX;
            p.y = p.targetY;
            p.placed = true;
          }
        });

        const count = updated.filter(p => p.placed).length;
        setPlaced(count);
        setMoves(m => m + 1);
        if (count === updated.length) setCompleted(true);
      }

      return updated;
    });
  }, []);

  const bringToFront = id => {
    setPieces(prev => {
      const maxZ = Math.max(...prev.map(p => p.z));
      return prev.map(p =>
        p.id === id ? { ...p, z: maxZ + 1 } : p
      );
    });
  };

  if (!imageUrl) return null;

  const BOARD_W = 800;
  const BOARD_H = Math.round((BOARD_W * rows) / cols);

  return (
    <div className="jigsaw-root">
      <div className="hud">
        <span>⏱ {time}s</span>
        <span>Moves {moves}</span>

        <button
          onMouseDown={() => setPreview(true)}
          onMouseUp={() => setPreview(false)}
          onMouseLeave={() => setPreview(false)}
          onTouchStart={() => setPreview(true)}
          onTouchEnd={() => setPreview(false)}
        >
          Preview
        </button>

        <button onClick={() => setShowRules(true)}>Rules</button>

        <button onClick={() => setPaused(p => !p)}>
          {paused ? "▶️" : "⏸️"}
        </button>

        <input
          type="color"
          value={boardBg}
          onChange={e => setBoardBg(e.target.value)}
        />
      </div>

      <div className="game-container">
        <div
          ref={boardRef}
          className="jigsaw-board"
          style={{
            width: BOARD_W,
            height: BOARD_H,
            backgroundColor: boardBg,
            border: "2px solid #555",
            position: "relative"
          }}
        >
          {hintPiece && (
            <img
              src={hintPiece.img}
              alt="hint"
              style={{
                position: "absolute",
                left: hintPiece.x,
                top: hintPiece.y,
                width: hintPiece.width,
                height: hintPiece.height,
                opacity: 0.25,
                pointerEvents: "none"
              }}
            />
          )}

          {preview && (
            <img
              src={imageUrl}
              className="board-preview"
              alt="preview"
              style={{ width: "100%", height: "100%" }}
            />
          )}

          <div className="grid-overlay">
            {Array.from({ length: rows - 1 }).map((_, i) => (
              <div
                key={`h-${i}`}
                className="grid-line horizontal"
                style={{ top: `${((i + 1) * 100) / rows}%` }}
              />
            ))}
            {Array.from({ length: cols - 1 }).map((_, i) => (
              <div
                key={`v-${i}`}
                className="grid-line vertical"
                style={{ left: `${((i + 1) * 100) / cols}%` }}
              />
            ))}
          </div>

          {/* Only render pieces not in tray or desktop pieces */}
          {[...pieces]
            .filter(p => !isMobile || !p.inTray || p.placed)
            .sort((a, b) => a.z - b.z)
            .map(p => (
              <Piece
                key={p.id}
                piece={p}
                imgSrc={images[p.id]}
                onMove={paused ? () => {} : onMove}
                bringToFront={bringToFront}
                disabled={p.placed || paused}
                inTray={false} 
              />
            ))}
        </div>

        {/* MOBILE TRAY */}
        {isMobile && (
          <div 
            ref={trayRef}
            className="piece-tray"
            style={{
              height: "40vh",
              width: "100%",
              position: "relative",
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              borderTop: "4px solid #555",
              overflowY: "auto", // Changed from overflowX to overflowY
              overflowX: "hidden",
            }}
          >
            <div style={{ 
              position: "relative", 
              minHeight: TRAY_HEIGHT,
              paddingTop: 8 // Add padding at top for better spacing
            }}>
              {/* Render tray pieces */}
              {[...pieces]
                .filter(p => p.inTray && !p.placed)
                .sort((a, b) => a.z - b.z)
                .map(p => (
                  <Piece
                    key={p.id}
                    piece={p}
                    imgSrc={images[p.id]}
                    onMove={paused ? () => {} : onMove}
                    bringToFront={bringToFront}
                    disabled={p.placed || paused}
                    inTray={true}
                  />
                ))}
            </div>
          </div>
        )}
      </div>

      <button className="back-arrow" onClick={() => navigate("/")}>🏠</button>

      {showRules && (
        <div className="overlay">
          <div className="modal">
            <h2>📜 Rules</h2>
            <ul>
              <li>Drag and place the puzzle pieces.</li>
              <li>Complete the picture as fast as you can.</li>
              <li>Moves and time will be counted.</li>
              <li>Complete the puzzle to win!</li>
            </ul>
            <button onClick={() => setShowRules(false)}>Close</button>
          </div>
        </div>
      )}

      {completed && (
        <div className="overlay">
          <div className="modal">
            <h2>🎉 Puzzle Completed!</h2>
            <p>Time: {time}s</p>
            <p>Moves: {moves}</p>
            <button onClick={() => setReloadKey(k => k + 1)}>
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}