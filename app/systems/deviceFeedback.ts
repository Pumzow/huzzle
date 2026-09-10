import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { appConfig } from "../config/appConfig";
import { gameConfig } from "../config/gameConfig";

export type DeviceImpactStyle = "light" | "medium" | "heavy";

const impactStyles: Record<DeviceImpactStyle, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
};

type DeviceFeedbackDependencies = {
  isNativePlatform: () => boolean;
  impact: (style: ImpactStyle) => Promise<void>;
  delay: (milliseconds: number) => Promise<void>;
  initialEnabled: () => boolean;
  persistEnabled: (enabled: boolean) => void;
};

export class DeviceFeedback {
  private readonly dependencies: DeviceFeedbackDependencies;
  private enabled: boolean;

  constructor(dependencies: Partial<DeviceFeedbackDependencies> = {}) {
    this.dependencies = {
      isNativePlatform: () => Capacitor.isNativePlatform(),
      impact: (style) => Haptics.impact({ style }),
      delay: (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds)),
      initialEnabled: readStoredEnabled,
      persistEnabled,
      ...dependencies,
    };
    this.enabled = this.dependencies.initialEnabled();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  toggleEnabled(): boolean {
    this.enabled = !this.enabled;
    this.dependencies.persistEnabled(this.enabled);
    if (this.enabled) void this.impact("light");
    return this.enabled;
  }

  async impact(style: DeviceImpactStyle): Promise<void> {
    if (!this.enabled || !this.dependencies.isNativePlatform()) return;
    await this.dependencies.impact(impactStyles[style]).catch(() => undefined);
  }

  connection(connectedTileCount: number): Promise<void> {
    const feedback = gameConfig.deviceFeedback;
    const style = connectedTileCount >= feedback.largeConnectionMinimumTiles
      ? feedback.largeConnectionImpact
      : feedback.connectionImpact;
    return this.impact(style);
  }

  async completion(perfect: boolean): Promise<void> {
    const feedback = gameConfig.deviceFeedback;
    await this.impact(feedback.completionImpact);
    if (!perfect || !this.enabled || !this.dependencies.isNativePlatform()) return;
    await this.dependencies.delay(feedback.perfectCompletionDelayMs);
    await this.impact(feedback.perfectCompletionSecondImpact);
  }
}

function readStoredEnabled(): boolean {
  if (typeof window === "undefined") return appConfig.haptics.initiallyEnabled;
  try {
    const value = window.localStorage.getItem(appConfig.haptics.storageKey);
    if (value === "true" || value === "false") return value === "true";
  } catch {
    // Use the configured default when storage is unavailable.
  }
  return appConfig.haptics.initiallyEnabled;
}

function persistEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(appConfig.haptics.storageKey, String(enabled));
  } catch {
    // The preference still applies to the current session when storage is unavailable.
  }
}

export const deviceFeedback = new DeviceFeedback();
