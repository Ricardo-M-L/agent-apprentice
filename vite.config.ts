import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig({
  root: "apps/desktop/src/renderer",
  base: "./",
  plugins: [react(), tailwind()],
  build: { outDir: "../../../../dist/renderer", emptyOutDir: true },
  server: { host: "127.0.0.1" },
});
