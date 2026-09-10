import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { referenceCode } from "../../packages/evaluation/course";
test("worker resolves an OS-encrypted key only for the configured Anthropic endpoint", async () => {
  test.skip(
    process.env.APPRENTICE_TEST_DOCKER !== "1",
    "Requires explicit Docker integration mode",
  );
  const dir = await mkdtemp(join(tmpdir(), "apprentice-key-use-"));
  let calls = 0;
  const server = createServer(async (req, res) => {
    for await (const _ of req) {
      /* drain public fixture */
    }
    if (
      req.headers["x-api-key"] !== "dummy-worker-key" ||
      req.url !== "/v1/messages"
    ) {
      res.writeHead(401);
      res.end("denied");
      return;
    }
    calls++;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        content: [{ type: "text", text: referenceCode() }],
        usage: { input_tokens: 10, output_tokens: 10 },
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  const app = await electron.launch({
    args: ["."],
    env: { ...process.env, APPRENTICE_DATA: dir },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: /^(Settings|设置)$/ }).waitFor();
    await page.evaluate(async (baseUrl) => {
      await window.apprentice.credentials({
        type: "save",
        provider: {
          id: "worker-test",
          name: "Worker test",
          kind: "anthropic",
          model: "fixture",
          baseUrl,
        },
        key: "dummy-worker-key",
      });
      await window.apprentice.command({
        type: "teacher.save",
        value: {
          id: "worker-teacher",
          name: "Fixture teacher",
          providerId: "worker-test",
          description: "Fixture",
          license: "Apache-2.0",
          material: "Public test fixture",
          scope: "TypeScript",
        },
      });
    }, url);
    const session = await page.evaluate(() =>
      window.apprentice.command({
        type: "learn",
        value: {
          studentId: "worker-test",
          teacherId: "worker-teacher",
          execution: "docker",
          consent: true,
          rounds: 1,
          maxTokens: 40000,
          maxCalls: 12,
          timeoutSeconds: 120,
          seed: 42,
          arm: "teaching",
        },
      }),
    );
    await expect
      .poll(
        async () =>
          (
            await page.evaluate(() =>
              window.apprentice.command({ type: "snapshot" }),
            )
          ).sessions.find((s: any) => s.id === session.id)?.status,
        { timeout: 60000 },
      )
      .toBe("completed");
    expect(calls).toBeGreaterThan(1);
    const evidence = await page.evaluate(
      async (id) => ({
        snapshot: await window.apprentice.command({ type: "snapshot" }),
        events: await window.apprentice.command({ type: "events", id }),
      }),
      session.id,
    );
    expect(JSON.stringify(evidence)).not.toContain("dummy-worker-key");
    expect(
      await readFile(join(dir, "credentials.enc.json"), "utf8"),
    ).not.toContain("dummy-worker-key");
  } finally {
    await app.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(dir, { recursive: true, force: true });
  }
});
