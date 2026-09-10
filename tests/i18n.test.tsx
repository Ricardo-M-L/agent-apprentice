// @vitest-environment happy-dom
import React from "react";
import { test, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { App } from "../apps/desktop/src/renderer/main";
import {
  useLanguage,
  languageKey,
  initialLocale,
  translate,
  eventMessage,
} from "../apps/desktop/src/renderer/i18n";
beforeEach(() => {
  localStorage.clear();
  useLanguage.setState({ locale: "en", persistenceError: false });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  useLanguage.setState({ locale: "en", persistenceError: false });
});
test("settings opens, translates pages and forms, persists language, and preserves provider values", async () => {
  const snapshot = {
    providers: [
      {
        id: "my-model",
        name: "My custom 模型",
        kind: "responses",
        model: "test-model",
        baseUrl: "https://example.test/v1",
        keyEnv: "CUSTOM_KEY",
      },
    ],
    teachers: [],
    sessions: [],
    capabilities: [],
  };
  const command = vi.fn(async (c: any) =>
    c.type === "snapshot"
      ? snapshot
      : c.type === "environment"
        ? { docker: false }
        : c.value,
  );
  window.apprentice = {
    command,
    credentials: async (c) =>
      c.type === "status"
        ? { available: true, saved: [], path: "/test/credentials.enc.json" }
        : c.type === "save"
          ? command({ type: "provider.save", value: c.provider })
          : true,
    onEvent: () => () => {},
  };
  render(<App />);
  await waitFor(() => expect(command).toHaveBeenCalled());
  const count = command.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(screen.getByRole("dialog").textContent).toContain("Language");
  expect(command.mock.calls.length).toBe(count);
  fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
    target: { value: "zh-CN" },
  });
  expect(screen.getByRole("dialog").textContent).toContain("运行环境");
  expect(document.documentElement.lang).toBe("zh-CN");
  expect(localStorage.getItem(languageKey)).toBe("zh-CN");
  expect(initialLocale()).toBe("zh-CN");
  fireEvent.click(screen.getByRole("button", { name: "关闭对话框" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  for (const name of ["老师档案", "能力档案", "实验比较", "我的 Agent"]) {
    fireEvent.click(screen.getByRole("button", { name }));
    expect(screen.getByRole("heading", { name })).toBeTruthy();
  }
  expect(screen.getByText("My custom 模型")).toBeTruthy();
  expect(screen.getByText("CUSTOM_KEY")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "添加 Agent" }));
  fireEvent.change(screen.getByRole("textbox", { name: "ID" }), {
    target: { value: "custom" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "显示名称" }), {
    target: { value: "Keep English 名字" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "模型" }), {
    target: { value: "unchanged-model" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "接口基础地址" }), {
    target: { value: "https://example.test/v1" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "认证方式" }), {
    target: { value: "env" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "密钥环境变量" }), {
    target: { value: "EXPLICIT_KEY" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "保存 Agent" }).closest("form")!,
  );
  await waitFor(() =>
    expect(command).toHaveBeenCalledWith({
      type: "provider.save",
      value: {
        id: "custom",
        name: "Keep English 名字",
        kind: "responses",
        model: "unchanged-model",
        baseUrl: "https://example.test/v1",
        keyEnv: "EXPLICIT_KEY",
      },
    }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "设置" }));
  fireEvent.change(screen.getByRole("combobox", { name: "界面语言" }), {
    target: { value: "en" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  expect(screen.getByRole("heading", { name: "My agents" })).toBeTruthy();
  expect(localStorage.getItem(languageKey)).toBe("en");
});
test("locale follows system language and recovers from invalid or unavailable storage", () => {
  vi.spyOn(navigator, "language", "get").mockReturnValue("zh-TW");
  expect(initialLocale()).toBe("zh-CN");
  localStorage.setItem(languageKey, "invalid");
  expect(initialLocale()).toBe("zh-CN");
  localStorage.setItem(languageKey, "en");
  expect(initialLocale()).toBe("en");
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
  });
  expect(initialLocale()).toBe("zh-CN");
  useLanguage.getState().setLocale("en");
  expect(useLanguage.getState().locale).toBe("en");
  expect(useLanguage.getState().persistenceError).toBe(true);
});
test("translations retain raw model data and localize known event messages without altering protocol values", () => {
  expect(translate("zh-CN", "{count} in progress", { count: 2 })).toBe(
    "2 项进行中",
  );
  expect(
    eventMessage("zh-CN", "diagnosis.result", "3/4 diagnostic checks passed"),
  ).toBe("诊断检查通过 3/4 项");
  expect(eventMessage("zh-CN", "practice", "Practice round 1/2")).toBe(
    "第 1/2 轮练习",
  );
  expect(eventMessage("zh-CN", "failed", "Keep exact API response")).toBe(
    "Keep exact API response",
  );
  expect(translate("zh-CN", "user-supplied-model")).toBe("user-supplied-model");
  expect(eventMessage("en", "practice", "Practice round 1/2")).toBe(
    "Practice round 1/2",
  );
});
