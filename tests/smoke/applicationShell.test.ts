import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

test("defines the static Huzzle application shell", async () => {
  const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");

  expect(html).toContain("<title>Huzzle</title>");
  expect(html).toContain('<div id="root"></div>');
  expect(html).toContain('<script type="module" src="/app/index.ts"></script>');
});

test("keeps the application free of React runtime dependencies", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

  expect(dependencies).not.toHaveProperty("react");
  expect(dependencies).not.toHaveProperty("react-dom");
});
