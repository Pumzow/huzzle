import { expect, test } from "bun:test";
import {
  deviceCapabilities,
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
  deviceCapabilities.setDebugProfile("mobile-web");
  expect(deviceCapabilities.profile).toBe("mobile-web");
  expect(deviceCapabilities.isTouchDevice()).toBe(true);
  expect(deviceCapabilities.isNativeDevice()).toBe(false);

  deviceCapabilities.setDebugProfile("android");
  expect(deviceCapabilities.isTouchDevice()).toBe(true);
  expect(deviceCapabilities.isNativeDevice()).toBe(true);

  deviceCapabilities.setDebugProfile("actual");
});

test("applies configurable component visibility to simulated platforms", () => {
  deviceCapabilities.setDebugProfile("desktop");
  expect(deviceCapabilities.uiPlatform).toBe("desktop");
  expect(deviceCapabilities.isVisible({ enabled: true })).toBe(true);
  expect(deviceCapabilities.isVisible({ enabled: true, visibleOn: ["android"] })).toBe(false);

  deviceCapabilities.setDebugProfile("mobile-web");
  expect(deviceCapabilities.uiPlatform).toBe("mobile-web");
  expect(deviceCapabilities.isVisible({ enabled: true, visibleOn: ["android"] })).toBe(false);

  deviceCapabilities.setDebugProfile("android");
  expect(deviceCapabilities.uiPlatform).toBe("android");
  expect(deviceCapabilities.isVisible({ enabled: true, visibleOn: ["android"] })).toBe(true);
  expect(deviceCapabilities.isVisible({ enabled: false, visibleOn: ["android"] })).toBe(false);

  deviceCapabilities.setDebugProfile("actual");
});
