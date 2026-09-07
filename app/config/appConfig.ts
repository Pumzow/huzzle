import { Theme } from "../types/gameTypes";

type ThemePreference = Theme | "system";

const googleTestAds = {
  bannerId: "ca-app-pub-3940256099942544/9214589741",
  interstitialId: "ca-app-pub-3940256099942544/1033173712",
};

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const appConfig = {
  debug: {
    enabled:
      import.meta.env.DEV || import.meta.env.VITE_DEBUG_TOOLS === "true",
  },
  levels: {
    manifestUrl: import.meta.env.VITE_HUZZLE_LEVELS_URL?.trim() ?? "",
    attemptStorageKey: "huzzle-level-attempt",
  },
  platform: {
    apiBaseUrl: (import.meta.env.VITE_DRYGON_API_URL ?? "").replace(/\/$/, ""),
    sessionStorageKey: "huzzle-platform-session",
    progressStorageKey: "huzzle-level-progress",
  },
  ads: {
    enabled: import.meta.env.VITE_ADS_ENABLED !== "false",
    android: {
      bannerId:
        import.meta.env.VITE_ADMOB_ANDROID_BANNER_ID?.trim() ||
        googleTestAds.bannerId,
      interstitialId:
        import.meta.env.VITE_ADMOB_ANDROID_INTERSTITIAL_ID?.trim() ||
        googleTestAds.interstitialId,
      testing: import.meta.env.VITE_ADS_TESTING !== "false",
    },
    interstitial: {
      everyCompletedLevels: positiveInteger(
        import.meta.env.VITE_AD_INTERSTITIAL_EVERY_LEVELS,
        1
      ),
    },
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
