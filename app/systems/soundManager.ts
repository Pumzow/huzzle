import { SoundManager } from "@pumzow/game-engine";
import { appConfig } from "../config/appConfig";
import { storage } from "../services/storage";
import type { SoundChannel } from "../types/gameTypes";

export const soundManager = new SoundManager<SoundChannel>({
  defaultChannel: "sfx",
  channels: {
    soundtrack: {
      initiallyMuted: appConfig.soundtrack.initiallyMuted,
      storageKey: appConfig.soundtrack.storageKey,
    },
    sfx: {
      initiallyMuted: appConfig.sfx.initiallyMuted,
      storageKey: appConfig.sfx.storageKey,
    },
  },
  storage: storage.local,
});
