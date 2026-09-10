import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
test("desktop teaches, archives, disables, restores and compares without exposing Node", async () => {
  const dir = await mkdtemp(join(tmpdir(), "apprentice-e2e-"));
  let app = await electron.launch({
    args: ["."],
    env: { ...process.env, APPRENTICE_DATA: dir },
  });
  try {
    let page = await app.firstWindow();
    await page.getByRole("button", { name: /^(Settings|设置)$/ }).click();
    await page
      .getByRole("combobox", { name: /^(Language|界面语言)$/ })
      .selectOption("en");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: "A little guidance. A lasting capability.",
      }),
    ).toBeVisible();
    expect(await page.evaluate(() => typeof (window as any).require)).toBe(
      "undefined",
    );
    await page.getByRole("button", { name: "Start simulated lesson" }).click();
    await expect(
      page.getByText("SIMULATED · completed", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/learning-room.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: /^Capabilities/ }).click();
    await expect(
      page.getByRole("heading", {
        name: "The TypeScript Maintainer · teaching",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Disable", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Enable", exact: true }),
    ).toBeVisible();
    await app.close();
    app = await electron.launch({
      args: ["."],
      env: { ...process.env, APPRENTICE_DATA: dir },
    });
    page = await app.firstWindow();
    await page.getByRole("button", { name: /^Capabilities/ }).click();
    await expect(
      page.getByRole("button", { name: "Enable", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Experiments", exact: true })
      .click();
    await page.getByRole("button", { name: "Run four-arm comparison" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(5);
    await expect(
      page.locator("tbody tr").filter({ hasText: "completed" }),
    ).toHaveCount(5);
    await page.getByRole("button", { name: "My agents", exact: true }).click();
    await page.getByRole("button", { name: "Add agent", exact: true }).click();
    await page.getByRole("textbox", { name: "ID", exact: true }).fill("local");
    await page
      .getByRole("textbox", { name: "DISPLAY NAME", exact: true })
      .fill("Local model");
    await page
      .getByRole("textbox", { name: "MODEL", exact: true })
      .fill("example-model");
    await page
      .getByRole("textbox", { name: "BASE URL", exact: true })
      .fill("http://localhost:11434/v1");
    await page
      .getByRole("combobox", { name: "Authentication" })
      .selectOption("env");
    await page
      .getByRole("textbox", { name: "KEY ENVIRONMENT VARIABLE", exact: true })
      .fill("EXPLICIT_TEST_KEY");
    await page.getByRole("button", { name: "Save agent", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Local model", exact: true }),
    ).toBeVisible();
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
