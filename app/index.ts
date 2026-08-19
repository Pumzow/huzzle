import "./globals.css";
import { SceneManager } from "./systems/sceneManager";
import { themeManager } from "./systems/themeManager";

const root = document.getElementById("root");

if (!root) throw new Error("Unable to find the Huzzle application root.");

themeManager.initialize();
new SceneManager(root);
