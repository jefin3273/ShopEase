import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Silence Node-only module imported by some transitive deps in the browser
      // (e.g., rrweb-player -> fflate may reference worker_threads).
      // We alias it to an empty module so Vite doesn't warn in the client build.
      "worker_threads": path.resolve(__dirname, "./src/shims/empty.ts"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})