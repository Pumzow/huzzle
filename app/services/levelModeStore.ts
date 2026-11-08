import { appConfig } from "../config/appConfig";
import { mainMenuSceneConfig } from "../config/scenes/mainMenuSceneConfig";
import type { LevelMode } from "../types/levelModeTypes";
import { offlineLevelStore } from "./offlineLevelStore";
import { storage as gameStorage } from "./storage";

type ModeStorage = Pick<Storage, "getItem" | "setItem">;

type CasualProgress = {
  readonly currentLevel: number;
};

type ModeConfig = {
  readonly default: LevelMode;
  readonly challengeUnlock: {
    readonly enabled: boolean;
    readonly requiredCasualLevels: number;
  };
};

function isLevelMode(value: unknown): value is LevelMode {
  return value === "casual" || value === "challenge";
}

export class LevelModeStore {
  private mode: LevelMode;
  private howToPlaySeen = false;
  private challengeUnlockNoticeSeen = false;

  constructor(
    private readonly storage: ModeStorage | null = gameStorage.local,
    private readonly casualProgress: CasualProgress = offlineLevelStore,
    private readonly config: ModeConfig = mainMenuSceneConfig.modes,
  ) {
    this.mode = this.readMode();
    this.howToPlaySeen = this.readFlag(
      appConfig.levels.howToPlaySeenStorageKey,
    );
    this.challengeUnlockNoticeSeen = this.readFlag(
      appConfig.levels.challengeUnlockNoticeSeenStorageKey,
    );
    if (this.mode === "challenge" && !this.challengeUnlocked) {
      this.mode = "casual";
    }
  }

  initialize(): void {
    this.applyMode();
  }

  get current(): LevelMode {
    if (this.mode === "challenge" && !this.challengeUnlocked) {
      this.mode = "casual";
      this.persistMode();
    }
    return this.mode;
  }

  get requiredCasualLevels(): number {
    return this.config.challengeUnlock.enabled
      ? Math.max(0, Math.trunc(this.config.challengeUnlock.requiredCasualLevels))
      : 0;
  }

  get completedCasualLevels(): number {
    return Math.max(0, Math.trunc(this.casualProgress.currentLevel));
  }

  get challengeUnlocked(): boolean {
    return !this.config.challengeUnlock.enabled ||
      this.completedCasualLevels >= this.requiredCasualLevels;
  }

  get challengeUnlockProgress(): number {
    return Math.min(this.completedCasualLevels, this.requiredCasualLevels);
  }

  select(mode: LevelMode): boolean {
    if (mode === "challenge" && !this.challengeUnlocked) return false;
    this.mode = mode;
    this.persistMode();
    this.applyMode();
    return true;
  }

  get hasSeenHowToPlay(): boolean {
    return this.howToPlaySeen;
  }

  markHowToPlaySeen(): void {
    this.howToPlaySeen = true;
    this.writeFlag(appConfig.levels.howToPlaySeenStorageKey);
  }

  get hasSeenChallengeUnlockNotice(): boolean {
    return this.challengeUnlockNoticeSeen;
  }

  get shouldShowChallengeUnlockNotice(): boolean {
    return this.config.challengeUnlock.enabled &&
      this.challengeUnlocked &&
      !this.hasSeenChallengeUnlockNotice;
  }

  markChallengeUnlockNoticeSeen(): void {
    this.challengeUnlockNoticeSeen = true;
    this.writeFlag(appConfig.levels.challengeUnlockNoticeSeenStorageKey);
  }

  private readMode(): LevelMode {
    try {
      const stored = this.storage?.getItem(appConfig.levels.modeStorageKey);
      if (isLevelMode(stored)) return stored;
    } catch {
      // Use the configured default when local storage is unavailable.
    }
    return this.config.default;
  }

  private persistMode(): void {
    try {
      this.storage?.setItem(appConfig.levels.modeStorageKey, this.mode);
    } catch {
      // The selected mode remains active for this session.
    }
  }

  private readFlag(key: string): boolean {
    try {
      return this.storage?.getItem(key) === "true";
    } catch {
      return false;
    }
  }

  private writeFlag(key: string): void {
    try {
      this.storage?.setItem(key, "true");
    } catch {
      // The panel can still be dismissed for the active session.
    }
  }

  private applyMode(): void {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.gameMode = this.mode;
  }
}

export const levelModeStore = new LevelModeStore();
