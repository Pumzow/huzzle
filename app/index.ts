import "./globals.css";
import { GameIntroScene } from "./scenes/gameIntroScene";
import { SceneManager } from "./systems/sceneManager";
import { themeManager } from "./systems/themeManager";

const root = document.getElementById("root");

if (!root) throw new Error("Unable to find the Huzzle application root.");

themeManager.initialize();
const sceneManager = new SceneManager(root);
sceneManager.loadScene(GameIntroScene);
