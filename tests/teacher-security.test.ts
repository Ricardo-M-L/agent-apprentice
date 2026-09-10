import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Engine } from "../packages/core/index";
import { serve, type TeacherLimits } from "../packages/core/server";
const admin = "admin-test-credential-".repeat(3);
const teacher = "teacher-test-credential-".repeat(3);
const payload = {
  version: "1.0",
  material: "methods",
  studentAttempt: "attempt",
  feedback: "feedback",
  task: "task",
};
const headers = (credential: string) => ({
  host: "localhost",
  authorization: `Bearer ${credential}`,
});
const resources: Array<{
  engine: Engine;
  server: Awaited<ReturnType<typeof serve>>;
  dir: string;
}> = [];
async function make(limits: Partial<TeacherLimits> = {}, real = false) {
  const dir = mkdtempSync(join(tmpdir(), "apprentice-teacher-"));
  const engine = new Engine(dir);
  if (real)
    engine.store.put("provider", {
      id: "local-teacher",
      name: "Teacher",
      kind: "chat",
      model: "fixture",
      baseUrl: "https://provider.example/v1",
      keyEnv: "APPRENTICE_TEST_KEY",
    });
  const server = await serve(
    engine,
    0,
    admin,
    real ? "local-teacher" : "demo-teacher",
    teacher,
    limits,
  );
  resources.push({ engine, server, dir });
  return { engine, server };
}
afterEach(async () => {
  for (const { engine, server, dir } of resources.splice(0)) {
    await server.close();
    await engine.close();
    rmSync(dir, { recursive: true, force: true });
  }
  vi.unstubAllGlobals();
  delete process.env.APPRENTICE_TEST_KEY;
});
describe("teaching capability authorization and budgets", () => {
  it("never grants a teacher credential management, events or health access", async () => {
    const { server, engine } = await make();
    for (const body of [
      { type: "snapshot" },
      {
        type: "provider.save",
        value: {
          id: "evil",
          name: "Evil",
          kind: "chat",
          model: "m",
          baseUrl: "https://attacker.example/v1",
          keyEnv: "PRIVATE_KEY",
        },
      },
    ]) {
      expect(
        (
          await server.inject({
            method: "POST",
            url: "/v1/command",
            headers: headers(teacher),
            payload: body,
          })
        ).statusCode,
      ).toBe(401);
    }
    for (const url of ["/v1/events", "/health", "/unknown"])
      expect(
        (await server.inject({ url, headers: headers(teacher) })).statusCode,
      ).toBe(401);
    expect(engine.store.get("provider", "evil")).toBeUndefined();
    expect(
      (
        await server.inject({
          method: "POST",
          url: "/v1/command",
          headers: headers(admin),
          payload: { type: "snapshot" },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await server.inject({
          method: "POST",
          url: "/v1/teach",
          headers: headers(admin),
          payload,
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await server.inject({
          method: "POST",
          url: "/v1/teach",
          headers: headers(teacher),
          payload,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await server.inject({
          method: "POST",
          url: "/v1/teach",
          headers: headers(teacher),
          payload: {
            ...payload,
            baseUrl: "https://evil.example",
            keyEnv: "PRIVATE_KEY",
          },
        })
      ).statusCode,
    ).toBe(400);
  });
  it("fails closed when teaching credentials are absent or reused", async () => {
    const { engine } = await make();
    await expect(serve(engine, 0, admin, "demo-teacher")).rejects.toThrow(
      /distinct teacher token/,
    );
    await expect(
      serve(engine, 0, admin, "demo-teacher", admin),
    ).rejects.toThrow(/distinct teacher token/);
    await expect(
      serve(engine, 0, admin, "demo-teacher", teacher, {
        maxRequests: Infinity,
      }),
    ).rejects.toThrow(/positive integer/);
  });
  it("bounds lifetime requests and concurrent work", async () => {
    const { server } = await make({ maxConcurrent: 1, maxRequests: 1 });
    const first = server.inject({
      method: "POST",
      url: "/v1/teach",
      headers: headers(teacher),
      payload,
    });
    // Calling then starts injection; no timing-dependent sleeps.
    const started = first.then((x) => x);
    const second = await server.inject({
      method: "POST",
      url: "/v1/teach",
      headers: headers(teacher),
      payload,
    });
    expect(second.statusCode).toBe(429);
    expect((await started).statusCode).toBe(200);
    expect(
      (
        await server.inject({
          method: "POST",
          url: "/v1/teach",
          headers: headers(teacher),
          payload,
        })
      ).statusCode,
    ).toBe(429);
  });
  it("rejects oversized inputs and exhausted token reservations before inference", async () => {
    const { server } = await make({ maxInputBytes: 200, maxReservedTokens: 1 });
    expect(
      (
        await server.inject({
          method: "POST",
          url: "/v1/teach",
          headers: headers(teacher),
          payload: { ...payload, material: "中".repeat(200) },
        })
      ).statusCode,
    ).toBe(413);
    expect(
      (
        await server.inject({
          method: "POST",
          url: "/v1/teach",
          headers: headers(teacher),
          payload,
        })
      ).statusCode,
    ).toBe(429);
  });
  it("caps provider output and charges failed attempts without releasing lifetime budget", async () => {
    process.env.APPRENTICE_TEST_KEY = "test-only";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "x".repeat(13000) } }],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { server } = await make({ maxRequests: 1 }, true);
    const result = await server.inject({
      method: "POST",
      url: "/v1/teach",
      headers: headers(teacher),
      payload,
    });
    expect(result.statusCode).toBe(400);
    expect(result.json().error).toMatch(/output budget/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).max_tokens).toBe(600);
    expect(
      (
        await server.inject({
          method: "POST",
          url: "/v1/teach",
          headers: headers(teacher),
          payload,
        })
      ).statusCode,
    ).toBe(429);
  });
});
