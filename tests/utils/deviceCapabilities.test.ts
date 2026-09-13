import { expect, test } from "bun:test";
import {
  getDeviceProfile,
  getUiPlatform,
  isNativeDevice,
  isTouchDevice,
  isVisibleOnCurrentPlatform,
  setDebugDeviceProfile,
  shouldAnimateThemeTransition,
} from "../../app/utils/deviceCapabilities";

test("keeps the theme transition on non-touch desktop devices", () => {
  expect(shouldAnimateThemeTransition(false, false, 0)).toBe(true);
});

test("switches themes atomically on coarse-pointer mobile devices", () => {
  expect(shouldAnimateThemeTransition(false, true, 5)).toBe(false);
});

test("switches themes atomically on touch devices even when pointer media queries are inaccurate", () => {
  expect(shouldAnimateThemeTransition(false, false, 1)).toBe(false);
});

test("honors reduced-motion preferences", () => {
  expect(shouldAnimateThemeTransition(true, false, 0)).toBe(false);
});

test("supports simulated mobile and Android debug profiles", () => {
  setDebugDeviceProfile("mobile-web");
  expect(getDeviceProfile()).toBe("mobile-web");
  expect(isTouchDevice()).toBe(true);
  expect(isNativeDevice()).toBe(false);

  setDebugDeviceProfile("android");
  expect(isTouchDevice()).toBe(true);
  expect(isNativeDevice()).toBe(true);

  setDebugDeviceProfile("actual");
});

test("applies configurable component visibility to simulated platforms", () => {
  setDebugDeviceProfile("desktop");
  expect(getUiPlatform()).toBe("desktop");
  expect(isVisibleOnCurrentPlatform({ enabled: true })).toBe(true);
  expect(isVisibleOnCurrentPlatform({ enabled: true, visibleOn: ["android"] })).toBe(false);

  setDebugDeviceProfile("mobile-web");
  expect(getUiPlatform()).toBe("mobile-web");
  expect(isVisibleOnCurrentPlatform({ enabled: true, visibleOn: ["android"] })).toBe(false);

  setDebugDeviceProfile("android");
  expect(getUiPlatform()).toBe("android");
  expect(isVisibleOnCurrentPlatform({ enabled: true, visibleOn: ["android"] })).toBe(true);
  expect(isVisibleOnCurrentPlatform({ enabled: false, visibleOn: ["android"] })).toBe(false);

  setDebugDeviceProfile("actual");
});
