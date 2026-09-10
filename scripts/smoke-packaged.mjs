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
  console.log(
    "Default credential path:",
    await app.evaluate(({ app }) =>
      [app.getPath("appData"), app.getName(), "credentials.enc.json"].join("/"),
    ),
  );
  await page.getByRole("button", { name: /^(Settings|设置)$/ }).click();
  await page
    .getByRole("combobox", { name: /^(Language|界面语言)$/ })
    .selectOption("en");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("heading", { name: "A little guidance. A lasting capability." })
    .waitFor();
  await page.getByRole("button", { name: "Start simulated lesson" }).click();
  await page.getByText("SIMULATED · completed", { exact: true }).waitFor();
  const first = await page.evaluate(() =>
    window.apprentice.command({ type: "snapshot" }),
  );
  assert.equal(first.capabilities.length, 1);
  const credentialStatus = await page.evaluate(() =>
    window.apprentice.credentials({ type: "status" }),
  );
  assert.equal(
    credentialStatus.available,
    true,
    "Packaged system encryption must be available",
  );
  await page.evaluate(() =>
    window.apprentice.credentials({
      type: "save",
      provider: {
        id: "packaged-key",
        name: "Packaged key",
        kind: "anthropic",
        model: "test",
        baseUrl: "https://example.test",
      },
      key: "dummy-packaged-only",
    }),
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("combobox", { name: "Language" }).selectOption("zh-CN");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByText("模拟 · 已完成", { exact: true }).waitFor();
  await app.close();
  app = await electron.launch({
    executablePath,
    args: [],
    env: { ...process.env, APPRENTICE_DATA: dir },
  });
  page = await app.firstWindow();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  assert.equal(
    await page.getByRole("combobox", { name: "界面语言" }).inputValue(),
    "zh-CN",
  );
  await page.getByRole("combobox", { name: "界面语言" }).selectOption("en");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("heading", { name: "A little guidance. A lasting capability." })
    .waitFor();
  const second = await page.evaluate(() =>
    window.apprentice.command({ type: "snapshot" }),
  );
  assert.equal(second.capabilities.length, 1);
  assert.equal(second.sessions[0].status, "completed");
  const saved = await page.evaluate(() =>
    window.apprentice.credentials({ type: "status" }),
  );
  assert(saved.saved.includes("packaged-key"));
  assert(!JSON.stringify(second).includes("dummy-packaged-only"));
  await page.evaluate(() =>
    window.apprentice.credentials({ type: "remove", id: "packaged-key" }),
  );
  console.log(
    "PASS: packaged startup, SQLite, teaching, archive, settings, bilingual switching and restart persistence. SIMULATION ONLY.",
  );
} finally {
  if (app) await app.close();
  await rm(dir, { recursive: true, force: true });
}
