import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
test("native secure API keys persist, replace and remove while model and remote teacher selectors stay separate", async () => {
  const dir = await mkdtemp(join(tmpdir(), "apprentice-keys-"));
  const launch = () =>
    electron.launch({
      args: ["."],
      env: { ...process.env, APPRENTICE_DATA: dir },
    });
  let app = await launch();
  try {
    let page = await app.firstWindow();
    await page.getByRole("button", { name: /^(Settings|设置)$/ }).click();
    await page
      .getByRole("combobox", { name: /^(Language|界面语言)$/ })
      .selectOption("en");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: "My agents", exact: true }).click();
    await page.getByRole("button", { name: "Add agent", exact: true }).click();
    await expect(page.locator("option[value=anthropic]")).toHaveCount(1);
    await expect(page.locator("option[value=remote-teacher]")).toHaveCount(0);
    await page.getByLabel("ID", { exact: true }).fill("secure-model");
    await page.getByLabel("DISPLAY NAME").fill("Secure model");
    await page.getByLabel("PROTOCOL").selectOption("anthropic");
    await page.getByLabel("MODEL", { exact: true }).fill("claude-test");
    await page.getByLabel("BASE URL").fill("https://example.test");
    await page
      .getByLabel("API key", { exact: true })
      .fill("dummy-e2e-secret-123456");
    await expect(page.getByLabel("API key", { exact: true })).toHaveAttribute(
      "type",
      "password",
    );
    const status = await page.evaluate(() =>
      window.apprentice.credentials({ type: "status" }),
    );
    if (!status.available) {
      await page
        .getByRole("button", { name: "Save agent", exact: true })
        .click();
      await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
        "unavailable",
      );
      return;
    }
    await page.getByRole("button", { name: "Save agent", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    let snap = await page.evaluate(() =>
      window.apprentice.command({ type: "snapshot" }),
    );
    const ref = snap.providers.find(
      (p: any) => p.id === "secure-model",
    ).credentialRef;
    expect(ref).toBeTruthy();
    expect(JSON.stringify(snap)).not.toContain("dummy-e2e-secret");
    const raw = await readFile(join(dir, "credentials.enc.json"), "utf8");
    expect(raw).not.toContain("dummy-e2e-secret");
    expect((await stat(join(dir, "credentials.enc.json"))).mode & 0o777).toBe(
      0o600,
    );
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await page.getByRole("button", { name: "My agents", exact: true }).click();
    const card = page.locator(".agent-card").filter({
      has: page.getByRole("heading", { name: "Secure model", exact: true }),
    });
    await expect(
      card.getByText("Securely saved", { exact: true }),
    ).toBeVisible();
    await card.getByRole("button", { name: "Edit connection" }).click();
    await expect(page.getByLabel("BASE URL")).toHaveValue(
      "https://example.test",
    );
    await expect(page.getByLabel("API key", { exact: true })).toHaveValue("");
    await page.getByLabel("API key", { exact: true }).fill("dummy-replacement");
    await page.getByRole("button", { name: "Save agent", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    snap = await page.evaluate(() =>
      window.apprentice.command({ type: "snapshot" }),
    );
    expect(
      snap.providers.find((p: any) => p.id === "secure-model").credentialRef,
    ).not.toBe(ref);
    expect(
      await readFile(join(dir, "credentials.enc.json"), "utf8"),
    ).not.toContain(ref);
    await card.getByRole("button", { name: "Remove saved key" }).click();
    await expect(
      card.getByText("Not configured", { exact: true }),
    ).toBeVisible();
    expect(await readFile(join(dir, "credentials.enc.json"), "utf8")).toBe(
      "{}",
    );
    await page.getByRole("button", { name: "Connect remote teacher" }).click();
    await expect(
      page.getByText("Remote teacher protocol — /v1/teach"),
    ).toBeVisible();
    await expect(page.locator("option[value=anthropic]")).toHaveCount(0);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
