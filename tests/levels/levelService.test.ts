import { expect, test } from "bun:test";
import { loadLevelImage, loadRandomLevelImage } from "../../app/systems/levelService";

const levelsUrl = "https://example.test/levels.json";

test("rejects a missing level manifest URL", async () => {
  expect(loadLevelImage("", { mode: "sequence" })).rejects.toThrow(
    "Missing VITE_HUZZLE_LEVELS_URL in .env.local.",
  );
});

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

  const selected = await loadRandomLevelImage(levelsUrl, controller.signal, {
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
  const selected = await loadRandomLevelImage(levelsUrl, undefined, {
    random: () => 0,
    fetcher: async () => manifestResponse({ version: 3, levels: [{ imageFile: "images/one.png" }] }),
    preloadImage: async () => undefined,
  });

  expect(new URL(selected).searchParams.get("v")).toBe("3");
});

test("derives numbered WebP files from the simplified manifest", async () => {
  const selected = await loadRandomLevelImage(levelsUrl, undefined, {
    random: () => 0,
    fetcher: async () => manifestResponse({
      schemaVersion: 2,
      revision: 7,
      levels: [{ id: 0, imageId: 11255414 }],
    }),
    preloadImage: async () => undefined,
  });

  const selectedUrl = new URL(selected);
  expect(selectedUrl.pathname).toBe("/images/0.webp");
  expect(selectedUrl.searchParams.get("v")).toBe("7");
});

test("loads numbered levels in sequence and wraps after the last level", async () => {
  const dependencies = {
    fetcher: async () => manifestResponse({
      revision: 8,
      levels: [
        { id: 0, imageId: 11255414 },
        { id: 1, imageId: 1551440 },
        { id: 2, imageId: 12004888 },
      ],
    }),
    preloadImage: async () => undefined,
  };

  const first = await loadLevelImage(
    levelsUrl,
    { mode: "sequence" },
    undefined,
    dependencies,
  );
  const second = await loadLevelImage(
    levelsUrl,
    { mode: "sequence", previousLevelId: first.id },
    undefined,
    dependencies,
  );
  const wrapped = await loadLevelImage(
    levelsUrl,
    { mode: "sequence", previousLevelId: 2 },
    undefined,
    dependencies,
  );

  expect({ id: first.id, path: new URL(first.imageUrl).pathname }).toEqual({ id: 0, path: "/images/0.webp" });
  expect({ id: second.id, path: new URL(second.imageUrl).pathname }).toEqual({ id: 1, path: "/images/1.webp" });
  expect({ id: wrapped.id, path: new URL(wrapped.imageUrl).pathname }).toEqual({ id: 0, path: "/images/0.webp" });
});

test("selects a different image for the next level when one is available", async () => {
  const selected = await loadRandomLevelImage(levelsUrl, undefined, {
    random: () => 0,
    fetcher: async () => manifestResponse({
      levels: [
        { imageFile: "images/first.jpg" },
        { imageFile: "images/second.jpg" },
      ],
    }),
    preloadImage: async () => undefined,
  }, "https://example.test/images/first.jpg");

  expect(new URL(selected).pathname).toBe("/images/second.jpg");
});

test("rejects failed and empty manifests", async () => {
  await expect(loadRandomLevelImage(levelsUrl, undefined, {
    fetcher: async () => manifestResponse({}, 503),
    preloadImage: async () => undefined,
  })).rejects.toThrow("Unable to load puzzle levels (503).");

  await expect(loadRandomLevelImage(levelsUrl, undefined, {
    fetcher: async () => manifestResponse({ levels: [] }),
    preloadImage: async () => undefined,
  })).rejects.toThrow("contains no images");
});

test("surfaces image preload failures so the scene can use its fallback", async () => {
  await expect(loadRandomLevelImage(levelsUrl, undefined, {
    random: () => 0,
    fetcher: async () => manifestResponse({ levels: [{ imageFile: "images/broken.jpg" }] }),
    preloadImage: async () => { throw new Error("image unavailable"); },
  })).rejects.toThrow("image unavailable");
});
