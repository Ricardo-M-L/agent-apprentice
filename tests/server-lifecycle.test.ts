import { test, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { Engine } from "../packages/core/index";
import { serve } from "../packages/core/server";
test("authenticated SSE connections close cleanly with the coordinator API", async () => {
  const dir = mkdtempSync(join(tmpdir(), "apprentice-sse-"));
  const engine = new Engine(dir);
  const token = "s".repeat(40);
  const server = await serve(engine, 0, token);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const address = server.server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/v1/events`, {
      headers: { Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(5000),
    });
    expect(response.status).toBe(200);
    reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain(
      "connected",
    );
    await server.close();
    expect((await reader.read()).done).toBe(true);
  } finally {
    await reader?.cancel().catch(() => {});
    await server.close();
    await engine.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
