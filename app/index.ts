import "./styles/index.css";
import { HuzzleApplication } from "./application";

const root = document.getElementById("root");

if (!root) throw new Error("Unable to find the Huzzle application root.");

new HuzzleApplication(root).start();
