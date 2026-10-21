/**
 * Build config for the HOSTED WEB DEMO only.
 *
 *   npx vite build --config vite.web.config.js   ->  build/web-demo/ (repo root, git-ignored)
 *
 * The desktop app keeps using vite.config.js + index.html + src/main.jsx,
 * which this file does not touch. The web build has its own entry
 * (web.html -> src/web/main.jsx) so none of the web-only code ends up in the
 * desktop bundle, and none of the camera/drone/auth pages end up on the site.
 */
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import fs from "fs"
import path from "path"

// The shared code builds its API url as `http://localhost:${BACKENDPORT}`.
// For the web build we pin that to a sentinel port that src/web/session.js
// rewrites to the site's own origin at runtime (the API is served from the
// same domain by Caddy).
export const WEB_SENTINEL_PORT = "1"

/** Ships web.html as index.html and copies only the favicon from public/. */
function webOutput() {
  let outDir = path.resolve(__dirname, "../../build/web-demo")
  return {
    name: "gbdc-web-output",
    configResolved(config) {
      outDir = config.build.outDir
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "favicon.svg",
        source: fs.readFileSync(path.resolve(__dirname, "public/favicon.svg")),
      })
    },
    closeBundle() {
      const from = path.resolve(__dirname, outDir, "web.html")
      if (fs.existsSync(from)) {
        fs.renameSync(from, path.resolve(__dirname, outDir, "index.html"))
      }
    },
  }
}

export default defineConfig({
  base: "./",
  plugins: [react(), webOutput()],
  envDir: "../../",
  envPrefix: ["VITE_", "BACKENDPORT"],
  define: {
    "import.meta.env.BACKENDPORT": JSON.stringify(WEB_SENTINEL_PORT),
  },
  // public/ holds ~60 MB of gesture tutorial videos that the web demo does not
  // use; leaving them out keeps bandwidth (and the AWS bill) down.
  publicDir: false,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../../build/web-demo"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "web.html"),
    },
  },
  server: { port: 3100 },
})
