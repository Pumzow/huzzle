import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import { PuzzleStudio } from "./puzzle-studio";

const root = document.getElementById("root");

if (!root) throw new Error("Unable to find the Huzzle application root.");

createRoot(root).render(
  <StrictMode>
    <PuzzleStudio />
  </StrictMode>,
);
