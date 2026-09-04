import { appConfig } from "../config/appConfig";
import { gameConfig } from "../config/gameConfig";
import { Theme } from "../types/gameTypes";
import { Utils } from "../utils/utils";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

function preferredTheme(): Theme {
  if (typeof window === "undefined") {
    return appConfig.theme.default === "dark" ? "dark" : "light";
  }
  try {
    const stored = window.localStorage.getItem(appConfig.theme.storageKey);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Fall back to the configured or system theme when storage is unavailable.
  }
  if (appConfig.theme.default !== "system") return appConfig.theme.default;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

class ThemeManager {
  private theme = preferredTheme();

  initialize(): void {
    this.apply();
  }

  get current(): Theme {
    return this.theme;
  }

  toggle(origin?: HTMLElement): Theme {
    this.theme = this.theme === "light" ? "dark" : "light";
    try {
      window.localStorage.setItem(appConfig.theme.storageKey, this.theme);
    } catch {
      // Theme selection still works for this session when storage is unavailable.
    }
    const documentWithTransitions = document as ViewTransitionDocument;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (
      !origin ||
      reduceMotion ||
      !documentWithTransitions.startViewTransition
    ) {
      this.apply();
      return this.theme;
    }

    const rect = origin.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    const transition = documentWithTransitions.startViewTransition(() =>
      this.apply()
    );
    void transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0 at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: Utils.toMilliseconds(
              gameConfig.visualEffects.themeTransition.duration
            ),
            easing: gameConfig.visualEffects.themeTransition.easing,
            pseudoElement: "::view-transition-new(root)",
          }
        );
      })
      .catch(() => undefined);
    return this.theme;
  }

  private apply(): void {
    document.documentElement.dataset.theme = this.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", appConfig.theme.colors[this.theme]);
  }
}

export const themeManager = new ThemeManager();
