import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
test("settings switches all pages and remembers Chinese across reload and restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "apprentice-language-"));
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
      .selectOption("zh-CN");
    await expect(
      page.getByRole("dialog", { name: "设置", exact: true }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await page.getByRole("button", { name: "完成", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "我的 Agent", exact: true }).click();
    await page.getByRole("button", { name: "添加 Agent", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "接入 Agent" }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "ID", exact: true })
      .fill("bilingual-student");
    await page
      .getByRole("textbox", { name: "显示名称" })
      .fill("Custom 原始名字");
    await page.getByRole("combobox", { name: "接口协议" }).selectOption("demo");
    await page
      .getByRole("textbox", { name: "模型", exact: true })
      .fill("unchanged-model");
    await page.getByRole("button", { name: "保存 Agent" }).click();
    await expect(
      page.getByRole("heading", { name: "Custom 原始名字", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "老师档案", exact: true }).click();
    await page.getByRole("button", { name: "添加老师", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "教学范围" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "能力档案", exact: true }).click();
    await expect(
      page.getByText("记录你的 Agent 已掌握的方法", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "实验比较", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "运行四组对照实验" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "学习", exact: true }).click();
    await page
      .getByRole("button", { name: "开始模拟教学", exact: true })
      .click();
    await expect(
      page.getByText("模拟 · 已完成", { exact: true }),
    ).toBeVisible();
    const before = await page.evaluate(() =>
      window.apprentice.command({ type: "snapshot" }),
    );
    expect(
      before.providers.find((p: any) => p.id === "bilingual-student"),
    ).toMatchObject({
      name: "Custom 原始名字",
      kind: "demo",
      model: "unchanged-model",
    });
    expect(before.sessions[0].status).toBe("completed");
    expect(before.sessions[0].options.arm).toBe("teaching");
    await page.reload();
    await expect(
      page.getByRole("button", { name: "设置", exact: true }),
    ).toBeVisible();
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await page.getByRole("button", { name: "设置", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "界面语言" })).toHaveValue(
      "zh-CN",
    );
    await page.screenshot({ path: "test-results/settings-zh.png" });
    await page.getByRole("combobox", { name: "界面语言" }).selectOption("en");
    await expect(
      page.getByRole("dialog", { name: "Settings", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close dialog" }).click();
    await expect(
      page.getByText("SIMULATED · completed", { exact: true }),
    ).toBeVisible();
    const after = await page.evaluate(() =>
      window.apprentice.command({ type: "snapshot" }),
    );
    expect(after).toEqual(before);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Settings", exact: true }),
    ).toBeVisible();
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
