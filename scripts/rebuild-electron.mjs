import { rebuild } from "@electron/rebuild";
import { createRequire } from "node:module";
import { mkdir, writeFile, symlink, rm, realpath } from "node:fs/promises";
import { join, dirname } from "node:path";
const require = createRequire(import.meta.url);
const target = await realpath(
  dirname(require.resolve("sqlite-electron/package.json")),
);
const stage = join(process.cwd(), "node_modules", ".apprentice-electron-build");
await rm(stage, { recursive: true, force: true });
await mkdir(join(stage, "node_modules"), { recursive: true });
await writeFile(
  join(stage, "package.json"),
  JSON.stringify({
    name: "apprentice-native-electron",
    version: "1.0.0",
    dependencies: {
      "better-sqlite3": require("sqlite-electron/package.json").version,
    },
  }),
);
await symlink(target, join(stage, "node_modules", "better-sqlite3"), "dir");
await rebuild({
  buildPath: stage,
  electronVersion: require("electron/package.json").version,
  force: true,
  onlyModules: ["better-sqlite3"],
});
await rm(stage, { recursive: true, force: true });
console.log(
  "Rebuilt ONLY the dedicated Electron SQLite copy; Node CLI copy unchanged.",
);
