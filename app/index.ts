import "./globals.css";
import { mountPuzzleScene } from "./scenes/puzzleScene";

const root = document.getElementById("root");

if (!root) throw new Error("Unable to find the Huzzle application root.");

mountPuzzleScene(root);
