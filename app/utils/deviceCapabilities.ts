import { Capacitor } from "@capacitor/core";

export type DeviceProfile = "actual" | "desktop" | "mobile-web" | "android";
export type UiPlatform = "desktop" | "mobile-web" | "android";

export type PlatformVisibleConfig = {
  enabled: boolean;
  visibleOn?: readonly UiPlatform[];
};

export class DeviceCapabilities {
  private debugProfile: DeviceProfile = "actual";

  setDebugProfile(profile: DeviceProfile): void {
    this.debugProfile = profile;
  }

  get profile(): DeviceProfile {
    return this.debugProfile;
  }

  isTouchDevice(): boolean {
    return this.debugProfile === "mobile-web" || this.debugProfile === "android"
      ? true
      : this.debugProfile === "desktop"
        ? false
        : window.matchMedia("(pointer: coarse)").matches || globalThis.navigator.maxTouchPoints > 0;
  }

  isNativeDevice(): boolean {
    return this.debugProfile === "android";
  }

  isSimulatedNativeDevice(): boolean {
    return this.debugProfile === "android";
  }

  coarsePointer(): boolean {
    return this.debugProfile === "mobile-web" || this.debugProfile === "android"
      ? true
      : this.debugProfile === "desktop"
        ? false
        : window.matchMedia("(hover: none), (pointer: coarse)").matches;
  }

  maximumTouchPoints(): number {
    return this.isTouchDevice() ? 5 : 0;
  }

  get uiPlatform(): UiPlatform {
    if (this.debugProfile !== "actual") return this.debugProfile;
    if (Capacitor.getPlatform() === "android") return "android";
    return this.isTouchDevice() ? "mobile-web" : "desktop";
  }

  isVisible(config: PlatformVisibleConfig): boolean {
    return config.enabled && (
      config.visibleOn === undefined || config.visibleOn.includes(this.uiPlatform)
    );
  }
}

export const deviceCapabilities = new DeviceCapabilities();

export function shouldAnimateThemeTransition(
  reducedMotion: boolean,
  coarsePointer: boolean,
  maximumTouchPoints: number,
): boolean {
  return !reducedMotion && !coarsePointer && maximumTouchPoints === 0;
}
