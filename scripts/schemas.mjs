import { build } from "esbuild";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { zodToJsonSchema } from "zod-to-json-schema";
const require = createRequire(import.meta.url);
await mkdir("schemas", { recursive: true });
await build({
  entryPoints: ["packages/protocol/index.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
  outfile: "node_modules/.apprentice-schema.cjs",
});
const protocol = require("../node_modules/.apprentice-schema.cjs");
for (const [name, key] of [
  ["capability", "CapabilitySchema"],
  ["command", "CommandSchema"],
  ["teacher-request", "TeachRequestSchema"],
])
  await writeFile(
    `schemas/${name}.schema.json`,
    JSON.stringify(
      zodToJsonSchema(protocol[key], { name, target: "jsonSchema7" }),
      null,
      2,
    ) + "\n",
  );
await rm("node_modules/.apprentice-schema.cjs");
