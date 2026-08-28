import "./globals.css";
import { GameIntroScene } from "./scenes/gameIntroScene";
import { SceneManager } from "./systems/sceneManager";
import { themeManager } from "./systems/themeManager";
import { platformSession } from "./services/platformSession";

const root = document.getElementById("root");

if (!root) throw new Error("Unable to find the Huzzle application root.");

themeManager.initialize();
void platformSession.restore();
const sceneManager = new SceneManager(root);
sceneManager.loadScene(GameIntroScene);
