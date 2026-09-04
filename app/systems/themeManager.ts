import { gsap } from "gsap";
import { appConfig } from "../config/appConfig";
import { gameConfig } from "../config/gameConfig";
import { Theme } from "../types/gameTypes";
import { prefersReducedMotion } from "./visualEffects";

const themeColorProperties = [
  "--ink",
  "--muted",
  "--cream",
  "--paper",
  "--orange",
  "--orange-dark",
  "--mint",
  "--ambient-orange",
  "--ambient-ink",
  "--float-orange",
  "--float-mint",
  "--line",
  "--soft-line",
  "--soft-surface",
  "--solid-surface",
  "--tinted-surface",
  "--pill-surface",
  "--win-surface",
  "--page-shadow",
  "--selected-surface",
  "--selected-ink",
] as const;

function preferredTheme(): Theme {
  if (typeof window === "undefined") return appConfig.theme.default === "dark" ? "dark" : "light";
  try {
    const stored = window.localStorage.getItem(appConfig.theme.storageKey);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Fall back to the configured or system theme when storage is unavailable.
  }
  if (appConfig.theme.default !== "system") return appConfig.theme.default;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

class ThemeManager {
  private theme = preferredTheme();
  private transition: gsap.core.Tween | null = null;

  initialize(): void {
    this.apply();
  }

  get current(): Theme {
    return this.theme;
  }

  toggle(_origin?: HTMLElement): Theme {
    void _origin;
    this.theme = this.theme === "light" ? "dark" : "light";
    try {
      window.localStorage.setItem(appConfig.theme.storageKey, this.theme);
    } catch {
      // Theme selection still works for this session when storage is unavailable.
    }
    const root = document.documentElement;
    if (prefersReducedMotion()) {
      this.transition?.kill();
      this.clearThemeOverrides(root);
      this.apply();
      return this.theme;
    }

    const currentStyle = getComputedStyle(root);
    const currentColors = Object.fromEntries(
      themeColorProperties.map((property) => [property, currentStyle.getPropertyValue(property).trim()])
    );
    this.transition?.kill();
    this.clearThemeOverrides(root);
    this.apply();
    const targetStyle = getComputedStyle(root);
    const targetColors = Object.fromEntries(
      themeColorProperties.map((property) => [property, targetStyle.getPropertyValue(property).trim()])
    );
    Object.entries(currentColors).forEach(([property, value]) => root.style.setProperty(property, value));

    const config = gameConfig.visualEffects.themeTransition;
    const tween: gsap.TweenVars = {
      duration: config.duration,
      ease: config.easing,
      onComplete: () => {
        this.clearThemeOverrides(root);
        this.transition = null;
      },
    };
    Object.assign(tween, targetColors);
    this.transition = gsap.to(root, tween);
    return this.theme;
  }

  private clearThemeOverrides(root: HTMLElement): void {
    themeColorProperties.forEach((property) => root.style.removeProperty(property));
  }

  private apply(): void {
    document.documentElement.dataset.theme = this.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", appConfig.theme.colors[this.theme]);
  }
}

export const themeManager = new ThemeManager();
