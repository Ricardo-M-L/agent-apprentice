import { _electron as electron } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
const executablePath =
  process.env.APPRENTICE_PACKAGED_APP ??
  join(
    process.cwd(),
    process.arch === "arm64"
      ? "release/mac-arm64/Agent Apprentice.app/Contents/MacOS/Agent Apprentice"
      : "release/mac/Agent Apprentice.app/Contents/MacOS/Agent Apprentice",
  );
const dir = await mkdtemp(join(tmpdir(), "apprentice-packaged-"));
let app;
try {
  app = await electron.launch({
    executablePath,
    args: [],
    env: { ...process.env, APPRENTICE_DATA: dir },
  });
  let page = await app.firstWindow();
  await page
    .getByRole("heading", { name: "A little guidance. A lasting capability." })
    .waitFor();
  await page.getByRole("button", { name: "Start simulated lesson" }).click();
  await page.getByText("SIMULATED · completed", { exact: true }).waitFor();
  const first = await page.evaluate(() =>
    window.apprentice.command({ type: "snapshot" }),
  );
  assert.equal(first.capabilities.length, 1);
  await app.close();
  app = await electron.launch({
    executablePath,
    args: [],
    env: { ...process.env, APPRENTICE_DATA: dir },
  });
  page = await app.firstWindow();
  await page
    .getByRole("heading", { name: "A little guidance. A lasting capability." })
    .waitFor();
  const second = await page.evaluate(() =>
    window.apprentice.command({ type: "snapshot" }),
  );
  assert.equal(second.capabilities.length, 1);
  assert.equal(second.sessions[0].status, "completed");
  console.log(
    "PASS: packaged application startup, Electron SQLite, teaching, archive, restart persistence. SIMULATION ONLY.",
  );
} finally {
  if (app) await app.close();
  await rm(dir, { recursive: true, force: true });
}
