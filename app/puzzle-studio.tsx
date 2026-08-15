"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GridSize, PixiPuzzle } from "./pixi-puzzle";

type Progress = { moves: number; groups: number; won: boolean };
const GRID_OPTIONS: GridSize[] = [4, 6, 8];

function makeSampleImage(): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d")!;
  const sky = ctx.createLinearGradient(0, 0, 0, 1200);
  sky.addColorStop(0, "#a9d8d5");
  sky.addColorStop(.57, "#f4d6a0");
  sky.addColorStop(1, "#e97b55");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1200, 1200);
  ctx.fillStyle = "#fff4c7";
  ctx.beginPath();
  ctx.arc(890, 245, 116, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6a9b8b";
  ctx.beginPath();
  ctx.moveTo(0, 710); ctx.lineTo(290, 365); ctx.lineTo(520, 690); ctx.lineTo(745, 410); ctx.lineTo(1200, 770); ctx.lineTo(1200, 1200); ctx.lineTo(0, 1200); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2e6962";
  ctx.beginPath();
  ctx.moveTo(0, 840); ctx.lineTo(220, 635); ctx.lineTo(390, 785); ctx.lineTo(620, 570); ctx.lineTo(825, 790); ctx.lineTo(1040, 600); ctx.lineTo(1200, 730); ctx.lineTo(1200, 1200); ctx.lineTo(0, 1200); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#163f42";
  ctx.fillRect(0, 930, 1200, 270);
  const trees = [80, 180, 310, 455, 620, 790, 950, 1080];
  trees.forEach((x, index) => {
    const y = 850 + (index % 3) * 32;
    ctx.fillStyle = index % 2 ? "#173f42" : "#245b58";
    for (let tier = 0; tier < 3; tier++) {
      ctx.beginPath();
      ctx.moveTo(x, y - 230 + tier * 70);
      ctx.lineTo(x - 92 + tier * 15, y - 55 + tier * 48);
      ctx.lineTo(x + 92 - tier * 15, y - 55 + tier * 48);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillRect(x - 10, y - 20, 20, 120);
  });
  ctx.fillStyle = "rgba(255,255,255,.42)";
  ctx.beginPath(); ctx.moveTo(290, 365); ctx.lineTo(215, 495); ctx.lineTo(318, 430); ctx.lineTo(376, 490); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(745, 410); ctx.lineTo(661, 540); ctx.lineTo(748, 494); ctx.lineTo(817, 560); ctx.closePath(); ctx.fill();
  return canvas.toDataURL("image/jpeg", .92);
}

export function PuzzleStudio() {
  const sample = useMemo(() => makeSampleImage(), []);
  const [imageUrl, setImageUrl] = useState(sample);
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [progress, setProgress] = useState<Progress>({ moves: 0, groups: 16, won: false });
  const [gameKey, setGameKey] = useState(0);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const restart = useCallback(() => {
    setProgress({ moves: 0, groups: gridSize * gridSize, won: false });
    setGameKey((value) => value + 1);
  }, [gridSize]);

  const changeGridSize = (size: GridSize) => {
    if (size === gridSize) return;
    setGridSize(size);
    setProgress({ moves: 0, groups: size * size, won: false });
    setGameKey((value) => value + 1);
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    setImageUrl(objectUrlRef.current);
    restart();
    event.target.value = "";
  };

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="brand-copy"><strong>Huzzle</strong><span>picture puzzle lab</span></span>
        </div>
        <div className="step-pill"><b>01</b><span>Mechanic prototype</span></div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Swap · connect · complete</p>
          <h1>Build the whole picture.</h1>
        </div>
        <p>Choose from {gridSize * gridSize} tiles and slots. Correct neighbors connect into movable sets. Drag any connected tile and the whole set comes with it.</p>
      </section>

      <section className="workspace" aria-label="Picture puzzle workspace">
        <div className="game-card">
          <div className="game-toolbar">
            <div className="game-stats">
              <div className="stat"><span>Moves</span><strong>{String(progress.moves).padStart(2, "0")}</strong></div>
              <div className="stat"><span>Sets</span><strong>{String(progress.groups).padStart(2, "0")}</strong></div>
              <div className="stat"><span>Grid</span><strong>{gridSize} × {gridSize}</strong></div>
            </div>
            <div className="tool-actions">
              <button className="icon-button" type="button" onClick={restart} aria-label="Shuffle and restart puzzle" title="Shuffle and restart">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h3c5 0 5 12 10 12h5"/><path d="m18 15 3 3-3 3"/><path d="M3 18h3c2.2 0 3.4-2.2 4.6-4.7M14 6h2.2H21"/><path d="m18 3 3 3-3 3"/></svg>
              </button>
            </div>
          </div>
          <div className="canvas-wrap">
            {imageUrl ? <PixiPuzzle key={`${gameKey}-${imageUrl}-${gridSize}`} imageUrl={imageUrl} gridSize={gridSize} onProgress={setProgress} /> : <div className="loading">Preparing image…</div>}
            {progress.won && <div className="win-card" role="status"><strong>Picture complete!</strong><p>{progress.moves} swaps · all {gridSize * gridSize} tiles are in place</p></div>}
          </div>
        </div>

        <aside className="side-panel">
          <div className="preview-frame">            {imageUrl && <img src={imageUrl} alt="Preview of the completed puzzle" />}
            <span className="preview-label">Target image</span>
          </div>
          <h2>Swap tiles. Build connected sets.</h2>
          <p>Every tile stays inside the square playfield. A clear perimeter wraps each tile or connected set, while displaced tiles flow into the open slots.</p>
          <fieldset className="grid-picker">
            <legend>Grid size</legend>
            <div>
              {GRID_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={size === gridSize ? "is-active" : ""}
                  aria-pressed={size === gridSize}
                  onClick={() => changeGridSize(size)}
                >
                  {size} × {size}
                </button>
              ))}
            </div>
          </fieldset>
          <ol className="how-list">
            <li><b>1</b><span>Drag a tile—or its connected set—to a new slot.</span></li>
            <li><b>2</b><span>Release and displaced tiles fill the vacated slots.</span></li>
            <li><b>3</b><span>The outer outline shows exactly what moves together.</span></li>
          </ol>
          <label className="upload-button">Choose another image<input type="file" accept="image/*" onChange={handleUpload} /></label>
          <button className="primary-button" type="button" onClick={restart}>Shuffle puzzle</button>
        </aside>
      </section>

      <footer className="footnote"><span>PIXI.js interaction prototype</span><span>Tip: landscapes and square images work best</span></footer>
    </main>
  );
}
