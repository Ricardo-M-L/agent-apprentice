import { describe, it, expect, afterEach, vi } from "vitest";
import {
  complete,
  sourceOnly,
  validateEndpoint,
} from "../packages/adapters/index";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Engine } from "../packages/core/index";
import { serve } from "../packages/core/server";
const prompt = {
  system: "system",
  user: "task",
  purpose: "student" as const,
  maxOutput: 200,
};
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.APPRENTICE_TEST_KEY;
});
describe("real protocol adapters", () => {
  it("maps Chat Completions and reported usage without inventing pricing", async () => {
    process.env.APPRENTICE_TEST_KEY = "test-only";
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "answer" } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const result = await complete(
      {
        id: "p",
        name: "P",
        kind: "chat",
        baseUrl: "https://example.test/v1",
        model: "test",
        keyEnv: "APPRENTICE_TEST_KEY",
      },
      prompt,
      new AbortController().signal,
    );
    expect(result.cost).toBe(null);
    expect(result.input).toBe(10);
    expect(fetch.mock.calls[0][0]).toBe(
      "https://example.test/v1/chat/completions",
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body).messages).toHaveLength(2);
  });
  it("maps Responses and explicitly disables storage", async () => {
    process.env.APPRENTICE_TEST_KEY = "test-only";
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [{ content: [{ type: "output_text", text: "answer" }] }],
          usage: { input_tokens: 8, output_tokens: 4 },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const result = await complete(
      {
        id: "p",
        name: "P",
        kind: "responses",
        baseUrl: "https://example.test/v1",
        model: "test",
        keyEnv: "APPRENTICE_TEST_KEY",
        priceInput: 1,
        priceOutput: 2,
      },
      prompt,
      new AbortController().signal,
    );
    expect(result.text).toBe("answer");
    expect(result.cost).toBe(0.000016);
    expect(JSON.parse(fetch.mock.calls[0][1].body).store).toBe(false);
  });
  it("reports missing explicit credentials without reading login files", async () => {
    await expect(
      complete(
        {
          id: "p",
          name: "P",
          kind: "chat",
          baseUrl: "https://example.test",
          model: "test",
          keyEnv: "APPRENTICE_TEST_KEY",
        },
        prompt,
        new AbortController().signal,
      ),
    ).rejects.toThrow(/Missing explicitly/);
  });
  it("reports 429 and refuses redirects and credential-bearing URLs", async () => {
    process.env.APPRENTICE_TEST_KEY = "test-only";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })),
    );
    await expect(
      complete(
        {
          id: "p",
          name: "P",
          kind: "chat",
          baseUrl: "https://example.test",
          model: "test",
          keyEnv: "APPRENTICE_TEST_KEY",
        },
        prompt,
        new AbortController().signal,
      ),
    ).rejects.toThrow(/429/);
    expect(() =>
      validateEndpoint({
        id: "p",
        name: "P",
        kind: "chat",
        baseUrl: "https://secret@example.test",
        model: "test",
      }),
    ).toThrow(/credentials/);
    expect(() =>
      validateEndpoint({
        id: "p",
        name: "P",
        kind: "chat",
        baseUrl: "http://example.test",
        model: "test",
      }),
    ).toThrow(/HTTPS/);
  });
  it("extracts fenced source without executing it", () =>
    expect(sourceOnly("```ts\nexport const x=1\n```")).toBe(
      "export const x=1",
    ));
});
describe("private API", () => {
  it("requires bearer token and rejects hostile Host/Origin and arbitrary commands", async () => {
    const dir = mkdtempSync(join(tmpdir(), "apprentice-api-"));
    const engine = new Engine(dir);
    const token = "t".repeat(40);
    const server = await serve(engine, 0, token);
    try {
      expect(
        (
          await server.inject({
            url: "/health",
            headers: { host: "localhost" },
          })
        ).statusCode,
      ).toBe(401);
      expect(
        (
          await server.inject({
            url: "/health",
            headers: { host: "evil.test", authorization: "Bearer " + token },
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await server.inject({
            url: "/health",
            headers: {
              host: "localhost",
              authorization: "Bearer " + token,
              origin: "https://evil.test",
            },
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await server.inject({
            url: "/health",
            headers: { host: "localhost", authorization: "Bearer " + token },
          })
        ).statusCode,
      ).toBe(200);
      expect(
        (
          await server.inject({
            method: "POST",
            url: "/v1/command",
            headers: { host: "localhost", authorization: "Bearer " + token },
            payload: { type: "exec" },
          })
        ).statusCode,
      ).toBe(400);
    } finally {
      await server.close();
      await engine.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
