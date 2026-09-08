import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("dist", { recursive: true });
const options = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  packages: "external",
  sourcemap: true,
  logLevel: "warning",
};
await Promise.all([
  build({
    ...options,
    entryPoints: ["apps/desktop/src/main/index.ts"],
    outfile: "dist/main.cjs",
  }),
  build({
    ...options,
    entryPoints: ["apps/desktop/src/preload/index.ts"],
    outfile: "dist/preload.cjs",
  }),
  build({
    ...options,
    entryPoints: ["apps/desktop/src/main/worker.ts"],
    outfile: "dist/worker.cjs",
  }),
  build({
    ...options,
    entryPoints: ["apps/cli/src/index.ts"],
    outfile: "dist/cli.cjs",
  }),
]);
console.log("Built desktop, sandboxed preload, coordinator worker and CLI.");
