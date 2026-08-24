import { expect, test } from "bun:test";
import { loadRandomLevelImage } from "../../app/systems/levelService";

const levelsUrl = "https://example.test/levels.json";
const imageBaseUrl = "https://example.test/images/";

function manifestResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("selects and preloads a deterministic manifest image", async () => {
  const requests: Array<{ input: string; init?: RequestInit }> = [];
  const preloaded: string[] = [];
  const controller = new AbortController();

  const selected = await loadRandomLevelImage(levelsUrl, imageBaseUrl, controller.signal, {
    random: () => 0.75,
    fetcher: async (input, init) => {
      requests.push({ input, init });
      return manifestResponse({
        generatedAt: "2026-08-18T19:58:13.520Z",
        levels: [
          { imageFile: "images/first.jpg" },
          { imageFile: "images/second image.jpg" },
        ],
      });
    },
    preloadImage: async (src) => { preloaded.push(src); },
  });

  const selectedUrl = new URL(selected);
  expect(selectedUrl.pathname).toBe("/images/second%20image.jpg");
  expect(selectedUrl.searchParams.get("v")).toBe("2026-08-18T19:58:13.520Z");
  expect(preloaded).toEqual([selected]);
  expect(requests).toHaveLength(1);
  expect(requests[0].input).toBe(levelsUrl);
  expect(requests[0].init).toMatchObject({ cache: "no-cache", signal: controller.signal });
});

test("uses a numeric manifest version when no generation timestamp exists", async () => {
  const selected = await loadRandomLevelImage(levelsUrl, imageBaseUrl, undefined, {
    random: () => 0,
    fetcher: async () => manifestResponse({ version: 3, levels: [{ imageFile: "images/one.png" }] }),
    preloadImage: async () => undefined,
  });

  expect(new URL(selected).searchParams.get("v")).toBe("3");
});

test("rejects failed and empty manifests", async () => {
  await expect(loadRandomLevelImage(levelsUrl, imageBaseUrl, undefined, {
    fetcher: async () => manifestResponse({}, 503),
    preloadImage: async () => undefined,
  })).rejects.toThrow("Unable to load puzzle levels (503).");

  await expect(loadRandomLevelImage(levelsUrl, imageBaseUrl, undefined, {
    fetcher: async () => manifestResponse({ levels: [] }),
    preloadImage: async () => undefined,
  })).rejects.toThrow("contains no images");
});

test("surfaces image preload failures so the scene can use its fallback", async () => {
  await expect(loadRandomLevelImage(levelsUrl, imageBaseUrl, undefined, {
    random: () => 0,
    fetcher: async () => manifestResponse({ levels: [{ imageFile: "images/broken.jpg" }] }),
    preloadImage: async () => { throw new Error("image unavailable"); },
  })).rejects.toThrow("image unavailable");
});
