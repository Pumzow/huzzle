import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.DRYGON_API_PROXY_TARGET || "http://localhost:3000";

  return {
    base: "/huzzle/",
    server: {
      proxy: {
        "/login": apiProxyTarget,
        "/register": apiProxyTarget,
        "/auth": apiProxyTarget,
        "/logout": apiProxyTarget,
        "/games": apiProxyTarget,
      },
    },
  };
});
