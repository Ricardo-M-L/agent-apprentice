import { test, expect, vi, afterEach } from "vitest";
import { complete } from "../packages/adapters/index";
const provider = {
  id: "a",
  name: "A",
  kind: "anthropic" as const,
  model: "claude-test",
  baseUrl: "https://example.test/v1",
  credentialRef: "reference",
  priceInput: 1,
  priceOutput: 2,
};
const prompt = {
  system: "system",
  user: "hello",
  purpose: "student" as const,
  maxOutput: 100,
};
afterEach(() => vi.unstubAllGlobals());
test("Anthropic Messages request uses native authentication and parses text and usage", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "你好 dummy-secret" }],
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  const r = await complete(
    provider,
    prompt,
    new AbortController().signal,
    async () => "dummy-secret",
  );
  expect(r).toEqual({
    text: "你好 [REDACTED]",
    input: 10,
    output: 20,
    cost: 0.00005,
  });
  const [url, options] = fetcher.mock.calls[0] as unknown as [
    string,
    RequestInit,
  ];
  expect(url).toBe("https://example.test/v1/messages");
  expect(options.headers).toMatchObject({
    "x-api-key": "dummy-secret",
    "anthropic-version": "2023-06-01",
  });
  expect(JSON.parse(options.body as string)).toMatchObject({
    system: "system",
    messages: [{ role: "user", content: "hello" }],
    max_tokens: 100,
  });
});
test("Anthropic byte-wise SSE handles Unicode, usage, incomplete streams and errors without key echo", async () => {
  const payload = [
    { type: "message_start", message: { usage: { input_tokens: 7 } } },
    {
      type: "content_block_delta",
      delta: { type: "text_delta", text: "中文😀" },
    },
    { type: "message_delta", usage: { output_tokens: 3 } },
    { type: "message_stop" },
  ]
    .map((e) => `data: ${JSON.stringify(e)}\r\n\r\n`)
    .join("");
  const bytes = new TextEncoder().encode(payload);
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(
        new ReadableStream({
          start(c) {
            for (const b of bytes) c.enqueue(Uint8Array.of(b));
            c.close();
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      ),
  );
  expect(
    await complete(
      provider,
      prompt,
      new AbortController().signal,
      async () => "dummy",
    ),
  ).toMatchObject({ text: "中文😀", input: 7, output: 3 });
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response('data: {"type":"ping"}\n\n', {
        headers: { "content-type": "text/event-stream" },
      }),
  );
  await expect(
    complete(
      provider,
      prompt,
      new AbortController().signal,
      async () => "dummy",
    ),
  ).rejects.toThrow(/Incomplete/);
  vi.stubGlobal(
    "fetch",
    async () => new Response("dummy-secret", { status: 401 }),
  );
  await expect(
    complete(
      provider,
      prompt,
      new AbortController().signal,
      async () => "dummy-secret",
    ),
  ).rejects.toThrow("Provider HTTP 401");
  const controller = new AbortController();
  controller.abort();
  await expect(
    complete(provider, prompt, controller.signal, async () => "dummy"),
  ).rejects.toThrow();
});
