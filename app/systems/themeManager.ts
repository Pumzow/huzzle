import { appConfig } from "../config/appConfig";
import { Theme } from "../types/gameTypes";

function preferredTheme(): Theme {
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

  initialize(): void {
    this.apply();
  }

  get current(): Theme {
    return this.theme;
  }

  toggle(): Theme {
    this.theme = this.theme === "light" ? "dark" : "light";
    this.apply();
    try {
      window.localStorage.setItem(appConfig.theme.storageKey, this.theme);
    } catch {
      // Theme selection still works for this session when storage is unavailable.
    }
    return this.theme;
  }

  private apply(): void {
    document.documentElement.dataset.theme = this.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", appConfig.theme.colors[this.theme]);
  }
}

export const themeManager = new ThemeManager();
