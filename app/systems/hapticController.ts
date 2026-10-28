import { Capacitor } from "@capacitor/core";
import { Haptics } from "@capacitor/haptics";
import { HapticController, toMilliseconds } from "@pumzow/game-engine";
import { appConfig } from "../config/appConfig";
import { storage } from "../services/storage";
import { deviceCapabilities } from "../utils/deviceCapabilities";

export const hapticController = new HapticController({
  initiallyEnabled: appConfig.haptics.initiallyEnabled,
  storageKey: appConfig.haptics.storageKey,
  storage: storage.local,
  isAvailable: () => deviceCapabilities.isNativeDevice() || Capacitor.isNativePlatform(),
  vibrate: ({ duration }) => deviceCapabilities.isSimulatedNativeDevice()
    ? Promise.resolve(
        console.info(`[Debug Haptics] ${duration} seconds`),
      )
    : Haptics.vibrate({ duration: toMilliseconds(duration) }),
});
