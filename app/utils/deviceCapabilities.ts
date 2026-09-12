export type DeviceProfile = "actual" | "desktop" | "mobile-web" | "android";

let debugProfile: DeviceProfile = "actual";

export function setDebugDeviceProfile(profile: DeviceProfile): void {
  debugProfile = profile;
}

export function getDeviceProfile(): DeviceProfile {
  return debugProfile;
}

export function isTouchDevice(): boolean {
  return debugProfile === "mobile-web" || debugProfile === "android"
    ? true
    : debugProfile === "desktop"
      ? false
      : window.matchMedia("(pointer: coarse)").matches || globalThis.navigator.maxTouchPoints > 0;
}

export function isNativeDevice(): boolean {
  return debugProfile === "android";
}

export function isSimulatedNativeDevice(): boolean {
  return debugProfile === "android";
}

export function coarsePointer(): boolean {
  return debugProfile === "mobile-web" || debugProfile === "android"
    ? true
    : debugProfile === "desktop"
      ? false
      : window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

export function maximumTouchPoints(): number {
  return isTouchDevice() ? 5 : 0;
}

export function shouldAnimateThemeTransition(
  reducedMotion: boolean,
  coarsePointer: boolean,
  maximumTouchPoints: number,
): boolean {
  return !reducedMotion && !coarsePointer && maximumTouchPoints === 0;
}
