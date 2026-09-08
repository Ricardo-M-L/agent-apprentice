import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
const inventory = JSON.parse(
  execFileSync("pnpm", ["licenses", "list", "--prod", "--json"], {
    encoding: "utf8",
    maxBuffer: 4e6,
  }),
);
const lines = [
  "# Third-party production dependencies",
  "",
  "Generated from the lockfile. This lists package licenses, not a legal opinion. Dependencies retain their own notices; Electron/Chromium runtime notices accompany their distributions. Development tools are not included below.",
  "",
  "| Package | Version | License |",
  "| --- | --- | --- |",
];
for (const [license, packages] of Object.entries(inventory)) {
  for (const p of packages) {
    lines.push(`| ${p.name} | ${p.versions.join(", ")} | ${license} |`);
  }
}
await writeFile("docs/THIRD_PARTY_NOTICES.md", lines.join("\n") + "\n");
