"use client";

import { ChangeEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GridSize, PixiPuzzle, PuzzleProgress, TileShape } from "./pixi-puzzle";
import { soundManager } from "./sound-manager";

type Theme = "light" | "dark";
const GRID_OPTIONS: GridSize[] = [4, 6, 8];
const SHAPE_OPTIONS: Array<{ value: TileShape; label: string }> = [
  { value: "square", label: "Square" },
  { value: "hexagon", label: "Hexagon" },
  { value: "octagon", label: "Octagon" },
];
const THEME_STORAGE_KEY = "huzzle-theme";
const SOUNDTRACK = "/sounds/huzzle-soundtrack.wav";

function emptyProgress(gridSize: GridSize): PuzzleProgress {
  return { moves: 0, groups: gridSize * gridSize, won: false, startingGroups: 0, moveLimit: 0 };
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getInitialTheme(): Theme {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  } catch {
    // Browsers can disable storage; the system preference remains a safe fallback.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

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
  const [tileShape, setTileShape] = useState<TileShape>("square");
  const [progress, setProgress] = useState<PuzzleProgress>(() => emptyProgress(4));
  const [gameKey, setGameKey] = useState(0);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [soundMuted, setSoundMuted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [targetRevealed, setTargetRevealed] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const timerStartedAtRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#101b1c" : "#f5f1e8");
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme selection still works for this session when storage is unavailable.
    }
  }, [theme]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  useEffect(() => {
    soundManager.playSound(SOUNDTRACK, true);
    return () => soundManager.stopSound(SOUNDTRACK);
  }, []);

  useEffect(() => soundManager.setMuted(soundMuted), [soundMuted]);

  const toggleSound = useCallback(() => setSoundMuted((current) => !current), []);

  useEffect(() => {
    if (!gameStarted || progress.won) return;
    if (timerStartedAtRef.current === null) timerStartedAtRef.current = Date.now();
    const updateTimer = () => setElapsedSeconds(Math.floor((Date.now() - timerStartedAtRef.current!) / 1000));
    updateTimer();
    const timer = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(timer);
  }, [gameKey, gameStarted, progress.won]);

  const startGame = useCallback(() => setGameStarted(true), []);

  const resetChallenge = useCallback((size: GridSize) => {
    timerStartedAtRef.current = null;
    setElapsedSeconds(0);
    setGameStarted(false);
    setTargetRevealed(false);
    setProgress(emptyProgress(size));
    setGameKey((value) => value + 1);
  }, []);

  const restart = useCallback(() => {
    resetChallenge(gridSize);
  }, [gridSize, resetChallenge]);

  const changeGridSize = (size: GridSize) => {
    if (size === gridSize) return;
    setGridSize(size);
    resetChallenge(size);
  };

  const changeTileShape = (shape: TileShape) => {
    if (shape === tileShape) return;
    setTileShape(shape);
    resetChallenge(gridSize);
  };

  const timeLimitSeconds = progress.startingGroups ? 20 + progress.startingGroups * 7 : 0;
  const timeExpired = timeLimitSeconds > 0 && elapsedSeconds > timeLimitSeconds;
  const moveLimitExceeded = progress.moveLimit > 0 && progress.moves > progress.moveLimit;
  const stars = 3 - Number(timeExpired) - Number(targetRevealed) - Number(moveLimitExceeded);
  const displayedTime = timeExpired ? elapsedSeconds - timeLimitSeconds : Math.max(0, timeLimitSeconds - elapsedSeconds);
  const completionMessage = stars === 3 ? "Excellent!" : stars === 2 ? "Well done!" : "Puzzle completed!";

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
          <strong className="brand-name">Huzzle</strong>
        </div>
        <div className="topbar-actions">
          <button
            className="sound-toggle"
            type="button"
            aria-label={soundMuted ? "Unmute soundtrack" : "Mute soundtrack"}
            aria-pressed={soundMuted}
            onClick={toggleSound}
          >
            {soundMuted ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z"/><path d="m16 9 5 6M21 9l-5 6"/></svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z"/><path d="M15 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/></svg>
            )}
            <span>{soundMuted ? "Sound off" : "Sound on"}</span>
          </button>
          <button
            className="theme-toggle"
            type="button"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            aria-pressed={theme === "dark"}
            onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
          >
            {theme === "light" ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.3 15.2A8.5 8.5 0 0 1 8.8 3.7 8.5 8.5 0 1 0 20.3 15.2Z"/></svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3V1.5M12 22.5V21M4.22 4.22 3.16 3.16M20.84 20.84l-1.06-1.06M3 12H1.5M22.5 12H21M4.22 19.78l-1.06 1.06M20.84 3.16l-1.06 1.06"/><circle cx="12" cy="12" r="4.5"/></svg>
            )}
            <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
          </button>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Swap · connect · complete</p>
        </div>
      </section>

      <section className="workspace" aria-label="Picture puzzle workspace">
        <div className="game-card">
          <div className="game-toolbar">
            <div className="game-stats">
              <div className="stat"><span>Moves</span><strong>{String(progress.moves).padStart(2, "0")} <small>/ {progress.moveLimit || "—"}</small></strong></div>
            </div>
            <div className="star-stat" aria-label={`${stars} of 3 stars remaining`}>
              <span>Stars</span>
              <div className="stars" aria-hidden="true">
                {[0, 1, 2].map((star) => <i key={star} className={star < stars ? "is-earned" : ""}>★</i>)}
              </div>
            </div>
            <div className={`timer${timeExpired ? " is-expired" : ""}`}>
              <span>{timeExpired ? "Over time" : gameStarted ? "Time left" : "Timer"}</span>
              <strong>{timeExpired ? "+" : ""}{formatTime(displayedTime)}</strong>
            </div>
          </div>
          <div className="canvas-wrap">
            {imageUrl ? <PixiPuzzle key={`${gameKey}-${imageUrl}-${gridSize}-${tileShape}`} imageUrl={imageUrl} gridSize={gridSize} tileShape={tileShape} onProgress={setProgress} onStart={startGame} /> : <div className="loading">Preparing image…</div>}
            {progress.won && <div className="win-card" role="status"><div className="win-stars" aria-label={`${stars} out of 3 stars`}>{"★".repeat(stars)}<span>{"★".repeat(3 - stars)}</span></div><strong>{completionMessage}</strong></div>}
          </div>
        </div>

        <aside className="side-panel">
          <button
            className={`preview-frame${targetRevealed ? " is-revealed" : ""}`}
            type="button"
            disabled={targetRevealed || progress.won}
            aria-label={targetRevealed ? "Target image revealed" : progress.won ? "Target image unavailable after completion" : "Reveal target image for a one-star penalty"}
            onClick={() => setTargetRevealed(true)}
          >
            {imageUrl && <img src={imageUrl} alt={targetRevealed ? "Preview of the completed puzzle" : ""} />}
            {!targetRevealed && <span className="preview-cover"><strong>{progress.won ? "Puzzle complete" : "Reveal target"}</strong>{!progress.won && <small aria-hidden="true">−★</small>}</span>}
            <span className="preview-label">Target image</span>
          </button>
          <label className="upload-button">Upload image<input type="file" accept="image/*" onChange={handleUpload} /></label>
          <fieldset className="shape-picker">
            <legend>Piece shape</legend>
            <div>
              {SHAPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={value === tileShape ? "is-active" : ""}
                  aria-pressed={value === tileShape}
                  onClick={() => changeTileShape(value)}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    {value === "square"
                      ? <rect x="4" y="4" width="16" height="16" />
                      : value === "hexagon"
                        ? <polygon points="7,3 17,3 22,12 17,21 7,21 2,12" />
                        : <polygon points="8,3 16,3 21,8 21,16 16,21 8,21 3,16 3,8" />}
                  </svg>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </fieldset>
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
          <button className="primary-button" type="button" onClick={restart}>Shuffle puzzle</button>
        </aside>
      </section>

    </main>
  );
}
