// @vitest-environment happy-dom
import React from "react";
import { test, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { App } from "../apps/desktop/src/renderer/main";
test("component validates explicit provider configuration and displays server failures", async () => {
  const command = vi.fn(async (c: any) => {
    if (c.type === "snapshot")
      return { providers: [], teachers: [], sessions: [], capabilities: [] };
    if (c.type === "environment") return { docker: false };
    throw new Error("Endpoint rejected by policy");
  });
  window.apprentice = { command, onEvent: () => () => {} };
  try {
    render(<App />);
    await waitFor(() => expect(command).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "My agents" }));
    fireEvent.click(screen.getByRole("button", { name: "Add agent" }));
    expect(screen.queryByLabelText("Password")).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "ID" }), {
      target: { value: "student" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "DISPLAY NAME" }), {
      target: { value: "Student" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "MODEL" }), {
      target: { value: "test-model" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "BASE URL" }), {
      target: { value: "https://example.test/v1" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "KEY ENVIRONMENT VARIABLE" }),
      { target: { value: "EXPLICIT_KEY" } },
    );
    fireEvent.submit(
      screen.getByRole("button", { name: "Save agent" }).closest("form")!,
    );
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Endpoint rejected by policy",
      ),
    );
    expect(
      command.mock.calls.some(
        ([c]) =>
          c.type === "provider.save" && c.value.keyEnv === "EXPLICIT_KEY",
      ),
    ).toBe(true);
  } finally {
    cleanup();
  }
});
