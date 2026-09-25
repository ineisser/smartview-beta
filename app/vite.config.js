import { writeFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const buildId = process.env.VITE_BUILD_ID || `${Date.now().toString(36)}`;

function versionFile() {
  const payload = JSON.stringify({ v: buildId });
  return {
    name: "app-version-file",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/version.json")) {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(payload);
          return;
        }
        next();
      });
    },
    writeBundle(output) {
      const dir = output.dir || path.resolve("dist");
      writeFileSync(path.join(dir, "version.json"), payload);
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(buildId),
  },
  plugins: [react(), versionFile()],
});
