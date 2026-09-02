import { Theme } from "../types/gameTypes";

type ThemePreference = Theme | "system";

export const appConfig = {
  levels: {
    manifestUrl: import.meta.env.VITE_HUZZLE_LEVELS_URL?.trim() ?? "",
    attemptStorageKey: "huzzle-level-attempt",
  },
  platform: {
    apiBaseUrl: (import.meta.env.VITE_DRYGON_API_URL ?? "").replace(/\/$/, ""),
    sessionStorageKey: "huzzle-platform-session",
    progressStorageKey: "huzzle-level-progress",
  },
  soundtrack: {
    enabled: true,
    file: "sounds/huzzle-soundtrack.wav",
    loop: true,
    initiallyMuted: false,
    storageKey: "huzzle-music-muted",
  },
  sfx: {
    initiallyMuted: false,
    storageKey: "huzzle-sfx-muted",
  },
  theme: {
    default: "system" as ThemePreference,
    storageKey: "huzzle-theme",
    colors: {
      light: "#f5f1e8",
      dark: "#101b1c",
    },
  },
} as const;

export function resolveAssetPath(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}
