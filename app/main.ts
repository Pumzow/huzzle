import "./globals.css";
import { mountPuzzleStudio } from "./puzzle-studio";

const root = document.getElementById("root");

if (!root) throw new Error("Unable to find the Huzzle application root.");

mountPuzzleStudio(root);
